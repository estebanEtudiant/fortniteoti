// ══════════════════════════════════════════════════════
//  GlassCard.h — Glassmorphism card base widget
// ══════════════════════════════════════════════════════
#pragma once
#include <QFrame>
#include <QColor>

class GlassCard : public QFrame {
    Q_OBJECT
public:
    explicit GlassCard(QWidget* parent = nullptr,
                       int radius = 10,
                       const QColor& accentColor = Qt::transparent);
    void setAccentColor(const QColor& c);
    void setRadius(int r);

protected:
    void paintEvent(QPaintEvent*) override;

private:
    int    m_radius;
    QColor m_accent;
};
