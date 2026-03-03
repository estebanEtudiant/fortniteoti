// ══════════════════════════════════════════════════════
//  ToggleSwitch.cpp
// ══════════════════════════════════════════════════════
#include "ToggleSwitch.h"
#include "Palette.h"

#include <QPainter>
#include <QMouseEvent>
#include <QKeyEvent>

ToggleSwitch::ToggleSwitch(QWidget* parent) : QAbstractButton(parent)
{
    setCheckable(true);
    setCursor(Qt::PointingHandCursor);
    setFixedSize(W, H);

    m_anim = new QPropertyAnimation(this, "knobX", this);
    m_anim->setDuration(180);
    m_anim->setEasingCurve(QEasingCurve::OutCubic);

    // Animate knob whenever checked state changes
    connect(this, &QAbstractButton::toggled, this, [this](bool on) {
        m_anim->stop();
        m_anim->setStartValue(m_knobX);
        m_anim->setEndValue(on ? qreal(W - 4 - KD) : 4.0);
        m_anim->start();
    });
}

QSize ToggleSwitch::sizeHint()        const { return QSize(W, H); }
QSize ToggleSwitch::minimumSizeHint() const { return sizeHint(); }

void ToggleSwitch::mouseReleaseEvent(QMouseEvent* e)
{
    if (e->button() == Qt::LeftButton)
        setChecked(!isChecked());
}

void ToggleSwitch::keyPressEvent(QKeyEvent* e)
{
    if (e->key() == Qt::Key_Space || e->key() == Qt::Key_Return)
        setChecked(!isChecked());
    else
        QAbstractButton::keyPressEvent(e);
}

void ToggleSwitch::paintEvent(QPaintEvent*)
{
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    // ── Track ───────────────────────────────────────
    QColor trackCol = isChecked() ? Pal::ACCENT : Pal::FRAME;
    p.setPen(Qt::NoPen);
    p.setBrush(trackCol);
    p.drawRoundedRect(rect(), H / 2, H / 2);

    // ── Track border ────────────────────────────────
    QColor borderCol = isChecked() ? Pal::ACCENT : Pal::BORDER;
    p.setPen(QPen(borderCol, 1));
    p.setBrush(Qt::NoBrush);
    p.drawRoundedRect(QRectF(0.5, 0.5, W - 1, H - 1),
                      H / 2.0 - 0.5, H / 2.0 - 0.5);

    // ── Knob shadow ─────────────────────────────────
    p.setPen(Qt::NoPen);
    p.setBrush(QColor(0, 0, 0, 35));
    p.drawEllipse(QRectF(m_knobX + 1.0, 5.0, KD, KD));

    // ── Knob ────────────────────────────────────────
    QColor knobCol = isChecked() ? QColor(12, 12, 18) : QColor(168, 168, 180);
    p.setBrush(knobCol);
    p.drawEllipse(QRectF(m_knobX, 4.0, KD, KD));
}
