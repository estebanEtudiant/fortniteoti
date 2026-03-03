// ══════════════════════════════════════════════════════
//  TitleBarWidget.h — Custom 40px title bar
//  (logo, version, notifications, minimize, close)
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QPoint>

// Forward declaration — avoids pulling full header into every TU
class NotificationCenter;

class TitleBarWidget : public QWidget {
    Q_OBJECT
public:
    explicit TitleBarWidget(QWidget* parent = nullptr);

    // Call after construction to start server health polling
    void initNotifications(const QString& apiUrl = "http://localhost:3000/api/v1");

    NotificationCenter* notifCenter() const { return m_notifCenter; }

signals:
    void closeRequested();
    void minimizeRequested();

protected:
    void paintEvent(QPaintEvent*) override;
    void mousePressEvent(QMouseEvent*) override;
    void mouseMoveEvent(QMouseEvent*) override;
    void mouseReleaseEvent(QMouseEvent*) override;
    void mouseDoubleClickEvent(QMouseEvent*) override;
    void resizeEvent(QResizeEvent*) override;

private:
    bool                m_dragging    = false;
    QPoint              m_dragStart;
    NotificationCenter* m_notifCenter = nullptr;

    // x-position of the notification center button (right side, before min/close)
    static constexpr int NOTIF_RIGHT_MARGIN = 102; // 44+8 + 44+6 = close+min widths+gaps
    static constexpr int NOTIF_SIZE         = 36;
};
