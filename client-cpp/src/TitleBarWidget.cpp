// ══════════════════════════════════════════════════════
//  TitleBarWidget.cpp — Minimal flat title bar
// ══════════════════════════════════════════════════════
#include "TitleBarWidget.h"
#include "Palette.h"

#include <QPainter>
#include <QMouseEvent>
#include <QHBoxLayout>

static constexpr int BTN_W   = 44;
static constexpr int BTN_H   = 26;
static constexpr int BTN_TOP = 7;

static QRect closeRect(int barW) {
    return QRect(barW - BTN_W - 8, BTN_TOP, BTN_W, BTN_H);
}
static QRect minRect(int barW) {
    return QRect(barW - BTN_W * 2 - 14, BTN_TOP, BTN_W, BTN_H);
}

TitleBarWidget::TitleBarWidget(QWidget* parent)
    : QWidget(parent)
{
    setFixedHeight(40);
    setAttribute(Qt::WA_StyledBackground, true);
    setMouseTracking(true);
}

static void drawMinIcon(QPainter& p, const QRect& r) {
    int cx = r.center().x();
    int cy = r.center().y() + 1;
    p.drawLine(QPoint(cx - 6, cy), QPoint(cx + 6, cy));
}

static void drawCloseIcon(QPainter& p, const QRect& r) {
    int cx = r.center().x();
    int cy = r.center().y();
    p.drawLine(QPoint(cx - 5, cy - 5), QPoint(cx + 5, cy + 5));
    p.drawLine(QPoint(cx + 5, cy - 5), QPoint(cx - 5, cy + 5));
}

void TitleBarWidget::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    // ── Background ────────────────────────────────────
    p.fillRect(rect(), Pal::TITLEBAR);

    // ── Bottom border line (1px) ──────────────────────
    p.fillRect(QRect(0, 39, width(), 1), Pal::BORDER);

    // ── Logo ──────────────────────────────────────────
    QFont logoFont("Segoe UI", 12, QFont::DemiBold);
    p.setFont(logoFont);
    p.setPen(Pal::TEXT);
    p.drawText(QRect(16, 0, 120, 40), Qt::AlignVCenter, "404 Tweaks");

    // ── Version tag ───────────────────────────────────
    QFontMetrics fm(logoFont);
    int lw = fm.horizontalAdvance("404 Tweaks");
    QFont vFont("Segoe UI", 9);
    p.setFont(vFont);
    p.setPen(Pal::DIM);
    p.drawText(QRect(16 + lw + 8, 0, 50, 40), Qt::AlignVCenter, "v2026");

    QPoint cursor = mapFromGlobal(QCursor::pos());

    // ── Minimize ──────────────────────────────────────
    QRect mr = minRect(width());
    bool hMin = mr.contains(cursor);
    if (hMin) {
        p.setPen(Qt::NoPen);
        p.setBrush(QColor(255, 255, 255, 20));
        p.drawRoundedRect(mr, 5, 5);
    }
    QPen mPen(hMin ? Pal::TEXT : Pal::DIM, 1.4f);
    mPen.setCapStyle(Qt::RoundCap);
    p.setPen(mPen);
    drawMinIcon(p, mr);

    // ── Close ─────────────────────────────────────────
    QRect cr = closeRect(width());
    bool hClose = cr.contains(cursor);
    p.setPen(Qt::NoPen);
    p.setBrush(hClose ? QColor(0xC0, 0x28, 0x28, 200)
                      : QColor(255, 255, 255, 0));
    p.drawRoundedRect(cr, 5, 5);
    QPen cPen(hClose ? QColor(255, 255, 255) : Pal::DIM, 1.4f);
    cPen.setCapStyle(Qt::RoundCap);
    p.setPen(cPen);
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
    update();
}

void TitleBarWidget::mouseReleaseEvent(QMouseEvent*) {
    m_dragging = false;
}

void TitleBarWidget::mouseDoubleClickEvent(QMouseEvent*) {
    if (window()->isMaximized()) window()->showNormal();
    else window()->showMaximized();
}
