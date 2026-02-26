// ══════════════════════════════════════════════════════
//  AnimatedStackedWidget.h — Smooth page transitions
// ══════════════════════════════════════════════════════
#pragma once
#include <QStackedWidget>
#include <QPropertyAnimation>
#include <QParallelAnimationGroup>

class AnimatedStackedWidget : public QStackedWidget {
    Q_OBJECT
public:
    enum class Effect { Fade, SlideLeft, SlideRight };

    explicit AnimatedStackedWidget(QWidget* parent = nullptr);
    void setSpeed(int ms) { m_speed = ms; }
    void switchTo(int index, Effect effect = Effect::Fade);

private:
    int  m_speed     = 250;
    bool m_animating = false;
};
