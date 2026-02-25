// ══════════════════════════════════════════════════════════════════════
//  FortniteOptimizer 2026 — main.cpp
//  Entry point: Win32 + DX11 window + Dear ImGui render loop
// ══════════════════════════════════════════════════════════════════════
#define _WIN32_WINNT 0x0A00   // Windows 10 minimum (DPI V2 + tweaks modernes)
#define NOMINMAX
#include <windows.h>
#include <windowsx.h>
#include <shellapi.h>
#include <d3d11.h>
#include <dxgi.h>
#include <dwmapi.h>
#include <string>
#include <thread>

#include "licensing.h"
#include "hwid.h"
#include "anti_debug.h"
#include "gui.h"
#include "updater.h"

// ── API URL ──

//static const std::string API_URL = "http://localhost:3000";

static const std::string API_URL = "http://57.128.255.1:3000";

// ── Window dimensions (used by WM_NCHITTEST for borderless drag) ──
static int W = 1100;
static int H = 680;

// ── DX11 globals ──
static ID3D11Device*           g_pd3dDevice          = nullptr;
static ID3D11DeviceContext*    g_pd3dDeviceContext    = nullptr;
static IDXGISwapChain*         g_pSwapChain           = nullptr;
static ID3D11RenderTargetView* g_mainRenderTargetView = nullptr;
static UINT                    g_ResizeWidth          = 0;
static UINT                    g_ResizeHeight         = 0;

// ── DX11 helpers ──
static void CreateRenderTarget() {
    ID3D11Texture2D* pBackBuffer = nullptr;
    g_pSwapChain->GetBuffer(0, IID_PPV_ARGS(&pBackBuffer));
    if (pBackBuffer) {
        g_pd3dDevice->CreateRenderTargetView(pBackBuffer, nullptr, &g_mainRenderTargetView);
        pBackBuffer->Release();
    }
}

static void CleanupRenderTarget() {
    if (g_mainRenderTargetView) {
        g_mainRenderTargetView->Release();
        g_mainRenderTargetView = nullptr;
    }
}

static bool CreateDeviceD3D(HWND hwnd) {
    DXGI_SWAP_CHAIN_DESC sd             = {};
    sd.BufferCount                        = 2;
    sd.BufferDesc.Width                   = 0;
    sd.BufferDesc.Height                  = 0;
    sd.BufferDesc.Format                  = DXGI_FORMAT_R8G8B8A8_UNORM;
    sd.BufferDesc.RefreshRate.Numerator   = 60;
    sd.BufferDesc.RefreshRate.Denominator = 1;
    sd.Flags                              = DXGI_SWAP_CHAIN_FLAG_ALLOW_MODE_SWITCH;
    sd.BufferUsage                        = DXGI_USAGE_RENDER_TARGET_OUTPUT;
    sd.OutputWindow                       = hwnd;
    sd.SampleDesc.Count                   = 1;
    sd.SampleDesc.Quality                 = 0;
    sd.Windowed                           = TRUE;
    sd.SwapEffect                         = DXGI_SWAP_EFFECT_DISCARD;

    D3D_FEATURE_LEVEL featureLevel;
    const D3D_FEATURE_LEVEL featureLevelArray[2] = {
        D3D_FEATURE_LEVEL_11_0,
        D3D_FEATURE_LEVEL_10_0,
    };

    HRESULT res = D3D11CreateDeviceAndSwapChain(
        nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr,
        0, featureLevelArray, 2,
        D3D11_SDK_VERSION, &sd, &g_pSwapChain,
        &g_pd3dDevice, &featureLevel, &g_pd3dDeviceContext);

    if (res == DXGI_ERROR_UNSUPPORTED) { // HW unavailable → WARP software fallback
        res = D3D11CreateDeviceAndSwapChain(
            nullptr, D3D_DRIVER_TYPE_WARP, nullptr,
            0, featureLevelArray, 2,
            D3D11_SDK_VERSION, &sd, &g_pSwapChain,
            &g_pd3dDevice, &featureLevel, &g_pd3dDeviceContext);
    }

    if (FAILED(res)) return false;
    CreateRenderTarget();
    return true;
}

static void CleanupDeviceD3D() {
    CleanupRenderTarget();
    if (g_pSwapChain)        { g_pSwapChain->Release();        g_pSwapChain        = nullptr; }
    if (g_pd3dDeviceContext) { g_pd3dDeviceContext->Release(); g_pd3dDeviceContext = nullptr; }
    if (g_pd3dDevice)        { g_pd3dDevice->Release();        g_pd3dDevice        = nullptr; }
}

// ── Win32 WndProc ──
static LRESULT WINAPI WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    GuiWndProc(hwnd, msg, wParam, lParam);
    switch (msg) {
        case WM_SIZE:
            if (wParam != SIZE_MINIMIZED) {
                g_ResizeWidth  = LOWORD(lParam);
                g_ResizeHeight = HIWORD(lParam);
            }
            return 0;
        case WM_SYSCOMMAND:
            if ((wParam & 0xfff0) == SC_KEYMENU) return 0; // suppress Alt menu bar
            break;
        case WM_DESTROY:
            PostQuitMessage(0);
            return 0;
        case WM_NCHITTEST: {
            // Allow native drag on the custom titlebar area (top 40px)
            // Exclude the right 88px (minimize + close ImGui buttons)
            LRESULT hit = DefWindowProcW(hwnd, msg, wParam, lParam);
            if (hit == HTCLIENT) {
                POINT pt = { GET_X_LPARAM(lParam), GET_Y_LPARAM(lParam) };
                ScreenToClient(hwnd, &pt);
                if (pt.y < 40) {
                    if (pt.x > W - 44) return HTCLIENT;  // close button zone
                    if (pt.x > W - 88) return HTCLIENT;  // minimize button zone
                    return HTCAPTION;                     // drag zone
                }
            }
            return hit;
        }
    }
    return DefWindowProcW(hwnd, msg, wParam, lParam);
}

// ── Admin rights helpers ──
static bool isRunAsAdmin() {
    BOOL isAdmin = FALSE;
    PSID adminGroup = nullptr;
    SID_IDENTIFIER_AUTHORITY ntAuthority = SECURITY_NT_AUTHORITY;
    if (AllocateAndInitializeSid(
            &ntAuthority, 2,
            SECURITY_BUILTIN_DOMAIN_RID, DOMAIN_ALIAS_RID_ADMINS,
            0, 0, 0, 0, 0, 0, &adminGroup)) {
        CheckTokenMembership(nullptr, adminGroup, &isAdmin);
        FreeSid(adminGroup);
    }
    return isAdmin == TRUE;
}

static bool relaunchAsAdmin() {
    wchar_t exePath[MAX_PATH] = {};
    GetModuleFileNameW(nullptr, exePath, MAX_PATH);
    SHELLEXECUTEINFOW sei = {};
    sei.cbSize = sizeof(sei);
    sei.lpVerb = L"runas";
    sei.lpFile = exePath;
    sei.nShow  = SW_NORMAL;
    sei.fMask  = SEE_MASK_NOCLOSEPROCESS;
    return ShellExecuteExW(&sei) == TRUE;
}

// ══════════════════════════════════════════════════════════════════════
//  main
// ══════════════════════════════════════════════════════════════════════
int main() {
    // ── DPI Awareness — doit être la toute première chose appelée ──
    // Per-Monitor V2 : rendu natif à la résolution physique, pas de bitmap scaling
    SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);

    // ── Admin check — must be first ──
    if (!isRunAsAdmin()) {
        if (relaunchAsAdmin()) return 0; // UAC accepted, elevated process takes over
        MessageBoxW(nullptr,
            L"Droits administrateur requis.\n"
            L"Clic droit sur le .exe > \"Executer en tant qu'administrateur\".",
            L"FortniteOptimizer 2026", MB_ICONERROR | MB_OK);
        return 1;
    }

    // ── Anti-debug check ──
    if (!antidebug::checkIntegrity()) {
        MessageBoxW(nullptr,
            L"Environnement non securise detecte.\n"
            L"Fermez les outils de debugging et relancez.",
            L"FortniteOptimizer 2026 — Securite", MB_ICONERROR | MB_OK);
        return 1;
    }

    // ── Register window class ──
    WNDCLASSEXW wc   = {};
    wc.cbSize        = sizeof(wc);
    wc.style         = CS_CLASSDC;
    wc.lpfnWndProc   = WndProc;
    wc.hInstance     = GetModuleHandleW(nullptr);
    wc.hCursor       = LoadCursorW(nullptr, IDC_ARROW);
    wc.lpszClassName = L"FTNOptiWnd";
    RegisterClassExW(&wc);

    // ── Create window (1100×680, centered on primary monitor, borderless) ──
    HWND hwnd = CreateWindowExW(
        WS_EX_APPWINDOW,
        L"FTNOptiWnd", L"FortniteOptimizer 2026",
        WS_POPUP | WS_VISIBLE,
        (GetSystemMetrics(SM_CXSCREEN) - W) / 2,
        (GetSystemMetrics(SM_CYSCREEN) - H) / 2,
        W, H,
        nullptr, nullptr, wc.hInstance, nullptr);

    if (!hwnd || !CreateDeviceD3D(hwnd)) {
        CleanupDeviceD3D();
        UnregisterClassW(wc.lpszClassName, wc.hInstance);
        return 1;
    }

    ShowWindow(hwnd, SW_SHOWDEFAULT);
    UpdateWindow(hwnd);

    // ── DWM shadow — gives the borderless window a native drop-shadow ──
    MARGINS margins = { 1, 1, 1, 1 };
    DwmExtendFrameIntoClientArea(hwnd, &margins);

    // ── Initialize ImGui ──
    if (!GuiInit(hwnd, g_pd3dDevice, g_pd3dDeviceContext)) {
        CleanupDeviceD3D();
        UnregisterClassW(wc.lpszClassName, wc.hInstance);
        return 1;
    }

    // ── Build AppState ──
    AppState state;
    state.hwid   = hwid::generate();
    state.osVer  = hwid::getOsVersion();
    state.apiUrl = API_URL;
    state.hwnd   = hwnd;

    licensing::LicenseClient licClient(API_URL);
    state.client = &licClient;

    // ── Restore saved session if available ──
    // If tokens exist on disk, verify with server on a background thread.
    if (licClient.isValid()) {
        state.statusMsg  = "Verification de la licence en cours...";
        state.statusType = 3;
        std::thread([&state, &licClient]() {
            auto status = licClient.heartbeat();
            if (status == licensing::Status::VALID) {
                state.licInfo = licClient.getInfo();
                state.statusMsg = "";
                licClient.startHeartbeatLoop(300);
                state.screen = Screen::MAIN;
                // Check for update after session restore
                updater::UpdateChecker upd(API_URL);
                auto upInfo = upd.check();
                if (upInfo.available) {
                    state.updateVersion   = upInfo.latestVersion;
                    state.updateUrl       = upInfo.downloadUrl;
                    state.updateChangelog = upInfo.changelog;
                    state.updateAvailable.store(true);
                }
            } else {
                state.statusMsg  = (status == licensing::Status::NETWORK_ERROR)
                    ? "[X] Serveur inaccessible. Connexion internet requise."
                    : "[X] Session expiree. Entrez votre cle de licence.";
                state.statusType = 2;
            }
        }).detach();
    }

    // ── Render loop ──
    const float CLEAR_COLOR[4] = { 0.06f, 0.06f, 0.06f, 1.0f };
    bool done = false;

    while (!done) {
        MSG msg;
        while (PeekMessageW(&msg, nullptr, 0U, 0U, PM_REMOVE)) {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
            if (msg.message == WM_QUIT) done = true;
        }
        if (done) break;

        // Handle window resize
        if (g_ResizeWidth != 0 && g_ResizeHeight != 0) {
            CleanupRenderTarget();
            g_pSwapChain->ResizeBuffers(0, g_ResizeWidth, g_ResizeHeight,
                                        DXGI_FORMAT_UNKNOWN, 0);
            g_ResizeWidth = g_ResizeHeight = 0;
            CreateRenderTarget();
        }

        // Handle titlebar button flags from ImGui
        if (state.wantClose)    { done = true; state.wantClose = false; }
        if (state.wantMinimize) { ShowWindow(hwnd, SW_MINIMIZE); state.wantMinimize = false; }

        // Build and render ImGui frame
        GuiBeginFrame();
        GuiDraw(state);

        g_pd3dDeviceContext->OMSetRenderTargets(1, &g_mainRenderTargetView, nullptr);
        g_pd3dDeviceContext->ClearRenderTargetView(g_mainRenderTargetView, CLEAR_COLOR);
        GuiPresent();
        g_pSwapChain->Present(1, 0); // vsync on
    }

    // ── Cleanup ──
    licClient.stopHeartbeatLoop();
    GuiShutdown();
    CleanupDeviceD3D();
    DestroyWindow(hwnd);
    UnregisterClassW(wc.lpszClassName, wc.hInstance);
    return 0;
}