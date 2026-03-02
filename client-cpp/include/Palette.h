// ══════════════════════════════════════════════════════
//  Palette.h — Dark sober theme (Linear/Vercel inspired)
// ══════════════════════════════════════════════════════
#pragma once
#include <QColor>

namespace Pal {
    // ── Backgrounds ──────────────────────────────────
    inline const QColor BG       { 0x0F, 0x0F, 0x11 };   // app bg
    inline const QColor SIDEBAR  { 0x0C, 0x0C, 0x0E };   // sidebar
    inline const QColor CARD     { 0x18, 0x18, 0x1B };   // cards (zinc-900)
    inline const QColor CARD2    { 0x22, 0x22, 0x27 };   // secondary cards
    inline const QColor FRAME    { 0x28, 0x28, 0x2D };   // inputs / frames
    inline const QColor BORDER   { 0x33, 0x33, 0x3C };   // visible borders
    inline const QColor TITLEBAR { 0x0C, 0x0C, 0x0E };   // title bar

    // ── Accent ───────────────────────────────────────
    inline const QColor ACCENT   { 0x00, 0xD1, 0xFF };   // brand cyan
    inline const QColor ACCENT_H { 0x33, 0xDB, 0xFF };   // cyan hover
    inline const QColor ACCENT_A { 0x00, 0xA3, 0xCC };   // cyan pressed
    inline const QColor VIOLET   { 0x7C, 0x3A, 0xED };   // secondary accent

    // ── Text ─────────────────────────────────────────
    inline const QColor TEXT     { 0xF4, 0xF4, 0xF5 };   // zinc-100
    inline const QColor DIM      { 0x71, 0x71, 0x7A };   // zinc-500 (muted)
    inline const QColor SOFT     { 0xA1, 0xA1, 0xAA };   // zinc-400

    // ── Status ───────────────────────────────────────
    inline const QColor OK       { 0x22, 0xC5, 0x5E };   // green-500
    inline const QColor WARN     { 0xF5, 0x9E, 0x0B };   // amber-500
    inline const QColor ERR      { 0xEF, 0x44, 0x44 };   // red-500

    // ── Log colors by type (0-5) ─────────────────────
    inline QColor logColor(int t) {
        switch (t) {
            case 1:  return OK;
            case 2:  return ERR;
            case 3:  return WARN;
            case 4:  return ACCENT;
            case 5:  return VIOLET;
            default: return TEXT;
        }
    }
} // namespace Pal
