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
#include "AnimatedStackedWidget.h"
#include "Palette.h"
#include "gui.h"

#include <QApplication>
#include <QScreen>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QPainter>
#include <QRadialGradient>

// Windows DWM drop shadow on frameless window
#ifdef _WIN32
#include <windows.h>
#include <dwmapi.h>
#pragma comment(lib, "dwmapi.lib")
#endif

MainWindow::MainWindow(AppController* ctrl, QWidget* parent)
    : QMainWindow(parent), m_ctrl(ctrl)
{
    setWindowTitle("FortniteOptimizer 2026");
    setWindowFlags(Qt::FramelessWindowHint | Qt::Window);
    setMinimumSize(900, 580);
    resize(1100, 680);

    // Center on primary screen
    QRect sg = QApplication::primaryScreen()->geometry();
    move((sg.width() - 1100) / 2, (sg.height() - 680) / 2);

    buildUi();
    connectSignals();
    applyDropShadow();

    // Global stylesheet
    setStyleSheet(QString(
        // Base: just background + font family, NO font-size (avoids inflated label heights)
        "QWidget { background: %1; color: %2; font-family: 'Segoe UI'; }"
        // Explicit font sizes per type
        "QLabel      { font-size: 13px; margin: 0; padding: 0; }"
        "QCheckBox   { font-size: 12px; }"
        "QLineEdit   { font-size: 13px; }"
        // Scrollbars
        "QScrollBar:vertical { background: %1; width: 8px; margin: 0; }"
        "QScrollBar::handle:vertical { background: %3; border-radius: 4px; min-height: 20px; }"
        "QScrollBar::handle:vertical:hover { background: #4C5260; }"
        "QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }"
        "QScrollBar:horizontal { height: 8px; background: %1; }"
        "QScrollBar::handle:horizontal { background: %3; border-radius: 4px; min-width: 20px; }"
        "QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal { width: 0; }"
        "QToolTip { background: %4; color: %2; border: 1px solid %5; border-radius: 4px; padding: 4px 8px; }")
        .arg(Pal::BG.name(), Pal::TEXT.name(), "#383C44",
             Pal::CARD2.name(), Pal::BORDER.name()));
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

    m_licScreen = new LicenseScreen(m_ctrl);
    m_licScreen->setStyleSheet(QString("background: %1;").arg(Pal::BG.name()));
    m_rootStack->addWidget(m_licScreen);

    m_mainWidget = new QWidget;
    m_mainWidget->setStyleSheet(QString("background: %1;").arg(Pal::BG.name()));
    auto* mainH = new QHBoxLayout(m_mainWidget);
    mainH->setContentsMargins(0, 0, 0, 0);
    mainH->setSpacing(0);

    m_sidebar = new SidebarWidget(m_ctrl);
    mainH->addWidget(m_sidebar);

    auto* contentArea = new QWidget;
    contentArea->setStyleSheet(QString("background: %1;").arg(Pal::BG.name()));
    auto* contentV = new QVBoxLayout(contentArea);
    contentV->setContentsMargins(22, 14, 22, 14);
    contentV->setSpacing(0);

    m_contentStack = new AnimatedStackedWidget;
    m_dashboard = new DashboardPage(m_ctrl);
    m_modules   = new ModulesPage(m_ctrl);
    m_logs      = new LogsPage(m_ctrl);
    m_settings  = new SettingsPage(m_ctrl);
    m_contentStack->addWidget(m_dashboard);
    m_contentStack->addWidget(m_modules);
    m_contentStack->addWidget(m_logs);
    m_contentStack->addWidget(m_settings);
    contentV->addWidget(m_contentStack, 1);

    mainH->addWidget(contentArea, 1);
    m_rootStack->addWidget(m_mainWidget);

    m_updateDlg = new UpdateDialog(this);
}

void MainWindow::connectSignals() {
    // Titlebar buttons
    connect(m_titleBar, &TitleBarWidget::closeRequested,    this, &QWidget::close);
    connect(m_titleBar, &TitleBarWidget::minimizeRequested, this, &QWidget::showMinimized);

    // License screen
    connect(m_licScreen, &LicenseScreen::activateRequested,
            m_ctrl,      &AppController::activateLicense);
    connect(m_ctrl, &AppController::licenseChecking,
            m_licScreen, &LicenseScreen::onChecking);
    connect(m_ctrl, &AppController::licenseStatus,
            m_licScreen, &LicenseScreen::onStatus);

    // Screen navigation
    connect(m_ctrl, &AppController::screenChanged, this, &MainWindow::onScreenChanged);

    // Sidebar navigation
    connect(m_sidebar, &SidebarWidget::tabChanged, this, &MainWindow::onSidebarTab);

    // Running state → sidebar + dashboard
    connect(m_ctrl, &AppController::runningChanged,
            m_sidebar, &SidebarWidget::onRunningChanged);
    connect(m_ctrl, &AppController::runningChanged,
            m_dashboard, &DashboardPage::onRunningChanged);
    connect(m_ctrl, &AppController::runningChanged,
            m_logs, &LogsPage::onRunningChanged);

    // When running starts, switch to Logs tab
    connect(m_ctrl, &AppController::runningChanged, this, [this](bool r, const QString&) {
        if (r) {
            m_sidebar->setCurrentTab(SidebarWidget::Logs);
            m_contentStack->switchTo(2, AnimatedStackedWidget::Effect::SlideLeft);
        }
    });

    // License info → sidebar + settings
    connect(m_ctrl, &AppController::licenseActivated,
            m_sidebar, &SidebarWidget::onLicenseActivated);
    connect(m_ctrl, &AppController::licenseActivated,
            m_dashboard, &DashboardPage::onLicenseActivated);
    connect(m_ctrl, &AppController::licenseActivated,
            m_settings, &SettingsPage::onLicenseActivated);

    // Logs
    connect(m_ctrl, &AppController::logAppended,
            m_logs, &LogsPage::appendLog);
    connect(m_ctrl, &AppController::logsCleared,
            m_logs, &LogsPage::clearLogs);

    // Checks refreshed → modules page
    connect(m_ctrl, &AppController::checksRefreshed,
            m_modules, &ModulesPage::onChecksRefreshed);
    connect(m_ctrl, &AppController::checksRefreshed,
            m_dashboard, &DashboardPage::onChecksRefreshed);

    // Settings page navigation signals
    connect(m_settings, &SettingsPage::navigateTo, this, [this](int tab) {
        m_sidebar->setCurrentTab(static_cast<SidebarWidget::Tab>(tab));
        m_contentStack->switchTo(tab, AnimatedStackedWidget::Effect::SlideRight);
    });

    // Update notification
    connect(m_ctrl, &AppController::updateDetected,
            this, &MainWindow::onUpdateDetected);

    // Update dialog
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
    // Subtle corner glows
    QPainter p(this);
    QRadialGradient g1(width(), 0, 340);
    g1.setColorAt(0, QColor(0, 155, 220, 7));
    g1.setColorAt(1, Qt::transparent);
    p.fillRect(rect(), g1);

    QRadialGradient g2(0, height(), 270);
    g2.setColorAt(0, QColor(100, 55, 210, 6));
    g2.setColorAt(1, Qt::transparent);
    p.fillRect(rect(), g2);
}

void MainWindow::applyDropShadow() {
#ifdef _WIN32
    HWND hwnd = (HWND)winId();
    MARGINS m = { 1, 1, 1, 1 };
    DwmExtendFrameIntoClientArea(hwnd, &m);
#endif
}
