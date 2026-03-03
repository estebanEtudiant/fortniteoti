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
#include "ToggleSwitch.h"
#include "CollapsibleCard.h"
#include "VirtualKeyboard.h"

class MacroPage : public QWidget {
    Q_OBJECT
public:
    explicit MacroPage(QWidget* parent = nullptr);
    ~MacroPage();

private:
    MacroEngine*     m_engine   = nullptr;
    VirtualKeyboard* m_keyboard = nullptr;

    // ── Global Settings ───────────────────────────────
    KeyBindButton* m_gs_masterKey  = nullptr;  // toggle ON/OFF toutes macros
    QLabel*        m_gs_badge      = nullptr;  // badge ACTIF / OFF
    KeyBindButton* m_gs_editKey    = nullptr;  // clé commune edit
    KeyBindButton* m_gs_confirmKey = nullptr;  // clé commune confirm/place

    // ── 1. Double Edit ────────────────────────────────
    ToggleSwitch*  m_de_on            = nullptr;
    KeyBindButton* m_de_trigger       = nullptr;
    KeyBindButton* m_de_edit          = nullptr;
    KeyBindButton* m_de_confirm       = nullptr;
    QSlider*       m_de_delay         = nullptr;
    QLabel*        m_de_delayLbl      = nullptr;
    QSlider*       m_de_repeatDelay   = nullptr;
    QLabel*        m_de_repeatDelayLbl= nullptr;

    // ── 2. Drag Edit ──────────────────────────────────
    ToggleSwitch*  m_drag_on       = nullptr;
    KeyBindButton* m_drag_trigger  = nullptr;
    KeyBindButton* m_drag_edit     = nullptr;
    KeyBindButton* m_drag_reset    = nullptr;
    KeyBindButton* m_drag_hold     = nullptr;
    QSlider*       m_drag_delay    = nullptr;
    QLabel*        m_drag_delayLbl = nullptr;

    // ── 3. Shotgun Pullout ────────────────────────────
    ToggleSwitch*  m_shot_on       = nullptr;
    KeyBindButton* m_shot_watch    = nullptr;
    KeyBindButton* m_shot_key      = nullptr;
    QSlider*       m_shot_delay    = nullptr;
    QLabel*        m_shot_delayLbl = nullptr;

    // ── 4. Auto Build ─────────────────────────────────
    ToggleSwitch*  m_build_on      = nullptr;
    KeyBindButton* m_build_trigger = nullptr;
    KeyBindButton* m_build_hold    = nullptr;
    QLabel*        m_build_badge   = nullptr;

    // ── 5. Pick Up ────────────────────────────────────
    ToggleSwitch*  m_pu_on         = nullptr;
    KeyBindButton* m_pu_trigger    = nullptr;
    KeyBindButton* m_pu_key        = nullptr;
    QSlider*       m_pu_cps        = nullptr;
    QLabel*        m_pu_cpsLbl     = nullptr;

    // ── 6. Single Edit ────────────────────────────────
    ToggleSwitch*  m_se_on         = nullptr;
    KeyBindButton* m_se_trigger    = nullptr;
    KeyBindButton* m_se_edit       = nullptr;
    KeyBindButton* m_se_confirm    = nullptr;
    QSlider*       m_se_delay      = nullptr;
    QLabel*        m_se_delayLbl   = nullptr;
    QCheckBox*     m_se_holdSpam   = nullptr;
    QSlider*       m_se_spamCps    = nullptr;
    QLabel*        m_se_spamCpsLbl = nullptr;

    // ── 7. Instant Build Spam (consolidated) ──────────
    ToggleSwitch*  m_ib_on       = nullptr;
    KeyBindButton* m_ib_place    = nullptr;
    QSlider*       m_ib_delay    = nullptr;
    QLabel*        m_ib_delayLbl = nullptr;
    QSlider*       m_ib_cps      = nullptr;
    QLabel*        m_ib_cpsLbl   = nullptr;
    // Pièces
    QCheckBox*     m_ib_wallOn   = nullptr;
    KeyBindButton* m_ib_wallKey  = nullptr;
    QCheckBox*     m_ib_rampOn   = nullptr;
    KeyBindButton* m_ib_rampKey  = nullptr;
    QCheckBox*     m_ib_floorOn  = nullptr;
    KeyBindButton* m_ib_floorKey = nullptr;
    QCheckBox*     m_ib_coneOn   = nullptr;
    KeyBindButton* m_ib_coneKey  = nullptr;

    // ── 8. Item Pullout ───────────────────────────────
    ToggleSwitch*  m_ip_on          = nullptr;
    KeyBindButton* m_ip_item        = nullptr;
    QCheckBox*     m_ip_afterEdit   = nullptr;
    KeyBindButton* m_ip_editConfirm = nullptr;
    QCheckBox*     m_ip_afterBuild  = nullptr;
    KeyBindButton* m_ip_buildPlace  = nullptr;
    QSlider*       m_ip_delay       = nullptr;
    QLabel*        m_ip_delayLbl    = nullptr;

    // ── 9. Wall Retake ────────────────────────────────
    ToggleSwitch*  m_wr_on         = nullptr;
    KeyBindButton* m_wr_trigger    = nullptr;
    KeyBindButton* m_wr_build      = nullptr;
    KeyBindButton* m_wr_wall       = nullptr;
    KeyBindButton* m_wr_place      = nullptr;
    QSlider*       m_wr_cps        = nullptr;
    QLabel*        m_wr_cpsLbl     = nullptr;

    // ── 10. Prefire ───────────────────────────────────
    ToggleSwitch*  m_pf_on         = nullptr;
    KeyBindButton* m_pf_trigger    = nullptr;
    KeyBindButton* m_pf_fire       = nullptr;
    QSlider*       m_pf_cps        = nullptr;
    QLabel*        m_pf_cpsLbl     = nullptr;

    // ── Driver status ─────────────────────────────────
    QLabel*      m_driverLbl  = nullptr;
    QPushButton* m_installBtn = nullptr;

    // ── Status bar ────────────────────────────────────
    QLabel* m_statusLbl = nullptr;

    void buildUi();
    void syncEngine();
    void updateKeyboard();
    void setStatus(const QString& msg, const QColor& col);
    void applyEditKey(int vk);
    void applyConfirmKey(int vk);
};
