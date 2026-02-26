// ══════════════════════════════════════════════════════
//  GlowButton.h — Animated CTA button with glow/press
// ══════════════════════════════════════════════════════
#pragma once
#include <QPushButton>
#include <QPropertyAnimation>
#include <QColor>

class GlowButton : public QPushButton {
    Q_OBJECT
    Q_PROPERTY(qreal glowOpacity READ glowOpacity WRITE setGlowOpacity)
    Q_PROPERTY(qreal pressScale  READ pressScale  WRITE setPressScale)
public:
    enum class Style { Primary, Danger, Ghost };

    explicit GlowButton(const QString& text,
                        Style style = Style::Primary,
                        QWidget* parent = nullptr);

    qreal glowOpacity() const { return m_glowOpacity; }
    void  setGlowOpacity(qreal v) { m_glowOpacity = v; update(); }

    qreal pressScale() const { return m_pressScale; }
    void  setPressScale(qreal v) { m_pressScale = v; update(); }

    void setStyle(Style s) { m_style = s; update(); }

protected:
    void paintEvent(QPaintEvent*) override;
    void enterEvent(QEnterEvent*) override;
    void leaveEvent(QEvent*) override;
    void mousePressEvent(QMouseEvent*) override;
    void mouseReleaseEvent(QMouseEvent*) override;

private:
    Style               m_style;
    qreal               m_glowOpacity = 0.0;
    qreal               m_pressScale  = 1.0;
    QPropertyAnimation* m_hoverAnim   = nullptr;
    QPropertyAnimation* m_pressAnim   = nullptr;

    void animateGlow(qreal to, int ms);
    void animatePress(qreal to, int ms);
};
