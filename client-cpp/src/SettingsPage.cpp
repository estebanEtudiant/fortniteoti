// ══════════════════════════════════════════════════════
//  SettingsPage.cpp
// ══════════════════════════════════════════════════════
#include "SettingsPage.h"
#include "AppController.h"
#include "Palette.h"
#include "GlassCard.h"
#include "GlowButton.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFrame>
#include <QLabel>
#include <QCheckBox>
#include <QPushButton>
#include <QFont>
#include <QScrollArea>

static GlassCard* makeSectionCard(const QColor& accent = QColor()) {
    return new GlassCard(nullptr, 10, accent);
}

static QLabel* makeH2(const QString& t) {
    auto* l = new QLabel(t);
    QFont f("Segoe UI", 14);
    l->setFont(f);
    l->setStyleSheet(QString("color: %1; background: transparent;").arg(Pal::TEXT.name()));
    return l;
}

static QFrame* makeSep() {
    auto* f = new QFrame;
    f->setFrameShape(QFrame::HLine);
    f->setFixedHeight(1);
    f->setStyleSheet(QString("background: %1;").arg(Pal::BORDER.name()));
    return f;
}

static GlowButton* makeNavBtn(const QString& text) {
    auto* btn = new GlowButton(text, GlowButton::Style::Primary);
    btn->setFixedHeight(34);
    return btn;
}

static GlowButton* makeDangerBtn(const QString& text) {
    auto* btn = new GlowButton(text, GlowButton::Style::Danger);
    btn->setFixedHeight(34);
    return btn;
}

SettingsPage::SettingsPage(AppController* ctrl, QWidget* parent)
    : QWidget(parent), m_ctrl(ctrl)
{
    buildUi();
}

void SettingsPage::buildUi() {
    auto* rootV = new QVBoxLayout(this);
    rootV->setContentsMargins(0,0,0,0);
    rootV->setSpacing(8);

    // ── Page title ─────────────────────────────────────
    auto* tl = new QLabel("Parametres");
    QFont tf("Segoe UI", 20, QFont::Bold);
    tl->setFont(tf);
    tl->setStyleSheet(QString("color: %1; background: transparent;").arg(Pal::TEXT.name()));
    rootV->addWidget(tl);
    auto* sub = new QLabel("Configuration de l'outil.");
    sub->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;")
        .arg(Pal::DIM.name()));
    rootV->addWidget(sub);
    rootV->addSpacing(6);

    // ── Two-column layout ──────────────────────────────
    auto* row = new QHBoxLayout;
    row->setSpacing(10);

    // ── Left column ────────────────────────────────────
    {
        auto* card = makeSectionCard(Pal::ACCENT);
        auto* cv   = new QVBoxLayout(card);
        cv->setContentsMargins(16,16,16,16);
        cv->setSpacing(8);

        cv->addWidget(makeH2("Affichage des logs"));

        auto* autoScrollCb = new QCheckBox("Auto-scroll (suivre les nouveaux logs)");
        autoScrollCb->setChecked(true);
        autoScrollCb->setStyleSheet(QString(
            "QCheckBox { color: %1; background: transparent; font-size: 12px; spacing: 8px; }"
            "QCheckBox::indicator { width: 16px; height: 16px;"
            "  border: 2px solid %2; border-radius: 4px; background: %3; }"
            "QCheckBox::indicator:checked { background: %4; border-color: %4; }")
            .arg(Pal::TEXT.name(), Pal::BORDER.name(),
                 Pal::FRAME.name(), Pal::ACCENT.name()));
        cv->addWidget(autoScrollCb);

        auto* compactCb = new QCheckBox("Mode compact (masquer les lignes vides)");
        compactCb->setChecked(false);
        compactCb->setStyleSheet(autoScrollCb->styleSheet());
        cv->addWidget(compactCb);

        cv->addSpacing(8);
        cv->addWidget(makeSep());
        cv->addSpacing(8);

        cv->addWidget(makeH2("Navigation rapide"));

        auto* btnMod  = makeNavBtn("Aller aux Modules");
        auto* btnLogs = makeNavBtn("Aller aux Logs");
        auto* btnDash = new GlowButton("Aller au Dashboard", GlowButton::Style::Ghost);
        btnDash->setFixedHeight(34);

        connect(btnMod,  &QPushButton::clicked, this, [this]() { emit navigateTo(1); });
        connect(btnLogs, &QPushButton::clicked, this, [this]() { emit navigateTo(2); });
        connect(btnDash, &QPushButton::clicked, this, [this]() { emit navigateTo(0); });

        cv->addWidget(btnMod);
        cv->addWidget(btnLogs);
        cv->addWidget(btnDash);
        cv->addSpacing(8);

        auto* clrBtn = makeDangerBtn("Vider les logs");
        connect(clrBtn, &QPushButton::clicked, m_ctrl, &AppController::clearLogs);
        cv->addWidget(clrBtn);
        cv->addStretch();

        row->addWidget(card, 1);
    }

    // ── Right column ───────────────────────────────────
    {
        auto* card = makeSectionCard(Pal::VIOLET);
        auto* cv   = new QVBoxLayout(card);
        cv->setContentsMargins(16,16,16,16);
        cv->setSpacing(6);

        cv->addWidget(makeH2("Informations de licence"));

        auto addRow = [&](const QString& key, QLabel*& val, const QString& color) {
            auto* r = new QHBoxLayout;
            auto* k = new QLabel(key);
            k->setFixedWidth(100);
            k->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
                .arg(Pal::DIM.name()));
            val = new QLabel("—");
            val->setWordWrap(true);
            val->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
                .arg(color));
            r->addWidget(k);
            r->addWidget(val, 1);
            cv->addLayout(r);
        };

        addRow("Plan",       m_planLbl, Pal::ACCENT.name());
        addRow("Expiration", m_expLbl,  Pal::WARN.name());
        addRow("HWID",       m_hwidLbl, Pal::SOFT.name());
        addRow("OS",         m_osLbl,   Pal::TEXT.name());

        // Initialize static values
        m_osLbl->setText(m_ctrl->osVersion());
        QString h = m_ctrl->hwid();
        if (h.size() >= 16) h = h.left(8) + "..." + h.right(8);
        m_hwidLbl->setText(h);
        m_planLbl->setText(m_ctrl->plan());
        QString exp = m_ctrl->expiresAt();
        if (exp.isEmpty()) {
            m_expLbl->setText("Lifetime");
            m_expLbl->setStyleSheet(QString(
                "color: %1; background: transparent; font-size: 12px;")
                .arg(Pal::OK.name()));
        } else {
            m_expLbl->setText(exp);
        }

        cv->addSpacing(12);
        cv->addWidget(makeSep());
        cv->addSpacing(8);
        cv->addWidget(makeH2("A propos"));

        auto addInfo = [&](const QString& t) {
            auto* l = new QLabel(t);
            l->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
                .arg(Pal::DIM.name()));
            cv->addWidget(l);
        };
        addInfo("404 Tweaks");
        addInfo("Version   2026");
        addInfo("Tweaks    100+ optimisations systeme");
        addInfo("Modules   14 categories");
        cv->addSpacing(12);

        // Warning band
        auto* warnCard = new QFrame;
        warnCard->setStyleSheet(QString(
            "QFrame { background: rgba(247,179,66,15);"
            "  border: 1px solid rgba(247,179,66,60); border-radius: 6px; }"));
        auto* wv = new QVBoxLayout(warnCard);
        wv->setContentsMargins(12, 8, 12, 8);
        auto* warnLbl = new QLabel(
            "Certains tweaks necessitent un redemarrage. "
            "Utilisez Backup & Securite avant toute optimisation.");
        warnLbl->setWordWrap(true);
        warnLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;")
            .arg(Pal::WARN.name()));
        wv->addWidget(warnLbl);
        cv->addWidget(warnCard);
        cv->addStretch();

        row->addWidget(card, 1);
    }

    rootV->addLayout(row);
    rootV->addStretch();
}

void SettingsPage::onLicenseActivated(const QString& plan, const QString& expiresAt) {
    if (m_planLbl) m_planLbl->setText(plan.isEmpty() ? "PRO" : plan);
    if (m_expLbl) {
        if (expiresAt.isEmpty()) {
            m_expLbl->setText("Lifetime");
            m_expLbl->setStyleSheet(QString(
                "color: %1; background: transparent; font-size: 12px;")
                .arg(Pal::OK.name()));
        } else {
            m_expLbl->setText(expiresAt);
        }
    }
}
