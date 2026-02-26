// ══════════════════════════════════════════════════════
//  HoverCard.cpp
// ══════════════════════════════════════════════════════
#include "HoverCard.h"
#include "Palette.h"

#include <QPainter>
#include <QPainterPath>
#include <QLinearGradient>
#include <QEnterEvent>

HoverCard::HoverCard(QWidget* parent, int radius)
    : QFrame(parent), m_radius(radius)
{
    setAttribute(Qt::WA_StyledBackground, false);
    setAttribute(Qt::WA_Hover, true);
    setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);

    m_anim = new QPropertyAnimation(this, "hoverProgress", this);
    m_anim->setEasingCurve(QEasingCurve::OutCubic);
}

void HoverCard::setHoverProgress(qreal v) {
    m_hover = v;
    update();
}

void HoverCard::enterEvent(QEnterEvent* e) {
    QFrame::enterEvent(e);
    m_anim->stop();
    m_anim->setDuration(180);
    m_anim->setStartValue(m_hover);
    m_anim->setEndValue(1.0);
    m_anim->start();
}

void HoverCard::leaveEvent(QEvent* e) {
    QFrame::leaveEvent(e);
    m_anim->stop();
    m_anim->setDuration(250);
    m_anim->setStartValue(m_hover);
    m_anim->setEndValue(0.0);
    m_anim->start();
}

void HoverCard::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    QRectF r = QRectF(rect()).adjusted(0.5, 0.5, -0.5, -0.5);
    QPainterPath path;
    path.addRoundedRect(r, m_radius, m_radius);

    // ── Base fill ─────────────────────────────────────
    QColor bg = Pal::CARD;
    // Slightly lighten on hover
    if (m_hover > 0) {
        int shift = (int)(m_hover * 8);
        bg = QColor(bg.red() + shift, bg.green() + shift, bg.blue() + shift);
    }
    p.fillPath(path, bg);

    // ── Top shimmer ───────────────────────────────────
    QLinearGradient shimmer(0, 0, 0, r.height() * 0.30);
    shimmer.setColorAt(0.0, QColor(255, 255, 255, 8 + (int)(m_hover * 10)));
    shimmer.setColorAt(1.0, Qt::transparent);
    p.fillPath(path, shimmer);

    // ── Accent glow on border (hover) ────────────────
    QColor borderCol = QColor(255, 255, 255, 18 + (int)(m_hover * 30));
    if (m_hover > 0) {
        // Blend border toward accent
        int ar = (int)(m_accent.red()   * m_hover * 0.5 + borderCol.red()   * (1 - m_hover * 0.5));
        int ag = (int)(m_accent.green() * m_hover * 0.5 + borderCol.green() * (1 - m_hover * 0.5));
        int ab = (int)(m_accent.blue()  * m_hover * 0.5 + borderCol.blue()  * (1 - m_hover * 0.5));
        int aa = (int)(18 + m_hover * 80);
        borderCol = QColor(ar, ag, ab, aa);
    }
    p.setPen(QPen(borderCol, 1.0));
    p.setBrush(Qt::NoBrush);
    p.drawPath(path);

    // ── Outer glow (halo) when hovering ──────────────
    if (m_hover > 0.01) {
        int alpha = (int)(m_hover * 20);
        QColor glowCol(m_accent.red(), m_accent.green(), m_accent.blue(), alpha);
        p.setPen(QPen(glowCol, 3.0));
        p.drawPath(path);
    }
}
