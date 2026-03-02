// ══════════════════════════════════════════════════════
//  MacroPage.h
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QLabel>
#include <QCheckBox>
#include <QSlider>
#include <QPushButton>
#include "MacroEngine.h"
#include "KeyBindButton.h"

class MacroPage : public QWidget {
    Q_OBJECT
public:
    explicit MacroPage(QWidget* parent = nullptr);
    ~MacroPage();

private:
    MacroEngine* m_engine = nullptr;

    // ── 1. Double Edit ────────────────────────────────
    QCheckBox*     m_de_on         = nullptr;
    KeyBindButton* m_de_trigger    = nullptr;
    KeyBindButton* m_de_edit       = nullptr;
    KeyBindButton* m_de_confirm    = nullptr;
    QSlider*       m_de_delay      = nullptr;
    QLabel*        m_de_delayLbl   = nullptr;
    QCheckBox*     m_de_editOnRel  = nullptr;
    QCheckBox*     m_de_sprint     = nullptr;
    KeyBindButton* m_de_sprintK    = nullptr;
    QCheckBox*     m_de_crouch     = nullptr;
    KeyBindButton* m_de_crouchK    = nullptr;

    // ── 2. Drag Edit ──────────────────────────────────
    QCheckBox*     m_drag_on       = nullptr;
    KeyBindButton* m_drag_trigger  = nullptr;
    KeyBindButton* m_drag_edit     = nullptr;
    KeyBindButton* m_drag_reset    = nullptr;
    KeyBindButton* m_drag_hold     = nullptr;
    QSlider*       m_drag_delay    = nullptr;
    QLabel*        m_drag_delayLbl = nullptr;

    // ── 3. Shotgun Pullout ────────────────────────────
    QCheckBox*     m_shot_on       = nullptr;
    KeyBindButton* m_shot_watch    = nullptr;
    KeyBindButton* m_shot_key      = nullptr;
    QSlider*       m_shot_delay    = nullptr;
    QLabel*        m_shot_delayLbl = nullptr;

    // ── 4. Auto Build ─────────────────────────────────
    QCheckBox*     m_build_on      = nullptr;
    KeyBindButton* m_build_trigger = nullptr;
    KeyBindButton* m_build_hold    = nullptr;
    QLabel*        m_build_badge   = nullptr;

    // ── 5. Pick Up ────────────────────────────────────
    QCheckBox*     m_pu_on         = nullptr;
    KeyBindButton* m_pu_trigger    = nullptr;
    KeyBindButton* m_pu_key        = nullptr;
    QSlider*       m_pu_cps        = nullptr;
    QLabel*        m_pu_cpsLbl     = nullptr;

    // ── Driver status ─────────────────────────────────
    QLabel*      m_driverLbl  = nullptr;
    QPushButton* m_installBtn = nullptr;

    // ── Status bar ────────────────────────────────────
    QLabel* m_statusLbl = nullptr;

    void buildUi();
    void syncEngine();
    void setStatus(const QString& msg, const QColor& col);
};