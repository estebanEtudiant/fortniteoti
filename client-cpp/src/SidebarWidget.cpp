// ══════════════════════════════════════════════════════
//  SidebarWidget.cpp — Slim 200px clean navigation
// ══════════════════════════════════════════════════════
#include "SidebarWidget.h"
#include "AppController.h"
#include "Palette.h"

#include <QPainter>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFrame>
#include <QEasingCurve>
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
}

void NavButton::setActive(bool a) {
    m_active = a;
    update();
}

void NavButton::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    QRect r = rect();

    if (m_active) {
        // Active: subtle light bg + left accent bar
        p.setPen(Qt::NoPen);
        p.setBrush(QColor(255, 255, 255, 9));
        p.drawRoundedRect(r.adjusted(4, 1, -4, -1), 6, 6);

        // Left accent pill
        p.setBrush(Pal::ACCENT);
        p.drawRoundedRect(QRect(4, 7, 3, 24), 2, 2);
    } else if (underMouse()) {
        p.setPen(Qt::NoPen);
        p.setBrush(QColor(255, 255, 255, 5));
        p.drawRoundedRect(r.adjusted(4, 1, -4, -1), 6, 6);
    }

    // Text
    QFont f("Segoe UI", 12);
    p.setFont(f);
    p.setPen(m_active ? Pal::TEXT : Pal::DIM);
    p.drawText(QRect(20, 0, r.width() - 20, r.height()),
               Qt::AlignVCenter | Qt::AlignLeft, text());
}

// ════════════════════════════════════════════════════════
//  PulsingDot — static dot (no animation for sober look)
// ════════════════════════════════════════════════════════
PulsingDot::PulsingDot(QWidget* parent)
    : QWidget(parent)
{
    setFixedSize(10, 10);
    // No timer — static dot
    m_timer = nullptr;
}

void PulsingDot::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);
    p.setBrush(m_color);
    p.setPen(Qt::NoPen);
    p.drawEllipse(QPoint(5, 5), 4, 4);
}

// ════════════════════════════════════════════════════════
//  SidebarWidget
// ════════════════════════════════════════════════════════
SidebarWidget::SidebarWidget(AppController* ctrl, QWidget* parent)
    : QWidget(parent), m_ctrl(ctrl)
{
    setFixedWidth(200);
    m_indAnim = new QPropertyAnimation(this, "indicatorY", this);
    m_indAnim->setDuration(240);
    m_indAnim->setEasingCurve(QEasingCurve::OutCubic);
    buildUi();
    updateSession();
    QTimer::singleShot(0, this, [this]() { animateIndicatorTo(0); });
}

void SidebarWidget::buildUi() {
    auto* outerV = new QVBoxLayout(this);
    outerV->setContentsMargins(8, 12, 8, 12);
    outerV->setSpacing(0);

    // ── Logo area ─────────────────────────────────────
    auto* logoLbl = new QLabel("404 Tweaks");
    logoLbl->setFixedHeight(36);
    QFont lf("Segoe UI", 13, QFont::DemiBold);
    logoLbl->setFont(lf);
    logoLbl->setStyleSheet(QString(
        "color: %1; background: transparent; padding-left: 14px;")
        .arg(Pal::ACCENT.name()));
    outerV->addWidget(logoLbl);
    outerV->addSpacing(6);

    // ── Separator ─────────────────────────────────────
    auto* sep1 = new QFrame;
    sep1->setFrameShape(QFrame::HLine);
    sep1->setFixedHeight(1);
    sep1->setStyleSheet(QString("background: %1; margin: 0 4px;")
        .arg(Pal::BORDER.name()));
    outerV->addWidget(sep1);
    outerV->addSpacing(8);

    // ── Nav buttons ───────────────────────────────────
    static const char* labels[] = {
        "Dashboard",
        "Modules",
        "Logs",
        "Parametres",
        "Guide",
        "Reseau",
        "Drivers",
        "Fortnite",
        "Macros"
    };

    for (int i = 0; i < TAB_COUNT; ++i) {
        m_btns[i] = new NavButton(labels[i]);
        connect(m_btns[i], &QPushButton::clicked, this, [this, i]() {
            setCurrentTab(static_cast<Tab>(i));
        });
        outerV->addWidget(m_btns[i]);
        outerV->addSpacing(1);
    }
    m_btns[0]->setActive(true);

    outerV->addStretch();

    // ── Separator ─────────────────────────────────────
    auto* sep2 = new QFrame;
    sep2->setFrameShape(QFrame::HLine);
    sep2->setFixedHeight(1);
    sep2->setStyleSheet(sep1->styleSheet());
    outerV->addWidget(sep2);
    outerV->addSpacing(10);

    // ── Session info (minimal) ────────────────────────
    auto makeInfo = [&](QLabel*& lbl, const QString& placeholder, const QColor& col) {
        lbl = new QLabel(placeholder);
        lbl->setStyleSheet(QString(
            "color: %1; background: transparent; font-size: 11px; padding-left: 12px;")
            .arg(col.name()));
        outerV->addWidget(lbl);
        outerV->addSpacing(2);
    };

    // Status row with dot
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

    makeInfo(m_planLbl, "—", Pal::ACCENT);
    makeInfo(m_expLbl,  "—", Pal::DIM);
    makeInfo(m_hwidLbl, "—", Pal::DIM);
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

    // Clean flat sidebar background
    p.fillRect(rect(), Pal::SIDEBAR);

    // Right border line
    p.fillRect(QRect(width() - 1, 0, 1, height()), Pal::BORDER);
}
