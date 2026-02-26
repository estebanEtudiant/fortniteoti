// ══════════════════════════════════════════════════════
//  SystemMonitorWidget.cpp
// ══════════════════════════════════════════════════════
#include "SystemMonitorWidget.h"
#include "Palette.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QPainter>
#include <QPainterPath>
#include <QLinearGradient>
#include <QFont>
#include <QThread>

// ════════════════════════════════════════════════════════
//  MetricPanel
// ════════════════════════════════════════════════════════
MetricPanel::MetricPanel(const QString& title, const QColor& color, QWidget* parent)
    : QWidget(parent), m_color(color)
{
    setAttribute(Qt::WA_TranslucentBackground);
    setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);
    setMinimumWidth(160);

    auto* vl = new QVBoxLayout(this);
    vl->setContentsMargins(14, 10, 14, 10);
    vl->setSpacing(2);

    // Header row
    auto* hdr = new QHBoxLayout;
    hdr->setSpacing(6);

    // Colored dot indicator
    auto* dot = new QWidget;
    dot->setFixedSize(8, 8);
    dot->setStyleSheet(QString(
        "background: %1; border-radius: 4px;").arg(color.name()));
    hdr->addWidget(dot);

    m_titleLbl = new QLabel(title);
    m_titleLbl->setStyleSheet(QString(
        "color: %1; background: transparent; font-size: 11px;")
        .arg(Pal::DIM.name()));
    hdr->addWidget(m_titleLbl);
    hdr->addStretch();

    vl->addLayout(hdr);

    // Big value
    m_valueLbl = new QLabel("0%");
    QFont vf("Segoe UI", 22, QFont::Bold);
    m_valueLbl->setFont(vf);
    m_valueLbl->setStyleSheet(QString(
        "color: %1; background: transparent;").arg(color.name()));
    vl->addWidget(m_valueLbl);

    // Sub label (hardware name / usage detail)
    m_subLbl = new QLabel("—");
    m_subLbl->setStyleSheet(QString(
        "color: %1; background: transparent; font-size: 10px;")
        .arg(Pal::DIM.name()));
    m_subLbl->setWordWrap(false);
    vl->addWidget(m_subLbl);

    // Graph
    m_graph = new MiniGraph;
    m_graph->setColor(color);
    m_graph->setFixedHeight(52);
    vl->addWidget(m_graph);
}

void MetricPanel::setTitle(const QString& t) {
    m_titleLbl->setText(t);
}

void MetricPanel::update(float pct, const QString& sub) {
    if (pct < 0.f) {
        m_valueLbl->setText("N/A");
        m_subLbl->setText(sub.isEmpty() ? "unavailable" : sub);
        return;
    }
    m_valueLbl->setText(QString("%1%").arg(int(pct)));
    m_subLbl->setText(sub);
    m_graph->push(pct);
}

void MetricPanel::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    QRectF r = QRectF(rect()).adjusted(0.5, 0.5, -0.5, -0.5);
    QPainterPath path;
    path.addRoundedRect(r, 9, 9);

    p.fillPath(path, Pal::CARD);

    // Top accent line
    QRectF al(r.left() + 9, r.top() + 0.5, r.width() - 18, 2);
    QLinearGradient ag(al.left(), 0, al.right(), 0);
    ag.setColorAt(0.0, Qt::transparent);
    ag.setColorAt(0.4, QColor(m_color.red(), m_color.green(), m_color.blue(), 150));
    ag.setColorAt(0.6, QColor(m_color.red(), m_color.green(), m_color.blue(), 150));
    ag.setColorAt(1.0, Qt::transparent);
    p.setPen(Qt::NoPen);
    p.setBrush(ag);
    p.drawRect(al);

    // Border
    p.setPen(QPen(QColor(255, 255, 255, 20), 1.0));
    p.setBrush(Qt::NoBrush);
    p.drawPath(path);
}

// ════════════════════════════════════════════════════════
//  SystemMonitorWidget
// ════════════════════════════════════════════════════════
SystemMonitorWidget::SystemMonitorWidget(QWidget* parent)
    : QWidget(parent)
{
    setAttribute(Qt::WA_TranslucentBackground);
    setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Fixed);

    auto* hl = new QHBoxLayout(this);
    hl->setContentsMargins(0, 0, 0, 0);
    hl->setSpacing(8);

    m_cpu = new MetricPanel("CPU",  Pal::ACCENT);
    m_ram = new MetricPanel("RAM",  Pal::VIOLET);
    m_gpu = new MetricPanel("GPU",  QColor(0x3D, 0xD6, 0x8A));

    hl->addWidget(m_cpu, 1);
    hl->addWidget(m_ram, 1);
    hl->addWidget(m_gpu, 1);

    m_stats = new SystemStats(this);
    connect(m_stats, &SystemStats::updated, this, &SystemMonitorWidget::onStats);
    m_stats->start(1000);
}

SystemMonitorWidget::~SystemMonitorWidget() {
    m_stats->stop();
}

void SystemMonitorWidget::onStats(SystemSnapshot snap) {
    // Update titles with hardware names on first non-empty snapshot
    if (!snap.cpuName.isEmpty())
        m_cpu->setTitle(snap.cpuName);
    if (!snap.gpuName.isEmpty())
        m_gpu->setTitle(snap.gpuName);

    // CPU — percent + thread count as subtitle
    m_cpu->update(snap.cpuPercent,
        QString("%1 threads").arg(QThread::idealThreadCount()));

    // RAM — percent + used/total
    m_ram->update(snap.ramPercent,
        QString("%1 / %2 MB").arg(snap.ramUsedMB).arg(snap.ramTotalMB));

    // GPU — percent (or N/A) + name already in title
    if (snap.gpuPercent < 0.f) {
        m_gpu->update(-1.f, "PDH unavailable");
    } else {
        m_gpu->update(snap.gpuPercent, "");
    }
}
