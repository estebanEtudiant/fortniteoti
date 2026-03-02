// ══════════════════════════════════════════════════════
//  BenchmarkManager.h
//  Mesure latence scheduler, bande passante RAM, ping.
//  Stocke un baseline (avant tweaks) et compare après.
// ══════════════════════════════════════════════════════
#pragma once

#include <QObject>
#include <QString>
#include <QVector>

struct BenchmarkMetric {
    QString name;
    QString unit;
    double  value         = 0.0;
    bool    lowerIsBetter = true;
};

struct BenchmarkResult {
    bool    valid      = false;
    bool    isBaseline = false;
    QString timestamp;
    QVector<BenchmarkMetric> metrics;

    // Retourne l'amélioration en % par rapport à un baseline (positif = mieux)
    double improvement(const BenchmarkResult& base, const QString& metricName) const;
};

class BenchmarkManager : public QObject {
    Q_OBJECT
public:
    explicit BenchmarkManager(QObject* parent = nullptr);

    bool                   hasBaseline() const { return m_hasBaseline; }
    const BenchmarkResult& baseline()    const { return m_baseline; }
    const BenchmarkResult& lastResult()  const { return m_last; }

    // Asynchrones — émettent progress() puis finished()
    void runBaseline();
    void runBenchmark();

signals:
    void progress(int pct, const QString& step);
    void finished(BenchmarkResult result);
    void error(const QString& msg);

private:
    BenchmarkResult m_baseline;
    BenchmarkResult m_last;
    bool            m_hasBaseline = false;
    bool            m_running     = false;

    void   doRun(bool asBaseline);
    BenchmarkResult measure();

    static double measureSchedulerLatencyUs();
    static double measureMemBandwidthMBs();
    static double measurePingMs(const QString& host);

    QString baselinePath() const;
    void    saveBaseline(const BenchmarkResult& r) const;
    bool    loadBaseline();
};
