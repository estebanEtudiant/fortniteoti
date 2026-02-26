// ══════════════════════════════════════════════════════
//  SystemStats.h — CPU/RAM/GPU polling via Win32 + PDH
// ══════════════════════════════════════════════════════
#pragma once
#include <QObject>
#include <QTimer>
#include <QString>
#include <cstdint>

struct SystemSnapshot {
    float    cpuPercent  = 0.f;
    float    ramPercent  = 0.f;
    uint64_t ramUsedMB   = 0;
    uint64_t ramTotalMB  = 0;
    float    gpuPercent  = 0.f;   // -1 = unavailable
    QString  cpuName;
    QString  gpuName;
};

class SystemStats : public QObject {
    Q_OBJECT
public:
    explicit SystemStats(QObject* parent = nullptr);
    ~SystemStats();

    void start(int intervalMs = 1000);
    void stop();

    SystemSnapshot current() const { return m_last; }

signals:
    void updated(SystemSnapshot snap);

private slots:
    void poll();

private:
    QTimer         m_timer;
    SystemSnapshot m_last;

    // CPU delta
    uint64_t m_prevIdle   = 0;
    uint64_t m_prevKernel = 0;
    uint64_t m_prevUser   = 0;

    // PDH GPU
    void*    m_gpuQuery   = nullptr;  // PDH_HQUERY
    void*    m_gpuCounter = nullptr;  // PDH_HCOUNTER
    bool     m_gpuReady   = false;

    void     initNames();
    void     initGpuPdh();
    float    pollCpu();
    void     pollRam(SystemSnapshot& s);
    float    pollGpu();
};
