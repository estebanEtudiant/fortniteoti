// ══════════════════════════════════════════════════════
//  MiniGraph.h — Small animated line graph (0-100 values)
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QVector>
#include <QColor>

class MiniGraph : public QWidget {
    Q_OBJECT
public:
    explicit MiniGraph(QWidget* parent = nullptr);

    void setColor(const QColor& c)  { m_color = c; }
    void setMaxSamples(int n)       { m_maxSamples = n; }
    void push(float value);         // 0.0 – 100.0

protected:
    void paintEvent(QPaintEvent*) override;

private:
    QVector<float> m_data;
    QColor         m_color { 0x00, 0xD1, 0xFF };
    int            m_maxSamples = 60;
};
