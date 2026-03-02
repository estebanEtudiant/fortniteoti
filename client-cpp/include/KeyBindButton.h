// ══════════════════════════════════════════════════════
//  KeyBindButton.h — bouton click-to-bind
//  Clic → entre en mode écoute → touche pressée = bind
//  Supporte clavier + boutons souris (LMB/RMB/MMB/M4/M5)
// ══════════════════════════════════════════════════════
#pragma once
#include <QPushButton>
#include <QKeyEvent>
#include <QMouseEvent>
#include <QFocusEvent>

class KeyBindButton : public QPushButton {
    Q_OBJECT
public:
    explicit KeyBindButton(int defaultVK = 0, QWidget* parent = nullptr);
    int  vk() const { return m_vk; }
    void setVK(int vk);

signals:
    void vkChanged(int vk);

protected:
    void keyPressEvent  (QKeyEvent*   e) override;
    void mousePressEvent(QMouseEvent* e) override;
    void focusOutEvent  (QFocusEvent* e) override;

private:
    int  m_vk        = 0;
    bool m_listening = false;

    void startListening();
    void stopListening(int vk);
    void cancelListening();
    void updateDisplay();

    static QString vkToLabel(int vk);
    static QString ss_normal();
    static QString ss_listening();
};