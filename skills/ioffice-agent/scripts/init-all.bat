@echo off
chcp 65001 > nul
title iOffice Agent System - Initialization
color 0A

echo ================================================
echo     🏛️ iOffice Agent System - Khởi tạo
echo ================================================
echo.

echo [1/4] Kiem tra Gemini Bridge...
curl -s http://127.0.0.1:8759/api/status > nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ Gemini Bridge OK
) else (
    echo   ❌ Gemini Bridge KHONG chay!
    echo   Vui long kiem tra: gemini
)

echo.
echo [2/4] Khoi tao Memory System...
python "%~dp0init-memory.py"

echo.
echo [3/4] Khoi tao hbs-task-tracker...
if exist "..\..\hbs-task-tracker\scripts\task_tracker.py" (
    python "..\..\hbs-task-tracker\scripts\task_tracker.py" --init
    echo   ✅ hbs-task-tracker OK
) else (
    echo   ⚠️ hbs-task-tracker khong tim thay
)

echo.
echo [4/4] Kiem tra Config...
if exist "..\..\..\backend\config.json" (
    echo   ✅ Config file OK
) else (
    echo   ⚠️ Config file khong tim thay (backend/config.json)
)

echo.
echo ================================================
echo   🎉 He thong san sang!
echo.
echo   Cac agent co san:
echo     - default (Orchestrator) - Da chay
echo     - ioffice-browser - Can tao
echo     - ioffice-doc - Can tao
echo     - ioffice-memory - Can tao
echo.
echo   De tao agent, chay:
echo     qwenpaw agents create-agent -f skills\ioffice-agent\agents\browser-agent.yaml
echo     qwenpaw agents create-agent -f skills\ioffice-agent\agents\doc-agent.yaml
echo     qwenpaw agents create-agent -f skills\ioffice-agent\agents\memory-agent.yaml
echo ================================================
pause
