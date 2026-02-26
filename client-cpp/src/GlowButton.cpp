// ══════════════════════════════════════════════════════
//  GlowButton.cpp
// ══════════════════════════════════════════════════════
#include "GlowButton.h"
#include "Palette.h"

#include <QPainter>
#include <QPainterPath>
#include <QRadialGradient>
#include <QLinearGradient>
#include <QMouseEvent>
#include <QFontMetrics>

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
    m_pressAnim->setEasingCurve(QEasingCurve::OutBack);
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
    animateGlow(1.0, 150);
}

void GlowButton::leaveEvent(QEvent* e) {
    QPushButton::leaveEvent(e);
    animateGlow(0.0, 220);
}

void GlowButton::mousePressEvent(QMouseEvent* e) {
    QPushButton::mousePressEvent(e);
    animatePress(0.96, 80);
}

void GlowButton::mouseReleaseEvent(QMouseEvent* e) {
    QPushButton::mouseReleaseEvent(e);
    animatePress(1.0, 180);
}

void GlowButton::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    QRectF r = QRectF(rect());
    // Apply press scale transform
    if (qAbs(m_pressScale - 1.0) > 0.001) {
        p.translate(r.center());
        p.scale(m_pressScale, m_pressScale);
        p.translate(-r.center());
    }

    QRectF br = r.adjusted(1, 1, -1, -1);
    QPainterPath path;
    path.addRoundedRect(br, 10, 10);

    bool dis = !isEnabled();
    qreal disAlpha = dis ? 0.45 : 1.0;

    if (m_style == Style::Primary) {
        // ── Outer glow halo ───────────────────────────
        if (m_glowOpacity > 0.01 && !dis) {
            QColor gc(0, 200, 255, (int)(m_glowOpacity * 50));
            p.setPen(QPen(gc, 6.0));
            p.setBrush(Qt::NoBrush);
            p.drawPath(path);
        }
        // ── Gradient fill ─────────────────────────────
        QLinearGradient grad(0, 0, br.width(), 0);
        if (dis) {
            grad.setColorAt(0, QColor(60, 90, 110));
            grad.setColorAt(1, QColor(40, 60, 90));
        } else {
            // Hover: brighter
            int baseAlpha = (int)(255 * disAlpha);
            QColor c1 = QColor(0, 200, 255, baseAlpha);
            QColor c2 = QColor(45, 80, 200, baseAlpha);
            if (m_glowOpacity > 0) {
                // shift toward lighter on hover
                c1 = QColor(30, 215, 255, baseAlpha);
                c2 = QColor(60, 100, 215, baseAlpha);
            }
            grad.setColorAt(0, c1);
            grad.setColorAt(1, c2);
        }
        p.setPen(Qt::NoPen);
        p.fillPath(path, grad);

        // ── Top highlight (white shimmer) ──────────────
        QLinearGradient hi(0, br.top(), 0, br.top() + br.height() * 0.42);
        hi.setColorAt(0, QColor(255, 255, 255, dis ? 0 : 30));
        hi.setColorAt(1, Qt::transparent);
        p.fillPath(path, hi);

    } else if (m_style == Style::Danger) {
        if (m_glowOpacity > 0.01 && !dis) {
            QColor gc(220, 40, 40, (int)(m_glowOpacity * 50));
            p.setPen(QPen(gc, 6.0));
            p.setBrush(Qt::NoBrush);
            p.drawPath(path);
        }
        QLinearGradient grad(0, 0, br.width(), 0);
        grad.setColorAt(0, dis ? QColor(80,30,30) : QColor(180, 30, 35));
        grad.setColorAt(1, dis ? QColor(60,20,20) : QColor(130, 20, 30));
        if (m_glowOpacity > 0 && !dis) {
            grad.setColorAt(0, QColor(210, 40, 45));
            grad.setColorAt(1, QColor(155, 25, 35));
        }
        p.setPen(Qt::NoPen);
        p.fillPath(path, grad);
        QLinearGradient hi(0, br.top(), 0, br.top() + br.height() * 0.40);
        hi.setColorAt(0, QColor(255, 255, 255, 20));
        hi.setColorAt(1, Qt::transparent);
        p.fillPath(path, hi);

    } else { // Ghost
        // ── Subtle border + optional fill ────────────
        QColor borderCol(255, 255, 255, 40 + (int)(m_glowOpacity * 50));
        p.setPen(QPen(borderCol, 1.0));
        QColor fillCol(255, 255, 255, (int)(m_glowOpacity * 18));
        p.setBrush(fillCol);
        p.drawPath(path);
    }

    // ── Label ─────────────────────────────────────────
    QColor textCol;
    if (dis) {
        textCol = QColor(160, 160, 160, 130);
    } else if (m_style == Style::Ghost) {
        textCol = Pal::TEXT;
    } else {
        textCol = (m_style == Style::Primary) ? QColor(5, 10, 16) : Pal::TEXT;
    }

    QFont f = font();
    f.setWeight(m_style == Style::Ghost ? QFont::Normal : QFont::Bold);
    p.setFont(f);
    p.setPen(textCol);

    qreal offsetY = (m_pressScale < 1.0) ? 1.0 : 0.0;
    p.drawText(br.adjusted(0, offsetY, 0, offsetY), Qt::AlignCenter, text());
}
