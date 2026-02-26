// ══════════════════════════════════════════════════════
//  gui.h — Application state (shared with tweaks.cpp)
//  Stripped of Win32/ImGui/DX11: pure C++ POD state.
// ══════════════════════════════════════════════════════
#pragma once

#include <string>
#include <vector>
#include <mutex>
#include <atomic>
#include <functional>

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
    int         statusType  = 0;
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

    // License client (owned by AppController)
    licensing::LicenseClient* client = nullptr;

    // API base URL
    std::string apiUrl;

    // Update notification (set by background thread)
    std::atomic<bool> updateAvailable{false};
    bool              updateDismissed = false;
    std::string       updateVersion;
    std::string       updateUrl;
    std::string       updateChangelog;

    // Real-time log callback (set by AppController, called by GuiLog from any thread).
    // Qt's queued signal/slot mechanism makes cross-thread emission safe.
    std::function<void(const std::string&, int)> logCallback;
};

// Used by tweaks.cpp to append log entries
void GuiLog(AppState& state, const std::string& text, int type = 0);
