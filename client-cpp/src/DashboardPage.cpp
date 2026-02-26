// ══════════════════════════════════════════════════════
//  DashboardPage.cpp
// ══════════════════════════════════════════════════════
#include "DashboardPage.h"
#include "AppController.h"
#include "Palette.h"
#include "GlassCard.h"
#include "GlowButton.h"
#include "FadeLabel.h"
#include "SystemMonitorWidget.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGridLayout>
#include <QScrollArea>
#include <QPainter>
#include <QLinearGradient>
#include <QFrame>
#include <QFont>

// ════════════════════════════════════════════════════════
//  StatCard
// ════════════════════════════════════════════════════════
StatCard::StatCard(const QString& label, const QString& value,
                   const QColor& accent, QWidget* parent)
    : QWidget(parent), m_accent(accent)
{
    setFixedHeight(76);
    auto* v = new QVBoxLayout(this);
    v->setContentsMargins(14, 10, 14, 10);
    v->setSpacing(2);

    auto* lbl = new QLabel(label);
    lbl->setStyleSheet(QString("color: %1; font-size: 11px; background: transparent;")
        .arg(Pal::DIM.name()));
    v->addWidget(lbl);

    m_valLbl = new QLabel(value);
    QFont f("Segoe UI", 16);
    m_valLbl->setFont(f);
    m_valLbl->setStyleSheet(QString("color: %1; background: transparent;")
        .arg(accent.name()));
    v->addWidget(m_valLbl);
    v->addStretch();
}

void StatCard::setValue(const QString& v) { m_valLbl->setText(v); }
void StatCard::setAccent(const QColor& c) {
    m_accent = c;
    m_valLbl->setStyleSheet(QString("color: %1; background: transparent;").arg(c.name()));
    update();
}

void StatCard::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);
    // Card background + border
    p.setBrush(Pal::CARD);
    p.setPen(QPen(Pal::BORDER, 1));
    p.drawRoundedRect(rect().adjusted(0,0,-1,-1), 8, 8);

    // Top gradient accent line
    QLinearGradient g(rect().width()*0.1, 1, rect().width()*0.9, 1);
    g.setColorAt(0,   Qt::transparent);
    g.setColorAt(0.5, QColor(m_accent.red(), m_accent.green(), m_accent.blue(), 180));
    g.setColorAt(1,   Qt::transparent);
    p.setPen(Qt::NoPen);
    p.setBrush(g);
    p.drawRect(QRect(12, 1, width()-24, 2));
}

// ════════════════════════════════════════════════════════
//  Helper: glass card
// ════════════════════════════════════════════════════════
static GlassCard* makeCard(const QColor& accent = QColor()) {
    return new GlassCard(nullptr, 10, accent);
}

static QLabel* makeH2(const QString& text) {
    auto* l = new QLabel(text);
    QFont f("Segoe UI", 14, QFont::Normal);
    l->setFont(f);
    l->setStyleSheet(QString("color: %1; background: transparent;").arg(Pal::TEXT.name()));
    return l;
}

static QLabel* makeDimLabel(const QString& text) {
    auto* l = new QLabel(text);
    l->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;")
        .arg(Pal::DIM.name()));
    return l;
}

// ════════════════════════════════════════════════════════
//  DashboardPage
// ════════════════════════════════════════════════════════
DashboardPage::DashboardPage(AppController* ctrl, QWidget* parent)
    : QWidget(parent), m_ctrl(ctrl)
{
    buildUi();
    m_spinTimer = new QTimer(this);
    m_spinTimer->setInterval(220);
    connect(m_spinTimer, &QTimer::timeout, this, &DashboardPage::onSpinnerTick);
}

void DashboardPage::buildUi() {
    auto* outerScroll = new QScrollArea;
    outerScroll->setWidgetResizable(true);
    outerScroll->setFrameShape(QFrame::NoFrame);
    outerScroll->setStyleSheet("background: transparent;");

    auto* content = new QWidget;
    content->setStyleSheet("background: transparent;");
    auto* vl = new QVBoxLayout(content);
    vl->setContentsMargins(0, 0, 0, 0);
    vl->setSpacing(6);

    outerScroll->setWidget(content);
    auto* rootV = new QVBoxLayout(this);
    rootV->setContentsMargins(0, 0, 0, 0);
    rootV->addWidget(outerScroll);

    // ── Page title ─────────────────────────────────────
    {
        auto* tl = new QLabel("Dashboard");
        QFont tf("Segoe UI", 20, QFont::Bold);
        tl->setFont(tf);
        tl->setStyleSheet(QString("color: %1; background: transparent;").arg(Pal::TEXT.name()));
        vl->addWidget(tl);

        auto* sub = new QLabel("Vue d'ensemble et actions rapides.");
        sub->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;")
            .arg(Pal::DIM.name()));
        vl->addWidget(sub);
        vl->addSpacing(8);
    }

    // ── System monitor (CPU / RAM / GPU live) ─────────
    vl->addWidget(new SystemMonitorWidget);
    vl->addSpacing(6);

    // ── Row 1: 3 stat cards ────────────────────────────
    {
        auto* row = new QHBoxLayout;
        row->setSpacing(10);
        m_statSystem  = new StatCard("Etat du systeme",  "PRET",  Pal::OK);
        m_statPlan    = new StatCard("Plan de licence",  "PRO",   Pal::ACCENT);
        m_statModules = new StatCard("Modules actifs",   "—",     Pal::VIOLET);
        row->addWidget(m_statSystem,  1);
        row->addWidget(m_statPlan,    1);
        row->addWidget(m_statModules, 1);
        vl->addLayout(row);
    }

    // ── Row 2: quick actions + sysinfo ────────────────
    {
        auto* row = new QHBoxLayout;
        row->setSpacing(10);

        // Quick actions card
        {
            auto* card = makeCard(Pal::ACCENT);
            auto* cv = new QVBoxLayout(card);
            cv->setContentsMargins(16, 16, 16, 16);
            cv->setSpacing(6);

            cv->addWidget(makeH2("Actions rapides"));
            auto* sub = makeDimLabel("Optimise selon les modules actives dans l'onglet Modules.");
            sub->setWordWrap(true);
            cv->addWidget(sub);
            cv->addSpacing(6);

            auto* runGlow = new GlowButton("  LANCER L'OPTIMISATION  ", GlowButton::Style::Primary);
            runGlow->setFixedHeight(48);
            QFont runF = runGlow->font();
            runF.setPointSize(13);
            runGlow->setFont(runF);
            m_runBtn = runGlow;
            connect(m_runBtn, &QPushButton::clicked, m_ctrl, &AppController::runAll);
            cv->addWidget(m_runBtn);

            auto* revertGlow = new GlowButton("  Restaurer les parametres Windows  ", GlowButton::Style::Danger);
            m_revertBtn = revertGlow;
            connect(m_revertBtn, &QPushButton::clicked, m_ctrl, &AppController::revertAll);
            cv->addWidget(m_revertBtn);
            cv->addSpacing(4);

            m_actionStatusLbl = new QLabel("●  Systeme pret. Aucune operation en cours.");
            m_actionStatusLbl->setStyleSheet(
                QString("color: %1; background: transparent; font-size: 12px;")
                .arg(Pal::DIM.name()));
            cv->addWidget(m_actionStatusLbl);
            cv->addStretch();
            row->addWidget(card, 6);
        }

        // System info card
        {
            auto* card = makeCard(Pal::VIOLET);
            auto* cv = new QVBoxLayout(card);
            cv->setContentsMargins(16, 16, 16, 16);
            cv->setSpacing(2);
            cv->addWidget(makeH2("Informations"));
            cv->addSpacing(4);

            auto addRow = [&](const QString& key, QLabel*& val, const QColor& c) {
                auto* row2 = new QHBoxLayout;
                auto* kl   = new QLabel(key);
                kl->setFixedWidth(90);
                kl->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
                    .arg(Pal::DIM.name()));
                val = new QLabel("—");
                val->setWordWrap(true);
                val->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
                    .arg(c.name()));
                row2->addWidget(kl);
                row2->addWidget(val, 1);
                cv->addLayout(row2);
            };

            addRow("OS",         m_osVal,   Pal::TEXT);
            addRow("HWID",       m_hwidVal, Pal::SOFT);
            addRow("Plan",       m_planVal, Pal::ACCENT);
            addRow("Expiration", m_expVal,  Pal::WARN);
            addRow("Modules",    m_modVal,  Pal::VIOLET);

            auto* sep = new QFrame;
            sep->setFrameShape(QFrame::HLine);
            sep->setFixedHeight(1);
            sep->setStyleSheet(QString("background: %1;").arg(Pal::BORDER.name()));
            cv->addSpacing(4);
            cv->addWidget(sep);
            cv->addSpacing(4);
            cv->addWidget(makeDimLabel("404 Tweaks — v2026.1"));
            cv->addStretch();
            row->addWidget(card, 4);
        }
        vl->addLayout(row);
    }

    // ── Row 3: modules overview ───────────────────────
    {
        auto* card = makeCard(Pal::VIOLET);
        auto* cv = new QVBoxLayout(card);
        cv->setContentsMargins(16, 16, 16, 16);
        cv->setSpacing(6);
        cv->addWidget(makeH2("Modules inclus"));
        auto* sub = makeDimLabel("Actives dans l'onglet Modules. Cliquez pour configurer.");
        cv->addWidget(sub);
        cv->addSpacing(6);

        m_moduleBadgesArea = new QWidget;
        m_moduleBadgesArea->setStyleSheet("background: transparent;");
        cv->addWidget(m_moduleBadgesArea);
        vl->addWidget(card);
    }

    vl->addStretch();

    updateStatCards();
    rebuildModuleBadges();

    QString h = m_ctrl->hwid();
    if (h.size() >= 16) h = h.left(8) + "..." + h.right(8);
    if (m_hwidVal) m_hwidVal->setText(h);
    if (m_osVal)   m_osVal->setText(m_ctrl->osVersion());
}

void DashboardPage::updateStatCards() {
    int tweaks = m_ctrl->countEnabledTweaks();
    m_statModules->setValue(QString("%1 tweaks").arg(tweaks));
    m_planVal->setText(m_ctrl->plan());
    m_modVal->setText(QString("%1 tweaks").arg(tweaks));

    QString exp = m_ctrl->expiresAt();
    if (m_expVal) {
        if (exp.isEmpty()) {
            m_expVal->setText("Lifetime");
            m_expVal->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
                .arg(Pal::OK.name()));
        } else {
            m_expVal->setText(exp.left(10));
        }
    }
    if (m_planVal) m_planVal->setText(m_ctrl->plan());
    m_statPlan->setValue(m_ctrl->plan());
}

void DashboardPage::rebuildModuleBadges() {
    if (!m_moduleBadgesArea) return;
    delete m_moduleBadgesArea->layout();
    qDeleteAll(m_moduleBadgesArea->findChildren<QWidget*>(QString(), Qt::FindDirectChildrenOnly));

    auto* flow = new QHBoxLayout(m_moduleBadgesArea);
    flow->setContentsMargins(0,0,0,0);
    flow->setSpacing(8);

    const auto& mods = m_ctrl->modules();
    for (const auto& m : mods) {
        QString label = QString("%1 (%2)").arg(m.icon).arg(m.tweakCount);
        auto* badge = new QLabel(label);
        QColor c = m.enabled ? m.color : Pal::DIM;
        badge->setStyleSheet(QString(
            "color: %1; background: rgba(%2,%3,%4,45);"
            "border: 1px solid rgba(%2,%3,%4,110);"
            "border-radius: 5px; padding: 3px 8px; font-size: 11px;")
            .arg(c.name())
            .arg(c.red()).arg(c.green()).arg(c.blue()));
        flow->addWidget(badge);
    }
    flow->addStretch();
}

void DashboardPage::onRunningChanged(bool running, const QString& title) {
    m_running = running;
    m_runBtn->setEnabled(!running);
    m_revertBtn->setEnabled(!running);

    if (running) {
        m_spinTimer->start();
        m_statSystem->setValue("EN COURS");
        m_statSystem->setAccent(Pal::WARN);
        m_actionStatusLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
            .arg(Pal::WARN.name()));
    } else {
        m_spinTimer->stop();
        m_runBtn->setText("  LANCER L'OPTIMISATION  ");
        m_statSystem->setValue("PRET");
        m_statSystem->setAccent(Pal::OK);
        m_actionStatusLbl->setText("●  Derniere operation terminee. Redemarrage recommande.");
        m_actionStatusLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
            .arg(Pal::OK.name()));
    }
    updateStatCards();
}

void DashboardPage::onLicenseActivated(const QString& plan, const QString& expiresAt) {
    updateStatCards();
}

void DashboardPage::onChecksRefreshed() {
    rebuildModuleBadges();
    updateStatCards();
}

void DashboardPage::onSpinnerTick() {
    static const char* FRAMES[] = { "●○○", "○●○", "○○●", "○●○" };
    m_spinFrame = (m_spinFrame + 1) % 4;
    m_actionStatusLbl->setText(
        QString("%1  %2").arg(FRAMES[m_spinFrame]).arg(
            m_ctrl->isRunning() ? m_ctrl->runTitle() : ""));
}
