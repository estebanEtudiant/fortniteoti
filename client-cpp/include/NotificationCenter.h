// ══════════════════════════════════════════════════════
//  NotificationCenter.h — cloche + panneau notifications
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QToolButton>
#include <QLabel>
#include <QScrollArea>
#include <QVBoxLayout>
#include <QVector>
#include <QTimer>
#include <QDateTime>
#include <QPropertyAnimation>

// ── Notification data struct ──────────────────────────
struct AppNotification {
    enum Type { Info, Update, Warning, Error };
    Type    type      = Info;
    QString title;
    QString body;
    bool    read      = false;
    qint64  timestamp = 0;
};

// ══════════════════════════════════════════════════════
//  NotifPanel — floating popup panel (no border, frameless)
// ══════════════════════════════════════════════════════
class NotifPanel : public QWidget {
    Q_OBJECT
public:
    explicit NotifPanel(QWidget* parent = nullptr);
    void setNotifications(const QVector<AppNotification>& notifs);
    void showAt(const QPoint& globalPos);
    void hidePanel();

signals:
    void allRead();

protected:
    void paintEvent(QPaintEvent*) override;
    bool eventFilter(QObject* obj, QEvent* ev) override;

private:
    QWidget*     m_content  = nullptr;
    QScrollArea* m_scroll   = nullptr;
    QLabel*      m_emptyLbl = nullptr;

    void rebuildList(const QVector<AppNotification>& notifs);
};

// ══════════════════════════════════════════════════════
//  NotificationCenter — bell button + badge + controller
// ══════════════════════════════════════════════════════
class NotificationCenter : public QWidget {
    Q_OBJECT
public:
    explicit NotificationCenter(QWidget* parent = nullptr);

    void addNotification(const AppNotification& n);
    void checkServerStatus(const QString& apiUrl);
    int  unreadCount() const;

signals:
    void unreadCountChanged(int count);

private slots:
    void onBellClicked();
    void onFetchTimer();

protected:
    void paintEvent(QPaintEvent*) override;

private:
    QToolButton*             m_bell   = nullptr;
    NotifPanel*              m_panel  = nullptr;
    QVector<AppNotification> m_notifs;
    QTimer*                  m_timer  = nullptr;
    QString                  m_apiUrl;
    bool                     m_serverWasUp = true;

    void updateBadge();
    void markAllRead();
};
