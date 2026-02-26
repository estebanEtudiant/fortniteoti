// ══════════════════════════════════════════════════════
//  MiniGraph.cpp
// ══════════════════════════════════════════════════════
#include "MiniGraph.h"

#include <QPainter>
#include <QPainterPath>
#include <QLinearGradient>

MiniGraph::MiniGraph(QWidget* parent)
    : QWidget(parent)
{
    setMinimumHeight(48);
    setAttribute(Qt::WA_TranslucentBackground);
}

void MiniGraph::push(float value) {
    value = qBound(0.f, value, 100.f);
    m_data.append(value);
    while (m_data.size() > m_maxSamples)
        m_data.removeFirst();
    update();
}

void MiniGraph::paintEvent(QPaintEvent*) {
    if (m_data.size() < 2) return;

    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    const int   n  = m_data.size();
    const float w  = width();
    const float h  = height();
    const float dx = w / float(n - 1);

    // Build path
    QPainterPath linePath;
    for (int i = 0; i < n; ++i) {
        float x = i * dx;
        float y = h - (m_data[i] / 100.f) * h;
        if (i == 0) linePath.moveTo(x, y);
        else        linePath.lineTo(x, y);
    }

    // Filled area under curve
    QPainterPath fillPath = linePath;
    fillPath.lineTo(w, h);
    fillPath.lineTo(0, h);
    fillPath.closeSubpath();

    QLinearGradient grad(0, 0, 0, h);
    grad.setColorAt(0.0, QColor(m_color.red(), m_color.green(), m_color.blue(), 55));
    grad.setColorAt(1.0, QColor(m_color.red(), m_color.green(), m_color.blue(), 4));
    p.setPen(Qt::NoPen);
    p.setBrush(grad);
    p.drawPath(fillPath);

    // Line
    p.setPen(QPen(m_color, 1.5f));
    p.setBrush(Qt::NoBrush);
    p.drawPath(linePath);

    // Subtle horizontal grid at 25 / 50 / 75 %
    p.setPen(QPen(QColor(255, 255, 255, 12), 1));
    for (int pct : {25, 50, 75}) {
        float y = h - (pct / 100.f) * h;
        p.drawLine(QPointF(0, y), QPointF(w, y));
    }
}
