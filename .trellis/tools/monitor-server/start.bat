@echo off
REM Trellis Monitor Server - Windows 启动脚本

echo.
echo ========================================
echo   Trellis Channel Monitor Server
echo ========================================
echo.

cd /d "%~dp0"

REM 检查 node_modules
if not exist "node_modules\" (
    echo [1/2] 首次运行，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [1/2] 依赖已安装
)

echo [2/2] 启动服务器...
echo.

call npm start

pause
