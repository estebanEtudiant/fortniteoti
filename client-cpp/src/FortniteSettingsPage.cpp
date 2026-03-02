// ══════════════════════════════════════════════════════
//  FortniteSettingsPage.cpp
// ══════════════════════════════════════════════════════
#include "FortniteSettingsPage.h"
#include "Palette.h"

#include <QScrollArea>
#include <QFrame>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFileDialog>
#include <QFileInfo>
#include <QDir>
#include <QFile>
#include <QTextStream>

// ── Local helpers ─────────────────────────────────────────────────────────────

static QLabel* fl(const QString& t, int px, const QColor& c, bool bold = false) {
    auto* l = new QLabel(t);
    l->setStyleSheet(QString("color:%1;background:transparent;font-size:%2px;%3")
        .arg(c.name()).arg(px).arg(bold ? "font-weight:700;" : ""));
    return l;
}

static QFrame* makeCard(const QString& title = {}) {
    auto* card = new QFrame;
    static int s_id = 0;
    QString name = QString("ftn_card_%1").arg(++s_id);
    card->setObjectName(name);
    card->setStyleSheet(QString(
        "#%1{background:%2;border:1px solid %3;border-radius:10px;}")
        .arg(name, Pal::CARD.name(), Pal::BORDER.name()));
    auto* v = new QVBoxLayout(card);
    v->setContentsMargins(18, 14, 18, 16);
    v->setSpacing(10);
    if (!title.isEmpty()) {
        auto* hdr = new QLabel(title);
        hdr->setStyleSheet(QString(
            "color:%1;font-size:13px;font-weight:700;background:transparent;")
            .arg(Pal::TEXT.name()));
        v->addWidget(hdr);
        auto* sep = new QFrame;
        sep->setFrameShape(QFrame::NoFrame);
        sep->setStyleSheet(QString("background:%1;border:none;").arg(Pal::BORDER.name()));
        sep->setFixedHeight(1);
        v->addWidget(sep);
    }
    return card;
}

static QComboBox* makeQCombo() {
    auto* c = new QComboBox;
    c->setFixedHeight(30);
    c->setStyleSheet(QString(
        "QComboBox{background:%1;color:%2;border:1px solid %3;border-radius:6px;"
        "padding:4px 10px;font-size:12px;}"
        "QComboBox::drop-down{border:none;}"
        "QComboBox QAbstractItemView{background:%1;color:%2;border:1px solid %3;}")
        .arg(Pal::CARD2.name(), Pal::TEXT.name(), Pal::BORDER.name()));
    return c;
}

static QLineEdit* makeEdit(const QString& placeholder = {}) {
    auto* e = new QLineEdit;
    e->setPlaceholderText(placeholder);
    e->setFixedHeight(30);
    e->setStyleSheet(QString(
        "QLineEdit{background:%1;color:%2;border:1px solid %3;border-radius:6px;"
        "padding:0 10px;font-size:12px;}"
        "QLineEdit:focus{border:1px solid %4;}")
        .arg(Pal::CARD2.name(), Pal::TEXT.name(), Pal::BORDER.name(), Pal::ACCENT.name()));
    return e;
}

static QCheckBox* makeCB(const QString& label) {
    auto* cb = new QCheckBox(label);
    cb->setStyleSheet(QString(
        "QCheckBox{font-size:12px;color:%1;background:transparent;spacing:8px;}"
        "QCheckBox::indicator{width:16px;height:16px;border:1px solid %2;"
        "border-radius:3px;background:%3;}"
        "QCheckBox::indicator:checked{background:%4;border-color:%4;}")
        .arg(Pal::TEXT.name(), Pal::BORDER.name(), Pal::CARD2.name(), Pal::ACCENT.name()));
    return cb;
}

static QPushButton* makeBtn(const QString& text, const QColor& bg, const QColor& hov,
                             bool darkText = true) {
    auto* b = new QPushButton(text);
    b->setFixedHeight(34);
    b->setCursor(Qt::PointingHandCursor);
    QString textCol = darkText ? "#000000" : Pal::TEXT.name();
    b->setStyleSheet(QString(
        "QPushButton{background:%1;color:%2;border:none;border-radius:8px;"
        "font-size:12px;font-weight:700;padding:0 16px;}"
        "QPushButton:hover{background:%3;}")
        .arg(bg.name(), textCol, hov.name()));
    return b;
}

static QPushButton* makeSecBtn(const QString& text) {
    auto* b = new QPushButton(text);
    b->setFixedHeight(30);
    b->setCursor(Qt::PointingHandCursor);
    b->setStyleSheet(QString(
        "QPushButton{background:%1;color:%2;border:1px solid %3;border-radius:6px;"
        "font-size:12px;font-weight:600;padding:0 14px;}"
        "QPushButton:hover{background:%4;}")
        .arg(Pal::CARD2.name(), Pal::TEXT.name(), Pal::BORDER.name(), Pal::FRAME.name()));
    return b;
}

// addRow: label (min 170px) + widget + stretch
static void addRow(QVBoxLayout* parent, const QString& label, QWidget* w) {
    auto* h = new QHBoxLayout;
    h->setSpacing(8);
    auto* lbl = fl(label, 12, Pal::DIM);
    lbl->setMinimumWidth(170);
    h->addWidget(lbl);
    h->addWidget(w);
    h->addStretch();
    parent->addLayout(h);
}

// addRow2: two (label+widget) pairs side by side
static void addRow2(QVBoxLayout* parent,
                    const QString& l1, QWidget* w1,
                    const QString& l2, QWidget* w2) {
    auto* h = new QHBoxLayout;
    h->setSpacing(12);
    auto* lbl1 = fl(l1, 12, Pal::DIM);
    lbl1->setMinimumWidth(110);
    w1->setMinimumWidth(110);
    auto* lbl2 = fl(l2, 12, Pal::DIM);
    lbl2->setMinimumWidth(110);
    w2->setMinimumWidth(110);
    h->addWidget(lbl1);
    h->addWidget(w1);
    h->addSpacing(16);
    h->addWidget(lbl2);
    h->addWidget(w2);
    h->addStretch();
    parent->addLayout(h);
}

// ── FortniteSettingsPage ──────────────────────────────────────────────────────

FortniteSettingsPage::FortniteSettingsPage(QWidget* parent) : QWidget(parent) {
    buildUi();
    autoDetectPath();
}

void FortniteSettingsPage::buildUi() {
    auto* mainV = new QVBoxLayout(this);
    mainV->setContentsMargins(0, 0, 0, 0);
    mainV->setSpacing(0);

    // ── Header ────────────────────────────────────────────────────────────────
    auto* hdr = new QWidget;
    hdr->setFixedHeight(72);
    auto* hdrH = new QHBoxLayout(hdr);
    hdrH->setContentsMargins(0, 0, 0, 16);
    auto* titleV = new QVBoxLayout;
    titleV->setSpacing(2);
    titleV->addWidget(fl(u8"\U0001f3ae Fortnite Settings", 18, Pal::TEXT, true));
    titleV->addWidget(fl(u8"Lecture/ecriture directe de GameUserSettings.ini", 11, Pal::DIM));
    hdrH->addLayout(titleV, 1);
    mainV->addWidget(hdr);

    // ── Scroll area ───────────────────────────────────────────────────────────
    auto* scroll = new QScrollArea;
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    scroll->setStyleSheet("background:transparent;border:none;");

    auto* body = new QWidget;
    body->setStyleSheet("background:transparent;");
    auto* bodyV = new QVBoxLayout(body);
    bodyV->setContentsMargins(0, 0, 0, 0);
    bodyV->setSpacing(14);

    // ── Card 1 — Path ─────────────────────────────────────────────────────────
    auto* pathCard = makeCard();
    auto* pathLayout = qobject_cast<QVBoxLayout*>(pathCard->layout());

    m_pathLbl = fl(u8"Aucun fichier detecte", 11, Pal::DIM);
    m_pathLbl->setWordWrap(true);

    auto* browseBtn  = makeSecBtn(u8"Parcourir");
    auto* reloadBtn  = makeSecBtn(u8"\u21bb Recharger");

    auto* row1 = new QHBoxLayout;
    row1->setSpacing(8);
    row1->addWidget(m_pathLbl, 1);
    row1->addWidget(browseBtn);
    row1->addWidget(reloadBtn);
    pathLayout->addLayout(row1);

    m_statusLbl = fl("", 11, Pal::DIM);
    m_saveBtn   = makeBtn(u8"  SAUVEGARDER", Pal::ACCENT, Pal::ACCENT_H);

    auto* row2 = new QHBoxLayout;
    row2->setSpacing(8);
    row2->addWidget(m_statusLbl, 1);
    row2->addWidget(m_saveBtn);
    pathLayout->addLayout(row2);

    connect(browseBtn, &QPushButton::clicked, this, [this]() {
        QString path = QFileDialog::getOpenFileName(
            this,
            u8"Selectionner GameUserSettings.ini",
            m_filePath.isEmpty() ? QString() : QFileInfo(m_filePath).absolutePath(),
            "INI Files (*.ini);;All Files (*)");
        if (!path.isEmpty()) {
            m_filePath = path;
            m_pathLbl->setText(path);
            if (loadFile()) {
                populateUi();
                setStatus(u8"\u2713 Fichier charge", Pal::OK);
            }
        }
    });

    connect(reloadBtn, &QPushButton::clicked, this, [this]() {
        if (m_filePath.isEmpty()) {
            setStatus(u8"\u26a0 Aucun fichier selectionne", Pal::ERR);
            return;
        }
        if (loadFile()) {
            populateUi();
            setStatus(u8"\u2713 Recharge", Pal::OK);
        }
    });

    connect(m_saveBtn, &QPushButton::clicked, this, [this]() {
        if (m_filePath.isEmpty()) {
            setStatus(u8"\u26a0 Aucun fichier selectionne", Pal::ERR);
            return;
        }
        collectUi();
        if (saveFile())
            setStatus(u8"\u2713 Sauvegarde !", Pal::OK);
        else
            setStatus(u8"\u26a0 Erreur d'ecriture", Pal::ERR);
    });

    bodyV->addWidget(pathCard);

    // ── Card 2 — Preset ───────────────────────────────────────────────────────
    auto* presetCard   = makeCard(u8"\u26a1 Preset Competitif");
    auto* presetLayout = qobject_cast<QVBoxLayout*>(presetCard->layout());

    auto* presetDesc = fl(
        u8"Qualite min, V-Sync off, Motion Blur off, FPS 240 — optimal pour le jeu competitif",
        11, Pal::DIM);
    presetDesc->setWordWrap(true);
    presetLayout->addWidget(presetDesc);

    auto* applyPresetBtn = makeBtn(u8"\u26a1  APPLIQUER LE PRESET", Pal::ACCENT, Pal::ACCENT_H);
    auto* presetRow = new QHBoxLayout;
    presetRow->addWidget(applyPresetBtn);
    presetRow->addStretch();
    presetLayout->addLayout(presetRow);

    connect(applyPresetBtn, &QPushButton::clicked, this, [this]() {
        applyPreset();
        if (!m_filePath.isEmpty()) {
            collectUi();
            if (saveFile())
                setStatus(u8"\u2713 Preset applique et sauvegarde !", Pal::OK);
            else
                setStatus(u8"\u26a0 Preset applique — erreur d'ecriture", Pal::WARN);
        } else {
            setStatus(u8"\u26a0 Preset applique — selectionnez un fichier pour sauvegarder",
                      Pal::WARN);
        }
    });

    bodyV->addWidget(presetCard);

    // ── Card 3 — Affichage ────────────────────────────────────────────────────
    auto* dispCard   = makeCard(u8"\U0001f5a5 Affichage");
    auto* dispLayout = qobject_cast<QVBoxLayout*>(dispCard->layout());

    // Resolution
    m_resW = makeEdit("1920");
    m_resH = makeEdit("1080");
    m_resW->setFixedWidth(80);
    m_resH->setFixedWidth(80);
    auto* resRow = new QHBoxLayout;
    resRow->setSpacing(8);
    auto* resLbl = fl(u8"Resolution", 12, Pal::DIM);
    resLbl->setMinimumWidth(170);
    resRow->addWidget(resLbl);
    resRow->addWidget(m_resW);
    resRow->addWidget(fl(u8"\u00d7", 12, Pal::DIM));
    resRow->addWidget(m_resH);
    resRow->addStretch();
    dispLayout->addLayout(resRow);

    m_fsMode = makeQCombo();
    m_fsMode->addItem(u8"Plein ecran");
    m_fsMode->addItem(u8"Sans bordures");
    m_fsMode->addItem(u8"Fenetre");
    m_fsMode->setFixedWidth(160);
    addRow(dispLayout, u8"Mode d'affichage", m_fsMode);

    m_vsync = makeCB(u8"Active");
    addRow(dispLayout, "V-Sync", m_vsync);

    m_fpsLmt = makeEdit("240");
    m_fpsLmt->setFixedWidth(80);
    addRow(dispLayout, u8"Limite FPS", m_fpsLmt);

    bodyV->addWidget(dispCard);

    // ── Card 4 — Qualite Graphique ────────────────────────────────────────────
    auto* qualCard   = makeCard(u8"\U0001f3a8 Qualite Graphique");
    auto* qualLayout = qobject_cast<QVBoxLayout*>(qualCard->layout());

    static const QStringList qualOpts = {
        u8"Desactive / Bas", u8"Moyen", u8"Eleve", u8"Epique"
    };
    auto makeQualCombo = [&]() -> QComboBox* {
        auto* c = makeQCombo();
        c->setFixedWidth(140);
        for (const auto& s : qualOpts) c->addItem(s);
        return c;
    };

    m_shadows  = makeQualCombo();
    m_effects  = makeQualCombo();
    m_postProc = makeQualCombo();
    m_textures = makeQualCombo();
    m_foliage  = makeQualCombo();
    m_aa       = makeQualCombo();
    m_gi       = makeQualCombo();
    m_reflect  = makeQualCombo();

    addRow2(qualLayout, u8"Ombres",          m_shadows,  u8"Anti-Aliasing",  m_aa);
    addRow2(qualLayout, u8"Effets",          m_effects,  u8"GI/Raytracing",  m_gi);
    addRow2(qualLayout, u8"Post-traitement", m_postProc, u8"Reflexions",      m_reflect);
    addRow2(qualLayout, u8"Textures",        m_textures, u8"Feuillage",       m_foliage);

    bodyV->addWidget(qualCard);

    // ── Card 5 — Gameplay ─────────────────────────────────────────────────────
    auto* gameCard   = makeCard(u8"\U0001f3ae Gameplay");
    auto* gameLayout = qobject_cast<QVBoxLayout*>(gameCard->layout());

    m_motionBlur = makeCB(u8"Active");
    addRow(gameLayout, u8"Motion Blur", m_motionBlur);

    m_showFps = makeCB(u8"Affiche");
    addRow(gameLayout, u8"Compteur FPS in-game", m_showFps);

    bodyV->addWidget(gameCard);
    bodyV->addStretch();

    scroll->setWidget(body);
    mainV->addWidget(scroll, 1);
}

// ── Auto-detect ───────────────────────────────────────────────────────────────

void FortniteSettingsPage::autoDetectPath() {
    QString localApp = QString::fromLocal8Bit(qgetenv("LOCALAPPDATA"));
    if (localApp.isEmpty()) {
        setStatus(u8"\u26a0 Fortnite non detecte — utilisez Parcourir", Pal::WARN);
        return;
    }
    QString candidate = localApp
        + "/FortniteGame/Saved/Config/WindowsClient/GameUserSettings.ini";
    candidate = QDir::toNativeSeparators(candidate);
    if (QFileInfo::exists(candidate)) {
        m_filePath = candidate;
        m_pathLbl->setText(candidate);
        if (loadFile()) {
            populateUi();
            setStatus(u8"\u2713 Fichier detecte et charge", Pal::OK);
        }
    } else {
        setStatus(u8"\u26a0 Fortnite non detecte — utilisez Parcourir", Pal::WARN);
    }
}

// ── INI load ─────────────────────────────────────────────────────────────────

bool FortniteSettingsPage::loadFile() {
    QFile f(m_filePath);
    if (!f.open(QIODevice::ReadOnly | QIODevice::Text)) {
        setStatus(u8"\u26a0 Impossible d'ouvrir le fichier", Pal::ERR);
        return false;
    }
    m_rawLines.clear();
    m_values.clear();

    static const QString TARGET_SECTION =
        "[/Script/FortniteGame.FortGameUserSettings]";
    bool inSection = false;

    QTextStream in(&f);
    in.setEncoding(QStringConverter::Utf8);
    while (!in.atEnd()) {
        QString line = in.readLine();
        m_rawLines << line;
        QString trimmed = line.trimmed();
        if (trimmed.startsWith('[')) {
            inSection = (trimmed == TARGET_SECTION);
            continue;
        }
        if (inSection && trimmed.contains('=')) {
            int eq = trimmed.indexOf('=');
            QString key = trimmed.left(eq).trimmed();
            QString val = trimmed.mid(eq + 1).trimmed();
            if (!m_values.contains(key))   // first occurrence only
                m_values[key] = val;
        }
    }
    return true;
}

// ── INI save ─────────────────────────────────────────────────────────────────

bool FortniteSettingsPage::saveFile() {
    QMap<QString, bool> written;
    for (auto it = m_values.constBegin(); it != m_values.constEnd(); ++it)
        written[it.key()] = false;

    static const QString TARGET_SECTION =
        "[/Script/FortniteGame.FortGameUserSettings]";
    bool inSection = false;
    QStringList outLines;

    for (const QString& line : m_rawLines) {
        QString trimmed = line.trimmed();

        if (trimmed.startsWith('[')) {
            // Leaving the target section — flush keys not yet written
            if (inSection) {
                for (auto it = m_values.constBegin(); it != m_values.constEnd(); ++it) {
                    if (!written[it.key()]) {
                        outLines << (it.key() + "=" + it.value());
                        written[it.key()] = true;
                    }
                }
            }
            inSection = (trimmed == TARGET_SECTION);
            outLines << line;
            continue;
        }

        if (inSection && trimmed.contains('=')) {
            int eq = trimmed.indexOf('=');
            QString key = trimmed.left(eq).trimmed();
            if (m_values.contains(key)) {
                outLines << (key + "=" + m_values[key]);
                written[key] = true;
                continue;
            }
        }
        outLines << line;
    }

    // If the target section was the last in the file, flush remaining keys
    if (inSection) {
        for (auto it = m_values.constBegin(); it != m_values.constEnd(); ++it) {
            if (!written[it.key()])
                outLines << (it.key() + "=" + it.value());
        }
    }

    QFile f(m_filePath);
    if (!f.open(QIODevice::WriteOnly | QIODevice::Text | QIODevice::Truncate))
        return false;

    QTextStream out(&f);
    out.setEncoding(QStringConverter::Utf8);
    for (const QString& l : outLines)
        out << l << "\n";
    return true;
}

// ── Populate UI from m_values ─────────────────────────────────────────────────

void FortniteSettingsPage::populateUi() {
    m_resW->setText(getVal("ResolutionSizeX", "1920"));
    m_resH->setText(getVal("ResolutionSizeY", "1080"));

    bool ok = false;
    int fs = getVal("FullscreenMode", "1").toInt(&ok);
    m_fsMode->setCurrentIndex((ok && fs >= 0 && fs <= 2) ? fs : 1);

    m_vsync->setChecked(
        getVal("bUseVSync", "False").compare("True", Qt::CaseInsensitive) == 0);

    double fps = getVal("FrameRateLimit", "240.000000").toDouble(&ok);
    m_fpsLmt->setText(ok ? QString::number((int)fps) : "240");

    auto setQ = [](QComboBox* c, const QString& val) {
        bool ok2; int v = val.toInt(&ok2);
        c->setCurrentIndex((ok2 && v >= 0 && v <= 3) ? v : 0);
    };
    setQ(m_shadows,  getVal("sg.ShadowQuality",             "0"));
    setQ(m_effects,  getVal("sg.EffectsQuality",            "0"));
    setQ(m_postProc, getVal("sg.PostProcessQuality",        "0"));
    setQ(m_textures, getVal("sg.TextureQuality",            "2"));
    setQ(m_foliage,  getVal("sg.FoliageQuality",            "0"));
    setQ(m_aa,       getVal("sg.AntiAliasingMode",          "0"));
    setQ(m_gi,       getVal("sg.GlobalIlluminationQuality", "0"));
    setQ(m_reflect,  getVal("sg.ReflectionQuality",         "0"));

    m_motionBlur->setChecked(
        getVal("bMotionBlur", "False").compare("True", Qt::CaseInsensitive) == 0);
    m_showFps->setChecked(
        getVal("bShowFPS",    "False").compare("True", Qt::CaseInsensitive) == 0);
}

// ── Collect UI into m_values ──────────────────────────────────────────────────

void FortniteSettingsPage::collectUi() {
    // Resolution
    QString w = m_resW->text().trimmed();
    QString h = m_resH->text().trimmed();
    if (w.isEmpty()) w = "1920";
    if (h.isEmpty()) h = "1080";
    m_values["ResolutionSizeX"]                   = w;
    m_values["ResolutionSizeY"]                   = h;
    m_values["LastUserConfirmedResolutionSizeX"]  = w;
    m_values["LastUserConfirmedResolutionSizeY"]  = h;

    // Fullscreen mode
    QString fs = QString::number(m_fsMode->currentIndex());
    m_values["FullscreenMode"]              = fs;
    m_values["LastConfirmedFullscreenMode"] = fs;

    // VSync
    m_values["bUseVSync"] = m_vsync->isChecked() ? "True" : "False";

    // FPS limit
    bool ok;
    double fps = m_fpsLmt->text().trimmed().toDouble(&ok);
    if (!ok || fps <= 0.0) fps = 240.0;
    m_values["FrameRateLimit"] = QString::number(fps, 'f', 6);

    // Quality
    m_values["sg.ShadowQuality"]             = QString::number(m_shadows->currentIndex());
    m_values["sg.EffectsQuality"]            = QString::number(m_effects->currentIndex());
    m_values["sg.PostProcessQuality"]        = QString::number(m_postProc->currentIndex());
    m_values["sg.TextureQuality"]            = QString::number(m_textures->currentIndex());
    m_values["sg.FoliageQuality"]            = QString::number(m_foliage->currentIndex());
    m_values["sg.AntiAliasingMode"]          = QString::number(m_aa->currentIndex());
    m_values["sg.GlobalIlluminationQuality"] = QString::number(m_gi->currentIndex());
    m_values["sg.ReflectionQuality"]         = QString::number(m_reflect->currentIndex());

    // Gameplay
    m_values["bMotionBlur"] = m_motionBlur->isChecked() ? "True" : "False";
    m_values["bShowFPS"]    = m_showFps->isChecked()    ? "True" : "False";
}

// ── Preset ────────────────────────────────────────────────────────────────────

void FortniteSettingsPage::applyPreset() {
    m_resW->setText("1920");
    m_resH->setText("1080");
    m_fsMode->setCurrentIndex(1);   // Borderless
    m_vsync->setChecked(false);
    m_fpsLmt->setText("240");

    m_shadows->setCurrentIndex(0);  // Off/Low
    m_effects->setCurrentIndex(0);
    m_postProc->setCurrentIndex(0);
    m_textures->setCurrentIndex(2); // High (textures have minimal fps impact)
    m_foliage->setCurrentIndex(0);
    m_aa->setCurrentIndex(0);
    m_gi->setCurrentIndex(0);
    m_reflect->setCurrentIndex(0);

    m_motionBlur->setChecked(false);
    m_showFps->setChecked(true);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

void FortniteSettingsPage::setStatus(const QString& msg, const QColor& col) {
    m_statusLbl->setText(msg);
    m_statusLbl->setStyleSheet(QString(
        "color:%1;background:transparent;font-size:11px;")
        .arg(col.name()));
}

QString FortniteSettingsPage::getVal(const QString& key, const QString& def) const {
    return m_values.value(key, def);
}
