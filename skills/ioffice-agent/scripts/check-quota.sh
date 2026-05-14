@echo off
REM Kiểm tra trạng thái Gemini CLI Bridge và quota
REM Chạy: check-quota.bat

echo ========================================
echo   🔍 iOffice - Gemini Quota Check
echo ========================================

echo.
echo [1] Bridge Status:
curl -s http://127.0.0.1:8759/api/status 2>&1 | python -c "import sys,json; d=json.load(sys.stdin); print(f'  Version: {d.get(\"version\",\"?\")}'); print(f'  Auth: {d.get(\"auth_method\",\"?\")}'); print(f'  OK: {d.get(\"requests_ok\",0)}'); print(f'  Errors: {d.get(\"requests_err\",0)}'); print(f'  Session: {d.get(\"session_state\",\"?\")}')"

echo.
echo [2] Available Models:
curl -s http://127.0.0.1:8759/v1/models 2>&1 | python -c "import sys,json; [print(f'  ✅ {m[\"id\"]}') for m in json.load(sys.stdin)['data']]"

echo.
echo [3] Quick Test (flash-lite):
curl -s -X POST http://127.0.0.1:8759/v1/chat/completions -H "Content-Type: application/json" -d "{\"model\":\"flash-lite\",\"messages\":[{\"role\":\"user\",\"content\":\"Tra loi: OK\"}],\"max_tokens\":10}" 2>&1 | python -c "import sys,json; d=json.load(sys.stdin); print(f'  Model used: {d.get(\"model\",\"?\")}'); print(f'  Quota: {json.dumps(d.get(\"quota\",{}),indent=4)}')"

echo.
echo ========================================
echo   ✅ Check complete
echo ========================================
