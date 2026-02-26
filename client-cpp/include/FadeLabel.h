// ══════════════════════════════════════════════════════
//  FadeLabel.h — Label with animated text transitions
// ══════════════════════════════════════════════════════
#pragma once
#include <QLabel>
#include <QPropertyAnimation>
#include <QSequentialAnimationGroup>

class FadeLabel : public QLabel {
    Q_OBJECT
    Q_PROPERTY(qreal labelOpacity READ labelOpacity WRITE setLabelOpacity)
public:
    explicit FadeLabel(QWidget* parent = nullptr);
    explicit FadeLabel(const QString& text, QWidget* parent = nullptr);

    void setTextAnimated(const QString& text, int fadeMs = 160);

    qreal labelOpacity() const { return m_opacity; }
    void  setLabelOpacity(qreal v);

protected:
    void paintEvent(QPaintEvent*) override;

private:
    qreal                     m_opacity = 1.0;
    QString                   m_pendingText;
    QSequentialAnimationGroup* m_seq = nullptr;

    void buildAnimation(int fadeMs);
};
