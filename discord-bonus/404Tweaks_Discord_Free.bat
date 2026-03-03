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

echo.
echo  %OR%  +============================================================+%R%
echo  %OR%  ^|                                                            ^|%R%
echo  %OR%  ^|    _  _ __  _  _                                          ^|%R%
echo  %OR%  ^|   | || |  \| || |                                         ^|%R%
echo  %OR%  ^|   | >< | () | ||_|                                        ^|%R%
echo  %OR%  ^|   |_||_|\__/|_|(_)   TWEAKS                              ^|%R%
echo  %OR%  ^|                                                            ^|%R%
echo  %OR%  +============================================================+%R%
echo.
echo  %CY%  +-[ DISCORD EXCLUSIVE ]--------------------------------------+%R%
echo  %CY%  ^|                                                            ^|%R%
echo  %CY%  ^|   10 BONUS TWEAKS GRATUITS                                ^|%R%
echo  %CY%  ^|   Ces tweaks ne sont PAS dans le logiciel 404 Tweaks      ^|%R%
echo  %CY%  ^|                                                            ^|%R%
echo  %CY%  ^|   Rejoins : discord.gg/fortniteopt                        ^|%R%
echo  %CY%  ^|   Logiciel : fortniteopt.com                              ^|%R%
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
  reg add "%~1" /v "%~2" /t %~3 /d "%~4" /f >nul 2>&1
  if !errorlevel!==0 (
    echo    %GR%  [OK]  %~5%R%
    set /a OK+=1
  ) else (
    echo    %GY%  [--]  %~5%R%
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
    echo    %GY%  [--]  %~1 (deja desactive ou absent)%R%
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

REM ---- [01/10] Xbox Game Bar & Game DVR -------------------------
call :SECTION "01/10  Xbox Game Bar et Game DVR KILL"
echo  %GY%  Overlay Xbox + capture en fond = input lag et CPU gaspilles%R%
echo.

call :REG_SET "HKCU\System\GameConfigStore" "GameDVR_Enabled" "REG_DWORD" "0" "Game DVR desactive"
call :REG_SET "HKCU\System\GameConfigStore" "GameDVR_FSEBehavior" "REG_DWORD" "2" "FSE comportement = pas de capture"
call :REG_SET "HKCU\System\GameConfigStore" "GameDVR_HonorUserFSEBehaviorMode" "REG_DWORD" "1" "Respecter mode FSE utilisateur"
call :REG_SET "HKLM\SOFTWARE\Policies\Microsoft\Windows\GameDVR" "AllowGameDVR" "REG_DWORD" "0" "Game DVR GPO = OFF"
call :REG_SET "HKCU\Software\Microsoft\GameBar" "AutoGameModeEnabled" "REG_DWORD" "0" "Auto Game Mode = OFF"
call :REG_SET "HKCU\Software\Microsoft\GameBar" "ShowStartupPanel" "REG_DWORD" "0" "Panel demarrage = OFF"
call :REG_SET "HKCU\Software\Microsoft\GameBar" "UseNexusForGameBarEnabled" "REG_DWORD" "0" "Xbox Nexus = OFF"
call :REG_SET "HKCU\Software\Microsoft\Windows\CurrentVersion\GameDVR" "AppCaptureEnabled" "REG_DWORD" "0" "App Capture = OFF"

REM ---- [02/10] Fortnite Process Priority (IFEO) ----------------
call :SECTION "02/10  Fortnite Priority CPU/IO via IFEO"
echo  %GY%  CPU HIGH + IO HIGH appliques automatiquement au lancement%R%
echo.

set "IFEO=HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options"
call :REG_SET "%IFEO%\FortniteClient-Win64-Shipping.exe\PerfOptions" "CpuPriorityClass" "REG_DWORD" "5" "Fortnite CPU Priority = HIGH (5)"
call :REG_SET "%IFEO%\FortniteClient-Win64-Shipping.exe\PerfOptions" "IoPriority" "REG_DWORD" "3" "Fortnite IO Priority = HIGH (3)"
call :REG_SET "%IFEO%\EpicGamesLauncher.exe\PerfOptions" "CpuPriorityClass" "REG_DWORD" "4" "EpicLauncher CPU = Above Normal (4)"

REM ---- [03/10] Effets Visuels Best Performance -----------------
REM NOTE : MinAnimate et TaskbarAnimations sont deja dans 404 Tweaks
call :SECTION "03/10  Effets Visuels Windows -> Best Performance"
echo  %GY%  Desactive les animations visuelles restantes de Windows%R%
echo.

call :REG_SET "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" "VisualFXSetting" "REG_DWORD" "2" "VisualFX = Best Performance"
call :REG_SET "HKCU\Control Panel\Desktop" "DragFullWindows" "REG_SZ" "0" "Drag Full Windows = OFF"
call :REG_SET "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" "ListviewAlphaSelect" "REG_DWORD" "0" "ListView Alpha Select = OFF"
call :REG_SET "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" "ListviewShadow" "REG_DWORD" "0" "ListView Shadow = OFF"

set /a TOTAL+=1
reg add "HKCU\Control Panel\Desktop" /v "UserPreferencesMask" /t REG_BINARY /d 9012038010000000 /f >nul 2>&1
if !errorlevel!==0 (
  echo    %GR%  [OK]  UserPreferencesMask = Best Performance%R%
  set /a OK+=1
) else (
  echo    %GY%  [--]  UserPreferencesMask%R%
)

REM ---- [04/10] Telemetrie Windows OFF --------------------------
call :SECTION "04/10  Telemetrie et Diagnostics Windows OFF"
echo  %GY%  DiagTrack tourne en fond et consomme CPU + bande passante%R%
echo.

call :SC_DISABLE DiagTrack
call :SC_DISABLE dmwappushservice
call :SC_DISABLE diagnosticshub.standardcollector.service
call :SC_DISABLE PcaSvc
call :REG_SET "HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection" "AllowTelemetry" "REG_DWORD" "0" "AllowTelemetry = 0 (GPO)"
call :REG_SET "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection" "AllowTelemetry" "REG_DWORD" "0" "AllowTelemetry = 0 (policy)"
call :REG_SET "HKCU\Software\Microsoft\Windows\CurrentVersion\Privacy" "TailoredExperiencesWithDiagnosticDataEnabled" "REG_DWORD" "0" "Tailored Experiences = OFF"
call :REG_SET "HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat" "DisableInventory" "REG_DWORD" "1" "Inventory Collector = OFF"
call :REG_SET "HKLM\SOFTWARE\Policies\Microsoft\Windows\AppCompat" "DisablePCA" "REG_DWORD" "1" "Program Compatibility Assistant = OFF"

REM ---- [05/10] NVIDIA Telemetrie et Services -------------------
call :SECTION "05/10  NVIDIA  --  Telemetrie et Services inutiles"
echo  %GY%  NvTelemetryContainer consomme du CPU en fond silencieusement%R%
echo.

call :SC_DISABLE NvTelemetryContainer
call :SC_DISABLE NvNetworkService
call :SC_DISABLE NVDisplay.ContainerLocalSystem
call :REG_SET "HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm\Global\Startup" "SendTelemetryData" "REG_DWORD" "0" "NVIDIA telemetrie GPU = OFF"
call :REG_SET "HKCU\Software\NVIDIA Corporation\NVControlPanel2\Client" "OptInOrOutPreference" "REG_DWORD" "0" "NVCP OptIn telemetrie = OFF"

REM ---- [06/10] Fortnite GameUserSettings.ini -------------------
call :SECTION "06/10  Fortnite GameUserSettings.ini (FPS uncap + show FPS)"
echo  %GY%  Debloque le limiteur FPS et active le compteur en jeu%R%
echo.

set /a TOTAL+=1
if not exist "%LOCALAPPDATA%\FortniteGame\Saved\Config\WindowsClient\" (
  echo    %GY%  [--]  Fortnite non detecte - tweak 06 ignore%R%
  goto :SKIP_GSI
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=$env:LOCALAPPDATA+'\FortniteGame\Saved\Config\WindowsClient\GameUserSettings.ini';if(Test-Path $p){$c=Get-Content $p -Raw;if($c -notmatch 'FrameRateLimit'){Add-Content $p ([char]13+[char]10+'FrameRateLimit=0.000000')};if($c -notmatch 'bShowFPS'){Add-Content $p ([char]13+[char]10+'bShowFPS=True')}}" >nul 2>&1
if !errorlevel!==0 (
  echo    %GR%  [OK]  FrameRateLimit = 0.000000 (FPS uncap)%R%
  echo    %GR%  [OK]  bShowFPS = True%R%
  set /a OK+=1
) else (
  echo    %GY%  [--]  Modification GameUserSettings.ini%R%
)
:SKIP_GSI

REM ---- [07/10] Fortnite Engine.ini -----------------------------
call :SECTION "07/10  Fortnite Engine.ini  --  Reseau et Rendu"
echo  %GY%  Bande passante max + r.OneFrameThreadLag=0 (input lag reduit)%R%
echo.

set /a TOTAL+=1
if not exist "%LOCALAPPDATA%\FortniteGame\Saved\Config\WindowsClient\" (
  echo    %GY%  [--]  Fortnite non detecte - tweak 07 ignore%R%
  goto :SKIP_ENG
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=$env:LOCALAPPDATA+'\FortniteGame\Saved\Config\WindowsClient\Engine.ini';if(!(Test-Path $p)){New-Item $p -Force|Out-Null};$c=Get-Content $p -Raw -EA SilentlyContinue;if($c -notmatch 'OneFrameThreadLag'){Add-Content $p ([char]13+[char]10+'[ConsoleVariables]'+[char]13+[char]10+'r.OneFrameThreadLag=0'+[char]13+[char]10+'r.MaxAnisotropy=0'+[char]13+[char]10+'fx.NiagaraAllowGPUSorting=0')}" >nul 2>&1
if !errorlevel!==0 (
  echo    %GR%  [OK]  r.OneFrameThreadLag = 0%R%
  echo    %GR%  [OK]  r.MaxAnisotropy = 0%R%
  echo    %GR%  [OK]  fx.NiagaraAllowGPUSorting = 0%R%
  set /a OK+=1
) else (
  echo    %GY%  [--]  Modification Engine.ini%R%
)
:SKIP_ENG

REM ---- [08/10] Full-Screen Optimizations OFF -------------------
call :SECTION "08/10  Full-Screen Optimizations OFF (Fortnite)"
echo  %GY%  FSO peut causer du stutter et augmenter la latence input%R%
echo.

set "EXE_PATH=C:\Program Files\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"
set "EXE2=C:\Program Files (x86)\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe"
set "FSO_KEY=HKCU\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers"
call :REG_SET "%FSO_KEY%" "%EXE_PATH%" "REG_SZ" "~ DISABLEDXMAXIMIZEDWINDOWEDMODE" "FSO desactive pour FortniteClient"
call :REG_SET "%FSO_KEY%" "%EXE2%" "REG_SZ" "~ DISABLEDXMAXIMIZEDWINDOWEDMODE" "FSO desactive pour EpicGamesLauncher"

REM ---- [09/10] Windows Search OFF ------------------------------
REM NOTE : SysMain est deja desactive par 404 Tweaks
call :SECTION "09/10  Windows Search  --  Arrete et Desactive"
echo  %GY%  WSearch indexe en fond = pics CPU et IO aleatoires en partie%R%
echo.

call :SC_DISABLE WSearch
call :REG_SET "HKLM\SYSTEM\CurrentControlSet\Services\WSearch" "Start" "REG_DWORD" "4" "WSearch startup = Disabled (4)"
call :REG_SET "HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search" "AllowIndexingEncryptedStoresOrItems" "REG_DWORD" "0" "Windows Search GPO = OFF"

REM ---- [10/10] Services inutiles OFF ---------------------------
REM NOTE : SysMain et DiagTrack sont deja traites ci-dessus
call :SECTION "10/10  Services inutiles  --  WER / Print Spooler / Fax"
echo  %GY%  Services inutiles pour un gamer = RAM et CPU liberes%R%
echo.

call :SC_DISABLE WerSvc
call :SC_DISABLE Spooler
call :SC_DISABLE Fax
call :REG_SET "HKLM\SOFTWARE\Microsoft\Windows\Windows Error Reporting" "Disabled" "REG_DWORD" "1" "Windows Error Reporting systeme = OFF"
call :REG_SET "HKCU\SOFTWARE\Microsoft\Windows\Windows Error Reporting" "DontSendAdditionalData" "REG_DWORD" "1" "WER envoi donnees = OFF"

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
  echo  %YE%  !SKIPPED! operation(s) ignoree(s) -- deja en place ou service absent.%R%
)

echo.
echo  %OR%  +============================================================+%R%
echo  %OR%  ^|                                                            ^|%R%
echo  %OR%  ^|   ENCORE PLUS DE TWEAKS EXCLUSIFS SUR NOTRE DISCORD       ^|%R%
echo  %OR%  ^|                                                            ^|%R%
echo  %OR%  ^|       discord.gg/fortniteopt                              ^|%R%
echo  %OR%  ^|                                                            ^|%R%
echo  %OR%  ^|   Logiciel complet sur : fortniteopt.com                  ^|%R%
echo  %OR%  ^|                                                            ^|%R%
echo  %OR%  +============================================================+%R%
echo.
echo  %YE%  [!] REDEMARRAGE REQUIS pour appliquer tous les changements.%R%
echo.
choice /c RN /n /m "  R = Redemarrer maintenant  |  N = Plus tard : "
if errorlevel 2 goto :EOF
shutdown /r /t 0

:EOF
endlocal
