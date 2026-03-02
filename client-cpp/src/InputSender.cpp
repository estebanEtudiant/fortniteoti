// ══════════════════════════════════════════════════════
//  InputSender.cpp — Interception driver + SendInput fallback
// ══════════════════════════════════════════════════════
#include "InputSender.h"

#ifdef _WIN32
#  ifndef WIN32_LEAN_AND_MEAN
#    define WIN32_LEAN_AND_MEAN
#  endif
#  include <windows.h>
#endif

#include <cassert>

// ── Singleton ─────────────────────────────────────────────────────────────────
InputSender& InputSender::instance() {
    static InputSender s;
    return s;
}

// ── init() ────────────────────────────────────────────────────────────────────
bool InputSender::init() {
#ifndef _WIN32
    return false;
#else
    if (m_active.load()) return true;   // already initialised

    // 1. Try to load interception.dll from the same directory as the exe
    //    (the installer places it there), then fallback to system PATH.
    m_dll = LoadLibraryA("interception.dll");
    if (!m_dll) return false;           // driver not installed → SendInput mode

    // 2. Resolve the three function pointers we need
    // MinGW warns about casting FARPROC → typed ptr; this is unavoidable with
    // GetProcAddress — suppress the warning locally.
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wcast-function-type"
    m_fnCreate  = reinterpret_cast<PFN_create_context> (GetProcAddress(m_dll, "interception_create_context"));
    m_fnDestroy = reinterpret_cast<PFN_destroy_context>(GetProcAddress(m_dll, "interception_destroy_context"));
    m_fnSend    = reinterpret_cast<PFN_send>           (GetProcAddress(m_dll, "interception_send"));
#pragma GCC diagnostic pop

    if (!m_fnCreate || !m_fnDestroy || !m_fnSend) {
        FreeLibrary(m_dll);
        m_dll = nullptr;
        return false;
    }

    // 3. Create the driver context
    m_ctx = m_fnCreate();
    if (!m_ctx) {
        FreeLibrary(m_dll);
        m_dll = nullptr;
        return false;
    }

    m_active.store(true);
    return true;
#endif
}

// ── shutdown() ────────────────────────────────────────────────────────────────
void InputSender::shutdown() {
#ifdef _WIN32
    if (m_ctx && m_fnDestroy) {
        m_fnDestroy(m_ctx);
        m_ctx = nullptr;
    }
    if (m_dll) {
        FreeLibrary(m_dll);
        m_dll = nullptr;
    }
    m_active.store(false);
#endif
}

// ── send() ────────────────────────────────────────────────────────────────────
void InputSender::send(int vk, bool down) {
#ifdef _WIN32
    if (vk <= 0) return;
    if (m_active.load())
        sendViaInterception(vk, down);
    else
        sendViaSendInput(vk, down);
#else
    (void)vk; (void)down;
#endif
}

// ── statusString() ────────────────────────────────────────────────────────────
std::string InputSender::statusString() const {
    return m_active.load()
        ? "Interception driver actif — inputs indétectables"
        : "Mode SendInput (driver non installé)";
}

// ══════════════════════════════════════════════════════
//  Interception path
// ══════════════════════════════════════════════════════
void InputSender::sendViaInterception(int vk, bool down) {
#ifdef _WIN32
    if (!m_fnSend || !m_ctx) return;

    if (isMouseVK(vk)) {
        // ── Mouse button via Interception ─────────────
        InterceptionMouseStroke ms = {};
        switch (vk) {
            case 0x01: ms.state = down ? INTERCEPTION_MOUSE_LEFT_BUTTON_DOWN   : INTERCEPTION_MOUSE_LEFT_BUTTON_UP;   break;
            case 0x02: ms.state = down ? INTERCEPTION_MOUSE_RIGHT_BUTTON_DOWN  : INTERCEPTION_MOUSE_RIGHT_BUTTON_UP;  break;
            case 0x04: ms.state = down ? INTERCEPTION_MOUSE_MIDDLE_BUTTON_DOWN : INTERCEPTION_MOUSE_MIDDLE_BUTTON_UP; break;
            case 0x05: ms.state = down ? INTERCEPTION_MOUSE_BUTTON_4_DOWN      : INTERCEPTION_MOUSE_BUTTON_4_UP;      break;
            case 0x06: ms.state = down ? INTERCEPTION_MOUSE_BUTTON_5_DOWN      : INTERCEPTION_MOUSE_BUTTON_5_UP;      break;
            default:   return;
        }
        InterceptionStroke stroke;
        stroke.mouse = ms;
        m_fnSend(m_ctx, m_mouse, &stroke, 1);
    } else {
        // ── Keyboard key via Interception ─────────────
        bool needE0 = false;
        uint16_t sc = vkToScanCode(vk, needE0);
        if (sc == 0) return;   // unmappable

        InterceptionKeyStroke ks = {};
        ks.code  = sc;
        ks.state = down ? INTERCEPTION_KEY_DOWN : INTERCEPTION_KEY_UP;
        if (needE0) ks.state |= INTERCEPTION_KEY_E0;

        InterceptionStroke stroke;
        stroke.key = ks;
        m_fnSend(m_ctx, m_kbd, &stroke, 1);
    }
#else
    (void)vk; (void)down;
#endif
}

// ══════════════════════════════════════════════════════
//  SendInput fallback (same logic as the original MacroEngine)
// ══════════════════════════════════════════════════════
void InputSender::sendViaSendInput(int vk, bool down) {
#ifdef _WIN32
    INPUT inp = {};
    switch (vk) {
        case 0x01: inp.type=INPUT_MOUSE; inp.mi.dwFlags=down?MOUSEEVENTF_LEFTDOWN  :MOUSEEVENTF_LEFTUP;   break;
        case 0x02: inp.type=INPUT_MOUSE; inp.mi.dwFlags=down?MOUSEEVENTF_RIGHTDOWN :MOUSEEVENTF_RIGHTUP;  break;
        case 0x04: inp.type=INPUT_MOUSE; inp.mi.dwFlags=down?MOUSEEVENTF_MIDDLEDOWN:MOUSEEVENTF_MIDDLEUP; break;
        case 0x05:
        case 0x06:
            inp.type = INPUT_MOUSE;
            inp.mi.dwFlags   = down ? MOUSEEVENTF_XDOWN : MOUSEEVENTF_XUP;
            inp.mi.mouseData = (vk == 0x05) ? XBUTTON1 : XBUTTON2;
            break;
        default:
            inp.type      = INPUT_KEYBOARD;
            inp.ki.wVk    = static_cast<WORD>(vk);
            if (!down) inp.ki.dwFlags = KEYEVENTF_KEYUP;
            break;
    }
    SendInput(1, &inp, sizeof(INPUT));
#else
    (void)vk; (void)down;
#endif
}

// ══════════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════════
bool InputSender::isMouseVK(int vk) {
    return vk == 0x01 || vk == 0x02 || vk == 0x04 || vk == 0x05 || vk == 0x06;
}

uint16_t InputSender::vkToScanCode(int vk, bool& needE0) {
#ifdef _WIN32
    needE0 = false;

    // Extended keys that need the E0 prefix in scan-code space
    static const int extendedVKs[] = {
        VK_RCONTROL, VK_RMENU, VK_INSERT, VK_DELETE,
        VK_HOME, VK_END, VK_PRIOR, VK_NEXT,
        VK_LEFT, VK_RIGHT, VK_UP, VK_DOWN,
        VK_NUMLOCK, VK_DIVIDE, VK_RSHIFT,
        VK_LWIN, VK_RWIN, VK_APPS,
        VK_SNAPSHOT, VK_CANCEL
    };
    for (int ev : extendedVKs) {
        if (vk == ev) { needE0 = true; break; }
    }

    UINT sc = MapVirtualKeyW(static_cast<UINT>(vk), MAPVK_VK_TO_VSC);
    return static_cast<uint16_t>(sc);
#else
    (void)vk; needE0 = false; return 0;
#endif
}
