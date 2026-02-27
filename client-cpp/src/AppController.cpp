// ══════════════════════════════════════════════════════
//  AppController.cpp
// ══════════════════════════════════════════════════════
#include "AppController.h"
#include "hwid.h"

#include <QMetaObject>
#include <QtConcurrent/QtConcurrent>
#include <thread>
#include <chrono>

// ────────────────────────────────────────────────────────────────────
//  Module table (mirrors g_modules[] from gui.cpp)
// ────────────────────────────────────────────────────────────────────
static QVector<ModuleSpec> buildModules() {
    return {
        { "BACKUP",  "Backup & Securite",
          "Point de restauration systeme + export complet HKLM / HKCU sur le Bureau.",
          3,  true, QColor(0xF7,0xB3,0x42), tweaks::applyBackup,  nullptr },
        { "WINDOWS", "Windows / Systeme",
          "Services, Edge, SMB, profil multimedia, Content Delivery, Settings Sync, UI.",
          18, true, QColor(0x00,0xD1,0xFF), tweaks::applyWindows, tweaks::checkWindows },
        { "GPU",     "Carte Graphique",
          "HAGS, PCIe power, idle NVIDIA, DWM/Aero Peek, TDR Delay/DDI.",
          7,  true, QColor(0x8F,0x66,0xFF), tweaks::applyGpu,     tweaks::checkGpu },
        { "CPU",     "Processeur",
          "Power Throttling, scheduler, SystemResponsiveness, PEP States, Core Parking.",
          10, true, QColor(0x00,0xD1,0xFF), tweaks::applyCpu,     tweaks::checkCpu },
        { "RAM",     "Memoire (RAM)",
          "Vidage Standby Memory (NT Kernel), Paging Executive, compression.",
          4,  true, QColor(0x33,0xC7,0x6B), tweaks::applyRam,     tweaks::checkRam },
        { "CLEANUP", "Nettoyage Systeme",
          "TEMP user/Windows, cache DirectX Shader, Delivery Opt., DNS, Corbeille.",
          6,  true, QColor(0x8F,0x99,0xAD), tweaks::applyCleanup, nullptr },
        { "NETWORK", "Reseau & Ping",
          "Nagle off, TcpAckFreq=1, DelAckTicks=0, MTU, LanMan, DNS TTL, TCP reset.",
          11, true, QColor(0x00,0xD1,0xFF), tweaks::applyNetwork, tweaks::checkNetwork },
        { "STORAGE", "Stockage SSD/HDD",
          "TRIM, NTFS Last Access, Prefetch/SysMain off, 8.3 NTFS, write cache.",
          6,  true, QColor(0xF7,0xB3,0x42), tweaks::applyStorage, tweaks::checkStorage },
        { "INPUT",   "Input & Latence",
          "Souris 1:1, clavier delay 0, accessibility keys off, USB power, manette.",
          12, true, QColor(0x33,0xC7,0x6B), tweaks::applyInput,   tweaks::checkInput },
        { "POWER",   "Alimentation",
          "Ultimate Performance Plan, CPU 100%, Boost agressif, ASPM off, veille off.",
          8,  true, QColor(0xF7,0xB3,0x42), tweaks::applyPower,        tweaks::checkPower },
        { "DEFENDER","Defender Exclusions",
          "Exclusions Fortnite/Epic/EAC : reduit les stutters IO dus aux scans temps reel.",
          7,  true, QColor(0x00,0xD1,0xFF), tweaks::applyDefender,     tweaks::checkDefender },
        { "WUBLOCK", "WU Driver Block",
          "Empeche Windows Update d'ecraser ton driver GPU stable (ExcludeWUDriversInQualityUpdate).",
          1,  true, QColor(0xF7,0xB3,0x42), tweaks::applyWUDriverBlock, tweaks::checkWUDriverBlock },
        { "MPO",     "MPO Disable (NVIDIA)",
          "Desactive Multi-Plane Overlay via DWM : fix officiel NVIDIA pour flicker/stutter.",
          1,  true, QColor(0x8F,0x66,0xFF), tweaks::applyMPO,          tweaks::checkMPO },
        { "NIC",     "NIC Low Latency",
          "RSS adapter-level, RSC off, Interrupt Moderation off, EEE off sur toutes interfaces.",
          4,  true, QColor(0x33,0xC7,0x6B), tweaks::applyNicLatency,   nullptr },
    };
}

// ────────────────────────────────────────────────────────────────────
AppController::AppController(const std::string& apiUrl, QObject* parent)
    : QObject(parent)
    , m_licClient(apiUrl)
    , m_modules(buildModules())
{
    m_state.apiUrl = apiUrl;
    m_state.client = &m_licClient;
    m_state.hwid   = hwid::generate();
    m_state.osVer  = hwid::getOsVersion();
    setupLogCallback();
}

AppController::~AppController() {
    m_licClient.stopHeartbeatLoop();
}

// ────────────────────────────────────────────────────────────────────
//  Route GuiLog calls from any thread → Qt signal (queued = thread-safe)
// ────────────────────────────────────────────────────────────────────
void AppController::setupLogCallback() {
    m_state.logCallback = [this](const std::string& text, int type) {
        QMetaObject::invokeMethod(this, [this, text, type]() {
            emit logAppended(QString::fromStdString(text), type);
        }, Qt::QueuedConnection);
    };
}

// ────────────────────────────────────────────────────────────────────
//  Startup: restore saved session if any
// ────────────────────────────────────────────────────────────────────
void AppController::init() {
    if (!m_licClient.isValid()) return;

    emit licenseStatus("Verification de la licence en cours...", 3);
    emit licenseChecking(true);

    std::thread([this]() {
        auto status = m_licClient.heartbeat();
        QMetaObject::invokeMethod(this, [this, status]() {
            emit licenseChecking(false);
            if (status == licensing::Status::VALID) {
                m_state.licInfo = m_licClient.getInfo();
                m_licClient.startHeartbeatLoop(300);
                emit licenseActivated(
                    QString::fromStdString(m_state.licInfo.plan),
                    QString::fromStdString(m_state.licInfo.expiresAt));
                emit screenChanged(Screen::MAIN);
                checkForUpdate();
            } else {
                QString msg = (status == licensing::Status::NETWORK_ERROR)
                    ? "[X] Serveur inaccessible. Connexion internet requise."
                    : "[X] Session expiree. Entrez votre cle de licence.";
                emit licenseStatus(msg, 2);
            }
        }, Qt::QueuedConnection);
    }).detach();
}

// ────────────────────────────────────────────────────────────────────
//  Activation
// ────────────────────────────────────────────────────────────────────
void AppController::activateLicense(const QString& key) {
    std::string k = key.toStdString();
    emit licenseChecking(true);
    emit licenseStatus("Connexion au serveur de licences...", 3);

    std::thread([this, k]() {
        auto info = m_licClient.activate(k);
        QMetaObject::invokeMethod(this, [this, info]() {
            emit licenseChecking(false);
            if (info.status == licensing::Status::VALID) {
                m_state.licInfo = info;
                emit licenseStatus("Licence validee !", 1);
                QMetaObject::invokeMethod(this, [this]() {
                    m_licClient.startHeartbeatLoop(300);
                    emit licenseActivated(
                        QString::fromStdString(m_state.licInfo.plan),
                        QString::fromStdString(m_state.licInfo.expiresAt));
                    emit screenChanged(Screen::MAIN);
                    checkForUpdate();
                }, Qt::QueuedConnection);
            } else {
                int t = 2;
                QString msg;
                switch (info.status) {
                    case licensing::Status::HWID_MISMATCH:
                        msg = "[X] Cle liee a une autre machine."; break;
                    case licensing::Status::EXPIRED:
                        msg = "[X] Licence expiree."; break;
                    case licensing::Status::BANNED:
                        msg = "[X] Licence bannie. Contactez le support."; break;
                    case licensing::Status::NETWORK_ERROR:
                        msg = "[X] Serveur inaccessible."; break;
                    case licensing::Status::RATE_LIMITED:
                        msg = "[!] Trop de tentatives. Attendez 1 min."; t = 3; break;
                    default:
                        msg = "[X] Cle invalide."; break;
                }
                emit licenseStatus(msg, t);
            }
        }, Qt::QueuedConnection);
    }).detach();
}

// ────────────────────────────────────────────────────────────────────
//  Tweak execution helpers
// ────────────────────────────────────────────────────────────────────
void AppController::launch(const QString& title, std::function<void(AppState&)> fn) {
    if (m_state.running.load()) return;
    m_state.running  = true;
    m_state.runTitle = title.toStdString();
    { std::lock_guard<std::mutex> lk(m_state.logMtx); m_state.log.clear(); }
    emit logsCleared();
    emit runningChanged(true, title);

    std::thread([this, fn]() {
        fn(m_state);
        m_state.running = false;
        // Refresh check results after apply
        for (auto& m : m_modules)
            if (m.checkFn) m.lastCheck = m.checkFn();
        QMetaObject::invokeMethod(this, [this]() {
            emit runningChanged(false, {});
            emit checksRefreshed();
        }, Qt::QueuedConnection);
    }).detach();
}

void AppController::runAll() {
    launch("Optimisation globale", tweaks::applyAll);
}

void AppController::revertAll() {
    launch("Restauration", tweaks::revertAll);
}

void AppController::runSelectedModules() {
    launch("Modules selectionnes", [this](AppState& s) {
        GuiLog(s, "== MODULES SELECTIONNES ==", 5);
        for (const auto& m : m_modules)
            if (m.enabled && m.applyFn) m.applyFn(s);
        GuiLog(s, "== Termine. Redemarrage recommande. ==", 1);
    });
}

void AppController::runSingleModule(int idx) {
    if (idx < 0 || idx >= m_modules.size()) return;
    launch(m_modules[idx].title, m_modules[idx].applyFn);
}

void AppController::refreshChecks() {
    QtConcurrent::run([this]() {
        for (auto& m : m_modules)
            if (m.checkFn) m.lastCheck = m.checkFn();
        QMetaObject::invokeMethod(this, [this]() {
            emit checksRefreshed();
        }, Qt::QueuedConnection);
    });
}

void AppController::clearLogs() {
    std::lock_guard<std::mutex> lk(m_state.logMtx);
    m_state.log.clear();
    emit logsCleared();
}

// ────────────────────────────────────────────────────────────────────
//  Module helpers
// ────────────────────────────────────────────────────────────────────
void AppController::setModuleEnabled(int idx, bool en) {
    if (idx >= 0 && idx < m_modules.size())
        m_modules[idx].enabled = en;
}

void AppController::setAllModulesEnabled(bool en) {
    for (auto& m : m_modules) m.enabled = en;
}

int AppController::countEnabledTweaks() const {
    int n = 0;
    for (const auto& m : m_modules)
        if (m.enabled) n += m.tweakCount;
    return n;
}

// ────────────────────────────────────────────────────────────────────
//  State accessors
// ────────────────────────────────────────────────────────────────────
QString AppController::hwid() const {
    return QString::fromStdString(m_state.hwid);
}
QString AppController::osVersion() const {
    return QString::fromStdString(m_state.osVer);
}
QString AppController::plan() const {
    return m_state.licInfo.plan.empty()
        ? "PRO"
        : QString::fromStdString(m_state.licInfo.plan);
}
QString AppController::expiresAt() const {
    return QString::fromStdString(m_state.licInfo.expiresAt);
}

// ────────────────────────────────────────────────────────────────────
//  Update check (background)
// ────────────────────────────────────────────────────────────────────
void AppController::checkForUpdate() {
    std::string url = m_state.apiUrl;
    std::thread([this, url]() {
        updater::UpdateChecker upd(url);
        auto info = upd.check();
        if (!info.available) return;
        QMetaObject::invokeMethod(this, [this, info]() {
            m_state.updateVersion   = info.latestVersion;
            m_state.updateUrl       = info.downloadUrl;
            m_state.updateChangelog = info.changelog;
            emit updateDetected(
                QString::fromStdString(info.latestVersion),
                QString::fromStdString(info.downloadUrl),
                QString::fromStdString(info.changelog));
        }, Qt::QueuedConnection);
    }).detach();
}
