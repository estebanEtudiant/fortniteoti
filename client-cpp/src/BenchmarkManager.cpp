// ══════════════════════════════════════════════════════
//  BenchmarkManager.cpp
// ══════════════════════════════════════════════════════
#include "BenchmarkManager.h"

#include <QMetaObject>
#include <QDateTime>
#include <QStandardPaths>
#include <QDir>
#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QProcess>

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>

#include <thread>
#include <vector>
#include <cstring>

// ── Calcul d'amélioration ──────────────────────────────────────────────────
double BenchmarkResult::improvement(const BenchmarkResult& base,
                                     const QString& name) const
{
    if (!base.valid) return 0.0;
    const BenchmarkMetric* cur = nullptr;
    const BenchmarkMetric* bas = nullptr;
    for (const auto& m : metrics)       if (m.name == name) { cur = &m; break; }
    for (const auto& m : base.metrics)  if (m.name == name) { bas = &m; break; }
    if (!cur || !bas || bas->value <= 0.0) return 0.0;
    return cur->lowerIsBetter
        ? (bas->value - cur->value) / bas->value * 100.0
        : (cur->value - bas->value) / bas->value * 100.0;
}

// ── Constructeur ──────────────────────────────────────────────────────────
BenchmarkManager::BenchmarkManager(QObject* parent) : QObject(parent) {
    loadBaseline();
}

void BenchmarkManager::runBaseline()  { doRun(true);  }
void BenchmarkManager::runBenchmark() { doRun(false); }

// ── Thread principal de mesure ────────────────────────────────────────────
void BenchmarkManager::doRun(bool asBaseline) {
    if (m_running) return;
    m_running = true;

    std::thread([this, asBaseline]() {
        auto emitProg = [this](int p, const char* s) {
            QMetaObject::invokeMethod(this, [this, p, s]() {
                emit progress(p, QString(s));
            }, Qt::QueuedConnection);
        };

        emitProg(5,  "Initialisation...");
        emitProg(15, "Mesure latence scheduler CPU...");
        BenchmarkResult r = measure();
        r.isBaseline = asBaseline;

        if (asBaseline) {
            m_baseline    = r;
            m_hasBaseline = true;
            saveBaseline(r);
        }
        m_last    = r;
        m_running = false;

        QMetaObject::invokeMethod(this, [this, r]() {
            emit finished(r);
        }, Qt::QueuedConnection);
    }).detach();
}

// ── Séquence de mesures ───────────────────────────────────────────────────
BenchmarkResult BenchmarkManager::measure() {
    auto emitProg = [this](int p, const char* s) {
        QMetaObject::invokeMethod(this, [this, p, s]() {
            emit progress(p, QString(s));
        }, Qt::QueuedConnection);
    };

    BenchmarkResult r;
    r.valid     = true;
    r.timestamp = QDateTime::currentDateTime().toString("dd/MM/yyyy HH:mm");

    // 1. Latence scheduler (µs) — plus bas = mieux
    emitProg(15, "Latence scheduler (thread wake-up)...");
    double schedUs = measureSchedulerLatencyUs();
    r.metrics.push_back({ "Latence Scheduler", u8"\u00b5s", schedUs, true });

    // 2. Bande passante RAM (MB/s) — plus haut = mieux
    emitProg(40, "Bande passante memoire RAM...");
    double memMBs = measureMemBandwidthMBs();
    r.metrics.push_back({ "Bande Passante RAM", "MB/s", memMBs, false });

    // 3. Ping Cloudflare (ms) — plus bas = mieux
    emitProg(65, "Ping reseau (1.1.1.1)...");
    double pingCF = measurePingMs("1.1.1.1");
    r.metrics.push_back({ "Ping Reseau", "ms", pingCF, true });

    // 4. Ping Epic Games (ms)
    emitProg(82, "Ping serveurs Epic Games...");
    double pingEpic = measurePingMs("185.60.113.1");
    r.metrics.push_back({ "Ping Epic Games", "ms", pingEpic, true });

    emitProg(100, "Termine !");
    return r;
}

// ── Latence scheduler : overhead d'un WaitForSingleObject(evt, 1) ─────────
double BenchmarkManager::measureSchedulerLatencyUs() {
    HANDLE hThread = GetCurrentThread();
    int oldPrio = GetThreadPriority(hThread);
    SetThreadPriority(hThread, THREAD_PRIORITY_TIME_CRITICAL);

    LARGE_INTEGER freq, t0, t1;
    QueryPerformanceFrequency(&freq);

    const int N = 40;
    double total = 0.0;
    for (int i = 0; i < N; ++i) {
        HANDLE evt = CreateEvent(nullptr, FALSE, FALSE, nullptr);
        QueryPerformanceCounter(&t0);
        WaitForSingleObject(evt, 1);
        QueryPerformanceCounter(&t1);
        CloseHandle(evt);
        double elapsedMs = (double)(t1.QuadPart - t0.QuadPart) / freq.QuadPart * 1000.0;
        double overhead  = (elapsedMs - 1.0) * 1000.0;  // en µs
        total += (overhead < 0.0 ? 0.0 : overhead);
    }
    SetThreadPriority(hThread, oldPrio);
    return total / N;
}

// ── Bande passante mémoire : memcpy 256 Mo chronométré ───────────────────
double BenchmarkManager::measureMemBandwidthMBs() {
    const size_t SIZE = 256ULL * 1024 * 1024;
    std::vector<char> src(SIZE, 1);
    std::vector<char> dst(SIZE, 0);
    // Warm-up cache
    std::memcpy(dst.data(), src.data(), SIZE / 4);

    LARGE_INTEGER freq, t0, t1;
    QueryPerformanceFrequency(&freq);
    QueryPerformanceCounter(&t0);
    std::memcpy(dst.data(), src.data(), SIZE);
    QueryPerformanceCounter(&t1);

    double sec = (double)(t1.QuadPart - t0.QuadPart) / freq.QuadPart;
    return (SIZE / (1024.0 * 1024.0)) / sec;
}

// ── Ping : QProcess + parse output ───────────────────────────────────────
double BenchmarkManager::measurePingMs(const QString& host) {
    QProcess proc;
    proc.start("ping", { "-n", "4", "-w", "1500", host });
    if (!proc.waitForFinished(15000)) return -1.0;

    QString out = QString::fromLocal8Bit(proc.readAllStandardOutput());

    // Cherche "Moyenne = Xms" (FR) ou "Average = Xms" (EN)
    static QRegularExpression rx("(?:Moyenne|Average)\\s*=\\s*(\\d+)\\s*ms",
                                  QRegularExpression::CaseInsensitiveOption);
    QRegularExpressionMatch m = rx.match(out);
    if (m.hasMatch()) return m.captured(1).toDouble();
    return -1.0;
}

// ── Persistance baseline ──────────────────────────────────────────────────
QString BenchmarkManager::baselinePath() const {
    QString dir = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation)
                  + "/404Tweaks";
    QDir().mkpath(dir);
    return dir + "/benchmark_baseline.json";
}

void BenchmarkManager::saveBaseline(const BenchmarkResult& r) const {
    QJsonObject root;
    root["timestamp"] = r.timestamp;
    QJsonArray arr;
    for (const auto& m : r.metrics) {
        QJsonObject o;
        o["name"]         = m.name;
        o["unit"]         = m.unit;
        o["value"]        = m.value;
        o["lowerIsBetter"]= m.lowerIsBetter;
        arr.append(o);
    }
    root["metrics"] = arr;
    QFile f(baselinePath());
    if (f.open(QIODevice::WriteOnly))
        f.write(QJsonDocument(root).toJson());
}

bool BenchmarkManager::loadBaseline() {
    QFile f(baselinePath());
    if (!f.exists() || !f.open(QIODevice::ReadOnly)) return false;
    QJsonDocument doc = QJsonDocument::fromJson(f.readAll());
    if (doc.isNull()) return false;
    QJsonObject root = doc.object();

    m_baseline.valid      = true;
    m_baseline.isBaseline = true;
    m_baseline.timestamp  = root["timestamp"].toString();
    for (const auto& v : root["metrics"].toArray()) {
        QJsonObject o = v.toObject();
        m_baseline.metrics.push_back({
            o["name"].toString(),
            o["unit"].toString(),
            o["value"].toDouble(),
            o["lowerIsBetter"].toBool(true)
        });
    }
    m_hasBaseline = !m_baseline.metrics.isEmpty();
    return m_hasBaseline;
}
