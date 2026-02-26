// ══════════════════════════════════════════════════════
//  AnimatedStackedWidget.cpp
// ══════════════════════════════════════════════════════
#include "AnimatedStackedWidget.h"

#include <QGraphicsOpacityEffect>
#include <QEasingCurve>

AnimatedStackedWidget::AnimatedStackedWidget(QWidget* parent)
    : QStackedWidget(parent)
{}

void AnimatedStackedWidget::switchTo(int index, Effect effect) {
    if (index == currentIndex() || m_animating) {
        setCurrentIndex(index);
        return;
    }

    QWidget* nextW = widget(index);
    if (!nextW) return;

    m_animating = true;

    if (effect == Effect::Fade) {
        // ── Fade: next widget fades in from 0 -> 1 ──
        setCurrentIndex(index);

        auto* fx = new QGraphicsOpacityEffect(nextW);
        nextW->setGraphicsEffect(fx);
        fx->setOpacity(0.0);

        auto* anim = new QPropertyAnimation(fx, "opacity", this);
        anim->setDuration(m_speed);
        anim->setStartValue(0.0);
        anim->setEndValue(1.0);
        anim->setEasingCurve(QEasingCurve::OutCubic);

        connect(anim, &QPropertyAnimation::finished, this, [this, nextW]() {
            nextW->setGraphicsEffect(nullptr); // Qt deletes the effect
            m_animating = false;
        });
        anim->start(QAbstractAnimation::DeleteWhenStopped);

    } else {
        // ── Slide: outgoing page slides out, incoming slides in ──
        QWidget* curW = currentWidget();
        int dir = (effect == Effect::SlideLeft) ? -1 : 1;
        int w   = width();

        // Show next page behind current
        nextW->setGeometry(dir * w, 0, w, height());
        nextW->show();
        nextW->raise();

        auto* group = new QParallelAnimationGroup(this);

        // Move current out
        auto* outAnim = new QPropertyAnimation(curW, "pos", group);
        outAnim->setDuration(m_speed);
        outAnim->setStartValue(curW->pos());
        outAnim->setEndValue(QPoint(-dir * w, 0));
        outAnim->setEasingCurve(QEasingCurve::OutCubic);

        // Move next in
        auto* inAnim = new QPropertyAnimation(nextW, "pos", group);
        inAnim->setDuration(m_speed);
        inAnim->setStartValue(QPoint(dir * w, 0));
        inAnim->setEndValue(QPoint(0, 0));
        inAnim->setEasingCurve(QEasingCurve::OutCubic);

        // Fade for extra polish
        auto* fxIn = new QGraphicsOpacityEffect(nextW);
        nextW->setGraphicsEffect(fxIn);
        fxIn->setOpacity(0.0);
        auto* fadeIn = new QPropertyAnimation(fxIn, "opacity", group);
        fadeIn->setDuration(m_speed);
        fadeIn->setStartValue(0.0);
        fadeIn->setEndValue(1.0);
        fadeIn->setEasingCurve(QEasingCurve::OutCubic);

        group->addAnimation(outAnim);
        group->addAnimation(inAnim);
        group->addAnimation(fadeIn);

        connect(group, &QParallelAnimationGroup::finished,
                this, [this, index, curW, nextW]() {
            setCurrentIndex(index);
            curW->move(0, 0);
            nextW->setGraphicsEffect(nullptr); // Qt deletes the effect
            m_animating = false;
        });
        group->start(QAbstractAnimation::DeleteWhenStopped);
    }
}
