# -*- coding: utf-8 -*-
"""
把 judge_mcp 匯出的「轉型正義判決匯出_含威權與政治檔案條例.xlsx」轉成網站讀取的 JSON。

輸出（public/data/judgments/）：
  index.json      每件裁判的書目、主文、研究編碼（有利／否定、政治檔案／促轉個案分析）
  text/NN.json    全文分段，依序號分片，閱讀單一案件時才載入
  notes.json      各統計分頁中的文字說明（收錄標準、情境說明、法制沿革、觀察）
  persons.json    以人為單位的全案：撤銷名冊、促轉會決定書、法院裁判之間的連結與依據
  meta.json       資料來源檔名、建置時間、件數

舊版 data_source/legacy_data.js（原 public/data.js） 中 Excel 未收錄的案件（多為最高法院、最高行政法院裁定）與既有摘要會一併保留。

用法：
  python scripts/build_data.py                                  # 預設讀 ../judge_mcp/ 下的 Excel
  python scripts/build_data.py --xlsx 路徑/檔名.xlsx --legacy data_source/legacy_data.js --decisions ../tw-tj-decisions
"""
import argparse
import json
import os
import re
from collections import Counter, OrderedDict
from datetime import datetime
from urllib.parse import quote

import openpyxl

from link_cases import build_persons, load_decisions, load_revocations

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DEFAULT_XLSX = os.path.join(ROOT, "..", "judge_mcp", "轉型正義判決匯出_含威權與政治檔案條例.xlsx")
DEFAULT_DECISIONS = os.path.join(ROOT, "..", "tw-tj-decisions")
DEFAULT_LEGACY = os.path.join(ROOT, "data_source", "legacy_data.js")
OUT_DIR = os.path.join(ROOT, "public", "data", "judgments")

STATUTES = [
    "戒嚴時期人民受損權利回復條例", "二二八事件處理及補償條例", "戒嚴時期不當叛亂暨匪諜審判案件補償條例",
    "政黨及其附隨組織不當取得財產處理條例", "促進轉型正義條例", "威權統治時期國家不法行為被害者權利回復條例", "政治檔案條例",
]
POS_SHEET, NEG_SHEET = "財產型_最終有利聲請人", "財產型_否定請求"
CASE_SHEETS = {"政治檔案_案件分析": "政治檔案條例", "促轉條例_案件分析": "促進轉型正義條例"}
NOTE_SHEETS = ["財產型_有利類型統計", "財產型_否定類型統計", "政治檔案與促轉_類型統計", "年代趨勢統計"]
SHARDS = 24

# 法規名稱（含判決中常見簡稱）→ 正式名稱；只辨識這些法規，避免把句子片段誤判成法條
LAW_NAMES = OrderedDict([
    ("戒嚴時期人民受損權利回復條例施行細則", None), ("戒嚴時期人民受損權利回復條例", None), ("戒嚴回復條例", "戒嚴時期人民受損權利回復條例"),
    ("二二八事件處理及補償條例", None), ("二二八條例", "二二八事件處理及補償條例"),
    ("戒嚴時期不當叛亂暨匪諜審判案件補償條例", None), ("補償條例", "戒嚴時期不當叛亂暨匪諜審判案件補償條例"),
    ("政黨及其附隨組織不當取得財產處理條例", None), ("黨產條例", "政黨及其附隨組織不當取得財產處理條例"),
    ("促進轉型正義條例", None), ("促轉條例", "促進轉型正義條例"),
    ("威權統治時期國家不法行為被害者權利回復條例", None), ("威權條例", "威權統治時期國家不法行為被害者權利回復條例"),
    ("政治檔案條例", None), ("國家情報工作法", None), ("檔案法", None),
    ("懲治叛亂條例", None), ("檢肅匪諜條例", None), ("戡亂時期檢肅匪諜條例", "檢肅匪諜條例"), ("戒嚴法", None),
    ("軍事審判法", None), ("動員戡亂時期人民團體法", None), ("人民團體法", None),
    ("冤獄賠償法", None), ("刑事補償法", None), ("國家賠償法", None),
    ("行政訴訟法", None), ("民事訴訟法", None), ("刑事訴訟法", None), ("訴願法", None), ("行政程序法", None),
    ("中央法規標準法", None), ("行政罰法", None), ("中華民國刑法", "刑法"), ("刑法", None), ("民法", None),
    ("中華民國憲法", "憲法"), ("憲法增修條文", None), ("憲法", None),
    ("檢肅流氓條例", None), ("違警罰法", None), ("臺灣省戒嚴時期取締流氓辦法", None),
])
NUM = r"[0-9０-９一二三四五六七八九十百零○〇]+"
LAW_RE = re.compile(
    "(" + "|".join(re.escape(n) for n in sorted(LAW_NAMES, key=len, reverse=True)) + ")"
    r"\s*第\s*(" + NUM + r")\s*條(?:\s*之\s*(" + NUM + r"))?(?:\s*第\s*(" + NUM + r")\s*項)?"
)
INTERP_RE = re.compile(r"釋字第\s*(" + NUM + r")\s*號")
CN_DIGITS = {"零": 0, "○": 0, "〇": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}


def to_int(s):
    s = s.translate(str.maketrans("０１２３４５６７８９", "0123456789"))
    if s.isdigit():
        return int(s)
    if all(c in CN_DIGITS for c in s):  # 四七七 這類逐位寫法
        return int("".join(str(CN_DIGITS[c]) for c in s))
    total, unit_val, num = 0, 1, 0
    for c in s:
        if c in CN_DIGITS:
            num = CN_DIGITS[c]
        elif c == "十":
            total += (num or 1) * 10; num = 0
        elif c == "百":
            total += (num or 1) * 100; num = 0
    return total + num


def clean(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def base_id(jid):
    return ",".join(str(jid).split(",")[:5])


def roc_year(date_minguo):
    m = re.search(r"(\d+)\s*年", date_minguo or "")
    return int(m.group(1)) if m else None


def iso_from_id(jid):
    parts = str(jid).split(",")
    if len(parts) >= 5 and re.fullmatch(r"\d{8}", parts[4]):
        d = parts[4]
        return f"{d[:4]}-{d[4:6]}-{d[6:]}"
    return None


def doc_type(title):
    t = title or ""
    for k in ("判決", "決定書", "裁定"):
        if t.endswith(k):
            return k
    return "其他文書"


def case_no(title):
    m = re.search(r"(\d+)\s*年度\s*(\S+?)\s*字第\s*(\d+)\s*號", title or "")
    return f"{m.group(1)}年度{m.group(2)}字第{m.group(3)}號" if m else None


def short_ref(jid):
    """TPCM,94,台覆,3,20050125 → 94台覆3（研究筆記中常用的簡稱）"""
    p = str(jid).split(",")
    return f"{p[1]}{p[2]}{p[3]}" if len(p) >= 4 else jid


def parse_sections(full):
    if not full:
        return OrderedDict()
    out = OrderedDict()
    for m in re.finditer(r"【([^】\n]{1,12})】\n(.*?)(?=\n\n【[^】\n]{1,12}】\n|\Z)", full, re.S):
        out[m.group(1)] = m.group(2).strip()
    if not out:
        out["全文"] = full.strip()
    return out


def extract_laws(sections):
    """擷取引用法條（正規化為「法規名稱第N條（第M項）」）與大法官解釋"""
    text = "\n".join(sections.values())
    seen = OrderedDict()
    for m in LAW_RE.finditer(text):
        name = LAW_NAMES[m.group(1)] or m.group(1)
        art = f"{name}第{to_int(m.group(2))}條" + (f"之{to_int(m.group(3))}" if m.group(3) else "")
        if m.group(4):
            art += f"第{to_int(m.group(4))}項"
        seen[art] = True
    for m in INTERP_RE.finditer(text):
        seen[f"釋字第{to_int(m.group(1))}號"] = True
    return list(seen)[:60]


def normalize_result(main_text, raw_result, dtype):
    """依主文細分結果；Excel 的「判決結果」只有兩類，判決類常把『原告之訴駁回』歸入撤銷。"""
    mt = main_text or ""
    if dtype == "判決":
        if "原告之訴駁回" in mt or "上訴駁回" in mt:
            return "駁回"
        if "再審之訴駁回" in mt:
            return "再審駁回"
    return raw_result or ("撤銷原判/決定" if ("撤銷" in mt or "廢棄" in mt) else "聲請駁回")


def sheet_rows(ws):
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return [], []
    header = [clean(h) for h in rows[0]]
    return header, rows[1:]


def load_legacy(path):
    if not path or not os.path.exists(path):
        return []
    src = open(path, encoding="utf-8").read()
    start, end = src.find("["), src.rfind("]")
    return json.loads(src[start:end + 1]) if start >= 0 else []


def notes_from_sheet(ws):
    """把統計分頁切成「區塊」：以【…】或「一、」開頭的列當作標題，其後的列當作表格或段落。"""
    blocks, cur = [], None
    for raw in ws.iter_rows(values_only=True):
        cells = [clean(c) for c in raw]
        while cells and cells[-1] is None:
            cells.pop()
        if not cells:
            continue
        first = cells[0] or ""
        only_one = sum(1 for c in cells if c) == 1
        is_head = only_one and (re.match(r"^[一二三四五六七八九十]+、", first) or first.startswith("【"))
        if is_head or cur is None:
            cur = {"heading": first if is_head else None, "rows": []}
            blocks.append(cur)
            if is_head:
                continue
        cur["rows"].append(cells)
    for b in blocks:
        rows = b["rows"]
        b["kind"] = "table" if rows and max(len(r) for r in rows) > 1 else "text"
        if b["kind"] == "text":
            b["paragraphs"] = [r[0] for r in rows if r and r[0]]
            del b["rows"]
    return blocks


def method_notes(rows_tail):
    """編碼分頁最下方的說明文字（收錄標準、歸類方式、更新紀錄）"""
    return [r for r in rows_tail if r]


def build(xlsx, legacy_path, decisions_dir=None):
    wb = openpyxl.load_workbook(xlsx, read_only=True)
    legacy = {base_id(d["meta"]["id"]): d for d in load_legacy(legacy_path)}
    records = OrderedDict()   # base id -> record
    texts = {}

    # 1) 條例主分頁
    for statute in STATUTES:
        if statute not in wb.sheetnames:
            continue
        header, rows = sheet_rows(wb[statute])
        idx = {h: i for i, h in enumerate(header) if h}
        for r in rows:
            jid = clean(r[idx["案號"]])
            if not jid or not re.match(r"^[A-Z]{3,5},", jid):
                continue  # 底部的法院件數統計列
            b = base_id(jid)
            full = clean(r[idx["全文內容"]]) if "全文內容" in idx else None
            if b in records:
                rec = records[b]
                if statute not in rec["statutes"]:
                    rec["statutes"].append(statute)
                if full and len(full) > sum(len(v) for v in texts.get(b, {}).values()):
                    texts[b] = parse_sections(full)
                continue
            title = clean(r[idx["標題"]])
            dtype = doc_type(title)
            main = clean(r[idx["主文"]])
            records[b] = {
                "id": jid,
                "title": title,
                "caseNo": case_no(title),
                "court": clean(r[idx["法院"]]) or (title or "").split(" ")[0],
                "docType": dtype,
                "date": clean(r[idx["判決日期"]]),
                "iso": iso_from_id(jid),
                "rocYear": roc_year(clean(r[idx["判決日期"]])),
                "cause": clean(r[idx["案由"]]),
                "statute": statute,
                "statutes": [statute],
                "result": normalize_result(main, clean(r[idx["判決結果"]]), dtype),
                "mainText": main,
                "url": clean(r[idx["原始連結"]]),
                "pdf": clean(r[idx["PDF下載連結"]]),
                "source": "excel",
            }
            if full:
                texts[b] = parse_sections(full)

    # 2) 舊版資料中有、Excel 沒有的案件
    for b, d in legacy.items():
        m, am = d["meta"], d.get("analysis_meta", {})
        if b not in records:
            title = m.get("title")
            dtype = am.get("judgment_type_normalized") or doc_type(title)
            main = d.get("main_text_clean")
            records[b] = {
                "id": m["id"], "title": title, "caseNo": m.get("case_no") or case_no(title),
                "court": am.get("court_normalized") or m.get("court"), "docType": dtype,
                "date": m.get("date_minguo"), "iso": m.get("date_iso") or iso_from_id(m["id"]),
                "rocYear": roc_year(m.get("date_minguo")), "cause": m.get("cause"),
                "statute": am.get("category_normalized") or "未分類",
                "statutes": [am.get("category_normalized") or "未分類"],
                "result": normalize_result(main, d.get("decision_result"), dtype),
                "mainText": main, "url": m.get("source_url"),
                "pdf": "https://judgment.judicial.gov.tw/EXPORTFILE/ExportToPdf.aspx?type=JD&id="
                       + quote(m["id"], safe="").lower() + "&fname=" + quote(title or "", safe="") + "&lawpara=&ot=in",
                "source": "legacy",
            }
            if d.get("sections"):
                texts[b] = OrderedDict(d["sections"])
        rec = records[b]
        if d.get("ai_summary"):
            rec["summary"] = [{"point": s.get("point"), "refs": s.get("refs", [])}
                              for s in d["ai_summary"] if s.get("point")]
        if b not in texts and d.get("sections"):
            texts[b] = OrderedDict(d["sections"])

    # 3) 研究編碼：有利／否定
    coding_notes = {}
    for sheet, stance in ((POS_SHEET, "有利"), (NEG_SHEET, "否定")):
        if sheet not in wb.sheetnames:
            continue
        header, rows = sheet_rows(wb[sheet])
        idx = {h: i for i, h in enumerate(header) if h}
        tail = []
        for r in rows:
            jid = clean(r[idx["案號"]]) if "案號" in idx else None
            if not jid or not re.match(r"^[A-Z]{3,5},", jid):
                txt = clean(r[0])
                if txt:
                    tail.append(txt)
                continue
            b = base_id(jid)
            rec = records.get(b)
            if not rec:
                continue
            c = {"stance": stance}
            for h, i in idx.items():
                if h in ("案號", "標題", "法院", "裁判日期", "主文", "PDF下載連結", "原始連結", "條例"):
                    continue
                v = clean(r[i])
                if v:
                    c[h] = v
            c["codingStatute"] = clean(r[idx["條例"]]) if "條例" in idx else None
            rec["coding"] = c
            if c.get("文書類型"):
                rec["docType"] = c["文書類型"]
        coding_notes[stance] = method_notes(tail)

    # 4) 政治檔案／促轉條例個案分析
    for sheet, statute in CASE_SHEETS.items():
        if sheet not in wb.sheetnames:
            continue
        header, rows = sheet_rows(wb[sheet])
        idx = {h: i for i, h in enumerate(header) if h}
        for r in rows:
            jid = clean(r[idx["案號"]])
            if not jid or not re.match(r"^[A-Z]{3,5},", jid):
                continue
            b = base_id(jid)
            rec = records.get(b)
            if not rec:
                continue
            a = {h: clean(r[i]) for h, i in idx.items()
                 if h not in ("案號", "標題", "法院", "裁判日期", "PDF下載連結", "原始連結") and clean(r[i])}
            rec.setdefault("caseAnalysis", {})[statute] = a

    # 5) 法條與文字長度
    for b, rec in records.items():
        sec = texts.get(b)
        rec["hasText"] = bool(sec)
        rec["laws"] = extract_laws(sec) if sec else []
        rec["ref"] = short_ref(rec["id"])

    # 6) 促轉會決定書併入，並以人為單位串成全案
    persons, revocations = [], []
    if decisions_dir and os.path.isdir(decisions_dir):
        dec_records, dec_texts = load_decisions(decisions_dir)
        for rec in dec_records:
            rec["hasText"] = True
            rec["laws"] = extract_laws(dec_texts[rec["id"]])
            records[rec["id"]] = rec
            texts[rec["id"]] = dec_texts[rec["id"]]
        revocations = load_revocations(decisions_dir)
        persons = build_persons(list(records.values()), texts, revocations)

    sizes = {st: wb[st].max_row for st in STATUTES if st in wb.sheetnames}
    for rec in records.values():
        if len(rec["statutes"]) > 1:
            rec["statute"] = min(rec["statutes"], key=lambda st: sizes.get(st, 10 ** 6))

    ordered = sorted(records.values(), key=lambda x: (STATUTES.index(x["statute"]) if x["statute"] in STATUTES else 99,
                                                       x.get("iso") or "", x["id"]))
    for i, rec in enumerate(ordered):
        rec["shard"] = i % SHARDS if rec["hasText"] else None

    notes = {name: notes_from_sheet(wb[name]) for name in NOTE_SHEETS if name in wb.sheetnames}
    notes["編碼說明"] = coding_notes
    return ordered, texts, notes, persons


def write(ordered, texts, notes, xlsx, persons=()):
    os.makedirs(os.path.join(OUT_DIR, "text"), exist_ok=True)
    shards = [dict() for _ in range(SHARDS)]
    for rec in ordered:
        if rec["shard"] is not None:
            shards[rec["shard"]][rec["id"]] = texts[base_id(rec["id"])]
    for i, s in enumerate(shards):
        with open(os.path.join(OUT_DIR, "text", f"{i:02d}.json"), "w", encoding="utf-8") as f:
            json.dump(s, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT_DIR, "index.json"), "w", encoding="utf-8") as f:
        json.dump(ordered, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT_DIR, "notes.json"), "w", encoding="utf-8") as f:
        json.dump(notes, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT_DIR, "persons.json"), "w", encoding="utf-8") as f:
        json.dump(persons, f, ensure_ascii=False, separators=(",", ":"))
    meta = {
        "source": os.path.basename(xlsx),
        "sourceModified": datetime.fromtimestamp(os.path.getmtime(xlsx)).isoformat(timespec="minutes"),
        "builtAt": datetime.now().isoformat(timespec="minutes"),
        "total": len(ordered),
        "withText": sum(1 for r in ordered if r["hasText"]),
        "coded": dict(Counter(r["coding"]["stance"] for r in ordered if r.get("coding"))),
        "caseAnalysis": sum(1 for r in ordered if r.get("caseAnalysis")),
        "byStatute": dict(Counter(r["statute"] for r in ordered)),
        "bySource": dict(Counter(r["source"] for r in ordered)),
        "persons": len(persons),
        "personsLinked": sum(1 for p in persons if len(p["kinds"]) > 1),
        "personsWithCourt": sum(1 for p in persons if p["court"]),
    }
    with open(os.path.join(OUT_DIR, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    return meta


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", default=DEFAULT_XLSX)
    ap.add_argument("--legacy", default=DEFAULT_LEGACY)
    ap.add_argument("--decisions", default=DEFAULT_DECISIONS, help="tw-tj-decisions 專案目錄（促轉會決定書與撤銷名冊）")
    args = ap.parse_args()
    ordered, texts, notes, persons = build(args.xlsx, args.legacy, args.decisions)
    print(json.dumps(write(ordered, texts, notes, args.xlsx, persons), ensure_ascii=False, indent=2))
