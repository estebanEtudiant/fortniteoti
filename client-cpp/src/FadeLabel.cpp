// ══════════════════════════════════════════════════════
//  FadeLabel.cpp
// ══════════════════════════════════════════════════════
#include "FadeLabel.h"

#include <QPainter>
#include <QPropertyAnimation>
#include <QPauseAnimation>

FadeLabel::FadeLabel(QWidget* parent)
    : QLabel(parent)
{
    setAttribute(Qt::WA_TranslucentBackground, false);
}

FadeLabel::FadeLabel(const QString& text, QWidget* parent)
    : QLabel(text, parent)
{
    setAttribute(Qt::WA_TranslucentBackground, false);
}

void FadeLabel::setTextAnimated(const QString& text, int fadeMs) {
    if (m_seq && m_seq->state() == QAbstractAnimation::Running)
        m_seq->stop();
    m_pendingText = text;
    buildAnimation(fadeMs);
    m_seq->start(QAbstractAnimation::DeleteWhenStopped);
    m_seq = nullptr; // will be deleted by Qt
}

void FadeLabel::setLabelOpacity(qreal v) {
    m_opacity = v;
    update();
}

void FadeLabel::buildAnimation(int fadeMs) {
    m_seq = new QSequentialAnimationGroup(this);

    // 1. Fade out
    auto* out = new QPropertyAnimation(this, "labelOpacity");
    out->setDuration(fadeMs / 2);
    out->setStartValue(m_opacity);
    out->setEndValue(0.0);
    out->setEasingCurve(QEasingCurve::InQuad);

    // 2. Swap text at zero opacity
    auto* pause = new QPauseAnimation(0);

    // 3. Fade in
    auto* in = new QPropertyAnimation(this, "labelOpacity");
    in->setDuration(fadeMs / 2 + 20);
    in->setStartValue(0.0);
    in->setEndValue(1.0);
    in->setEasingCurve(QEasingCurve::OutQuad);

    m_seq->addAnimation(out);
    m_seq->addAnimation(pause);
    m_seq->addAnimation(in);

    // Swap text between the two phases
    connect(out, &QPropertyAnimation::finished, this, [this]() {
        QLabel::setText(m_pendingText);
    });
}

void FadeLabel::paintEvent(QPaintEvent* e) {
    if (qAbs(m_opacity - 1.0) < 0.01) {
        QLabel::paintEvent(e);
        return;
    }
    QPainter p(this);
    p.setOpacity(m_opacity);
    QLabel::paintEvent(e);
}
