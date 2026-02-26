// ══════════════════════════════════════════════════════
//  SidebarWidget.cpp
// ══════════════════════════════════════════════════════
#include "SidebarWidget.h"
#include "AppController.h"
#include "Palette.h"

#include <QPainter>
#include <QLinearGradient>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFrame>
#include <QFontMetrics>
#include <QEasingCurve>
#include <cmath>

// ════════════════════════════════════════════════════════
//  NavButton
// ════════════════════════════════════════════════════════
NavButton::NavButton(const QString& text, QWidget* parent)
    : QPushButton(text, parent)
{
    setFixedHeight(44);
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

    // Background
    if (m_active) {
        p.setBrush(QColor(0x10, 0x2E, 0x3D));
        p.setPen(Qt::NoPen);
        p.drawRoundedRect(r, 9, 9);
        // Left accent bar
        p.setBrush(Pal::ACCENT);
        p.drawRoundedRect(QRect(2, 8, 4, 28), 2, 2);
    } else if (underMouse()) {
        p.setBrush(QColor(255, 255, 255, 10));
        p.setPen(Qt::NoPen);
        p.drawRoundedRect(r, 9, 9);
    }

    // Text
    QFont f("Segoe UI", 12);
    p.setFont(f);
    p.setPen(m_active ? Pal::TEXT : Pal::DIM);
    p.drawText(QRect(22, 0, r.width() - 22, r.height()),
               Qt::AlignVCenter | Qt::AlignLeft, text());
}

// ════════════════════════════════════════════════════════
//  PulsingDot
// ════════════════════════════════════════════════════════
PulsingDot::PulsingDot(QWidget* parent)
    : QWidget(parent)
{
    setFixedSize(12, 14);
    m_timer = new QTimer(this);
    m_timer->setInterval(30);
    connect(m_timer, &QTimer::timeout, this, [this]() {
        m_phase += 0.08;
        update();
    });
    m_timer->start();
}

void PulsingDot::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);
    float alpha = 0.55f + 0.45f * (float)std::sin(m_phase);
    QColor c = m_color;
    c.setAlphaF(alpha);
    p.setBrush(c);
    p.setPen(Qt::NoPen);
    int r = 5;
    p.drawEllipse(QPoint(width()/2, height()/2), r, r);
}

// ════════════════════════════════════════════════════════
//  SidebarWidget
// ════════════════════════════════════════════════════════
SidebarWidget::SidebarWidget(AppController* ctrl, QWidget* parent)
    : QWidget(parent), m_ctrl(ctrl)
{
    setFixedWidth(226);
    m_indAnim = new QPropertyAnimation(this, "indicatorY", this);
    m_indAnim->setDuration(280);
    m_indAnim->setEasingCurve(QEasingCurve::OutBack);
    buildUi();
    updateSession();
    // Init indicator once layout is settled
    QTimer::singleShot(0, this, [this]() { animateIndicatorTo(0); });
}

void SidebarWidget::buildUi() {
    auto* outerV = new QVBoxLayout(this);
    outerV->setContentsMargins(18, 18, 18, 18);
    outerV->setSpacing(0);

    outerV->addSpacing(4);

    // Separator
    auto makeSep = [this]() {
        auto* s = new QFrame;
        s->setFrameShape(QFrame::HLine);
        s->setFixedHeight(1);
        s->setStyleSheet(QString("background: %1;").arg(Pal::BORDER.name()));
        return s;
    };

    outerV->addSpacing(14);
    outerV->addWidget(makeSep());
    outerV->addSpacing(10);

    // Record where buttons start (18 margin + 4 spacing + 1px sep + 10 spacing + 14 spacing)
    // We compute dynamically from geometry in paintEvent — just initialise m_indicatorY = 0
    m_indicatorY = 0.0;

    // Nav buttons
    static const char* labels[] = {
        "◆  Dashboard",
        "⚡  Modules",
        "☰  Logs",
        "⚙  Parametres"
    };
    for (int i = 0; i < 4; ++i) {
        m_btns[i] = new NavButton(QString::fromUtf8(labels[i]));
        connect(m_btns[i], &QPushButton::clicked, this, [this, i]() {
            setCurrentTab(static_cast<Tab>(i));
        });
        outerV->addWidget(m_btns[i]);
        outerV->addSpacing(2);
    }
    m_btns[0]->setActive(true);

    outerV->addStretch();
    outerV->addWidget(makeSep());
    outerV->addSpacing(10);

    // Session card
    auto* sessCard = new QFrame;
    sessCard->setFixedHeight(110);
    sessCard->setStyleSheet(QString(
        "QFrame { background: %1; border: 1px solid %2; border-radius: 8px; }")
        .arg(Pal::CARD2.name(), Pal::BORDER.name()));
    auto* sessV = new QVBoxLayout(sessCard);
    sessV->setContentsMargins(12, 10, 12, 10);
    sessV->setSpacing(3);

    // Status row
    auto* statusRow = new QHBoxLayout;
    m_dot = new PulsingDot;
    m_statusLbl = new QLabel("Session active");
    m_statusLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
        .arg(Pal::OK.name()));
    statusRow->addWidget(m_dot);
    statusRow->addSpacing(4);
    statusRow->addWidget(m_statusLbl);
    statusRow->addStretch();
    sessV->addLayout(statusRow);

    // Separator
    auto* sep2 = new QFrame;
    sep2->setFrameShape(QFrame::HLine);
    sep2->setFixedHeight(1);
    sep2->setStyleSheet(QString("background: %1;").arg(Pal::BORDER.name()));
    sessV->addWidget(sep2);

    // Info rows
    auto makeRow = [&](const QString& key, QLabel*& valLbl, const QString& color) {
        auto* row = new QHBoxLayout;
        auto* kl  = new QLabel(key);
        kl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;")
            .arg(Pal::DIM.name()));
        kl->setFixedWidth(68);
        valLbl = new QLabel("—");
        valLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;")
            .arg(color));
        row->addWidget(kl);
        row->addWidget(valLbl, 1);
        sessV->addLayout(row);
    };

    makeRow("Plan     ", m_planLbl, Pal::ACCENT.name());
    makeRow("Expiration", m_expLbl, Pal::WARN.name());
    makeRow("HWID     ", m_hwidLbl, Pal::SOFT.name());

    outerV->addWidget(sessCard);
}

void SidebarWidget::animateIndicatorTo(int tabIndex) {
    if (!m_btns[tabIndex]) return;
    // Target Y = button's mapToParent position (center)
    QPoint btnPos = m_btns[tabIndex]->mapTo(this, QPoint(0, 0));
    qreal targetY = btnPos.y() + m_btns[tabIndex]->height() / 2.0 - 14; // 28px indicator height / 2
    m_indAnim->stop();
    m_indAnim->setStartValue(m_indicatorY);
    m_indAnim->setEndValue(targetY);
    m_indAnim->start();
}

void SidebarWidget::setCurrentTab(Tab t) {
    m_tab = t;
    for (int i = 0; i < 4; ++i)
        m_btns[i]->setActive(i == (int)t);
    animateIndicatorTo((int)t);
    emit tabChanged(t);
}

void SidebarWidget::onRunningChanged(bool running, const QString& title) {
    if (running) {
        m_dot->setColor(Pal::WARN);
        m_statusLbl->setText("Optimisation en cours");
        m_statusLbl->setStyleSheet(QString(
            "color: %1; background: transparent; font-size: 12px;")
            .arg(Pal::WARN.name()));
    } else {
        m_dot->setColor(Pal::OK);
        m_statusLbl->setText("Session active");
        m_statusLbl->setStyleSheet(QString(
            "color: %1; background: transparent; font-size: 12px;")
            .arg(Pal::OK.name()));
    }
}

void SidebarWidget::onLicenseActivated(const QString& plan, const QString& expiresAt) {
    updateSession();
}

void SidebarWidget::updateSession() {
    if (!m_ctrl) return;

    m_planLbl->setText(m_ctrl->plan());

    QString exp = m_ctrl->expiresAt();
    if (exp.isEmpty()) {
        m_expLbl->setText("Lifetime");
        m_expLbl->setStyleSheet(QString(
            "color: %1; background: transparent; font-size: 11px;")
            .arg(Pal::OK.name()));
    } else {
        m_expLbl->setText(exp.left(10));
        m_expLbl->setStyleSheet(QString(
            "color: %1; background: transparent; font-size: 11px;")
            .arg(Pal::WARN.name()));
    }

    QString h = m_ctrl->hwid();
    if (h.size() >= 12) h = h.left(6) + ".." + h.right(4);
    m_hwidLbl->setText(h);
}

void SidebarWidget::paintEvent(QPaintEvent* e) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    // Sidebar background
    p.fillRect(rect(), Pal::SIDEBAR);

    // Top-left gradient splash behind logo zone
    QLinearGradient grad(0, 0, 226, 0);
    grad.setColorAt(0, QColor(0, 140, 210, 28));
    grad.setColorAt(1, Qt::transparent);
    p.fillRect(QRect(0, 0, 226, 76), grad);

    // Animated indicator pill on the left edge
    if (m_indAnim) {
        int indH = 28;
        QRectF pill(0, m_indicatorY, 4, indH);
        // Gradient glow behind indicator
        QLinearGradient glow(4, m_indicatorY, 60, m_indicatorY + indH);
        glow.setColorAt(0, QColor(Pal::ACCENT.red(), Pal::ACCENT.green(), Pal::ACCENT.blue(), 22));
        glow.setColorAt(1, Qt::transparent);
        p.fillRect(QRectF(0, m_indicatorY, 60, indH), glow);
        // Pill itself
        p.setBrush(Pal::ACCENT);
        p.setPen(Qt::NoPen);
        p.drawRoundedRect(pill, 2, 2);
    }
}
