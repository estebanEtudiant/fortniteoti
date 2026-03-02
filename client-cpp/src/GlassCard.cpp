// ══════════════════════════════════════════════════════
//  GlassCard.cpp — Flat dark card, no glass effects
// ══════════════════════════════════════════════════════
#include "GlassCard.h"
#include "Palette.h"

#include <QPainter>
#include <QPainterPath>

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

    // ── Flat background ───────────────────────────────
    p.setPen(Qt::NoPen);
    p.fillPath(path, Pal::CARD);

    // ── Accent: 2px top line (solid, centered) ────────
    if (m_accent.isValid() && m_accent.alpha() > 0) {
        QRectF accentLine(r.left() + m_radius, r.top() + 0.5,
                          r.width() - m_radius * 2, 2);
        p.setBrush(QColor(m_accent.red(), m_accent.green(),
                          m_accent.blue(), 140));
        p.drawRect(accentLine);
    }

    // ── Border ────────────────────────────────────────
    p.setPen(QPen(Pal::BORDER, 1.0));
    p.setBrush(Qt::NoBrush);
    p.drawPath(path);
}
