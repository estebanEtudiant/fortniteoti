// ══════════════════════════════════════════════════════
//  Palette.h — Shared color palette (mirrors ImGui theme)
// ══════════════════════════════════════════════════════
#pragma once
#include <QColor>

namespace Pal {
    // Backgrounds
    inline const QColor BG       { 0x0B, 0x0B, 0x0D };
    inline const QColor SIDEBAR  { 0x0E, 0x0F, 0x11 };
    inline const QColor CARD     { 0x15, 0x16, 0x19 };
    inline const QColor CARD2    { 0x1B, 0x1C, 0x20 };
    inline const QColor FRAME    { 0x1E, 0x1F, 0x23 };
    inline const QColor BORDER   { 0x25, 0x26, 0x2C };
    inline const QColor TITLEBAR { 0x0A, 0x0B, 0x0F };

    // Accent
    inline const QColor ACCENT   { 0x00, 0xD1, 0xFF };
    inline const QColor ACCENT_H { 0x2E, 0xE0, 0xFF };
    inline const QColor ACCENT_A { 0x00, 0xA3, 0xCC };
    inline const QColor VIOLET   { 0x8F, 0x66, 0xFF };

    // Text
    inline const QColor TEXT     { 0xED, 0xF2, 0xF7 };
    inline const QColor DIM      { 0x8F, 0x99, 0xAD };
    inline const QColor SOFT     { 0xBD, 0xC7, 0xD6 };

    // Status
    inline const QColor OK       { 0x33, 0xC7, 0x6B };
    inline const QColor WARN     { 0xF7, 0xB3, 0x42 };
    inline const QColor ERR      { 0xE6, 0x42, 0x47 };

    // Log color by type (0-5)
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
