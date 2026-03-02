// ══════════════════════════════════════════════════════
//  DriverOptPage.cpp
// ══════════════════════════════════════════════════════
#include "DriverOptPage.h"
#include "Palette.h"

#include <QScrollArea>
#include <QFrame>
#include <QProcess>
#include <QDesktopServices>
#include <QUrl>
#include <QRegularExpression>
#include <QThread>

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>

// ── helpers ──────────────────────────────────────────────────────────────────
static QLabel* mkL(const QString& t, int px, const QColor& c, bool bold = false) {
    auto* l = new QLabel(t);
    l->setStyleSheet(QString("color:%1;background:transparent;font-size:%2px;%3")
        .arg(c.name()).arg(px).arg(bold ? "font-weight:700;" : ""));
    return l;
}

static QPushButton* makeDownloadBtn(const QString& label, const QColor& col) {
    auto* btn = new QPushButton(label);
    btn->setFixedHeight(40);
    btn->setCursor(Qt::PointingHandCursor);
    btn->setStyleSheet(QString(
        "QPushButton{background:%1;color:#fff;border:none;border-radius:8px;"
        "font-size:13px;font-weight:700;padding:0 18px;}"
        "QPushButton:hover{background:%2;}")
        .arg(col.name(), col.lighter(115).name()));
    return btn;
}

// ── GPU detection via WMI (wmic) ──────────────────────────────────────────────
DriverOptPage::GpuInfo DriverOptPage::queryGpu() {
    GpuInfo info;
    info.vendor = "UNKNOWN";

    // wmic path Win32_VideoController get Name,DriverVersion /format:list
    QProcess proc;
    proc.start("wmic", { "path", "Win32_VideoController",
                          "get", "Name,DriverVersion",
                          "/format:list" });
    proc.waitForFinished(8000);
    QString out = QString::fromLocal8Bit(proc.readAllStandardOutput());

    for (const QString& line : out.split('\n')) {
        QString l = line.trimmed();
        if (l.startsWith("Name=")) {
            info.name = l.mid(5).trimmed();
        } else if (l.startsWith("DriverVersion=")) {
            info.driverVersion = l.mid(14).trimmed();
        }
    }

    if (info.name.isEmpty()) info.name = "Inconnu";
    if (info.driverVersion.isEmpty()) info.driverVersion = "—";

    QString upper = info.name.toUpper();
    if (upper.contains("NVIDIA") || upper.contains("GEFORCE") || upper.contains("QUADRO"))
        info.vendor = "NVIDIA";
    else if (upper.contains("AMD") || upper.contains("RADEON") || upper.contains("RX "))
        info.vendor = "AMD";
    else if (upper.contains("INTEL") || upper.contains("UHD") || upper.contains("IRIS") || upper.contains("ARC"))
        info.vendor = "INTEL";

    return info;
}

QString DriverOptPage::queryDirectX() {
    // Read from registry: HKLM\SOFTWARE\Microsoft\DirectX -> Version
    HKEY hKey;
    if (RegOpenKeyExW(HKEY_LOCAL_MACHINE,
                      L"SOFTWARE\\Microsoft\\DirectX",
                      0, KEY_READ, &hKey) == ERROR_SUCCESS) {
        wchar_t buf[64] = {};
        DWORD sz = sizeof(buf);
        DWORD type = REG_SZ;
        if (RegQueryValueExW(hKey, L"Version", nullptr, &type, (LPBYTE)buf, &sz) == ERROR_SUCCESS) {
            RegCloseKey(hKey);
            return QString::fromWCharArray(buf);
        }
        RegCloseKey(hKey);
    }
    return "DirectX 12"; // Windows 10/11 default
}

// ── DriverOptPage ─────────────────────────────────────────────────────────────
DriverOptPage::DriverOptPage(QWidget* parent) : QWidget(parent) {
    buildUi();
    detectGpu();
}

void DriverOptPage::buildUi() {
    auto* mainV = new QVBoxLayout(this);
    mainV->setContentsMargins(0, 0, 0, 0);
    mainV->setSpacing(0);

    // Header
    auto* hdr = new QWidget;
    hdr->setFixedHeight(72);
    auto* hdrH = new QHBoxLayout(hdr);
    hdrH->setContentsMargins(0, 0, 0, 16);
    auto* titleV = new QVBoxLayout;
    titleV->setSpacing(2);
    titleV->addWidget(mkL(u8"\U0001f3ae Optimiseur Drivers", 18, Pal::TEXT, true));
    titleV->addWidget(mkL("Detection GPU, version driver, telechargement direct", 11, Pal::DIM));
    hdrH->addLayout(titleV, 1);
    m_refreshBtn = new QPushButton(u8"\u21bb  Actualiser");
    m_refreshBtn->setFixedHeight(34);
    m_refreshBtn->setCursor(Qt::PointingHandCursor);
    m_refreshBtn->setStyleSheet(QString(
        "QPushButton{background:%1;color:%2;border:1px solid %3;border-radius:6px;"
        "font-size:12px;padding:0 14px;}"
        "QPushButton:hover{background:%4;}")
        .arg(Pal::CARD2.name(), Pal::TEXT.name(), Pal::BORDER.name(), Pal::FRAME.name()));
    connect(m_refreshBtn, &QPushButton::clicked, this, &DriverOptPage::onRefresh);
    hdrH->addWidget(m_refreshBtn);
    mainV->addWidget(hdr);

    // Scroll
    auto* scroll = new QScrollArea;
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    scroll->setStyleSheet("background: transparent; border: none;");

    auto* body = new QWidget;
    body->setStyleSheet("background: transparent;");
    auto* bodyV = new QVBoxLayout(body);
    bodyV->setContentsMargins(0, 0, 0, 0);
    bodyV->setSpacing(14);

    // ── GPU Info Card ────────────────────────────────────────────────────────
    auto* infoCard = new QFrame;
    infoCard->setObjectName("drvInfoCard");
    infoCard->setStyleSheet(QString(
        "#drvInfoCard{background:%1;border:1px solid %2;border-radius:10px;}")
        .arg(Pal::CARD.name(), Pal::BORDER.name()));
    auto* infoV = new QVBoxLayout(infoCard);
    infoV->setContentsMargins(18, 14, 18, 16);
    infoV->setSpacing(8);
    infoV->addWidget(mkL(u8"\U0001f4bb Informations GPU", 13, Pal::TEXT, true));
    auto* sep1 = new QFrame; sep1->setFrameShape(QFrame::NoFrame);
    sep1->setStyleSheet(QString("background:%1;border:none;").arg(Pal::BORDER.name()));
    sep1->setFixedHeight(1);
    infoV->addWidget(sep1);

    auto addRow = [&](const QString& key, QLabel*& lbl, const QColor& col) {
        auto* row = new QHBoxLayout;
        auto* kl = mkL(key, 12, Pal::DIM);
        kl->setFixedWidth(140);
        lbl = mkL("—", 12, col, true);
        lbl->setWordWrap(true);
        row->addWidget(kl);
        row->addWidget(lbl, 1);
        infoV->addLayout(row);
    };
    addRow("GPU :",            m_gpuNameLbl,    Pal::TEXT);
    addRow("Version driver :", m_driverVerLbl,  Pal::ACCENT);
    addRow("DirectX :",        m_dxVersionLbl,  Pal::SOFT);
    addRow("Systeme :",        m_osLbl,         Pal::DIM);
    bodyV->addWidget(infoCard);

    // ── Vendor hint ──────────────────────────────────────────────────────────
    auto* hintCard = new QFrame;
    hintCard->setObjectName("drvHintCard");
    hintCard->setStyleSheet(
        "#drvHintCard{background:rgba(0,140,210,0.07);border:1px solid rgba(0,209,255,0.18);border-radius:8px;}");
    auto* hintH = new QHBoxLayout(hintCard);
    hintH->setContentsMargins(12, 10, 12, 10);
    hintH->addWidget(mkL(u8"\u24d8", 16, Pal::ACCENT));
    hintH->addSpacing(8);
    m_vendorHintLbl = mkL(
        "Detection du fabricant en cours...", 11, Pal::SOFT);
    m_vendorHintLbl->setWordWrap(true);
    hintH->addWidget(m_vendorHintLbl, 1);
    bodyV->addWidget(hintCard);

    // ── Download buttons ─────────────────────────────────────────────────────
    auto* dlCard = new QFrame;
    dlCard->setObjectName("drvDlCard");
    dlCard->setStyleSheet(QString(
        "#drvDlCard{background:%1;border:1px solid %2;border-radius:10px;}")
        .arg(Pal::CARD.name(), Pal::BORDER.name()));
    auto* dlV = new QVBoxLayout(dlCard);
    dlV->setContentsMargins(18, 14, 18, 16);
    dlV->setSpacing(10);
    dlV->addWidget(mkL(u8"\u2B07 Telecharger les Drivers", 13, Pal::TEXT, true));
    auto* sep2 = new QFrame; sep2->setFrameShape(QFrame::NoFrame);
    sep2->setStyleSheet(QString("background:%1;border:none;").arg(Pal::BORDER.name()));
    sep2->setFixedHeight(1);
    dlV->addWidget(sep2);
    dlV->addWidget(mkL(
        "Cliquez sur le bouton correspondant a votre fabricant GPU pour ouvrir la page officielle.",
        11, Pal::DIM));

    auto* btnRow = new QHBoxLayout;
    btnRow->setSpacing(10);
    m_nvidiaBtn = makeDownloadBtn(u8"\U0001f7e2  NVIDIA GeForce", QColor(0x76,0xB9,0x00));
    m_amdBtn    = makeDownloadBtn(u8"\U0001f534  AMD Radeon",     QColor(0xED,0x1C,0x24));
    m_intelBtn  = makeDownloadBtn(u8"\U0001f535  Intel Arc/UHD",  QColor(0x00,0x71,0xC5));
    connect(m_nvidiaBtn, &QPushButton::clicked, this, &DriverOptPage::openNvidiaDownload);
    connect(m_amdBtn,    &QPushButton::clicked, this, &DriverOptPage::openAmdDownload);
    connect(m_intelBtn,  &QPushButton::clicked, this, &DriverOptPage::openIntelDownload);
    btnRow->addWidget(m_nvidiaBtn);
    btnRow->addWidget(m_amdBtn);
    btnRow->addWidget(m_intelBtn);
    btnRow->addStretch();
    dlV->addLayout(btnRow);

    // DDU tip
    auto* dduCard = new QFrame;
    dduCard->setObjectName("drvDduCard");
    dduCard->setStyleSheet(
        "#drvDduCard{background:rgba(255,180,0,0.07);border:1px solid rgba(255,180,0,0.25);border-radius:8px;}");
    auto* dduH = new QHBoxLayout(dduCard);
    dduH->setContentsMargins(12, 10, 12, 10);
    dduH->addWidget(mkL(u8"\u26a0", 16, Pal::WARN));
    dduH->addSpacing(8);
    dduH->addWidget(mkL(
        u8"Conseil : Utilisez DDU (Display Driver Uninstaller) en Safe Mode "
        u8"pour une installation propre du driver sans reliquats.",
        11, Pal::SOFT), 1);
    dlV->addWidget(dduCard);
    bodyV->addWidget(dlCard);

    bodyV->addStretch();
    scroll->setWidget(body);
    mainV->addWidget(scroll, 1);
}

void DriverOptPage::detectGpu() {
    m_gpuNameLbl->setText("Detection...");
    m_driverVerLbl->setText("...");

    // Run detection in background
    QThread* t = QThread::create([this]() {
        GpuInfo info = queryGpu();
        QString dx   = queryDirectX();

        QMetaObject::invokeMethod(this, [this, info, dx]() {
            m_gpuNameLbl->setText(info.name);
            m_driverVerLbl->setText(info.driverVersion);
            m_dxVersionLbl->setText(dx);

            // OS version from winver (simple approach)
            m_osLbl->setText("Windows 10 / 11");

            // Vendor hint
            if (info.vendor == "NVIDIA") {
                m_vendorHintLbl->setText(
                    u8"GPU NVIDIA detecte. Allez sur geforce.com/drivers pour le dernier "
                    u8"Game Ready Driver ou Studio Driver. Recommande : Game Ready.");
                m_nvidiaBtn->setStyleSheet(m_nvidiaBtn->styleSheet()
                    + "QPushButton{border:2px solid #76B900;}");
            } else if (info.vendor == "AMD") {
                m_vendorHintLbl->setText(
                    u8"GPU AMD detecte. Allez sur amd.com/support pour Adrenalin Edition. "
                    u8"Desactivez Radeon Chill et Enhanced Sync pour moins de latence.");
                m_amdBtn->setStyleSheet(m_amdBtn->styleSheet()
                    + "QPushButton{border:2px solid #ED1C24;}");
            } else if (info.vendor == "INTEL") {
                m_vendorHintLbl->setText(
                    u8"GPU Intel detecte. Allez sur intel.com/drivers pour Intel Arc & "
                    u8"Iris Xe Graphics Driver.");
                m_intelBtn->setStyleSheet(m_intelBtn->styleSheet()
                    + "QPushButton{border:2px solid #0071C5;}");
            } else {
                m_vendorHintLbl->setText(
                    u8"Fabricant GPU non detecte automatiquement. "
                    u8"Choisissez le bon bouton ci-dessous.");
            }
        }, Qt::QueuedConnection);
    });
    t->setParent(this);
    connect(t, &QThread::finished, t, &QObject::deleteLater);
    t->start();
}

void DriverOptPage::onRefresh() {
    detectGpu();
}

void DriverOptPage::openNvidiaDownload() {
    QDesktopServices::openUrl(QUrl("https://www.nvidia.com/fr-fr/geforce/drivers/"));
}

void DriverOptPage::openAmdDownload() {
    QDesktopServices::openUrl(QUrl("https://www.amd.com/fr/support/download/drivers.html"));
}

void DriverOptPage::openIntelDownload() {
    QDesktopServices::openUrl(QUrl("https://www.intel.com/content/www/fr/fr/download-center/home.html"));
}
