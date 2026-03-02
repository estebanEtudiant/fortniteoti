// ══════════════════════════════════════════════════════
//  SidebarWidget.h — 226px left navigation sidebar
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QLabel>
#include <QTimer>
#include <QVector>
#include <QPushButton>
#include <QPropertyAnimation>

class AppController;

class NavButton : public QPushButton {
    Q_OBJECT
public:
    NavButton(const QString& text, QWidget* parent = nullptr);
    void setActive(bool a);
protected:
    void paintEvent(QPaintEvent*) override;
private:
    bool m_active = false;
};

class PulsingDot : public QWidget {
    Q_OBJECT
public:
    explicit PulsingDot(QWidget* parent = nullptr);
    void setColor(const QColor& c) { m_color = c; update(); }
protected:
    void paintEvent(QPaintEvent*) override;
private:
    QColor  m_color{ 0x22, 0xC5, 0x5E };
    QTimer* m_timer = nullptr; // unused — static dot
};

class SidebarWidget : public QWidget {
    Q_OBJECT
    Q_PROPERTY(qreal indicatorY READ indicatorY WRITE setIndicatorY)
public:
    explicit SidebarWidget(AppController* ctrl, QWidget* parent = nullptr);

    enum Tab { Dashboard=0, Modules, Logs, Settings, Guide, Network, Drivers, Fortnite, Macros };
    static constexpr int TAB_COUNT = 9;
    void setCurrentTab(Tab t);
    Tab  currentTab() const { return m_tab; }

    qreal indicatorY() const { return m_indicatorY; }
    void  setIndicatorY(qreal y) { m_indicatorY = y; update(); }

signals:
    void tabChanged(Tab t);

public slots:
    void onRunningChanged(bool running, const QString& title);
    void onLicenseActivated(const QString& plan, const QString& expiresAt);

protected:
    void paintEvent(QPaintEvent*) override;

private:
    AppController*      m_ctrl;
    Tab                 m_tab = Dashboard;
    NavButton*          m_btns[TAB_COUNT];
    PulsingDot*         m_dot = nullptr;
    QLabel*             m_statusLbl = nullptr;
    QLabel*             m_planLbl   = nullptr;
    QLabel*             m_expLbl    = nullptr;
    QLabel*             m_hwidLbl   = nullptr;
    QPropertyAnimation* m_indAnim   = nullptr;
    qreal               m_indicatorY = 0.0;
    int                 m_btnAreaTop = 0;  // Y offset where buttons start

    void buildUi();
    void updateSession();
    void animateIndicatorTo(int tabIndex);
};
