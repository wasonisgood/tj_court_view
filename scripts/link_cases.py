# -*- coding: utf-8 -*-
"""
把 tw-tj-decisions 專案整理的促轉會決定書、公告撤銷有罪判決名冊，與法院裁判串成以「人」為單位的全案。

很多受難者的原因案件（軍事審判有罪判決）在 80–90 年代先依戒嚴回復條例請求冤獄賠償，
到 107 年後才由促轉會撤銷有罪判決，之後又可能依刑事補償法或威權條例再進法院。
這裡把三種來源以下列證據連起來，每一條連結都記錄依據，網站上逐條顯示供核對：

  原判決案號相同   法院裁判全文中出現的軍事審判案號＝名冊或決定書記載的原判決案號
  決定書引用       促轉會決定書全文引用了某件法院裁判的字號
  個案分析當事人   研究助理個案分析中記載的當事人
  姓名見於當事人欄 法院裁判開頭（當事人欄）或主文出現同名者——可能同名不同人，須人工核對

法院裁判 1990–2000 年代的決定書多已將當事人遮蔽為「甲○○」，這類案件只能靠原判決案號連結。
"""
import glob
import json
import os
import re
from collections import OrderedDict, defaultdict

MIL_RE = re.compile(r"[（(]\s*(\d{2,3})\s*[)）]\s*([一-鿿]{1,6}?)\s*字\s*第\s*(\d+)\s*號")
ORD_RE = re.compile(r"(\d{2,3})\s*年度?\s*([一-鿿]{1,6}?)\s*(?:[(（]([一二三四五六七八九十]+)[)）])?\s*字\s*第\s*(\d+)\s*號")
DATE_RE = re.compile(r"中\s*華\s*民\s*國\s*(\d(?:\s?\d){1,2})\s*年\s*(\d(?:\s?\d)?)\s*月\s*(\d(?:\s?\d)?)\s*日")
MEETING_RE = re.compile(r"(1\d\d)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*第\s*\d+\s*次委員會議")
NAME_OK = re.compile(r"^[一-鿿]{2,4}$")


def mil_cases(text):
    return sorted({f"({int(a)}){b}字第{int(c)}號" for a, b, c in MIL_RE.findall(text or "")})


def load_decisions(src_dir):
    """促轉會決定書 → 與法院裁判相同格式的紀錄"""
    records, texts = [], {}
    for path in sorted(glob.glob(os.path.join(src_dir, "parsed_results", "*.json"))):
        d = json.load(open(path, encoding="utf-8"))
        base = os.path.splitext(os.path.basename(path))[0]
        ft = (d.get("content") or {}).get("full_text") or ""
        main = ((d.get("content") or {}).get("main_text") or "").strip()
        meta = d.get("metadata") or {}
        rejected = "駁回" in base
        m = re.match(r"^(促轉司字第\d+號|調查報告)_(.+?)(?:（(.*)）)?$", base)
        if m:
            no, subjects = m.group(1), [s for s in m.group(2).split("、") if s]
        else:
            no = re.sub(r"\s*（.*$", "", base).replace("復查決定書", "").strip()
            subjects = [meta["subject"]] if meta.get("subject") and NAME_OK.match(meta["subject"]) else []
        kind = "調查報告" if no == "調查報告" else ("復查決定書" if "復查" in no else "決定書")
        title = f"促進轉型正義委員會 {no if no != '調查報告' else '調查報告（' + '、'.join(subjects) + '）'}" + ("" if kind == "調查報告" or no.endswith("決定書") else " 決定書")
        nums = lambda t: tuple(int(re.sub(r"\s", "", x)) for x in t)
        dates = [nums(t) for t in DATE_RE.findall(ft) if 106 <= nums(t)[0] <= 115] or \
                [nums(t) for t in MEETING_RE.findall(ft) if 106 <= int(t[0]) <= 115]
        y, mo, dd = dates[-1] if dates else (None, None, None)
        rid = "TJC," + no + ("," + "、".join(subjects) if no == "調查報告" else "")
        sections = OrderedDict()
        if main and main[:20] in ft:
            head, _, rest = ft.partition(main[:20])
            sections["前置"] = re.sub(r"\s*主\s*文\s*$", "", head).strip()
            sections["主文"] = main
            rest = rest[len(main) - 20:] if len(rest) >= len(main) - 20 else rest
            sections["理由"] = re.sub(r"^\s*理\s*由\s*", "", rest).strip()
        else:
            sections["全文"] = ft.strip()
        if kind == "復查決定書":
            result = "駁回" if rejected else "撤銷原處分"
        elif kind == "調查報告":
            result = "調查報告"
        else:
            result = "駁回" if rejected else "平復（有罪判決視為撤銷）"
        records.append({
            "id": rid, "title": title, "caseNo": no, "court": "促進轉型正義委員會", "docType": f"促轉會{kind}",
            "date": f"民國 {y} 年 {mo:02d} 月 {dd:02d} 日" if y else None,
            "iso": f"{y + 1911}-{mo:02d}-{dd:02d}" if y else None, "rocYear": y,
            "cause": "平復司法不法", "statute": "促進轉型正義條例", "statutes": ["促進轉型正義條例"],
            "result": result, "mainText": main or None, "url": None, "pdf": None,
            "sourceFile": os.path.basename(path).replace(".json", ".pdf"), "source": "tjc",
            "subjects": subjects, "origCases": mil_cases(main or ft[:3000]),
            "ref": no.replace("促轉", "").replace("字第", "").replace("號", "") if no != "調查報告" else "調查報告",
            "tables": d.get("tables") or [],
        })
        texts[rid] = sections
    return records, texts


def load_revocations(src_dir):
    path = os.path.join(src_dir, "all_revocations.json")
    if not os.path.exists(path):
        return []
    out = []
    for x in json.load(open(path, encoding="utf-8")):
        name = (x.get("name") or "").strip()
        if not NAME_OK.match(name):
            continue
        src = x.get("source", "")
        out.append({
            "name": name, "no": x.get("id"), "court": x.get("court") or [], "cases": x.get("case_id") or [],
            "crime": x.get("crime") or [], "sentence": x.get("sentence") or [],
            "category": x.get("category"), "sourceFile": src,
            # 公告文號前三碼為民國年，例如 1075300145A → 107 年公告
            "announcedYear": int(src[:3]) if src[:3].isdigit() else None,
        })
    return out


def build_persons(records, texts, revocations):
    persons = OrderedDict()

    def person(name):
        return persons.setdefault(name, {"name": name, "revocations": [], "decisions": [], "court": OrderedDict()})

    for rv in revocations:
        person(rv["name"])["revocations"].append(rv)
    for r in records:
        if r["source"] == "tjc":
            for n in r["subjects"]:
                if NAME_OK.match(n):
                    person(n)["decisions"].append(r["id"])

    def link(name, rid, how):
        p = persons.get(name)
        if not p:
            return
        hows = p["court"].setdefault(rid, [])
        if how not in hows:
            hows.append(how)

    # 原判決案號 → 姓名
    case_owner = defaultdict(set)
    for p in persons.values():
        for rv in p["revocations"]:
            for c in mil_cases("、".join(rv["cases"])):
                case_owner[c].add(p["name"])
    for r in records:
        if r["source"] == "tjc":
            for c in r["origCases"]:
                for n in r["subjects"]:
                    case_owner[c].add(n)

    court_recs = [r for r in records if r["source"] != "tjc"]
    by_caseno = {}
    for r in court_recs:
        p = r["id"].split(",")
        if len(p) >= 4:
            by_caseno[(p[1], p[2], p[3])] = r

    names3 = [n for n in persons if len(n) >= 3]
    names2 = [n for n in persons if len(n) == 2]
    re2 = re.compile(r"(?:人|告|即)(" + "|".join(map(re.escape, names2)) + r")(?=[\s，,、住男女上即之（(])") if names2 else None

    for r in court_recs:
        sec = texts.get(",".join(r["id"].split(",")[:5])) or {}
        full = "\n".join(sec.values())
        for c in mil_cases(full):
            owners = case_owner.get(c, ())
            for n in owners:
                if len(owners) == 1:
                    link(n, r["id"], f"原判決案號相同：{c}")
                else:
                    link(n, r["id"], f"同一原判決 {c}（同案共 {len(owners)} 人，本件當事人未必是本人）")
        for a in (r.get("caseAnalysis") or {}).values():
            party = a.get("原告／上訴人／聲請人") or ""
            for n in re.split(r"[、，,（）()\s]", party):
                if n in persons:
                    link(n, r["id"], "個案分析記載之當事人")
        head = (sec.get("前置") or "")[:400] + (sec.get("主文") or "")[:200]
        for n in names3:
            if n in head:
                link(n, r["id"], f"姓名見於裁判當事人欄：「{n}」（可能同名，請核對）")
        if re2:
            for m in re2.finditer(head):
                link(m.group(1), r["id"], f"姓名見於裁判當事人欄：「{m.group(1)}」（可能同名，請核對）")

    # 決定書引用法院裁判字號
    for r in records:
        if r["source"] != "tjc":
            continue
        full = "\n".join(texts[r["id"]].values())
        for y, word, extra, num in ORD_RE.findall(full):
            word = word + (f"({extra})" if extra else "")
            hit = by_caseno.get((y, word, num)) or by_caseno.get((y, word.replace("(", "").replace(")", ""), num))
            if hit:
                for n in r["subjects"]:
                    link(n, hit["id"], f"{r['caseNo']}決定書引用本件")

    # 回寫到裁判紀錄，並計算來源數
    rec_by_id = {r["id"]: r for r in records}
    out = []
    for p in persons.values():
        for rid in list(p["court"]):
            rec_by_id[rid].setdefault("persons", [])
            if p["name"] not in rec_by_id[rid]["persons"]:
                rec_by_id[rid]["persons"].append(p["name"])
        for did in p["decisions"]:
            rec_by_id[did].setdefault("persons", [])
            if p["name"] not in rec_by_id[did]["persons"]:
                rec_by_id[did]["persons"].append(p["name"])
        p["court"] = [{"id": k, "how": v} for k, v in p["court"].items()]
        p["kinds"] = [k for k, v in (("名冊", p["revocations"]), ("決定書", p["decisions"]), ("法院", p["court"])) if v]
        out.append(p)
    out.sort(key=lambda p: (-len(p["kinds"]), -len(p["court"]), p["name"]))
    return out
