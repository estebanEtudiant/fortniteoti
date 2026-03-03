// ══════════════════════════════════════════════════════
//  ToggleSwitch.h — iOS-style animated toggle button
// ══════════════════════════════════════════════════════
#pragma once
#include <QAbstractButton>
#include <QPropertyAnimation>

class ToggleSwitch : public QAbstractButton {
    Q_OBJECT
    Q_PROPERTY(qreal knobX READ knobX WRITE setKnobX)
public:
    explicit ToggleSwitch(QWidget* parent = nullptr);

    qreal knobX() const     { return m_knobX; }
    void  setKnobX(qreal x) { m_knobX = x; update(); }

    QSize sizeHint()        const override;
    QSize minimumSizeHint() const override;

protected:
    void paintEvent(QPaintEvent*)    override;
    void mouseReleaseEvent(QMouseEvent*) override;
    void keyPressEvent(QKeyEvent*)   override;

private:
    qreal               m_knobX = 4.0;
    QPropertyAnimation* m_anim  = nullptr;

    static constexpr int W  = 44;   // total width
    static constexpr int H  = 24;   // total height
    static constexpr int KD = 16;   // knob diameter
};
