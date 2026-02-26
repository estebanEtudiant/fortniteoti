// ══════════════════════════════════════════════════════
//  UpdateDialog.h — Update notification popup
// ══════════════════════════════════════════════════════
#pragma once
#include <QDialog>
#include <QLabel>
#include <QPlainTextEdit>

class UpdateDialog : public QDialog {
    Q_OBJECT
public:
    explicit UpdateDialog(QWidget* parent = nullptr);
    void show(const QString& version, const QString& url, const QString& changelog);

signals:
    void downloadRequested();
    void dismissed();

private:
    QLabel*        m_versionLbl  = nullptr;
    QPlainTextEdit* m_changelog  = nullptr;
    QString         m_url;

    void buildUi();
};
