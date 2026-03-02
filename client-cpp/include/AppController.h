// ══════════════════════════════════════════════════════
//  AppController.h — Qt controller: owns AppState,
//  bridges C++ business logic ↔ Qt signals/slots.
// ══════════════════════════════════════════════════════
#pragma once

#include <QObject>
#include <QVector>
#include <QString>
#include <QColor>
#include <functional>

#include "gui.h"
#include "licensing.h"
#include "tweaks.h"
#include "updater.h"

// ── Module descriptor (Qt-friendly, mirrors g_modules[]) ──
struct ModuleSpec {
    QString icon;
    QString title;
    QString desc;
    int     tweakCount = 0;
    bool    enabled    = true;
    QColor  color;
    void  (*applyFn)(AppState&) = nullptr;
    tweaks::CheckResult (*checkFn)() = nullptr;
    tweaks::CheckResult lastCheck{};
};

// ── Log entry for Qt ──
struct QtLogEntry {
    QString text;
    int     type; // 0-5
};

class AppController : public QObject {
    Q_OBJECT

public:
    explicit AppController(const std::string& apiUrl, QObject* parent = nullptr);
    ~AppController() override;

    // Called once at startup (checks saved session)
    void init();

    // Module state accessors
    const QVector<ModuleSpec>& modules() const { return m_modules; }
    void setModuleEnabled(int idx, bool en);
    void setAllModulesEnabled(bool en);
    int  countEnabledTweaks() const;

    // State accessors
    QString hwid()      const;
    QString osVersion() const;
    QString plan()      const;
    QString expiresAt() const;
    bool    isRunning() const { return m_state.running.load(); }
    QString runTitle()  const { return QString::fromStdString(m_state.runTitle); }

    // Update info
    QString updateVersion()   const { return QString::fromStdString(m_state.updateVersion); }
    QString updateUrl()       const { return QString::fromStdString(m_state.updateUrl); }
    QString updateChangelog() const { return QString::fromStdString(m_state.updateChangelog); }
    bool    updateMandatory() const { return m_state.updateMandatory; }

signals:
    // Navigation
    void screenChanged(Screen s);

    // Licensing
    void licenseChecking(bool busy);
    void licenseStatus(QString msg, int type);
    void licenseActivated(QString plan, QString expiresAt);
    void licenseRevoked();

    // Running state (tweak execution)
    void runningChanged(bool running, QString title);

    // Logs
    void logAppended(QString text, int type);
    void logsCleared();

    // Module check state refreshed
    void checksRefreshed();

    // Update
    void updateDetected(QString version, QString url, QString changelog);

public slots:
    void activateLicense(const QString& key);
    void runAll();
    void revertAll();
    void runSelectedModules();
    void runSingleModule(int idx);
    void refreshChecks();
    void clearLogs();
    void dismissUpdate() { if (!m_state.updateMandatory) m_state.updateDismissed = true; }

private:
    AppState                         m_state;
    licensing::LicenseClient         m_licClient;
    QVector<ModuleSpec>              m_modules;

    // Execute fn on a detached thread; emit runningChanged + switch to Logs
    void launch(const QString& title, std::function<void(AppState&)> fn);
    void setupLogCallback();
    void checkForUpdate();
};
