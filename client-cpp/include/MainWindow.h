// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
//  MainWindow.h Ã¢â‚¬â€ Frameless 1100Ãƒâ€”680 main window
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
#pragma once
#include <QMainWindow>
#include <QTimer>
#include "AnimatedStackedWidget.h"

class AppController;
class TitleBarWidget;
class LicenseScreen;
class SidebarWidget;
class DashboardPage;
class ModulesPage;
class LogsPage;
class SettingsPage;
class UpdateDialog;
class NetworkOptimizerPage;
class DriverOptPage;
class GuidePage;
class FortniteSettingsPage;
class MacroPage;

enum class Screen;

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(AppController* ctrl, QWidget* parent = nullptr);

protected:
    void paintEvent(QPaintEvent*) override;

private slots:
    void onScreenChanged(Screen s);
    void onSidebarTab(int t);
    void onUpdateDetected(const QString& version,
                          const QString& url,
                          const QString& changelog);

private:
    AppController*          m_ctrl;
    TitleBarWidget*         m_titleBar    = nullptr;
    AnimatedStackedWidget*  m_rootStack   = nullptr;   // LICENSE | MAIN
    LicenseScreen*          m_licScreen   = nullptr;
    QWidget*                m_mainWidget  = nullptr;
    SidebarWidget*          m_sidebar     = nullptr;
    AnimatedStackedWidget*  m_contentStack= nullptr;   // Dashboard|Modules|Logs|Settings
    DashboardPage*         m_dashboard   = nullptr;
    ModulesPage*           m_modules     = nullptr;
    LogsPage*              m_logs        = nullptr;
    SettingsPage*          m_settings    = nullptr;
    GuidePage*             m_guide       = nullptr;
    NetworkOptimizerPage*  m_network     = nullptr;
    DriverOptPage*         m_drivers     = nullptr;
    FortniteSettingsPage*  m_fortnite    = nullptr;
    MacroPage*             m_macros      = nullptr;
    UpdateDialog*          m_updateDlg   = nullptr;
    QTimer*                m_i18nRefresh = nullptr;

    void buildUi();
    void connectSignals();
    void applyDropShadow();
};
