// ══════════════════════════════════════════════════════
//  GlowButton.cpp — Flat button, no glow halo
// ══════════════════════════════════════════════════════
#include "GlowButton.h"
#include "Palette.h"

#include <QPainter>
#include <QPainterPath>
#include <QMouseEvent>

GlowButton::GlowButton(const QString& text, Style style, QWidget* parent)
    : QPushButton(text, parent), m_style(style)
{
    setFlat(true);
    setCursor(Qt::PointingHandCursor);
    setAttribute(Qt::WA_Hover, true);
    setFixedHeight(44);

    m_hoverAnim = new QPropertyAnimation(this, "glowOpacity", this);
    m_hoverAnim->setEasingCurve(QEasingCurve::OutQuad);

    m_pressAnim = new QPropertyAnimation(this, "pressScale", this);
    m_pressAnim->setEasingCurve(QEasingCurve::OutCubic);
}

void GlowButton::animateGlow(qreal to, int ms) {
    m_hoverAnim->stop();
    m_hoverAnim->setDuration(ms);
    m_hoverAnim->setStartValue(m_glowOpacity);
    m_hoverAnim->setEndValue(to);
    m_hoverAnim->start();
}

void GlowButton::animatePress(qreal to, int ms) {
    m_pressAnim->stop();
    m_pressAnim->setDuration(ms);
    m_pressAnim->setStartValue(m_pressScale);
    m_pressAnim->setEndValue(to);
    m_pressAnim->start();
}

void GlowButton::enterEvent(QEnterEvent* e) {
    QPushButton::enterEvent(e);
    animateGlow(1.0, 140);
}

void GlowButton::leaveEvent(QEvent* e) {
    QPushButton::leaveEvent(e);
    animateGlow(0.0, 200);
}

void GlowButton::mousePressEvent(QMouseEvent* e) {
    QPushButton::mousePressEvent(e);
    animatePress(0.97, 70);
}

void GlowButton::mouseReleaseEvent(QMouseEvent* e) {
    QPushButton::mouseReleaseEvent(e);
    animatePress(1.0, 160);
}

void GlowButton::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    QRectF r = QRectF(rect());

    // Apply press scale
    if (qAbs(m_pressScale - 1.0) > 0.001) {
        p.translate(r.center());
        p.scale(m_pressScale, m_pressScale);
        p.translate(-r.center());
    }

    QRectF br = r.adjusted(1, 1, -1, -1);
    QPainterPath path;
    path.addRoundedRect(br, 8, 8);

    bool dis = !isEnabled();

    if (m_style == Style::Primary) {
        // Flat cyan — hover brightens slightly
        QColor base = dis   ? QColor(0x00, 0x70, 0x8C)
                    : (m_glowOpacity > 0.5) ? Pal::ACCENT_H
                    : Pal::ACCENT;
        if (dis) base.setAlpha(140);
        p.setPen(Qt::NoPen);
        p.fillPath(path, base);

    } else if (m_style == Style::Danger) {
        // Flat red
        QColor base = dis   ? QColor(0x60, 0x1C, 0x1C)
                    : (m_glowOpacity > 0.5) ? QColor(0xF8, 0x71, 0x71)
                    : Pal::ERR;
        if (dis) base.setAlpha(140);
        p.setPen(Qt::NoPen);
        p.fillPath(path, base);

    } else {
        // Ghost: border + subtle hover fill
        QColor fill(255, 255, 255, (int)(m_glowOpacity * 14));
        QColor border = dis ? QColor(Pal::BORDER.red(), Pal::BORDER.green(), Pal::BORDER.blue(), 100)
                            : Pal::BORDER;
        p.setBrush(fill);
        p.setPen(QPen(border, 1.0));
        p.drawPath(path);
    }

    // ── Label ─────────────────────────────────────────
    QColor textCol;
    if (dis) {
        textCol = QColor(160, 160, 160, 110);
    } else if (m_style == Style::Ghost) {
        textCol = Pal::TEXT;
    } else if (m_style == Style::Primary) {
        // Dark text on cyan background
        textCol = QColor(0x04, 0x0C, 0x14);
    } else {
        textCol = Pal::TEXT;
    }

    QFont f = font();
    f.setWeight(m_style == Style::Ghost ? QFont::Normal : QFont::DemiBold);
    p.setFont(f);
    p.setPen(textCol);
    p.drawText(br, Qt::AlignCenter, text());
}
