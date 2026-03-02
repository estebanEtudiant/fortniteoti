// ══════════════════════════════════════════════════════
//  KeyBindButton.cpp
// ══════════════════════════════════════════════════════
#include "KeyBindButton.h"
#include "Palette.h"

// ── Styles ────────────────────────────────────────────────────────────────────
QString KeyBindButton::ss_normal() {
    return QString(
        "QPushButton{background:%1;color:%2;border:1px solid %3;"
        "border-radius:6px;padding:0 14px;font-size:12px;font-weight:600;"
        "min-width:90px;height:30px;text-align:center;}"
        "QPushButton:hover{border-color:%2;}")
        .arg(Pal::CARD2.name(), Pal::TEXT.name(), Pal::BORDER.name());
}

QString KeyBindButton::ss_listening() {
    return QString(
        "QPushButton{background:%1;color:#000000;border:1px solid %1;"
        "border-radius:6px;padding:0 14px;font-size:11px;font-weight:700;"
        "min-width:90px;height:30px;text-align:center;}")
        .arg(Pal::ACCENT.name());
}

// ── Ctor ──────────────────────────────────────────────────────────────────────
KeyBindButton::KeyBindButton(int defaultVK, QWidget* parent)
    : QPushButton(parent), m_vk(defaultVK)
{
    setFocusPolicy(Qt::StrongFocus);
    setCursor(Qt::PointingHandCursor);
    updateDisplay();
}

// ── Public ────────────────────────────────────────────────────────────────────
void KeyBindButton::setVK(int vk) {
    if (m_listening) cancelListening();
    m_vk = vk;
    updateDisplay();
}

// ── Private ───────────────────────────────────────────────────────────────────
void KeyBindButton::startListening() {
    m_listening = true;
    setText(u8"Appuyez…");
    setStyleSheet(ss_listening());
    grabKeyboard();
    setFocus();
}

void KeyBindButton::stopListening(int vk) {
    releaseKeyboard();
    m_listening = false;
    m_vk = vk;
    updateDisplay();
    emit vkChanged(vk);
}

void KeyBindButton::cancelListening() {
    releaseKeyboard();
    m_listening = false;
    updateDisplay();
}

// ── Events ────────────────────────────────────────────────────────────────────
void KeyBindButton::keyPressEvent(QKeyEvent* e) {
    if (!m_listening) {
        QPushButton::keyPressEvent(e);
        return;
    }
    if (e->key() == Qt::Key_Escape) {
        cancelListening();
        return;
    }
    // nativeVirtualKey() = Windows VK code direct
    int vk = static_cast<int>(e->nativeVirtualKey());
    if (vk > 0) stopListening(vk);
}

void KeyBindButton::mousePressEvent(QMouseEvent* e) {
    if (!m_listening) {
        // Premier clic → entre en mode écoute
        startListening();
        return;
    }
    // En mode écoute → capture le bouton souris
    int vk = 0;
    switch (e->button()) {
        case Qt::LeftButton:   vk = 0x01; break;
        case Qt::RightButton:  vk = 0x02; break;
        case Qt::MiddleButton: vk = 0x04; break;
        case Qt::XButton1:     vk = 0x05; break;
        case Qt::XButton2:     vk = 0x06; break;
        default: break;
    }
    if (vk) stopListening(vk);
}

void KeyBindButton::focusOutEvent(QFocusEvent* e) {
    if (m_listening) cancelListening();
    QPushButton::focusOutEvent(e);
}

// ── Display ───────────────────────────────────────────────────────────────────
void KeyBindButton::updateDisplay() {
    setText(vkToLabel(m_vk));
    setStyleSheet(ss_normal());
}

QString KeyBindButton::vkToLabel(int vk) {
    if (vk == 0) return u8"Aucun";
    switch (vk) {
        case 0x01: return "LMB";
        case 0x02: return "RMB";
        case 0x04: return "MMB";
        case 0x05: return "M4";
        case 0x06: return "M5";
        case 0x08: return "Backspace";
        case 0x09: return "Tab";
        case 0x0D: return "Enter";
        case 0x10: return "Shift";
        case 0x11: return "Ctrl";
        case 0x12: return "Alt";
        case 0x1B: return "Escape";
        case 0x20: return "Space";
        case 0x21: return "PageUp";
        case 0x22: return "PageDown";
        case 0x23: return "End";
        case 0x24: return "Home";
        case 0x25: return u8"←";
        case 0x26: return u8"↑";
        case 0x27: return u8"→";
        case 0x28: return u8"↓";
        case 0x2E: return "Delete";
        case 0x60: return "Num0";
        case 0x61: return "Num1";
        case 0x62: return "Num2";
        case 0x63: return "Num3";
        case 0x64: return "Num4";
        case 0x65: return "Num5";
        case 0x66: return "Num6";
        case 0x67: return "Num7";
        case 0x68: return "Num8";
        case 0x69: return "Num9";
        case 0x70: return "F1";
        case 0x71: return "F2";
        case 0x72: return "F3";
        case 0x73: return "F4";
        case 0x74: return "F5";
        case 0x75: return "F6";
        case 0x76: return "F7";
        case 0x77: return "F8";
        case 0x78: return "F9";
        case 0x79: return "F10";
        case 0x7A: return "F11";
        case 0x7B: return "F12";
        default:
            if (vk >= 'A' && vk <= 'Z') return QString(QChar(vk));
            if (vk >= '0' && vk <= '9') return QString(QChar(vk));
            return QString("0x%1").arg(vk, 2, 16, QChar('0')).toUpper();
    }
}