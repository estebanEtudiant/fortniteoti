// ══════════════════════════════════════════════════════
//  SettingsPage.h — Configuration + about
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QLabel>
#include <QCheckBox>

class AppController;

class SettingsPage : public QWidget {
    Q_OBJECT
public:
    explicit SettingsPage(AppController* ctrl, QWidget* parent = nullptr);

signals:
    void navigateTo(int tab); // 0=Dashboard, 1=Modules, 2=Logs

public slots:
    void onLicenseActivated(const QString& plan, const QString& expiresAt);

private:
    AppController* m_ctrl;
    QLabel*        m_planLbl   = nullptr;
    QLabel*        m_expLbl    = nullptr;
    QLabel*        m_hwidLbl   = nullptr;
    QLabel*        m_osLbl     = nullptr;

    void buildUi();
};
