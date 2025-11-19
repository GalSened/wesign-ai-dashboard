@echo off
REM WeSign AI Assistant - Smart Startup Script
REM Ensures correct service launch order and health checks

echo ========================================
echo WeSign AI Assistant - Startup Protocol
echo ========================================
echo.

REM Step 1: Kill existing processes to ensure clean start
echo [1/5] Cleaning up existing processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo     ✓ Cleanup complete
echo.

REM Step 2: Start WeSign MCP Server (MUST be first!)
echo [2/5] Starting WeSign MCP HTTP Server...
cd /d "C:\Users\gals\Desktop\wesign-mcp-server"
start "WeSign MCP Server" cmd /c "npm run start:server 2>&1 | tee mcp-server.log"
echo     ✓ MCP Server starting...
echo.

REM Step 3: Wait for MCP Server to be healthy
echo [3/5] Waiting for MCP Server health check...
timeout /t 5 /nobreak >nul

:CHECK_MCP
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo     Waiting for MCP server...
    timeout /t 2 /nobreak >nul
    goto CHECK_MCP
)
echo     ✓ MCP Server is healthy!
echo.

REM Step 4: Start Orchestrator (now with MCP tools available)
echo [4/5] Starting WeSign AI Orchestrator...
cd /d "C:\Users\gals\source\repos\wesign-ai-dashboard\orchestrator"
start "WeSign Orchestrator" cmd /c "venv\Scripts\python.exe main.py 2>&1 | tee orchestrator.log"
echo     ✓ Orchestrator starting...
echo.

REM Step 5: Wait for Orchestrator to be healthy
echo [5/5] Waiting for Orchestrator health check...
timeout /t 5 /nobreak >nul

:CHECK_ORCH
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo     Waiting for orchestrator...
    timeout /t 2 /nobreak >nul
    goto CHECK_ORCH
)
echo     ✓ Orchestrator is healthy!
echo.

REM Step 6: Verify MCP tools are loaded
echo ========================================
echo Verifying MCP Tools Integration...
echo ========================================
curl -s http://localhost:8000/health | findstr "mcp_tools" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MCP Tools detected in orchestrator
) else (
    echo ⚠ WARNING: MCP tools may not be loaded
)
echo.

REM Step 7: Open browser
echo ========================================
echo 🎉 WeSign AI Assistant is Ready!
echo ========================================
echo.
echo Services Running:
echo   • WeSign MCP Server:  http://localhost:3000
echo   • AI Orchestrator:    http://localhost:8000
echo   • Login Page:         http://localhost:8000/login
echo   • Chat Interface:     http://localhost:8000/ui
echo.
echo Opening login page...
start http://localhost:8000/login
echo.
echo Press any key to stop all services...
pause >nul

REM Cleanup on exit
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
echo.
echo All services stopped.
