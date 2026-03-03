// ══════════════════════════════════════════════════════
//  CollapsibleCard.h — accordion card with animated body
// ══════════════════════════════════════════════════════
#pragma once
#include <QFrame>
#include <QLabel>
#include <QVBoxLayout>
#include <QPropertyAnimation>
#include "ToggleSwitch.h"

class CollapsibleCard : public QFrame {
    Q_OBJECT
    Q_PROPERTY(int bodyH READ bodyH WRITE setBodyH)
public:
    CollapsibleCard(const QString& title,
                    const QString& desc,
                    QWidget*       parent = nullptr);

    // Content layout — add controls here
    QVBoxLayout* contentLayout() const { return m_contentVl; }

    // The enable/disable toggle (caller connects to toggled(bool))
    ToggleSwitch* toggle() const { return m_toggle; }

    bool isExpanded() const { return m_expanded; }
    void setExpanded(bool expand, bool animate = true);

    // Q_PROPERTY accessors for QPropertyAnimation
    int  bodyH() const;
    void setBodyH(int h);

protected:
    bool eventFilter(QObject* obj, QEvent* e) override;

private:
    ToggleSwitch*       m_toggle    = nullptr;
    QWidget*            m_bodyWrap  = nullptr;  // animated wrapper
    QVBoxLayout*        m_contentVl = nullptr;
    QLabel*             m_arrow     = nullptr;
    bool                m_expanded  = false;
    int                 m_naturalH  = 0;
    QPropertyAnimation* m_anim      = nullptr;
    QWidget*            m_headerW   = nullptr;
};
