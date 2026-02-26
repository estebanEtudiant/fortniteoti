// ══════════════════════════════════════════════════════
//  SystemStats.cpp
// ══════════════════════════════════════════════════════
#include "SystemStats.h"

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <pdh.h>
#include <pdhmsg.h>
#include <vector>
#endif


static inline uint64_t ftToU64(const FILETIME& ft) {
    return (uint64_t(ft.dwHighDateTime) << 32) | ft.dwLowDateTime;
}

// ── Read a REG_SZ value as QString ──────────────────
static QString regReadString(HKEY root, const wchar_t* path, const wchar_t* key) {
    HKEY hk;
    if (RegOpenKeyExW(root, path, 0, KEY_READ, &hk) != ERROR_SUCCESS)
        return {};
    wchar_t buf[256] = {};
    DWORD sz = sizeof(buf);
    RegQueryValueExW(hk, key, nullptr, nullptr, (LPBYTE)buf, &sz);
    RegCloseKey(hk);
    return QString::fromWCharArray(buf).simplified();
}

SystemStats::SystemStats(QObject* parent)
    : QObject(parent)
{
    connect(&m_timer, &QTimer::timeout, this, &SystemStats::poll);
    initNames();
    initGpuPdh();
}

SystemStats::~SystemStats() {
#ifdef _WIN32
    if (m_gpuQuery) PdhCloseQuery((PDH_HQUERY)m_gpuQuery);
#endif
}

void SystemStats::start(int intervalMs) {
    poll();
    m_timer.start(intervalMs);
}

void SystemStats::stop() { m_timer.stop(); }

// ── Hardware name queries (run once at startup) ──────
void SystemStats::initNames() {
#ifdef _WIN32
    // CPU name
    m_last.cpuName = regReadString(
        HKEY_LOCAL_MACHINE,
        L"HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0",
        L"ProcessorNameString");
    if (m_last.cpuName.isEmpty()) m_last.cpuName = "CPU";

    // GPU name — first video adapter in class
    m_last.gpuName = regReadString(
        HKEY_LOCAL_MACHINE,
        L"SYSTEM\\CurrentControlSet\\Control\\Class\\"
        L"{4d36e968-e325-11ce-bfc1-08002be10318}\\0000",
        L"DriverDesc");
    if (m_last.gpuName.isEmpty())
        m_last.gpuName = regReadString(
            HKEY_LOCAL_MACHINE,
            L"SYSTEM\\CurrentControlSet\\Control\\Class\\"
            L"{4d36e968-e325-11ce-bfc1-08002be10318}\\0001",
            L"DriverDesc");
    if (m_last.gpuName.isEmpty()) m_last.gpuName = "GPU";
#endif
}

// ── PDH GPU init (Windows 10 1903+) ─────────────────
void SystemStats::initGpuPdh() {
#ifdef _WIN32
    PDH_HQUERY q;
    if (PdhOpenQuery(nullptr, 0, &q) != ERROR_SUCCESS) return;

    PDH_HCOUNTER c;
    PDH_STATUS st = PdhAddEnglishCounterW(
        q,
        L"\\GPU Engine(*engtype_3D)\\Utilization Percentage",
        0, &c);
    if (st != ERROR_SUCCESS) {
        PdhCloseQuery(q);
        return;
    }
    PdhCollectQueryData(q);

    m_gpuQuery   = (void*)q;
    m_gpuCounter = (void*)c;
    m_gpuReady   = true;
#endif
}

// ── Poll loop ────────────────────────────────────────
void SystemStats::poll() {
    // Keep names across snapshots
    QString cpuName = m_last.cpuName;
    QString gpuName = m_last.gpuName;

    SystemSnapshot s;
    s.cpuName   = cpuName;
    s.gpuName   = gpuName;
    s.cpuPercent = pollCpu();
    pollRam(s);
    s.gpuPercent = pollGpu();

    m_last = s;
    emit updated(s);
}

float SystemStats::pollCpu() {
#ifdef _WIN32
    FILETIME idle, kernel, user;
    if (!GetSystemTimes(&idle, &kernel, &user)) return 0.f;

    uint64_t ci = ftToU64(idle), ck = ftToU64(kernel), cu = ftToU64(user);
    uint64_t di = ci - m_prevIdle, dk = ck - m_prevKernel, du = cu - m_prevUser;
    m_prevIdle = ci; m_prevKernel = ck; m_prevUser = cu;

    uint64_t dTotal = dk + du;
    if (dTotal == 0) return 0.f;
    return float(dTotal - di) * 100.f / float(dTotal);
#else
    return 0.f;
#endif
}

void SystemStats::pollRam(SystemSnapshot& s) {
#ifdef _WIN32
    MEMORYSTATUSEX ms;
    ms.dwLength = sizeof(ms);
    if (!GlobalMemoryStatusEx(&ms)) return;
    s.ramPercent = float(ms.dwMemoryLoad);
    s.ramTotalMB = ms.ullTotalPhys  / (1024 * 1024);
    s.ramUsedMB  = (ms.ullTotalPhys - ms.ullAvailPhys) / (1024 * 1024);
#endif
}

float SystemStats::pollGpu() {
#ifdef _WIN32
    if (!m_gpuReady) return -1.f;

    PDH_HQUERY   q = (PDH_HQUERY)m_gpuQuery;
    PDH_HCOUNTER c = (PDH_HCOUNTER)m_gpuCounter;

    PdhCollectQueryData(q);

    // First call: get required buffer size in bytes + item count
    DWORD bufSz = 0, itemCnt = 0;
    PdhGetFormattedCounterArrayW(c, PDH_FMT_DOUBLE, &bufSz, &itemCnt, nullptr);
    if (bufSz == 0 || itemCnt == 0) return 0.f;

    // Allocate raw byte buffer — PDH packs instance name strings
    // after the struct array in the same contiguous block
    std::vector<BYTE> buf(bufSz);
    auto* items = reinterpret_cast<PDH_FMT_COUNTERVALUE_ITEM_W*>(buf.data());

    if (PdhGetFormattedCounterArrayW(c, PDH_FMT_DOUBLE,
                                     &bufSz, &itemCnt, items)
        != ERROR_SUCCESS) return 0.f;

    double total = 0;
    for (DWORD i = 0; i < itemCnt; ++i)
        total += items[i].FmtValue.doubleValue;

    return float(qMin(total, 100.0));
#else
    return -1.f;
#endif
}
