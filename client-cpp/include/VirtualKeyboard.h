// ══════════════════════════════════════════════════════
//  VirtualKeyboard.h — keyboard overlay with macro binds
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QMap>
#include <QString>
#include <QColor>
#include <QVector>
#include <QRect>

class VirtualKeyboard : public QWidget {
    Q_OBJECT
public:
    explicit VirtualKeyboard(QWidget* parent = nullptr);

    struct BindInfo { QString name; QColor color; };

    // Pass all trigger VK → macro info pairs
    void setBindings(const QMap<int, BindInfo>& b);

    QSize sizeHint() const override;

protected:
    void paintEvent(QPaintEvent*) override;

private:
    struct KeyDef {
        QRect       rect;
        const char* label;
        int         vk;
    };

    QVector<KeyDef>     m_keys;      // keyboard keys
    QVector<KeyDef>     m_mouse;     // mouse button row
    QMap<int, BindInfo> m_binds;     // active bindings
    int                 m_totalW = 0;
    int                 m_totalH = 0;

    void buildLayout();
    void drawKey(QPainter& p, const KeyDef& k) const;
};
