// ══════════════════════════════════════════════════════════════════════
//  tweaks.cpp — SLIDE Performance Utility
//  10 modules d'optimisation système pour FortniteOpti 2026
// ══════════════════════════════════════════════════════════════════════
#include "tweaks.h"
#include <string>
#include <cstdlib>
#include <windows.h>

// ══════════════════════════════════════════════════════════════════════
//  Helpers internes (static = scope fichier)
// ══════════════════════════════════════════════════════════════════════

static bool _reg(AppState& s,
    const std::string& path, const std::string& name,
    const std::string& type, const std::string& val,
    const std::string& desc)
{
    GuiLog(s, "  > " + desc, 3);
    std::string cmd = "reg add \"" + path + "\" /v \"" + name
                    + "\" /t " + type + " /d " + val + " /f >nul 2>&1";
    if (::system(cmd.c_str()) == 0) { GuiLog(s, "    [OK]", 1); return true; }
    GuiLog(s, "    [SKIP]", 3);
    return false;
}

static bool _del(AppState& s,
    const std::string& path, const std::string& name,
    const std::string& desc)
{
    GuiLog(s, "  > " + desc, 3);
    std::string cmd = "reg delete \"" + path + "\" /v \"" + name + "\" /f >nul 2>&1";
    if (::system(cmd.c_str()) == 0) { GuiLog(s, "    [OK]", 1); return true; }
    GuiLog(s, "    [SKIP]", 3);
    return false;
}

static bool _ps(AppState& s, const std::string& script, const std::string& desc) {
    GuiLog(s, "  > " + desc, 3);
    std::string cmd = "powershell -NoProfile -ExecutionPolicy Bypass -Command \""
                    + script + "\" >nul 2>&1";
    if (::system(cmd.c_str()) == 0) { GuiLog(s, "    [OK]", 1); return true; }
    GuiLog(s, "    [SKIP]", 3);
    return false;
}

static bool _cmd(AppState& s, const std::string& cmd, const std::string& desc) {
    GuiLog(s, "  > " + desc, 3);
    if (::system((cmd + " >nul 2>&1").c_str()) == 0) { GuiLog(s, "    [OK]", 1); return true; }
    GuiLog(s, "    [SKIP]", 3);
    return false;
}

// ══════════════════════════════════════════════════════════════════════
//  Helpers registre read-only (pour les fonctions check*)
// ══════════════════════════════════════════════════════════════════════

static bool chkDWORD(HKEY root, const char* path, const char* name, DWORD expected) {
    HKEY hk;
    if (RegOpenKeyExA(root, path, 0, KEY_READ, &hk) != ERROR_SUCCESS) return false;
    DWORD v = 0, type, sz = sizeof(v);
    bool ok = RegQueryValueExA(hk, name, nullptr, &type, (LPBYTE)&v, &sz) == ERROR_SUCCESS
              && type == REG_DWORD && v == expected;
    RegCloseKey(hk);
    return ok;
}

static bool chkSZ(HKEY root, const char* path, const char* name, const char* expected) {
    HKEY hk;
    if (RegOpenKeyExA(root, path, 0, KEY_READ, &hk) != ERROR_SUCCESS) return false;
    char buf[64] = {};
    DWORD type, sz = sizeof(buf);
    bool ok = RegQueryValueExA(hk, name, nullptr, &type, (LPBYTE)buf, &sz) == ERROR_SUCCESS
              && (type == REG_SZ || type == REG_EXPAND_SZ)
              && strcmp(buf, expected) == 0;
    RegCloseKey(hk);
    return ok;
}

// ── Compteur de résultats ──
struct Stat {
    AppState& s;
    int ok = 0, tot = 0;
    explicit Stat(AppState& s) : s(s) {}

    bool reg(const std::string& p, const std::string& n,
             const std::string& t, const std::string& v,
             const std::string& d)
    { ++tot; bool r = _reg(s,p,n,t,v,d); if(r) ++ok; return r; }

    bool del(const std::string& p, const std::string& n, const std::string& d)
    { ++tot; bool r = _del(s,p,n,d); if(r) ++ok; return r; }

    bool ps(const std::string& script, const std::string& d)
    { ++tot; bool r = _ps(s,script,d); if(r) ++ok; return r; }

    bool cmd(const std::string& c, const std::string& d)
    { ++tot; bool r = _cmd(s,c,d); if(r) ++ok; return r; }

    void summary(const std::string& mod) {
        int col = (ok == tot) ? 1 : 3;
        GuiLog(s, "  " + mod + " : " + std::to_string(ok)
                 + "/" + std::to_string(tot) + " appliques", col);
    }
};

// ══════════════════════════════════════════════════════════════════════
namespace tweaks {
// ══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
//  🛡️  BACKUP & SECURITE
// ─────────────────────────────────────────────────────────────────────
void applyBackup(AppState& s) {
    GuiLog(s, "== BACKUP & SECURITE ==", 5);
    Stat st(s);

    // Création du dossier sur le Bureau via PowerShell (idempotent)
    st.ps("$d=[Environment]::GetFolderPath('Desktop')+'\\RegistryBackup';"
          "New-Item -ItemType Directory -Force -Path $d | Out-Null",
          "Creer dossier RegistryBackup sur Bureau");

    // Point de restauration système
    st.ps("Enable-ComputerRestore -Drive 'C:\\' -ErrorAction SilentlyContinue;"
          "Checkpoint-Computer -Description 'FortniteOpti_Backup'"
          " -RestorePointType MODIFY_SETTINGS -ErrorAction SilentlyContinue",
          "Point de restauration systeme (Checkpoint-Computer)");

    // Export complet du registre
    st.cmd("reg export HKLM "
           "\"%USERPROFILE%\\Desktop\\RegistryBackup\\HKLM_backup.reg\" /y",
           "Export HKLM vers Bureau\\RegistryBackup");
    st.cmd("reg export HKCU "
           "\"%USERPROFILE%\\Desktop\\RegistryBackup\\HKCU_backup.reg\" /y",
           "Export HKCU vers Bureau\\RegistryBackup");

    st.summary("BACKUP");
    GuiLog(s, "  Sauvegardes : Desktop\\RegistryBackup\\", 4);
}

// ─────────────────────────────────────────────────────────────────────
//  🪟  WINDOWS / SYSTEME
// ─────────────────────────────────────────────────────────────────────
void applyWindows(AppState& s) {
    GuiLog(s, "== WINDOWS / SYSTEME ==", 5);
    Stat st(s);

    // — Remote Assistance —
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance",
           "fAllowToGetHelp", "REG_DWORD", "0",
           "Desactiver Remote Assistance");

    // — Microsoft Edge —
    const std::string EDGE = "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge";
    st.reg(EDGE, "StartupBoostEnabled",  "REG_DWORD", "0",
           "Desactiver Edge Startup Boost");
    st.reg(EDGE, "BackgroundModeEnabled","REG_DWORD", "0",
           "Desactiver Edge Background Mode");

    // — Historique de recherche périphériques —
    st.reg("HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\SearchSettings",
           "IsDeviceSearchHistoryEnabled", "REG_DWORD", "0",
           "Desactiver historique de recherche peripheriques");

    // — LanmanServer (SMB) ────────────────────────────────────────────
    const std::string LS =
        "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters";
    st.reg(LS, "autodisconnect",    "REG_DWORD", "4294967295",
           "SMB : desactiver auto-disconnect");
    st.reg(LS, "Size",              "REG_DWORD", "3",
           "SMB server size = mode performance");
    st.reg(LS, "EnableOplocks",     "REG_DWORD", "0",
           "Desactiver Opportunistic Locks (Oplocks)");
    st.reg(LS, "IRPStackSize",      "REG_DWORD", "32",
           "Augmenter IRPStackSize a 32");
    st.reg(LS, "EnableForcedLogoff","REG_DWORD", "0",
           "Supprimer delais violations de partage");

    // — Profil Multimedia Windows ─────────────────────────────────────
    const std::string MM =
        "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile";
    st.reg(MM, "SystemResponsiveness", "REG_DWORD", "0",
           "Multimedia SystemResponsiveness = 0 (max jeux)");
    st.reg(MM, "AlwaysOn",             "REG_DWORD", "1",
           "Activer Multimedia AlwaysOn mode");

    const std::string MMG = MM + "\\Tasks\\Games";
    st.reg(MMG, "LazyModeTimeout",    "REG_DWORD", "0",
           "Desactiver Lazy Mode multimedia");
    st.reg(MMG, "GPU Priority",       "REG_DWORD", "8",
           "GPU Priority jeux = 8");
    st.reg(MMG, "Priority",           "REG_DWORD", "6",
           "CPU Priority jeux = 6");
    st.reg(MMG, "Scheduling Category","REG_SZ", "High",
           "Scheduling Category = High");
    st.reg(MMG, "SFIO Priority",      "REG_SZ", "High",
           "SFIO Priority = High");

    // — Content Delivery / Suggestions ───────────────────────────────
    const std::string CDM =
        "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager";
    st.reg(CDM, "ContentDeliveryAllowed",          "REG_DWORD", "0",
           "Desactiver Windows Content Delivery");
    st.reg(CDM, "SubscribedContent-338388Enabled", "REG_DWORD", "0",
           "Desactiver suggestions Spotlight");
    st.reg(CDM, "SubscribedContent-338389Enabled", "REG_DWORD", "0",
           "Desactiver suggestions Lock Screen");
    st.reg(CDM, "SubscribedContent-353694Enabled", "REG_DWORD", "0",
           "Desactiver suggestions Settings");
    st.reg(CDM, "SubscribedContent-353696Enabled", "REG_DWORD", "0",
           "Desactiver suggestions Settings (2)");
    st.reg(CDM, "SilentInstalledAppsEnabled",      "REG_DWORD", "0",
           "Desactiver installation silencieuse d'apps");
    st.reg(CDM, "OemPreInstalledAppsEnabled",      "REG_DWORD", "0",
           "Desactiver apps OEM pre-installees");

    // — Settings Sync (tout désactiver) ──────────────────────────────
    st.reg("HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\SettingSync",
           "SyncPolicy", "REG_DWORD", "5",
           "Desactiver Setting Sync completement");

    const std::string SS =
        "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\SettingSync\\Groups";
    for (const char* grp : {"BrowserSettings","Credentials","Accessibility",
                             "Windows","Personalization","Language"}) {
        st.reg(SS + std::string("\\") + grp, "Enabled", "REG_DWORD", "0",
               std::string("Sync off : ") + grp);
    }

    // — Interface & UI ────────────────────────────────────────────────
    st.reg("HKCU\\Control Panel\\Desktop",
           "FontSmoothing", "REG_SZ", "2",
           "Optimiser Font Smoothing (ClearType)");
    st.reg("HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
           "ShowTaskViewButton", "REG_DWORD", "0",
           "Masquer bouton Task View");
    st.reg("HKCU\\Control Panel\\Desktop\\WindowMetrics",
           "MinAnimate", "REG_SZ", "0",
           "Desactiver animations minimise/maximise");
    st.reg("HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
           "TaskbarAnimations", "REG_DWORD", "0",
           "Desactiver animations Taskbar");

    st.summary("WINDOWS");
}

// ─────────────────────────────────────────────────────────────────────
//  🎮  GPU TWEAKS
// ─────────────────────────────────────────────────────────────────────
void applyGpu(AppState& s) {
    GuiLog(s, "== GPU TWEAKS ==", 5);
    Stat st(s);

    // — PCIe Link State Power Management (off) —
    st.cmd("powercfg -setacvalueindex scheme_current sub_pciexpress "
           "ee12f906-d277-404b-b6da-e5fa1a576df5 0",
           "Desactiver PCIe Link State Power Mgmt (AC)");
    st.cmd("powercfg -setdcvalueindex scheme_current sub_pciexpress "
           "ee12f906-d277-404b-b6da-e5fa1a576df5 0",
           "Desactiver PCIe Link State Power Mgmt (DC)");

    // — GPU Idle AC/DC (NVIDIA) — désactive le downclocking au ralenti
    st.ps("Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\"
          "{4d36e968-e325-11ce-bfc1-08002be10318}' -ErrorAction SilentlyContinue | "
          "Where-Object { $_.GetValue('DriverDesc') -match 'NVIDIA' } | "
          "ForEach-Object { "
          "  Set-ItemProperty -Path $_.PSPath -Name 'PerfLevelSrc' -Value 0x2222 "
          "    -Type DWord -Force -ErrorAction SilentlyContinue }",
          "Desactiver GPU idle AC/DC NVIDIA (PerfLevelSrc)");

    // — Hardware Accelerated GPU Scheduling (HAGS) —
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
           "HwSchMode", "REG_DWORD", "2",
           "Activer HAGS (Hardware Accelerated GPU Scheduling)");

    // — DWM / animations visuelles —
    st.reg("HKCU\\SOFTWARE\\Microsoft\\Windows\\DWM",
           "Animations",      "REG_DWORD", "0",
           "Desactiver animations DWM");
    st.reg("HKCU\\SOFTWARE\\Microsoft\\Windows\\DWM",
           "EnableAeroPeek",  "REG_DWORD", "0",
           "Desactiver Aero Peek");

    // — TDR (stabilité + évite crash GPU sous charge) —
    const std::string GFX = "HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers";
    st.reg(GFX, "TdrDelay",    "REG_DWORD", "60",
           "TDR Delay = 60s (stabilite GPU)");
    st.reg(GFX, "TdrDdiDelay", "REG_DWORD", "60",
           "TDR DDI Delay = 60s");
    st.reg(GFX, "TdrLevel",    "REG_DWORD", "3",
           "TDR Level = 3 (recover on timeout)");

    st.cmd("powercfg -setactive scheme_current",
           "Appliquer plan alimentation modifie");

    st.summary("GPU");
}

// ─────────────────────────────────────────────────────────────────────
//  🧠  CPU TWEAKS
// ─────────────────────────────────────────────────────────────────────
void applyCpu(AppState& s) {
    GuiLog(s, "== CPU TWEAKS ==", 5);
    Stat st(s);

    // — Power Throttling OFF —
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling",
           "PowerThrottlingOff", "REG_DWORD", "1",
           "Desactiver CPU Power Throttling");

    // — Scheduler Windows (foreground boost max) —
    // 38 = 0x26 = priorité premier plan max + quantum variable long
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl",
           "Win32PrioritySeparation", "REG_DWORD", "38",
           "Optimiser foreground scheduling (Win32PrioritySeparation=38)");

    // — SystemResponsiveness = 0 (100% ressources pour le jeu) —
    st.reg("HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
           "SystemResponsiveness", "REG_DWORD", "0",
           "SystemResponsiveness = 0 (jeu = priorite absolue)");

    // — PEP Performance States (évite throttling agressif) —
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power",
           "PlatformAoAcOverride", "REG_DWORD", "0",
           "Activer PEP Performance States");

    // — Core Parking désactivé —
    st.cmd("powercfg -setacvalueindex scheme_current sub_processor CPMINCORES 100",
           "Desactiver Core Parking (min 100% cores actifs)");
    st.cmd("powercfg -setacvalueindex scheme_current sub_processor CPMAXCORES 100",
           "Fixer max CPU cores a 100%");

    // — CPU Boost agressif —
    st.cmd("powercfg -setacvalueindex scheme_current sub_processor PERFBOOSTMODE 2",
           "CPU Boost Mode = Agressif");
    st.cmd("powercfg -setacvalueindex scheme_current sub_processor PERFINCTHRESHOLD 10",
           "CPU performance increase threshold = 10%");
    st.cmd("powercfg -setacvalueindex scheme_current sub_processor PERFDECTHRESHOLD 10",
           "CPU performance decrease threshold = 10%");

    // — Timer haute résolution (latence système réduite) —
    st.cmd("bcdedit /deletevalue useplatformclock",
           "Desactiver HPET (latence timer reduite)");
    st.cmd("bcdedit /set disabledynamictick yes",
           "Desactiver Dynamic Tick");
    st.cmd("bcdedit /set useplatformtick yes",
           "Forcer timer haute resolution");

    st.cmd("powercfg -setactive scheme_current",
           "Appliquer plan alimentation modifie");

    st.summary("CPU");
}

// ─────────────────────────────────────────────────────────────────────
//  🧬  RAM / MEMOIRE
// ─────────────────────────────────────────────────────────────────────
void applyRam(AppState& s) {
    GuiLog(s, "== RAM / MEMOIRE ==", 5);
    Stat st(s);

    // — Vider la Standby Memory via NtSetSystemInformation —
    st.ps("$sig='[DllImport(\"ntdll.dll\")] public static extern int "
          "NtSetSystemInformation(int InfoClass, IntPtr Info, int Length);';"
          "$nt=Add-Type -MemberDefinition $sig -Name 'NtDll' -Namespace 'Win32' -PassThru;"
          "$nt::NtSetSystemInformation(0x50,[System.IntPtr]::Zero,0)|Out-Null",
          "Vider Standby Memory (NT Kernel 0x50)");

    const std::string MM =
        "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management";

    // — Paging Executive en RAM (kernel reste en mémoire physique) —
    st.reg(MM, "DisablePagingExecutive", "REG_DWORD", "1",
           "Desactiver Paging Executive (kernel en RAM)");

    // — LargeSystemCache = 0 (optimise pour les applications/gaming) —
    st.reg(MM, "LargeSystemCache", "REG_DWORD", "0",
           "Cache systeme = optimise applications (gaming)");

    // — Memory Compression —
    st.ps("Enable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue",
          "Activer Memory Compression");

    st.summary("RAM");
}

// ─────────────────────────────────────────────────────────────────────
//  🧹  NETTOYAGE SYSTEME
// ─────────────────────────────────────────────────────────────────────
void applyCleanup(AppState& s) {
    GuiLog(s, "== NETTOYAGE SYSTEME ==", 5);
    Stat st(s);

    // TEMP utilisateur
    st.cmd("for /D %i in (\"%TEMP%\\*\") do rd /s /q \"%i\" 2>nul"
           " & del /f /s /q \"%TEMP%\\*\" 2>nul",
           "Suppression fichiers TEMP utilisateur");

    // TEMP Windows
    st.cmd("for /D %i in (\"%WINDIR%\\Temp\\*\") do rd /s /q \"%i\" 2>nul"
           " & del /f /s /q \"%WINDIR%\\Temp\\*\" 2>nul",
           "Suppression fichiers TEMP Windows");

    // Cache DirectX Shader
    st.ps("Remove-Item -Path \"$env:LOCALAPPDATA\\D3DSCache\\*\""
          " -Recurse -Force -ErrorAction SilentlyContinue",
          "Nettoyage cache DirectX Shader");

    // Cache Delivery Optimization
    st.ps("Remove-Item -Path"
          " \"$env:WINDIR\\SoftwareDistribution\\DeliveryOptimization\\*\""
          " -Recurse -Force -ErrorAction SilentlyContinue",
          "Nettoyage cache Delivery Optimization");

    // DNS flush
    st.cmd("ipconfig /flushdns",
           "Flush cache DNS");

    // Corbeille
    st.ps("Clear-RecycleBin -Force -ErrorAction SilentlyContinue",
          "Vider la corbeille");

    st.summary("NETTOYAGE");
}

// ─────────────────────────────────────────────────────────────────────
//  🌐  RESEAU / INTERNET
// ─────────────────────────────────────────────────────────────────────
void applyNetwork(AppState& s) {
    GuiLog(s, "== RESEAU / INTERNET ==", 5);
    Stat st(s);

    // — Nagle off + TcpAckFrequency=1 + DelAckTicks=0 sur toutes les interfaces —
    st.ps("Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Services"
          "\\Tcpip\\Parameters\\Interfaces' -ErrorAction SilentlyContinue | "
          "ForEach-Object { "
          "  Set-ItemProperty -Path $_.PSPath -Name 'TCPNoDelay'"
          "    -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue;"
          "  Set-ItemProperty -Path $_.PSPath -Name 'TcpAckFrequency'"
          "    -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue;"
          "  Set-ItemProperty -Path $_.PSPath -Name 'TcpDelAckTicks'"
          "    -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue }",
          "Nagle off + TcpAckFreq=1 + DelAckTicks=0 (toutes interfaces)");

    // Global TCP
    const std::string TCP =
        "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters";
    st.reg(TCP, "TCPNoDelay",          "REG_DWORD", "1",
           "TCPNoDelay global = 1");
    st.reg(TCP, "EnablePMTUDiscovery", "REG_DWORD", "1",
           "Activer MTU Path Discovery");

    // — LanmanWorkstation throughput —
    const std::string LW =
        "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanWorkstation\\Parameters";
    st.reg(LW, "MaxCmds",           "REG_DWORD", "50",
           "Augmenter commandes SMB simultanees");
    st.reg(LW, "MaxCollectionCount","REG_DWORD", "32",
           "Optimiser LanmanWorkstation MaxCollectionCount");
    st.reg(LW, "MaxThreads",        "REG_DWORD", "30",
           "Augmenter threads LanmanWorkstation");

    // — Cache DNS —
    const std::string DNS =
        "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters";
    st.reg(DNS, "MaxCacheTtl",       "REG_DWORD", "86400",
           "Augmenter TTL cache DNS (86400s)");
    st.reg(DNS, "NegativeCacheTime", "REG_DWORD", "0",
           "Desactiver cache DNS negatif");
    st.reg(DNS, "MaxNegativeCacheTtl","REG_DWORD","0",
           "Desactiver max TTL DNS negatif");

    // — TCP stack tuning —
    st.cmd("netsh int tcp set global autotuninglevel=normal",
           "TCP Auto-Tuning = normal");
    st.cmd("netsh int tcp set global rss=enabled",
           "Activer Receive Side Scaling (RSS)");
    st.cmd("netsh int tcp set global ecncapability=enabled",
           "Activer ECN Capability");
    st.cmd("netsh int tcp set global timestamps=disabled",
           "Desactiver TCP Timestamps (latence)");

    // — Reset complet de la stack réseau —
    st.cmd("netsh int ip reset",
           "Reset TCP/IP stack");
    st.cmd("netsh winsock reset",
           "Reset Winsock");
    st.cmd("ipconfig /flushdns",
           "Flush DNS (post-reset)");

    st.summary("RESEAU");
    GuiLog(s, "  Redemarrage requis pour appliquer le reset TCP/IP.", 3);
}

// ─────────────────────────────────────────────────────────────────────
//  💾  STOCKAGE
// ─────────────────────────────────────────────────────────────────────
void applyStorage(AppState& s) {
    GuiLog(s, "== STOCKAGE ==", 5);
    Stat st(s);

    // TRIM SSD
    st.cmd("fsutil behavior set disabledeletenotify 0",
           "Verifier / activer TRIM SSD");

    // NTFS Last Access Timestamp
    st.cmd("fsutil behavior set disablelastaccess 1",
           "Desactiver NTFS Last Access Timestamp");

    // Prefetch / Superfetch
    const std::string PF =
        "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager"
        "\\Memory Management\\PrefetchParameters";
    st.reg(PF, "EnablePrefetcher",  "REG_DWORD", "0",
           "Desactiver Prefetcher");
    st.reg(PF, "EnableSuperfetch",  "REG_DWORD", "0",
           "Desactiver Superfetch");
    st.cmd("sc config SysMain start= disabled",
           "Desactiver service SysMain (Superfetch)");

    // Noms de fichiers 8.3 (legacy, ralentit NTFS)
    st.cmd("fsutil behavior set disable8dot3 1",
           "Desactiver noms 8.3 NTFS (legacy)");

    // CHKDSK automatique au démarrage
    st.cmd("chkntfs /x C:",
           "Desactiver CHKDSK automatique sur C:");

    // Write Caching (via WMI / policy)
    st.ps("Get-WmiObject -Class Win32_DiskDrive -ErrorAction SilentlyContinue | "
          "ForEach-Object { "
          "  $p = 'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\' + $_.PNPDeviceID "
          "        + '\\Device Parameters\\Disk';"
          "  if (Test-Path $p) { "
          "    Set-ItemProperty -Path $p -Name 'UserWriteCacheSetting'"
          "      -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue } }",
          "Activer Write Caching sur les disques");

    st.summary("STOCKAGE");
}

// ─────────────────────────────────────────────────────────────────────
//  🖱️  INPUT / LATENCE
// ─────────────────────────────────────────────────────────────────────
void applyInput(AppState& s) {
    GuiLog(s, "== INPUT / LATENCE ==", 5);
    Stat st(s);

    const std::string MOU = "HKCU\\Control Panel\\Mouse";
    const std::string KBD = "HKCU\\Control Panel\\Keyboard";

    // — Souris : accélération off, courbes 1:1 ────────────────────────
    st.reg(MOU, "MouseSpeed",          "REG_SZ", "0",
           "Desactiver acceleration souris (MouseSpeed=0)");
    st.reg(MOU, "MouseThreshold1",     "REG_SZ", "0",
           "Mouse Threshold 1 = 0");
    st.reg(MOU, "MouseThreshold2",     "REG_SZ", "0",
           "Mouse Threshold 2 = 0");
    st.reg(MOU, "MouseTrails",         "REG_SZ", "0",
           "Desactiver Mouse Trails");
    st.reg(MOU, "MouseHoverTime",      "REG_SZ", "10",
           "Hover Delay = 10ms (minimum)");
    st.reg(MOU, "SnapToDefaultButton", "REG_SZ", "0",
           "Desactiver Snap To Default Button");

    // Courbes souris 1:1 (raw input, enhanced pointer precision off)
    st.reg(MOU, "SmoothMouseXCurve", "REG_BINARY",
           "00,00,00,00,00,00,00,00,"
           "C0,CC,0C,00,00,00,00,00,"
           "80,99,19,00,00,00,00,00,"
           "40,66,26,00,00,00,00,00,"
           "00,33,33,00,00,00,00,00",
           "Mouse X Curve = 1:1 raw input");
    st.reg(MOU, "SmoothMouseYCurve", "REG_BINARY",
           "00,00,00,00,00,00,00,00,"
           "00,00,38,00,00,00,00,00,"
           "00,00,70,00,00,00,00,00,"
           "00,00,A8,00,00,00,00,00,"
           "00,00,E0,00,00,00,00,00",
           "Mouse Y Curve = 1:1 raw input");

    // — Clavier ───────────────────────────────────────────────────────
    st.reg(KBD, "KeyboardDelay", "REG_SZ", "0",
           "Keyboard Delay = 0 (minimum)");
    st.reg(KBD, "KeyboardSpeed", "REG_SZ", "31",
           "Keyboard Speed = 31 (maximum)");

    // — Touches d'accessibilité (Sticky / Filter / Toggle / Bounce) ──
    st.reg("HKCU\\Control Panel\\Accessibility\\StickyKeys",
           "Flags", "REG_SZ", "506",
           "Desactiver Sticky Keys");
    st.reg("HKCU\\Control Panel\\Accessibility\\Keyboard Filter",
           "Flags", "REG_SZ", "0",
           "Desactiver Filter Keys");
    st.reg("HKCU\\Control Panel\\Accessibility\\ToggleKeys",
           "Flags", "REG_SZ", "58",
           "Desactiver Toggle Keys");
    st.reg("HKCU\\Control Panel\\Accessibility\\Bounce Keys",
           "Flags", "REG_SZ", "0",
           "Desactiver Bounce Keys");

    // — USB : désactiver économies d'énergie ──────────────────────────
    st.ps("Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\"
          "{36FC9E60-C465-11CF-8056-444553540000}' -ErrorAction SilentlyContinue | "
          "ForEach-Object { "
          "  Set-ItemProperty -Path $_.PSPath -Name 'SelectiveSuspendEnabled'"
          "    -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue;"
          "  Set-ItemProperty -Path $_.PSPath -Name 'EnhancedPowerManagementEnabled'"
          "    -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue }",
          "Desactiver USB Selective Suspend + Enhanced Power Mgmt");

    // USB Selective Suspend via powercfg
    st.cmd("powercfg -setacvalueindex scheme_current 2a737441-1930-4402-8d77-b2bebba308a3 "
           "48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0",
           "Desactiver USB Selective Suspend AC (powercfg)");

    // — Controller / Manette : polling 1ms ───────────────────────────
    st.ps("Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\"
          "{745A17A0-74D3-11D0-B6FE-00A0C90F57DA}' -ErrorAction SilentlyContinue | "
          "ForEach-Object { "
          "  Set-ItemProperty -Path $_.PSPath -Name 'PollInterval'"
          "    -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue;"
          "  Set-ItemProperty -Path $_.PSPath -Name 'EnhancedPowerManagementEnabled'"
          "    -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue }",
          "Polling controller = 1ms (manette)");

    st.summary("INPUT");
}

// ─────────────────────────────────────────────────────────────────────
//  ⚡  POWER / ENERGIE
// ─────────────────────────────────────────────────────────────────────
void applyPower(AppState& s) {
    GuiLog(s, "== POWER / ENERGIE ==", 5);
    Stat st(s);

    // — Activer Ultimate Performance (duplique le schéma si besoin) —
    st.ps("$r = powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null;"
          "$g = ($r | Select-String '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}"
          "-[0-9a-f]{4}-[0-9a-f]{12}').Matches[0].Value;"
          "if ($g) { powercfg /setactive $g }"
          "else    { powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c }",
          "Activer Ultimate Performance (fallback : High Performance)");

    // — CPU min/max = 100% (AC) —
    st.cmd("powercfg -setacvalueindex scheme_current sub_processor PROCTHROTTLEMIN 100",
           "CPU minimum = 100% (AC)");
    st.cmd("powercfg -setacvalueindex scheme_current sub_processor PROCTHROTTLEMAX 100",
           "CPU maximum = 100% (AC)");

    // — Boost CPU agressif —
    st.cmd("powercfg -setacvalueindex scheme_current sub_processor PERFBOOSTMODE 2",
           "CPU Boost Mode = Agressif");

    // — ASPM PCIe désactivé —
    st.cmd("powercfg -setacvalueindex scheme_current sub_pciexpress "
           "ee12f906-d277-404b-b6da-e5fa1a576df5 0",
           "Desactiver ASPM PCIe (AC)");

    // — USB Selective Suspend désactivé —
    st.cmd("powercfg -setacvalueindex scheme_current 2a737441-1930-4402-8d77-b2bebba308a3 "
           "48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0",
           "Desactiver USB Selective Suspend (AC)");

    // — Veille désactivée (AC) —
    st.cmd("powercfg -setacvalueindex scheme_current sub_sleep standbyidle 0",
           "Desactiver mise en veille AC");

    // — Hibernation off —
    st.cmd("powercfg -h off",
           "Desactiver hibernation");

    // — Appliquer le plan —
    st.cmd("powercfg -setactive scheme_current",
           "Appliquer plan alimentation Ultimate Performance");

    st.summary("POWER");
}

// ─────────────────────────────────────────────────────────────────────
//  🛡️  DEFENDER EXCLUSIONS — Fortnite / Epic Games
// ─────────────────────────────────────────────────────────────────────
void applyDefender(AppState& s) {
    GuiLog(s, "== DEFENDER EXCLUSIONS ==", 5);
    Stat st(s);

    // — Chemins jeu (réduire scans IO temps réel) —
    st.ps("Add-MpPreference -ExclusionPath 'C:\\Program Files\\Epic Games'"
          " -ErrorAction SilentlyContinue",
          "Exclusion Defender : C:\\Program Files\\Epic Games");
    st.ps("Add-MpPreference -ExclusionPath \"$env:LOCALAPPDATA\\FortniteGame\""
          " -ErrorAction SilentlyContinue",
          "Exclusion Defender : %LOCALAPPDATA%\\FortniteGame");
    st.ps("Add-MpPreference -ExclusionPath \"$env:ProgramData\\Epic\\EpicGamesLauncher\""
          " -ErrorAction SilentlyContinue",
          "Exclusion Defender : EpicGamesLauncher data");

    // — Process (anti-scan temps réel sur exécutables) —
    st.ps("Add-MpPreference -ExclusionProcess 'FortniteClient-Win64-Shipping.exe'"
          " -ErrorAction SilentlyContinue",
          "Exclusion process : FortniteClient-Win64-Shipping.exe");
    st.ps("Add-MpPreference -ExclusionProcess 'EpicGamesLauncher.exe'"
          " -ErrorAction SilentlyContinue",
          "Exclusion process : EpicGamesLauncher.exe");
    st.ps("Add-MpPreference -ExclusionProcess 'EasyAntiCheat_EOS.exe'"
          " -ErrorAction SilentlyContinue",
          "Exclusion process : EasyAntiCheat_EOS.exe");
    st.ps("Add-MpPreference -ExclusionProcess 'FortniteLauncher.exe'"
          " -ErrorAction SilentlyContinue",
          "Exclusion process : FortniteLauncher.exe");

    st.summary("DEFENDER");
    GuiLog(s, "  Rollback : Remove-MpPreference -ExclusionPath/-ExclusionProcess", 4);
}

// ─────────────────────────────────────────────────────────────────────
//  🔒  WINDOWS UPDATE — BLOQUER INSTALLATION DRIVERS
// ─────────────────────────────────────────────────────────────────────
void applyWUDriverBlock(AppState& s) {
    GuiLog(s, "== WU DRIVER BLOCK ==", 5);
    Stat st(s);

    // Empêche WU d'écraser le driver GPU stable
    // Policy officielle Microsoft (GPO/MDM/registry)
    st.reg("HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
           "ExcludeWUDriversInQualityUpdate", "REG_DWORD", "1",
           "Bloquer drivers via Windows Update (stabilite GPU)");

    st.summary("WU DRIVERS");
    GuiLog(s, "  Les drivers ne seront plus mis a jour via Windows Update.", 4);
    GuiLog(s, "  Rollback : ExcludeWUDriversInQualityUpdate = 0", 4);
}

// ─────────────────────────────────────────────────────────────────────
//  🖼️  MPO — MULTI-PLANE OVERLAY (fix flicker/stutter NVIDIA)
// ─────────────────────────────────────────────────────────────────────
void applyMPO(AppState& s) {
    GuiLog(s, "== MPO (MULTI-PLANE OVERLAY) ==", 5);
    Stat st(s);

    // Fix officiel NVIDIA (support article 5157) :
    // OverlayTestMode = 5 désactive MPO → corrige flicker/stutter desktop/jeux
    st.reg("HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm",
           "OverlayTestMode", "REG_DWORD", "5",
           "Desactiver MPO via DWM (fix flicker/stutter NVIDIA)");

    st.summary("MPO");
    GuiLog(s, "  Reboot requis pour appliquer.", 3);
    GuiLog(s, "  Rollback : supprimer OverlayTestMode ou = 0 + reboot", 4);
}

// ─────────────────────────────────────────────────────────────────────
//  🌐  NIC LOW LATENCY — RSS/RSC + Interrupt Moderation + EEE
// ─────────────────────────────────────────────────────────────────────
void applyNicLatency(AppState& s) {
    GuiLog(s, "== NIC LOW LATENCY ==", 5);
    Stat st(s);

    // — RSS adapter-level (distribue le trafic sur plusieurs cœurs) —
    // Microsoft documente Set-NetAdapterRss comme méthode recommandée
    st.ps("Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | "
          "ForEach-Object { "
          "  Set-NetAdapterRss -Name $_.Name -Enabled $true "
          "    -ErrorAction SilentlyContinue }",
          "RSS adapter-level : activer sur toutes interfaces physiques actives");

    // — RSC off (Receive Segment Coalescing) —
    // Réduit la latence (moins de coalescing), CPU légèrement plus haut
    st.ps("Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | "
          "ForEach-Object { "
          "  Set-NetAdapterRsc -Name $_.Name -IPv4Enabled $false "
          "    -IPv6Enabled $false -ErrorAction SilentlyContinue }",
          "RSC off : latence minimum (CPU peut augmenter legerement)");

    // — Interrupt Moderation off (si disponible sur le NIC) —
    // Réduit la latence, augmente le CPU selon Intel
    st.ps("Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | "
          "ForEach-Object { "
          "  $n=$_.Name;"
          "  $dp=(Get-NetAdapterAdvancedProperty -Name $n "
          "    -ErrorAction SilentlyContinue).DisplayName;"
          "  if ($dp -contains 'Interrupt Moderation') { "
          "    Set-NetAdapterAdvancedProperty -Name $n "
          "      -DisplayName 'Interrupt Moderation' -DisplayValue 'Disabled' "
          "      -ErrorAction SilentlyContinue } }",
          "Interrupt Moderation off (si disponible sur le NIC)");

    // — Energy-Efficient Ethernet off (EEE ajoute de la latence) —
    st.ps("Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | "
          "ForEach-Object { "
          "  $n=$_.Name;"
          "  $dp=(Get-NetAdapterAdvancedProperty -Name $n "
          "    -ErrorAction SilentlyContinue).DisplayName;"
          "  if ($dp -contains 'Energy-Efficient Ethernet') { "
          "    Set-NetAdapterAdvancedProperty -Name $n "
          "      -DisplayName 'Energy-Efficient Ethernet' -DisplayValue 'Off' "
          "      -ErrorAction SilentlyContinue } }",
          "Energy-Efficient Ethernet off (si disponible)");

    st.summary("NIC LATENCY");
    GuiLog(s, "  Rollback : Reset-NetAdapterAdvancedProperty + RSC $true", 4);
}

// ─────────────────────────────────────────────────────────────────────
//  🚀  TOUT APPLIQUER — Séquence complète
// ─────────────────────────────────────────────────────────────────────
void applyAll(AppState& s) {
    GuiLog(s, "╔══════════════════════════════════════╗", 5);
    GuiLog(s, "║  SLIDE Performance Utility — FULL    ║", 5);
    GuiLog(s, "╚══════════════════════════════════════╝", 5);
    GuiLog(s, "", 0);

    applyBackup(s);        GuiLog(s, "", 0);
    applyWindows(s);       GuiLog(s, "", 0);
    applyGpu(s);           GuiLog(s, "", 0);
    applyCpu(s);           GuiLog(s, "", 0);
    applyRam(s);           GuiLog(s, "", 0);
    applyCleanup(s);       GuiLog(s, "", 0);
    applyNetwork(s);       GuiLog(s, "", 0);
    applyStorage(s);       GuiLog(s, "", 0);
    applyInput(s);         GuiLog(s, "", 0);
    applyPower(s);         GuiLog(s, "", 0);
    applyDefender(s);      GuiLog(s, "", 0);
    applyWUDriverBlock(s); GuiLog(s, "", 0);
    applyMPO(s);           GuiLog(s, "", 0);
    applyNicLatency(s);

    GuiLog(s, "", 0);
    GuiLog(s, "╔══════════════════════════════════════╗", 1);
    GuiLog(s, "║  TERMINÉ — Redemarrage recommande    ║", 1);
    GuiLog(s, "╚══════════════════════════════════════╝", 1);
}

// ─────────────────────────────────────────────────────────────────────
//  ↩️  RESTAURATION — Valeurs Windows par défaut
// ─────────────────────────────────────────────────────────────────────
void revertAll(AppState& s) {
    GuiLog(s, "== RESTAURATION PARAMETRES PAR DEFAUT ==", 2);
    Stat st(s);

    // Game Bar / DVR
    st.reg("HKCU\\Software\\Microsoft\\GameBar",
           "AllowAutoGameMode", "REG_DWORD", "1",
           "Restaurer Game Bar auto mode");
    st.reg("HKCU\\System\\GameConfigStore",
           "GameDVR_Enabled", "REG_DWORD", "1",
           "Restaurer Game DVR");
    st.reg("HKCU\\System\\GameConfigStore",
           "GameDVR_FSEBehaviorMode", "REG_DWORD", "0",
           "Restaurer FSE Behavior");

    // Plan alimentation (Équilibré)
    st.cmd("powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e",
           "Restaurer plan Equilibre");
    st.cmd("powercfg -setacvalueindex scheme_current sub_processor PROCTHROTTLEMIN 5",
           "CPU minimum = 5% (defaut)");
    st.cmd("powercfg -setacvalueindex scheme_current sub_processor PERFBOOSTMODE 1",
           "CPU Boost = Normal (defaut)");
    st.cmd("powercfg -setactive scheme_current",
           "Appliquer plan restaure");

    // Souris
    st.reg("HKCU\\Control Panel\\Mouse", "MouseSpeed",    "REG_SZ", "1",
           "Restaurer acceleration souris");
    st.reg("HKCU\\Control Panel\\Mouse", "MouseThreshold1","REG_SZ","6",
           "Restaurer seuil souris 1");
    st.reg("HKCU\\Control Panel\\Mouse", "MouseThreshold2","REG_SZ","10",
           "Restaurer seuil souris 2");
    st.reg("HKCU\\Control Panel\\Mouse", "MouseTrails",   "REG_SZ", "0",
           "Restaurer Mouse Trails");

    // Clavier
    st.reg("HKCU\\Control Panel\\Keyboard", "KeyboardDelay","REG_SZ","1",
           "Restaurer KeyboardDelay");

    // Effets visuels
    st.reg("HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects",
           "VisualFXSetting", "REG_DWORD", "0",
           "Restaurer effets visuels (Windows defaut)");
    st.reg("HKCU\\SOFTWARE\\Microsoft\\Windows\\DWM",
           "EnableAeroPeek", "REG_DWORD", "1",
           "Restaurer Aero Peek");
    st.reg("HKCU\\SOFTWARE\\Microsoft\\Windows\\DWM",
           "Animations",     "REG_DWORD", "1",
           "Restaurer animations DWM");
    st.reg("HKCU\\Control Panel\\Desktop\\WindowMetrics",
           "MinAnimate", "REG_SZ", "1",
           "Restaurer animations minimise/maximise");
    st.reg("HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
           "ShowTaskViewButton", "REG_DWORD", "1",
           "Restaurer bouton Task View");
    st.reg("HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced",
           "TaskbarAnimations", "REG_DWORD", "1",
           "Restaurer animations Taskbar");

    // GPU Scheduling
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
           "HwSchMode", "REG_DWORD", "1",
           "Restaurer GPU Scheduling (off)");
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
           "TdrDelay", "REG_DWORD", "2",
           "Restaurer TDR Delay (2s defaut)");

    // Power Throttling
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling",
           "PowerThrottlingOff", "REG_DWORD", "0",
           "Restaurer CPU Power Throttling");

    // Scheduler
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl",
           "Win32PrioritySeparation", "REG_DWORD", "2",
           "Restaurer Win32PrioritySeparation (defaut)");

    // Prefetch / SysMain
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager"
           "\\Memory Management\\PrefetchParameters",
           "EnablePrefetcher", "REG_DWORD", "3",
           "Restaurer Prefetcher");
    st.cmd("sc config SysMain start= auto",
           "Restaurer SysMain (Superfetch)");

    // Mémoire
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management",
           "DisablePagingExecutive", "REG_DWORD", "0",
           "Restaurer Paging Executive");

    // SMB
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters",
           "EnableOplocks", "REG_DWORD", "1",
           "Restaurer Oplocks");
    st.reg("HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters",
           "autodisconnect", "REG_DWORD", "15",
           "Restaurer SMB auto-disconnect (15min)");

    // Edge
    st.reg("HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge",
           "StartupBoostEnabled", "REG_DWORD", "1",
           "Restaurer Edge Startup Boost");

    // bcdedit
    st.cmd("bcdedit /deletevalue disabledynamictick",
           "Restaurer Dynamic Tick");
    st.cmd("bcdedit /deletevalue useplatformtick",
           "Restaurer Platform Tick");
    st.cmd("bcdedit /deletevalue useplatformclock",
           "Restaurer Platform Clock");

    // Hibernation
    st.cmd("powercfg -h on",
           "Restaurer hibernation");

    // Réseau
    st.cmd("netsh int tcp set global autotuninglevel=normal",
           "Restaurer TCP Auto-Tuning");

    // Defender exclusions (retrait)
    st.ps("Remove-MpPreference -ExclusionPath 'C:\\Program Files\\Epic Games'"
          " -ErrorAction SilentlyContinue",
          "Restaurer : retirer exclusion Defender Epic Games");
    st.ps("Remove-MpPreference -ExclusionProcess 'FortniteClient-Win64-Shipping.exe'"
          " -ErrorAction SilentlyContinue",
          "Restaurer : retirer exclusion process FortniteClient");
    st.ps("Remove-MpPreference -ExclusionProcess 'EpicGamesLauncher.exe'"
          " -ErrorAction SilentlyContinue",
          "Restaurer : retirer exclusion process EpicGamesLauncher");
    st.ps("Remove-MpPreference -ExclusionProcess 'EasyAntiCheat_EOS.exe'"
          " -ErrorAction SilentlyContinue",
          "Restaurer : retirer exclusion process EasyAntiCheat");

    // WU Driver Block (réactiver)
    st.reg("HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
           "ExcludeWUDriversInQualityUpdate", "REG_DWORD", "0",
           "Restaurer : drivers autorisés via Windows Update");

    // MPO (réactiver)
    st.del("HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm",
           "OverlayTestMode",
           "Restaurer MPO (supprimer OverlayTestMode)");

    // NIC Latency (restaurer RSC + Interrupt Moderation)
    st.ps("Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | "
          "ForEach-Object { "
          "  Set-NetAdapterRsc -Name $_.Name -IPv4Enabled $true "
          "    -IPv6Enabled $true -ErrorAction SilentlyContinue }",
          "Restaurer RSC (defaut)");
    st.ps("Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | "
          "ForEach-Object { "
          "  $n=$_.Name;"
          "  $dp=(Get-NetAdapterAdvancedProperty -Name $n "
          "    -ErrorAction SilentlyContinue).DisplayName;"
          "  if ($dp -contains 'Interrupt Moderation') { "
          "    Reset-NetAdapterAdvancedProperty -Name $n "
          "      -DisplayName 'Interrupt Moderation' "
          "      -ErrorAction SilentlyContinue } }",
          "Restaurer Interrupt Moderation (defaut NIC)");
    st.ps("Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | "
          "ForEach-Object { "
          "  $n=$_.Name;"
          "  $dp=(Get-NetAdapterAdvancedProperty -Name $n "
          "    -ErrorAction SilentlyContinue).DisplayName;"
          "  if ($dp -contains 'Energy-Efficient Ethernet') { "
          "    Reset-NetAdapterAdvancedProperty -Name $n "
          "      -DisplayName 'Energy-Efficient Ethernet' "
          "      -ErrorAction SilentlyContinue } }",
          "Restaurer Energy-Efficient Ethernet (defaut NIC)");

    st.summary("RESTAURATION");
    GuiLog(s, "  Redemarrage necessaire.", 3);
}

// ══════════════════════════════════════════════════════════════════════
//  Fonctions de vérification — lecture registre read-only
// ══════════════════════════════════════════════════════════════════════

CheckResult checkWindows() {
    CheckResult r{ 0, 3 };
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\Remote Assistance",
        "fAllowToGetHelp", 0)) ++r.applied;
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
        "SystemResponsiveness", 0)) ++r.applied;
    if (chkDWORD(HKEY_CURRENT_USER,
        "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager",
        "ContentDeliveryAllowed", 0)) ++r.applied;
    return r;
}

CheckResult checkGpu() {
    CheckResult r{ 0, 3 };
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
        "HwSchMode", 2)) ++r.applied;
    if (chkDWORD(HKEY_CURRENT_USER,
        "SOFTWARE\\Microsoft\\Windows\\DWM",
        "Animations", 0)) ++r.applied;
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
        "TdrDelay", 60)) ++r.applied;
    return r;
}

CheckResult checkCpu() {
    CheckResult r{ 0, 3 };
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling",
        "PowerThrottlingOff", 1)) ++r.applied;
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\PriorityControl",
        "Win32PrioritySeparation", 38)) ++r.applied;
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile",
        "SystemResponsiveness", 0)) ++r.applied;
    return r;
}

CheckResult checkRam() {
    CheckResult r{ 0, 2 };
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management",
        "DisablePagingExecutive", 1)) ++r.applied;
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management",
        "LargeSystemCache", 0)) ++r.applied;
    return r;
}

CheckResult checkNetwork() {
    CheckResult r{ 0, 3 };
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters",
        "TCPNoDelay", 1)) ++r.applied;
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters",
        "MaxCacheTtl", 86400)) ++r.applied;
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Services\\LanmanWorkstation\\Parameters",
        "MaxCmds", 50)) ++r.applied;
    return r;
}

CheckResult checkStorage() {
    CheckResult r{ 0, 2 };
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters",
        "EnablePrefetcher", 0)) ++r.applied;
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters",
        "EnableSuperfetch", 0)) ++r.applied;
    return r;
}

CheckResult checkInput() {
    CheckResult r{ 0, 3 };
    if (chkSZ(HKEY_CURRENT_USER, "Control Panel\\Mouse", "MouseSpeed",     "0")) ++r.applied;
    if (chkSZ(HKEY_CURRENT_USER, "Control Panel\\Mouse", "MouseThreshold1","0")) ++r.applied;
    if (chkSZ(HKEY_CURRENT_USER, "Control Panel\\Keyboard", "KeyboardDelay","0")) ++r.applied;
    return r;
}

CheckResult checkPower() {
    CheckResult r{ 0, 2 };
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling",
        "PowerThrottlingOff", 1)) ++r.applied;
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
        "HwSchMode", 2)) ++r.applied;
    return r;
}

CheckResult checkDefender() {
    // Vérifie si au moins une exclusion de chemin Defender est présente
    CheckResult r{ 0, 1 };
    HKEY hk;
    const char* path =
        "SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Paths";
    if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, path, 0, KEY_READ, &hk) == ERROR_SUCCESS) {
        char name[MAX_PATH]; DWORD namesz = MAX_PATH;
        DWORD type, datasz = 0;
        if (RegEnumValueA(hk, 0, name, &namesz, nullptr, &type,
                          nullptr, &datasz) == ERROR_SUCCESS)
            ++r.applied;
        RegCloseKey(hk);
    }
    return r;
}

CheckResult checkWUDriverBlock() {
    CheckResult r{ 0, 1 };
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate",
        "ExcludeWUDriversInQualityUpdate", 1)) ++r.applied;
    return r;
}

CheckResult checkMPO() {
    CheckResult r{ 0, 1 };
    if (chkDWORD(HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Microsoft\\Windows\\Dwm",
        "OverlayTestMode", 5)) ++r.applied;
    return r;
}

} // namespace tweaks