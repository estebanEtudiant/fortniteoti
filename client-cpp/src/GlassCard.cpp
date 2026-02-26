// ══════════════════════════════════════════════════════
//  GlassCard.cpp
// ══════════════════════════════════════════════════════
#include "GlassCard.h"
#include "Palette.h"

#include <QPainter>
#include <QPainterPath>
#include <QLinearGradient>

GlassCard::GlassCard(QWidget* parent, int radius, const QColor& accentColor)
    : QFrame(parent), m_radius(radius), m_accent(accentColor)
{
    setAttribute(Qt::WA_StyledBackground, false);
    setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
}

void GlassCard::setAccentColor(const QColor& c) { m_accent = c; update(); }
void GlassCard::setRadius(int r) { m_radius = r; update(); }

void GlassCard::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    QRectF r = QRectF(rect()).adjusted(0.5, 0.5, -0.5, -0.5);
    QPainterPath path;
    path.addRoundedRect(r, m_radius, m_radius);

    // ── Background fill (glass base) ─────────────────
    p.fillPath(path, Pal::CARD);

    // ── Top specular shimmer (white gradient, 30% height) ──
    QLinearGradient shimmer(0, 0, 0, r.height() * 0.32);
    shimmer.setColorAt(0.0, QColor(255, 255, 255, 10));
    shimmer.setColorAt(1.0, Qt::transparent);
    p.fillPath(path, shimmer);

    // ── Accent top line (if accent set) ──────────────
    if (m_accent.isValid() && m_accent.alpha() > 0) {
        QRectF accentLine(r.left() + m_radius, r.top() + 0.5,
                          r.width() - m_radius * 2, 2);
        QLinearGradient ag(accentLine.left(), 0, accentLine.right(), 0);
        ag.setColorAt(0.0, Qt::transparent);
        ag.setColorAt(0.3, QColor(m_accent.red(), m_accent.green(),
                                  m_accent.blue(), 160));
        ag.setColorAt(0.7, QColor(m_accent.red(), m_accent.green(),
                                  m_accent.blue(), 160));
        ag.setColorAt(1.0, Qt::transparent);
        p.setPen(Qt::NoPen);
        p.setBrush(ag);
        p.drawRect(accentLine);
    }

    // ── Border ────────────────────────────────────────
    p.setPen(QPen(QColor(255, 255, 255, 22), 1.0));
    p.setBrush(Qt::NoBrush);
    p.drawPath(path);
}
