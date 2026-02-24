// ══════════════════════════════════════════════════════
//  gui.cpp — Dear ImGui + DirectX 11 rendering
//  Screens: License input | Main optimizer
// ══════════════════════════════════════════════════════
#include "gui.h"
#include "licensing.h"

#include "imgui.h"
#include "imgui_impl_win32.h"
#include "imgui_impl_dx11.h"

#include <thread>
#include <chrono>
#include <string>
#include <algorithm>
#include <cstdlib>
#include <cstring>

extern IMGUI_IMPL_API LRESULT ImGui_ImplWin32_WndProcHandler(HWND, UINT, WPARAM, LPARAM);

// ── Fonts (loaded once in GuiInit) ──
static ImFont* g_fontMain = nullptr; // Segoe UI 15
static ImFont* g_fontMono = nullptr; // Consolas 13
static ImFont* g_fontBig  = nullptr; // Segoe UI 22

// ── Color palette — matches website (#0a0a0a bg, #00d4ff accent) ──
static const ImVec4 C_ACCENT  = { 0.000f, 0.831f, 1.000f, 1.f };
static const ImVec4 C_WHITE   = { 0.930f, 0.930f, 0.930f, 1.f };
static const ImVec4 C_GREEN   = { 0.282f, 0.733f, 0.471f, 1.f };
static const ImVec4 C_RED     = { 0.898f, 0.243f, 0.243f, 1.f };
static const ImVec4 C_YELLOW  = { 0.961f, 0.678f, 0.329f, 1.f };
static const ImVec4 C_MAGENTA = { 0.800f, 0.400f, 1.000f, 1.f };
static const ImVec4 C_DIM     = { 0.530f, 0.530f, 0.530f, 1.f };
static const ImVec4 C_CYAN    = C_ACCENT;

static const ImVec4 LOG_COLORS[6] = {
    C_WHITE, C_GREEN, C_RED, C_YELLOW, C_ACCENT, C_MAGENTA
};

// ══════════════════════════════════════════════════════
//  Theme
// ══════════════════════════════════════════════════════
static void ApplyTheme() {
    ImGuiStyle& s = ImGui::GetStyle();
    s.WindowRounding     = 8.f;
    s.ChildRounding      = 6.f;
    s.FrameRounding      = 6.f;
    s.GrabRounding       = 4.f;
    s.TabRounding        = 6.f;
    s.ScrollbarRounding  = 6.f;
    s.WindowPadding      = { 16.f, 16.f };
    s.FramePadding       = { 10.f,  6.f };
    s.ItemSpacing        = {  8.f,  8.f };
    s.ScrollbarSize      = 10.f;
    s.WindowBorderSize   = 1.f;
    s.ChildBorderSize    = 1.f;
    s.FrameBorderSize    = 1.f;

    ImVec4* c = s.Colors;
    c[ImGuiCol_WindowBg]           = { 0.07f, 0.07f, 0.07f, 1.f };
    c[ImGuiCol_ChildBg]            = { 0.10f, 0.10f, 0.10f, 1.f };
    c[ImGuiCol_FrameBg]            = { 0.13f, 0.13f, 0.13f, 1.f };
    c[ImGuiCol_FrameBgHovered]     = { 0.18f, 0.18f, 0.18f, 1.f };
    c[ImGuiCol_FrameBgActive]      = { 0.22f, 0.22f, 0.22f, 1.f };
    c[ImGuiCol_TitleBg]            = { 0.07f, 0.07f, 0.07f, 1.f };
    c[ImGuiCol_TitleBgActive]      = { 0.07f, 0.07f, 0.07f, 1.f };
    c[ImGuiCol_Border]             = { 0.18f, 0.18f, 0.18f, 1.f };
    c[ImGuiCol_ScrollbarBg]        = { 0.07f, 0.07f, 0.07f, 1.f };
    c[ImGuiCol_ScrollbarGrab]      = { 0.25f, 0.25f, 0.25f, 1.f };
    c[ImGuiCol_ScrollbarGrabHovered]={ 0.30f, 0.30f, 0.30f, 1.f };
    c[ImGuiCol_ScrollbarGrabActive] = { 0.35f, 0.35f, 0.35f, 1.f };
    c[ImGuiCol_Button]             = { 0.13f, 0.13f, 0.13f, 1.f };
    c[ImGuiCol_ButtonHovered]      = { 0.00f, 0.50f, 0.62f, 1.f };
    c[ImGuiCol_ButtonActive]       = { 0.00f, 0.38f, 0.47f, 1.f };
    c[ImGuiCol_Header]             = { 0.00f, 0.40f, 0.50f, 0.5f };
    c[ImGuiCol_HeaderHovered]      = { 0.00f, 0.50f, 0.62f, 0.7f };
    c[ImGuiCol_HeaderActive]       = C_ACCENT;
    c[ImGuiCol_CheckMark]          = C_ACCENT;
    c[ImGuiCol_Separator]          = { 0.20f, 0.20f, 0.20f, 1.f };
    c[ImGuiCol_SeparatorHovered]   = C_ACCENT;
    c[ImGuiCol_SeparatorActive]    = C_ACCENT;
    c[ImGuiCol_Text]               = C_WHITE;
    c[ImGuiCol_TextDisabled]       = C_DIM;
    c[ImGuiCol_ResizeGrip]         = { 0.20f, 0.20f, 0.20f, 0.5f };
    c[ImGuiCol_ResizeGripHovered]  = C_ACCENT;
    c[ImGuiCol_ResizeGripActive]   = C_ACCENT;
    c[ImGuiCol_Tab]                = { 0.10f, 0.10f, 0.10f, 1.f };
    c[ImGuiCol_TabHovered]         = { 0.00f, 0.50f, 0.62f, 0.8f };
    c[ImGuiCol_TabActive]          = { 0.00f, 0.60f, 0.75f, 1.f };
    c[ImGuiCol_PlotLines]          = C_ACCENT;
    c[ImGuiCol_PlotHistogram]      = C_ACCENT;
}

// ══════════════════════════════════════════════════════
//  GUI API
// ══════════════════════════════════════════════════════
bool GuiInit(HWND hwnd, ID3D11Device* dev, ID3D11DeviceContext* ctx) {
    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    io.IniFilename = nullptr;
    io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;

    // Load system fonts (silently falls back to built-in if path not found)
    g_fontMain = io.Fonts->AddFontFromFileTTF("C:\\Windows\\Fonts\\segoeui.ttf",  15.0f);
    g_fontMono = io.Fonts->AddFontFromFileTTF("C:\\Windows\\Fonts\\consola.ttf",  13.0f);
    g_fontBig  = io.Fonts->AddFontFromFileTTF("C:\\Windows\\Fonts\\segoeui.ttf",  22.0f);
    io.Fonts->Build();

    ApplyTheme();
    ImGui_ImplWin32_Init(hwnd);
    ImGui_ImplDX11_Init(dev, ctx);
    return true;
}

void GuiBeginFrame() {
    ImGui_ImplDX11_NewFrame();
    ImGui_ImplWin32_NewFrame();
    ImGui::NewFrame();
}

void GuiShutdown() {
    ImGui_ImplDX11_Shutdown();
    ImGui_ImplWin32_Shutdown();
    ImGui::DestroyContext();
}

void GuiWndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
    ImGui_ImplWin32_WndProcHandler(hwnd, msg, wp, lp);
}

void GuiPresent() {
    ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData());
}

void GuiLog(AppState& state, const std::string& text, int type) {
    std::lock_guard<std::mutex> lk(state.logMtx);
    state.log.push_back({ text, type });
    state.scrollLog = true;
}

// ══════════════════════════════════════════════════════
//  Optimizer helpers (run on background thread)
// ══════════════════════════════════════════════════════
static bool runReg(AppState& s,
    const std::string& path, const std::string& name,
    const std::string& type, const std::string& val,
    const std::string& desc)
{
    GuiLog(s, "  > " + desc, 3);
    std::string cmd = "reg add \"" + path + "\" /v \"" + name
                    + "\" /t " + type + " /d " + val + " /f >nul 2>&1";
    if (::system(cmd.c_str()) == 0) { GuiLog(s, "    OK", 1); return true; }
    GuiLog(s, "    Echec (droits insuffisants ?)", 2);
    return false;
}

static bool runCmd(AppState& s, const std::string& cmd, const std::string& desc) {
    GuiLog(s, "  > " + desc, 3);
    if (::system((cmd + " >nul 2>&1").c_str()) == 0) { GuiLog(s, "    OK", 1); return true; }
    GuiLog(s, "    Skipped / non-applicable", 3);
    return false;
}

static void applySafe(AppState& s) {
    int ok = 0, tot = 0;
    GuiLog(s, "=== Optimisations SAFE ===", 4);
    tot++; if (runReg(s, "HKCU\\Software\\Microsoft\\GameBar", "AllowAutoGameMode", "REG_DWORD", "0", "Desactiver Game Bar auto mode")) ok++;
    tot++; if (runReg(s, "HKCU\\System\\GameConfigStore", "GameDVR_Enabled", "REG_DWORD", "0", "Desactiver Game DVR")) ok++;
    tot++; if (runReg(s, "HKCU\\System\\GameConfigStore", "GameDVR_FSEBehaviorMode", "REG_DWORD", "2", "Desactiver Fullscreen Optimization")) ok++;
    tot++; if (runCmd(s, "powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c", "Activer plan Haute Performance")) ok++;
    tot++; if (runReg(s, "HKLM\\SOFTWARE\\Microsoft\\MSMQ\\Parameters", "TCPNoDelay", "REG_DWORD", "1", "Desactiver Nagle's Algorithm")) ok++;
    tot++; if (runReg(s, "HKCU\\Control Panel\\Mouse", "MouseSpeed", "REG_SZ", "0", "Desactiver acceleration souris")) ok++;
    tot++; if (runReg(s, "HKCU\\Control Panel\\Mouse", "MouseThreshold1", "REG_SZ", "0", "Seuil souris 1 = 0")) ok++;
    tot++; if (runReg(s, "HKCU\\Control Panel\\Mouse", "MouseThreshold2", "REG_SZ", "0", "Seuil souris 2 = 0")) ok++;
    tot++; if (runReg(s, "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects", "VisualFXSetting", "REG_DWORD", "2", "Ajuster effets visuels pour performances")) ok++;
    tot++; if (runReg(s, "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search", "AllowCortana", "REG_DWORD", "0", "Desactiver Cortana")) ok++;
    tot++; if (runReg(s, "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager", "SubscribedContent-338389Enabled", "REG_DWORD", "0", "Desactiver suggestions Windows")) ok++;
    tot++; if (runReg(s, "HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers", "HwSchMode", "REG_DWORD", "2", "Activer HAGS (GPU Scheduling)")) ok++;
    tot++; if (runReg(s, "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters", "EnablePrefetcher", "REG_DWORD", "0", "Desactiver Prefetcher")) ok++;
    tot++; if (runCmd(s, "sc config SysMain start= disabled", "Desactiver SysMain / Superfetch")) ok++;
    tot++; if (runReg(s, "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel", "GlobalTimerResolutionRequests", "REG_DWORD", "1", "Activer resolution timer globale")) ok++;
    GuiLog(s, "=== Resultat: " + std::to_string(ok) + "/" + std::to_string(tot) + " ===", ok == tot ? 1 : 3);
    GuiLog(s, "Redemarrage recommande.", 3);
}

static void applyAdvanced(AppState& s) {
    applySafe(s);
    GuiLog(s, "", 0);
    GuiLog(s, "=== Optimisations AVANCEES ===", 5);
    runCmd(s, "bcdedit /deletevalue useplatformclock", "Desactiver HPET");
    runCmd(s, "bcdedit /set disabledynamictick yes", "Desactiver Dynamic Tick");
    runCmd(s, "bcdedit /set useplatformtick yes", "Forcer timer haute resolution");
    runReg(s, "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling", "PowerThrottlingOff", "REG_DWORD", "1", "Desactiver Power Throttling CPU");
    runCmd(s, "powercfg -setacvalueindex scheme_current sub_processor CPMINCORES 100", "Desactiver Core Parking (min cores 100%)");
    runCmd(s, "powercfg -setactive scheme_current", "Appliquer profil alimentation");
    runReg(s, "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU", "NoAutoRebootWithLoggedOnUsers", "REG_DWORD", "1", "Desactiver reboot auto Windows Update");
    runCmd(s, "netsh int tcp set global autotuninglevel=normal", "TCP Auto-Tuning: normal");
    runCmd(s, "netsh int tcp set global rss=enabled", "Activer Receive Side Scaling");
    GuiLog(s, "=== SAFE + AVANCEES terminees ===", 5);
    GuiLog(s, "Redemarrage necessaire.", 3);
}

static void revertAll(AppState& s) {
    GuiLog(s, "=== Restauration des parametres par defaut ===", 2);
    runReg(s, "HKCU\\Software\\Microsoft\\GameBar", "AllowAutoGameMode", "REG_DWORD", "1", "Restaurer Game Bar");
    runReg(s, "HKCU\\System\\GameConfigStore", "GameDVR_Enabled", "REG_DWORD", "1", "Restaurer Game DVR");
    runReg(s, "HKCU\\System\\GameConfigStore", "GameDVR_FSEBehaviorMode", "REG_DWORD", "0", "Restaurer FSE");
    runCmd(s, "powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e", "Restaurer plan Equilibre");
    runReg(s, "HKCU\\Control Panel\\Mouse", "MouseSpeed", "REG_SZ", "1", "Restaurer acceleration souris");
    runReg(s, "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects", "VisualFXSetting", "REG_DWORD", "0", "Restaurer effets visuels");
    runCmd(s, "reg delete \"HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search\" /v AllowCortana /f", "Restaurer Cortana");
    runReg(s, "HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers", "HwSchMode", "REG_DWORD", "1", "Restaurer GPU Scheduling");
    runReg(s, "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters", "EnablePrefetcher", "REG_DWORD", "3", "Restaurer Prefetcher");
    runCmd(s, "sc config SysMain start= auto", "Restaurer SysMain");
    runCmd(s, "bcdedit /deletevalue disabledynamictick", "Restaurer Dynamic Tick");
    runCmd(s, "bcdedit /deletevalue useplatformtick", "Restaurer Platform Tick");
    GuiLog(s, "=== Restauration terminee. Redemarrage necessaire. ===", 1);
}

// ══════════════════════════════════════════════════════
//  Render helpers
// ══════════════════════════════════════════════════════
static void CenteredText(const char* txt, const ImVec4& col = C_WHITE) {
    float w  = ImGui::CalcTextSize(txt).x;
    float cx = ImGui::GetCursorPosX() + (ImGui::GetContentRegionAvail().x - w) * 0.5f;
    ImGui::SetCursorPosX(cx);
    ImGui::TextColored(col, "%s", txt);
}

static bool AccentButton(const char* lbl, ImVec2 sz = { 0.f, 0.f }) {
    ImGui::PushStyleColor(ImGuiCol_Button,        { 0.00f, 0.45f, 0.56f, 1.f });
    ImGui::PushStyleColor(ImGuiCol_ButtonHovered, { 0.00f, 0.60f, 0.75f, 1.f });
    ImGui::PushStyleColor(ImGuiCol_ButtonActive,  { 0.00f, 0.35f, 0.44f, 1.f });
    bool r = ImGui::Button(lbl, sz);
    ImGui::PopStyleColor(3);
    return r;
}

static bool DangerButton(const char* lbl, ImVec2 sz = { 0.f, 0.f }) {
    ImGui::PushStyleColor(ImGuiCol_Button,        { 0.50f, 0.08f, 0.08f, 1.f });
    ImGui::PushStyleColor(ImGuiCol_ButtonHovered, { 0.70f, 0.12f, 0.12f, 1.f });
    ImGui::PushStyleColor(ImGuiCol_ButtonActive,  { 0.38f, 0.06f, 0.06f, 1.f });
    bool r = ImGui::Button(lbl, sz);
    ImGui::PopStyleColor(3);
    return r;
}

// ══════════════════════════════════════════════════════
//  License screen
// ══════════════════════════════════════════════════════
static void DrawLicenseScreen(AppState& state) {
    const ImGuiIO& io = ImGui::GetIO();
    float W = io.DisplaySize.x, H = io.DisplaySize.y;

    ImGui::SetNextWindowPos({ W * 0.5f, H * 0.5f }, ImGuiCond_Always, { 0.5f, 0.5f });
    ImGui::SetNextWindowSize({ 460.f, 0.f }, ImGuiCond_Always);
    ImGui::Begin("##lic", nullptr,
        ImGuiWindowFlags_NoTitleBar   | ImGuiWindowFlags_NoResize |
        ImGuiWindowFlags_NoMove       | ImGuiWindowFlags_AlwaysAutoResize);

    // ── Logo ──
    if (g_fontBig) ImGui::PushFont(g_fontBig);
    CenteredText("FORTNITE.OPTI", C_ACCENT);
    if (g_fontBig) ImGui::PopFont();

    if (g_fontMain) ImGui::PushFont(g_fontMain);
    CenteredText("Systeme de Licence Securise v1.0", C_DIM);
    if (g_fontMain) ImGui::PopFont();

    ImGui::Spacing();
    ImGui::Separator();
    ImGui::Spacing();

    // ── System info ──
    if (g_fontMain) ImGui::PushFont(g_fontMain);
    std::string hs = state.hwid.size() >= 16
        ? (state.hwid.substr(0, 8) + "..." + state.hwid.substr(state.hwid.size() - 8))
        : state.hwid;
    ImGui::TextColored(C_DIM,    "HWID:"); ImGui::SameLine();
    ImGui::TextColored(C_ACCENT, "%s", hs.c_str());
    ImGui::TextColored(C_DIM,    "OS  :"); ImGui::SameLine();
    ImGui::TextColored(C_WHITE,  "%s", state.osVer.c_str());
    if (g_fontMain) ImGui::PopFont();

    ImGui::Spacing();
    ImGui::Separator();
    ImGui::Spacing();

    // ── Key input ──
    ImGui::TextColored(C_ACCENT, "Cle de licence");
    ImGui::SetNextItemWidth(-1.f);
    bool enter = ImGui::InputText("##key", state.keyBuf, sizeof(state.keyBuf),
        ImGuiInputTextFlags_EnterReturnsTrue | ImGuiInputTextFlags_CharsUppercase);
    ImGui::TextColored(C_DIM, "Format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX");
    ImGui::Spacing();

    // ── Activate button ──
    bool busy = state.checking;
    if (busy) ImGui::PushStyleVar(ImGuiStyleVar_Alpha, 0.5f);
    bool clicked = AccentButton(
        busy ? "  Verification...  " : "  Activer la licence  ",
        { -1.f, 38.f });
    if (busy) ImGui::PopStyleVar();

    // ── Status message ──
    if (!state.statusMsg.empty()) {
        ImGui::Spacing();
        int t = (state.statusType >= 0 && state.statusType < 6) ? state.statusType : 0;
        ImGui::TextColored(LOG_COLORS[t], "%s", state.statusMsg.c_str());
    }

    // ── Trigger activation ──
    if ((clicked || enter) && !busy && strlen(state.keyBuf) > 0) {
        std::string key = state.keyBuf;
        key.erase(std::remove_if(key.begin(), key.end(), ::isspace), key.end());
        std::transform(key.begin(), key.end(), key.begin(), ::toupper);
        memset(state.keyBuf, 0, sizeof(state.keyBuf));
        strncpy_s(state.keyBuf, sizeof(state.keyBuf), key.c_str(), _TRUNCATE);

        state.checking   = true;
        state.statusMsg  = "Connexion au serveur de licences...";
        state.statusType = 3;

        std::thread([&state, key]() {
            auto info = state.client->activate(key);
            if (info.status == licensing::Status::VALID) {
                state.licInfo    = info;
                state.statusMsg  = "Licence validee !";
                state.statusType = 1;
                std::this_thread::sleep_for(std::chrono::milliseconds(500));
                state.client->startHeartbeatLoop(300);
                state.screen = Screen::MAIN;
            } else {
                state.statusType = 2;
                switch (info.status) {
                    case licensing::Status::HWID_MISMATCH:
                        state.statusMsg = "[X] Cle liee a une autre machine. Contactez le support.";
                        break;
                    case licensing::Status::EXPIRED:
                        state.statusMsg = "[X] Licence expiree. Renouvelez votre abonnement.";
                        break;
                    case licensing::Status::BANNED:
                        state.statusMsg = "[X] Licence bannie. Contactez le support.";
                        break;
                    case licensing::Status::NETWORK_ERROR:
                        state.statusMsg = "[X] Serveur inaccessible. Connexion internet requise.";
                        break;
                    case licensing::Status::RATE_LIMITED:
                        state.statusMsg = "[!] Trop de tentatives. Attendez 1 minute.";
                        state.statusType = 3;
                        break;
                    default:
                        state.statusMsg = "[X] Cle invalide. Verifiez et reessayez.";
                        break;
                }
            }
            state.checking = false;
        }).detach();
    }

    ImGui::Spacing();
    ImGui::End();
}

// ══════════════════════════════════════════════════════
//  Main optimizer screen
// ══════════════════════════════════════════════════════
static void DrawMainScreen(AppState& state) {
    const ImGuiIO& io = ImGui::GetIO();
    float W = io.DisplaySize.x, H = io.DisplaySize.y;

    ImGui::SetNextWindowPos({ 0.f, 0.f });
    ImGui::SetNextWindowSize({ W, H });
    ImGui::Begin("##main", nullptr,
        ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoResize |
        ImGuiWindowFlags_NoMove     | ImGuiWindowFlags_NoBringToFrontOnFocus);

    // ── Header ──
    if (g_fontBig) ImGui::PushFont(g_fontBig);
    CenteredText("FORTNITE.OPTI", C_ACCENT);
    if (g_fontBig) ImGui::PopFont();
    ImGui::Spacing();

    // ── Status bar ──
    ImGui::PushStyleColor(ImGuiCol_ChildBg, ImVec4{ 0.04f, 0.13f, 0.17f, 1.f });
    ImGui::BeginChild("##bar", { -1.f, 44.f }, true);
    ImGui::SetCursorPosY(ImGui::GetCursorPosY() + 4.f);

    // Green "ACTIVE" badge
    ImGui::PushStyleColor(ImGuiCol_Button,        { 0.00f, 0.32f, 0.16f, 1.f });
    ImGui::PushStyleColor(ImGuiCol_ButtonHovered, { 0.00f, 0.32f, 0.16f, 1.f });
    ImGui::PushStyleColor(ImGuiCol_ButtonActive,  { 0.00f, 0.32f, 0.16f, 1.f });
    ImGui::Button(" ACTIVE ");
    ImGui::PopStyleColor(3);

    ImGui::SameLine(0, 16);
    ImGui::TextColored(C_DIM, "Plan:"); ImGui::SameLine();
    ImGui::TextColored(C_ACCENT, "%s",
        state.licInfo.plan.empty() ? "—" : state.licInfo.plan.c_str());

    ImGui::SameLine(0, 20);
    ImGui::TextColored(C_DIM, "Expiration:"); ImGui::SameLine();
    if (state.licInfo.expiresAt.empty())
        ImGui::TextColored(C_GREEN, "LIFETIME");
    else
        ImGui::TextColored(C_YELLOW, "%s",
            state.licInfo.expiresAt.substr(0, 10).c_str());

    ImGui::SameLine(0, 20);
    std::string hs = state.hwid.size() >= 16
        ? (state.hwid.substr(0, 8) + "..." + state.hwid.substr(state.hwid.size() - 8))
        : state.hwid;
    ImGui::TextColored(C_DIM, "HWID:"); ImGui::SameLine();
    ImGui::TextColored({ 0.65f, 0.65f, 0.65f, 1.f }, "%s", hs.c_str());

    ImGui::EndChild();
    ImGui::PopStyleColor(); // ChildBg
    ImGui::Spacing();

    // ── Two-column layout ──
    const float leftW  = 260.f;
    const float rightW = W
        - leftW
        - ImGui::GetStyle().WindowPadding.x * 2.f
        - ImGui::GetStyle().ItemSpacing.x;

    bool busy = state.running.load();

    // Helper: launch optimizer on background thread
    auto launch = [&](const char* title, void (*fn)(AppState&)) {
        if (busy) return;
        state.running  = true;
        state.runTitle = title;
        { std::lock_guard<std::mutex> lk(state.logMtx); state.log.clear(); }
        std::thread([&state, fn]() {
            fn(state);
            state.running = false;
        }).detach();
    };

    // ── LEFT: Action buttons ──
    ImGui::BeginChild("##btns", { leftW, -1.f }, false);

    ImGui::TextColored(C_ACCENT, "OPTIMISATIONS");
    ImGui::Spacing();

    if (busy) ImGui::PushStyleVar(ImGuiStyleVar_Alpha, 0.45f);

    if (AccentButton("  Optimisations SAFE  ", { leftW - 16.f, 46.f }))
        launch("Optimisations SAFE", applySafe);
    ImGui::TextColored(C_DIM, " Toutes les tweaks sans risque");
    ImGui::Spacing();

    if (AccentButton("  SAFE + AVANCEES  ", { leftW - 16.f, 46.f }))
        launch("SAFE + Avancees", applyAdvanced);
    ImGui::TextColored(C_DIM, " Performance maximale");
    ImGui::Spacing();

    if (busy) ImGui::PopStyleVar();

    ImGui::Separator();
    ImGui::Spacing();

    // BIOS toggle
    const char* biosLbl = state.showBios ? "  [x] Rappels BIOS  " : "  Rappels BIOS  ";
    if (ImGui::Button(biosLbl, { leftW - 16.f, 36.f }))
        state.showBios = !state.showBios;
    ImGui::TextColored(C_DIM, " Optimisations manuelles");
    ImGui::Spacing();

    if (busy) ImGui::PushStyleVar(ImGuiStyleVar_Alpha, 0.45f);
    if (DangerButton("  Restaurer (Revert)  ", { leftW - 16.f, 36.f }))
        launch("Restauration", revertAll);
    ImGui::TextColored(C_DIM, " Annuler toutes les tweaks");
    if (busy) ImGui::PopStyleVar();

    ImGui::Spacing();
    ImGui::Separator();
    ImGui::Spacing();

    if (ImGui::Button("  Quitter  ", { leftW - 16.f, 32.f }))
        PostQuitMessage(0);

    ImGui::EndChild(); // btns
    ImGui::SameLine();

    // ── RIGHT: Log or BIOS panel ──
    ImGui::BeginChild("##right", { rightW, -1.f }, false);

    if (state.showBios) {
        // ── BIOS reminders ──
        ImGui::TextColored(C_CYAN, "RAPPELS BIOS");
        ImGui::TextColored(C_DIM, "A faire manuellement (DEL / F2 au demarrage)");
        ImGui::Spacing();

        ImGui::PushStyleColor(ImGuiCol_ChildBg, ImVec4{ 0.10f, 0.10f, 0.10f, 1.f });
        ImGui::BeginChild("##bios", { -1.f, -1.f }, true);

        ImGui::TextColored(C_GREEN, "[PERFORMANCE]");
        ImGui::BulletText("Activer profil XMP / EXPO pour la RAM");
        ImGui::BulletText("Desactiver C-States (C1E, C3, C6, C7)");
        ImGui::BulletText("Desactiver EIST / SpeedStep (Intel)");
        ImGui::BulletText("ou Cool'n'Quiet (AMD)");
        ImGui::BulletText("Desactiver HPET");
        ImGui::Spacing();

        ImGui::TextColored(C_YELLOW, "[LATENCE]");
        ImGui::BulletText("Activer Above 4G Decoding (PCIe)");
        ImGui::BulletText("Tester Resizable BAR ON / OFF");
        ImGui::BulletText("Ajuster Fan Curves (eviter thermal throttle)");
        ImGui::Spacing();

        ImGui::TextColored(C_RED, "[ATTENTION]");
        ImGui::BulletText("Ne PAS overclocker sans preparation");
        ImGui::BulletText("Sauvegarder le profil BIOS avant modifications");
        ImGui::BulletText("Consultez le guide PDF pour les details");

        ImGui::EndChild();
        ImGui::PopStyleColor();
    } else {
        // ── Optimizer log ──
        if (busy)
            ImGui::TextColored(C_YELLOW, "  %s en cours...", state.runTitle.c_str());
        else if (!state.log.empty())
            ImGui::TextColored(C_GREEN, "  Termine.");
        else
            ImGui::TextColored(C_DIM, "  Selectionnez une action pour commencer.");
        ImGui::Spacing();

        ImGui::PushStyleColor(ImGuiCol_ChildBg, ImVec4{ 0.05f, 0.05f, 0.05f, 1.f });
        ImGui::BeginChild("##log", { -1.f, -1.f }, true);

        if (g_fontMono) ImGui::PushFont(g_fontMono);
        {
            std::lock_guard<std::mutex> lk(state.logMtx);
            for (const auto& e : state.log) {
                int t = (e.type >= 0 && e.type < 6) ? e.type : 0;
                ImGui::TextColored(LOG_COLORS[t], "%s", e.text.c_str());
            }
        }
        if (g_fontMono) ImGui::PopFont();

        if (state.scrollLog.exchange(false))
            ImGui::SetScrollHereY(1.0f);

        ImGui::EndChild();
        ImGui::PopStyleColor();
    }

    ImGui::EndChild(); // right

    // ── License revocation check (heartbeat) ──
    if (state.client && !state.client->isValid()) {
        state.client->stopHeartbeatLoop();
        state.screen     = Screen::LICENSE;
        state.statusMsg  = "[!] Licence revoquee par le serveur.";
        state.statusType = 2;
    }

    ImGui::End();
}

// ══════════════════════════════════════════════════════
//  GuiDraw — called each frame
// ══════════════════════════════════════════════════════
void GuiDraw(AppState& state) {
    switch (state.screen) {
        case Screen::LICENSE: DrawLicenseScreen(state); break;
        case Screen::MAIN:    DrawMainScreen(state);    break;
    }
    ImGui::Render();
}