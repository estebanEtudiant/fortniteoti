// ══════════════════════════════════════════════════════
//  MainWindow.cpp
// ══════════════════════════════════════════════════════
#include "MainWindow.h"
#include "AppController.h"
#include "TitleBarWidget.h"
#include "LicenseScreen.h"
#include "SidebarWidget.h"
#include "DashboardPage.h"
#include "ModulesPage.h"
#include "LogsPage.h"
#include "SettingsPage.h"
#include "UpdateDialog.h"
#include "GuidePage.h"
#include "NetworkOptimizerPage.h"
#include "DriverOptPage.h"
#include "FortniteSettingsPage.h"
#include "MacroPage.h"
#include "AnimatedStackedWidget.h"
#include "Palette.h"
#include "gui.h"

#include <QApplication>
#include <QScreen>
#include <QVBoxLayout>
#include <QHBoxLayout>

#ifdef _WIN32
#include <windows.h>
#include <dwmapi.h>
#pragma comment(lib, "dwmapi.lib")
#endif

MainWindow::MainWindow(AppController* ctrl, QWidget* parent)
    : QMainWindow(parent), m_ctrl(ctrl)
{
    setWindowTitle("404 Tweaks");
    setWindowFlags(Qt::FramelessWindowHint | Qt::Window);
    setMinimumSize(900, 580);
    resize(1060, 660);

    // Center on primary screen
    QRect sg = QApplication::primaryScreen()->geometry();
    move((sg.width() - 1060) / 2, (sg.height() - 660) / 2);

    buildUi();
    connectSignals();
    applyDropShadow();

    // Global stylesheet — clean & minimal
    setStyleSheet(QString(
        "QWidget { background: %1; color: %2; font-family: 'Segoe UI'; }"
        "QLabel      { font-size: 13px; margin: 0; padding: 0; background: transparent; }"
        "QCheckBox   { font-size: 12px; background: transparent; }"
        "QLineEdit   { font-size: 13px; }"
        // Scrollbars — thin & minimal
        "QScrollBar:vertical {"
        "  background: transparent; width: 6px; margin: 0; }"
        "QScrollBar::handle:vertical {"
        "  background: %3; border-radius: 3px; min-height: 24px; }"
        "QScrollBar::handle:vertical:hover { background: %4; }"
        "QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }"
        "QScrollBar:horizontal {"
        "  background: transparent; height: 6px; }"
        "QScrollBar::handle:horizontal {"
        "  background: %3; border-radius: 3px; min-width: 24px; }"
        "QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal { width: 0; }"
        // Tooltip
        "QToolTip { background: %5; color: %2; border: 1px solid %6;"
        "  border-radius: 5px; padding: 4px 8px; font-size: 12px; }")
        .arg(Pal::BG.name(),       // %1 bg
             Pal::TEXT.name(),      // %2 text
             "#2E2E36",             // %3 scrollbar handle
             "#44444E",             // %4 scrollbar hover
             Pal::CARD2.name(),     // %5 tooltip bg
             Pal::BORDER.name()));  // %6 tooltip border
}

void MainWindow::buildUi() {
    auto* central = new QWidget(this);
    setCentralWidget(central);

    auto* mainV = new QVBoxLayout(central);
    mainV->setContentsMargins(0, 0, 0, 0);
    mainV->setSpacing(0);

    m_titleBar = new TitleBarWidget(this);
    mainV->addWidget(m_titleBar);

    m_rootStack = new AnimatedStackedWidget;
    mainV->addWidget(m_rootStack, 1);

    // License screen
    m_licScreen = new LicenseScreen(m_ctrl);
    m_rootStack->addWidget(m_licScreen);

    // Main app layout
    m_mainWidget = new QWidget;
    auto* mainH = new QHBoxLayout(m_mainWidget);
    mainH->setContentsMargins(0, 0, 0, 0);
    mainH->setSpacing(0);

    m_sidebar = new SidebarWidget(m_ctrl);
    mainH->addWidget(m_sidebar);

    auto* contentArea = new QWidget;
    contentArea->setStyleSheet(QString("background: %1;").arg(Pal::BG.name()));
    auto* contentV = new QVBoxLayout(contentArea);
    contentV->setContentsMargins(24, 16, 24, 16);
    contentV->setSpacing(0);

    m_contentStack = new AnimatedStackedWidget;
    m_dashboard = new DashboardPage(m_ctrl);
    m_modules   = new ModulesPage(m_ctrl);
    m_logs      = new LogsPage(m_ctrl);
    m_settings  = new SettingsPage(m_ctrl);
    m_guide     = new GuidePage;
    m_network   = new NetworkOptimizerPage;
    m_drivers   = new DriverOptPage;
    m_fortnite  = new FortniteSettingsPage;
    m_macros    = new MacroPage;

    m_contentStack->addWidget(m_dashboard);   // 0 — Dashboard
    m_contentStack->addWidget(m_modules);     // 1 — Modules
    m_contentStack->addWidget(m_logs);        // 2 — Logs
    m_contentStack->addWidget(m_settings);    // 3 — Parametres
    m_contentStack->addWidget(m_guide);       // 4 — Guide
    m_contentStack->addWidget(m_network);     // 5 — Reseau
    m_contentStack->addWidget(m_drivers);     // 6 — Drivers
    m_contentStack->addWidget(m_fortnite);    // 7 — Fortnite
    m_contentStack->addWidget(m_macros);      // 8 — Macros

    contentV->addWidget(m_contentStack, 1);
    mainH->addWidget(contentArea, 1);
    m_rootStack->addWidget(m_mainWidget);

    m_updateDlg = new UpdateDialog(this);
}

void MainWindow::connectSignals() {
    connect(m_titleBar, &TitleBarWidget::closeRequested,    this, &QWidget::close);
    connect(m_titleBar, &TitleBarWidget::minimizeRequested, this, &QWidget::showMinimized);

    connect(m_licScreen, &LicenseScreen::activateRequested,
            m_ctrl,      &AppController::activateLicense);
    connect(m_ctrl, &AppController::licenseChecking,
            m_licScreen, &LicenseScreen::onChecking);
    connect(m_ctrl, &AppController::licenseStatus,
            m_licScreen, &LicenseScreen::onStatus);

    connect(m_ctrl, &AppController::screenChanged, this, &MainWindow::onScreenChanged);
    connect(m_sidebar, &SidebarWidget::tabChanged,  this, &MainWindow::onSidebarTab);

    connect(m_ctrl, &AppController::runningChanged,
            m_sidebar, &SidebarWidget::onRunningChanged);
    connect(m_ctrl, &AppController::runningChanged,
            m_dashboard, &DashboardPage::onRunningChanged);
    connect(m_ctrl, &AppController::runningChanged,
            m_logs, &LogsPage::onRunningChanged);

    connect(m_ctrl, &AppController::runningChanged, this, [this](bool r, const QString&) {
        if (r) {
            m_sidebar->setCurrentTab(SidebarWidget::Logs);
            m_contentStack->switchTo(2, AnimatedStackedWidget::Effect::SlideLeft);
        }
    });

    connect(m_ctrl, &AppController::licenseActivated,
            m_sidebar, &SidebarWidget::onLicenseActivated);
    connect(m_ctrl, &AppController::licenseActivated,
            m_dashboard, &DashboardPage::onLicenseActivated);
    connect(m_ctrl, &AppController::licenseActivated,
            m_settings, &SettingsPage::onLicenseActivated);

    connect(m_ctrl, &AppController::logAppended,
            m_logs, &LogsPage::appendLog);
    connect(m_ctrl, &AppController::logsCleared,
            m_logs, &LogsPage::clearLogs);

    connect(m_ctrl, &AppController::checksRefreshed,
            m_modules, &ModulesPage::onChecksRefreshed);
    connect(m_ctrl, &AppController::checksRefreshed,
            m_dashboard, &DashboardPage::onChecksRefreshed);

    connect(m_settings, &SettingsPage::navigateTo, this, [this](int tab) {
        m_sidebar->setCurrentTab(static_cast<SidebarWidget::Tab>(tab));
        m_contentStack->switchTo(tab, AnimatedStackedWidget::Effect::SlideRight);
    });

    connect(m_ctrl, &AppController::updateDetected,
            this, &MainWindow::onUpdateDetected);
    connect(m_updateDlg, &UpdateDialog::downloadRequested, m_ctrl, [this]() {
        m_ctrl->dismissUpdate();
    });
    connect(m_updateDlg, &UpdateDialog::dismissed, m_ctrl, &AppController::dismissUpdate);
}

void MainWindow::onScreenChanged(Screen s) {
    if (s == Screen::MAIN)
        m_rootStack->switchTo(1, AnimatedStackedWidget::Effect::Fade);
    else
        m_rootStack->switchTo(0, AnimatedStackedWidget::Effect::Fade);
}

void MainWindow::onSidebarTab(int t) {
    int cur = m_contentStack->currentIndex();
    auto effect = (t > cur)
        ? AnimatedStackedWidget::Effect::SlideLeft
        : AnimatedStackedWidget::Effect::SlideRight;
    m_contentStack->switchTo(t, effect);
}

void MainWindow::onUpdateDetected(const QString& version,
                                   const QString& url,
                                   const QString& changelog) {
    m_updateDlg->show(version, url, changelog);
}

void MainWindow::paintEvent(QPaintEvent* e) {
    QMainWindow::paintEvent(e);
    // No decorative effects — clean flat window
}

void MainWindow::applyDropShadow() {
#ifdef _WIN32
    HWND hwnd = (HWND)winId();
    MARGINS m = { 1, 1, 1, 1 };
    DwmExtendFrameIntoClientArea(hwnd, &m);
#endif
}
