// ══════════════════════════════════════════════════════
//  BenchmarkPage.h — Page UI du benchmark
// ══════════════════════════════════════════════════════
#pragma once

#include <QWidget>
#include <QLabel>
#include <QPushButton>
#include <QProgressBar>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QScrollArea>

#include "BenchmarkManager.h"

class BenchmarkPage : public QWidget {
    Q_OBJECT
public:
    explicit BenchmarkPage(QWidget* parent = nullptr);

private slots:
    void onProgress(int pct, const QString& step);
    void onFinished(BenchmarkResult result);
    void onError(const QString& msg);

private:
    BenchmarkManager* m_mgr;

    QLabel*       m_statusLbl;
    QProgressBar* m_progressBar;
    QPushButton*  m_baselineBtn;
    QPushButton*  m_benchBtn;
    QWidget*      m_resultsArea;
    QVBoxLayout*  m_resultsLayout;

    void buildUi();
    void buildResultCards(const BenchmarkResult& current);
    void setRunning(bool running);
};
