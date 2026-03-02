// ══════════════════════════════════════════════════════
//  InputSender.h — Abstraction layer: Interception ▶ SendInput fallback
//
//  Priority:
//    1. Interception kernel driver (interception.dll loaded dynamically)
//       → inputs appear as real hardware, no LLHF_INJECTED flag
//    2. Win32 SendInput fallback (if driver not installed)
//
//  Usage:
//    InputSender::instance().send(vk, down);
//    InputSender::instance().isDriverActive();  // true = Interception loaded
// ══════════════════════════════════════════════════════
#pragma once
#ifdef _WIN32
#  ifndef WIN32_LEAN_AND_MEAN
#    define WIN32_LEAN_AND_MEAN
#  endif
#  include <windows.h>
#endif
#include "interception.h"
#include <string>
#include <atomic>

class InputSender {
public:
    // Singleton — thread-safe after init() call (call once, before pollLoop)
    static InputSender& instance();

    // Load interception.dll and open context.
    // Returns true if driver is active, false → fallback mode.
    bool init();

    // Release driver context and unload DLL.
    void shutdown();

    // Send a virtual key press/release.
    //   vk   — Windows Virtual Key code (same codes used elsewhere)
    //   down — true = key/button down, false = up
    void send(int vk, bool down);

    // Returns true when Interception driver is loaded and ready.
    bool isDriverActive() const { return m_active.load(); }

    // Human-readable status string for UI display.
    std::string statusString() const;

private:
    InputSender()  = default;
    ~InputSender() { shutdown(); }
    InputSender(const InputSender&) = delete;
    InputSender& operator=(const InputSender&) = delete;

    // ── Interception state ─────────────────────────────
    HMODULE              m_dll     = nullptr;
    InterceptionContext  m_ctx     = nullptr;
    InterceptionDevice   m_kbd     = 1;    // first keyboard slot
    InterceptionDevice   m_mouse   = 11;   // first mouse slot
    std::atomic<bool>    m_active  { false };

    // ── DLL function pointers ──────────────────────────
    PFN_create_context   m_fnCreate  = nullptr;
    PFN_destroy_context  m_fnDestroy = nullptr;
    PFN_send             m_fnSend    = nullptr;

    // ── Helpers ───────────────────────────────────────
    void sendViaInterception(int vk, bool down);
    void sendViaSendInput   (int vk, bool down);

    // Map a Windows VK to an Interception keyboard scan-code + E0 flag
    static uint16_t vkToScanCode(int vk, bool& needE0);

    // Returns true for VKs that map to mouse buttons
    static bool isMouseVK(int vk);
};
