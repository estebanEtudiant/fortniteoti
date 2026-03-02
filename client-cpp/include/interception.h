// ══════════════════════════════════════════════════════
//  interception.h — Minimal Interception API
//  Based on github.com/oblitum/Interception (MIT license)
//  Only the send-side API needed for macro injection.
// ══════════════════════════════════════════════════════
#pragma once
#include <cstdint>

// ── Device numbering ──────────────────────────────────
// Keyboards : 1  – 10
// Mice      : 11 – 20
#define INTERCEPTION_MAX_KEYBOARD  10
#define INTERCEPTION_MAX_MOUSE     10
#define INTERCEPTION_MAX_DEVICE   (INTERCEPTION_MAX_KEYBOARD + INTERCEPTION_MAX_MOUSE)

typedef int   InterceptionDevice;
typedef void* InterceptionContext;

// ── Mouse state flags ─────────────────────────────────
enum InterceptionMouseState : uint16_t {
    INTERCEPTION_MOUSE_LEFT_BUTTON_DOWN   = 0x001,
    INTERCEPTION_MOUSE_LEFT_BUTTON_UP     = 0x002,
    INTERCEPTION_MOUSE_RIGHT_BUTTON_DOWN  = 0x004,
    INTERCEPTION_MOUSE_RIGHT_BUTTON_UP    = 0x008,
    INTERCEPTION_MOUSE_MIDDLE_BUTTON_DOWN = 0x010,
    INTERCEPTION_MOUSE_MIDDLE_BUTTON_UP   = 0x020,
    INTERCEPTION_MOUSE_BUTTON_4_DOWN      = 0x040,
    INTERCEPTION_MOUSE_BUTTON_4_UP        = 0x080,
    INTERCEPTION_MOUSE_BUTTON_5_DOWN      = 0x100,
    INTERCEPTION_MOUSE_BUTTON_5_UP        = 0x200,
};

// ── Key state flags ───────────────────────────────────
enum InterceptionKeyState : uint16_t {
    INTERCEPTION_KEY_DOWN = 0x00,
    INTERCEPTION_KEY_UP   = 0x01,
    INTERCEPTION_KEY_E0   = 0x02,   // extended key prefix
    INTERCEPTION_KEY_E1   = 0x04,
};

// ── Stroke structs ────────────────────────────────────
struct InterceptionMouseStroke {
    uint16_t state;        // InterceptionMouseState flags
    uint16_t flags;        // move flags (0 = relative)
    int16_t  rolling;      // wheel delta
    int32_t  x, y;
    uint32_t information;
};

struct InterceptionKeyStroke {
    uint16_t code;         // hardware scan code
    uint16_t state;        // InterceptionKeyState flags
    uint32_t information;
};

union InterceptionStroke {
    InterceptionKeyStroke   key;
    InterceptionMouseStroke mouse;
};

// ── Function pointer typedefs (for dynamic loading) ───
typedef InterceptionContext (*PFN_create_context)  ();
typedef void                (*PFN_destroy_context) (InterceptionContext);
typedef int                 (*PFN_send)            (InterceptionContext,
                                                    InterceptionDevice,
                                                    const InterceptionStroke*,
                                                    unsigned int nstroke);
