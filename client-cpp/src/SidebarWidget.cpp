#include "SidebarWidget.h"

#include "AppController.h"
#include "I18n.h"
#include "Palette.h"

#include <QEnterEvent>
#include <QEasingCurve>
#include <QFrame>
#include <QHBoxLayout>
#include <QPainter>
#include <QVBoxLayout>

#include <cmath>

NavButton::NavButton(const QString& text, QWidget* parent)
    : QPushButton(text, parent) {
    setFixedHeight(38);
    setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);
    setCursor(Qt::PointingHandCursor);
    setFlat(true);
    setMouseTracking(true);

    m_hAnim = new QPropertyAnimation(this, "hoverT", this);
    m_hAnim->setDuration(160);
    m_hAnim->setEasingCurve(QEasingCurve::OutQuad);
}

void NavButton::setActive(bool active) {
    m_active = active;
    if (active) {
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

    const QRect r = rect();

    if (m_active) {
        p.setPen(Qt::NoPen);
        p.setBrush(QColor(255, 255, 255, 14));
        p.drawRoundedRect(r.adjusted(4, 1, -4, -1), 6, 6);

        QColor accentGlow = Pal::ACCENT;
        accentGlow.setAlpha(35);
        p.setBrush(accentGlow);
        p.drawRoundedRect(QRect(3, 5, 10, 28), 5, 5);
    } else if (m_hoverT > 0.001) {
        const int alpha = static_cast<int>(m_hoverT * 10);
        p.setPen(Qt::NoPen);
        p.setBrush(QColor(255, 255, 255, alpha));
        p.drawRoundedRect(r.adjusted(4, 1, -4, -1), 6, 6);

        QColor accentHint = Pal::ACCENT;
        accentHint.setAlphaF(m_hoverT * 0.35);
        p.setBrush(accentHint);
        p.drawRoundedRect(QRect(4, 11, 2, 16), 1, 1);
    }

    QFont font("Segoe UI", 12);
    p.setFont(font);

    if (m_active) {
        p.setPen(Pal::TEXT);
    } else {
        const qreal t = m_hoverT;
        QColor col;
        col.setRgbF(
            Pal::DIM.redF() + (Pal::SOFT.redF() - Pal::DIM.redF()) * t,
            Pal::DIM.greenF() + (Pal::SOFT.greenF() - Pal::DIM.greenF()) * t,
            Pal::DIM.blueF() + (Pal::SOFT.blueF() - Pal::DIM.blueF()) * t);
        p.setPen(col);
    }

    p.drawText(QRect(18, 0, r.width() - 18, r.height()), Qt::AlignVCenter | Qt::AlignLeft, text());
}

PulsingDot::PulsingDot(QWidget* parent)
    : QWidget(parent) {
    setFixedSize(12, 12);
    m_timer = new QTimer(this);
    m_timer->setInterval(50);
    connect(m_timer, &QTimer::timeout, this, [this]() {
        m_tick = (m_tick + 1) % 60;
        update();
    });
    m_timer->start();
}

void PulsingDot::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    const double t = std::sin(m_tick * M_PI / 30.0) * 0.5 + 0.5;

    QColor glow = m_color;
    glow.setAlpha(static_cast<int>(t * 60 + 10));
    p.setPen(Qt::NoPen);
    p.setBrush(glow);
    p.drawEllipse(QPoint(6, 6), 5, 5);

    p.setBrush(m_color);
    p.drawEllipse(QPoint(6, 6), 3, 3);
}

namespace {
QLabel* mkSection(const QString& text) {
    auto* label = new QLabel(text);
    label->setStyleSheet(
        "color: rgba(180,180,200,0.55); background: transparent; "
        "font-size: 9px; font-weight: 700; "
        "letter-spacing: 1.4px; padding-left: 14px;");
    label->setFixedHeight(24);
    return label;
}
}

SidebarWidget::SidebarWidget(AppController* ctrl, QWidget* parent)
    : QWidget(parent), m_ctrl(ctrl) {
    setFixedWidth(200);
    m_indAnim = new QPropertyAnimation(this, "indicatorY", this);
    m_indAnim->setDuration(280);
    m_indAnim->setEasingCurve(QEasingCurve::OutCubic);

    buildUi();
    updateSession();

    connect(&I18n::instance(), &I18n::languageChanged, this, [this]() {
        applyTranslations();
    });

    applyTranslations();
    QTimer::singleShot(0, this, [this]() { animateIndicatorTo(0); });
}

void SidebarWidget::buildUi() {
    auto* outerV = new QVBoxLayout(this);
    outerV->setContentsMargins(8, 12, 8, 12);
    outerV->setSpacing(0);

    m_logoLbl = new QLabel;
    m_logoLbl->setFixedHeight(36);
    QFont logoFont("Segoe UI", 13, QFont::DemiBold);
    m_logoLbl->setFont(logoFont);
    m_logoLbl->setStyleSheet(QString("color: %1; background: transparent; padding-left: 14px;").arg(Pal::ACCENT.name()));
    outerV->addWidget(m_logoLbl);
    outerV->addSpacing(6);

    auto* sep1 = new QFrame;
    sep1->setFrameShape(QFrame::HLine);
    sep1->setFixedHeight(1);
    sep1->setStyleSheet(QString("background: %1; margin: 0 4px;").arg(Pal::BORDER.name()));
    outerV->addWidget(sep1);
    outerV->addSpacing(6);

    m_systemSectionLbl = mkSection("");
    outerV->addWidget(m_systemSectionLbl);

    for (int i = 0; i <= 3; ++i) {
        m_btns[i] = new NavButton("");
        connect(m_btns[i], &QPushButton::clicked, this, [this, i]() {
            setCurrentTab(static_cast<Tab>(i));
        });
        outerV->addWidget(m_btns[i]);
        outerV->addSpacing(1);
    }

    outerV->addSpacing(6);

    m_optimizationSectionLbl = mkSection("");
    outerV->addWidget(m_optimizationSectionLbl);

    for (int i = 4; i <= 7; ++i) {
        m_btns[i] = new NavButton("");
        connect(m_btns[i], &QPushButton::clicked, this, [this, i]() {
            setCurrentTab(static_cast<Tab>(i));
        });
        outerV->addWidget(m_btns[i]);
        outerV->addSpacing(1);
    }

    outerV->addSpacing(6);

    m_gameplaySectionLbl = mkSection("");
    outerV->addWidget(m_gameplaySectionLbl);

    for (int i = 8; i < TAB_COUNT; ++i) {
        m_btns[i] = new NavButton("");
        connect(m_btns[i], &QPushButton::clicked, this, [this, i]() {
            setCurrentTab(static_cast<Tab>(i));
        });
        outerV->addWidget(m_btns[i]);
        outerV->addSpacing(1);
    }

    m_btns[0]->setActive(true);
    outerV->addStretch();

    auto* sep2 = new QFrame;
    sep2->setFrameShape(QFrame::HLine);
    sep2->setFixedHeight(1);
    sep2->setStyleSheet(sep1->styleSheet());
    outerV->addWidget(sep2);
    outerV->addSpacing(10);

    auto makeInfo = [&](QLabel*& lbl, const QColor& color) {
        lbl = new QLabel("-");
        lbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px; padding-left: 12px;").arg(color.name()));
        outerV->addWidget(lbl);
        outerV->addSpacing(2);
    };

    auto* statusRow = new QHBoxLayout;
    statusRow->setContentsMargins(12, 0, 0, 0);
    statusRow->setSpacing(6);

    m_dot = new PulsingDot;
    statusRow->addWidget(m_dot);

    m_statusLbl = new QLabel;
    m_statusLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;").arg(Pal::OK.name()));
    statusRow->addWidget(m_statusLbl, 1);

    outerV->addLayout(statusRow);
    outerV->addSpacing(4);

    makeInfo(m_planLbl, Pal::ACCENT);
    makeInfo(m_expLbl, Pal::DIM);
    makeInfo(m_hwidLbl, Pal::DIM);
    outerV->addSpacing(4);
}

void SidebarWidget::animateIndicatorTo(int tabIndex) {
    if (!m_btns[tabIndex]) return;
    const QPoint btnPos = m_btns[tabIndex]->mapTo(this, QPoint(0, 0));
    const qreal targetY = btnPos.y() + m_btns[tabIndex]->height() / 2.0 - 12;

    m_indAnim->stop();
    m_indAnim->setStartValue(m_indicatorY);
    m_indAnim->setEndValue(targetY);
    m_indAnim->start();
}

void SidebarWidget::setCurrentTab(Tab t) {
    m_tab = t;
    for (int i = 0; i < TAB_COUNT; ++i) {
        if (m_btns[i]) m_btns[i]->setActive(i == static_cast<int>(t));
    }
    animateIndicatorTo(static_cast<int>(t));
    emit tabChanged(t);
}

void SidebarWidget::onRunningChanged(bool running, const QString&) {
    m_running = running;

    if (running) {
        m_dot->setColor(Pal::WARN);
        m_statusLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;").arg(Pal::WARN.name()));
    } else {
        m_dot->setColor(Pal::OK);
        m_statusLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;").arg(Pal::OK.name()));
    }

    m_statusLbl->setText(I18n::instance().text(running ? "sidebar.status.running" : "sidebar.status.active"));
    m_dot->update();
}

void SidebarWidget::onLicenseActivated(const QString&, const QString&) {
    updateSession();
}

void SidebarWidget::updateSession() {
    if (!m_ctrl) return;

    m_planLbl->setText(m_ctrl->plan());

    const QString exp = m_ctrl->expiresAt();
    if (exp.isEmpty()) {
        m_expLbl->setText(I18n::instance().text("sidebar.expiration.lifetime"));
        m_expLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px; padding-left: 12px;").arg(Pal::OK.name()));
    } else {
        m_expLbl->setText(exp.left(10));
        m_expLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px; padding-left: 12px;").arg(Pal::DIM.name()));
    }

    QString hwid = m_ctrl->hwid();
    if (hwid.size() >= 12) hwid = hwid.left(6) + ".." + hwid.right(4);
    m_hwidLbl->setText(hwid);
}

void SidebarWidget::applyTranslations() {
    const auto& i18n = I18n::instance();

    if (m_logoLbl) m_logoLbl->setText(i18n.text("common.app_name"));
    if (m_systemSectionLbl) m_systemSectionLbl->setText(i18n.text("sidebar.section.system"));
    if (m_optimizationSectionLbl) m_optimizationSectionLbl->setText(i18n.text("sidebar.section.optimization"));
    if (m_gameplaySectionLbl) m_gameplaySectionLbl->setText(i18n.text("sidebar.section.gameplay"));

    const QString labels[TAB_COUNT] = {
        i18n.text("sidebar.tab.dashboard"),
        i18n.text("sidebar.tab.modules"),
        i18n.text("sidebar.tab.logs"),
        i18n.text("sidebar.tab.settings"),
        i18n.text("sidebar.tab.guide"),
        i18n.text("sidebar.tab.network"),
        i18n.text("sidebar.tab.drivers"),
        i18n.text("sidebar.tab.fortnite"),
        i18n.text("sidebar.tab.macros"),
    };

    for (int i = 0; i < TAB_COUNT; ++i) {
        if (m_btns[i]) m_btns[i]->setText(labels[i]);
    }

    m_statusLbl->setText(i18n.text(m_running ? "sidebar.status.running" : "sidebar.status.active"));
    updateSession();
}

void SidebarWidget::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    p.fillRect(rect(), Pal::SIDEBAR);
    p.fillRect(QRect(width() - 1, 0, 1, height()), Pal::BORDER);

    const int iy = static_cast<int>(m_indicatorY);

    QColor glow = Pal::ACCENT;
    glow.setAlpha(38);
    p.setPen(Qt::NoPen);
    p.setBrush(glow);
    p.drawRoundedRect(QRect(0, iy - 2, 9, 28), 4, 4);

    p.setBrush(Pal::ACCENT);
    p.drawRoundedRect(QRect(0, iy, 3, 24), 2, 2);
}
