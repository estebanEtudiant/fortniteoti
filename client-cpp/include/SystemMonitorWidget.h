// ══════════════════════════════════════════════════════
//  SystemMonitorWidget.h — Live CPU / RAM / GPU panel
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QLabel>
#include "SystemStats.h"
#include "MiniGraph.h"

class MetricPanel : public QWidget {
    Q_OBJECT
public:
    MetricPanel(const QString& title, const QColor& color, QWidget* parent = nullptr);
    void update(float pct, const QString& sub);
    void setTitle(const QString& t);

protected:
    void paintEvent(QPaintEvent*) override;

private:
    QColor     m_color;
    QLabel*    m_titleLbl = nullptr;
    QLabel*    m_valueLbl = nullptr;
    QLabel*    m_subLbl   = nullptr;
    MiniGraph* m_graph    = nullptr;
};

class SystemMonitorWidget : public QWidget {
    Q_OBJECT
public:
    explicit SystemMonitorWidget(QWidget* parent = nullptr);
    ~SystemMonitorWidget();

private slots:
    void onStats(SystemSnapshot snap);

private:
    SystemStats*  m_stats  = nullptr;
    MetricPanel*  m_cpu    = nullptr;
    MetricPanel*  m_ram    = nullptr;
    MetricPanel*  m_gpu    = nullptr;
};
