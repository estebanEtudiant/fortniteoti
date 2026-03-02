// ══════════════════════════════════════════════════════
//  DriverOptPage.h
//  GPU detection + driver version display + download link
// ══════════════════════════════════════════════════════
#pragma once

#include <QWidget>
#include <QLabel>
#include <QPushButton>
#include <QVBoxLayout>
#include <QHBoxLayout>

class DriverOptPage : public QWidget {
    Q_OBJECT
public:
    explicit DriverOptPage(QWidget* parent = nullptr);

private slots:
    void onRefresh();
    void openNvidiaDownload();
    void openAmdDownload();
    void openIntelDownload();

private:
    QLabel*      m_gpuNameLbl      = nullptr;
    QLabel*      m_driverVerLbl    = nullptr;
    QLabel*      m_dxVersionLbl    = nullptr;
    QLabel*      m_osLbl           = nullptr;
    QLabel*      m_vendorHintLbl   = nullptr;
    QPushButton* m_nvidiaBtn       = nullptr;
    QPushButton* m_amdBtn          = nullptr;
    QPushButton* m_intelBtn        = nullptr;
    QPushButton* m_refreshBtn      = nullptr;

    void buildUi();
    void detectGpu();

    struct GpuInfo {
        QString name;
        QString driverVersion;
        QString vendor; // "NVIDIA" | "AMD" | "INTEL" | "UNKNOWN"
    };
    GpuInfo queryGpu();
    QString queryDirectX();
};
