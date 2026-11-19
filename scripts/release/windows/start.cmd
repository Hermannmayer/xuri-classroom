@echo off
chcp 65001 >nul
setlocal EnableExtensions
title 旭日云课堂 · 便携版
set "SELF=%~nx0"
set "ROOT=%~dp0"
set "LAUNCHER=%ROOT%lib\launcher.ps1"
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PS%" set "PS=powershell.exe"
set "RC=1"

if not exist "%LAUNCHER%" (
  echo.
  echo [错误] 发布包不完整：找不到 lib\launcher.ps1
  echo        请重新解压完整的发布包，不要只复制其中一部分文件。
  echo.
  goto :finish
)

rem 双击（不带参数）= 打开图形控制台；带参数仍走原来的命令行（脚本/自动化兼容）
if "%~1"=="" goto :gui

"%PS%" -NoProfile -NoLogo -ExecutionPolicy Bypass -File "%LAUNCHER%" start %*
set "RC=%ERRORLEVEL%"
goto :finish

:gui
if not exist "%ROOT%gui.ps1" (
  "%PS%" -NoProfile -NoLogo -ExecutionPolicy Bypass -File "%LAUNCHER%" start
  set "RC=%ERRORLEVEL%"
  goto :finish
)
"%PS%" -NoProfile -NoLogo -ExecutionPolicy Bypass -WindowStyle Hidden -File "%ROOT%gui.ps1"
set "RC=%ERRORLEVEL%"
goto :finish

:finish
if not "%RC%"=="0" call :pause_if_double_click
exit /b %RC%

:pause_if_double_click
rem 双击运行时 CMDCMDLINE 里带脚本名；从命令行调用时没有，直接返回
call set "CMD_STRIPPED=%%CMDCMDLINE:%SELF%=%%"
if not "%CMDCMDLINE%"=="%CMD_STRIPPED%" goto :do_pause
exit /b 0

:do_pause
echo.
echo 按任意键关闭窗口...
pause >nul
exit /b 0
