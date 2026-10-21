@echo off
chcp 65001 >nul
echo ======================================================
echo 正在检查管理员权限...
echo ======================================================
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [已确认] 已以管理员权限运行。
) else (
    echo.
    echo ❌ [错误] 请右键点击此文件，并选择“以管理员身份运行”！
    echo.
    pause
    exit /b
)

echo.
echo 正在清除 Edge 浏览器的组织策略...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge" /f >nul 2>&1
reg delete "HKEY_CURRENT_USER\SOFTWARE\Policies\Microsoft\Edge" /f >nul 2>&1
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Policies\Microsoft\Edge" /f >nul 2>&1

echo 正在清除 Chrome 浏览器的组织策略...
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome" /f >nul 2>&1
reg delete "HKEY_CURRENT_USER\SOFTWARE\Policies\Google\Chrome" /f >nul 2>&1
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Policies\Google\Chrome" /f >nul 2>&1
reg delete "HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google" /f >nul 2>&1
reg delete "HKEY_CURRENT_USER\SOFTWARE\Policies\Google" /f >nul 2>&1

echo 正在重置本地组策略缓存...
RD /S /Q "%WinDir%\System32\GroupPolicyUsers" >nul 2>&1
RD /S /Q "%WinDir%\System32\GroupPolicy" >nul 2>&1

echo 正在强制刷新 Windows 组策略...
gpupdate /force

echo.
echo ======================================================
echo 🎉 [成功] 浏览器组织管理策略清理脚本执行完毕！
echo 请关闭并重新启动 Edge 或 Chrome 浏览器以查看效果。
echo ======================================================
echo.
pause
