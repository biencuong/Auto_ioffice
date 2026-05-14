import argparse
import json
import os
import sys

from gemini_cli_runner import _run_gemini


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Đường dẫn file text đã trích xuất (UTF-8).")
    parser.add_argument("--model", default="gemini-2.5-flash")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        text = f.read()

    prompt = (
        "Đây là nội dung file PDF của một văn bản hành chính từ hệ thống iOffice. "
        "Hãy đọc và tóm tắt bằng tiếng Việt. "
        "Yêu cầu: nêu mục đích, nội dung chính, kết luận/đề nghị, mốc thời gian (nếu có). "
        "Nội dung:\n\n"
        f"{text}"
    )

    try:
        out = _run_gemini(prompt=prompt, model=args.model, stdin_bytes=None)
    except Exception as e:
        if args.json:
            sys.stdout.write(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False))
            return 1
        raise

    if args.json:
        sys.stdout.write(json.dumps({"ok": True, "text": out}, ensure_ascii=False))
        return 0
    sys.stdout.write(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
