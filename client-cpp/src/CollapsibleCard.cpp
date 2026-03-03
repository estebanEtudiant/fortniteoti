// ══════════════════════════════════════════════════════
//  CollapsibleCard.cpp
// ══════════════════════════════════════════════════════
#include "CollapsibleCard.h"
#include "Palette.h"

#include <QHBoxLayout>
#include <QFrame>
#include <QMouseEvent>
#include <QEasingCurve>
#include <cmath>

// ── helpers ───────────────────────────────────────────
static QFrame* makeSep() {
    auto* f = new QFrame;
    f->setFrameShape(QFrame::NoFrame);
    f->setFixedHeight(1);
    f->setStyleSheet(QString("background:%1;border:none;")
        .arg(Pal::BORDER.name()));
    return f;
}

// ═════════════════════════════════════════════════════
//  CollapsibleCard
// ═════════════════════════════════════════════════════
CollapsibleCard::CollapsibleCard(const QString& title,
                                 const QString& desc,
                                 QWidget*       parent)
    : QFrame(parent)
{
    // Unique object name for QSS scoping
    static int s_id = 0;
    QString nm = QString("cc%1").arg(++s_id);
    setObjectName(nm);
    setStyleSheet(QString(
        "#%1{background:%2;border:1px solid %3;border-radius:12px;}")
        .arg(nm, Pal::CARD.name(), Pal::BORDER.name()));

    auto* outer = new QVBoxLayout(this);
    outer->setContentsMargins(0, 0, 0, 0);
    outer->setSpacing(0);

    // ── Header ────────────────────────────────────────
    m_headerW = new QWidget;
    m_headerW->setStyleSheet("background:transparent;");
    m_headerW->setCursor(Qt::PointingHandCursor);
    m_headerW->installEventFilter(this);

    auto* hdrH = new QHBoxLayout(m_headerW);
    hdrH->setContentsMargins(0, 0, 0, 0);
    hdrH->setSpacing(0);

    // Left accent bar
    auto* bar = new QFrame;
    bar->setFixedWidth(3);
    bar->setStyleSheet(QString(
        "background:%1;border:none;"
        "border-top-left-radius:12px;border-bottom-left-radius:0px;")
        .arg(Pal::ACCENT.name()));
    hdrH->addWidget(bar);

    // Title + description
    auto* tv = new QVBoxLayout;
    tv->setSpacing(3);
    tv->setContentsMargins(16, 12, 8, 12);

    auto* tl = new QLabel(title);
    tl->setStyleSheet(QString(
        "color:%1;font-size:13px;font-weight:700;letter-spacing:0.5px;"
        "background:transparent;")
        .arg(Pal::TEXT.name()));
    tv->addWidget(tl);

    if (!desc.isEmpty()) {
        auto* dl = new QLabel(desc);
        dl->setWordWrap(true);
        dl->setStyleSheet(QString(
            "color:%1;font-size:11px;background:transparent;line-height:150%;")
            .arg(Pal::DIM.name()));
        tv->addWidget(dl);
    }
    hdrH->addLayout(tv, 1);

    // Toggle switch (enable/disable macro)
    m_toggle = new ToggleSwitch;
    auto* tgW = new QWidget; tgW->setStyleSheet("background:transparent;");
    auto* tgL = new QHBoxLayout(tgW);
    tgL->setContentsMargins(0, 0, 10, 0);
    tgL->addWidget(m_toggle);
    hdrH->addWidget(tgW);

    // Arrow chevron (collapsed / expanded indicator)
    m_arrow = new QLabel(" \u25b8 ");
    m_arrow->setStyleSheet(QString(
        "color:%1;font-size:13px;background:transparent;padding-right:8px;")
        .arg(Pal::DIM.name()));
    hdrH->addWidget(m_arrow);

    outer->addWidget(m_headerW);

    // ── Animated body wrapper ─────────────────────────
    m_bodyWrap = new QWidget;
    m_bodyWrap->setStyleSheet("background:transparent;");
    m_bodyWrap->setMaximumHeight(0);    // start collapsed
    m_bodyWrap->setMinimumHeight(0);

    auto* bodyV = new QVBoxLayout(m_bodyWrap);
    bodyV->setContentsMargins(0, 0, 0, 0);
    bodyV->setSpacing(0);

    // Separator between header and content
    bodyV->addWidget(makeSep());

    // Content area (caller adds controls here)
    auto* contentW = new QWidget;
    contentW->setStyleSheet("background:transparent;");
    m_contentVl = new QVBoxLayout(contentW);
    m_contentVl->setContentsMargins(18, 14, 18, 16);
    m_contentVl->setSpacing(11);
    bodyV->addWidget(contentW);

    outer->addWidget(m_bodyWrap);

    // ── Animation ─────────────────────────────────────
    m_anim = new QPropertyAnimation(this, "bodyH", this);
    m_anim->setDuration(220);
    m_anim->setEasingCurve(QEasingCurve::OutCubic);
}

// ── Q_PROPERTY helpers ────────────────────────────────
int CollapsibleCard::bodyH() const {
    return m_bodyWrap ? m_bodyWrap->maximumHeight() : 0;
}

void CollapsibleCard::setBodyH(int h) {
    if (m_bodyWrap) {
        m_bodyWrap->setMaximumHeight(h);
        m_bodyWrap->updateGeometry();
        updateGeometry();
    }
}

// ── eventFilter — click anywhere on header to toggle ──
bool CollapsibleCard::eventFilter(QObject* obj, QEvent* e)
{
    if (obj == m_headerW && e->type() == QEvent::MouseButtonRelease) {
        auto* me = static_cast<QMouseEvent*>(e);
        // Ignore clicks over the toggle switch area
        if (m_toggle && m_toggle->geometry()
                .adjusted(-4,-4,4,4)
                .contains(m_toggle->mapToParent(m_toggle->mapFromGlobal(
                    me->globalPosition().toPoint())))) {
            return false;
        }
        setExpanded(!m_expanded);
        return true;
    }
    return QFrame::eventFilter(obj, e);
}

// ── setExpanded ───────────────────────────────────────
void CollapsibleCard::setExpanded(bool expand, bool animate)
{
    if (expand == m_expanded) return;
    m_expanded = expand;
    m_arrow->setText(expand ? " \u25be " : " \u25b8 ");

    if (expand) {
        // Measure natural height from layout on first expand
        if (m_naturalH <= 0) {
            auto* ly = m_bodyWrap->layout();
            if (ly) {
                auto mg = m_bodyWrap->contentsMargins();
                m_naturalH = ly->sizeHint().height()
                           + mg.top() + mg.bottom();
            }
            if (m_naturalH < 20) m_naturalH = 200; // safe fallback
        }

        if (animate) {
            m_anim->stop();
            m_anim->setStartValue(0);
            m_anim->setEndValue(m_naturalH);
            m_anim->start();
        } else {
            m_bodyWrap->setMaximumHeight(m_naturalH);
        }
    } else {
        int from = (m_naturalH > 0) ? m_naturalH : m_bodyWrap->maximumHeight();
        if (animate) {
            m_anim->stop();
            m_anim->setStartValue(from);
            m_anim->setEndValue(0);
            m_anim->start();
        } else {
            m_bodyWrap->setMaximumHeight(0);
        }
    }
}
