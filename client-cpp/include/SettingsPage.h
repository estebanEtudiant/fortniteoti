#pragma once

#include <QCheckBox>
#include <QLabel>
#include <QPushButton>
#include <QWidget>

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
    AppController* m_ctrl = nullptr;

    QLabel* m_titleLbl = nullptr;
    QLabel* m_subtitleLbl = nullptr;

    QLabel* m_logsSectionLbl = nullptr;
    QCheckBox* m_autoScrollCb = nullptr;
    QCheckBox* m_compactCb = nullptr;

    QLabel* m_navSectionLbl = nullptr;
    QPushButton* m_btnModules = nullptr;
    QPushButton* m_btnLogs = nullptr;
    QPushButton* m_btnDashboard = nullptr;
    QPushButton* m_btnClearLogs = nullptr;

    QLabel* m_languageSectionLbl = nullptr;
    QLabel* m_languageSubLbl = nullptr;
    QPushButton* m_langFrBtn = nullptr;
    QPushButton* m_langEnBtn = nullptr;

    QLabel* m_licenseSectionLbl = nullptr;
    QLabel* m_planKeyLbl = nullptr;
    QLabel* m_expKeyLbl = nullptr;
    QLabel* m_hwidKeyLbl = nullptr;
    QLabel* m_osKeyLbl = nullptr;

    QLabel* m_planLbl = nullptr;
    QLabel* m_expLbl = nullptr;
    QLabel* m_hwidLbl = nullptr;
    QLabel* m_osLbl = nullptr;

    QLabel* m_aboutSectionLbl = nullptr;
    QLabel* m_aboutNameLbl = nullptr;
    QLabel* m_aboutVersionLbl = nullptr;
    QLabel* m_aboutTweaksLbl = nullptr;
    QLabel* m_aboutModulesLbl = nullptr;

    QLabel* m_warningLbl = nullptr;

    void buildUi();
    void applyTranslations();
    void updateLanguageButtons();
};
