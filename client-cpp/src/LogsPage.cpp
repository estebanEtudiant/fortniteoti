// ══════════════════════════════════════════════════════
//  LogsPage.cpp
// ══════════════════════════════════════════════════════
#include "LogsPage.h"
#include "AppController.h"
#include "Palette.h"
#include "GlassCard.h"
#include "GlowButton.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFrame>
#include <QFont>
#include <QScrollBar>

static const char* SPINNER_FRAMES[] = {
    "●○○", "○●○", "○○●", "○●○"
};

LogsPage::LogsPage(AppController* ctrl, QWidget* parent)
    : QWidget(parent), m_ctrl(ctrl)
{
    buildUi();
    m_spinTimer = new QTimer(this);
    m_spinTimer->setInterval(220);
    connect(m_spinTimer, &QTimer::timeout, this, [this]() {
        m_spinFrame = (m_spinFrame + 1) % 4;
        updateStatusBar();
    });
}

void LogsPage::buildUi() {
    auto* vl = new QVBoxLayout(this);
    vl->setContentsMargins(0, 0, 0, 0);
    vl->setSpacing(8);

    // ── Page title ─────────────────────────────────────
    auto* titleLbl = new QLabel("Logs");
    QFont tf("Segoe UI", 20, QFont::Bold);
    titleLbl->setFont(tf);
    titleLbl->setStyleSheet(QString("color: %1; background: transparent;")
        .arg(Pal::TEXT.name()));
    vl->addWidget(titleLbl);

    auto* subLbl = new QLabel("Console d'execution en temps reel.");
    subLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;")
        .arg(Pal::DIM.name()));
    vl->addWidget(subLbl);
    vl->addSpacing(6);

    // ── Status bar card ────────────────────────────────
    {
        auto* card = new GlassCard(nullptr, 10, Pal::ACCENT);
        auto* row = new QHBoxLayout(card);
        row->setContentsMargins(14, 10, 14, 10);
        row->setSpacing(0);

        m_statusLbl = new QLabel("●  Aucune operation lancee.");
        m_statusLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
            .arg(Pal::DIM.name()));
        row->addWidget(m_statusLbl, 1);

        auto* clearGlow = new GlowButton("Vider les logs", GlowButton::Style::Ghost);
        clearGlow->setFixedSize(130, 32);
        m_clearBtn = clearGlow;
        connect(m_clearBtn, &QPushButton::clicked, m_ctrl, &AppController::clearLogs);
        row->addWidget(m_clearBtn);

        vl->addWidget(card);
        vl->addSpacing(4);
    }

    // ── Console inside a GlassCard ─────────────────────
    {
        auto* consoleCard = new GlassCard(nullptr, 10);
        auto* cv = new QVBoxLayout(consoleCard);
        cv->setContentsMargins(2, 2, 2, 2);

        m_console = new QPlainTextEdit;
        m_console->setReadOnly(true);
        m_console->setWordWrapMode(QTextOption::WrapAnywhere);
        m_console->setStyleSheet(QString(
            "QPlainTextEdit {"
            "  background: #09090C; color: %1;"
            "  border: none; border-radius: 9px;"
            "  padding: 12px 14px; font-size: 12px; }")
            .arg(Pal::TEXT.name()));

        QFont mono("Consolas", 12);
        if (!mono.exactMatch()) mono.setFamily("Courier New");
        m_console->setFont(mono);
        m_console->setPlaceholderText(
            "// Console vide — lancez une optimisation pour voir les logs.");

        cv->addWidget(m_console);
        vl->addWidget(consoleCard, 1);
    }
}

void LogsPage::appendLog(const QString& text, int type) {
    if (m_compact && text.trimmed().isEmpty()) return;

    QTextCursor cursor = m_console->textCursor();
    cursor.movePosition(QTextCursor::End);

    QTextCharFormat fmt;
    fmt.setForeground(Pal::logColor(type));
    cursor.insertText(text + "\n", fmt);

    if (m_autoScroll) {
        m_console->verticalScrollBar()->setValue(
            m_console->verticalScrollBar()->maximum());
    }
}

void LogsPage::clearLogs() {
    m_console->clear();
}

void LogsPage::onRunningChanged(bool running, const QString& title) {
    m_running  = running;
    m_runTitle = title;
    if (running) {
        m_spinTimer->start();
    } else {
        m_spinTimer->stop();
    }
    updateStatusBar();
}

void LogsPage::updateStatusBar() {
    if (m_running) {
        QString sp = QString::fromUtf8(SPINNER_FRAMES[m_spinFrame]);
        m_statusLbl->setText(
            QString("%1  Operation en cours :  %2").arg(sp, m_runTitle));
        m_statusLbl->setStyleSheet(QString(
            "color: %1; background: transparent; font-size: 12px;")
            .arg(Pal::WARN.name()));
    } else if (!m_console->toPlainText().isEmpty()) {
        m_statusLbl->setText("●  Operation terminee.  Redemarrage recommande.");
        m_statusLbl->setStyleSheet(QString(
            "color: %1; background: transparent; font-size: 12px;")
            .arg(Pal::OK.name()));
    } else {
        m_statusLbl->setText(
            "●  Aucune operation lancee. Utilisez le Dashboard ou les Modules.");
        m_statusLbl->setStyleSheet(QString(
            "color: %1; background: transparent; font-size: 12px;")
            .arg(Pal::DIM.name()));
    }
}
