// ══════════════════════════════════════════════════════
//  NetworkOptimizerPage.cpp
// ══════════════════════════════════════════════════════
#include "NetworkOptimizerPage.h"
#include "Palette.h"

#include <QScrollArea>
#include <QFrame>
#include <QPainter>
#include <QProcess>
#include <QRegularExpression>
#include <QMessageBox>

// ── helpers ──────────────────────────────────────────────────────────────────
static QLabel* mkLabel(const QString& t, int px, const QColor& c, bool bold = false) {
    auto* l = new QLabel(t);
    l->setStyleSheet(QString("color:%1;background:transparent;font-size:%2px;%3")
        .arg(c.name()).arg(px).arg(bold ? "font-weight:700;" : ""));
    return l;
}

static QFrame* makeSectionCard(const QString& title) {
    auto* card = new QFrame;
    // Use objectName selector to prevent border leaking to child QFrame separators
    static int s_cardId = 0;
    QString name = QString("net_card_%1").arg(++s_cardId);
    card->setObjectName(name);
    card->setStyleSheet(QString(
        "#%1{background:%2;border:1px solid %3;border-radius:10px;}")
        .arg(name, Pal::CARD.name(), Pal::BORDER.name()));
    auto* v = new QVBoxLayout(card);
    v->setContentsMargins(18, 14, 18, 16);
    v->setSpacing(10);
    auto* hdr = new QLabel(title);
    hdr->setStyleSheet(QString("color:%1;font-size:13px;font-weight:700;background:transparent;")
        .arg(Pal::TEXT.name()));
    v->addWidget(hdr);
    auto* sep = new QFrame;
    sep->setFrameShape(QFrame::NoFrame);
    sep->setStyleSheet(QString("background:%1; border:none;").arg(Pal::BORDER.name()));
    sep->setFixedHeight(1);
    v->addWidget(sep);
    return card;
}

// ── Ping bar graph widget ─────────────────────────────────────────────────────
class PingGraph : public QWidget {
public:
    explicit PingGraph(QVector<double>* history, QWidget* parent = nullptr)
        : QWidget(parent), m_hist(history) {
        setFixedHeight(56);
        setStyleSheet("background:transparent;");
    }
    void refresh() { update(); }
protected:
    void paintEvent(QPaintEvent*) override {
        QPainter p(this);
        p.setRenderHint(QPainter::Antialiasing);
        if (!m_hist || m_hist->isEmpty()) {
            p.setPen(Pal::DIM);
            p.drawText(rect(), Qt::AlignCenter, "En attente...");
            return;
        }
        int n = m_hist->size();
        double maxV = 1.0;
        for (double v : *m_hist) if (v > maxV) maxV = v;
        double barW = (double)width() / n;
        for (int i = 0; i < n; ++i) {
            double v = (*m_hist)[i];
            if (v < 0) continue;
            double ratio = v / maxV;
            int bH = (int)(ratio * (height() - 4)) + 2;
            int x  = (int)(i * barW);
            int bW = qMax(1, (int)(barW - 2));
            QColor c = (v < 30) ? Pal::OK : (v < 80) ? Pal::ACCENT : Pal::ERR;
            c.setAlpha(200);
            p.setBrush(c);
            p.setPen(Qt::NoPen);
            p.drawRoundedRect(x, height() - bH, bW, bH - 2, 2, 2);
        }
    }
private:
    QVector<double>* m_hist;
};

// ── NetworkOptimizerPage ──────────────────────────────────────────────────────
NetworkOptimizerPage::NetworkOptimizerPage(QWidget* parent) : QWidget(parent) {
    buildUi();
    // Start ping monitor at 5s interval
    m_pingTimer = new QTimer(this);
    m_pingTimer->setInterval(5000);
    connect(m_pingTimer, &QTimer::timeout, this, &NetworkOptimizerPage::onPingTick);
    m_pingTimer->start();
    // Initial ping
    QTimer::singleShot(500, this, &NetworkOptimizerPage::onPingTick);
    refreshMtu();
}

void NetworkOptimizerPage::buildUi() {
    auto* mainV = new QVBoxLayout(this);
    mainV->setContentsMargins(0, 0, 0, 0);
    mainV->setSpacing(0);

    // ── Header ──────────────────────────────────────────────────────────────
    auto* hdr = new QWidget;
    hdr->setFixedHeight(72);
    auto* hdrH = new QHBoxLayout(hdr);
    hdrH->setContentsMargins(0, 0, 0, 16);
    auto* titleV = new QVBoxLayout;
    titleV->setSpacing(2);
    titleV->addWidget(mkLabel(u8"\U0001f310 Optimiseur Reseau", 18, Pal::TEXT, true));
    titleV->addWidget(mkLabel("DNS presets, moniteur ping temps reel, MTU", 11, Pal::DIM));
    hdrH->addLayout(titleV, 1);
    mainV->addWidget(hdr);

    // ── Scrollable content ───────────────────────────────────────────────────
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

    // ── DNS section ──────────────────────────────────────────────────────────
    auto* dnsCard = makeSectionCard(u8"\U0001f4cb Configuration DNS");
    auto* dnsLayout = qobject_cast<QVBoxLayout*>(dnsCard->layout());

    // Adapter combo
    auto* adapterRow = new QHBoxLayout;
    adapterRow->addWidget(mkLabel("Adaptateur :", 12, Pal::DIM));
    m_adapterCombo = new QComboBox;
    m_adapterCombo->setStyleSheet(QString(
        "QComboBox{background:%1;color:%2;border:1px solid %3;border-radius:6px;"
        "padding:4px 10px;font-size:12px;}"
        "QComboBox::drop-down{border:none;}"
        "QComboBox QAbstractItemView{background:%1;color:%2;border:1px solid %3;}")
        .arg(Pal::CARD2.name(), Pal::TEXT.name(), Pal::BORDER.name()));
    m_adapterCombo->setMinimumWidth(260);
    auto adapters = listAdapters();
    for (const auto& a : adapters) m_adapterCombo->addItem(a);
    auto* refreshBtn = new QPushButton(u8"\u21bb");
    refreshBtn->setFixedSize(28, 28);
    refreshBtn->setCursor(Qt::PointingHandCursor);
    refreshBtn->setStyleSheet(QString(
        "QPushButton{background:%1;color:%2;border:1px solid %3;border-radius:6px;font-size:14px;}"
        "QPushButton:hover{background:%4;}")
        .arg(Pal::CARD2.name(), Pal::DIM.name(), Pal::BORDER.name(), Pal::FRAME.name()));
    connect(refreshBtn, &QPushButton::clicked, this, &NetworkOptimizerPage::onRefreshAdapters);
    adapterRow->addWidget(m_adapterCombo, 1);
    adapterRow->addWidget(refreshBtn);
    dnsLayout->addLayout(adapterRow);

    // DNS preset
    auto* presetRow = new QHBoxLayout;
    presetRow->addWidget(mkLabel("Preset DNS :", 12, Pal::DIM));
    m_dnsPresetCombo = new QComboBox;
    m_dnsPresetCombo->setStyleSheet(m_adapterCombo->styleSheet());
    m_dnsPresetCombo->addItem("Cloudflare  (1.1.1.1 / 1.0.0.1)");
    m_dnsPresetCombo->addItem("Google      (8.8.8.8 / 8.8.4.4)");
    m_dnsPresetCombo->addItem("OpenDNS     (208.67.222.222 / 208.67.220.220)");
    m_dnsPresetCombo->addItem("Quad9       (9.9.9.9 / 149.112.112.112)");
    m_dnsPresetCombo->addItem("Personnalise");
    connect(m_dnsPresetCombo, QOverload<int>::of(&QComboBox::currentIndexChanged),
            this, [this](int idx) {
        switch (idx) {
            case 0: setDnsFields("1.1.1.1",           "1.0.0.1");           break;
            case 1: setDnsFields("8.8.8.8",           "8.8.4.4");           break;
            case 2: setDnsFields("208.67.222.222",     "208.67.220.220");    break;
            case 3: setDnsFields("9.9.9.9",            "149.112.112.112");   break;
            default: break; // custom — leave editable
        }
        bool custom = (idx == 4);
        m_dnsEdit1->setReadOnly(!custom);
        m_dnsEdit2->setReadOnly(!custom);
    });
    presetRow->addWidget(m_dnsPresetCombo, 1);
    dnsLayout->addLayout(presetRow);

    // DNS fields
    auto makeInput = [](const QString& ph) -> QLineEdit* {
        auto* e = new QLineEdit;
        e->setPlaceholderText(ph);
        e->setFixedHeight(32);
        e->setStyleSheet(QString(
            "QLineEdit{background:%1;color:%2;border:1px solid %3;border-radius:6px;"
            "padding:0 10px;font-size:12px;}"
            "QLineEdit:focus{border:1px solid %4;}"
            "QLineEdit:read-only{color:%5;}")
            .arg(Pal::CARD2.name(), Pal::TEXT.name(), Pal::BORDER.name(),
                 Pal::ACCENT.name(), Pal::DIM.name()));
        return e;
    };
    auto* dnsRow = new QHBoxLayout;
    dnsRow->setSpacing(8);
    m_dnsEdit1 = makeInput("DNS primaire");
    m_dnsEdit2 = makeInput("DNS secondaire");
    dnsRow->addWidget(mkLabel("DNS :", 12, Pal::DIM));
    dnsRow->addWidget(m_dnsEdit1, 1);
    dnsRow->addWidget(m_dnsEdit2, 1);
    dnsLayout->addLayout(dnsRow);
    // Init fields with Cloudflare
    setDnsFields("1.1.1.1", "1.0.0.1");
    m_dnsEdit1->setReadOnly(true);
    m_dnsEdit2->setReadOnly(true);

    // Apply button + status
    auto* applyRow = new QHBoxLayout;
    m_applyDnsBtn = new QPushButton(u8"\u2713  Appliquer le DNS");
    m_applyDnsBtn->setFixedHeight(36);
    m_applyDnsBtn->setCursor(Qt::PointingHandCursor);
    m_applyDnsBtn->setStyleSheet(QString(
        "QPushButton{background:%1;color:#000;border:none;border-radius:8px;"
        "font-size:13px;font-weight:700;padding:0 20px;}"
        "QPushButton:hover{background:%2;}")
        .arg(Pal::ACCENT.name(), Pal::ACCENT_H.name()));
    connect(m_applyDnsBtn, &QPushButton::clicked, this, &NetworkOptimizerPage::onApplyDns);
    m_dnsStatusLbl = mkLabel("", 11, Pal::DIM);
    applyRow->addWidget(m_applyDnsBtn);
    applyRow->addSpacing(12);
    applyRow->addWidget(m_dnsStatusLbl, 1);
    dnsLayout->addLayout(applyRow);

    bodyV->addWidget(dnsCard);

    // ── Ping monitor ─────────────────────────────────────────────────────────
    auto* pingCard = makeSectionCard(u8"\U0001f4f6 Moniteur Ping (1.1.1.1)");
    auto* pingLayout = qobject_cast<QVBoxLayout*>(pingCard->layout());

    auto* pingStatsRow = new QHBoxLayout;
    pingStatsRow->setSpacing(24);
    auto makeStatBox = [&](const QString& label, QLabel*& valLbl, const QColor& col) {
        auto* box = new QVBoxLayout;
        box->setSpacing(2);
        box->addWidget(mkLabel(label, 10, Pal::DIM));
        valLbl = mkLabel("—", 18, col, true);
        box->addWidget(valLbl);
        pingStatsRow->addLayout(box);
    };
    makeStatBox("ACTUEL",  m_pingValLbl, Pal::ACCENT);
    makeStatBox("MIN",     m_pingMinLbl, Pal::OK);
    makeStatBox("MAX",     m_pingMaxLbl, Pal::ERR);
    makeStatBox("MOY",     m_pingAvgLbl, Pal::SOFT);
    pingStatsRow->addStretch();
    pingLayout->addLayout(pingStatsRow);

    m_pingGraph = new PingGraph(&m_pingHistory, this);
    pingLayout->addWidget(m_pingGraph);

    bodyV->addWidget(pingCard);

    // ── MTU section ───────────────────────────────────────────────────────────
    auto* mtuCard = makeSectionCard(u8"\U0001f4e1 MTU Interface");
    auto* mtuLayout = qobject_cast<QVBoxLayout*>(mtuCard->layout());
    auto* mtuRow = new QHBoxLayout;
    mtuRow->addWidget(mkLabel("MTU actuel :", 12, Pal::DIM));
    m_mtuLbl = mkLabel("—", 13, Pal::TEXT, true);
    mtuRow->addWidget(m_mtuLbl, 1);
    m_mtuBtn = new QPushButton(u8"\u21bb  Rafraichir");
    m_mtuBtn->setFixedHeight(32);
    m_mtuBtn->setCursor(Qt::PointingHandCursor);
    m_mtuBtn->setStyleSheet(QString(
        "QPushButton{background:%1;color:%2;border:1px solid %3;border-radius:6px;"
        "font-size:12px;padding:0 14px;}"
        "QPushButton:hover{background:%4;}")
        .arg(Pal::CARD2.name(), Pal::TEXT.name(), Pal::BORDER.name(), Pal::FRAME.name()));
    connect(m_mtuBtn, &QPushButton::clicked, this, &NetworkOptimizerPage::refreshMtu);
    mtuRow->addWidget(m_mtuBtn);
    mtuLayout->addLayout(mtuRow);
    mtuLayout->addWidget(mkLabel(
        u8"Note : Le MTU standard pour Ethernet/WiFi est 1500. "
        u8"Un MTU r\u00e9duit peut r\u00e9duire la fragmentation sur VPN.",
        10, Pal::DIM));
    bodyV->addWidget(mtuCard);

    bodyV->addStretch();
    scroll->setWidget(body);
    mainV->addWidget(scroll, 1);
}

// ── DNS ───────────────────────────────────────────────────────────────────────
void NetworkOptimizerPage::setDnsFields(const QString& dns1, const QString& dns2) {
    m_dnsEdit1->setText(dns1);
    m_dnsEdit2->setText(dns2);
}

QStringList NetworkOptimizerPage::listAdapters() {
    QProcess proc;
    proc.start("netsh", { "interface", "show", "interface" });
    proc.waitForFinished(5000);
    QString out = QString::fromLocal8Bit(proc.readAllStandardOutput());

    QStringList result;
    static QRegularExpression rx("(?:Connected|Deconnecte|Connecte|Disconnected)\\s+(?:Dedicated|Loopback|Internal|Dedie)\\s+\\S+\\s+(.+)");
    // Simpler: grab interface names — lines with "Connected" or "Connecte"
    static QRegularExpression rxLine("(Connected|Connecte)\\s+\\S+\\s+\\S+\\s+(.+)");
    for (const QString& line : out.split('\n')) {
        QRegularExpressionMatch m = rxLine.match(line.trimmed());
        if (m.hasMatch()) {
            QString name = m.captured(2).trimmed();
            if (!name.isEmpty()) result << name;
        }
    }
    if (result.isEmpty()) result << "Ethernet" << "Wi-Fi";
    return result;
}

void NetworkOptimizerPage::onRefreshAdapters() {
    m_adapterCombo->clear();
    for (const auto& a : listAdapters()) m_adapterCombo->addItem(a);
}

void NetworkOptimizerPage::onApplyDns() {
    QString adapter = m_adapterCombo->currentText().trimmed();
    QString dns1    = m_dnsEdit1->text().trimmed();
    QString dns2    = m_dnsEdit2->text().trimmed();
    if (adapter.isEmpty() || dns1.isEmpty()) {
        m_dnsStatusLbl->setText(u8"\u26a0 Adaptateur ou DNS vide.");
        m_dnsStatusLbl->setStyleSheet(QString("color:%1;background:transparent;font-size:11px;")
            .arg(Pal::ERR.name()));
        return;
    }

    m_applyDnsBtn->setEnabled(false);
    m_dnsStatusLbl->setText("Application en cours...");
    m_dnsStatusLbl->setStyleSheet(QString("color:%1;background:transparent;font-size:11px;")
        .arg(Pal::DIM.name()));

    // Apply primary DNS
    QProcess p1;
    p1.start("netsh", { "interface", "ip", "set", "dns",
                        adapter, "static", dns1, "primary" });
    p1.waitForFinished(8000);

    if (!dns2.isEmpty()) {
        QProcess p2;
        p2.start("netsh", { "interface", "ip", "add", "dns",
                            adapter, dns2, "index=2" });
        p2.waitForFinished(8000);
    }

    // Flush DNS cache
    QProcess flush;
    flush.start("ipconfig", { "/flushdns" });
    flush.waitForFinished(4000);

    bool ok = (p1.exitCode() == 0);
    if (ok) {
        m_dnsStatusLbl->setText(u8"\u2713  DNS applique et cache vide !");
        m_dnsStatusLbl->setStyleSheet(QString("color:%1;background:transparent;font-size:11px;")
            .arg(Pal::OK.name()));
    } else {
        m_dnsStatusLbl->setText(u8"\u26a0 Erreur — lancez en Administrateur.");
        m_dnsStatusLbl->setStyleSheet(QString("color:%1;background:transparent;font-size:11px;")
            .arg(Pal::ERR.name()));
    }
    m_applyDnsBtn->setEnabled(true);
}

// ── Ping monitor ──────────────────────────────────────────────────────────────
void NetworkOptimizerPage::onPingTick() {
    runPingOnce("1.1.1.1");
}

void NetworkOptimizerPage::runPingOnce(const QString& host) {
    QProcess* proc = new QProcess(this);
    connect(proc, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished),
            this, [this, proc](int, QProcess::ExitStatus) {
        QString out = QString::fromLocal8Bit(proc->readAllStandardOutput());
        proc->deleteLater();

        static QRegularExpression rx("(?:Moyenne|Average)\\s*=\\s*(\\d+)\\s*ms",
                                      QRegularExpression::CaseInsensitiveOption);
        QRegularExpressionMatch m = rx.match(out);
        double val = m.hasMatch() ? m.captured(1).toDouble() : -1.0;

        // Keep last 30 samples
        if (m_pingHistory.size() >= 30) m_pingHistory.removeFirst();
        m_pingHistory.append(val);

        if (val >= 0) {
            if (val < m_pingMin) m_pingMin = val;
            if (val > m_pingMax) m_pingMax = val;
            m_pingSum += val;
            ++m_pingCount;

            QColor col = (val < 30) ? Pal::OK : (val < 80) ? Pal::ACCENT : Pal::ERR;
            m_pingValLbl->setText(QString::number((int)val) + " ms");
            m_pingValLbl->setStyleSheet(QString("color:%1;background:transparent;font-size:18px;font-weight:700;")
                .arg(col.name()));
            m_pingMinLbl->setText(QString::number((int)m_pingMin) + " ms");
            m_pingMaxLbl->setText(QString::number((int)m_pingMax) + " ms");
            if (m_pingCount > 0)
                m_pingAvgLbl->setText(QString::number((int)(m_pingSum / m_pingCount)) + " ms");
        } else {
            m_pingValLbl->setText("Timeout");
            m_pingValLbl->setStyleSheet(QString("color:%1;background:transparent;font-size:18px;font-weight:700;")
                .arg(Pal::ERR.name()));
        }

        if (m_pingGraph) {
            static_cast<PingGraph*>(m_pingGraph)->refresh();
        }
    });
    proc->start("ping", { "-n", "1", "-w", "2000", host });
}

// ── MTU ───────────────────────────────────────────────────────────────────────
void NetworkOptimizerPage::refreshMtu() {
    QProcess proc;
    proc.start("netsh", { "interface", "ipv4", "show", "subinterfaces" });
    proc.waitForFinished(6000);
    QString out = QString::fromLocal8Bit(proc.readAllStandardOutput());

    // Line format: "   1500  Ethernet"
    static QRegularExpression rx("(\\d{3,4})\\s+\\d+\\s+\\d+\\s+(.+)");
    QStringList parts;
    for (const QString& line : out.split('\n')) {
        QRegularExpressionMatch m = rx.match(line.trimmed());
        if (m.hasMatch()) {
            int mtu = m.captured(1).toInt();
            QString iface = m.captured(2).trimmed();
            if (mtu > 0 && mtu < 65536 && iface != "Loopback Pseudo-Interface 1")
                parts << QString("%1: %2").arg(iface).arg(mtu);
        }
    }
    if (!parts.isEmpty())
        m_mtuLbl->setText(parts.join("   |   "));
    else
        m_mtuLbl->setText("Non disponible");
}
