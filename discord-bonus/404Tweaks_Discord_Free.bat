@echo off
setlocal EnableExtensions EnableDelayedExpansion
title 404 Tweaks - Discord Exclusive

REM -- Auto-elevation admin
fltmc >nul 2>&1 || (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs -Wait"
  exit /b
)

REM -- ANSI colors (Windows 10 / 11)
for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do (
  set "DEL=%%a"
  set "E=%%b"
)
set "R=%E%[0m"
set "CY=%E%[96m"
set "GR=%E%[92m"
set "YE=%E%[93m"
set "GY=%E%[90m"
set "WH=%E%[97m"
set "PU=%E%[95m"
set "OR=%E%[33m"

set /a OK=0
set /a TOTAL=0
cls


echo %OR%
echo(
echo($$\   $$\  $$$$$$\  $$\   $$\^
echo($$ ^|  $$ ^|$$$ __$$\ $$ ^|  $$ ^|
echo($$ ^|  $$ ^|$$$$\ $$ ^|$$ ^|  $$ ^|
echo($$$$$$$$ ^|$$\$$\$$ ^|$$$$$$$$ ^|
echo(\_____$$ ^|$$ \$$$$ ^|\_____$$ ^|
echo(      $$ ^|$$ ^|\$$$ ^|      $$ ^|
echo(      $$ ^|\$$$$$$  /      $$ ^|
echo(      \__^| \______/       \__^|
echo %R%


echo.
echo  %CY%  +-[ DISCORD EXCLUSIVE ]--------------------------------------+%R%
echo  %CY%  ^|                                                            ^|%R%
echo  %CY%  ^|   10 BONUS TWEAKS GRATUITS                                ^|%R%
echo  %CY%  ^|   Ces tweaks ne sont PAS dans le logiciel 404 Tweaks      ^|%R%
echo  %CY%  ^|                                                            ^|%R%
echo  %CY%  ^|   Rejoins : discord.gg/YacGgRdBAY                         ^|%R%
echo  %CY%  ^|   Logiciel : https://404tweaks.tech/                      ^|%R%
echo  %CY%  ^|                                                            ^|%R%
echo  %CY%  +------------------------------------------------------------+%R%
echo.
echo  %GY%  v1.0  --  Windows 10 ^& 11 x64  --  Necessite les droits Admin%R%
echo  %GY%  ------------------------------------------------------------%R%
echo.
echo  %YE%  [!] Cree un point de restauration avant de continuer.%R%
echo  %YE%  [!] Redemarrage requis apres application.%R%
echo.
pause

goto :MAIN

REM ================================================================
REM  Subroutines
REM ================================================================

:REG_SET
  set /a TOTAL+=1
  set "MSG=%~5"
  reg add "%~1" /v "%~2" /t %~3 /d "%~4" /f >nul 2>&1
  if !errorlevel!==0 (
    echo    %GR%  [OK]  !MSG!%R%
    set /a OK+=1
  ) else (
    echo    %GY%  [--]  !MSG!%R%
  )
exit /b

:SC_DISABLE
  set /a TOTAL+=1
  sc stop "%~1" >nul 2>&1
  sc config "%~1" start= disabled >nul 2>&1
  if !errorlevel!==0 (
    echo    %GR%  [OK]  Service OFF : %~1%R%
    set /a OK+=1
  ) else (
    echo    %GY%  [--]  %~1 ^(deja desactive ou absent^)%R%
  )
exit /b

:SECTION
  echo.
  echo  %CY%  +-[ %~1 ]%R%
  echo  %CY%  +------------------------------------------------------------%R%
exit /b

REM ================================================================
:MAIN
REM ================================================================

REM ---- [01/10] Game DVR OFF --------------------------------------
call :SECTION "01/10  Game DVR OFF"
echo  %GY%  Desactive la capture en fond (moins CPU/IO)%R%
echo.
call :REG_SET "HKCU\System\GameConfigStore" "GameDVR_Enabled" "REG_DWORD" "0" "GameDVR_Enabled = 0"

REM ---- [02/10] App Capture OFF -----------------------------------
call :SECTION "02/10  App Capture OFF"
echo  %GY%  Desactive l'enregistrement/clip Windows%R%
echo.
call :REG_SET "HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR" "AppCaptureEnabled" "REG_DWORD" "0" "AppCaptureEnabled = 0"

REM ---- [03/10] VisualFX Best Performance -------------------------
call :SECTION "03/10  VisualFX -> Best Performance"
echo  %GY%  Moins d'effets visuels = plus fluide%R%
echo.
call :REG_SET "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" "VisualFXSetting" "REG_DWORD" "2" "VisualFXSetting = 2"

REM ---- [04/10] UserPreferencesMask Best Performance ---------------
call :SECTION "04/10  UserPreferencesMask -> Best Performance"
echo  %GY%  Force un preset perf sur les effets Windows%R%
echo.
set /a TOTAL+=1
reg add "HKCU\Control Panel\Desktop" /v "UserPreferencesMask" /t REG_BINARY /d 9012038010000000 /f >nul 2>&1
if !errorlevel!==0 (
  echo    %GR%  [OK]  UserPreferencesMask = Best Performance%R%
  set /a OK+=1
) else (
  echo    %GY%  [--]  UserPreferencesMask%R%
)

REM ---- [05/10] Telemetry service OFF (DiagTrack) -----------------
call :SECTION "05/10  Telemetry Service OFF (DiagTrack)"
echo  %GY%  Stoppe la telemetrie systeme en fond%R%
echo.
call :SC_DISABLE DiagTrack

REM ---- [06/10] AllowTelemetry = 0 (GPO) --------------------------
call :SECTION "06/10  AllowTelemetry = 0 (GPO)"
echo  %GY%  Coupe la collecte diag (policy)%R%
echo.
call :REG_SET "HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection" "AllowTelemetry" "REG_DWORD" "0" "AllowTelemetry (GPO) = 0"

REM ---- [07/10] NVIDIA Telemetry Service OFF ----------------------
call :SECTION "07/10  NVIDIA Telemetry OFF"
echo  %GY%  Desactive NvTelemetryContainer%R%
echo.
call :SC_DISABLE NvTelemetryContainer

REM ---- [08/10] NVIDIA driver telemetry OFF -----------------------
call :SECTION "08/10  NVIDIA Driver Telemetry OFF"
echo  %GY%  Desactive l'envoi telemetrie du driver%R%
echo.
call :REG_SET "HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm\Global\Startup" "SendTelemetryData" "REG_DWORD" "0" "NVIDIA SendTelemetryData = 0"

REM ---- [09/10] Power Throttling OFF ------------------------------
call :SECTION "09/10  Power Throttling OFF"
echo  %GY%  Empeche Windows de limiter des applis en arriere-plan%R%
echo.
call :REG_SET "HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" "PowerThrottlingOff" "REG_DWORD" "1" "PowerThrottlingOff = 1"

REM ---- [10/10] GameInput Service OFF -----------------------------
call :SECTION "10/10  GameInput Service OFF"
echo  %GY%  Stoppe GameInput en fond (option gamer)%R%
echo.
call :SC_DISABLE GameInputSvc


REM ================================================================
REM  RESUME FINAL
REM ================================================================
echo.
echo  %CY%  +------------------------------------------------------------+%R%
echo  %CY%  ^|                    RESUME FINAL                           ^|%R%
echo  %CY%  +------------------------------------------------------------+%R%
echo.
echo  %WH%  Tweaks appliques :  %GR%!OK! / !TOTAL!%R%
echo.

if !OK! GEQ !TOTAL! (
  echo  %GR%  PARFAIT -- Tous les tweaks ont ete appliques !%R%
) else (
  set /a SKIPPED=!TOTAL!-!OK!
  echo  %YE%  !SKIPPED! operation^(s^) ignoree^(s^) -- deja en place ou service absent.%R%
)

echo.
echo  %OR%  +============================================================+%R%
echo  %OR%  ^|                                                            ^|%R%
echo  %OR%  ^|   ENCORE PLUS DE TWEAKS EXCLUSIFS SUR NOTRE DISCORD       ^|%R%
echo  %OR%  ^|                                                            ^|%R%
echo  %OR%  ^|       discord.gg/YacGgRdBAY                              ^|%R%
echo  %OR%  ^|                                                            ^|%R%
echo  %OR%  ^|   Logiciel complet sur : https://404tweaks.tech/          ^|%R%
echo  %OR%  ^|                                                            ^|%R%
echo  %OR%  +============================================================+%R%
echo.
echo  %YE%  [!] REDEMARRAGE RECOMMANDE pour appliquer tous les changements.%R%
echo.
choice /c RN /n /m "  R = Redemarrer maintenant  |  N = Plus tard : "
if errorlevel 2 goto :EOF
shutdown /r /t 0

:EOF
endlocal