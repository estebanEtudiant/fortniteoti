// ══════════════════════════════════════════════════════
//  TitleBarWidget.cpp
// ══════════════════════════════════════════════════════
#include "TitleBarWidget.h"
#include "Palette.h"

#include <QPainter>
#include <QPainterPath>
#include <QMouseEvent>
#include <QLinearGradient>
#include <QHBoxLayout>

// Button layout constants
static constexpr int BTN_W   = 46;
static constexpr int BTN_H   = 28;
static constexpr int BTN_TOP = 6;   // vertical offset in 40px bar

static QRect closeRect(int barW) {
    return QRect(barW - BTN_W - 6, BTN_TOP, BTN_W, BTN_H);
}
static QRect minRect(int barW) {
    return QRect(barW - BTN_W * 2 - 10, BTN_TOP, BTN_W, BTN_H);
}

TitleBarWidget::TitleBarWidget(QWidget* parent)
    : QWidget(parent)
{
    setFixedHeight(40);
    setAttribute(Qt::WA_StyledBackground, true);
    setMouseTracking(true);
}

// ── Helpers to draw the X and – icons via QPainterPath ──
static void drawMinIcon(QPainter& p, const QRect& r) {
    int cx = r.center().x();
    int cy = r.center().y() + 1;
    p.drawLine(QPoint(cx - 7, cy), QPoint(cx + 7, cy));
}

static void drawCloseIcon(QPainter& p, const QRect& r) {
    int cx = r.center().x();
    int cy = r.center().y();
    p.drawLine(QPoint(cx - 6, cy - 6), QPoint(cx + 6, cy + 6));
    p.drawLine(QPoint(cx + 6, cy - 6), QPoint(cx - 6, cy + 6));
}

void TitleBarWidget::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    // ── Background ────────────────────────────────────
    p.fillRect(rect(), Pal::TITLEBAR);

    // ── Accent gradient line at bottom ───────────────
    QLinearGradient grad(0, 38, width() * 0.6, 38);
    grad.setColorAt(0.0, QColor(0, 180, 240, 200));
    grad.setColorAt(1.0, Qt::transparent);
    p.fillRect(QRect(0, 38, width(), 2), grad);

    // ── Logo ──────────────────────────────────────────
    QFont logoFont("Segoe UI", 13, QFont::Bold);
    p.setFont(logoFont);
    p.setPen(Pal::ACCENT);
    p.drawText(QRect(18, 0, 140, 40), Qt::AlignVCenter, "404 Tweaks");

    QFont vFont("Segoe UI", 9);
    p.setFont(vFont);
    p.setPen(Pal::DIM);
    QFontMetrics fm(logoFont);
    int logoW = fm.horizontalAdvance("404 Tweaks");
    p.drawText(QRect(18 + logoW + 6, 0, 60, 40), Qt::AlignVCenter, "v2026");

    QPoint cursor = mapFromGlobal(QCursor::pos());

    // ── Minimize button ───────────────────────────────
    QRect mr = minRect(width());
    bool hoverMin = mr.contains(cursor);
    if (hoverMin) {
        p.setPen(Qt::NoPen);
        p.setBrush(QColor(255, 255, 255, 28));
        p.drawRoundedRect(mr, 5, 5);
    } else {
        p.setPen(Qt::NoPen);
        p.setBrush(QColor(255, 255, 255, 10));
        p.drawRoundedRect(mr, 5, 5);
    }
    // Draw — icon
    QPen linePen(hoverMin ? Pal::TEXT : Pal::DIM, 1.5f);
    linePen.setCapStyle(Qt::RoundCap);
    p.setPen(linePen);
    drawMinIcon(p, mr);

    // ── Close button ──────────────────────────────────
    QRect cr = closeRect(width());
    bool hoverClose = cr.contains(cursor);
    p.setPen(Qt::NoPen);
    if (hoverClose) {
        p.setBrush(QColor(0xC4, 0x2B, 0x2B, 220));
    } else {
        p.setBrush(QColor(255, 255, 255, 10));
    }
    p.drawRoundedRect(cr, 5, 5);

    QPen closePen(hoverClose ? Qt::white : Pal::DIM, 1.5f);
    closePen.setCapStyle(Qt::RoundCap);
    p.setPen(closePen);
    drawCloseIcon(p, cr);
}

void TitleBarWidget::mousePressEvent(QMouseEvent* e) {
    if (e->button() != Qt::LeftButton) return;

    if (closeRect(width()).contains(e->pos())) { emit closeRequested();    return; }
    if (minRect(width()).contains(e->pos()))   { emit minimizeRequested(); return; }

    m_dragging  = true;
    m_dragStart = e->globalPosition().toPoint() - window()->frameGeometry().topLeft();
    e->accept();
}

void TitleBarWidget::mouseMoveEvent(QMouseEvent* e) {
    if (m_dragging && (e->buttons() & Qt::LeftButton))
        window()->move(e->globalPosition().toPoint() - m_dragStart);
    update(); // repaint hover
}

void TitleBarWidget::mouseReleaseEvent(QMouseEvent*) {
    m_dragging = false;
}

void TitleBarWidget::mouseDoubleClickEvent(QMouseEvent*) {
    if (window()->isMaximized()) window()->showNormal();
    else window()->showMaximized();
}
