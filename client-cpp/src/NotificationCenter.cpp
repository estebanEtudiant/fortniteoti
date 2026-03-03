// ══════════════════════════════════════════════════════
//  NotificationCenter.cpp
// ══════════════════════════════════════════════════════
#include "NotificationCenter.h"
#include "Palette.h"

#include <QPainter>
#include <QPainterPath>
#include <QApplication>
#include <QEvent>
#include <QMouseEvent>
#include <QScrollBar>
#include <QNetworkAccessManager>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QJsonDocument>
#include <QJsonObject>
#include <QHBoxLayout>
#include <QVBoxLayout>
#include <QPushButton>
#include <QScreen>

// ── Helper: relative time string ─────────────────────
static QString relTime(qint64 ts) {
    qint64 sec = (QDateTime::currentMSecsSinceEpoch() - ts) / 1000;
    if (sec < 60)    return "A l'instant";
    if (sec < 3600)  return QString("il y a %1 min").arg(sec / 60);
    if (sec < 86400) return QString("il y a %1 h").arg(sec / 3600);
    return QString("il y a %1 j").arg(sec / 86400);
}

// ── Helper: icon label text by type ──────────────────
static QString typeIcon(AppNotification::Type t) {
    switch (t) {
        case AppNotification::Update:  return QString::fromUtf8("\xE2\xAC\x86");  // ⬆
        case AppNotification::Warning: return QString::fromUtf8("\xE2\x9A\xA0");  // ⚠
        case AppNotification::Error:   return "\xC3\x97";                         // ×
        default:                       return "\xE2\x97\x8F";                     // ●
    }
}

static QColor typeColor(AppNotification::Type t) {
    switch (t) {
        case AppNotification::Update:  return Pal::OK;
        case AppNotification::Warning: return Pal::WARN;
        case AppNotification::Error:   return Pal::ERR;
        default:                       return Pal::ACCENT;
    }
}

// ══════════════════════════════════════════════════════
//  NotifPanel implementation
// ══════════════════════════════════════════════════════

NotifPanel::NotifPanel(QWidget* parent)
    : QWidget(parent, Qt::Tool | Qt::FramelessWindowHint | Qt::NoDropShadowWindowHint)
{
    // WA_TranslucentBackground omitted intentionally — crashes on some Windows configs
    setAttribute(Qt::WA_ShowWithoutActivating);
    setFixedSize(360, 420);

    // Install event filter on application to detect outside clicks
    qApp->installEventFilter(this);

    // Set solid background via stylesheet so child widgets don't paint through
    setStyleSheet(QString("NotifPanel { background: %1; }").arg(Pal::CARD.name()));

    auto* outer = new QVBoxLayout(this);
    outer->setContentsMargins(0, 0, 0, 0);
    outer->setSpacing(0);

    // ── Header bar ────────────────────────────────────
    auto* header = new QWidget;
    header->setFixedHeight(42);
    header->setStyleSheet(
        QString("background: %1; border-radius: 0;").arg(Pal::CARD2.name()));

    auto* hlay = new QHBoxLayout(header);
    hlay->setContentsMargins(14, 0, 10, 0);
    hlay->setSpacing(0);

    auto* titleLbl = new QLabel("Notifications");
    titleLbl->setStyleSheet(
        QString("color: %1; font-size: 13px; font-weight: 600; background: transparent;")
        .arg(Pal::TEXT.name()));

    auto* markAllBtn = new QPushButton("Tout lire");
    markAllBtn->setFixedSize(64, 24);
    markAllBtn->setStyleSheet(
        QString("QPushButton { background: %1; color: %2; border: 1px solid %3;"
                "  border-radius: 5px; font-size: 11px; }"
                "QPushButton:hover { background: %4; }")
        .arg(Pal::FRAME.name(), Pal::SOFT.name(),
             Pal::BORDER.name(), Pal::CARD.name()));

    connect(markAllBtn, &QPushButton::clicked, this, &NotifPanel::allRead);

    hlay->addWidget(titleLbl);
    hlay->addStretch();
    hlay->addWidget(markAllBtn);

    outer->addWidget(header);

    // ── Scrollable list area ──────────────────────────
    m_scroll = new QScrollArea;
    m_scroll->setWidgetResizable(true);
    m_scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    m_scroll->setStyleSheet(
        QString("QScrollArea { background: %1; border: none; }"
                "QScrollBar:vertical { background: transparent; width: 4px; }"
                "QScrollBar::handle:vertical { background: %2; border-radius: 2px; }"
                "QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }")
        .arg(Pal::CARD.name(), Pal::BORDER.name()));

    m_content = new QWidget;
    m_content->setStyleSheet(
        QString("background: %1;").arg(Pal::CARD.name()));
    m_scroll->setWidget(m_content);

    // Empty state label
    m_emptyLbl = new QLabel("Aucune notification");
    m_emptyLbl->setAlignment(Qt::AlignCenter);
    m_emptyLbl->setStyleSheet(
        QString("color: %1; font-size: 12px; background: transparent;")
        .arg(Pal::DIM.name()));

    outer->addWidget(m_scroll, 1);
}

void NotifPanel::rebuildList(const QVector<AppNotification>& notifs) {
    // Remove old layout + child widgets, but NEVER delete m_emptyLbl
    if (m_content->layout()) {
        QLayoutItem* item;
        while ((item = m_content->layout()->takeAt(0)) != nullptr) {
            QWidget* w = item->widget();
            if (w && w != m_emptyLbl) delete w;
            delete item;
        }
        delete m_content->layout();
    }

    auto* listV = new QVBoxLayout(m_content);
    listV->setContentsMargins(0, 0, 0, 0);
    listV->setSpacing(0);

    if (notifs.isEmpty()) {
        m_emptyLbl->setParent(m_content);
        listV->addStretch();
        listV->addWidget(m_emptyLbl);
        listV->addStretch();
        m_emptyLbl->show();
        return;
    }

    m_emptyLbl->hide();

    // Newest first
    QVector<AppNotification> sorted = notifs;
    std::sort(sorted.begin(), sorted.end(), [](const AppNotification& a, const AppNotification& b) {
        return a.timestamp > b.timestamp;
    });

    for (const auto& n : sorted) {
        auto* row = new QWidget;
        row->setFixedHeight(72);

        // unread indicator: slightly brighter background
        QString rowBg = n.read
            ? Pal::CARD.name()
            : Pal::CARD2.name();

        row->setStyleSheet(
            QString("background: %1; border-bottom: 1px solid %2;")
            .arg(rowBg, Pal::BORDER.name()));

        auto* rlay = new QHBoxLayout(row);
        rlay->setContentsMargins(12, 10, 12, 10);
        rlay->setSpacing(10);

        // Icon label
        auto* iconLbl = new QLabel(typeIcon(n.type));
        iconLbl->setFixedSize(22, 22);
        iconLbl->setAlignment(Qt::AlignCenter);
        iconLbl->setStyleSheet(
            QString("color: %1; font-size: 14px; background: transparent;")
            .arg(typeColor(n.type).name()));

        // Text column
        auto* textCol = new QWidget;
        textCol->setStyleSheet("background: transparent;");
        auto* textV = new QVBoxLayout(textCol);
        textV->setContentsMargins(0, 0, 0, 0);
        textV->setSpacing(2);

        auto* titleLbl = new QLabel(n.title);
        titleLbl->setStyleSheet(
            QString("color: %1; font-size: 12px; font-weight: 600; background: transparent;")
            .arg(Pal::TEXT.name()));

        auto* bodyLbl = new QLabel(n.body);
        bodyLbl->setWordWrap(true);
        bodyLbl->setStyleSheet(
            QString("color: %1; font-size: 11px; background: transparent;")
            .arg(Pal::SOFT.name()));

        auto* timeLbl = new QLabel(relTime(n.timestamp));
        timeLbl->setStyleSheet(
            QString("color: %1; font-size: 10px; background: transparent;")
            .arg(Pal::DIM.name()));

        textV->addWidget(titleLbl);
        textV->addWidget(bodyLbl);
        textV->addWidget(timeLbl);

        rlay->addWidget(iconLbl);
        rlay->addWidget(textCol, 1);

        // unread dot on the right
        if (!n.read) {
            auto* dot = new QLabel;
            dot->setFixedSize(7, 7);
            dot->setStyleSheet(
                QString("background: %1; border-radius: 3px;")
                .arg(Pal::ACCENT.name()));
            rlay->addWidget(dot);
        }

        listV->addWidget(row);
    }
    listV->addStretch();
}

void NotifPanel::setNotifications(const QVector<AppNotification>& notifs) {
    rebuildList(notifs);
}

void NotifPanel::showAt(const QPoint& globalPos) {
    // Keep panel within screen bounds
    QScreen* screen = QApplication::primaryScreen();
    QRect sg = screen ? screen->availableGeometry() : QRect(0, 0, 1920, 1080);

    int x = globalPos.x();
    int y = globalPos.y();

    // Shift left if overflows right edge
    if (x + width() > sg.right())
        x = sg.right() - width() - 4;

    // Shift up if overflows bottom edge
    if (y + height() > sg.bottom())
        y = globalPos.y() - height();

    move(x, y);
    show();
    raise();
    // activateWindow() omitted — steals focus on Qt::Popup and can cause crash loop
}

void NotifPanel::hidePanel() {
    hide();
}

void NotifPanel::paintEvent(QPaintEvent*) {
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    // Solid background (no transparency to avoid Windows crashes)
    p.fillRect(rect(), Pal::CARD);

    // Border on all 4 sides
    p.setPen(QPen(Pal::BORDER, 1));
    p.drawRect(rect().adjusted(0, 0, -1, -1));
}

bool NotifPanel::eventFilter(QObject* obj, QEvent* ev) {
    if (isVisible() && ev->type() == QEvent::MouseButtonPress) {
        auto* me = static_cast<QMouseEvent*>(ev);
        // Use globalPos() for compatibility across Qt versions
        QPoint gp = me->globalPosition().toPoint();
        // Only close if click is fully outside this panel
        if (!geometry().contains(gp)) {
            // Use a queued call to avoid closing while the event is still being dispatched
            QMetaObject::invokeMethod(this, &NotifPanel::hidePanel, Qt::QueuedConnection);
        }
    }
    return false; // Never consume the event — just observe
}

// ══════════════════════════════════════════════════════
//  NotificationCenter implementation
// ══════════════════════════════════════════════════════

NotificationCenter::NotificationCenter(QWidget* parent)
    : QWidget(parent)
{
    setFixedSize(36, 36);
    setAttribute(Qt::WA_StyledBackground, false);
    setAttribute(Qt::WA_OpaquePaintEvent, false);

    // Bell button (transparent bg, we paint the badge ourselves)
    m_bell = new QToolButton(this);
    m_bell->setFixedSize(36, 36);
    m_bell->setText(QString::fromUtf8("\xF0\x9F\x94\x94")); // 🔔
    m_bell->setFont(QFont("Segoe UI Emoji", 14));
    m_bell->setCursor(Qt::PointingHandCursor);
    m_bell->setToolTip("Notifications");
    m_bell->setStyleSheet(
        "QToolButton {"
        "  background: transparent;"
        "  border: none;"
        "  color: #A1A1AA;"
        "}"
        "QToolButton:hover {"
        "  background: rgba(255,255,255,12);"
        "  border-radius: 8px;"
        "  color: #F4F4F5;"
        "}");

    connect(m_bell, &QToolButton::clicked, this, &NotificationCenter::onBellClicked);

    // Floating panel (top-level popup)
    m_panel = new NotifPanel(nullptr);
    connect(m_panel, &NotifPanel::allRead, this, &NotificationCenter::markAllRead);

    // Periodic server check timer — 5 minutes
    m_timer = new QTimer(this);
    m_timer->setInterval(5 * 60 * 1000);
    connect(m_timer, &QTimer::timeout, this, &NotificationCenter::onFetchTimer);
}

void NotificationCenter::addNotification(const AppNotification& n) {
    m_notifs.prepend(n);
    m_panel->setNotifications(m_notifs);
    updateBadge();
    emit unreadCountChanged(unreadCount());
}

void NotificationCenter::checkServerStatus(const QString& apiUrl) {
    m_apiUrl = apiUrl;
    // Initial check immediately
    onFetchTimer();
    // Then every 5 minutes
    m_timer->start();
}

int NotificationCenter::unreadCount() const {
    int c = 0;
    for (const auto& n : m_notifs)
        if (!n.read) ++c;
    return c;
}

void NotificationCenter::onBellClicked() {
    if (m_panel->isVisible()) {
        m_panel->hidePanel();
        return;
    }

    // Position panel below and to the left of bell button
    QPoint bellGlobal = m_bell->mapToGlobal(QPoint(0, m_bell->height() + 4));
    // Align panel's right edge with bell's right edge
    bellGlobal.setX(bellGlobal.x() + m_bell->width() - m_panel->width());

    m_panel->setNotifications(m_notifs);
    m_panel->showAt(bellGlobal);

    // Mark all as read after opening
    markAllRead();
}

void NotificationCenter::onFetchTimer() {
    if (m_apiUrl.isEmpty()) return;

    auto* nam = new QNetworkAccessManager(this);
    QNetworkRequest req(QUrl(m_apiUrl + "/health/detailed"));
    req.setRawHeader("Accept", "application/json");
    req.setTransferTimeout(8000);

    QNetworkReply* reply = nam->get(req);

    connect(reply, &QNetworkReply::finished, this, [this, reply, nam]() {
        reply->deleteLater();
        nam->deleteLater();

        bool isUp = false;

        if (reply->error() == QNetworkReply::NoError) {
            QByteArray data = reply->readAll();
            QJsonDocument doc = QJsonDocument::fromJson(data);
            if (!doc.isNull()) {
                // Accept any valid JSON response as "server up"
                isUp = true;
            } else {
                // Got a response but not JSON — still consider up if 2xx
                int code = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
                isUp = (code >= 200 && code < 300);
            }
        } else {
            // Network error or timeout
            isUp = false;
        }

        // Only emit a notification when state changes
        if (isUp && !m_serverWasUp) {
            AppNotification n;
            n.type      = AppNotification::Info;
            n.title     = "Serveur operationnel";
            n.body      = "La connexion au serveur est retablie.";
            n.read      = false;
            n.timestamp = QDateTime::currentMSecsSinceEpoch();
            addNotification(n);
        } else if (!isUp && m_serverWasUp) {
            AppNotification n;
            n.type      = AppNotification::Error;
            n.title     = "Serveur inaccessible";
            n.body      = "Impossible de joindre le serveur. Verifie ta connexion.";
            n.read      = false;
            n.timestamp = QDateTime::currentMSecsSinceEpoch();
            addNotification(n);
        }

        m_serverWasUp = isUp;
    });
}

void NotificationCenter::updateBadge() {
    // Force a repaint so the badge reflects new unread count
    m_bell->update();
    update();
}

void NotificationCenter::markAllRead() {
    for (auto& n : m_notifs)
        n.read = true;
    m_panel->setNotifications(m_notifs);
    updateBadge();
    emit unreadCountChanged(0);
}

void NotificationCenter::paintEvent(QPaintEvent*) {
    int count = unreadCount();
    if (count <= 0) return;

    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);

    // Badge: red circle in top-right of the widget (over bell button)
    QString txt = count > 9 ? "9+" : QString::number(count);

    QFont f("Segoe UI", 7, QFont::Bold);
    p.setFont(f);
    QFontMetrics fm(f);
    int tw = fm.horizontalAdvance(txt);

    int bw = qMax(tw + 6, 14);
    int bh = 14;
    int bx = width()  - bw - 1;
    int by = 1;

    p.setPen(Qt::NoPen);
    p.setBrush(Pal::ERR);
    p.drawRoundedRect(QRect(bx, by, bw, bh), bh / 2, bh / 2);

    p.setPen(Qt::white);
    p.drawText(QRect(bx, by, bw, bh), Qt::AlignCenter, txt);
}
