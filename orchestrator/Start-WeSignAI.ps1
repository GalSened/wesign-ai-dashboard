# WeSign AI Assistant - Smart Startup Script (PowerShell)
# Ensures correct service launch order and health checks

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WeSign AI Assistant - Startup Protocol" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill existing processes
Write-Host "[1/5] Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "    ✓ Cleanup complete" -ForegroundColor Green
Write-Host ""

# Step 2: Start WeSign MCP Server
Write-Host "[2/5] Starting WeSign MCP HTTP Server..." -ForegroundColor Yellow
Set-Location "C:\Users\gals\Desktop\wesign-mcp-server"
Start-Process cmd -ArgumentList "/c", "npm run start:server 2>&1 | tee mcp-server.log" -WindowStyle Normal
Write-Host "    ✓ MCP Server starting..." -ForegroundColor Green
Write-Host ""

# Step 3: Wait for MCP Server health
Write-Host "[3/5] Waiting for MCP Server health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$mcpHealthy = $false
$attempts = 0
while (-not $mcpHealthy -and $attempts -lt 10) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $mcpHealthy = $true
        }
    } catch {
        Write-Host "    Waiting for MCP server... (attempt $($attempts + 1)/10)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
        $attempts++
    }
}

if ($mcpHealthy) {
    Write-Host "    ✓ MCP Server is healthy!" -ForegroundColor Green
} else {
    Write-Host "    ✗ MCP Server failed to start!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Start Orchestrator
Write-Host "[4/5] Starting WeSign AI Orchestrator..." -ForegroundColor Yellow
Set-Location "C:\Users\gals\source\repos\wesign-ai-dashboard\orchestrator"
Start-Process cmd -ArgumentList "/c", "venv\Scripts\python.exe main.py 2>&1 | tee orchestrator.log" -WindowStyle Normal
Write-Host "    ✓ Orchestrator starting..." -ForegroundColor Green
Write-Host ""

# Step 5: Wait for Orchestrator health
Write-Host "[5/5] Waiting for Orchestrator health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$orchHealthy = $false
$attempts = 0
while (-not $orchHealthy -and $attempts -lt 15) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $orchHealthy = $true
        }
    } catch {
        Write-Host "    Waiting for orchestrator... (attempt $($attempts + 1)/15)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
        $attempts++
    }
}

if ($orchHealthy) {
    Write-Host "    ✓ Orchestrator is healthy!" -ForegroundColor Green
} else {
    Write-Host "    ✗ Orchestrator failed to start!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Verify MCP tools
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verifying MCP Tools Integration..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $healthData = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
    $mcpTools = $healthData.mcp_tools.wesign

    if ($mcpTools -gt 0) {
        Write-Host "✓ MCP Tools loaded: $mcpTools WeSign tools available" -ForegroundColor Green
    } else {
        Write-Host "⚠ WARNING: No MCP tools loaded (found: $mcpTools)" -ForegroundColor Yellow
        Write-Host "  This may indicate MCP server connection issues" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not verify MCP tools status" -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Success!
Write-Host "========================================" -ForegroundColor Green
Write-Host "🎉 WeSign AI Assistant is Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services Running:" -ForegroundColor White
Write-Host "  • WeSign MCP Server:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  • AI Orchestrator:    http://localhost:8000" -ForegroundColor Cyan
Write-Host "  • Login Page:         http://localhost:8000/login" -ForegroundColor Cyan
Write-Host "  • Chat Interface:     http://localhost:8000/ui" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening login page..." -ForegroundColor Yellow
Start-Process "http://localhost:8000/login"
Write-Host ""
Write-Host "To stop all services, run: .\Stop-WeSignAI.ps1" -ForegroundColor Gray
