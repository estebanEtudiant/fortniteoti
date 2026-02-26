// ══════════════════════════════════════════════════════
//  HoverCard.h — Animated hover effect card
// ══════════════════════════════════════════════════════
#pragma once
#include <QFrame>
#include <QPropertyAnimation>
#include <QColor>

class HoverCard : public QFrame {
    Q_OBJECT
    Q_PROPERTY(qreal hoverProgress READ hoverProgress WRITE setHoverProgress)
public:
    explicit HoverCard(QWidget* parent = nullptr, int radius = 10);

    qreal hoverProgress() const { return m_hover; }
    void  setHoverProgress(qreal v);

    void setAccentColor(const QColor& c) { m_accent = c; }

protected:
    void paintEvent(QPaintEvent*) override;
    void enterEvent(QEnterEvent*) override;
    void leaveEvent(QEvent*) override;

private:
    qreal               m_hover  = 0.0;
    int                 m_radius;
    QColor              m_accent { 0x00, 0xD1, 0xFF };
    QPropertyAnimation* m_anim   = nullptr;
};
