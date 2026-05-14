import argparse
import json
import os
import shutil
import subprocess
import sys


def _flatten_prompt(s: str) -> str:
    return " ".join((s or "").replace("\r", "\n").splitlines()).strip()


def _run_gemini(prompt: str, model: str | None, stdin_bytes: bytes | None) -> str:
    gemini = shutil.which("gemini")
    if not gemini:
        raise RuntimeError('Không tìm thấy lệnh "gemini" trong PATH. Cần cài Gemini CLI và đăng nhập OAuth trước.')

    cmd = [gemini]
    if model:
        cmd += ["-m", model]
    cmd += ["-p", _flatten_prompt(prompt)]
    cmd += ["--skip-trust"]

    p = subprocess.run(
        cmd,
        input=stdin_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    out = (p.stdout or b"").decode("utf-8", errors="replace")
    err = (p.stderr or b"").decode("utf-8", errors="replace")
    if p.returncode != 0:
        msg = err.strip() or out.strip() or f"Gemini CLI exited with code {p.returncode}"
        raise RuntimeError(msg)
    return out.strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--model", default=None)
    parser.add_argument("--stdin-file", default=None)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    stdin_bytes = None
    if args.stdin_file:
        with open(args.stdin_file, "rb") as f:
            stdin_bytes = f.read()

    try:
        text = _run_gemini(args.prompt, args.model, stdin_bytes)
    except Exception as e:
        if args.json:
            sys.stdout.write(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False))
            return 1
        raise

    if args.json:
        sys.stdout.write(json.dumps({"ok": True, "text": text}, ensure_ascii=False))
        return 0

    sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
