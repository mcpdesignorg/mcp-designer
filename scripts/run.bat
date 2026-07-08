@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0.."

set "WORKSPACE_DIR=%~1"
if "%WORKSPACE_DIR%"=="" set "WORKSPACE_DIR=spec"

if "%MCP_DESIGNER_PORT%"=="" set "MCP_DESIGNER_PORT=3131"

where npm >nul 2>&1
if errorlevel 1 (
    echo npm is required but was not found in PATH. >&2
    exit /b 1
)

rem Check if server is already running on the port.
netstat -ano 2>nul | findstr /r ":%MCP_DESIGNER_PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo MCP Designer is already running at http://127.0.0.1:%MCP_DESIGNER_PORT%
    if not "%MCP_DESIGNER_NO_OPEN%"=="1" (
        start "" "http://127.0.0.1:%MCP_DESIGNER_PORT%"
    )
    exit /b 0
)

if not exist "node_modules" (
    echo Installing dependencies...
    npm ci
    if errorlevel 1 exit /b 1
)

echo Building MCP Designer...
npm run build
if errorlevel 1 exit /b 1

echo Starting MCP Designer for workspace: %WORKSPACE_DIR%
echo Set MCP_DESIGNER_PORT to choose a port (default: %MCP_DESIGNER_PORT%), or MCP_DESIGNER_NO_OPEN=1 to skip opening the browser.
set MCP_DESIGNER_PORT=%MCP_DESIGNER_PORT%
node packages\server\dist\index.js "%WORKSPACE_DIR%"
