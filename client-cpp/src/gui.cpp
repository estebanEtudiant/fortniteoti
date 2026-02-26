// ══════════════════════════════════════════════════════
//  gui.cpp — GuiLog stub (called by tweaks.cpp)
//  ImGui removed. Logging is routed via Qt signals
//  through AppState::logCallback set by AppController.
// ══════════════════════════════════════════════════════
#include "gui.h"

void GuiLog(AppState& state, const std::string& text, int type) {
    // Fire real-time callback → AppController emits Qt signal (thread-safe queued)
    if (state.logCallback) {
        state.logCallback(text, type);
    }
    // Persist in vector for history access
    std::lock_guard<std::mutex> lk(state.logMtx);
    state.log.push_back({ text, type });
    state.scrollLog = true;
}
