#!/usr/bin/env python3

import json
import sys
from pathlib import Path

from weasyprint import HTML


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: weasy-export.py <input-json> <output-pdf>", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    payload = json.loads(input_path.read_text(encoding="utf-8"))
    html = payload.get("html", "")
    document_css_text = payload.get("documentCssText", "")
    css_text = payload.get("css", "")
    base_url = payload.get("baseUrl", "")
    page_size = payload.get("pageSize", "A4")
    page_orientation = payload.get("pageOrientation", "portrait")

    if page_orientation not in ("portrait", "landscape"):
        page_orientation = "portrait"

    # WeasyPrint 导出时强制页面方向与分页行为，避免预览容器样式干扰导致横版错位。
    print_override_css = f"""
@page {{
  size: {page_size} {page_orientation};
  margin: 0;
}}

html, body {{
  writing-mode: horizontal-tb;
}}

.paper-stack {{
  display: block !important;
  width: auto !important;
  min-width: 0 !important;
  transform: none !important;
  zoom: 1 !important;
}}

.paper-sheet,
.paper-page {{
  break-after: page;
  page-break-after: always;
}}

.paper-sheet:last-child,
.paper-page:last-child {{
  break-after: auto;
  page-break-after: auto;
}}
"""

    full_html = f"""<!DOCTYPE html>
<html lang=\"zh-CN\">
<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <base href=\"{base_url.rstrip('/') + '/'}\">
  <style>
    {document_css_text}
    body {{
      margin: 0;
      padding: 0;
    }}
    {css_text}
    {print_override_css}
  </style>
</head>
<body>
  {html}
</body>
</html>"""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    HTML(string=full_html, base_url=base_url).write_pdf(str(output_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
