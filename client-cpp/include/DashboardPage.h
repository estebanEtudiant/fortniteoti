// ══════════════════════════════════════════════════════
//  DashboardPage.h — Overview + quick actions
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QLabel>
#include <QPushButton>
#include <QTimer>
#include <QScrollArea>
#include "SystemMonitorWidget.h"

class AppController;

class StatCard : public QWidget {
    Q_OBJECT
public:
    StatCard(const QString& label, const QString& value,
             const QColor& accent, QWidget* parent = nullptr);
    void setValue(const QString& v);
    void setAccent(const QColor& c);
protected:
    void paintEvent(QPaintEvent*) override;
private:
    QLabel* m_valLbl;
    QColor  m_accent;
};

class DashboardPage : public QWidget {
    Q_OBJECT
public:
    explicit DashboardPage(AppController* ctrl, QWidget* parent = nullptr);

public slots:
    void onRunningChanged(bool running, const QString& title);
    void onLicenseActivated(const QString& plan, const QString& expiresAt);
    void onChecksRefreshed();

private slots:
    void onSpinnerTick();

private:
    AppController* m_ctrl;
    StatCard*      m_statSystem  = nullptr;
    StatCard*      m_statPlan    = nullptr;
    StatCard*      m_statModules = nullptr;
    QPushButton*   m_runBtn      = nullptr;
    QPushButton*   m_revertBtn   = nullptr;
    QLabel*        m_actionStatusLbl = nullptr;
    QLabel*        m_osVal   = nullptr;
    QLabel*        m_hwidVal = nullptr;
    QLabel*        m_planVal = nullptr;
    QLabel*        m_expVal  = nullptr;
    QLabel*        m_modVal  = nullptr;
    QWidget*       m_moduleBadgesArea = nullptr;
    QTimer*        m_spinTimer = nullptr;
    int            m_spinFrame = 0;
    bool           m_running   = false;

    void buildUi();
    void rebuildModuleBadges();
    void updateStatCards();
};
