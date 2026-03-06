#include "SettingsPage.h"

#include "AppController.h"
#include "GlassCard.h"
#include "GlowButton.h"
#include "I18n.h"
#include "Palette.h"

#include <QCheckBox>
#include <QFont>
#include <QFrame>
#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>
#include <QVBoxLayout>

namespace {
GlassCard* makeSectionCard(const QColor& accent = QColor()) {
    return new GlassCard(nullptr, 10, accent);
}

QLabel* makeH2(const QString& text) {
    auto* label = new QLabel(text);
    QFont font("Segoe UI", 14);
    label->setFont(font);
    label->setStyleSheet(QString("color: %1; background: transparent;").arg(Pal::TEXT.name()));
    return label;
}

QFrame* makeSep() {
    auto* line = new QFrame;
    line->setFrameShape(QFrame::HLine);
    line->setFixedHeight(1);
    line->setStyleSheet(QString("background: %1;").arg(Pal::BORDER.name()));
    return line;
}

GlowButton* makeNavBtn(const QString& text) {
    auto* btn = new GlowButton(text, GlowButton::Style::Primary);
    btn->setFixedHeight(34);
    return btn;
}

GlowButton* makeDangerBtn(const QString& text) {
    auto* btn = new GlowButton(text, GlowButton::Style::Danger);
    btn->setFixedHeight(34);
    return btn;
}

QPushButton* makeLangBtn(const QString& text) {
    auto* btn = new QPushButton(text);
    btn->setCheckable(true);
    btn->setFixedSize(52, 30);
    btn->setCursor(Qt::PointingHandCursor);
    return btn;
}
}

SettingsPage::SettingsPage(AppController* ctrl, QWidget* parent)
    : QWidget(parent), m_ctrl(ctrl) {
    buildUi();

    connect(&I18n::instance(), &I18n::languageChanged, this, [this]() {
        applyTranslations();
    });

    applyTranslations();
}

void SettingsPage::buildUi() {
    auto* rootV = new QVBoxLayout(this);
    rootV->setContentsMargins(0, 0, 0, 0);
    rootV->setSpacing(8);

    m_titleLbl = new QLabel;
    QFont titleFont("Segoe UI", 20, QFont::Bold);
    m_titleLbl->setFont(titleFont);
    m_titleLbl->setStyleSheet(QString("color: %1; background: transparent;").arg(Pal::TEXT.name()));
    rootV->addWidget(m_titleLbl);

    m_subtitleLbl = new QLabel;
    m_subtitleLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;").arg(Pal::DIM.name()));
    rootV->addWidget(m_subtitleLbl);
    rootV->addSpacing(6);

    auto* row = new QHBoxLayout;
    row->setSpacing(10);

    {
        auto* card = makeSectionCard(Pal::ACCENT);
        auto* cv = new QVBoxLayout(card);
        cv->setContentsMargins(16, 16, 16, 16);
        cv->setSpacing(8);

        m_logsSectionLbl = makeH2("");
        cv->addWidget(m_logsSectionLbl);

        m_autoScrollCb = new QCheckBox;
        m_autoScrollCb->setChecked(true);
        m_autoScrollCb->setStyleSheet(QString(
            "QCheckBox { color: %1; background: transparent; font-size: 12px; spacing: 8px; }"
            "QCheckBox::indicator { width: 16px; height: 16px;"
            "  border: 2px solid %2; border-radius: 4px; background: %3; }"
            "QCheckBox::indicator:checked { background: %4; border-color: %4; }")
            .arg(Pal::TEXT.name(), Pal::BORDER.name(), Pal::FRAME.name(), Pal::ACCENT.name()));
        cv->addWidget(m_autoScrollCb);

        m_compactCb = new QCheckBox;
        m_compactCb->setChecked(false);
        m_compactCb->setStyleSheet(m_autoScrollCb->styleSheet());
        cv->addWidget(m_compactCb);

        cv->addSpacing(8);
        cv->addWidget(makeSep());
        cv->addSpacing(8);

        m_navSectionLbl = makeH2("");
        cv->addWidget(m_navSectionLbl);

        m_btnModules = makeNavBtn("");
        m_btnLogs = makeNavBtn("");
        m_btnDashboard = new GlowButton("", GlowButton::Style::Ghost);
        m_btnDashboard->setFixedHeight(34);

        connect(m_btnModules, &QPushButton::clicked, this, [this]() { emit navigateTo(1); });
        connect(m_btnLogs, &QPushButton::clicked, this, [this]() { emit navigateTo(2); });
        connect(m_btnDashboard, &QPushButton::clicked, this, [this]() { emit navigateTo(0); });

        cv->addWidget(m_btnModules);
        cv->addWidget(m_btnLogs);
        cv->addWidget(m_btnDashboard);

        cv->addSpacing(8);
        cv->addWidget(makeSep());
        cv->addSpacing(8);

        m_languageSectionLbl = makeH2("");
        cv->addWidget(m_languageSectionLbl);

        m_languageSubLbl = new QLabel;
        m_languageSubLbl->setWordWrap(true);
        m_languageSubLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;").arg(Pal::DIM.name()));
        cv->addWidget(m_languageSubLbl);

        auto* langRow = new QHBoxLayout;
        langRow->setSpacing(8);

        m_langFrBtn = makeLangBtn("FR");
        m_langEnBtn = makeLangBtn("EN");

        connect(m_langFrBtn, &QPushButton::clicked, this, []() {
            I18n::instance().setLanguage(I18n::Language::FR);
        });
        connect(m_langEnBtn, &QPushButton::clicked, this, []() {
            I18n::instance().setLanguage(I18n::Language::EN);
        });

        langRow->addWidget(m_langFrBtn);
        langRow->addWidget(m_langEnBtn);
        langRow->addStretch();
        cv->addLayout(langRow);

        cv->addSpacing(8);

        m_btnClearLogs = makeDangerBtn("");
        connect(m_btnClearLogs, &QPushButton::clicked, m_ctrl, &AppController::clearLogs);
        cv->addWidget(m_btnClearLogs);
        cv->addStretch();

        row->addWidget(card, 1);
    }

    {
        auto* card = makeSectionCard(Pal::VIOLET);
        auto* cv = new QVBoxLayout(card);
        cv->setContentsMargins(16, 16, 16, 16);
        cv->setSpacing(6);

        m_licenseSectionLbl = makeH2("");
        cv->addWidget(m_licenseSectionLbl);

        auto addRow = [&](QLabel*& keyLbl, QLabel*& valLbl, const QString& color) {
            auto* r = new QHBoxLayout;
            keyLbl = new QLabel;
            keyLbl->setFixedWidth(100);
            keyLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;").arg(Pal::DIM.name()));

            valLbl = new QLabel("-");
            valLbl->setWordWrap(true);
            valLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;").arg(color));

            r->addWidget(keyLbl);
            r->addWidget(valLbl, 1);
            cv->addLayout(r);
        };

        addRow(m_planKeyLbl, m_planLbl, Pal::ACCENT.name());
        addRow(m_expKeyLbl, m_expLbl, Pal::WARN.name());
        addRow(m_hwidKeyLbl, m_hwidLbl, Pal::SOFT.name());
        addRow(m_osKeyLbl, m_osLbl, Pal::TEXT.name());

        m_osLbl->setText(m_ctrl->osVersion());
        QString hwid = m_ctrl->hwid();
        if (hwid.size() >= 16) hwid = hwid.left(8) + "..." + hwid.right(8);
        m_hwidLbl->setText(hwid);

        cv->addSpacing(12);
        cv->addWidget(makeSep());
        cv->addSpacing(8);

        m_aboutSectionLbl = makeH2("");
        cv->addWidget(m_aboutSectionLbl);

        auto makeInfo = [&](QLabel*& label) {
            label = new QLabel;
            label->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;").arg(Pal::DIM.name()));
            cv->addWidget(label);
        };

        makeInfo(m_aboutNameLbl);
        makeInfo(m_aboutVersionLbl);
        makeInfo(m_aboutTweaksLbl);
        makeInfo(m_aboutModulesLbl);

        cv->addSpacing(12);

        auto* warnCard = new QFrame;
        warnCard->setStyleSheet(
            "QFrame { background: rgba(247,179,66,15); border: 1px solid rgba(247,179,66,60); border-radius: 6px; }");
        auto* wv = new QVBoxLayout(warnCard);
        wv->setContentsMargins(12, 8, 12, 8);

        m_warningLbl = new QLabel;
        m_warningLbl->setWordWrap(true);
        m_warningLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;").arg(Pal::WARN.name()));
        wv->addWidget(m_warningLbl);

        cv->addWidget(warnCard);
        cv->addStretch();

        row->addWidget(card, 1);
    }

    rootV->addLayout(row);
    rootV->addStretch();
}

void SettingsPage::onLicenseActivated(const QString& plan, const QString& expiresAt) {
    if (m_planLbl) m_planLbl->setText(plan.isEmpty() ? "PRO" : plan);
    if (!m_expLbl) return;

    if (expiresAt.isEmpty()) {
        m_expLbl->setText(I18n::instance().text("settings.expiration.lifetime"));
        m_expLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;").arg(Pal::OK.name()));
    } else {
        m_expLbl->setText(expiresAt);
        m_expLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;").arg(Pal::WARN.name()));
    }
}

void SettingsPage::applyTranslations() {
    const auto& i18n = I18n::instance();

    if (m_titleLbl) m_titleLbl->setText(i18n.text("settings.title"));
    if (m_subtitleLbl) m_subtitleLbl->setText(i18n.text("settings.subtitle"));

    if (m_logsSectionLbl) m_logsSectionLbl->setText(i18n.text("settings.section.logs"));
    if (m_autoScrollCb) m_autoScrollCb->setText(i18n.text("settings.logs.auto_scroll"));
    if (m_compactCb) m_compactCb->setText(i18n.text("settings.logs.compact"));

    if (m_navSectionLbl) m_navSectionLbl->setText(i18n.text("settings.section.quick_nav"));
    if (m_btnModules) m_btnModules->setText(i18n.text("settings.nav.modules"));
    if (m_btnLogs) m_btnLogs->setText(i18n.text("settings.nav.logs"));
    if (m_btnDashboard) m_btnDashboard->setText(i18n.text("settings.nav.dashboard"));
    if (m_btnClearLogs) m_btnClearLogs->setText(i18n.text("settings.action.clear_logs"));

    if (m_languageSectionLbl) m_languageSectionLbl->setText(i18n.text("settings.section.language"));
    if (m_languageSubLbl) m_languageSubLbl->setText(i18n.text("settings.language.subtitle"));

    if (m_licenseSectionLbl) m_licenseSectionLbl->setText(i18n.text("settings.section.license"));
    if (m_planKeyLbl) m_planKeyLbl->setText(i18n.text("settings.license.plan"));
    if (m_expKeyLbl) m_expKeyLbl->setText(i18n.text("settings.license.expiration"));
    if (m_hwidKeyLbl) m_hwidKeyLbl->setText(i18n.text("settings.license.hwid"));
    if (m_osKeyLbl) m_osKeyLbl->setText(i18n.text("settings.license.os"));

    if (m_aboutSectionLbl) m_aboutSectionLbl->setText(i18n.text("settings.section.about"));
    if (m_aboutNameLbl) m_aboutNameLbl->setText(i18n.text("settings.about.name"));
    if (m_aboutVersionLbl) m_aboutVersionLbl->setText(i18n.text("settings.about.version"));
    if (m_aboutTweaksLbl) m_aboutTweaksLbl->setText(i18n.text("settings.about.tweaks"));
    if (m_aboutModulesLbl) m_aboutModulesLbl->setText(i18n.text("settings.about.modules"));

    if (m_warningLbl) m_warningLbl->setText(i18n.text("settings.warning"));

    if (m_ctrl) {
        onLicenseActivated(m_ctrl->plan(), m_ctrl->expiresAt());
    }

    updateLanguageButtons();
}

void SettingsPage::updateLanguageButtons() {
    const bool frActive = I18n::instance().language() == I18n::Language::FR;

    if (m_langFrBtn) {
        m_langFrBtn->setChecked(frActive);
        m_langFrBtn->setStyleSheet(QString(
            "QPushButton { border-radius: 6px; border: 1px solid %1; background: %2; color: %3; font-weight: 600; }"
            "QPushButton:hover { border-color: %4; }")
            .arg(frActive ? Pal::ACCENT.name() : Pal::BORDER.name(),
                 frActive ? QString("rgba(0, 209, 255, 0.18)") : Pal::FRAME.name(),
                 frActive ? Pal::TEXT.name() : Pal::DIM.name(),
                 Pal::ACCENT.name()));
    }

    if (m_langEnBtn) {
        m_langEnBtn->setChecked(!frActive);
        m_langEnBtn->setStyleSheet(QString(
            "QPushButton { border-radius: 6px; border: 1px solid %1; background: %2; color: %3; font-weight: 600; }"
            "QPushButton:hover { border-color: %4; }")
            .arg(!frActive ? Pal::ACCENT.name() : Pal::BORDER.name(),
                 !frActive ? QString("rgba(0, 209, 255, 0.18)") : Pal::FRAME.name(),
                 !frActive ? Pal::TEXT.name() : Pal::DIM.name(),
                 Pal::ACCENT.name()));
    }
}
