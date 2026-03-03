// ══════════════════════════════════════════════════════
//  MacroPage.cpp — accordion cards + virtual keyboard
// ══════════════════════════════════════════════════════
#include "MacroPage.h"
#include "Palette.h"
#include "InputSender.h"
#include "KeyBindButton.h"
#include "CollapsibleCard.h"
#include "VirtualKeyboard.h"

#include <QScrollArea>
#include <QFrame>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QSlider>
#include <QProcess>
#include <QFile>
#include <QMessageBox>
#include <QCoreApplication>
#include <QStandardPaths>
#include <QTimer>
#include <thread>

#ifdef _WIN32
#  ifndef WIN32_LEAN_AND_MEAN
#    define WIN32_LEAN_AND_MEAN
#  endif
#  include <windows.h>
#  include <shellapi.h>
#endif

// ══════════════════════════════════════════════════════════════════════════════
//  Static style helpers
// ══════════════════════════════════════════════════════════════════════════════
static QString sliderSS() {
    return QString(
        "QSlider::groove:horizontal{"
        "  height:4px;background:%1;border-radius:2px;}"
        "QSlider::sub-page:horizontal{"
        "  background:%2;border-radius:2px;}"
        "QSlider::handle:horizontal{"
        "  width:14px;height:14px;margin:-5px 0;"
        "  border-radius:7px;background:%2;}"
        "QSlider::handle:horizontal:hover{"
        "  background:%3;}")
        .arg(Pal::FRAME.name(), Pal::ACCENT.name(), Pal::ACCENT_H.name());
}

static QString subToggleSS() {
    return QString(
        "QCheckBox{color:%1;font-size:12px;font-weight:500;"
        "  background:transparent;spacing:8px;}"
        "QCheckBox::indicator{width:28px;height:16px;border-radius:8px;"
        "  background:%2;border:1px solid %3;}"
        "QCheckBox::indicator:checked{background:%4;border-color:%4;}")
        .arg(Pal::SOFT.name(), Pal::FRAME.name(),
             Pal::BORDER.name(), Pal::ACCENT.name());
}

// ── Helpers ───────────────────────────────────────────────────────────────────
static QLabel* lbl(const QString& t, int px, const QColor& c, bool bold = false) {
    auto* l = new QLabel(t);
    l->setStyleSheet(QString("color:%1;background:transparent;font-size:%2px;%3")
        .arg(c.name()).arg(px).arg(bold ? "font-weight:700;" : ""));
    l->setWordWrap(true);
    return l;
}

static QFrame* sep() {
    auto* f = new QFrame;
    f->setFrameShape(QFrame::NoFrame);
    f->setFixedHeight(1);
    f->setStyleSheet(QString("background:%1;border:none;").arg(Pal::BORDER.name()));
    return f;
}

// Slider + live value label
static QWidget* mkSlider(int val, int lo, int hi,
                          const QString& suffix,
                          QSlider** outSlider, QLabel** outLbl) {
    auto* w = new QWidget; w->setStyleSheet("background:transparent;");
    auto* h = new QHBoxLayout(w);
    h->setContentsMargins(0, 0, 0, 0); h->setSpacing(12);

    auto* s = new QSlider(Qt::Horizontal);
    s->setRange(lo, hi); s->setValue(val);
    s->setFixedHeight(20);
    s->setStyleSheet(sliderSS());

    auto* vl = new QLabel(QString::number(val) + suffix);
    vl->setFixedWidth(52);
    vl->setAlignment(Qt::AlignRight | Qt::AlignVCenter);
    vl->setStyleSheet(QString(
        "color:%1;font-size:12px;font-weight:600;background:transparent;")
        .arg(Pal::ACCENT.name()));
    QObject::connect(s, &QSlider::valueChanged, vl,
        [vl, suffix](int v){ vl->setText(QString::number(v) + suffix); });

    h->addWidget(s, 1); h->addWidget(vl);
    if (outSlider) *outSlider = s;
    if (outLbl)    *outLbl    = vl;
    return w;
}

// Setting row: label (fixed) + widget
static void row(QVBoxLayout* vl, const QString& label,
                QWidget* w, const QString& hint = {}) {
    auto* h = new QHBoxLayout; h->setSpacing(12);
    auto* l = new QLabel(label);
    l->setFixedWidth(168);
    l->setStyleSheet(QString(
        "color:%1;font-size:12px;background:transparent;")
        .arg(Pal::SOFT.name()));
    h->addWidget(l);
    h->addWidget(w, 1);
    if (!hint.isEmpty()) {
        auto* hl = new QLabel(hint);
        hl->setStyleSheet(QString(
            "color:%1;font-size:10px;background:transparent;")
            .arg(Pal::DIM.name()));
        h->addWidget(hl);
    }
    vl->addLayout(h);
}

static void sliderRow(QVBoxLayout* vl, const QString& label, QWidget* sliderW) {
    auto* h = new QHBoxLayout; h->setSpacing(12);
    auto* l = new QLabel(label);
    l->setFixedWidth(168);
    l->setStyleSheet(QString(
        "color:%1;font-size:12px;background:transparent;")
        .arg(Pal::SOFT.name()));
    h->addWidget(l);
    h->addWidget(sliderW, 1);
    vl->addLayout(h);
}

static void subRow(QVBoxLayout* vl, QCheckBox* toggle,
                   QWidget* bindBtn = nullptr, const QString& hint = {}) {
    toggle->setStyleSheet(subToggleSS());
    auto* h = new QHBoxLayout; h->setSpacing(10);
    h->addSpacing(24);
    h->addWidget(toggle);
    if (bindBtn) h->addWidget(bindBtn);
    if (!hint.isEmpty()) {
        auto* hl = new QLabel(hint);
        hl->setStyleSheet(QString(
            "color:%1;font-size:10px;background:transparent;")
            .arg(Pal::DIM.name()));
        h->addWidget(hl);
    }
    h->addStretch();
    vl->addLayout(h);
}

// Bouton "Appliquer à toutes"
static QPushButton* mkApplyBtn() {
    auto* b = new QPushButton("Appliquer \u00e0 tous");
    b->setFixedHeight(28);
    b->setCursor(Qt::PointingHandCursor);
    b->setStyleSheet(QString(
        "QPushButton{background:%1;color:%2;border:1px solid %3;"
        "border-radius:5px;padding:0 10px;font-size:11px;font-weight:500;}"
        "QPushButton:hover{background:%4;border-color:%5;}"
        "QPushButton:pressed{background:%6;}")
        .arg(Pal::FRAME.name(), Pal::SOFT.name(), Pal::BORDER.name(),
             Pal::CARD.name(), Pal::ACCENT.name(), Pal::FRAME.name()));
    return b;
}

// ══════════════════════════════════════════════════════════════════════════════
//  MacroPage
// ══════════════════════════════════════════════════════════════════════════════
MacroPage::MacroPage(QWidget* parent) : QWidget(parent) {
    m_engine = new MacroEngine(this);
    InputSender::instance().init();
    buildUi();
    m_engine->startEngine();

    // Auto Build badge
    connect(m_engine, &MacroEngine::autoBuildToggled, this, [this](bool on) {
        if (!m_build_badge) return;
        if (on) {
            m_build_badge->setText("ACTIF");
            m_build_badge->setStyleSheet(QString(
                "color:%1;background:%2;border-radius:4px;padding:1px 7px;"
                "font-size:10px;font-weight:700;letter-spacing:0.5px;")
                .arg("#000", Pal::OK.name()));
        } else {
            m_build_badge->setText("OFF");
            m_build_badge->setStyleSheet(QString(
                "color:%1;background:%2;border-radius:4px;padding:1px 7px;"
                "font-size:10px;font-weight:600;letter-spacing:0.5px;")
                .arg(Pal::DIM.name(), Pal::FRAME.name()));
        }
    });

    // Global toggle badge
    connect(m_engine, &MacroEngine::globalToggled, this, [this](bool enabled) {
        if (!m_gs_badge) return;
        if (enabled) {
            m_gs_badge->setText("MACROS  ACTIF");
            m_gs_badge->setStyleSheet(QString(
                "color:#000;background:%1;border-radius:4px;padding:1px 9px;"
                "font-size:10px;font-weight:700;letter-spacing:0.5px;")
                .arg(Pal::OK.name()));
        } else {
            m_gs_badge->setText("MACROS  OFF");
            m_gs_badge->setStyleSheet(QString(
                "color:%1;background:%2;border-radius:4px;padding:1px 9px;"
                "font-size:10px;font-weight:600;letter-spacing:0.5px;")
                .arg(Pal::DIM.name(), Pal::FRAME.name()));
        }
    });
}

MacroPage::~MacroPage() { m_engine->stopEngine(); }

// ── buildUi ───────────────────────────────────────────────────────────────────
void MacroPage::buildUi() {
    auto* root = new QVBoxLayout(this);
    root->setContentsMargins(0, 0, 0, 0);
    root->setSpacing(0);

    // ── Page header ───────────────────────────────────────────────────────────
    auto* ph = new QWidget; ph->setFixedHeight(68);
    ph->setStyleSheet("background:transparent;");
    auto* phL = new QHBoxLayout(ph);
    phL->setContentsMargins(2, 0, 0, 16);

    auto* tv = new QVBoxLayout; tv->setSpacing(3);
    tv->addWidget(lbl("Macros Fortnite", 18, Pal::TEXT, true));
    tv->addWidget(lbl(
        "Macros configurables \u2014 cliquer une carte pour d\u00e9rouler ses param\u00e8tres",
        11, Pal::DIM));
    phL->addLayout(tv, 1);

    m_statusLbl = lbl("Moteur actif", 11, Pal::OK, true);
    phL->addWidget(m_statusLbl);
    root->addWidget(ph);

    // ── Scroll ────────────────────────────────────────────────────────────────
    auto* scroll = new QScrollArea;
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    scroll->setStyleSheet(
        "QScrollArea{background:transparent;border:none;}"
        "QScrollBar:vertical{background:transparent;width:6px;margin:0;}"
        "QScrollBar::handle:vertical{background:#333340;border-radius:3px;min-height:30px;}"
        "QScrollBar::add-line:vertical,QScrollBar::sub-line:vertical{height:0;}");

    auto* body = new QWidget; body->setStyleSheet("background:transparent;");
    auto* bodyV = new QVBoxLayout(body);
    bodyV->setContentsMargins(0, 0, 8, 16);
    bodyV->setSpacing(10);

    // ── Helper lambda (shared setup) ──────────────────────────────────────────
    auto sync = [this]() { syncEngine(); };

    // ══════════════════════════════════════════════════════════════════════════
    //  PARAMÈTRES GLOBAUX ⚙
    // ══════════════════════════════════════════════════════════════════════════
    {
        static int s_gid = 0;
        QString gnm = QString("gc%1").arg(++s_gid);
        auto* gCard = new QFrame; gCard->setObjectName(gnm);
        gCard->setStyleSheet(QString(
            "#%1{background:%2;border:1px solid %3;border-radius:12px;}")
            .arg(gnm, Pal::CARD.name(), Pal::BORDER.name()));

        auto* gV = new QVBoxLayout(gCard);
        gV->setContentsMargins(14, 12, 14, 14);
        gV->setSpacing(8);

        // Title row
        auto* gHdr = new QHBoxLayout;
        gHdr->addWidget(lbl("\u2699  PARAM\u00c8TRES GLOBAUX", 11, Pal::DIM, true));
        gHdr->addStretch();
        m_gs_badge = new QLabel("MACROS  ACTIF");
        m_gs_badge->setStyleSheet(QString(
            "color:#000;background:%1;border-radius:4px;padding:1px 9px;"
            "font-size:10px;font-weight:700;letter-spacing:0.5px;")
            .arg(Pal::OK.name()));
        gHdr->addWidget(m_gs_badge);
        gV->addLayout(gHdr);
        gV->addWidget(sep());

        // Master toggle key
        m_gs_masterKey = new KeyBindButton(0);
        row(gV, "Touche ma\u00eetrre", m_gs_masterKey,
            "appuyer = ON/OFF toutes les macros");
        gV->addWidget(sep());

        // Common keys section
        gV->addWidget(lbl("TOUCHES COMMUNES", 10, Pal::DIM, true));

        // Edit key row
        m_gs_editKey = new KeyBindButton('G');
        {
            auto* h = new QHBoxLayout; h->setSpacing(8);
            auto* l = new QLabel("Edit key");
            l->setFixedWidth(168);
            l->setStyleSheet(QString("color:%1;font-size:12px;background:transparent;")
                .arg(Pal::SOFT.name()));
            h->addWidget(l);
            h->addWidget(m_gs_editKey, 1);
            auto* btn = mkApplyBtn();
            connect(btn, &QPushButton::clicked, this,
                [this]() { applyEditKey(m_gs_editKey->vk()); });
            h->addWidget(btn);
            gV->addLayout(h);
        }

        // Confirm / Place key row
        m_gs_confirmKey = new KeyBindButton(0x01);
        {
            auto* h = new QHBoxLayout; h->setSpacing(8);
            auto* l = new QLabel("Confirm / Place");
            l->setFixedWidth(168);
            l->setStyleSheet(QString("color:%1;font-size:12px;background:transparent;")
                .arg(Pal::SOFT.name()));
            h->addWidget(l);
            h->addWidget(m_gs_confirmKey, 1);
            auto* btn = mkApplyBtn();
            connect(btn, &QPushButton::clicked, this,
                [this]() { applyConfirmKey(m_gs_confirmKey->vk()); });
            h->addWidget(btn);
            gV->addLayout(h);
        }

        gV->addWidget(lbl(
            "Appliquer copie la touche choisie dans toutes les macros concern\u00e9es.",
            10, Pal::DIM));

        connect(m_gs_masterKey, &KeyBindButton::vkChanged, this, sync);
        bodyV->addWidget(gCard);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  KEYBOARD OVERLAY
    // ══════════════════════════════════════════════════════════════════════════
    {
        static int s_kid = 0;
        QString knm = QString("kbc%1").arg(++s_kid);
        auto* kCard = new QFrame; kCard->setObjectName(knm);
        kCard->setStyleSheet(QString(
            "#%1{background:%2;border:1px solid %3;border-radius:12px;}")
            .arg(knm, Pal::CARD.name(), Pal::BORDER.name()));

        auto* kV = new QVBoxLayout(kCard);
        kV->setContentsMargins(14, 12, 14, 14);
        kV->setSpacing(8);

        auto* kHdr = new QHBoxLayout;
        kHdr->addWidget(lbl("TOUCHES BIND\u00c9ES", 10, Pal::DIM, true));
        kHdr->addStretch();
        kHdr->addWidget(lbl("Les touches d\u00e9clencheurs de chaque macro",
                            10, Pal::DIM));
        kV->addLayout(kHdr);
        kV->addWidget(sep());

        m_keyboard = new VirtualKeyboard;
        auto* kCenter = new QHBoxLayout;
        kCenter->addStretch();
        kCenter->addWidget(m_keyboard);
        kCenter->addStretch();
        kV->addLayout(kCenter);

        bodyV->addWidget(kCard);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  1. DOUBLE EDIT
    // ══════════════════════════════════════════════════════════════════════════
    {
        auto* card = new CollapsibleCard("DOUBLE EDIT",
            "Maintenir Trigger \u2192 \u00e9dit + confirm en boucle. "
            "L\u00e2cher = arr\u00eat imm\u00e9diat.");
        m_de_on = card->toggle();
        auto* cl = card->contentLayout();

        m_de_trigger = new KeyBindButton('G');
        m_de_edit    = new KeyBindButton('G');
        m_de_confirm = new KeyBindButton(0x01);
        row(cl, "Trigger",     m_de_trigger, "clic pour rebind");
        row(cl, "Edit key",    m_de_edit);
        row(cl, "Confirm key", m_de_confirm);
        cl->addWidget(sep());
        auto* delW = mkSlider(50, 0, 200, " ms", &m_de_delay, &m_de_delayLbl);
        sliderRow(cl, "D\u00e9lai edit \u2192 confirm", delW);
        auto* repW = mkSlider(200, 0, 800, " ms", &m_de_repeatDelay, &m_de_repeatDelayLbl);
        sliderRow(cl, "D\u00e9lai entre chaque \u00e9dit", repW);

        connect(m_de_on,           &ToggleSwitch::toggled,    this, sync);
        connect(m_de_trigger,      &KeyBindButton::vkChanged, this, sync);
        connect(m_de_edit,         &KeyBindButton::vkChanged, this, sync);
        connect(m_de_confirm,      &KeyBindButton::vkChanged, this, sync);
        connect(m_de_delay,        &QSlider::valueChanged,    this, sync);
        connect(m_de_repeatDelay,  &QSlider::valueChanged,    this, sync);
        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  2. DRAG EDIT
    // ══════════════════════════════════════════════════════════════════════════
    {
        auto* card = new CollapsibleCard("DRAG EDIT",
            "\u2460 Ouvre l\u2019edit (tap 5ms)  \u2461 Reset (tap 5ms)  "
            "\u2462 Hold key maintenu — draggez la souris  "
            "\u2463 Rel\u00e2che \u2192 confirme.");
        m_drag_on = card->toggle();
        auto* cl = card->contentLayout();

        m_drag_trigger = new KeyBindButton(0x05);
        m_drag_edit    = new KeyBindButton('G');
        m_drag_reset   = new KeyBindButton('R');
        m_drag_hold    = new KeyBindButton(0x01);
        row(cl, "Trigger",            m_drag_trigger);
        row(cl, "Edit bind",          m_drag_edit);
        row(cl, "Reset bind",         m_drag_reset);
        row(cl, "Hold key (Confirm)", m_drag_hold);
        cl->addWidget(sep());
        auto* delW = mkSlider(80, 10, 500, " ms", &m_drag_delay, &m_drag_delayLbl);
        sliderRow(cl, "Fen\u00eatre de drag", delW);
        cl->addWidget(lbl(
            "Seul ce temps compte \u2014 edit et reset sont instantan\u00e9s.",
            10, Pal::DIM));

        connect(m_drag_on,     &ToggleSwitch::toggled,      this, sync);
        connect(m_drag_trigger,&KeyBindButton::vkChanged,   this, sync);
        connect(m_drag_edit,   &KeyBindButton::vkChanged,   this, sync);
        connect(m_drag_reset,  &KeyBindButton::vkChanged,   this, sync);
        connect(m_drag_hold,   &KeyBindButton::vkChanged,   this, sync);
        connect(m_drag_delay,  &QSlider::valueChanged,      this, sync);
        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  3. SHOTGUN PULLOUT
    // ══════════════════════════════════════════════════════════════════════════
    {
        auto* card = new CollapsibleCard("SHOTGUN PULLOUT",
            "D\u00e8s que Watch key est rel\u00e2ch\u00e9e, sort automatiquement "
            "le fusil \u00e0 pompe.");
        m_shot_on = card->toggle();
        auto* cl = card->contentLayout();

        m_shot_watch = new KeyBindButton(0x01);
        m_shot_key   = new KeyBindButton('1');
        row(cl, "Watch key",          m_shot_watch, "touche surveill\u00e9e");
        row(cl, "Shotgun key",        m_shot_key,   "slot arme");
        cl->addWidget(sep());
        auto* delW = mkSlider(20, 0, 200, " ms", &m_shot_delay, &m_shot_delayLbl);
        sliderRow(cl, "D\u00e9lai avant switch", delW);

        connect(m_shot_on,   &ToggleSwitch::toggled,      this, sync);
        connect(m_shot_watch,&KeyBindButton::vkChanged,   this, sync);
        connect(m_shot_key,  &KeyBindButton::vkChanged,   this, sync);
        connect(m_shot_delay,&QSlider::valueChanged,      this, sync);
        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  4. AUTO BUILD
    // ══════════════════════════════════════════════════════════════════════════
    {
        auto* card = new CollapsibleCard("AUTO BUILD",
            "Toggle ON/OFF via Trigger. Maintient Hold key en continu \u2014 "
            "plus besoin de tenir la touche pour construire.");
        m_build_on = card->toggle();
        auto* cl = card->contentLayout();

        auto* badgeRow = new QHBoxLayout; badgeRow->setSpacing(8);
        m_build_badge = new QLabel("OFF");
        m_build_badge->setStyleSheet(QString(
            "color:%1;background:%2;border-radius:4px;padding:1px 7px;"
            "font-size:10px;font-weight:600;letter-spacing:0.5px;")
            .arg(Pal::DIM.name(), Pal::FRAME.name()));
        badgeRow->addWidget(lbl("Status", 12, Pal::SOFT));
        badgeRow->addWidget(m_build_badge);
        badgeRow->addStretch();
        cl->addLayout(badgeRow);
        cl->addWidget(sep());

        m_build_trigger = new KeyBindButton('Z');
        m_build_hold    = new KeyBindButton(0x01);
        row(cl, "Trigger (toggle ON/OFF)", m_build_trigger);
        row(cl, "Hold key",                m_build_hold, "LMB = poser");

        connect(m_build_on,     &ToggleSwitch::toggled,    this, sync);
        connect(m_build_trigger,&KeyBindButton::vkChanged, this, sync);
        connect(m_build_hold,   &KeyBindButton::vkChanged, this, sync);
        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  5. PICK UP
    // ══════════════════════════════════════════════════════════════════════════
    {
        auto* card = new CollapsibleCard("PICK UP",
            "Maintenir Trigger \u2192 spam Pickup key au CPS configur\u00e9. "
            "Fonctionne m\u00eame si Trigger = Pickup key.");
        m_pu_on = card->toggle();
        auto* cl = card->contentLayout();

        m_pu_trigger = new KeyBindButton(0x04);
        m_pu_key     = new KeyBindButton('E');
        row(cl, "Trigger (maintenir)", m_pu_trigger);
        row(cl, "Pickup key",          m_pu_key);
        cl->addWidget(sep());
        auto* cpsW = mkSlider(10, 1, 30, " CPS", &m_pu_cps, &m_pu_cpsLbl);
        sliderRow(cl, "R\u00e9p\u00e9titions / sec", cpsW);

        connect(m_pu_on,     &ToggleSwitch::toggled,    this, sync);
        connect(m_pu_trigger,&KeyBindButton::vkChanged, this, sync);
        connect(m_pu_key,    &KeyBindButton::vkChanged, this, sync);
        connect(m_pu_cps,    &QSlider::valueChanged,    this, sync);
        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  6. SINGLE EDIT
    // ══════════════════════════════════════════════════════════════════════════
    {
        auto* card = new CollapsibleCard("SINGLE EDIT",
            "Trigger press \u2192 Edit \u2192 Confirm en une touche. "
            "Spam maintenu disponible.");
        m_se_on = card->toggle();
        auto* cl = card->contentLayout();

        m_se_trigger = new KeyBindButton('F');
        m_se_edit    = new KeyBindButton('G');
        m_se_confirm = new KeyBindButton(0x01);
        row(cl, "Trigger",     m_se_trigger, "clic pour rebind");
        row(cl, "Edit key",    m_se_edit);
        row(cl, "Confirm key", m_se_confirm);
        cl->addWidget(sep());
        auto* delW = mkSlider(50, 0, 200, " ms", &m_se_delay, &m_se_delayLbl);
        sliderRow(cl, "D\u00e9lai edit \u2192 confirm", delW);
        cl->addWidget(sep());
        m_se_holdSpam = new QCheckBox("Spam maintenu \u2014 r\u00e9p\u00e8te en boucle tant que tenu");
        subRow(cl, m_se_holdSpam);
        auto* seSpamW = mkSlider(5, 1, 15, " seq/s", &m_se_spamCps, &m_se_spamCpsLbl);
        sliderRow(cl, "Cadence spam", seSpamW);

        connect(m_se_on,      &ToggleSwitch::toggled,    this, sync);
        connect(m_se_trigger, &KeyBindButton::vkChanged, this, sync);
        connect(m_se_edit,    &KeyBindButton::vkChanged, this, sync);
        connect(m_se_confirm, &KeyBindButton::vkChanged, this, sync);
        connect(m_se_delay,   &QSlider::valueChanged,    this, sync);
        connect(m_se_holdSpam,&QCheckBox::toggled,       this, sync);
        connect(m_se_spamCps, &QSlider::valueChanged,    this, sync);
        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  7. INSTANT BUILD SPAM (consolidated — chaque pièce est son propre trigger)
    // ══════════════════════════════════════════════════════════════════════════
    {
        auto* card = new CollapsibleCard("INSTANT BUILD",
            "Maintenir une touche de pi\u00e8ce = spam cette pi\u00e8ce + pose. "
            "Chaque touche est son propre trigger. "
            "Pi\u00e8ces ind\u00e9pendantes.");
        m_ib_on = card->toggle();
        auto* cl = card->contentLayout();

        m_ib_place = new KeyBindButton(0x01);
        row(cl, "Place key", m_ib_place, "LMB = poser (commun)");
        cl->addWidget(sep());

        cl->addWidget(lbl("PI\u00c8CES ACTIVES", 10, Pal::DIM, true));
        m_ib_wallOn  = new QCheckBox("Mur");        m_ib_wallOn->setChecked(true);
        m_ib_wallKey = new KeyBindButton(0x70);
        m_ib_rampOn  = new QCheckBox("Rampe");      m_ib_rampOn->setChecked(true);
        m_ib_rampKey = new KeyBindButton(0x72);
        m_ib_floorOn = new QCheckBox("Sol");
        m_ib_floorKey= new KeyBindButton(0x71);
        m_ib_coneOn  = new QCheckBox("C\u00f4ne");
        m_ib_coneKey = new KeyBindButton(0x73);
        subRow(cl, m_ib_wallOn,  m_ib_wallKey,  "F1");
        subRow(cl, m_ib_rampOn,  m_ib_rampKey,  "F3");
        subRow(cl, m_ib_floorOn, m_ib_floorKey, "F2");
        subRow(cl, m_ib_coneOn,  m_ib_coneKey,  "F4");
        cl->addWidget(sep());

        auto* delW = mkSlider(30, 5, 150, " ms", &m_ib_delay, &m_ib_delayLbl);
        sliderRow(cl, "D\u00e9lai pi\u00e8ce \u2192 pose", delW);
        auto* cpsW = mkSlider(8, 1, 20, " CPS", &m_ib_cps, &m_ib_cpsLbl);
        sliderRow(cl, "Spam CPS", cpsW);
        cl->addWidget(lbl(
            "Une seule pi\u00e8ce active = spam de cette pi\u00e8ce. "
            "Plusieurs = alternance en boucle.",
            10, Pal::DIM));

        connect(m_ib_on,      &ToggleSwitch::toggled,    this, sync);
        connect(m_ib_place,   &KeyBindButton::vkChanged, this, sync);
        connect(m_ib_delay,   &QSlider::valueChanged,    this, sync);
        connect(m_ib_cps,     &QSlider::valueChanged,    this, sync);
        connect(m_ib_wallOn,  &QCheckBox::toggled,       this, sync);
        connect(m_ib_wallKey, &KeyBindButton::vkChanged, this, sync);
        connect(m_ib_rampOn,  &QCheckBox::toggled,       this, sync);
        connect(m_ib_rampKey, &KeyBindButton::vkChanged, this, sync);
        connect(m_ib_floorOn, &QCheckBox::toggled,       this, sync);
        connect(m_ib_floorKey,&KeyBindButton::vkChanged, this, sync);
        connect(m_ib_coneOn,  &QCheckBox::toggled,       this, sync);
        connect(m_ib_coneKey, &KeyBindButton::vkChanged, this, sync);
        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  8. ITEM PULLOUT
    // ══════════════════════════════════════════════════════════════════════════
    {
        auto* card = new CollapsibleCard("ITEM PULLOUT",
            "Sort automatiquement votre slot apr\u00e8s un edit ou une pose. "
            "Gardez toujours le pompe en main sans y penser.");
        m_ip_on = card->toggle();
        auto* cl = card->contentLayout();

        m_ip_item = new KeyBindButton('1');
        row(cl, "Slot \u00e0 sortir", m_ip_item, "ex : 1 = pompe");
        cl->addWidget(sep());

        m_ip_afterEdit   = new QCheckBox("Apr\u00e8s un \u00e9dit (confirm key rel\u00e2ch\u00e9e)");
        m_ip_editConfirm = new KeyBindButton(0x01);
        m_ip_afterEdit->setChecked(true);
        subRow(cl, m_ip_afterEdit, m_ip_editConfirm, "touche Confirm surveill\u00e9e");

        m_ip_afterBuild = new QCheckBox("Apr\u00e8s une pose (place key rel\u00e2ch\u00e9e)");
        m_ip_buildPlace = new KeyBindButton(0x01);
        subRow(cl, m_ip_afterBuild, m_ip_buildPlace, "touche Place surveill\u00e9e");

        cl->addWidget(sep());
        auto* delW = mkSlider(25, 0, 100, " ms", &m_ip_delay, &m_ip_delayLbl);
        sliderRow(cl, "D\u00e9lai avant switch", delW);
        cl->addWidget(lbl(
            "Combiner avec Double Edit, Single Edit ou Auto Build.",
            10, Pal::DIM));

        connect(m_ip_on,         &ToggleSwitch::toggled,    this, sync);
        connect(m_ip_item,       &KeyBindButton::vkChanged, this, sync);
        connect(m_ip_afterEdit,  &QCheckBox::toggled,       this, sync);
        connect(m_ip_editConfirm,&KeyBindButton::vkChanged, this, sync);
        connect(m_ip_afterBuild, &QCheckBox::toggled,       this, sync);
        connect(m_ip_buildPlace, &KeyBindButton::vkChanged, this, sync);
        connect(m_ip_delay,      &QSlider::valueChanged,    this, sync);
        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  9. WALL RETAKE
    // ══════════════════════════════════════════════════════════════════════════
    {
        auto* card = new CollapsibleCard("WALL RETAKE",
            "Maintenir Trigger \u2192 spam Build + S\u00e9lection mur + Place. "
            "D\u00e8s que le mur c\u00e8de, la pose passe automatiquement.");
        m_wr_on = card->toggle();
        auto* cl = card->contentLayout();

        m_wr_trigger = new KeyBindButton(0x05);
        m_wr_build   = new KeyBindButton('Q');
        m_wr_wall    = new KeyBindButton(0x70);
        m_wr_place   = new KeyBindButton(0x01);
        row(cl, "Trigger (maintenir)", m_wr_trigger);
        row(cl, "Build mode key",      m_wr_build,   "touche mode construction");
        row(cl, "Wall piece key",      m_wr_wall,    "ex : F1");
        row(cl, "Place key",           m_wr_place,   "ex : LMB");
        cl->addWidget(sep());
        auto* cpsW = mkSlider(8, 1, 20, " CPS", &m_wr_cps, &m_wr_cpsLbl);
        sliderRow(cl, "R\u00e9p\u00e9titions / sec", cpsW);
        cl->addWidget(lbl(
            "CPS recommand\u00e9 : 6-12. "
            "Rester en build mode pendant le retake.",
            10, Pal::DIM));

        connect(m_wr_on,     &ToggleSwitch::toggled,    this, sync);
        connect(m_wr_trigger,&KeyBindButton::vkChanged, this, sync);
        connect(m_wr_build,  &KeyBindButton::vkChanged, this, sync);
        connect(m_wr_wall,   &KeyBindButton::vkChanged, this, sync);
        connect(m_wr_place,  &KeyBindButton::vkChanged, this, sync);
        connect(m_wr_cps,    &QSlider::valueChanged,    this, sync);
        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 10. PREFIRE
    // ══════════════════════════════════════════════════════════════════════════
    {
        auto* card = new CollapsibleCard("PREFIRE",
            "Maintenir Trigger \u2192 spam Fire key au CPS configur\u00e9. "
            "Tirez avant m\u00eame de voir l\u2019adversaire en coin.");
        m_pf_on = card->toggle();
        auto* cl = card->contentLayout();

        m_pf_trigger = new KeyBindButton(0x02);
        m_pf_fire    = new KeyBindButton(0x01);
        row(cl, "Trigger (maintenir)", m_pf_trigger, "ex : RMB (viser)");
        row(cl, "Fire key",            m_pf_fire,    "ex : LMB (tirer)");
        cl->addWidget(sep());
        auto* cpsW = mkSlider(8, 1, 30, " CPS", &m_pf_cps, &m_pf_cpsLbl);
        sliderRow(cl, "R\u00e9p\u00e9titions / sec", cpsW);
        cl->addWidget(lbl(
            "CPS recommand\u00e9 : 6-12 selon la cadence de l\u2019arme.",
            10, Pal::DIM));

        connect(m_pf_on,     &ToggleSwitch::toggled,    this, sync);
        connect(m_pf_trigger,&KeyBindButton::vkChanged, this, sync);
        connect(m_pf_fire,   &KeyBindButton::vkChanged, this, sync);
        connect(m_pf_cps,    &QSlider::valueChanged,    this, sync);
        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  DRIVER STATUS
    // ══════════════════════════════════════════════════════════════════════════
    {
        bool driverOk = InputSender::instance().isDriverActive();

        static int s_did = 0;
        QString dnm = QString("dc%1").arg(++s_did);
        auto* dCard = new QFrame; dCard->setObjectName(dnm);
        dCard->setStyleSheet(QString(
            "#%1{background:%2;border:1px solid %3;border-radius:12px;}")
            .arg(dnm, Pal::CARD.name(), Pal::BORDER.name()));

        auto* dV = new QVBoxLayout(dCard);
        dV->setContentsMargins(18, 12, 18, 14);
        dV->setSpacing(8);

        auto* dHdr = new QHBoxLayout;
        auto* dTl = new QLabel("INPUT DRIVER");
        dTl->setStyleSheet(QString(
            "color:%1;font-size:13px;font-weight:700;background:transparent;")
            .arg(Pal::TEXT.name()));
        dHdr->addWidget(dTl);
        dHdr->addStretch();
        dV->addLayout(dHdr);
        dV->addWidget(sep());

        m_driverLbl = lbl(
            QString::fromStdString(InputSender::instance().statusString()),
            12, driverOk ? Pal::OK : Pal::WARN, true);
        dV->addWidget(m_driverLbl);

        if (!driverOk) {
            auto* btnRow = new QHBoxLayout; btnRow->setSpacing(12);
            m_installBtn = new QPushButton("Installer Interception");
            m_installBtn->setFixedHeight(32);
            m_installBtn->setCursor(Qt::PointingHandCursor);
            m_installBtn->setStyleSheet(QString(
                "QPushButton{background:%1;color:#000;border:none;"
                "border-radius:6px;padding:0 18px;font-size:12px;font-weight:700;}"
                "QPushButton:hover{background:%2;}"
                "QPushButton:disabled{background:%3;color:%4;}")
                .arg(Pal::ACCENT.name(), Pal::ACCENT_H.name(),
                     Pal::FRAME.name(), Pal::DIM.name()));

            connect(m_installBtn, &QPushButton::clicked, this, [this]() {
                QString src = QCoreApplication::applicationDirPath()
                              + "/install-interception.exe";
                if (!QFile::exists(src)) {
                    QMessageBox::warning(this, "Installeur introuvable",
                        "install-interception.exe est introuvable.");
                    return;
                }
                QString tmp = QStandardPaths::writableLocation(
                                  QStandardPaths::TempLocation)
                              + "/install-interception.exe";
                if (QFile::exists(tmp)) QFile::remove(tmp);
                if (!QFile::copy(src, tmp)) {
                    QMessageBox::critical(this, "Erreur",
                        "Impossible de copier l\u2019installeur vers %TEMP%.");
                    return;
                }
                m_installBtn->setEnabled(false);
                m_installBtn->setText("Installation\u2026");
#ifdef _WIN32
                SHELLEXECUTEINFOW sei = {};
                sei.cbSize       = sizeof(sei);
                sei.fMask        = SEE_MASK_NOCLOSEPROCESS;
                sei.lpVerb       = L"runas";
                sei.lpFile       = reinterpret_cast<LPCWSTR>(tmp.utf16());
                sei.lpParameters = L"/install";
                sei.nShow        = SW_SHOW;
                if (!ShellExecuteExW(&sei) || !sei.hProcess) {
                    QFile::remove(tmp);
                    m_installBtn->setEnabled(true);
                    m_installBtn->setText("Installer Interception");
                    QMessageBox::warning(this, "Annul\u00e9",
                        "Installation annul\u00e9e ou droits refus\u00e9s.");
                    return;
                }
                HANDLE hProc = sei.hProcess;
                std::thread([this, hProc, tmp]() {
                    DWORD exitCode = 1;
                    WaitForSingleObject(hProc, INFINITE);
                    GetExitCodeProcess(hProc, &exitCode);
                    CloseHandle(hProc);
                    QFile::remove(tmp);
                    QMetaObject::invokeMethod(this, [this, exitCode]() {
                        if (exitCode == 0) {
                            QMessageBox::information(this, "Driver install\u00e9",
                                "Interception install\u00e9 avec succ\u00e8s.\n\n"
                                "Red\u00e9marrez Windows puis relancez l\u2019application.");
                        } else {
                            m_installBtn->setEnabled(true);
                            m_installBtn->setText("Installer Interception");
                            QMessageBox::critical(this, "\u00c9chec",
                                "Installation \u00e9chou\u00e9e (code "
                                + QString::number(exitCode) + ").");
                        }
                    }, Qt::QueuedConnection);
                }).detach();
#endif
            });
            btnRow->addWidget(m_installBtn);
            btnRow->addWidget(lbl(
                "Acceptez l\u2019invite UAC \u2014 red\u00e9marrage requis.",
                10, Pal::DIM));
            btnRow->addStretch();
            dV->addLayout(btnRow);
        }
        bodyV->addWidget(dCard);
    }

    bodyV->addWidget(lbl(
        "Cliquer sur la carte pour d\u00e9rouler.  "
        "Cliquer sur un bind puis appuyer la touche.  "
        "Echap = annuler.  "
        "Fortnite doit \u00eatre en fen\u00eatr\u00e9 sans bordures.",
        10, Pal::DIM));
    bodyV->addStretch();
    scroll->setWidget(body);
    root->addWidget(scroll, 1);
}

// ── syncEngine ────────────────────────────────────────────────────────────────
void MacroPage::syncEngine() {
    // Global
    MacroEngine::GlobalCfg global;
    global.masterToggleVK = m_gs_masterKey->vk();
    m_engine->setGlobal(global);

    // Double Edit
    MacroEngine::DoubleEditCfg de;
    de.enabled       = m_de_on->isChecked();
    de.triggerVK     = m_de_trigger->vk();
    de.editVK        = m_de_edit->vk();
    de.confirmVK     = m_de_confirm->vk();
    de.delayMs       = m_de_delay->value();
    de.repeatDelayMs = m_de_repeatDelay->value();
    m_engine->setDoubleEdit(de);

    // Drag Edit
    MacroEngine::DragEditCfg drag;
    drag.enabled   = m_drag_on->isChecked();
    drag.triggerVK = m_drag_trigger->vk();
    drag.editVK    = m_drag_edit->vk();
    drag.resetVK   = m_drag_reset->vk();
    drag.holdVK    = m_drag_hold->vk();
    drag.delayMs   = m_drag_delay->value();
    m_engine->setDragEdit(drag);

    // Shotgun Pullout
    MacroEngine::ShotgunPulloutCfg shot;
    shot.enabled   = m_shot_on->isChecked();
    shot.watchVK   = m_shot_watch->vk();
    shot.shotgunVK = m_shot_key->vk();
    shot.delayMs   = m_shot_delay->value();
    m_engine->setShotgunPullout(shot);

    // Auto Build
    MacroEngine::AutoBuildCfg ab;
    ab.enabled   = m_build_on->isChecked();
    ab.triggerVK = m_build_trigger->vk();
    ab.holdVK    = m_build_hold->vk();
    m_engine->setAutoBuild(ab);

    // Pick Up
    MacroEngine::PickUpCfg pu;
    pu.enabled   = m_pu_on->isChecked();
    pu.triggerVK = m_pu_trigger->vk();
    pu.pickupVK  = m_pu_key->vk();
    pu.cps       = m_pu_cps->value();
    m_engine->setPickUp(pu);

    // Single Edit
    MacroEngine::SingleEditCfg se;
    se.enabled    = m_se_on->isChecked();
    se.triggerVK  = m_se_trigger->vk();
    se.editVK     = m_se_edit->vk();
    se.confirmVK  = m_se_confirm->vk();
    se.delayMs    = m_se_delay->value();
    se.holdToSpam = m_se_holdSpam->isChecked();
    se.spamCps    = m_se_spamCps->value();
    m_engine->setSingleEdit(se);

    // Instant Build Spam
    MacroEngine::InstantBuildSpamCfg ib;
    ib.enabled   = m_ib_on->isChecked();
    ib.placeVK   = m_ib_place->vk();
    ib.delayMs   = m_ib_delay->value();
    ib.cps       = m_ib_cps->value();
    ib.wallOn    = m_ib_wallOn->isChecked();  ib.wallVK  = m_ib_wallKey->vk();
    ib.rampOn    = m_ib_rampOn->isChecked();  ib.rampVK  = m_ib_rampKey->vk();
    ib.floorOn   = m_ib_floorOn->isChecked(); ib.floorVK = m_ib_floorKey->vk();
    ib.coneOn    = m_ib_coneOn->isChecked();  ib.coneVK  = m_ib_coneKey->vk();
    m_engine->setInstantBuildSpam(ib);

    // Item Pullout
    MacroEngine::ItemPulloutCfg ip;
    ip.enabled       = m_ip_on->isChecked();
    ip.itemVK        = m_ip_item->vk();
    ip.afterEdit     = m_ip_afterEdit->isChecked();
    ip.editConfirmVK = m_ip_editConfirm->vk();
    ip.afterBuild    = m_ip_afterBuild->isChecked();
    ip.buildPlaceVK  = m_ip_buildPlace->vk();
    ip.delayMs       = m_ip_delay->value();
    m_engine->setItemPullout(ip);

    // Wall Retake
    MacroEngine::WallRetakeCfg wr;
    wr.enabled   = m_wr_on->isChecked();
    wr.triggerVK = m_wr_trigger->vk();
    wr.buildVK   = m_wr_build->vk();
    wr.wallVK    = m_wr_wall->vk();
    wr.placeVK   = m_wr_place->vk();
    wr.cps       = m_wr_cps->value();
    m_engine->setWallRetake(wr);

    // Prefire
    MacroEngine::PrefireCfg pf;
    pf.enabled   = m_pf_on->isChecked();
    pf.triggerVK = m_pf_trigger->vk();
    pf.fireVK    = m_pf_fire->vk();
    pf.cps       = m_pf_cps->value();
    m_engine->setPrefire(pf);

    // ── Status label ──────────────────────────────────
    QStringList active;
    if (de.enabled)   active << "DOUBLE EDIT";
    if (drag.enabled) active << "DRAG EDIT";
    if (shot.enabled) active << "SHOTGUN";
    if (ab.enabled)   active << "AUTO BUILD";
    if (pu.enabled)   active << "PICK UP";
    if (se.enabled)   active << "SINGLE EDIT";
    if (ib.enabled)   active << "INSTANT BUILD";
    if (ip.enabled)   active << "ITEM PULLOUT";
    if (wr.enabled)   active << "WALL RETAKE";
    if (pf.enabled)   active << "PREFIRE";

    if (!active.isEmpty())
        setStatus(active.join("  |  "), Pal::ACCENT);
    else
        setStatus("Moteur actif  \u2014  aucun macro arm\u00e9", Pal::OK);

    // ── Update keyboard overlay ───────────────────────
    updateKeyboard();
}

// ── updateKeyboard ────────────────────────────────────────────────────────────
void MacroPage::updateKeyboard()
{
    static const QColor COLORS[9] = {
        QColor(0x7C,0x3A,0xED),  //  0. Double Edit  — violet
        QColor(0x25,0x63,0xEB),  //  1. Drag Edit    — blue
        QColor(0xDC,0x26,0x26),  //  2. Shotgun      — red
        QColor(0xD9,0x77,0x06),  //  3. Auto Build   — amber
        QColor(0x05,0x96,0x69),  //  4. Pick Up      — green
        QColor(0x93,0x33,0xEA),  //  5. Single Edit  — purple
        QColor(0x0E,0xA5,0xE9),  //  6. Instant Build — sky
        QColor(0xF5,0x9E,0x0B),  //  7. Wall Retake  — amber
        QColor(0xEF,0x44,0x44),  //  8. Prefire      — rose
    };

    // Instant Build : affiche chaque touche de pièce activée
    struct Entry { int vk; const char* name; int ci; };
    const Entry entries[] = {
        {m_de_trigger->vk(),                "Double Edit",   0},
        {m_drag_trigger->vk(),              "Drag Edit",     1},
        {m_shot_watch->vk(),                "Shotgun",       2},
        {m_build_trigger->vk(),             "Auto Build",    3},
        {m_pu_trigger->vk(),                "Pick Up",       4},
        {m_se_trigger->vk(),                "Single Edit",   5},
        {m_ib_wallOn->isChecked()  ? m_ib_wallKey->vk()  : 0, "IB Mur",   6},
        {m_ib_rampOn->isChecked()  ? m_ib_rampKey->vk()  : 0, "IB Rampe", 6},
        {m_ib_floorOn->isChecked() ? m_ib_floorKey->vk() : 0, "IB Sol",   6},
        {m_ib_coneOn->isChecked()  ? m_ib_coneKey->vk()  : 0, "IB C\xc3\xb4ne", 6},
        {m_wr_trigger->vk(),                "Wall Retake",   7},
        {m_pf_trigger->vk(),                "Prefire",       8},
    };

    QMap<int, VirtualKeyboard::BindInfo> binds;
    for (const auto& e : entries) {
        if (e.vk > 0 && !binds.contains(e.vk))
            binds.insert(e.vk, {QString::fromUtf8(e.name), COLORS[e.ci]});
    }
    m_keyboard->setBindings(binds);
}

// ── setStatus ─────────────────────────────────────────────────────────────────
void MacroPage::setStatus(const QString& msg, const QColor& col) {
    m_statusLbl->setText(msg);
    m_statusLbl->setStyleSheet(QString(
        "color:%1;font-size:11px;font-weight:700;background:transparent;"
        "letter-spacing:0.3px;")
        .arg(col.name()));
}

// ── applyEditKey — copie la touche dans tous les edit binds ───────────────────
void MacroPage::applyEditKey(int vk) {
    m_de_edit->setVK(vk);
    m_drag_edit->setVK(vk);
    m_se_edit->setVK(vk);
    syncEngine();
}

// ── applyConfirmKey — copie la touche dans tous les confirm/place binds ───────
void MacroPage::applyConfirmKey(int vk) {
    m_de_confirm->setVK(vk);
    m_se_confirm->setVK(vk);
    m_ib_place->setVK(vk);
    m_wr_place->setVK(vk);
    syncEngine();
}
