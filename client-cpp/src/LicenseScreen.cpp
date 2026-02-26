// ══════════════════════════════════════════════════════
//  LicenseScreen.cpp
// ══════════════════════════════════════════════════════
#include "LicenseScreen.h"
#include "AppController.h"
#include "Palette.h"
#include "GlassCard.h"
#include "GlowButton.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGridLayout>
#include <QPainter>
#include <QLinearGradient>
#include <QRadialGradient>
#include <QGraphicsDropShadowEffect>
#include <QGraphicsOpacityEffect>
#include <QPropertyAnimation>
#include <QKeyEvent>

// ── Spinner frames ────────────────────────────────────
static const char* SPINNER_FRAMES[] = {
    "  ●○○  ", "  ○●○  ", "  ○○●  ", "  ○●○  "
};

LicenseScreen::LicenseScreen(AppController* ctrl, QWidget* parent)
    : QWidget(parent), m_ctrl(ctrl)
{
    setAutoFillBackground(false);
    buildUi();

    m_spinner = new QTimer(this);
    m_spinner->setInterval(220);
    connect(m_spinner, &QTimer::timeout, this, &LicenseScreen::onSpinnerTick);

    // Card entrance animation (fade in)
    auto* fx = new QGraphicsOpacityEffect(m_card);
    m_card->setGraphicsEffect(fx);
    fx->setOpacity(0.0);

    auto* anim = new QPropertyAnimation(fx, "opacity", this);
    anim->setDuration(500);
    anim->setStartValue(0.0);
    anim->setEndValue(1.0);
    anim->setEasingCurve(QEasingCurve::OutCubic);
    connect(anim, &QPropertyAnimation::finished, m_card, [this]() {
        // Replace opacity effect with drop shadow once visible
        auto* shadow = new QGraphicsDropShadowEffect;
        shadow->setBlurRadius(50);
        shadow->setColor(QColor(0, 200, 255, 40));
        shadow->setOffset(0, 10);
        m_card->setGraphicsEffect(shadow);
    });
    anim->start(QAbstractAnimation::DeleteWhenStopped);
}

void LicenseScreen::buildUi() {
    // ── Card (GlassCard with cyan accent) ─────────────
    auto* glassCard = new GlassCard(this, 12, Pal::ACCENT);
    glassCard->setFixedWidth(500);
    m_card = glassCard;
    // (Drop shadow applied after entrance animation finishes)

    // ── Card layout ───────────────────────────────────
    auto* vl = new QVBoxLayout(m_card);
    vl->setContentsMargins(28, 24, 28, 24);
    vl->setSpacing(0);

    // Title
    auto* titleLbl = new QLabel("404 Tweaks");
    titleLbl->setAlignment(Qt::AlignCenter);
    QFont tf("Segoe UI", 24, QFont::Bold);
    titleLbl->setFont(tf);
    titleLbl->setStyleSheet(QString("color: %1; background: transparent;").arg(Pal::ACCENT.name()));
    vl->addWidget(titleLbl);
    vl->addSpacing(10);

    // Separator
    auto* sep = new QFrame; sep->setFrameShape(QFrame::HLine);
    sep->setStyleSheet(QString("background: %1;").arg(Pal::BORDER.name()));
    sep->setFixedHeight(1);
    vl->addWidget(sep);
    vl->addSpacing(12);

    // Machine info box
    auto* infoBox = new QFrame;
    infoBox->setFixedHeight(52);
    infoBox->setStyleSheet(QString(
        "QFrame { background: %1; border-radius: 6px; border: 1px solid %2; }")
        .arg(Pal::CARD2.name(), Pal::BORDER.name()));
    auto* infoGrid = new QGridLayout(infoBox);
    infoGrid->setContentsMargins(12, 8, 12, 8);
    infoGrid->setSpacing(2);

    auto makeDim = [](const QString& t) {
        auto* l = new QLabel(t);
        l->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
            .arg(Pal::DIM.name()));
        return l;
    };
    auto makeSoft = [](const QString& t) {
        auto* l = new QLabel(t);
        l->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
            .arg(Pal::SOFT.name()));
        return l;
    };

    m_hwidLabel = makeSoft("—");
    m_osLabel   = makeSoft("—");

    infoGrid->addWidget(makeDim("HWID"), 0, 0);
    infoGrid->addWidget(m_hwidLabel,     0, 1);
    infoGrid->addWidget(makeDim("OS"),   1, 0);
    infoGrid->addWidget(m_osLabel,       1, 1);
    infoGrid->setColumnStretch(1, 1);
    vl->addWidget(infoBox);
    vl->addSpacing(10);

    // License key label
    auto* keyLbl = new QLabel("Cle de licence");
    keyLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 13px;")
        .arg(Pal::TEXT.name()));
    vl->addWidget(keyLbl);
    vl->addSpacing(4);

    // Key input
    m_keyInput = new QLineEdit;
    m_keyInput->setPlaceholderText("XXXXX-XXXXX-XXXXX-XXXXX-XXXXX");
    m_keyInput->setFixedHeight(42);
    m_keyInput->setMaxLength(31);
    m_keyInput->setStyleSheet(QString(
        "QLineEdit {"
        "  background: %1; color: %2;"
        "  border: 1px solid %3; border-radius: 7px;"
        "  padding: 0 12px; font-size: 14px; letter-spacing: 1px;"
        "}"
        "QLineEdit:focus { border-color: %4; }")
        .arg(Pal::FRAME.name(), Pal::TEXT.name(),
             Pal::BORDER.name(), Pal::ACCENT.name()));
    connect(m_keyInput, &QLineEdit::returnPressed, this, &LicenseScreen::onActivateClicked);
    vl->addWidget(m_keyInput);

    auto* fmtLbl = new QLabel("Format : XXXXX-XXXXX-XXXXX-XXXXX-XXXXX");
    fmtLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;")
        .arg(Pal::DIM.name()));
    vl->addWidget(fmtLbl);
    vl->addSpacing(10);

    // Activate button
    auto* activateGlow = new GlowButton("ACTIVER LA LICENCE", GlowButton::Style::Primary);
    activateGlow->setFixedHeight(48);
    QFont af = activateGlow->font();
    af.setPointSize(13);
    activateGlow->setFont(af);
    m_activateBtn = activateGlow;
    connect(m_activateBtn, &QPushButton::clicked, this, &LicenseScreen::onActivateClicked);
    vl->addWidget(m_activateBtn);
    vl->addSpacing(6);

    // Status label
    m_statusLbl = new QLabel;
    m_statusLbl->setAlignment(Qt::AlignCenter);
    m_statusLbl->setWordWrap(true);
    m_statusLbl->setStyleSheet("color: transparent; background: transparent; font-size: 13px;");
    vl->addWidget(m_statusLbl);
    vl->addSpacing(4);

    // ── Outer centering layout ────────────────────────
    auto* outerV = new QVBoxLayout(this);
    outerV->addStretch();
    auto* outerH = new QHBoxLayout;
    outerH->addStretch();
    outerH->addWidget(m_card);
    outerH->addStretch();
    outerV->addLayout(outerH);
    outerV->addStretch();

    // Initialize labels once controller is available
    if (m_ctrl) {
        QString h = m_ctrl->hwid();
        if (h.size() >= 16) h = h.left(8) + "..." + h.right(8);
        m_hwidLabel->setText(h);
        m_osLabel->setText(m_ctrl->osVersion());
    }
}

// ── Background glow ──────────────────────────────────
void LicenseScreen::paintEvent(QPaintEvent* e) {
    QWidget::paintEvent(e);
    QPainter p(this);
    QRadialGradient g1(width(), 0, 340);
    g1.setColorAt(0, QColor(0, 155, 220, 12));
    g1.setColorAt(1, Qt::transparent);
    p.fillRect(rect(), g1);

    QRadialGradient g2(0, height(), 270);
    g2.setColorAt(0, QColor(100, 55, 210, 10));
    g2.setColorAt(1, Qt::transparent);
    p.fillRect(rect(), g2);
}

// ── Slots ─────────────────────────────────────────────
void LicenseScreen::onActivateClicked() {
    if (m_busy) return;
    QString key = m_keyInput->text().trimmed().toUpper();
    if (key.isEmpty()) return;
    emit activateRequested(key);
}

void LicenseScreen::onChecking(bool busy) {
    m_busy = busy;
    m_activateBtn->setEnabled(!busy);
    m_keyInput->setEnabled(!busy);
    if (busy) {
        m_spinner->start();
        updateSpinnerLabel();
    } else {
        m_spinner->stop();
        m_activateBtn->setText("ACTIVER LA LICENCE");
    }
}

void LicenseScreen::onStatus(const QString& msg, int type) {
    static const QString COLORS[] = {
        "#EDF2F7", "#33C76B", "#E64247", "#F7B342", "#00D1FF", "#8F66FF"
    };
    int t = (type >= 0 && type < 6) ? type : 0;
    m_statusLbl->setText(msg);
    m_statusLbl->setStyleSheet(QString(
        "color: %1; background: transparent; font-size: 13px;").arg(COLORS[t]));
}

void LicenseScreen::onSpinnerTick() {
    m_spinFrame = (m_spinFrame + 1) % 4;
    updateSpinnerLabel();
}

void LicenseScreen::updateSpinnerLabel() {
    m_activateBtn->setText(QString::fromUtf8(SPINNER_FRAMES[m_spinFrame]));
}
