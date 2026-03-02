// ══════════════════════════════════════════════════════
//  NetworkOptimizerPage.h
//  DNS switcher, ping monitor, MTU info
// ══════════════════════════════════════════════════════
#pragma once

#include <QWidget>
#include <QLabel>
#include <QPushButton>
#include <QLineEdit>
#include <QComboBox>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QTimer>
#include <QVector>

class NetworkOptimizerPage : public QWidget {
    Q_OBJECT
public:
    explicit NetworkOptimizerPage(QWidget* parent = nullptr);

private slots:
    void onApplyDns();
    void onPingTick();
    void onRefreshAdapters();

private:
    // DNS section
    QComboBox*   m_adapterCombo  = nullptr;
    QComboBox*   m_dnsPresetCombo= nullptr;
    QLineEdit*   m_dnsEdit1      = nullptr;
    QLineEdit*   m_dnsEdit2      = nullptr;
    QPushButton* m_applyDnsBtn   = nullptr;
    QLabel*      m_dnsStatusLbl  = nullptr;

    // Ping monitor
    QLabel*      m_pingHostLbl   = nullptr;
    QLabel*      m_pingValLbl    = nullptr;
    QLabel*      m_pingMinLbl    = nullptr;
    QLabel*      m_pingMaxLbl    = nullptr;
    QLabel*      m_pingAvgLbl    = nullptr;
    QWidget*     m_pingGraph     = nullptr;
    QTimer*      m_pingTimer     = nullptr;
    QVector<double> m_pingHistory;
    double       m_pingMin = 9999.0;
    double       m_pingMax = 0.0;
    double       m_pingSum = 0.0;
    int          m_pingCount = 0;

    // MTU section
    QLabel*      m_mtuLbl        = nullptr;
    QPushButton* m_mtuBtn        = nullptr;

    void buildUi();
    void runPingOnce(const QString& host);
    void refreshMtu();
    void setDnsFields(const QString& dns1, const QString& dns2);
    QStringList listAdapters();
};
