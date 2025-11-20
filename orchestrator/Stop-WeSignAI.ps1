# WeSign AI Assistant - Stop Script (PowerShell)
# Cleanly shuts down all WeSign AI services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WeSign AI Assistant - Shutdown Protocol" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop Orchestrator
Write-Host "[1/3] Stopping AI Orchestrator..." -ForegroundColor Yellow
Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*wesign-ai-dashboard*"
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Write-Host "    ✓ Orchestrator stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Stop MCP Server
Write-Host "[2/3] Stopping WeSign MCP Server..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*wesign-mcp-server*"
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Write-Host "    ✓ MCP Server stopped" -ForegroundColor Green
Write-Host ""

# Step 3: Verify shutdown
Write-Host "[3/3] Verifying shutdown..." -ForegroundColor Yellow
$pythonRunning = Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*wesign-ai-dashboard*"
}
$nodeRunning = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*wesign-mcp-server*"
}

if (-not $pythonRunning -and -not $nodeRunning) {
    Write-Host "    ✓ All services stopped successfully" -ForegroundColor Green
} else {
    Write-Host "    ⚠ Some processes may still be running" -ForegroundColor Yellow
    if ($pythonRunning) {
        Write-Host "      - Python processes still running" -ForegroundColor Gray
    }
    if ($nodeRunning) {
        Write-Host "      - Node processes still running" -ForegroundColor Gray
    }
}
Write-Host ""

# Final message
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ WeSign AI Assistant Stopped" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To restart, run: .\Start-WeSignAI.ps1" -ForegroundColor Gray
Write-Host ""
