// ══════════════════════════════════════════════════════
//  BenchmarkPage.cpp
// ══════════════════════════════════════════════════════
#include "BenchmarkPage.h"
#include "Palette.h"

#include <QFrame>
#include <QGridLayout>
#include <QScrollArea>
#include <QSizePolicy>
#include <cmath>

// ── Helper: crée un label stylé ─────────────────────────────────────────
static QLabel* makeLabel(const QString& text, int ptSize,
                          const QColor& color, bool bold = false)
{
    auto* l = new QLabel(text);
    l->setStyleSheet(QString("color: %1; background: transparent; font-size: %2px;%3")
        .arg(color.name()).arg(ptSize).arg(bold ? " font-weight: 700;" : ""));
    return l;
}

// ── Helper: crée une carte de résultat ──────────────────────────────────
static QWidget* makeMetricCard(const BenchmarkMetric& cur,
                                 const BenchmarkResult& base)
{
    auto* card = new QFrame;
    static int s_mId = 0;
    QString mName = QString("mc_%1").arg(++s_mId);
    card->setObjectName(mName);
    card->setStyleSheet(QString(
        "#%1 { background: %2; border: 1px solid %3; border-radius: 10px; }")
        .arg(mName, Pal::CARD.name(), Pal::BORDER.name()));
    auto* h = new QHBoxLayout(card);
    h->setContentsMargins(16, 14, 16, 14);
    h->setSpacing(12);

    // Nom + unité
    auto* left = new QVBoxLayout;
    left->setSpacing(2);
    auto* nameLbl = makeLabel(cur.name, 13, Pal::TEXT, true);
    auto* unitLbl = makeLabel(cur.unit, 11, Pal::DIM);
    left->addWidget(nameLbl);
    left->addWidget(unitLbl);
    h->addLayout(left, 1);

    // Valeur actuelle
    QString valStr = (cur.value < 0) ? "N/A"
                     : QString::number(cur.value, 'f', cur.unit == "MB/s" ? 0 : 1);
    auto* valLbl = makeLabel(valStr, 20, Pal::ACCENT, true);
    h->addWidget(valLbl);

    // Comparaison baseline (si disponible)
    if (base.valid) {
        const BenchmarkMetric* bm = nullptr;
        for (const auto& m : base.metrics) if (m.name == cur.name) { bm = &m; break; }

        if (bm && bm->value > 0) {
            double actualImp = cur.lowerIsBetter
                ? (bm->value - cur.value) / bm->value * 100.0
                : (cur.value - bm->value) / bm->value * 100.0;

            QString impStr = (actualImp >= 0 ? "+" : "") + QString::number(actualImp, 'f', 1) + "%";
            QColor  impCol = actualImp >= 0 ? Pal::OK : Pal::ERR;
            auto* impLbl = makeLabel(impStr, 13, impCol, true);
            impLbl->setMinimumWidth(64);
            impLbl->setAlignment(Qt::AlignRight | Qt::AlignVCenter);
            h->addWidget(impLbl);
        }
    }
    return card;
}

// ── BenchmarkPage ────────────────────────────────────────────────────────
BenchmarkPage::BenchmarkPage(QWidget* parent) : QWidget(parent) {
    m_mgr = new BenchmarkManager(this);
    connect(m_mgr, &BenchmarkManager::progress, this, &BenchmarkPage::onProgress);
    connect(m_mgr, &BenchmarkManager::finished,  this, &BenchmarkPage::onFinished);

    buildUi();

    // Si un baseline existe déjà, afficher un résumé
    if (m_mgr->hasBaseline()) {
        m_statusLbl->setText(QString("Baseline chargé — %1")
            .arg(m_mgr->baseline().timestamp));
        m_benchBtn->setEnabled(true);
    }
}

void BenchmarkPage::buildUi() {
    auto* mainV = new QVBoxLayout(this);
    mainV->setContentsMargins(0, 0, 0, 0);
    mainV->setSpacing(0);

    // ── En-tête ─────────────────────────────────────────────────────────
    auto* header = new QWidget;
    header->setFixedHeight(72);
    auto* headerH = new QHBoxLayout(header);
    headerH->setContentsMargins(0, 0, 0, 16);

    auto* titleBlock = new QVBoxLayout;
    titleBlock->setSpacing(2);
    auto* titleLbl = makeLabel(u8"\u26A1 Benchmark Performances", 18, Pal::TEXT, true);
    auto* subLbl   = makeLabel("Mesure latence scheduler, RAM et ping — comparaison avant/apres tweaks",
                                11, Pal::DIM);
    titleBlock->addWidget(titleLbl);
    titleBlock->addWidget(subLbl);
    headerH->addLayout(titleBlock, 1);
    mainV->addWidget(header);

    // ── Barre de progression ────────────────────────────────────────────
    m_statusLbl = makeLabel("Prêt. Lance le baseline AVANT d'appliquer les tweaks.", 12, Pal::DIM);
    mainV->addWidget(m_statusLbl);
    mainV->addSpacing(8);

    m_progressBar = new QProgressBar;
    m_progressBar->setRange(0, 100);
    m_progressBar->setValue(0);
    m_progressBar->setVisible(false);
    m_progressBar->setFixedHeight(6);
    m_progressBar->setTextVisible(false);
    m_progressBar->setStyleSheet(QString(
        "QProgressBar { background: %1; border: none; border-radius: 3px; }"
        "QProgressBar::chunk { background: %2; border-radius: 3px; }")
        .arg(Pal::CARD2.name(), Pal::ACCENT.name()));
    mainV->addWidget(m_progressBar);
    mainV->addSpacing(16);

    // ── Boutons ─────────────────────────────────────────────────────────
    auto* btnRow = new QHBoxLayout;
    btnRow->setSpacing(10);

    m_baselineBtn = new QPushButton(u8"\u2295 Baseline (avant tweaks)");
    m_baselineBtn->setFixedHeight(40);
    m_baselineBtn->setCursor(Qt::PointingHandCursor);
    m_baselineBtn->setStyleSheet(QString(
        "QPushButton { background: %1; color: %2; border: 1px solid %3;"
        "border-radius: 8px; font-size: 13px; font-weight: 600; padding: 0 18px; }"
        "QPushButton:hover { background: %4; }"
        "QPushButton:disabled { opacity: 0.5; }")
        .arg(Pal::CARD2.name(), Pal::OK.name(), Pal::OK.name(),
             Pal::FRAME.name()));
    connect(m_baselineBtn, &QPushButton::clicked, this, [this]() {
        m_mgr->runBaseline();
    });

    m_benchBtn = new QPushButton(u8"\u26A1 Lancer le benchmark");
    m_benchBtn->setFixedHeight(40);
    m_benchBtn->setCursor(Qt::PointingHandCursor);
    m_benchBtn->setEnabled(false);
    m_benchBtn->setStyleSheet(QString(
        "QPushButton { background: %1; color: %2; border: none;"
        "border-radius: 8px; font-size: 13px; font-weight: 700; padding: 0 18px; }"
        "QPushButton:hover { background: %3; }"
        "QPushButton:disabled { background: %4; color: %5; }")
        .arg(Pal::ACCENT.name(), "#000000", Pal::ACCENT_H.name(),
             Pal::CARD2.name(), Pal::DIM.name()));
    connect(m_benchBtn, &QPushButton::clicked, this, [this]() {
        m_mgr->runBenchmark();
    });

    btnRow->addWidget(m_baselineBtn);
    btnRow->addWidget(m_benchBtn);
    btnRow->addStretch();
    mainV->addLayout(btnRow);
    mainV->addSpacing(16);

    // ── Info ────────────────────────────────────────────────────────────
    auto* infoCard = new QFrame;
    infoCard->setObjectName("bInfoCard");
    infoCard->setStyleSheet(
        "#bInfoCard { background: rgba(0,140,210,0.07); border: 1px solid rgba(0,209,255,0.18);"
        "border-radius: 8px; }");
    auto* infoH = new QHBoxLayout(infoCard);
    infoH->setContentsMargins(12, 10, 12, 10);
    infoH->addWidget(makeLabel(u8"\u24d8", 16, Pal::ACCENT));
    infoH->addSpacing(8);
    infoH->addWidget(makeLabel(
        "Lance le Baseline AVANT les tweaks, puis le Benchmark APRES. "
        "L'amelioration en % s'affiche automatiquement.",
        11, Pal::SOFT), 1);
    mainV->addWidget(infoCard);
    mainV->addSpacing(20);

    // ── Zone résultats (scrollable) ──────────────────────────────────────
    auto* scroll = new QScrollArea;
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    scroll->setStyleSheet("background: transparent; border: none;");

    m_resultsArea = new QWidget;
    m_resultsArea->setStyleSheet("background: transparent;");
    m_resultsLayout = new QVBoxLayout(m_resultsArea);
    m_resultsLayout->setContentsMargins(0, 0, 0, 0);
    m_resultsLayout->setSpacing(10);
    m_resultsLayout->addStretch();

    scroll->setWidget(m_resultsArea);
    mainV->addWidget(scroll, 1);
}

void BenchmarkPage::onProgress(int pct, const QString& step) {
    m_progressBar->setVisible(true);
    m_progressBar->setValue(pct);
    m_statusLbl->setText(step);
}

void BenchmarkPage::onFinished(BenchmarkResult result) {
    setRunning(false);
    m_progressBar->setVisible(false);

    if (result.isBaseline) {
        m_statusLbl->setText(QString("Baseline enregistré — %1  |  Lance maintenant le benchmark apres tes tweaks.")
            .arg(result.timestamp));
        m_benchBtn->setEnabled(true);
    } else {
        m_statusLbl->setText(QString("Benchmark terminé — %1").arg(result.timestamp));
    }

    // Rebuild result cards
    buildResultCards(result);
}

void BenchmarkPage::onError(const QString& msg) {
    setRunning(false);
    m_statusLbl->setText(QString("Erreur : %1").arg(msg));
    m_statusLbl->setStyleSheet(QString("color: %1; background: transparent;").arg(Pal::ERR.name()));
}

void BenchmarkPage::buildResultCards(const BenchmarkResult& current) {
    // Clear existing cards (keep stretch at end)
    while (m_resultsLayout->count() > 1) {
        QLayoutItem* item = m_resultsLayout->takeAt(0);
        if (item->widget()) item->widget()->deleteLater();
        delete item;
    }

    // Section header
    QString sectionTitle = current.isBaseline
        ? "Mesures Baseline (avant tweaks)"
        : "Mesures Post-Tweaks";
    auto* sectLbl = makeLabel(sectionTitle, 13, Pal::DIM);
    m_resultsLayout->insertWidget(m_resultsLayout->count() - 1, sectLbl);

    // One card per metric
    for (const auto& metric : current.metrics) {
        QWidget* card = makeMetricCard(metric, m_mgr->baseline());
        m_resultsLayout->insertWidget(m_resultsLayout->count() - 1, card);
    }

    // Score global si comparaison
    if (!current.isBaseline && m_mgr->hasBaseline()) {
        auto* sepLine = new QFrame;
        sepLine->setFrameShape(QFrame::NoFrame);
        sepLine->setStyleSheet(QString("background: %1; border: none;").arg(Pal::BORDER.name()));
        m_resultsLayout->insertWidget(m_resultsLayout->count() - 1, sepLine);

        // Calcul score moyen
        double totalImp = 0.0;
        int    count    = 0;
        for (const auto& m : current.metrics) {
            const BenchmarkMetric* bm = nullptr;
            for (const auto& bBase : m_mgr->baseline().metrics)
                if (bBase.name == m.name) { bm = &bBase; break; }
            if (bm && bm->value > 0 && m.value > 0) {
                double imp = m.lowerIsBetter
                    ? (bm->value - m.value) / bm->value * 100.0
                    : (m.value - bm->value) / bm->value * 100.0;
                totalImp += imp;
                ++count;
            }
        }

        if (count > 0) {
            double avg = totalImp / count;
            QString scoreStr = QString("Score global : %1%2%")
                .arg(avg >= 0 ? "+" : "").arg(avg, 0, 'f', 1);
            QColor  scoreCol = avg >= 0 ? Pal::OK : Pal::ERR;

            auto* scoreCard = new QFrame;
            scoreCard->setObjectName("scoreCard");
            scoreCard->setStyleSheet(QString(
                "#scoreCard { background: %1; border: 2px solid %2; border-radius: 10px; }")
                .arg(avg >= 0 ? "rgba(51,199,107,0.08)" : "rgba(230,66,71,0.08)",
                     scoreCol.name()));
            auto* sh = new QHBoxLayout(scoreCard);
            sh->setContentsMargins(16, 12, 16, 12);
            sh->addWidget(makeLabel(u8"\U0001f3c6 Amelioration moyenne apres tweaks", 13, Pal::TEXT));
            sh->addStretch();
            sh->addWidget(makeLabel(scoreStr, 16, scoreCol, true));
            m_resultsLayout->insertWidget(m_resultsLayout->count() - 1, scoreCard);
        }
    }
}

void BenchmarkPage::setRunning(bool running) {
    m_baselineBtn->setEnabled(!running);
    m_benchBtn->setEnabled(!running && m_mgr->hasBaseline());
}
