#pragma once

#include <QLabel>
#include <QPropertyAnimation>
#include <QPushButton>
#include <QTimer>
#include <QVector>
#include <QWidget>

class AppController;

class NavButton : public QPushButton {
    Q_OBJECT
    Q_PROPERTY(qreal hoverT READ hoverT WRITE setHoverT)
public:
    NavButton(const QString& text, QWidget* parent = nullptr);
    void setActive(bool active);

    qreal hoverT() const { return m_hoverT; }
    void setHoverT(qreal t) { m_hoverT = t; update(); }

protected:
    void paintEvent(QPaintEvent*) override;
    void enterEvent(QEnterEvent*) override;
    void leaveEvent(QEvent*) override;

private:
    bool m_active = false;
    qreal m_hoverT = 0.0;
    QPropertyAnimation* m_hAnim = nullptr;
};

class PulsingDot : public QWidget {
    Q_OBJECT
public:
    explicit PulsingDot(QWidget* parent = nullptr);
    void setColor(const QColor& color) { m_color = color; update(); }

protected:
    void paintEvent(QPaintEvent*) override;

private:
    QColor m_color{0x22, 0xC5, 0x5E};
    QTimer* m_timer = nullptr;
    int m_tick = 0;
};

class SidebarWidget : public QWidget {
    Q_OBJECT
    Q_PROPERTY(qreal indicatorY READ indicatorY WRITE setIndicatorY)
public:
    explicit SidebarWidget(AppController* ctrl, QWidget* parent = nullptr);

    enum Tab { Dashboard = 0, Modules, Logs, Settings, Guide, Network, Drivers, Fortnite, Macros };
    static constexpr int TAB_COUNT = 9;

    void setCurrentTab(Tab t);
    Tab currentTab() const { return m_tab; }

    qreal indicatorY() const { return m_indicatorY; }
    void setIndicatorY(qreal y) { m_indicatorY = y; update(); }

signals:
    void tabChanged(Tab t);

public slots:
    void onRunningChanged(bool running, const QString& title);
    void onLicenseActivated(const QString& plan, const QString& expiresAt);

protected:
    void paintEvent(QPaintEvent*) override;

private:
    AppController* m_ctrl = nullptr;
    Tab m_tab = Dashboard;
    NavButton* m_btns[TAB_COUNT]{};
    PulsingDot* m_dot = nullptr;
    QLabel* m_statusLbl = nullptr;
    QLabel* m_planLbl = nullptr;
    QLabel* m_expLbl = nullptr;
    QLabel* m_hwidLbl = nullptr;

    QLabel* m_logoLbl = nullptr;
    QLabel* m_systemSectionLbl = nullptr;
    QLabel* m_optimizationSectionLbl = nullptr;
    QLabel* m_gameplaySectionLbl = nullptr;

    QPropertyAnimation* m_indAnim = nullptr;
    qreal m_indicatorY = -60.0;
    bool m_running = false;

    void buildUi();
    void updateSession();
    void animateIndicatorTo(int tabIndex);
    void applyTranslations();
};
