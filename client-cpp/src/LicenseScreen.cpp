// ══════════════════════════════════════════════════════
//  LicenseScreen.cpp — Clean minimal activation screen
// ══════════════════════════════════════════════════════
#include "LicenseScreen.h"
#include "AppController.h"
#include "Palette.h"
#include "GlowButton.h"

#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGridLayout>
#include <QPainter>
#include <QPen>
#include <QKeyEvent>
#include <QStackedWidget>

// ── Arc spinner widget ────────────────────────────────────────────────────────
// No Q_OBJECT needed — no own signals, lambda connect works with plain QWidget
class ArcSpinner : public QWidget {
public:
    explicit ArcSpinner(QWidget* parent = nullptr) : QWidget(parent) {
        setFixedHeight(40);
        m_timer = new QTimer(this);
        m_timer->setInterval(28);
        connect(m_timer, &QTimer::timeout, this, [this]() {
            m_angle = (m_angle + 10) % 360;
            update();
        });
    }
    void start() { m_angle = 0; m_timer->start(); }
    void stop()  { m_timer->stop(); }
protected:
    void paintEvent(QPaintEvent*) override {
        QPainter p(this);
        p.setRenderHint(QPainter::Antialiasing);
        const int d = 24;
        QRectF r((width() - d) / 2.0, (height() - d) / 2.0, d, d);
        // Dim track ring
        p.setPen(QPen(QColor(255, 255, 255, 25), 2.5, Qt::SolidLine, Qt::RoundCap));
        p.setBrush(Qt::NoBrush);
        p.drawEllipse(r);
        // Spinning cyan arc
        p.setPen(QPen(Pal::ACCENT, 2.5, Qt::SolidLine, Qt::RoundCap));
        p.drawArc(r, (-m_angle + 90) * 16, -100 * 16);
    }
private:
    QTimer* m_timer = nullptr;
    int     m_angle = 0;
};

LicenseScreen::LicenseScreen(AppController* ctrl, QWidget* parent)
    : QWidget(parent), m_ctrl(ctrl)
{
    setAutoFillBackground(false);
    buildUi();
}

void LicenseScreen::buildUi() {
    // ── Card ──────────────────────────────────────────
    m_card = new QFrame(this);
    m_card->setObjectName("licCard");
    m_card->setFixedWidth(440);
    m_card->setStyleSheet(QString(
        "#licCard {"
        "  background: %1;"
        "  border: 1px solid %2;"
        "  border-radius: 10px;"
        "}")
        .arg(Pal::CARD.name(), Pal::BORDER.name()));

    auto* vl = new QVBoxLayout(m_card);
    vl->setContentsMargins(28, 28, 28, 24);
    vl->setSpacing(0);

    // ── App name ──────────────────────────────────────
    auto* titleLbl = new QLabel("404 Tweaks");
    titleLbl->setAlignment(Qt::AlignLeft);
    QFont tf("Segoe UI", 20, QFont::DemiBold);
    titleLbl->setFont(tf);
    titleLbl->setStyleSheet(QString("color: %1; background: transparent;")
        .arg(Pal::TEXT.name()));
    vl->addWidget(titleLbl);

    auto* subLbl = new QLabel("Entrez votre cle de licence pour continuer.");
    subLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
        .arg(Pal::DIM.name()));
    vl->addWidget(subLbl);
    vl->addSpacing(20);

    // ── Separator ─────────────────────────────────────
    auto* sep = new QFrame;
    sep->setFrameShape(QFrame::NoFrame);
    sep->setFixedHeight(1);
    sep->setStyleSheet(QString("background: %1; border: none;").arg(Pal::BORDER.name()));
    vl->addWidget(sep);
    vl->addSpacing(18);

    // ── Machine info box ──────────────────────────────
    auto* infoBox = new QFrame;
    infoBox->setObjectName("licInfoBox");
    infoBox->setFixedHeight(54);
    infoBox->setStyleSheet(QString(
        "#licInfoBox { background: %1; border: 1px solid %2; border-radius: 6px; }")
        .arg(Pal::FRAME.name(), Pal::BORDER.name()));
    auto* infoGrid = new QGridLayout(infoBox);
    infoGrid->setContentsMargins(14, 8, 14, 8);
    infoGrid->setHorizontalSpacing(12);
    infoGrid->setVerticalSpacing(2);

    auto makeDim = [](const QString& t) {
        auto* l = new QLabel(t);
        l->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;")
            .arg(Pal::DIM.name()));
        return l;
    };
    auto makeVal = [](const QString& t) {
        auto* l = new QLabel(t);
        l->setStyleSheet(QString("color: %1; background: transparent; font-size: 11px;")
            .arg(Pal::SOFT.name()));
        return l;
    };

    m_hwidLabel = makeVal("—");
    m_osLabel   = makeVal("—");

    infoGrid->addWidget(makeDim("HWID"), 0, 0);
    infoGrid->addWidget(m_hwidLabel,     0, 1);
    infoGrid->addWidget(makeDim("OS"),   1, 0);
    infoGrid->addWidget(m_osLabel,       1, 1);
    infoGrid->setColumnStretch(1, 1);
    vl->addWidget(infoBox);
    vl->addSpacing(16);

    // ── Key label ─────────────────────────────────────
    auto* keyLbl = new QLabel("Cle de licence");
    keyLbl->setStyleSheet(QString("color: %1; background: transparent; font-size: 12px;")
        .arg(Pal::SOFT.name()));
    vl->addWidget(keyLbl);
    vl->addSpacing(6);

    // ── Key input ─────────────────────────────────────
    m_keyInput = new QLineEdit;
    m_keyInput->setPlaceholderText("XXXXX-XXXXX-XXXXX-XXXXX-XXXXX");
    m_keyInput->setFixedHeight(40);
    m_keyInput->setMaxLength(31);
    m_keyInput->setStyleSheet(QString(
        "QLineEdit {"
        "  background: %1; color: %2;"
        "  border: 1px solid %3; border-radius: 7px;"
        "  padding: 0 12px; font-size: 13px; letter-spacing: 1px; font-family: 'Consolas';"
        "}"
        "QLineEdit:focus { border-color: %4; }")
        .arg(Pal::FRAME.name(), Pal::TEXT.name(),
             Pal::BORDER.name(), Pal::ACCENT.name()));
    connect(m_keyInput, &QLineEdit::returnPressed, this, &LicenseScreen::onActivateClicked);
    vl->addWidget(m_keyInput);
    vl->addSpacing(14);

    // ── Activate button / spinner stack ───────────────
    auto* btn = new GlowButton("Activer", GlowButton::Style::Primary);
    btn->setFixedHeight(40);
    QFont bf = btn->font();
    bf.setPointSize(12);
    btn->setFont(bf);
    m_activateBtn = btn;
    connect(m_activateBtn, &QPushButton::clicked, this, &LicenseScreen::onActivateClicked);

    // Spinner row: centered arc + label
    auto* spinRow   = new QWidget;
    spinRow->setFixedHeight(40);
    spinRow->setStyleSheet("background:transparent;");
    auto* spinH     = new QHBoxLayout(spinRow);
    spinH->setContentsMargins(0, 0, 0, 0);
    spinH->setSpacing(10);
    spinH->addStretch();
    auto* arc = new ArcSpinner(spinRow);
    arc->setFixedWidth(40);
    spinH->addWidget(arc);
    auto* spinLbl = new QLabel(u8"V\u00e9rification en cours...");
    spinLbl->setStyleSheet(QString("color:%1;background:transparent;font-size:12px;")
        .arg(Pal::DIM.name()));
    spinH->addWidget(spinLbl);
    spinH->addStretch();

    m_arc = arc;   // stored as QWidget*, static_cast<ArcSpinner*> in onChecking

    m_btnStack = new QStackedWidget;
    m_btnStack->setFixedHeight(40);
    m_btnStack->addWidget(m_activateBtn);   // 0 — button
    m_btnStack->addWidget(spinRow);         // 1 — spinner

    vl->addWidget(m_btnStack);
    vl->addSpacing(10);

    // ── Status label ──────────────────────────────────
    m_statusLbl = new QLabel;
    m_statusLbl->setAlignment(Qt::AlignCenter);
    m_statusLbl->setWordWrap(true);
    m_statusLbl->setStyleSheet("color: transparent; background: transparent; font-size: 12px;");
    m_statusLbl->setFixedHeight(18);
    vl->addWidget(m_statusLbl);

    // ── Centering ─────────────────────────────────────
    auto* outerV = new QVBoxLayout(this);
    outerV->addStretch();
    auto* outerH = new QHBoxLayout;
    outerH->addStretch();
    outerH->addWidget(m_card);
    outerH->addStretch();
    outerV->addLayout(outerH);
    outerV->addStretch();

    // Fill machine info
    if (m_ctrl) {
        QString h = m_ctrl->hwid();
        if (h.size() >= 16) h = h.left(8) + "..." + h.right(8);
        m_hwidLabel->setText(h);
        m_osLabel->setText(m_ctrl->osVersion());
    }
}

void LicenseScreen::paintEvent(QPaintEvent* e) {
    QWidget::paintEvent(e);
    // Clean flat background — no glow effects
    QPainter p(this);
    p.fillRect(rect(), Pal::BG);
}

void LicenseScreen::onActivateClicked() {
    if (m_busy) return;
    QString key = m_keyInput->text().trimmed().toUpper();
    if (key.isEmpty()) return;
    emit activateRequested(key);
}

void LicenseScreen::onChecking(bool busy) {
    m_busy = busy;
    m_keyInput->setEnabled(!busy);
    auto* arc = static_cast<ArcSpinner*>(m_arc);
    if (busy) {
        m_btnStack->setCurrentIndex(1);
        if (arc) arc->start();
    } else {
        if (arc) arc->stop();
        m_btnStack->setCurrentIndex(0);
    }
}

void LicenseScreen::onStatus(const QString& msg, int type) {
    static const QString COLORS[] = {
        "#A1A1AA", "#22C55E", "#EF4444", "#F59E0B", "#00D1FF", "#7C3AED"
    };
    int t = (type >= 0 && type < 6) ? type : 0;
    m_statusLbl->setText(msg);
    m_statusLbl->setStyleSheet(QString(
        "color: %1; background: transparent; font-size: 12px;").arg(COLORS[t]));
}

