// ══════════════════════════════════════════════════════
//  LicenseScreen.h — Centered license key entry card
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QTimer>
#include <QFrame>
#include <QStackedWidget>

class AppController;

class LicenseScreen : public QWidget {
    Q_OBJECT
public:
    explicit LicenseScreen(AppController* ctrl, QWidget* parent = nullptr);

public slots:
    void onChecking(bool busy);
    void onStatus(const QString& msg, int type);

signals:
    void activateRequested(const QString& key);

protected:
    void paintEvent(QPaintEvent*) override;

private slots:
    void onActivateClicked();

private:
    AppController*  m_ctrl;
    QFrame*         m_card       = nullptr;
    QLabel*         m_hwidLabel  = nullptr;
    QLabel*         m_osLabel    = nullptr;
    QLineEdit*      m_keyInput   = nullptr;
    QPushButton*    m_activateBtn= nullptr;
    QStackedWidget* m_btnStack   = nullptr;  // 0=button, 1=spinner row
    QWidget*        m_arc        = nullptr;  // ArcSpinner (defined in .cpp)
    QLabel*         m_statusLbl  = nullptr;
    bool            m_busy       = false;

    void buildUi();
};
