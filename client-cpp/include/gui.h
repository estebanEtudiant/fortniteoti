// ══════════════════════════════════════════════════════
//  gui.h — Application state + GUI API
// ══════════════════════════════════════════════════════
#pragma once

#define _WIN32_WINNT 0x0601
#define NOMINMAX
#include <windows.h>
#include <d3d11.h>
#include <string>
#include <vector>
#include <mutex>
#include <atomic>

#include "licensing.h"

// ── App screens ──
enum class Screen { LICENSE, MAIN };

// ── Log entry ──
struct LogEntry {
    std::string text;
    int         type; // 0=white 1=green 2=red 3=yellow 4=cyan 5=magenta
};

// ── Application state (shared between GUI and background threads) ──
struct AppState {
    Screen screen = Screen::LICENSE;

    // License input
    char        keyBuf[32]  = {};
    std::string statusMsg;
    int         statusType  = 0;   // maps to LOG_COLORS
    bool        checking    = false;

    // License info (post-activation)
    licensing::LicenseInfo licInfo;
    std::string hwid;
    std::string osVer;

    // Optimizer log (written from background thread, read from render thread)
    std::vector<LogEntry>  log;
    std::mutex             logMtx;
    std::atomic<bool>      running{false};
    std::string            runTitle;
    std::atomic<bool>      scrollLog{false};

    // BIOS panel toggle
    bool showBios = false;

    // License client (owned by main)
    licensing::LicenseClient* client = nullptr;
};

// ── GUI API ──
bool GuiInit      (HWND hwnd, ID3D11Device* dev, ID3D11DeviceContext* ctx);
void GuiBeginFrame();
void GuiDraw      (AppState& state);   // builds draw lists + calls ImGui::Render()
void GuiPresent   ();                  // calls ImGui_ImplDX11_RenderDrawData
void GuiShutdown  ();
void GuiWndProc   (HWND hwnd, UINT msg, WPARAM wp, LPARAM lp);
void GuiLog       (AppState& state, const std::string& text, int type = 0);