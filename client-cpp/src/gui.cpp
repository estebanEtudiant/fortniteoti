// ════════════════════════════════════════════════════════════════════
//  gui.cpp — SLIDE Performance Utility — UI Premium v2
//  Écrans : Licence | Dashboard | Modules | Logs | Paramètres
// ════════════════════════════════════════════════════════════════════

#include "gui.h"
#include "licensing.h"
#include "tweaks.h"
#include "updater.h"

#include "imgui.h"
#include "imgui_impl_win32.h"
#include "imgui_impl_dx11.h"

#include <thread>
#include <chrono>
#include <functional>
#include <string>
#include <algorithm>
#include <cstring>
#include <cstdio>

extern IMGUI_IMPL_API LRESULT ImGui_ImplWin32_WndProcHandler(HWND, UINT, WPARAM, LPARAM);

// ── Navigation ──────────────────────────────────────────────────────
enum class MainTab { Dashboard, Modules, Logs, Settings };
static MainTab g_tab = MainTab::Dashboard;

// ── Fonts — hiérarchie typographique complète ────────────────────────
static ImFont* g_fontSmall = nullptr;   // Segoe UI  13  — labels / secondaire
static ImFont* g_fontMain  = nullptr;   // Segoe UI  16  — corps de texte
static ImFont* g_fontMono  = nullptr;   // Consolas  14  — logs / code
static ImFont* g_fontH2    = nullptr;   // Segoe UI  20  — sous-titres
static ImFont* g_fontH1    = nullptr;   // Segoe UI Bold 26 — titres de page

// ── Flags modules (checkboxes Modules page) ──────────────────────────
static bool g_modBackup  = true, g_modWindows = true, g_modGpu     = true;
static bool g_modCpu     = true, g_modRam     = true, g_modClean   = true;
static bool g_modNetwork = true, g_modStorage = true, g_modInput   = true;
static bool g_modPower   = true;

// ── Préférences ──────────────────────────────────────────────────────
static bool g_settAutoScroll  = true;
static bool g_settCompactLogs = false;

// ════════════════════════════════════════════════════════════════════
//  PALETTE — Dark premium, accent cyan
// ════════════════════════════════════════════════════════════════════
static const ImVec4 C_BG       = { 0.042f, 0.044f, 0.052f, 1.f };
static const ImVec4 C_SIDEBAR  = { 0.054f, 0.057f, 0.068f, 1.f };
static const ImVec4 C_CARD     = { 0.082f, 0.086f, 0.098f, 1.f };
static const ImVec4 C_CARD2    = { 0.106f, 0.110f, 0.124f, 1.f };
static const ImVec4 C_FRAME    = { 0.118f, 0.122f, 0.138f, 1.f };
static const ImVec4 C_BORDER   = { 0.145f, 0.150f, 0.172f, 1.f };

static const ImVec4 C_ACCENT   = { 0.00f, 0.82f, 1.00f, 1.f };
static const ImVec4 C_ACCENT_H = { 0.18f, 0.88f, 1.00f, 1.f };
static const ImVec4 C_ACCENT_A = { 0.00f, 0.64f, 0.80f, 1.f };

static const ImVec4 C_VIOLET   = { 0.56f, 0.40f, 1.00f, 1.f };

static const ImVec4 C_TEXT     = { 0.93f, 0.95f, 0.97f, 1.f };
static const ImVec4 C_DIM      = { 0.56f, 0.60f, 0.68f, 1.f };
static const ImVec4 C_SOFT     = { 0.74f, 0.78f, 0.84f, 1.f };

static const ImVec4 C_OK       = { 0.20f, 0.78f, 0.42f, 1.f };
static const ImVec4 C_WARN     = { 0.97f, 0.70f, 0.26f, 1.f };
static const ImVec4 C_ERR      = { 0.90f, 0.26f, 0.28f, 1.f };

static const ImVec4 LOG_COLORS[6] = { C_TEXT, C_OK, C_ERR, C_WARN, C_ACCENT, C_VIOLET };

static const ImVec4 C_TITLEBAR = { 0.04f, 0.045f, 0.06f, 1.f };  // barre titre custom

// ════════════════════════════════════════════════════════════════════
//  THEME
// ════════════════════════════════════════════════════════════════════
static void ApplyTheme() {
    ImGuiStyle& s = ImGui::GetStyle();

    // ── Géométrie — grille 8/12/16 ──────────────────────────────────
    // Toutes les dimensions suivent une grille de 8px.
    // Boutons : 38px (small) / 42px (normal) / 46px (CTA primary)
    // Cards   : 80 / 96 / 120 / 140 / 170px selon le contenu
    // Spacing : 8 (tight) / 12 (normal) / 16 (loose) / 20 (section)
    // Padding : 12 (card dense) / 14 (card normal) / 18 (window)
    s.WindowPadding      = { 18.f, 16.f };   // padding fenêtre/content
    s.FramePadding       = { 12.f,  9.f };   // padding boutons/inputs
    s.ItemSpacing        = { 10.f,  8.f };   // espacement items (8px vertical = grille)
    s.ItemInnerSpacing   = {  8.f,  6.f };
    s.IndentSpacing      = 16.f;
    s.ScrollbarSize      =  8.f;

    // ── Rayons — tous pairs pour pixel-perfect ───────────────────────
    s.WindowRounding     = 10.f;
    s.ChildRounding      =  8.f;
    s.FrameRounding      =  7.f;
    s.PopupRounding      =  8.f;
    s.ScrollbarRounding  =  6.f;
    s.GrabRounding       =  5.f;
    s.TabRounding        =  7.f;

    // ── Bordures ─────────────────────────────────────────────────────
    s.WindowBorderSize   = 0.f;
    s.ChildBorderSize    = 1.f;
    s.FrameBorderSize    = 0.f;
    s.PopupBorderSize    = 1.f;

    ImVec4* c = s.Colors;
    c[ImGuiCol_Text]               = C_TEXT;
    c[ImGuiCol_TextDisabled]       = C_DIM;
    c[ImGuiCol_WindowBg]           = C_BG;
    c[ImGuiCol_ChildBg]            = C_CARD;
    c[ImGuiCol_Border]             = C_BORDER;
    c[ImGuiCol_FrameBg]            = C_FRAME;
    c[ImGuiCol_FrameBgHovered]     = C_CARD2;
    c[ImGuiCol_FrameBgActive]      = { 0.15f, 0.18f, 0.22f, 1.f };
    c[ImGuiCol_CheckMark]          = C_ACCENT;
    c[ImGuiCol_SliderGrab]         = C_ACCENT;
    c[ImGuiCol_SliderGrabActive]   = C_ACCENT_H;
    c[ImGuiCol_Button]             = C_FRAME;
    c[ImGuiCol_ButtonHovered]      = C_CARD2;
    c[ImGuiCol_ButtonActive]       = { 0.16f, 0.20f, 0.26f, 1.f };
    c[ImGuiCol_Header]             = { 0.10f, 0.14f, 0.18f, 1.f };
    c[ImGuiCol_HeaderHovered]      = { 0.14f, 0.18f, 0.24f, 1.f };
    c[ImGuiCol_HeaderActive]       = { 0.16f, 0.22f, 0.30f, 1.f };
    c[ImGuiCol_Separator]          = { 0.14f, 0.15f, 0.18f, 1.f };
    c[ImGuiCol_ScrollbarBg]        = { 0.05f, 0.05f, 0.06f, 1.f };
    c[ImGuiCol_ScrollbarGrab]      = { 0.22f, 0.24f, 0.28f, 1.f };
    c[ImGuiCol_ScrollbarGrabHovered]={ 0.30f, 0.33f, 0.38f, 1.f };
    c[ImGuiCol_ScrollbarGrabActive] = C_ACCENT;
}

// ════════════════════════════════════════════════════════════════════
//  GUI API
// ════════════════════════════════════════════════════════════════════
bool GuiInit(HWND hwnd, ID3D11Device* dev, ID3D11DeviceContext* ctx) {
    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    io.IniFilename = nullptr;
    io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;

    // ── Configuration de rendu des polices ──────────────────────────
    // OversampleH=2 : antialiasing horizontal plus net
    // PixelSnapH=true : alignement pixel exact → texte net à toutes tailles
    // RasterizerMultiply=1.0 : pas de shift de luminosité
    ImFontConfig cfg;
    cfg.OversampleH        = 2;
    cfg.OversampleV        = 1;
    cfg.PixelSnapH         = true;
    cfg.RasterizerMultiply = 1.0f;

    // ── Plages texte : segoeui.ttf — uniquement Latin + ponctuation ──
    // Les symboles/icônes sont intentionnellement exclus ici : ils viennent de seguisym.ttf
    // (plus fiable que segoeui.ttf dont la couverture des symboles varie selon la version Windows)
    static const ImWchar text_ranges[] = {
        0x0020, 0x00FF,  // Latin de base + Latin-1 (accents FR : é è ê à ù ç…)
        0x2010, 0x206F,  // Ponctuation générale (— tiret cadratin, «» guillemets…)
        0,
    };
    cfg.GlyphRanges = text_ranges;

    // ── Plages symboles : seguisym.ttf fusionné ──
    // seguisym.ttf = Segoe UI Symbol — couverture complète garantie sur Windows 10/11
    // Inclut Geometric Shapes (◆ ▶ ● ■) ET Misc Symbols (⚙ ⚡ ☰) ET Dingbats (✓ ✗)
    static const ImWchar sym_ranges[] = {
        0x25A0, 0x25FF,  // Formes géométriques (◆ ▶ ● ■ ○ — icônes sidebar + spinner)
        0x2600, 0x26FF,  // Misc Symbols (⚙ U+2699, ⚡ U+26A1, ☰ U+2630…)
        0x2700, 0x27BF,  // Dingbats (✓ ✗ ➜…)
        0,
    };
    ImFontConfig cfgM;          // config merge — doit rester valide jusqu'au Build()
    cfgM.MergeMode   = true;    // fusionne dans la police précédemment chargée
    cfgM.OversampleH = 2;
    cfgM.OversampleV = 1;
    cfgM.PixelSnapH  = true;
    cfgM.GlyphRanges = sym_ranges;

    // ── Hiérarchie typographique ─────────────────────────────────────
    // Ne jamais utiliser FontGlobalScale pour agrandir une seule taille :
    // ça floute. Charger chaque taille à sa vraie valeur.
    const char* SEGOE    = "C:\\Windows\\Fonts\\segoeui.ttf";
    const char* SEGOEB   = "C:\\Windows\\Fonts\\segoeuib.ttf";
    const char* MONO     = "C:\\Windows\\Fonts\\consola.ttf";
    const char* SEGUISYM = "C:\\Windows\\Fonts\\seguisym.ttf";

    // Pour chaque taille : 1) charge Segoe UI pour le texte,
    //                      2) fusionne Segoe UI Symbol pour les symboles ⚙⚡☰
    g_fontSmall = io.Fonts->AddFontFromFileTTF(SEGOE,    13.f, &cfg);
                  io.Fonts->AddFontFromFileTTF(SEGUISYM, 13.f, &cfgM);
    g_fontMain  = io.Fonts->AddFontFromFileTTF(SEGOE,    16.f, &cfg);
                  io.Fonts->AddFontFromFileTTF(SEGUISYM, 16.f, &cfgM);
    g_fontMono  = io.Fonts->AddFontFromFileTTF(MONO,     14.f, &cfg);
    g_fontH2    = io.Fonts->AddFontFromFileTTF(SEGOE,    20.f, &cfg);
                  io.Fonts->AddFontFromFileTTF(SEGUISYM, 20.f, &cfgM);
    g_fontH1    = io.Fonts->AddFontFromFileTTF(SEGOEB,   26.f, &cfg);
                  io.Fonts->AddFontFromFileTTF(SEGUISYM, 26.f, &cfgM);

    // Fallback : si une font ne se charge pas (fichier absent), ImGui
    // utilise sa police interne sans crash.
    io.Fonts->Build();

    ApplyTheme();
    ImGui_ImplWin32_Init(hwnd);
    ImGui_ImplDX11_Init(dev, ctx);
    return true;
}

void GuiBeginFrame() { ImGui_ImplDX11_NewFrame(); ImGui_ImplWin32_NewFrame(); ImGui::NewFrame(); }
void GuiShutdown()   { ImGui_ImplDX11_Shutdown(); ImGui_ImplWin32_Shutdown(); ImGui::DestroyContext(); }
void GuiWndProc(HWND hw, UINT m, WPARAM w, LPARAM l) { ImGui_ImplWin32_WndProcHandler(hw, m, w, l); }
void GuiPresent()    { ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData()); }

void GuiLog(AppState& state, const std::string& text, int type) {
    std::lock_guard<std::mutex> lk(state.logMtx);
    state.log.push_back({ text, type });
    state.scrollLog = true;
}

// ════════════════════════════════════════════════════════════════════
//  HELPERS UI
// ════════════════════════════════════════════════════════════════════

// Texte centré dans la zone disponible
static void Centered(const char* txt, const ImVec4& col = C_TEXT) {
    float w  = ImGui::CalcTextSize(txt).x;
    float cx = ImGui::GetCursorPosX() + (ImGui::GetContentRegionAvail().x - w) * 0.5f;
    if (cx > ImGui::GetCursorPosX()) ImGui::SetCursorPosX(cx);
    ImGui::TextColored(col, "%s", txt);
}

// Carte (child window avec border)
static bool BeginCard(const char* id, ImVec2 sz = { 0.f, 0.f }, bool scrollY = false) {
    ImGui::PushStyleColor(ImGuiCol_ChildBg,  C_CARD);
    ImGui::PushStyleColor(ImGuiCol_Border,   C_BORDER);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, { 14.f, 14.f });
    ImGuiWindowFlags wf = scrollY ? 0 : (ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoScrollWithMouse);
    // sz.y == 0 → auto-resize to content height (sinon ImGui prend l'espace restant)
    ImGuiChildFlags cf = ImGuiChildFlags_Borders;
    if (sz.y == 0.f) cf |= ImGuiChildFlags_AutoResizeY;
    return ImGui::BeginChild(id, sz, cf, wf);
}
static void EndCard() {
    ImGui::EndChild();
    ImGui::PopStyleVar();
    ImGui::PopStyleColor(2);
}

// Bouton accent (fond cyan, texte sombre)
static bool BtnAccent(const char* lbl, ImVec2 sz = { 0.f, 0.f }) {
    ImGui::PushStyleColor(ImGuiCol_Button,        C_ACCENT);
    ImGui::PushStyleColor(ImGuiCol_ButtonHovered, C_ACCENT_H);
    ImGui::PushStyleColor(ImGuiCol_ButtonActive,  C_ACCENT_A);
    ImGui::PushStyleColor(ImGuiCol_Text,          { 0.03f, 0.05f, 0.08f, 1.f });
    ImGui::PushStyleVar(ImGuiStyleVar_FrameRounding, 8.f);
    bool r = ImGui::Button(lbl, sz);
    ImGui::PopStyleVar();
    ImGui::PopStyleColor(4);
    return r;
}

// Bouton danger (fond rouge)
static bool BtnDanger(const char* lbl, ImVec2 sz = { 0.f, 0.f }) {
    ImGui::PushStyleColor(ImGuiCol_Button,        { 0.54f, 0.14f, 0.16f, 1.f });
    ImGui::PushStyleColor(ImGuiCol_ButtonHovered, { 0.68f, 0.18f, 0.20f, 1.f });
    ImGui::PushStyleColor(ImGuiCol_ButtonActive,  { 0.44f, 0.10f, 0.12f, 1.f });
    ImGui::PushStyleVar(ImGuiStyleVar_FrameRounding, 8.f);
    bool r = ImGui::Button(lbl, sz);
    ImGui::PopStyleVar();
    ImGui::PopStyleColor(3);
    return r;
}

// Bouton navigation sidebar
static bool BtnNav(const char* lbl, bool active, float w) {
    const ImVec4 bg  = active ? ImVec4{ 0.10f, 0.18f, 0.24f, 1.f } : ImVec4{ 0,0,0,0 };
    const ImVec4 bgh = active ? ImVec4{ 0.12f, 0.21f, 0.28f, 1.f } : ImVec4{ 1,1,1,0.04f };
    ImGui::PushStyleColor(ImGuiCol_Button,        bg);
    ImGui::PushStyleColor(ImGuiCol_ButtonHovered, bgh);
    ImGui::PushStyleColor(ImGuiCol_ButtonActive,  bgh);
    ImGui::PushStyleColor(ImGuiCol_Text, active ? C_TEXT : C_DIM);
    ImGui::PushStyleVar(ImGuiStyleVar_FrameRounding,  9.f);
    ImGui::PushStyleVar(ImGuiStyleVar_ButtonTextAlign, { 0.10f, 0.5f });
    if (active) {
        ImVec2 p = ImGui::GetCursorScreenPos();
        ImGui::GetWindowDrawList()->AddRectFilled(
            { p.x + 2.f, p.y + 8.f }, { p.x + 4.f, p.y + 36.f },
            ImGui::GetColorU32(C_ACCENT), 2.f);
    }
    bool r = ImGui::Button(lbl, { w, 44.f });
    ImGui::PopStyleVar(2);
    ImGui::PopStyleColor(4);
    return r;
}

// Petite pastille colorée (badge statut)
static void Badge(const char* txt, const ImVec4& col) {
    ImVec2 ts  = ImGui::CalcTextSize(txt);
    ImVec2 pos = ImGui::GetCursorScreenPos();
    float  px  = 8.f, py = 4.f, r = 5.f;
    ImVec2 bmin = pos;
    ImVec2 bmax = { pos.x + ts.x + px * 2, pos.y + ts.y + py * 2 };
    ImGui::GetWindowDrawList()->AddRectFilled(bmin, bmax,
        ImGui::GetColorU32({ col.x, col.y, col.z, 0.18f }), r);
    ImGui::GetWindowDrawList()->AddRect(bmin, bmax,
        ImGui::GetColorU32({ col.x, col.y, col.z, 0.45f }), r);
    ImGui::SetCursorPos({ ImGui::GetCursorPosX() + px,
                          ImGui::GetCursorPosY() + py });
    ImGui::TextColored(col, "%s", txt);
    ImGui::SetCursorPosY(ImGui::GetCursorPosY() + py);
    ImGui::Dummy({ 0, 0 });
}

// Spinner de chargement animé (texte)
static const char* Spinner() {
    static const char* frames[] = { "  ●○○  ", "  ○●○  ", "  ○○●  ", "  ○●○  " };
    return frames[(int)(ImGui::GetTime() * 3.0) % 4];
}

// Séparateur avec label centré
static void SepLabel(const char* lbl) {
    ImGui::Spacing();
    float w = ImGui::GetContentRegionAvail().x;
    float tw = ImGui::CalcTextSize(lbl).x + 16.f;
    float lw = (w - tw) * 0.5f;
    ImVec2 p = ImGui::GetCursorScreenPos();
    float cy = p.y + ImGui::GetTextLineHeight() * 0.5f;
    ImGui::GetWindowDrawList()->AddLine({ p.x, cy }, { p.x + lw, cy },
        ImGui::GetColorU32(C_BORDER), 1.f);
    ImGui::GetWindowDrawList()->AddLine({ p.x + lw + tw, cy }, { p.x + w, cy },
        ImGui::GetColorU32(C_BORDER), 1.f);
    ImGui::SetCursorPosX(ImGui::GetCursorPosX() + lw + 8.f);
    ImGui::TextColored(C_DIM, "%s", lbl);
    ImGui::Spacing();
}

// Forward declaration (défini après g_modules)
static void RunAllChecks();

// Lancement d'une action sur thread background + redirection logs
static void Launch(AppState& s, const char* title,
                   std::function<void(AppState&)> fn) {
    if (s.running.load()) return;
    s.running  = true;
    s.runTitle = title;
    g_tab = MainTab::Logs;
    { std::lock_guard<std::mutex> lk(s.logMtx); s.log.clear(); }
    std::thread([&s, fn]() { fn(s); s.running = false; RunAllChecks(); }).detach();
}

// ════════════════════════════════════════════════════════════════════
//  STRUCTURE DE DONNÉES — Modules
// ════════════════════════════════════════════════════════════════════
struct ModuleInfo {
    const char* icon;
    const char* title;
    const char* desc;
    int         tweakCount;
    bool*       enabled;
    void      (*fn)(AppState&);
    ImVec4      color;
    tweaks::CheckResult (*checkFn)();  // nullptr = non vérifiable
    tweaks::CheckResult lastCheck;     // résultat du dernier check
};

static ModuleInfo g_modules[] = {
    { "BACKUP",   "Backup & Securite",   "Point de restauration systeme + export complet HKLM / HKCU sur le Bureau.",    3,  &g_modBackup,  tweaks::applyBackup,  C_WARN,   nullptr,                  {} },
    { "WINDOWS",  "Windows / Systeme",   "Services, Edge, SMB, profil multimedia, Content Delivery, Settings Sync, UI.", 18, &g_modWindows, tweaks::applyWindows, C_ACCENT, tweaks::checkWindows,     {} },
    { "GPU",      "Carte Graphique",     "HAGS, PCIe power, idle NVIDIA, DWM/Aero Peek, TDR Delay/DDI.",                 7,  &g_modGpu,     tweaks::applyGpu,     C_VIOLET, tweaks::checkGpu,         {} },
    { "CPU",      "Processeur",          "Power Throttling, scheduler, SystemResponsiveness, PEP States, Core Parking.", 10, &g_modCpu,     tweaks::applyCpu,     C_ACCENT, tweaks::checkCpu,         {} },
    { "RAM",      "Memoire (RAM)",       "Vidage Standby Memory (NT Kernel), Paging Executive, compression.",            4,  &g_modRam,     tweaks::applyRam,     C_OK,     tweaks::checkRam,         {} },
    { "CLEANUP",  "Nettoyage Systeme",   "TEMP user/Windows, cache DirectX Shader, Delivery Opt., DNS, Corbeille.",      6,  &g_modClean,   tweaks::applyCleanup, C_DIM,    nullptr,                  {} },
    { "NETWORK",  "Reseau & Ping",       "Nagle off, TcpAckFreq=1, DelAckTicks=0, MTU, LanMan, DNS TTL, TCP reset.",     11, &g_modNetwork, tweaks::applyNetwork, C_ACCENT, tweaks::checkNetwork,     {} },
    { "STORAGE",  "Stockage SSD/HDD",   "TRIM, NTFS Last Access, Prefetch/SysMain off, 8.3 NTFS, write cache.",         6,  &g_modStorage, tweaks::applyStorage, C_WARN,   tweaks::checkStorage,     {} },
    { "INPUT",    "Input & Latence",     "Souris 1:1, clavier delay 0, accessibility keys off, USB power, manette.",     12, &g_modInput,   tweaks::applyInput,   C_OK,     tweaks::checkInput,       {} },
    { "POWER",    "Alimentation",        "Ultimate Performance Plan, CPU 100%, Boost agressif, ASPM off, veille off.",   8,  &g_modPower,   tweaks::applyPower,   C_WARN,   tweaks::checkPower,       {} },
};
static const int MODULE_COUNT = 10;

// ── Vérification état système ─────────────────────────────────────────
static bool g_checksLoaded = false;

static void RunAllChecks() {
    for (int i = 0; i < MODULE_COUNT; ++i)
        if (g_modules[i].checkFn)
            g_modules[i].lastCheck = g_modules[i].checkFn();
    g_checksLoaded = true;
}

// Nombre de tweaks total (modules activés uniquement)
static int CountEnabledTweaks() {
    int n = 0;
    for (int i = 0; i < MODULE_COUNT; ++i)
        if (*g_modules[i].enabled) n += g_modules[i].tweakCount;
    return n;
}

// ════════════════════════════════════════════════════════════════════
//  DÉCORATION DE FOND — glows subtils dessinés dans le BackgroundDrawList
// ════════════════════════════════════════════════════════════════════
static void DrawBgDecor() {
    ImDrawList* bg = ImGui::GetBackgroundDrawList();
    const ImVec2 ds = ImGui::GetIO().DisplaySize;
    bg->AddCircleFilled({ ds.x,   0.f  }, 340.f, IM_COL32(  0, 155, 220,  7));
    bg->AddCircleFilled({ 0.f,    ds.y }, 270.f, IM_COL32(100,  55, 210,  6));
    bg->AddCircleFilled({ ds.x * 0.5f, ds.y * 0.5f }, 180.f, IM_COL32(0, 100, 160, 3));
}

// ════════════════════════════════════════════════════════════════════
//  BOUTON GRADIENT — CTA principal avec gradient cyan→bleu + glow hover
// ════════════════════════════════════════════════════════════════════
static bool GradientBtn(const char* label, ImVec2 size, bool disabled = false) {
    // Résoudre les tailles négatives/nulles avant tout (comme ImGui::Button le fait)
    ImVec2 avail = ImGui::GetContentRegionAvail();
    if (size.x <= 0.f) size.x = avail.x + size.x;
    if (size.y <= 0.f) size.y = ImGui::GetFrameHeight() + size.y;
    if (size.x < 1.f)  size.x = 1.f;
    if (size.y < 1.f)  size.y = 1.f;

    // Vérifier si on est déjà dans un contexte BeginDisabled (outer ou inner)
    bool outerDisabled = disabled || (ImGui::GetStyle().Alpha < 0.99f);

    if (disabled) ImGui::BeginDisabled();
    ImVec2 pos = ImGui::GetCursorScreenPos();
    ImGui::InvisibleButton(label, size);
    bool hovered = ImGui::IsItemHovered();
    bool active  = ImGui::IsItemActive();
    bool clicked = ImGui::IsItemClicked();
    if (disabled) ImGui::EndDisabled();

    // Appliquer l'alpha global du style (pour BeginDisabled externe)
    float sa  = ImGui::GetStyle().Alpha;
    auto  A   = [&](int a) -> int { return (int)(a * sa); };
    bool  dis = outerDisabled;

    ImDrawList* dl  = ImGui::GetWindowDrawList();
    ImVec2 br       = { pos.x + size.x, pos.y + size.y };

    // Glow halo au survol
    if (hovered && !dis)
        dl->AddRectFilled({ pos.x - 4, pos.y - 4 }, { br.x + 4, br.y + 4 },
            IM_COL32(0, 155, 220, A(30)), 12.f);

    // Gradient principal : cyan → bleu profond
    ImU32 col_l = dis    ? IM_COL32(50,80,100,A(120))
                : active ? IM_COL32(0,115,175,A(255))
                         : IM_COL32(0,155,220,A(255));
    ImU32 col_r = dis    ? IM_COL32(30,50, 80,A(120))
                : active ? IM_COL32(25,55,135,A(255))
                         : IM_COL32(45,75,175,A(255));
    dl->AddRectFilledMultiColor(pos, br, col_l, col_r, col_r, col_l);

    // Highlight blanc (brillance haut)
    dl->AddRectFilledMultiColor(
        pos, { br.x, pos.y + size.y * 0.42f },
        IM_COL32(255,255,255, A(22)), IM_COL32(255,255,255, A(22)),
        IM_COL32(255,255,255,    0), IM_COL32(255,255,255,    0));

    // Texte centré — utilise la police courante
    ImFont* font = ImGui::GetFont();
    ImVec2  ts   = font->CalcTextSizeA(font->FontSize, FLT_MAX, 0.f, label);
    ImU32   tc   = dis ? IM_COL32(180,180,180,A(130)) : IM_COL32(255,255,255,A(255));
    dl->AddText(font, font->FontSize,
        { pos.x + (size.x - ts.x) * 0.5f, pos.y + (size.y - font->FontSize) * 0.5f },
        tc, label);

    return clicked && !dis;
}

// ════════════════════════════════════════════════════════════════════
//  POINT PULSANT — indicateur de statut animé
// ════════════════════════════════════════════════════════════════════
static void PulsingDot(const ImVec4& col, float radius = 4.5f) {
    float alpha = 0.55f + 0.45f * sinf((float)ImGui::GetTime() * 2.8f);
    ImVec2 cp   = ImGui::GetCursorScreenPos();
    cp.x += radius + 1.f;
    cp.y += ImGui::GetTextLineHeight() * 0.5f;
    ImGui::GetWindowDrawList()->AddCircleFilled(
        cp, radius,
        ImGui::ColorConvertFloat4ToU32({ col.x, col.y, col.z, alpha }));
    ImGui::Dummy({ (radius + 1.f) * 2.f, ImGui::GetTextLineHeight() });
}

// ════════════════════════════════════════════════════════════════════
//  TITLEBAR CUSTOM — 40px en haut de la fenêtre principale
// ════════════════════════════════════════════════════════════════════
static void DrawTitleBar(AppState& state) {
    const float W = ImGui::GetIO().DisplaySize.x;

    ImGui::PushStyleColor(ImGuiCol_ChildBg, C_TITLEBAR);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, { 0.f, 0.f });
    ImGui::BeginChild("##titlebar", { W, 40.f }, false,
        ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoScrollWithMouse);

    // Ligne d'accent gradient en bas de la titlebar
    ImVec2 p  = ImGui::GetWindowPos();
    ImDrawList* dl = ImGui::GetWindowDrawList();
    dl->AddRectFilledMultiColor(
        { p.x,           p.y + 38.f }, { p.x + W * 0.55f, p.y + 40.f },
        IM_COL32(0, 155, 220, 200), IM_COL32(0, 0, 0, 0),
        IM_COL32(0, 0, 0, 0),       IM_COL32(0, 155, 220, 200));

    // Logo — aligné verticalement
    ImGui::SetCursorPos({ 18.f, 8.f });
    if (g_fontH2) ImGui::PushFont(g_fontH2);
    ImGui::TextColored(C_ACCENT, "404 Tweaks");
    if (g_fontH2) ImGui::PopFont();

    ImGui::SameLine(0.f, 10.f);
    ImGui::SetCursorPosY(13.f);
    if (g_fontSmall) ImGui::PushFont(g_fontSmall);
    ImGui::TextColored(C_DIM, "v2026");
    if (g_fontSmall) ImGui::PopFont();

    // ── Boutons minimize / close (extrême droite) ──
    ImGui::PushStyleColor(ImGuiCol_Button,        { 0.f, 0.f, 0.f, 0.f });
    ImGui::PushStyleColor(ImGuiCol_ButtonHovered, { 1.f, 1.f, 1.f, 0.09f });
    ImGui::PushStyleColor(ImGuiCol_ButtonActive,  { 1.f, 1.f, 1.f, 0.15f });
    ImGui::PushStyleVar(ImGuiStyleVar_FrameRounding, 4.f);

    ImGui::SetCursorPos({ W - 88.f, 8.f });
    if (ImGui::Button(" \xe2\x80\x94 ##min", { 44.f, 24.f }))  // —
        state.wantMinimize = true;

    ImGui::SameLine(0.f, 0.f);
    ImGui::PushStyleColor(ImGuiCol_ButtonHovered, { 0.75f, 0.10f, 0.10f, 0.90f });
    ImGui::PushStyleColor(ImGuiCol_ButtonActive,  { 0.55f, 0.06f, 0.06f, 1.00f });
    if (ImGui::Button("  X ##cls", { 44.f, 24.f }))
        state.wantClose = true;
    ImGui::PopStyleColor(5);
    ImGui::PopStyleVar();

    ImGui::EndChild();
    ImGui::PopStyleVar();
    ImGui::PopStyleColor();
}

// ════════════════════════════════════════════════════════════════════
//  ÉCRAN LICENCE
// ════════════════════════════════════════════════════════════════════
static void DrawLicenseScreen(AppState& state) {
    DrawBgDecor();

    const ImGuiIO& io = ImGui::GetIO();
    ImGui::SetNextWindowPos({ io.DisplaySize.x * 0.5f, io.DisplaySize.y * 0.5f },
                            ImGuiCond_Always, { 0.5f, 0.5f });
    ImGui::SetNextWindowSize({ 480.f, 0.f }, ImGuiCond_Always);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, { 32.f, 32.f });
    ImGui::Begin("##lic", nullptr,
        ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoResize |
        ImGuiWindowFlags_NoMove     | ImGuiWindowFlags_AlwaysAutoResize);

    // Ligne d'accent cyan en haut de la card
    {
        ImVec2 wp  = ImGui::GetWindowPos();
        float  ww  = ImGui::GetWindowWidth();
        ImDrawList* dl = ImGui::GetWindowDrawList();
        dl->AddRectFilledMultiColor(
            { wp.x + 20.f, wp.y + 2.f }, { wp.x + ww - 20.f, wp.y + 4.f },
            IM_COL32(0,0,0,0), IM_COL32(0,155,220,200),
            IM_COL32(0,155,220,200), IM_COL32(0,0,0,0));
    }

    // Titre
    if (g_fontH1) ImGui::PushFont(g_fontH1);
    //p
    Centered("404 Tweaks", C_ACCENT);
    if (g_fontH1) ImGui::PopFont();
    if (g_fontH2) ImGui::PushFont(g_fontH2);
    //Centered("UTILITY v2026", C_DIM);
    if (g_fontH2) ImGui::PopFont();

    ImGui::Dummy({ 0, 18.f });
    ImGui::Separator();
    ImGui::Dummy({ 0, 18.f });

    // Info machine
    if (g_fontMain) ImGui::PushFont(g_fontMain);
    ImGui::PushStyleColor(ImGuiCol_ChildBg, C_CARD2);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, { 12.f, 10.f });
    ImGui::BeginChild("##licinfo", { -1.f, 58.f }, ImGuiChildFlags_Borders,
                      ImGuiWindowFlags_NoScrollbar);
    std::string hs = state.hwid.size() >= 16
        ? (state.hwid.substr(0, 8) + "..." + state.hwid.substr(state.hwid.size() - 8))
        : state.hwid;
    ImGui::TextColored(C_DIM, "HWID"); ImGui::SameLine(70);
    ImGui::TextColored(C_SOFT, "%s", hs.c_str());
    ImGui::TextColored(C_DIM, "OS  "); ImGui::SameLine(70);
    ImGui::TextColored(C_SOFT, "%s", state.osVer.c_str());
    ImGui::EndChild();
    ImGui::PopStyleVar();
    ImGui::PopStyleColor();
    if (g_fontMain) ImGui::PopFont();

    ImGui::Dummy({ 0, 16.f });
    ImGui::TextColored(C_TEXT, "Cle de licence");
    ImGui::Dummy({ 0, 4.f });
    ImGui::SetNextItemWidth(-1.f);
    ImGui::PushStyleVar(ImGuiStyleVar_FramePadding, { 12.f, 11.f });
    bool enter = ImGui::InputText("##key", state.keyBuf, sizeof(state.keyBuf),
        ImGuiInputTextFlags_EnterReturnsTrue | ImGuiInputTextFlags_CharsUppercase);
    ImGui::PopStyleVar();
    ImGui::TextColored(C_DIM, "Format : XXXXX-XXXXX-XXXXX-XXXXX-XXXXX");
    ImGui::Dummy({ 0, 14.f });

    bool busy = state.checking;
    bool clicked = GradientBtn(busy ? Spinner() : "ACTIVATE THE LICENSE", { -1.f, 46.f }, busy);

    if (!state.statusMsg.empty()) {
        ImGui::Dummy({ 0, 8.f });
        int t = (state.statusType >= 0 && state.statusType < 6) ? state.statusType : 0;
        Centered(state.statusMsg.c_str(), LOG_COLORS[t]);
    }

    // Logique activation
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
                std::this_thread::sleep_for(std::chrono::milliseconds(600));
                state.client->startHeartbeatLoop(300);
                state.screen = Screen::MAIN;
                // Check for update after activation
                {
                    updater::UpdateChecker upd(state.apiUrl);
                    auto upInfo = upd.check();
                    if (upInfo.available) {
                        state.updateVersion   = upInfo.latestVersion;
                        state.updateUrl       = upInfo.downloadUrl;
                        state.updateChangelog = upInfo.changelog;
                        state.updateAvailable.store(true);
                    }
                }
            } else {
                state.statusType = 2;
                switch (info.status) {
                    case licensing::Status::HWID_MISMATCH:
                        state.statusMsg = "[X] Cle liee a une autre machine."; break;
                    case licensing::Status::EXPIRED:
                        state.statusMsg = "[X] Licence expiree."; break;
                    case licensing::Status::BANNED:
                        state.statusMsg = "[X] Licence bannie. Contactez le support."; break;
                    case licensing::Status::NETWORK_ERROR:
                        state.statusMsg = "[X] Serveur inaccessible."; break;
                    case licensing::Status::RATE_LIMITED:
                        state.statusMsg = "[!] Trop de tentatives. Attendez 1 min.";
                        state.statusType = 3; break;
                    default:
                        state.statusMsg = "[X] Cle invalide."; break;
                }
            }
            state.checking = false;
        }).detach();
    }

    ImGui::Dummy({ 0, 8.f });
    ImGui::End();
    ImGui::PopStyleVar();
}

// ════════════════════════════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════════════════════════════
static void DrawSidebar(AppState& state) {
    ImGui::PushStyleColor(ImGuiCol_ChildBg, C_SIDEBAR);
    ImGui::PushStyleColor(ImGuiCol_Border,  { 0.f, 0.f, 0.f, 0.f });
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, { 18.f, 18.f });
    ImGui::BeginChild("##sidebar", { 226.f, -1.f }, false,
                      ImGuiWindowFlags_NoScrollbar);

    // Gradient splash derrière le logo (zone haute de la sidebar)
    {
        ImVec2 sp = ImGui::GetWindowPos();
        ImGui::GetWindowDrawList()->AddRectFilledMultiColor(
            sp, { sp.x + 226.f, sp.y + 76.f },
            IM_COL32(0, 140, 210, 28), IM_COL32(0, 0, 0, 0),
            IM_COL32(0, 0, 0, 0),      IM_COL32(0, 0, 0, 0));
    }

    // Logo
    ImGui::Dummy({ 0, 4.f });
    if (g_fontH2) ImGui::PushFont(g_fontH2);
    //ImGui::TextColored(C_ACCENT, "404 Tweaks");
    if (g_fontH2) ImGui::PopFont();

    ImGui::Dummy({ 0, 14.f });
    ImGui::PushStyleColor(ImGuiCol_Separator, C_BORDER);
    ImGui::Separator();
    ImGui::PopStyleColor();
    ImGui::Dummy({ 0, 10.f });

    // Navigation
    float bw = ImGui::GetContentRegionAvail().x;
    // Icons — seguisym.ttf mergé fournit les Misc Symbols ⚙⚡☰
    if (BtnNav(u8"  \u25C6  Dashboard",  g_tab == MainTab::Dashboard, bw)) g_tab = MainTab::Dashboard;
    if (BtnNav(u8"  \u26A1  Modules",    g_tab == MainTab::Modules,   bw)) g_tab = MainTab::Modules;
    if (BtnNav(u8"  \u2630  Logs",       g_tab == MainTab::Logs,      bw)) g_tab = MainTab::Logs;
    if (BtnNav(u8"  \u2699  Parametres", g_tab == MainTab::Settings,  bw)) g_tab = MainTab::Settings;

    // ── Bas de la sidebar : infos session ──
    float bottomY = ImGui::GetWindowHeight() - 148.f;
    if (ImGui::GetCursorPosY() < bottomY) ImGui::SetCursorPosY(bottomY);

    ImGui::PushStyleColor(ImGuiCol_Separator, C_BORDER);
    ImGui::Separator();
    ImGui::PopStyleColor();
    ImGui::Dummy({ 0, 10.f });

    // Carte session
    ImGui::PushStyleColor(ImGuiCol_ChildBg, C_CARD2);
    ImGui::PushStyleColor(ImGuiCol_Border,  C_BORDER);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, { 12.f, 10.f });
    ImGui::BeginChild("##sess", { -1.f, 110.f }, ImGuiChildFlags_Borders,
                      ImGuiWindowFlags_NoScrollbar);

    // Statut actif — point pulsant animé
    if (state.running.load()) {
        PulsingDot(C_WARN); ImGui::SameLine(0.f, 6.f);
        ImGui::TextColored(C_WARN, "Optimisation en cours");
    } else {
        PulsingDot(C_OK);   ImGui::SameLine(0.f, 6.f);
        ImGui::TextColored(C_OK,   "Session active");
    }
    ImGui::Spacing();
    ImGui::PushStyleColor(ImGuiCol_Separator, C_BORDER);
    ImGui::Separator();
    ImGui::PopStyleColor();
    ImGui::Spacing();

    // Plan / Expiration / HWID — police 13px (labels secondaires)
    if (g_fontSmall) ImGui::PushFont(g_fontSmall);
    ImGui::TextColored(C_DIM, "Plan     "); ImGui::SameLine();
    const char* plan = state.licInfo.plan.empty() ? "PRO" : state.licInfo.plan.c_str();
    ImGui::TextColored(C_ACCENT, "%s", plan);

    ImGui::TextColored(C_DIM, "Expiration"); ImGui::SameLine();
    if (state.licInfo.expiresAt.empty())
        ImGui::TextColored(C_OK, "Lifetime");
    else
        ImGui::TextColored(C_WARN, "%s", state.licInfo.expiresAt.substr(0, 10).c_str());

    ImGui::TextColored(C_DIM, "HWID     "); ImGui::SameLine();
    std::string hs = state.hwid.size() >= 12
        ? (state.hwid.substr(0, 6) + ".." + state.hwid.substr(state.hwid.size() - 4))
        : state.hwid;
    ImGui::TextColored(C_SOFT, "%s", hs.c_str());
    if (g_fontSmall) ImGui::PopFont();

    ImGui::EndChild();
    ImGui::PopStyleVar();
    ImGui::PopStyleColor(2);

    ImGui::EndChild();
    ImGui::PopStyleVar();
    ImGui::PopStyleColor(2);
}

// ════════════════════════════════════════════════════════════════════
//  PAGE : DASHBOARD
// ════════════════════════════════════════════════════════════════════
static void DrawDashboard(AppState& state) {
    bool busy = state.running.load();

    // Titre page
    if (g_fontH1) ImGui::PushFont(g_fontH1);
    ImGui::TextColored(C_TEXT, "Dashboard");
    if (g_fontH1) ImGui::PopFont();
    if (g_fontSmall) ImGui::PushFont(g_fontSmall);
    ImGui::TextColored(C_DIM, "Vue d'ensemble et actions rapides.");
    if (g_fontSmall) ImGui::PopFont();
    ImGui::Dummy({ 0, 12.f });

    // ── Ligne 1 : 3 stat cards ──────────────────────────────────────
    float cw = (ImGui::GetContentRegionAvail().x - ImGui::GetStyle().ItemSpacing.x * 2) / 3.f;

    auto StatCard = [&](const char* id, const char* label,
                        const char* value, const ImVec4& col) {
        if (BeginCard(id, { cw, 88.f })) {
            // Barre couleur en haut de la card
            {
                ImVec2 cp = ImGui::GetWindowPos();
                float  cw2 = ImGui::GetWindowWidth();
                ImGui::GetWindowDrawList()->AddRectFilledMultiColor(
                    { cp.x + 12.f, cp.y + 1.f }, { cp.x + cw2 - 12.f, cp.y + 3.f },
                    IM_COL32(0,0,0,0),
                    ImGui::ColorConvertFloat4ToU32({col.x,col.y,col.z,0.7f}),
                    ImGui::ColorConvertFloat4ToU32({col.x,col.y,col.z,0.7f}),
                    IM_COL32(0,0,0,0));
            }
            // Label en 13px, valeur en 20px
            if (g_fontSmall) ImGui::PushFont(g_fontSmall);
            ImGui::TextColored(C_DIM, "%s", label);
            if (g_fontSmall) ImGui::PopFont();
            ImGui::Dummy({ 0, 4.f });
            if (g_fontH2) ImGui::PushFont(g_fontH2);
            ImGui::TextColored(col, "%s", value);
            if (g_fontH2) ImGui::PopFont();
        } EndCard();
    };

    char tweakBuf[16];
    snprintf(tweakBuf, sizeof(tweakBuf), "%d tweaks", CountEnabledTweaks());

    StatCard("##s1", "Etat du systeme",   busy ? "EN COURS" : "PRET",          busy ? C_WARN : C_OK);
    ImGui::SameLine();
    StatCard("##s2", "Plan de licence",   state.licInfo.plan.empty() ? "PRO" : state.licInfo.plan.c_str(), C_ACCENT);
    ImGui::SameLine();
    StatCard("##s3", "Modules actifs",    tweakBuf,                             C_VIOLET);

    ImGui::Dummy({ 0, 8.f });

    // ── Ligne 2 : Actions rapides | Informations système ────────────
    float lw = ImGui::GetContentRegionAvail().x * 0.58f;
    float rw = ImGui::GetContentRegionAvail().x - lw - ImGui::GetStyle().ItemSpacing.x;

    // Colonne gauche — Actions rapides
    if (BeginCard("##qa", { lw, 0.f })) {
        if (g_fontH2) ImGui::PushFont(g_fontH2);
        ImGui::TextColored(C_TEXT, "Actions rapides");
        if (g_fontH2) ImGui::PopFont();
        ImGui::TextColored(C_DIM, "Optimise selon les modules actives dans l'onglet Modules.");
        ImGui::Dummy({ 0, 10.f });

        if (GradientBtn("  LANCER L'OPTIMISATION  ", { -1.f, 48.f }, busy))
            Launch(state, "Optimisation globale", tweaks::applyAll);
        ImGui::Dummy({ 0, 6.f });
        if (busy) ImGui::BeginDisabled();
        if (BtnDanger("  Restaurer les parametres Windows  ", { -1.f, 36.f }))
            Launch(state, "Restauration", tweaks::revertAll);
        if (busy) ImGui::EndDisabled();

        ImGui::Dummy({ 0, 8.f });
        if (busy) {
            ImGui::TextColored(C_WARN, "%s %s", Spinner(), state.runTitle.c_str());
        } else if (!state.log.empty()) {
            ImGui::TextColored(C_OK, "●  Derniere operation terminee. Redemarrage recommande.");
        } else {
            ImGui::TextColored(C_DIM, "●  Systeme pret. Aucune operation en cours.");
        }
    } EndCard();

    ImGui::SameLine();

    // Colonne droite — Informations système + licence
    if (BeginCard("##sysinfo", { rw, 0.f })) {
        if (g_fontH2) ImGui::PushFont(g_fontH2);
        ImGui::TextColored(C_TEXT, "Informations");
        if (g_fontH2) ImGui::PopFont();
        ImGui::Dummy({ 0, 6.f });

        auto Row = [](const char* key, const char* val, const ImVec4& vc = C_TEXT) {
            ImGui::TextColored(C_DIM, "%-14s", key); ImGui::SameLine();
            ImGui::TextColored(vc, "%s", val);
        };

        Row("OS",          state.osVer.empty()           ? "—" : state.osVer.c_str());
        std::string hs2 = state.hwid.size() >= 16
            ? (state.hwid.substr(0,8) + "..." + state.hwid.substr(state.hwid.size()-8))
            : state.hwid;
        Row("HWID",        hs2.c_str(),                                          C_SOFT);
        Row("Plan",        state.licInfo.plan.empty() ? "PRO" : state.licInfo.plan.c_str(), C_ACCENT);
        if (state.licInfo.expiresAt.empty())
            Row("Expiration",  "Lifetime",  C_OK);
        else
            Row("Expiration",  state.licInfo.expiresAt.substr(0,10).c_str(),   C_WARN);
        Row("Modules",     tweakBuf,                                              C_VIOLET);

        ImGui::Dummy({ 0, 10.f });
        ImGui::PushStyleColor(ImGuiCol_Separator, C_BORDER);
        ImGui::Separator();
        ImGui::PopStyleColor();
        ImGui::Dummy({ 0, 6.f });
        ImGui::TextColored(C_DIM, "404 Tweaks — v2026.1");
    } EndCard();

    ImGui::Dummy({ 0, 8.f });

    // ── Ligne 3 : Aperçu des modules ────────────────────────────────
    if (BeginCard("##modoverview", { -1.f, 0.f })) {
        if (g_fontH2) ImGui::PushFont(g_fontH2);
        ImGui::TextColored(C_TEXT, "Modules inclus");
        if (g_fontH2) ImGui::PopFont();
        ImGui::TextColored(C_DIM, "Actives dans l'onglet Modules. Cliquez pour configurer.");
        ImGui::Dummy({ 0, 10.f });

        for (int i = 0; i < MODULE_COUNT; ++i) {
            ImGui::SameLine(0, 8.f);
            char buf[64];
            snprintf(buf, sizeof(buf), "%s (%d)", g_modules[i].icon,
                     g_modules[i].tweakCount);
            bool en = *g_modules[i].enabled;
            if (!en) ImGui::PushStyleVar(ImGuiStyleVar_Alpha, 0.4f);
            Badge(buf, en ? g_modules[i].color : C_DIM);
            if (!en) ImGui::PopStyleVar();
            if (i == 0) ImGui::SameLine(0, 8.f); // commence inline après la 1ere
        }
    } EndCard();
}

// ════════════════════════════════════════════════════════════════════
//  PAGE : MODULES
// ════════════════════════════════════════════════════════════════════
static void DrawModules(AppState& state) {
    bool busy = state.running.load();

    // Auto-vérification au premier affichage de l'onglet
    if (!g_checksLoaded && !busy) RunAllChecks();

    if (g_fontH1) ImGui::PushFont(g_fontH1);
    ImGui::TextColored(C_TEXT, "Modules");
    if (g_fontH1) ImGui::PopFont();
    if (g_fontSmall) ImGui::PushFont(g_fontSmall);
    ImGui::TextColored(C_DIM, "Activez ou desactivez chaque composant et appliquez-les individuellement.");
    if (g_fontSmall) ImGui::PopFont();
    ImGui::Dummy({ 0, 10.f });

    // ── Barre d'outils ───────────────────────────────────────────────
    if (BeginCard("##modtoolbar", { -1.f, 0.f })) {
        if (busy) ImGui::BeginDisabled();

        if (GradientBtn("Lancer la selection", { 170.f, 34.f }, false)) {
            Launch(state, "Modules selectionnes", [](AppState& s) {
                GuiLog(s, "== MODULES SELECTIONNES ==", 5);
                if (g_modBackup)  tweaks::applyBackup(s);
                if (g_modWindows) tweaks::applyWindows(s);
                if (g_modGpu)     tweaks::applyGpu(s);
                if (g_modCpu)     tweaks::applyCpu(s);
                if (g_modRam)     tweaks::applyRam(s);
                if (g_modClean)   tweaks::applyCleanup(s);
                if (g_modNetwork) tweaks::applyNetwork(s);
                if (g_modStorage) tweaks::applyStorage(s);
                if (g_modInput)   tweaks::applyInput(s);
                if (g_modPower)   tweaks::applyPower(s);
                GuiLog(s, "== Termine. Redemarrage recommande. ==", 1);
            });
        }

        ImGui::SameLine(0, 10.f);
        if (ImGui::Button("Tout activer", { 120.f, 34.f })) {
            for (int i = 0; i < MODULE_COUNT; ++i) *g_modules[i].enabled = true;
        }
        ImGui::SameLine(0, 6.f);
        if (ImGui::Button("Tout desactiver", { 130.f, 34.f })) {
            for (int i = 0; i < MODULE_COUNT; ++i) *g_modules[i].enabled = false;
        }

        ImGui::SameLine(0, 6.f);
        if (ImGui::Button("Verifier l'etat", { 130.f, 34.f }) && !busy) {
            RunAllChecks();
        }

        ImGui::SameLine(0, 16.f);
        char tweakBuf[48];
        snprintf(tweakBuf, sizeof(tweakBuf), "%d tweaks selectionnes", CountEnabledTweaks());
        ImGui::SetCursorPosY(ImGui::GetCursorPosY() + (34.f - ImGui::GetTextLineHeight()) * 0.5f);
        ImGui::TextColored(C_DIM, "%s", tweakBuf);

        if (busy) ImGui::EndDisabled();
    } EndCard();
    ImGui::Dummy({ 0, 8.f });

    // ── Grille 2 colonnes ────────────────────────────────────────────
    const float CARD_H = 172.f;
    float pad = ImGui::GetStyle().ItemSpacing.x;
    float cardW = (ImGui::GetContentRegionAvail().x - pad) * 0.5f;

    if (busy) ImGui::BeginDisabled();

    for (int i = 0; i < MODULE_COUNT; ++i) {
        if (i % 2 == 1) ImGui::SameLine(0.f, pad);

        ModuleInfo& m = g_modules[i];
        char cardId[32]; snprintf(cardId, sizeof(cardId), "##mc%d", i);

        ImGui::PushStyleColor(ImGuiCol_ChildBg, C_CARD);
        ImGui::PushStyleColor(ImGuiCol_Border,  C_BORDER);
        ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, { 14.f, 12.f });
        ImGui::BeginChild(cardId, { cardW, CARD_H }, ImGuiChildFlags_Borders,
                          ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoScrollWithMouse);

        // ── En-tête : barre couleur gauche + gradient horizontal subtil ──
        {
            ImVec2 p  = ImGui::GetWindowPos();
            ImDrawList* cdl = ImGui::GetWindowDrawList();
            // Barre verticale gauche
            cdl->AddRectFilled(
                { p.x, p.y + 6.f }, { p.x + 3.f, p.y + CARD_H - 6.f },
                ImGui::GetColorU32(m.color), 2.f);
            // Gradient horizontal depuis la barre (glow subtil)
            cdl->AddRectFilledMultiColor(
                { p.x + 3.f, p.y },
                { p.x + cardW * 0.45f, p.y + CARD_H },
                ImGui::ColorConvertFloat4ToU32({m.color.x, m.color.y, m.color.z, 0.06f}),
                IM_COL32(0,0,0,0), IM_COL32(0,0,0,0),
                ImGui::ColorConvertFloat4ToU32({m.color.x, m.color.y, m.color.z, 0.06f}));
        }
        ImGui::SetCursorPosX(ImGui::GetCursorPosX() + 8.f);

        // Titre sur sa propre ligne (largeur limitée pour ne pas déborder sur la checkbox)
        float innerW = ImGui::GetContentRegionAvail().x;
        float checkW = 58.f;  // largeur réservée pour la checkbox + label
        ImGui::PushTextWrapPos(ImGui::GetCursorPosX() + innerW - checkW - 4.f);
        ImGui::TextColored(C_TEXT, "%s", m.title);
        ImGui::PopTextWrapPos();
        float titleEndY = ImGui::GetCursorPosY();

        // Checkbox épinglée en haut à droite de la card
        ImGui::SetCursorPos({ innerW - checkW + 8.f, 10.f });
        ImGui::PushID(i);
        ImGui::PushStyleColor(ImGuiCol_Text, C_DIM);
        ImGui::Checkbox("Actif", m.enabled);
        ImGui::PopStyleColor();
        ImGui::PopID();
        ImGui::SetCursorPosY(titleEndY);

        // Description — police secondaire (13px)
        ImGui::SetCursorPosX(ImGui::GetCursorPosX() + 8.f);
        if (g_fontSmall) ImGui::PushFont(g_fontSmall);
        ImGui::PushTextWrapPos(ImGui::GetCursorPosX() + cardW - 30.f);
        ImGui::TextColored(C_DIM, "%s", m.desc);
        ImGui::PopTextWrapPos();
        if (g_fontSmall) ImGui::PopFont();
        ImGui::Spacing();

        // Badge tweaks count + badge statut vérification
        ImGui::SetCursorPosX(ImGui::GetCursorPosX() + 8.f);
        char badge[32]; snprintf(badge, sizeof(badge), "%d tweaks", m.tweakCount);
        Badge(badge, m.color);

        // Badge statut (sur la même ligne)
        ImGui::SameLine(0, 8.f);
        {
            const tweaks::CheckResult& cr = m.lastCheck;
            char statBuf[24];
            ImVec4 statCol;
            if (!m.checkFn) {
                // non vérifiable
                snprintf(statBuf, sizeof(statBuf), "─");
                statCol = C_DIM;
            } else if (cr.applied < 0) {
                // pas encore vérifié
                snprintf(statBuf, sizeof(statBuf), "?");
                statCol = C_DIM;
            } else if (cr.applied == cr.total) {
                snprintf(statBuf, sizeof(statBuf), "OK %d/%d", cr.applied, cr.total);
                statCol = C_OK;
            } else if (cr.applied > 0) {
                snprintf(statBuf, sizeof(statBuf), "~ %d/%d", cr.applied, cr.total);
                statCol = C_WARN;
            } else {
                snprintf(statBuf, sizeof(statBuf), "X %d/%d", cr.applied, cr.total);
                statCol = C_ERR;
            }
            Badge(statBuf, statCol);
        }

        // ── Bouton épinglé en bas de la carte ──
        {
            float btnH  = 32.f;
            float padB  = 12.f;
            float btnY  = CARD_H - padB - btnH;
            float curY  = ImGui::GetCursorPosY();
            if (curY < btnY) ImGui::SetCursorPosY(btnY);
            ImGui::SetCursorPosX(12.f);
        }

        ImGui::PushID(i + 100);
        if (!(*m.enabled)) ImGui::BeginDisabled();
        char btnLbl[64]; snprintf(btnLbl, sizeof(btnLbl), "Appliquer##%d", i);
        if (BtnAccent(btnLbl, { -12.f, 32.f }))
            Launch(state, m.title, m.fn);
        if (!(*m.enabled)) ImGui::EndDisabled();
        ImGui::PopID();

        ImGui::EndChild();
        ImGui::PopStyleVar();
        ImGui::PopStyleColor(2);
    }

    if (busy) ImGui::EndDisabled();
}

// ════════════════════════════════════════════════════════════════════
//  PAGE : LOGS
// ════════════════════════════════════════════════════════════════════
static void DrawLogs(AppState& state) {
    bool busy = state.running.load();

    if (g_fontH1) ImGui::PushFont(g_fontH1);
    ImGui::TextColored(C_TEXT, "Logs");
    if (g_fontH1) ImGui::PopFont();
    if (g_fontSmall) ImGui::PushFont(g_fontSmall);
    ImGui::TextColored(C_DIM, "Console d'execution en temps reel.");
    if (g_fontSmall) ImGui::PopFont();
    ImGui::Dummy({ 0, 10.f });

    // Barre de statut
    if (BeginCard("##logstatus", { -1.f, 0.f })) {
        if (busy) {
            ImGui::TextColored(C_WARN, "%s", Spinner()); ImGui::SameLine();
            ImGui::TextColored(C_WARN, "Operation en cours :"); ImGui::SameLine();
            ImGui::TextColored(C_TEXT, "%s", state.runTitle.c_str());
        } else if (!state.log.empty()) {
            ImGui::TextColored(C_OK,  "●"); ImGui::SameLine();
            ImGui::TextColored(C_OK,  "Operation terminee."); ImGui::SameLine();
            ImGui::TextColored(C_DIM, "Redemarrage recommande pour appliquer tous les changements.");
        } else {
            ImGui::TextColored(C_DIM, "●"); ImGui::SameLine();
            ImGui::TextColored(C_DIM, "Aucune operation lancee. Utilisez le Dashboard ou les Modules.");
        }

        // Bouton Vider les logs à droite
        float btnW = 130.f;
        float rightX = ImGui::GetContentRegionAvail().x - btnW;
        if (rightX > ImGui::GetCursorPosX()) {
            ImGui::SameLine(0.f, rightX - ImGui::GetCursorPosX() + ImGui::GetStyle().ItemSpacing.x);
        }
        if (ImGui::Button("Vider les logs", { btnW, 0.f })) {
            std::lock_guard<std::mutex> lk(state.logMtx);
            state.log.clear();
        }
    } EndCard();
    ImGui::Dummy({ 0, 6.f });

    // Console scrollable
    ImGui::PushStyleColor(ImGuiCol_ChildBg, { 0.035f, 0.038f, 0.046f, 1.f });
    ImGui::PushStyleColor(ImGuiCol_Border,  C_BORDER);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, { 14.f, 12.f });
    ImGui::BeginChild("##console", { -1.f, -1.f }, ImGuiChildFlags_Borders, 0);

    if (g_fontMono) ImGui::PushFont(g_fontMono);
    {
        std::lock_guard<std::mutex> lk(state.logMtx);
        for (const auto& e : state.log) {
            int t = (e.type >= 0 && e.type < 6) ? e.type : 0;
            if (g_settCompactLogs && e.text.empty()) continue;
            ImGui::TextColored(LOG_COLORS[t], "%s", e.text.c_str());
        }
        if (state.log.empty()) {
            ImGui::TextColored(C_DIM, "// Console vide — lancez une optimisation pour voir les logs.");
        }
    }
    if (g_fontMono) ImGui::PopFont();
    if (g_settAutoScroll && state.scrollLog.exchange(false))
        ImGui::SetScrollHereY(1.0f);

    ImGui::EndChild();
    ImGui::PopStyleVar();
    ImGui::PopStyleColor(2);
}

// ════════════════════════════════════════════════════════════════════
//  PAGE : PARAMÈTRES
// ════════════════════════════════════════════════════════════════════
static void DrawSettings(AppState& state) {
    if (g_fontH1) ImGui::PushFont(g_fontH1);
    ImGui::TextColored(C_TEXT, "Parametres");
    if (g_fontH1) ImGui::PopFont();
    if (g_fontSmall) ImGui::PushFont(g_fontSmall);
    ImGui::TextColored(C_DIM, "Configuration de l'outil.");
    if (g_fontSmall) ImGui::PopFont();
    ImGui::Dummy({ 0, 10.f });

    float cw = (ImGui::GetContentRegionAvail().x - ImGui::GetStyle().ItemSpacing.x) * 0.5f;

    // Colonne gauche : Général + Logs
    if (BeginCard("##setleft", { cw, 0.f })) {
        if (g_fontH2) ImGui::PushFont(g_fontH2);
        ImGui::TextColored(C_TEXT, "Affichage des logs");
        if (g_fontH2) ImGui::PopFont();
        ImGui::Spacing();
        ImGui::Checkbox("Auto-scroll (suivre les nouveaux logs)", &g_settAutoScroll);
        ImGui::Checkbox("Mode compact (masquer les lignes vides)", &g_settCompactLogs);
        ImGui::Dummy({ 0, 16.f });

        ImGui::PushStyleColor(ImGuiCol_Separator, C_BORDER);
        ImGui::Separator();
        ImGui::PopStyleColor();
        ImGui::Dummy({ 0, 10.f });

        if (g_fontH2) ImGui::PushFont(g_fontH2);
        ImGui::TextColored(C_TEXT, "Navigation rapide");
        if (g_fontH2) ImGui::PopFont();
        ImGui::Spacing();
        if (BtnAccent("Aller aux Modules",   { -1.f, 34.f })) g_tab = MainTab::Modules;
        ImGui::Dummy({ 0, 4.f });
        if (BtnAccent("Aller aux Logs",      { -1.f, 34.f })) g_tab = MainTab::Logs;
        ImGui::Dummy({ 0, 4.f });
        if (ImGui::Button("Aller au Dashboard", { -1.f, 34.f }))    g_tab = MainTab::Dashboard;
        ImGui::Dummy({ 0, 12.f });

        if (BtnDanger("Vider les logs", { -1.f, 34.f })) {
            std::lock_guard<std::mutex> lk(state.logMtx);
            state.log.clear();
        }
    } EndCard();

    ImGui::SameLine();

    // Colonne droite : Licence + À propos
    if (BeginCard("##setright", { cw, 0.f })) {
        if (g_fontH2) ImGui::PushFont(g_fontH2);
        ImGui::TextColored(C_TEXT, "Informations de licence");
        if (g_fontH2) ImGui::PopFont();
        ImGui::Spacing();

        auto Row = [](const char* k, const char* v, const ImVec4& c) {
            ImGui::TextColored(C_DIM, "%-16s", k); ImGui::SameLine();
            ImGui::TextColored(c, "%s", v);
        };

        Row("Plan",       state.licInfo.plan.empty() ? "PRO" : state.licInfo.plan.c_str(), C_ACCENT);
        if (state.licInfo.expiresAt.empty())
            Row("Expiration", "Lifetime", C_OK);
        else
            Row("Expiration", state.licInfo.expiresAt.c_str(), C_WARN);

        std::string hsFull = state.hwid;
        Row("HWID",       hsFull.c_str(), C_SOFT);
        Row("OS",         state.osVer.empty() ? "—" : state.osVer.c_str(), C_TEXT);

        ImGui::Dummy({ 0, 16.f });
        ImGui::PushStyleColor(ImGuiCol_Separator, C_BORDER);
        ImGui::Separator();
        ImGui::PopStyleColor();
        ImGui::Dummy({ 0, 10.f });

        if (g_fontH2) ImGui::PushFont(g_fontH2);
        ImGui::TextColored(C_TEXT, "A propos");
        if (g_fontH2) ImGui::PopFont();
        ImGui::Spacing();
        ImGui::TextColored(C_DIM, "404 Tweaks");
        ImGui::TextColored(C_DIM, "Version  2026");
        ImGui::TextColored(C_DIM, "Tweaks   85 optimisations systeme");
        ImGui::TextColored(C_DIM, "Modules  10 categories");
        ImGui::Dummy({ 0, 12.f });

        SepLabel("ATTENTION");
        ImGui::PushTextWrapPos(ImGui::GetCursorPosX() + cw - 40.f);
        ImGui::TextColored(C_WARN,
            "Certains tweaks necessitent un redemarrage. "
            "Utilisez Backup & Securite avant toute optimisation.");
        ImGui::PopTextWrapPos();
    } EndCard();
}

// ════════════════════════════════════════════════════════════════════
//  LAYOUT PRINCIPAL — Sidebar + Contenu
// ════════════════════════════════════════════════════════════════════
static void DrawMainUI(AppState& state) {
    DrawBgDecor();

    const ImGuiIO& io = ImGui::GetIO();
    ImGui::SetNextWindowPos({ 0.f, 0.f }, ImGuiCond_Always);
    ImGui::SetNextWindowSize(io.DisplaySize, ImGuiCond_Always);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, { 0.f, 0.f });
    ImGui::Begin("##root", nullptr,
        ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoResize |
        ImGuiWindowFlags_NoMove     | ImGuiWindowFlags_NoBringToFrontOnFocus);
    ImGui::PopStyleVar();

    // Titlebar custom 40px
    DrawTitleBar(state);

    if (ImGui::BeginTable("##rootlayout", 2,
        ImGuiTableFlags_SizingFixedFit | ImGuiTableFlags_NoPadOuterX)) {
        ImGui::TableSetupColumn("sidebar",  ImGuiTableColumnFlags_WidthFixed, 226.f);
        ImGui::TableSetupColumn("content",  ImGuiTableColumnFlags_WidthStretch);

        ImGui::TableNextColumn();
        DrawSidebar(state);

        ImGui::TableNextColumn();
        ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, { 22.f, 20.f });
        ImGui::BeginChild("##content", { -1.f, -1.f }, false,
                          ImGuiWindowFlags_AlwaysUseWindowPadding);
        ImGui::PopStyleVar();

        switch (g_tab) {
            case MainTab::Dashboard: DrawDashboard(state); break;
            case MainTab::Modules:   DrawModules(state);   break;
            case MainTab::Logs:      DrawLogs(state);      break;
            case MainTab::Settings:  DrawSettings(state);  break;
        }

        ImGui::EndChild();
        ImGui::EndTable();
    }

    // Vérification révocation de licence
    if (state.client && !state.client->isValid()) {
        state.client->stopHeartbeatLoop();
        state.screen     = Screen::LICENSE;
        state.statusMsg  = "[!] Session expiree ou licence revoquee.";
        state.statusType = 2;
    }

    // ── Update notification popup ──────────────────────────────────
    static bool s_wantOpenUpdate = false;
    if (state.updateAvailable.exchange(false)) {
        s_wantOpenUpdate = true;
    }
    if (s_wantOpenUpdate && !state.updateDismissed) {
        ImGui::OpenPopup("Mise a jour disponible##upd");
        s_wantOpenUpdate = false;
    }

    ImVec2 center = ImGui::GetMainViewport()->GetCenter();
    ImGui::SetNextWindowPos(center, ImGuiCond_Always, { 0.5f, 0.5f });
    ImGui::SetNextWindowSize({ 520.f, 0.f }, ImGuiCond_Always);
    ImGui::PushStyleColor(ImGuiCol_PopupBg, C_CARD);
    if (ImGui::BeginPopupModal("Mise a jour disponible##upd", nullptr,
        ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoMove)) {

        // ── Titre ──
        ImGui::PushFont(g_fontH2);
        ImGui::TextColored(C_ACCENT, "  Mise a jour disponible !");
        ImGui::PopFont();
        ImGui::Spacing();
        ImGui::Separator();
        ImGui::Spacing();

        // ── Versions ──
        ImGui::PushFont(g_fontMain);
        ImGui::TextColored(C_DIM, "Version actuelle :"); ImGui::SameLine();
        ImGui::TextColored(C_TEXT, " %s", updater::CURRENT_VERSION);
        ImGui::TextColored(C_DIM, "Nouvelle version :"); ImGui::SameLine();
        ImGui::TextColored(C_OK,  " %s", state.updateVersion.c_str());
        ImGui::PopFont();

        ImGui::Spacing();

        // ── Changelog ──
        ImGui::PushFont(g_fontSmall);
        ImGui::TextColored(C_DIM, "CHANGELOG");
        ImGui::Spacing();
        ImGui::PushStyleColor(ImGuiCol_ChildBg, C_CARD2);
        ImGui::BeginChild("##upd_changelog", { 0.f, 120.f }, true);
        ImGui::PushFont(g_fontMono);
        ImGui::TextWrapped("%s", state.updateChangelog.c_str());
        ImGui::PopFont();
        ImGui::EndChild();
        ImGui::PopStyleColor();
        ImGui::PopFont();

        ImGui::Spacing();
        ImGui::Separator();
        ImGui::Spacing();

        // ── Boutons ──
        const float btnW = 190.f;
        const float totalW = btnW * 2.f + 12.f;
        ImGui::SetCursorPosX((ImGui::GetContentRegionAvail().x - totalW) * 0.5f + ImGui::GetCursorPosX());

        ImGui::PushStyleColor(ImGuiCol_Button,        { 0.02f, 0.52f, 0.80f, 1.f });
        ImGui::PushStyleColor(ImGuiCol_ButtonHovered, { 0.04f, 0.68f, 1.00f, 1.f });
        ImGui::PushStyleColor(ImGuiCol_ButtonActive,  { 0.01f, 0.40f, 0.64f, 1.f });
        if (ImGui::Button("Telecharger la mise a jour", { btnW, 40.f })) {
            std::wstring wUrl(state.updateUrl.begin(), state.updateUrl.end());
            ShellExecuteW(nullptr, L"open", wUrl.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
            state.updateDismissed = true;
            ImGui::CloseCurrentPopup();
        }
        ImGui::PopStyleColor(3);

        ImGui::SameLine(0.f, 12.f);
        if (ImGui::Button("Plus tard", { btnW, 40.f })) {
            state.updateDismissed = true;
            ImGui::CloseCurrentPopup();
        }

        ImGui::Spacing();
        ImGui::EndPopup();
    }
    ImGui::PopStyleColor(); // PopupBg

    ImGui::End();
}

// ════════════════════════════════════════════════════════════════════
//  POINT D'ENTRÉE — Appelé chaque frame depuis main.cpp
// ════════════════════════════════════════════════════════════════════
void GuiDraw(AppState& state) {
    switch (state.screen) {
        case Screen::LICENSE: DrawLicenseScreen(state); break;
        case Screen::MAIN:    DrawMainUI(state);        break;
    }
    ImGui::Render();
}