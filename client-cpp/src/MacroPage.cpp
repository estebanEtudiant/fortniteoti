// ══════════════════════════════════════════════════════
//  MacroPage.cpp
// ══════════════════════════════════════════════════════
#include "MacroPage.h"
#include "Palette.h"
#include "InputSender.h"
#include "KeyBindButton.h"

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
//  Style helpers
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

static QString toggleSS() {
    return QString(
        "QCheckBox{color:%1;font-size:13px;font-weight:700;"
        "  background:transparent;spacing:10px;}"
        "QCheckBox::indicator{width:36px;height:20px;border-radius:10px;"
        "  background:%2;border:1px solid %3;}"
        "QCheckBox::indicator:checked{background:%4;border-color:%4;}")
        .arg(Pal::TEXT.name(), Pal::FRAME.name(),
             Pal::BORDER.name(), Pal::ACCENT.name());
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

// Separator line
static QFrame* sep() {
    auto* f = new QFrame;
    f->setFrameShape(QFrame::NoFrame);
    f->setFixedHeight(1);
    f->setStyleSheet(QString("background:%1;border:none;").arg(Pal::BORDER.name()));
    return f;
}

// Slider + live value label (returns container, writes slider ptr)
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

// Card container with left accent bar + title/description in header
static QFrame* mkCard(const QString& title, const QString& desc,
                       QCheckBox* enableToggle = nullptr) {
    static int s_id = 0;
    QString name = QString("mpc%1").arg(++s_id);

    auto* card = new QFrame; card->setObjectName(name);
    card->setStyleSheet(QString(
        "#%1{background:%2;border:1px solid %3;border-radius:12px;}")
        .arg(name, Pal::CARD.name(), Pal::BORDER.name()));

    auto* outer = new QVBoxLayout(card);
    outer->setContentsMargins(0, 0, 0, 0);
    outer->setSpacing(0);

    // ── Header row ────────────────────────────────────
    auto* hdrW = new QWidget; hdrW->setStyleSheet("background:transparent;");
    auto* hdrH = new QHBoxLayout(hdrW);
    hdrH->setContentsMargins(0, 0, 0, 0); hdrH->setSpacing(0);

    // Left accent bar
    auto* bar = new QFrame;
    bar->setFixedWidth(3);
    bar->setStyleSheet(QString("background:%1;border:none;"
        "border-top-left-radius:12px;border-bottom-left-radius:0px;")
        .arg(Pal::ACCENT.name()));
    hdrH->addWidget(bar);

    // Title + description
    auto* tv = new QVBoxLayout; tv->setSpacing(3);
    tv->setContentsMargins(16, 14, 16, 14);

    auto* tl = new QLabel(title);
    tl->setStyleSheet(QString(
        "color:%1;font-size:13px;font-weight:700;letter-spacing:0.5px;"
        "background:transparent;")
        .arg(Pal::TEXT.name()));
    tv->addWidget(tl);

    if (!desc.isEmpty()) {
        auto* dl = new QLabel(desc);
        dl->setWordWrap(true);
        dl->setStyleSheet(QString(
            "color:%1;font-size:11px;background:transparent;line-height:150%;")
            .arg(Pal::DIM.name()));
        tv->addWidget(dl);
    }

    hdrH->addLayout(tv, 1);

    // Enable toggle right-aligned
    if (enableToggle) {
        enableToggle->setStyleSheet(toggleSS());
        enableToggle->setText("");
        auto* rw = new QWidget; rw->setStyleSheet("background:transparent;");
        auto* rl = new QHBoxLayout(rw);
        rl->setContentsMargins(0, 0, 16, 0);
        rl->addWidget(enableToggle);
        hdrH->addWidget(rw);
    }

    outer->addWidget(hdrW);
    outer->addWidget(sep());

    // ── Body (controls) ───────────────────────────────
    auto* body = new QWidget; body->setStyleSheet("background:transparent;");
    auto* bodyV = new QVBoxLayout(body);
    bodyV->setContentsMargins(18, 14, 18, 16);
    bodyV->setSpacing(11);
    outer->addWidget(body);

    // Store bodyV in body so callers can retrieve it
    body->setProperty("vl", QVariant::fromValue(static_cast<QObject*>(bodyV)));
    card->setProperty("body", QVariant::fromValue(static_cast<QObject*>(body)));

    return card;
}

// Get the body layout of a card
static QVBoxLayout* cardBody(QFrame* card) {
    auto* body = qobject_cast<QWidget*>(
        card->property("body").value<QObject*>());
    if (!body) return nullptr;
    return qobject_cast<QVBoxLayout*>(
        body->property("vl").value<QObject*>());
}

// Setting row: label (fixed) + widget + hint
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

// Slider row (full width)
static void sliderRow(QVBoxLayout* vl, const QString& label,
                       QWidget* sliderW) {
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

// Sub-toggle row (indented)
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

// ══════════════════════════════════════════════════════════════════════════════
//  MacroPage
// ══════════════════════════════════════════════════════════════════════════════
MacroPage::MacroPage(QWidget* parent) : QWidget(parent) {
    m_engine = new MacroEngine(this);
    InputSender::instance().init();
    buildUi();
    m_engine->startEngine();

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
    tv->addWidget(lbl("Double Edit  |  Drag Edit  |  Shotgun  |  Auto Build  |  Pick Up",
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

    // ══════════════════════════════════════════════════════════════════════════
    //  1. DOUBLE EDIT
    // ══════════════════════════════════════════════════════════════════════════
    {
        m_de_on = new QCheckBox;
        auto* card = mkCard("DOUBLE EDIT",
            "Trigger press  →  Edit  →  Confirm  x2.  "
            "Automatise deux confirmations d'edit en une seule touche.",
            m_de_on);
        auto* cl = cardBody(card);

        m_de_trigger = new KeyBindButton('G');
        m_de_edit    = new KeyBindButton('G');
        m_de_confirm = new KeyBindButton(0x01);

        row(cl, "Trigger",      m_de_trigger, "clic pour rebind");
        row(cl, "Edit key",     m_de_edit);
        row(cl, "Confirm key",  m_de_confirm, "ignor\u00e9 si Edit on Release");

        cl->addWidget(sep());

        auto* delW = mkSlider(50, 10, 300, " ms",
                               &m_de_delay, &m_de_delayLbl);
        sliderRow(cl, "Delay", delW);

        cl->addWidget(sep());

        m_de_editOnRel = new QCheckBox(
            "Edit on Release  \u2014  rel\u00e2cher Edit confirme");
        subRow(cl, m_de_editOnRel, nullptr,
               "Param\u00e8tres Fortnite \u2192 Confirmer l'\u00e9dition \u00e0 la sortie");
        cl->addWidget(lbl(
            "Delay recommand\u00e9 : 50-100 ms. En dessous de 30 ms "
            "Fortnite peut rater des inputs.",
            10, Pal::DIM));

        cl->addWidget(sep());

        m_de_sprint  = new QCheckBox("Sprint pendant la s\u00e9quence");
        m_de_sprintK = new KeyBindButton(0x10);
        m_de_crouch  = new QCheckBox("Crouch pendant la s\u00e9quence");
        m_de_crouchK = new KeyBindButton('C');

        subRow(cl, m_de_sprint, m_de_sprintK);
        subRow(cl, m_de_crouch, m_de_crouchK);

        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  2. DRAG EDIT
    // ══════════════════════════════════════════════════════════════════════════
    {
        m_drag_on = new QCheckBox;
        auto* card = mkCard("DRAG EDIT",
            "① Ouvre l'edit  "
            "② Reset (vide la s\u00e9lection, reste en edit)  "
            "③ Hold key maintenu \u2014 draggez votre souris sur les cases pendant le Drag Delay  "
            "④ Rel\u00e2che \u2192 confirme.",
            m_drag_on);
        auto* cl = cardBody(card);

        m_drag_trigger = new KeyBindButton(0x05);
        m_drag_edit    = new KeyBindButton('G');
        m_drag_reset   = new KeyBindButton('R');
        m_drag_hold    = new KeyBindButton(0x01);

        row(cl, "Trigger",   m_drag_trigger);
        row(cl, "Edit bind", m_drag_edit);
        row(cl, "Reset bind",m_drag_reset);
        row(cl, "Hold key (Confirm)", m_drag_hold);

        cl->addWidget(sep());

        auto* delW = mkSlider(80, 10, 400, " ms",
                               &m_drag_delay, &m_drag_delayLbl);
        sliderRow(cl, "Drag Delay",
                  delW);
        cl->addWidget(lbl(
            "Drag Delay = fen\u00eatre pour passer la souris sur les cases.",
            10, Pal::DIM));

        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  3. SHOTGUN PULLOUT
    // ══════════════════════════════════════════════════════════════════════════
    {
        m_shot_on = new QCheckBox;
        auto* card = mkCard("SHOTGUN PULLOUT",
            "D\u00e8s que Watch key est rel\u00e2ch\u00e9e, sort automatiquement le fusil \u00e0 pompe.",
            m_shot_on);
        auto* cl = cardBody(card);

        m_shot_watch = new KeyBindButton(0x01);
        m_shot_key   = new KeyBindButton('1');

        row(cl, "Watch key", m_shot_watch, "touche \u00e0 surveiller (ex: LMB)");
        row(cl, "Shotgun key", m_shot_key, "slot arme");

        cl->addWidget(sep());

        auto* delW = mkSlider(20, 0, 200, " ms",
                               &m_shot_delay, &m_shot_delayLbl);
        sliderRow(cl, "D\u00e9lai avant switch", delW);

        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  4. AUTO BUILD
    // ══════════════════════════════════════════════════════════════════════════
    {
        m_build_on = new QCheckBox;
        auto* card = mkCard("AUTO BUILD",
            "Toggle ON/OFF via Trigger. Maintient Hold key en continu \u2014 "
            "plus besoin de tenir la touche.",
            m_build_on);
        auto* cl = cardBody(card);

        // Status badge
        auto* badgeRow = new QHBoxLayout;
        badgeRow->setSpacing(8);
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
        row(cl, "Hold key", m_build_hold, "LMB = poser structures");

        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  5. PICK UP
    // ══════════════════════════════════════════════════════════════════════════
    {
        m_pu_on = new QCheckBox;
        auto* card = mkCard("PICK UP",
            "Maintenir Trigger \u2192 spam Pickup key au CPS configur\u00e9. "
            "Fonctionne m\u00eame si Trigger = Pickup key.",
            m_pu_on);
        auto* cl = cardBody(card);

        m_pu_trigger = new KeyBindButton(0x04);
        m_pu_key     = new KeyBindButton('E');

        row(cl, "Trigger (maintenir)", m_pu_trigger);
        row(cl, "Pickup key", m_pu_key);

        cl->addWidget(sep());

        auto* cpsW = mkSlider(10, 1, 30, " CPS",
                               &m_pu_cps, &m_pu_cpsLbl);
        sliderRow(cl, "R\u00e9p\u00e9titions / sec", cpsW);

        bodyV->addWidget(card);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  DRIVER STATUS
    // ══════════════════════════════════════════════════════════════════════════
    {
        bool driverOk = InputSender::instance().isDriverActive();

        auto* card = mkCard("INPUT DRIVER",
            driverOk
                ? "Interception kernel driver actif \u2014 inputs via stack hardware."
                : "Driver non install\u00e9 \u2014 fallback SendInput actif.");

        auto* cl = cardBody(card);

        m_driverLbl = lbl(
            QString::fromStdString(InputSender::instance().statusString()),
            12, driverOk ? Pal::OK : Pal::WARN, true);
        cl->addWidget(m_driverLbl);

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
                // 1. Source : virtual FS d'Enigma VB ou dossier réel à côté de l'exe
                QString src = QCoreApplication::applicationDirPath()
                              + "/install-interception.exe";
                if (!QFile::exists(src)) {
                    QMessageBox::warning(this, "Installeur introuvable",
                        "install-interception.exe est introuvable.\n"
                        "V\u00e9rifiez qu'il est bien embed dans Enigma VB.");
                    return;
                }

                // 2. Copie vers un vrai chemin disque (%TEMP%)
                //    Obligatoire : Enigma VB virtual FS ≠ chemin r\u00e9el,
                //    le noyau Windows ne peut pas lancer un exe virtuel.
                QString tmp = QStandardPaths::writableLocation(
                                  QStandardPaths::TempLocation)
                              + "/install-interception.exe";
                if (QFile::exists(tmp)) QFile::remove(tmp);
                if (!QFile::copy(src, tmp)) {
                    QMessageBox::critical(this, "Erreur",
                        "Impossible de copier l'installeur vers %TEMP%.\n"
                        "Lancez l'application en tant qu'administrateur.");
                    return;
                }

                m_installBtn->setEnabled(false);
                m_installBtn->setText("Installation\u2026");

#ifdef _WIN32
                // 3. ShellExecuteEx "runas" = d\u00e9clenche l'UAC pour avoir les droits admin
                //    n\u00e9cessaires pour installer un driver kernel (.sys)
                SHELLEXECUTEINFOW sei = {};
                sei.cbSize       = sizeof(sei);
                sei.fMask        = SEE_MASK_NOCLOSEPROCESS;
                sei.lpVerb       = L"runas";
                sei.lpFile       = reinterpret_cast<LPCWSTR>(tmp.utf16());
                sei.lpParameters = L"/install";
                sei.nShow        = SW_SHOW;

                if (!ShellExecuteExW(&sei) || !sei.hProcess) {
                    // L'utilisateur a refus\u00e9 l'UAC ou erreur
                    QFile::remove(tmp);
                    m_installBtn->setEnabled(true);
                    m_installBtn->setText("Installer Interception");
                    QMessageBox::warning(this, "Annul\u00e9",
                        "Installation annul\u00e9e ou droits refus\u00e9s.\n"
                        "Acceptez l'invite UAC pour installer le driver.");
                    return;
                }

                // 4. Attendre la fin du process dans un thread d\u00e9tach\u00e9
                HANDLE hProc = sei.hProcess;
                std::thread([this, hProc, tmp]() {
                    DWORD exitCode = 1;
                    WaitForSingleObject(hProc, INFINITE);
                    GetExitCodeProcess(hProc, &exitCode);
                    CloseHandle(hProc);
                    QFile::remove(tmp); // nettoyage temp

                    QMetaObject::invokeMethod(this, [this, exitCode]() {
                        if (exitCode == 0) {
                            QMessageBox::information(this, "Driver install\u00e9",
                                "Interception install\u00e9 avec succ\u00e8s.\n\n"
                                "Red\u00e9marrez Windows puis relancez l'application.");
                        } else {
                            m_installBtn->setEnabled(true);
                            m_installBtn->setText("Installer Interception");
                            QMessageBox::critical(this, "\u00c9chec",
                                "Installation \u00e9chou\u00e9e (code "
                                + QString::number(exitCode) + ").\n"
                                "Assurez-vous d'accepter l'UAC.");
                        }
                    }, Qt::QueuedConnection);
                }).detach();
#else
                // Fallback non-Windows (ne devrait pas arriver)
                QFile::remove(tmp);
                m_installBtn->setEnabled(true);
                m_installBtn->setText("Installer Interception");
                QMessageBox::critical(this, "Non support\u00e9",
                    "L'installation Interception n\u00e9cessite Windows.");
#endif
            });

            btnRow->addWidget(m_installBtn);
            btnRow->addWidget(lbl(
                "Acceptez l'invite UAC \u2014 red\u00e9marrage requis apr\u00e8s.",
                10, Pal::DIM));
            btnRow->addStretch();
            cl->addLayout(btnRow);
        }

        bodyV->addWidget(card);
    }

    // ── Hint ──────────────────────────────────────────────────────────────────
    bodyV->addWidget(lbl(
        "Cliquez sur un bind puis appuyez sur la touche.  "
        "Echap = annuler.  "
        "Fortnite doit \u00eatre en fen\u00eadr\u00e9 sans bordures.",
        10, Pal::DIM));

    bodyV->addStretch();
    scroll->setWidget(body);
    root->addWidget(scroll, 1);

    // ── Connexions ────────────────────────────────────────────────────────────
    auto sync = [this]() { syncEngine(); };

    connect(m_de_on,       &QCheckBox::toggled,        this, sync);
    connect(m_de_trigger,  &KeyBindButton::vkChanged,  this, sync);
    connect(m_de_edit,     &KeyBindButton::vkChanged,  this, sync);
    connect(m_de_confirm,  &KeyBindButton::vkChanged,  this, sync);
    connect(m_de_delay,    &QSlider::valueChanged,     this, sync);
    connect(m_de_editOnRel,&QCheckBox::toggled,        this, sync);
    connect(m_de_sprint,   &QCheckBox::toggled,        this, sync);
    connect(m_de_sprintK,  &KeyBindButton::vkChanged,  this, sync);
    connect(m_de_crouch,   &QCheckBox::toggled,        this, sync);
    connect(m_de_crouchK,  &KeyBindButton::vkChanged,  this, sync);

    connect(m_drag_on,      &QCheckBox::toggled,       this, sync);
    connect(m_drag_trigger, &KeyBindButton::vkChanged, this, sync);
    connect(m_drag_edit,    &KeyBindButton::vkChanged, this, sync);
    connect(m_drag_reset,   &KeyBindButton::vkChanged, this, sync);
    connect(m_drag_hold,    &KeyBindButton::vkChanged, this, sync);
    connect(m_drag_delay,   &QSlider::valueChanged,    this, sync);

    connect(m_shot_on,    &QCheckBox::toggled,         this, sync);
    connect(m_shot_watch, &KeyBindButton::vkChanged,   this, sync);
    connect(m_shot_key,   &KeyBindButton::vkChanged,   this, sync);
    connect(m_shot_delay, &QSlider::valueChanged,      this, sync);

    connect(m_build_on,      &QCheckBox::toggled,      this, sync);
    connect(m_build_trigger, &KeyBindButton::vkChanged,this, sync);
    connect(m_build_hold,    &KeyBindButton::vkChanged,this, sync);

    connect(m_pu_on,      &QCheckBox::toggled,         this, sync);
    connect(m_pu_trigger, &KeyBindButton::vkChanged,   this, sync);
    connect(m_pu_key,     &KeyBindButton::vkChanged,   this, sync);
    connect(m_pu_cps,     &QSlider::valueChanged,      this, sync);
}

// ── syncEngine ────────────────────────────────────────────────────────────────
void MacroPage::syncEngine() {
    MacroEngine::DoubleEditCfg de;
    de.enabled       = m_de_on->isChecked();
    de.triggerVK     = m_de_trigger->vk();
    de.editVK        = m_de_edit->vk();
    de.confirmVK     = m_de_confirm->vk();
    de.delayMs       = m_de_delay->value();
    de.editOnRelease = m_de_editOnRel->isChecked();
    de.useSprint     = m_de_sprint->isChecked();
    de.sprintVK      = m_de_sprintK->vk();
    de.useCrouch     = m_de_crouch->isChecked();
    de.crouchVK      = m_de_crouchK->vk();
    m_engine->setDoubleEdit(de);

    MacroEngine::DragEditCfg drag;
    drag.enabled   = m_drag_on->isChecked();
    drag.triggerVK = m_drag_trigger->vk();
    drag.editVK    = m_drag_edit->vk();
    drag.resetVK   = m_drag_reset->vk();
    drag.holdVK    = m_drag_hold->vk();
    drag.delayMs   = m_drag_delay->value();
    m_engine->setDragEdit(drag);

    MacroEngine::ShotgunPulloutCfg shot;
    shot.enabled   = m_shot_on->isChecked();
    shot.watchVK   = m_shot_watch->vk();
    shot.shotgunVK = m_shot_key->vk();
    shot.delayMs   = m_shot_delay->value();
    m_engine->setShotgunPullout(shot);

    MacroEngine::AutoBuildCfg ab;
    ab.enabled   = m_build_on->isChecked();
    ab.triggerVK = m_build_trigger->vk();
    ab.holdVK    = m_build_hold->vk();
    m_engine->setAutoBuild(ab);

    MacroEngine::PickUpCfg pu;
    pu.enabled   = m_pu_on->isChecked();
    pu.triggerVK = m_pu_trigger->vk();
    pu.pickupVK  = m_pu_key->vk();
    pu.cps       = m_pu_cps->value();
    m_engine->setPickUp(pu);

    QStringList active;
    if (de.enabled)   active << "DOUBLE EDIT";
    if (drag.enabled) active << "DRAG EDIT";
    if (shot.enabled) active << "SHOTGUN";
    if (ab.enabled)   active << "AUTO BUILD";
    if (pu.enabled)   active << "PICK UP";

    if (!active.isEmpty())
        setStatus(active.join("  |  "), Pal::ACCENT);
    else
        setStatus("Moteur actif  \u2014  aucun macro arm\u00e9", Pal::OK);
}

void MacroPage::setStatus(const QString& msg, const QColor& col) {
    m_statusLbl->setText(msg);
    m_statusLbl->setStyleSheet(QString(
        "color:%1;font-size:11px;font-weight:700;background:transparent;"
        "letter-spacing:0.3px;")
        .arg(col.name()));
}