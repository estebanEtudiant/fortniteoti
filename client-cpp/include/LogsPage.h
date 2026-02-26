// ══════════════════════════════════════════════════════
//  LogsPage.h — Real-time log console
// ══════════════════════════════════════════════════════
#pragma once
#include <QWidget>
#include <QPlainTextEdit>
#include <QLabel>
#include <QPushButton>
#include <QTimer>
#include <QTextCharFormat>

class AppController;

class LogsPage : public QWidget {
    Q_OBJECT
public:
    explicit LogsPage(AppController* ctrl, QWidget* parent = nullptr);

public slots:
    void appendLog(const QString& text, int type);
    void clearLogs();
    void onRunningChanged(bool running, const QString& title);

private:
    AppController*  m_ctrl;
    QLabel*         m_statusLbl  = nullptr;
    QPlainTextEdit* m_console    = nullptr;
    QPushButton*    m_clearBtn   = nullptr;
    QTimer*         m_spinTimer  = nullptr;
    int             m_spinFrame  = 0;
    bool            m_autoScroll = true;
    bool            m_compact    = false;
    bool            m_running    = false;
    QString         m_runTitle;

    void buildUi();
    void updateStatusBar();
};
