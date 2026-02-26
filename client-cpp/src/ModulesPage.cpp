// ══════════════════════════════════════════════════════
//  ModulesPage.cpp
// ══════════════════════════════════════════════════════
#include "ModulesPage.h"
#include "AppController.h"
#include "Palette.h"
#include "GlassCard.h"
#include "GlowButton.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGridLayout>
#include <QScrollArea>
#include <QPainter>
#include <QLinearGradient>
#include <QFrame>
#include <QFont>
#include <QTimer>
#include <QGraphicsOpacityEffect>
#include <QPropertyAnimation>

// ════════════════════════════════════════════════════════
//  ModuleCard  (extends HoverCard for hover animation)
// ════════════════════════════════════════════════════════
ModuleCard::ModuleCard(int idx, AppController* ctrl, QWidget* parent)
    : HoverCard(parent, 10), m_idx(idx), m_ctrl(ctrl)
{
    setFixedHeight(172);
    setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);

    const ModuleSpec& m = ctrl->modules()[idx];
    setAccentColor(m.color);

    auto* outerV = new QVBoxLayout(this);
    outerV->setContentsMargins(22, 12, 14, 12);
    outerV->setSpacing(4);

    // ── Header row: title + checkbox ──────────────────
    auto* topRow = new QHBoxLayout;
    auto* titleLbl = new QLabel(m.title);
    QFont tf("Segoe UI", 13, QFont::Normal);
    titleLbl->setFont(tf);
    titleLbl->setStyleSheet(QString("color: %1; background: transparent;")
        .arg(Pal::TEXT.name()));
    topRow->addWidget(titleLbl, 1);

    m_enabledCb = new QCheckBox("Actif");
    m_enabledCb->setChecked(m.enabled);
    m_enabledCb->setStyleSheet(QString(
        "QCheckBox { color: %1; background: transparent; font-size: 11px; spacing: 5px; }"
        "QCheckBox::indicator { width: 16px; height: 16px;"
        "  border: 2px solid %2; border-radius: 4px; background: %3; }"
        "QCheckBox::indicator:checked { background: %4; border-color: %4; }")
        .arg(Pal::DIM.name(), Pal::BORDER.name(), Pal::FRAME.name(), Pal::ACCENT.name()));
    connect(m_enabledCb, &QCheckBox::toggled, this, [this](bool en) {
        m_ctrl->setModuleEnabled(m_idx, en);
        emit enableChanged(m_idx, en);
        update();
    });
    topRow->addWidget(m_enabledCb);
    outerV->addLayout(topRow);

    // ── Description ───────────────────────────────────
    auto* descLbl = new QLabel(m.desc);
    descLbl->setWordWrap(true);
    descLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;")
        .arg(Pal::DIM.name()));
    outerV->addWidget(descLbl);
    outerV->addSpacing(4);

    // ── Badges row: tweak count + status ──────────────
    auto* badgeRow = new QHBoxLayout;
    badgeRow->setSpacing(8);

    auto* tweakBadge = new QLabel(QString("%1 tweaks").arg(m.tweakCount));
    tweakBadge->setStyleSheet(QString(
        "color: %1; background: rgba(%2,%3,%4,45);"
        "border: 1px solid rgba(%2,%3,%4,110);"
        "border-radius: 5px; padding: 2px 7px; font-size: 11px;")
        .arg(m.color.name())
        .arg(m.color.red()).arg(m.color.green()).arg(m.color.blue()));
    badgeRow->addWidget(tweakBadge);

    m_statusBadge = new QLabel("?");
    m_statusBadge->setStyleSheet(QString(
        "color: %1; background: rgba(143,153,173,40);"
        "border: 1px solid rgba(143,153,173,100);"
        "border-radius: 5px; padding: 2px 7px; font-size: 11px;")
        .arg(Pal::DIM.name()));
    badgeRow->addWidget(m_statusBadge);
    badgeRow->addStretch();
    outerV->addLayout(badgeRow);

    outerV->addStretch();

    // ── Apply button ──────────────────────────────────
    auto* applyGlow = new GlowButton("Appliquer", GlowButton::Style::Primary);
    applyGlow->setFixedHeight(32);
    m_applyBtn = applyGlow;
    connect(m_applyBtn, &QPushButton::clicked, this, [this]() {
        emit applyRequested(m_idx);
    });
    outerV->addWidget(m_applyBtn);
}

void ModuleCard::playEntrance(int delayMs) {
    auto* fx = new QGraphicsOpacityEffect(this);
    setGraphicsEffect(fx);
    fx->setOpacity(0.0);

    QTimer::singleShot(delayMs, this, [this, fx]() {
        auto* anim = new QPropertyAnimation(fx, "opacity", this);
        anim->setDuration(340);
        anim->setStartValue(0.0);
        anim->setEndValue(1.0);
        anim->setEasingCurve(QEasingCurve::OutCubic);
        connect(anim, &QPropertyAnimation::finished, this, [this]() {
            setGraphicsEffect(nullptr);
        });
        anim->start(QAbstractAnimation::DeleteWhenStopped);
    });
}

void ModuleCard::refresh() {
    const auto& mods = m_ctrl->modules();
    if (m_idx >= mods.size()) return;
    const ModuleSpec& m = mods[m_idx];

    const tweaks::CheckResult& cr = m.lastCheck;
    QString statText;
    QColor  statCol;

    if (!m.checkFn) {
        statText = "─";
        statCol  = Pal::DIM;
    } else if (cr.applied < 0) {
        statText = "?";
        statCol  = Pal::DIM;
    } else if (cr.applied == cr.total) {
        statText = QString("OK %1/%2").arg(cr.applied).arg(cr.total);
        statCol  = Pal::OK;
    } else if (cr.applied > 0) {
        statText = QString("~ %1/%2").arg(cr.applied).arg(cr.total);
        statCol  = Pal::WARN;
    } else {
        statText = QString("✕ %1/%2").arg(cr.applied).arg(cr.total);
        statCol  = Pal::ERR;
    }

    m_statusBadge->setText(statText);
    m_statusBadge->setStyleSheet(QString(
        "color: %1; background: rgba(%2,%3,%4,40);"
        "border: 1px solid rgba(%2,%3,%4,100);"
        "border-radius: 5px; padding: 2px 7px; font-size: 11px;")
        .arg(statCol.name())
        .arg(statCol.red()).arg(statCol.green()).arg(statCol.blue()));

    m_enabledCb->setChecked(m.enabled);
    m_applyBtn->setEnabled(m.enabled);
    update();
}

void ModuleCard::paintEvent(QPaintEvent* e) {
    // Let HoverCard draw the animated glass background + border + glow
    HoverCard::paintEvent(e);

    // Draw left accent bar on top
    const auto& mods = m_ctrl->modules();
    if (m_idx >= mods.size()) return;
    const QColor& col = mods[m_idx].color;

    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);
    p.setPen(Qt::NoPen);
    p.setBrush(col);
    p.drawRoundedRect(QRect(0, 6, 3, height() - 12), 2, 2);
}

// ════════════════════════════════════════════════════════
//  ModulesPage
// ════════════════════════════════════════════════════════
ModulesPage::ModulesPage(AppController* ctrl, QWidget* parent)
    : QWidget(parent), m_ctrl(ctrl)
{
    buildUi();
    connect(ctrl, &AppController::runningChanged, this, &ModulesPage::onRunningChanged);
}

void ModulesPage::buildUi() {
    auto* rootV = new QVBoxLayout(this);
    rootV->setContentsMargins(0, 0, 0, 0);
    rootV->setSpacing(8);

    // ── Page title ─────────────────────────────────────
    {
        auto* tl = new QLabel("Modules");
        QFont tf("Segoe UI", 20, QFont::Bold);
        tl->setFont(tf);
        tl->setStyleSheet(QString("color: %1; background: transparent;").arg(Pal::TEXT.name()));
        rootV->addWidget(tl);
        auto* sub = new QLabel("Activez ou desactivez chaque composant et appliquez-les individuellement.");
        sub->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;")
            .arg(Pal::DIM.name()));
        rootV->addWidget(sub);
        rootV->addSpacing(6);
    }

    // ── Toolbar card ───────────────────────────────────
    {
        auto* toolCard = new GlassCard(nullptr, 10, Pal::ACCENT);
        auto* tv = new QHBoxLayout(toolCard);
        tv->setContentsMargins(14, 10, 14, 10);
        tv->setSpacing(8);

        auto* runGlow = new GlowButton("Lancer la selection", GlowButton::Style::Primary);
        runGlow->setFixedSize(170, 34);
        m_runBtn = runGlow;
        connect(m_runBtn, &QPushButton::clicked, m_ctrl, &AppController::runSelectedModules);
        tv->addWidget(m_runBtn);

        auto mkGhost = [&](const QString& text, int w) {
            auto* btn = new GlowButton(text, GlowButton::Style::Ghost);
            btn->setFixedSize(w, 34);
            return btn;
        };

        auto* selectAllBtn = mkGhost("Tout activer", 120);
        connect(selectAllBtn, &QPushButton::clicked, this, &ModulesPage::onSelectAll);
        tv->addWidget(selectAllBtn);

        auto* deselBtn = mkGhost("Tout desactiver", 130);
        connect(deselBtn, &QPushButton::clicked, this, &ModulesPage::onDeselectAll);
        tv->addWidget(deselBtn);

        auto* checkBtn = mkGhost("Verifier l'etat", 130);
        connect(checkBtn, &QPushButton::clicked, m_ctrl, &AppController::refreshChecks);
        tv->addWidget(checkBtn);

        tv->addStretch();
        m_tweakCountLbl = new QLabel;
        m_tweakCountLbl->setStyleSheet(QString("color: %1; font-size: 12px; background: transparent;")
            .arg(Pal::DIM.name()));
        tv->addWidget(m_tweakCountLbl);

        rootV->addWidget(toolCard);
    }

    // ── Scrollable grid ────────────────────────────────
    auto* scroll = new QScrollArea;
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setStyleSheet("background: transparent;");

    m_gridContainer = new QWidget;
    m_gridContainer->setStyleSheet("background: transparent;");
    auto* grid = new QGridLayout(m_gridContainer);
    grid->setContentsMargins(0, 0, 0, 0);
    grid->setSpacing(10);
    grid->setColumnStretch(0, 1);
    grid->setColumnStretch(1, 1);

    const auto& mods = m_ctrl->modules();
    for (int i = 0; i < mods.size(); ++i) {
        auto* card = new ModuleCard(i, m_ctrl);
        connect(card, &ModuleCard::applyRequested, m_ctrl, &AppController::runSingleModule);
        connect(card, &ModuleCard::enableChanged,  this,   [this]() { updateTweakCount(); });
        grid->addWidget(card, i / 2, i % 2);
        m_cards.append(card);
        // Staggered entrance: each card fades in 60ms after the previous
        card->playEntrance(i * 60);
    }

    scroll->setWidget(m_gridContainer);
    rootV->addWidget(scroll, 1);
    updateTweakCount();
}

void ModulesPage::onChecksRefreshed() {
    for (auto* c : m_cards) c->refresh();
}

void ModulesPage::onRunningChanged(bool running, const QString&) {
    m_runBtn->setEnabled(!running);
    for (auto* c : m_cards) c->setEnabled(!running);
}

void ModulesPage::onSelectAll() {
    m_ctrl->setAllModulesEnabled(true);
    for (auto* c : m_cards) c->refresh();
    updateTweakCount();
}

void ModulesPage::onDeselectAll() {
    m_ctrl->setAllModulesEnabled(false);
    for (auto* c : m_cards) c->refresh();
    updateTweakCount();
}

void ModulesPage::updateTweakCount() {
    m_tweakCountLbl->setText(
        QString("%1 tweaks selectionnes").arg(m_ctrl->countEnabledTweaks()));
}
