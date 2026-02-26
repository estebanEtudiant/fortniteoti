// ══════════════════════════════════════════════════════
//  UpdateDialog.cpp
// ══════════════════════════════════════════════════════
#include "UpdateDialog.h"
#include "Palette.h"
#include "updater.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QPushButton>
#include <QLabel>
#include <QFrame>
#include <QFont>
#include <QDesktopServices>
#include <QUrl>
#include <QGraphicsDropShadowEffect>

UpdateDialog::UpdateDialog(QWidget* parent)
    : QDialog(parent, Qt::Dialog | Qt::FramelessWindowHint)
{
    setAttribute(Qt::WA_TranslucentBackground, false);
    setModal(true);
    setFixedWidth(520);
    buildUi();

    setStyleSheet(QString(
        "QDialog { background: %1; border: 1px solid %2; border-radius: 10px; }")
        .arg(Pal::CARD.name(), Pal::BORDER.name()));

    auto* shadow = new QGraphicsDropShadowEffect(this);
    shadow->setBlurRadius(48);
    shadow->setColor(QColor(0,0,0,140));
    shadow->setOffset(0, 12);
    setGraphicsEffect(shadow);
}

void UpdateDialog::buildUi() {
    auto* vl = new QVBoxLayout(this);
    vl->setContentsMargins(28, 28, 28, 24);
    vl->setSpacing(12);

    // Title
    auto* titleLbl = new QLabel("  Mise a jour disponible !");
    QFont tf("Segoe UI", 16);
    titleLbl->setFont(tf);
    titleLbl->setStyleSheet(QString("color: %1; background: transparent;")
        .arg(Pal::ACCENT.name()));
    vl->addWidget(titleLbl);

    // Separator
    auto* sep = new QFrame;
    sep->setFrameShape(QFrame::HLine);
    sep->setFixedHeight(1);
    sep->setStyleSheet(QString("background: %1;").arg(Pal::BORDER.name()));
    vl->addWidget(sep);

    // Versions
    auto* curRow = new QHBoxLayout;
    auto* curKey = new QLabel("Version actuelle :");
    curKey->setStyleSheet(QString("color: %1; background: transparent; font-size: 13px;")
        .arg(Pal::DIM.name()));
    auto* curVal = new QLabel(QString(" %1").arg(updater::CURRENT_VERSION));
    curVal->setStyleSheet(QString("color: %1; background: transparent; font-size: 13px;")
        .arg(Pal::TEXT.name()));
    curRow->addWidget(curKey);
    curRow->addWidget(curVal);
    curRow->addStretch();
    vl->addLayout(curRow);

    auto* newRow = new QHBoxLayout;
    auto* newKey = new QLabel("Nouvelle version :");
    newKey->setStyleSheet(curKey->styleSheet());
    m_versionLbl = new QLabel(" —");
    m_versionLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 13px;")
        .arg(Pal::OK.name()));
    newRow->addWidget(newKey);
    newRow->addWidget(m_versionLbl);
    newRow->addStretch();
    vl->addLayout(newRow);

    // Changelog label
    auto* clLbl = new QLabel("CHANGELOG");
    clLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px; letter-spacing: 1px;")
        .arg(Pal::DIM.name()));
    vl->addWidget(clLbl);

    // Changelog text
    m_changelog = new QPlainTextEdit;
    m_changelog->setReadOnly(true);
    m_changelog->setFixedHeight(120);
    QFont mono("Consolas", 11);
    m_changelog->setFont(mono);
    m_changelog->setStyleSheet(QString(
        "QPlainTextEdit { background: %1; color: %2;"
        "  border: 1px solid %3; border-radius: 6px; padding: 8px; font-size: 11px; }")
        .arg(Pal::CARD2.name(), Pal::TEXT.name(), Pal::BORDER.name()));
    vl->addWidget(m_changelog);

    auto* sep2 = new QFrame;
    sep2->setFrameShape(QFrame::HLine);
    sep2->setFixedHeight(1);
    sep2->setStyleSheet(sep->styleSheet());
    vl->addWidget(sep2);

    // Buttons
    auto* btnRow = new QHBoxLayout;
    btnRow->setSpacing(12);
    btnRow->addStretch();

    auto* dlBtn = new QPushButton("Telecharger la mise a jour");
    dlBtn->setFixedSize(220, 40);
    dlBtn->setCursor(Qt::PointingHandCursor);
    dlBtn->setStyleSheet(QString(
        "QPushButton { background: qlineargradient(x1:0,y1:0,x2:1,y2:0,"
        "  stop:0 #0285CC, stop:1 #2D4BAF); color: white;"
        "  font-weight: bold; border: none; border-radius: 8px; font-size: 13px; }"
        "QPushButton:hover { background: qlineargradient(x1:0,y1:0,x2:1,y2:0,"
        "  stop:0 #04AAFF, stop:1 #3A5CC0); }"));
    connect(dlBtn, &QPushButton::clicked, this, [this]() {
        QDesktopServices::openUrl(QUrl(m_url));
        emit downloadRequested();
        accept();
    });
    btnRow->addWidget(dlBtn);

    auto* laterBtn = new QPushButton("Plus tard");
    laterBtn->setFixedSize(140, 40);
    laterBtn->setCursor(Qt::PointingHandCursor);
    laterBtn->setStyleSheet(QString(
        "QPushButton { background: %1; color: %2; border: 1px solid %3;"
        "  border-radius: 8px; font-size: 13px; }"
        "QPushButton:hover { background: %4; }")
        .arg(Pal::FRAME.name(), Pal::TEXT.name(),
             Pal::BORDER.name(), Pal::CARD2.name()));
    connect(laterBtn, &QPushButton::clicked, this, [this]() {
        emit dismissed();
        reject();
    });
    btnRow->addWidget(laterBtn);
    btnRow->addStretch();
    vl->addLayout(btnRow);
}

void UpdateDialog::show(const QString& version, const QString& url, const QString& changelog) {
    m_url = url;
    m_versionLbl->setText(" " + version);
    m_changelog->setPlainText(changelog);
    QDialog::show();
    activateWindow();
    raise();
}
