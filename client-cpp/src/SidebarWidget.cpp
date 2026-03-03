// ══════════════════════════════════════════════════════
//  SidebarWidget.cpp — animated navigation sidebar
// ══════════════════════════════════════════════════════
#include "SidebarWidget.h"
#include "AppController.h"
#include "Palette.h"

#include <QPainter>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFrame>
#include <QEasingCurve>
#include <QEnterEvent>
#include <cmath>

// ════════════════════════════════════════════════════════
//  NavButton
// ════════════════════════════════════════════════════════
NavButton::NavButton(const QString& text, QWidget* parent)
    : QPushButton(text, parent)
{
    setFixedHeight(38);
    setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
    setCursor(Qt::PointingHandCursor);
    setFlat(true);
    setMouseTracking(true);

    m_hAnim = new QPropertyAnimation(this, "hoverT", this);
    m_hAnim->setDuration(160);
    m_hAnim->setEasingCurve(QEasingCurve::OutQuad);
}

void NavButton::setActive(bool a) {
    m_active = a;
    if (a) {
        // Reset hover when activated
        m_hAnim->stop();
        m_hoverT = 0.0;
    }
    update();
}

void NavButton::enterEvent(QEnterEvent*) {
    if (m_active) return;
    m_hAnim->stop();
    m_hAnim->setStartValue(m_hoverT);
    m_hAnim->setEndValue(1.0);
    m_hAnim->start();
}

void NavButton::leaveEvent(QEvent*) {
    if (m_active) return;
    m_hAnim->stop();
    m_hAnim->setStartValue(m_hoverT);
    m_hAnim->setEndValue(0.0);
    m_hAnim->start();
}

void NavButton::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    QRect r = rect();

    if (m_active) {
        // Active: highlighted background
        p.setPen(Qt::NoPen);
        p.setBrush(QColor(255, 255, 255, 14));
        p.drawRoundedRect(r.adjusted(4, 1, -4, -1), 6, 6);

        // Soft accent glow behind the indicator bar
        QColor accentGlow = Pal::ACCENT;
        accentGlow.setAlpha(35);
        p.setBrush(accentGlow);
        p.drawRoundedRect(QRect(3, 5, 10, 28), 5, 5);

    } else if (m_hoverT > 0.001) {
        // Hover: animated background fade-in
        int alpha = static_cast<int>(m_hoverT * 10);
        p.setPen(Qt::NoPen);
        p.setBrush(QColor(255, 255, 255, alpha));
        p.drawRoundedRect(r.adjusted(4, 1, -4, -1), 6, 6);

        // Tiny accent hint on left (grows with hoverT)
        QColor accentHint = Pal::ACCENT;
        accentHint.setAlphaF(m_hoverT * 0.35);
        p.setBrush(accentHint);
        p.drawRoundedRect(QRect(4, 11, 2, 16), 1, 1);
    }

    // Text — interpolate DIM → SOFT on hover, TEXT when active
    QFont f("Segoe UI", 12);
    p.setFont(f);

    if (m_active) {
        p.setPen(Pal::TEXT);
    } else {
        qreal t = m_hoverT;
        QColor col;
        col.setRgbF(
            Pal::DIM.redF()   + (Pal::SOFT.redF()   - Pal::DIM.redF())   * t,
            Pal::DIM.greenF() + (Pal::SOFT.greenF() - Pal::DIM.greenF()) * t,
            Pal::DIM.blueF()  + (Pal::SOFT.blueF()  - Pal::DIM.blueF())  * t
        );
        p.setPen(col);
    }

    p.drawText(QRect(18, 0, r.width() - 18, r.height()),
               Qt::AlignVCenter | Qt::AlignLeft, text());
}

// ════════════════════════════════════════════════════════
//  PulsingDot — animated glow effect
// ════════════════════════════════════════════════════════
PulsingDot::PulsingDot(QWidget* parent) : QWidget(parent)
{
    setFixedSize(12, 12);
    m_timer = new QTimer(this);
    m_timer->setInterval(50);  // 20 fps
    connect(m_timer, &QTimer::timeout, this, [this]() {
        m_tick = (m_tick + 1) % 60;  // 3-second cycle
        update();
    });
    m_timer->start();
}

void PulsingDot::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    // Sine pulse: 0 → 1 → 0 over 60 ticks
    double t = std::sin(m_tick * M_PI / 30.0) * 0.5 + 0.5;

    // Outer pulsing glow ring
    QColor glow = m_color;
    glow.setAlpha(static_cast<int>(t * 60 + 10));
    p.setPen(Qt::NoPen);
    p.setBrush(glow);
    p.drawEllipse(QPoint(6, 6), 5, 5);

    // Inner solid dot
    p.setBrush(m_color);
    p.drawEllipse(QPoint(6, 6), 3, 3);
}

// ════════════════════════════════════════════════════════
//  Section label helper
// ════════════════════════════════════════════════════════
static QLabel* mkSection(const QString& text) {
    auto* l = new QLabel(text);
    l->setStyleSheet(QString(
        "color: rgba(180,180,200,0.55); background: transparent; "
        "font-size: 9px; font-weight: 700; "
        "letter-spacing: 1.4px; padding-left: 14px;"
    ));
    l->setFixedHeight(24);
    return l;
}

// ════════════════════════════════════════════════════════
//  SidebarWidget
// ════════════════════════════════════════════════════════
SidebarWidget::SidebarWidget(AppController* ctrl, QWidget* parent)
    : QWidget(parent), m_ctrl(ctrl)
{
    setFixedWidth(200);
    m_indAnim = new QPropertyAnimation(this, "indicatorY", this);
    m_indAnim->setDuration(280);
    m_indAnim->setEasingCurve(QEasingCurve::OutCubic);
    buildUi();
    updateSession();
    // Slide indicator in from off-screen on startup
    QTimer::singleShot(0, this, [this]() { animateIndicatorTo(0); });
}

void SidebarWidget::buildUi() {
    auto* outerV = new QVBoxLayout(this);
    outerV->setContentsMargins(8, 12, 8, 12);
    outerV->setSpacing(0);

    // ── Logo ──────────────────────────────────────────
    auto* logoLbl = new QLabel("404 Tweaks");
    logoLbl->setFixedHeight(36);
    QFont lf("Segoe UI", 13, QFont::DemiBold);
    logoLbl->setFont(lf);
    logoLbl->setStyleSheet(QString(
        "color: %1; background: transparent; padding-left: 14px;")
        .arg(Pal::ACCENT.name()));
    outerV->addWidget(logoLbl);
    outerV->addSpacing(6);

    // ── Top separator ──────────────────────────────────
    auto* sep1 = new QFrame;
    sep1->setFrameShape(QFrame::HLine);
    sep1->setFixedHeight(1);
    sep1->setStyleSheet(QString("background: %1; margin: 0 4px;")
        .arg(Pal::BORDER.name()));
    outerV->addWidget(sep1);
    outerV->addSpacing(6);

    // ── Button labels ─────────────────────────────────
    static const char* labels[] = {
        "Dashboard",
        "Modules",
        "Logs",
        "Param\u00e8tres",
        "Guide",
        "R\u00e9seau",
        "Drivers",
        "Fortnite",
        "Macros"
    };

    // ── Section: SYSTÈME (0-3) ────────────────────────
    outerV->addWidget(mkSection("SYST\u00c8ME"));
    for (int i = 0; i <= 3; ++i) {
        m_btns[i] = new NavButton(labels[i]);
        connect(m_btns[i], &QPushButton::clicked, this, [this, i]() {
            setCurrentTab(static_cast<Tab>(i));
        });
        outerV->addWidget(m_btns[i]);
        outerV->addSpacing(1);
    }

    outerV->addSpacing(6);

    // ── Section: OPTIMISATION (4-7) ───────────────────
    outerV->addWidget(mkSection("OPTIMISATION"));
    for (int i = 4; i <= 7; ++i) {
        m_btns[i] = new NavButton(labels[i]);
        connect(m_btns[i], &QPushButton::clicked, this, [this, i]() {
            setCurrentTab(static_cast<Tab>(i));
        });
        outerV->addWidget(m_btns[i]);
        outerV->addSpacing(1);
    }

    outerV->addSpacing(6);

    // ── Section: GAMEPLAY (8) ─────────────────────────
    outerV->addWidget(mkSection("GAMEPLAY"));
    for (int i = 8; i < TAB_COUNT; ++i) {
        m_btns[i] = new NavButton(labels[i]);
        connect(m_btns[i], &QPushButton::clicked, this, [this, i]() {
            setCurrentTab(static_cast<Tab>(i));
        });
        outerV->addWidget(m_btns[i]);
        outerV->addSpacing(1);
    }

    m_btns[0]->setActive(true);
    outerV->addStretch();

    // ── Bottom separator ───────────────────────────────
    auto* sep2 = new QFrame;
    sep2->setFrameShape(QFrame::HLine);
    sep2->setFixedHeight(1);
    sep2->setStyleSheet(sep1->styleSheet());
    outerV->addWidget(sep2);
    outerV->addSpacing(10);

    // ── Session info ───────────────────────────────────
    auto makeInfo = [&](QLabel*& lbl, const QString& placeholder, const QColor& col) {
        lbl = new QLabel(placeholder);
        lbl->setStyleSheet(QString(
            "color: %1; background: transparent; font-size: 11px; padding-left: 12px;")
            .arg(col.name()));
        outerV->addWidget(lbl);
        outerV->addSpacing(2);
    };

    auto* statusRow = new QHBoxLayout;
    statusRow->setContentsMargins(12, 0, 0, 0);
    statusRow->setSpacing(6);
    m_dot = new PulsingDot;
    statusRow->addWidget(m_dot);
    m_statusLbl = new QLabel("Session active");
    m_statusLbl->setStyleSheet(QString(
        "color: %1; background: transparent; font-size: 11px;")
        .arg(Pal::OK.name()));
    statusRow->addWidget(m_statusLbl, 1);
    outerV->addLayout(statusRow);
    outerV->addSpacing(4);

    makeInfo(m_planLbl, "\u2014", Pal::ACCENT);
    makeInfo(m_expLbl,  "\u2014", Pal::DIM);
    makeInfo(m_hwidLbl, "\u2014", Pal::DIM);
    outerV->addSpacing(4);
}

void SidebarWidget::animateIndicatorTo(int tabIndex) {
    if (!m_btns[tabIndex]) return;
    QPoint btnPos = m_btns[tabIndex]->mapTo(this, QPoint(0, 0));
    qreal targetY = btnPos.y() + m_btns[tabIndex]->height() / 2.0 - 12;
    m_indAnim->stop();
    m_indAnim->setStartValue(m_indicatorY);
    m_indAnim->setEndValue(targetY);
    m_indAnim->start();
}

void SidebarWidget::setCurrentTab(Tab t) {
    m_tab = t;
    for (int i = 0; i < TAB_COUNT; ++i)
        m_btns[i]->setActive(i == (int)t);
    animateIndicatorTo((int)t);
    emit tabChanged(t);
}

void SidebarWidget::onRunningChanged(bool running, const QString&) {
    if (running) {
        m_dot->setColor(Pal::WARN);
        m_statusLbl->setText("En cours...");
        m_statusLbl->setStyleSheet(QString(
            "color: %1; background: transparent; font-size: 11px;")
            .arg(Pal::WARN.name()));
    } else {
        m_dot->setColor(Pal::OK);
        m_statusLbl->setText("Session active");
        m_statusLbl->setStyleSheet(QString(
            "color: %1; background: transparent; font-size: 11px;")
            .arg(Pal::OK.name()));
    }
    m_dot->update();
}

void SidebarWidget::onLicenseActivated(const QString&, const QString&) {
    updateSession();
}

void SidebarWidget::updateSession() {
    if (!m_ctrl) return;

    m_planLbl->setText(m_ctrl->plan());

    QString exp = m_ctrl->expiresAt();
    if (exp.isEmpty()) {
        m_expLbl->setText("Lifetime");
        m_expLbl->setStyleSheet(QString(
            "color: %1; background: transparent; font-size: 11px; padding-left: 12px;")
            .arg(Pal::OK.name()));
    } else {
        m_expLbl->setText(exp.left(10));
    }

    QString h = m_ctrl->hwid();
    if (h.size() >= 12) h = h.left(6) + ".." + h.right(4);
    m_hwidLbl->setText(h);
}

void SidebarWidget::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    // Sidebar background
    p.fillRect(rect(), Pal::SIDEBAR);

    // Right border
    p.fillRect(QRect(width() - 1, 0, 1, height()), Pal::BORDER);

    // ── Animated sliding indicator (left edge) ────────
    // indicatorY starts at -60, slides in on load and on each tab change
    int iy = static_cast<int>(m_indicatorY);

    // Soft glow behind the bar
    QColor glow = Pal::ACCENT;
    glow.setAlpha(38);
    p.setPen(Qt::NoPen);
    p.setBrush(glow);
    p.drawRoundedRect(QRect(0, iy - 2, 9, 28), 4, 4);

    // Solid indicator bar
    p.setBrush(Pal::ACCENT);
    p.drawRoundedRect(QRect(0, iy, 3, 24), 2, 2);
}
