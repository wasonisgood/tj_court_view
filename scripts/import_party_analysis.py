# -*- coding: utf-8 -*-
"""
把「黨產條例最高行政法院判決整理表」Word 檔（四大爭點分表）轉成 data_source/party_assets_analysis.json，
供 build_data.py 併入黨產條例案件的個案分析。

每列欄位：編號、案件、事實簡述、上訴人、上訴結果、理由；編號與 Excel 黨產條例分頁的「編號」欄對應。

用法：
  python scripts/import_party_analysis.py 路徑/黨產條例判決整理表.docx
"""
import json
import os
import re
import sys

import docx
from docx.oxml.ns import qn

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "data_source", "party_assets_analysis.json")
FIELDS = ["編號", "案件", "事實簡述", "上訴人", "上訴結果", "理由"]


def cell_text(tc):
    paras = []
    for p in tc.iter(qn("w:p")):
        t = "".join(x.text or "" for x in p.iter(qn("w:t"))).strip()
        if t:
            paras.append(t)
    return "\n".join(paras)


def main(path):
    d = docx.Document(path)
    title, group, groups, rows = None, None, [], []
    for el in d.element.body.iterchildren():
        if el.tag == qn("w:p"):
            t = "".join(x.text or "" for x in el.iter(qn("w:t"))).strip()
            if not t:
                continue
            m = re.match(r"^([一二三四五六七八九十]+、.+?)（(\d+)件）$", t)
            if m:
                group = m.group(1)
                groups.append({"label": group, "count": int(m.group(2))})
            elif title is None:
                title = t
        elif el.tag == qn("w:tbl"):
            for tr in el.iter(qn("w:tr")):
                cells = [cell_text(tc) for tc in tr.iter(qn("w:tc"))]
                if not cells or cells[0] == "編號":
                    continue
                r = dict(zip(FIELDS, cells))
                case = r.get("案件", "")
                m = re.search(r"https?://\S+", case)
                r["連結"] = m.group(0).rstrip(",，") if m else None
                r["案件"] = re.sub(r"https?://\S+", "", case).strip(" ,，\n")
                r["上訴人"] = re.sub(r"\s*[（(]-[)）]$", "", r.get("上訴人", ""))
                r["結果"] = "發回更審" if "發回" in r.get("上訴結果", "") else "駁回"
                r["分類"] = group
                rows.append(r)
    out = {"title": title, "source": os.path.basename(path), "groups": groups, "rows": rows}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"{len(rows)} 列 → {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
