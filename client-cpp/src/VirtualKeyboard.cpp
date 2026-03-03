// ══════════════════════════════════════════════════════
//  VirtualKeyboard.cpp
// ══════════════════════════════════════════════════════
#include "VirtualKeyboard.h"
#include "Palette.h"

#include <QPainter>
#include <QFontMetrics>
#include <vector>

// ── Key dimensions ────────────────────────────────────
static constexpr int KH   = 26;   // key height (px)
static constexpr int GAP  = 2;    // gap between keys
static constexpr int RGAP = 3;    // gap between rows

// ═════════════════════════════════════════════════════
//  VirtualKeyboard
// ═════════════════════════════════════════════════════
VirtualKeyboard::VirtualKeyboard(QWidget* parent) : QWidget(parent)
{
    setAttribute(Qt::WA_NoSystemBackground);
    setAttribute(Qt::WA_OpaquePaintEvent);
    buildLayout();
}

QSize VirtualKeyboard::sizeHint() const
{
    return QSize(m_totalW, m_totalH);
}

void VirtualKeyboard::setBindings(const QMap<int, BindInfo>& b)
{
    m_binds = b;
    update();
}

// ── buildLayout ───────────────────────────────────────
void VirtualKeyboard::buildLayout()
{
    // Each entry: { label, vk, pixel_width }
    struct K { const char* l; int vk; int w; };

    // Rows (pixel widths tuned so all rows are ~412px wide)
    const std::vector<std::vector<K>> rows = {
        // Row 0 — F-keys
        {{"Esc",0x1B,35},{"F1",0x70,27},{"F2",0x71,27},{"F3",0x72,27},{"F4",0x73,27},
         {"F5",0x74,27},{"F6",0x75,27},{"F7",0x76,27},{"F8",0x77,27},
         {"F9",0x78,27},{"F10",0x79,31},{"F11",0x7A,31},{"F12",0x7B,31}},

        // Row 1 — numbers
        {{"`",0xC0,27},{"1",'1',27},{"2",'2',27},{"3",'3',27},{"4",'4',27},
         {"5",'5',27},{"6",'6',27},{"7",'7',27},{"8",'8',27},{"9",'9',27},
         {"0",'0',27},{"-",0xBD,27},{"=",0xBB,27},{"Del",0x08,50}},

        // Row 2 — QWERTY
        {{"Tab",0x09,41},{"Q",'Q',27},{"W",'W',27},{"E",'E',27},{"R",'R',27},
         {"T",'T',27},{"Y",'Y',27},{"U",'U',27},{"I",'I',27},{"O",'O',27},
         {"P",'P',27},{"[",0xDB,27},{"]",0xDD,27},{"\\",0xDC,40}},

        // Row 3 — ASDF
        {{"Cap",0x14,50},{"A",'A',27},{"S",'S',27},{"D",'D',27},{"F",'F',27},
         {"G",'G',27},{"H",'H',27},{"J",'J',27},{"K",'K',27},{"L",'L',27},
         {";",0xBA,27},{"'",0xDE,27},{"Ent",0x0D,62}},

        // Row 4 — ZXCV
        {{"Sft",0x10,64},{"Z",'Z',27},{"X",'X',27},{"C",'C',27},{"V",'V',27},
         {"B",'B',27},{"N",'N',27},{"M",'M',27},{",",0xBC,27},{".",0xBE,27},
         {"/",0xBF,27},{"Sft",0x10,80}},

        // Row 5 — bottom
        {{"Ctrl",0x11,41},{"Alt",0x12,41},{"Space",0x20,148},
         {"Alt",0x12,41},{"Ctrl",0x11,41}},
    };

    int y = 0;
    int maxX = 0;

    for (const auto& row : rows) {
        int x = 0;
        for (const auto& k : row) {
            m_keys.append({ QRect(x, y, k.w, KH), k.l, k.vk });
            x += k.w + GAP;
        }
        if (x > maxX) maxX = x;
        y += KH + RGAP;
    }

    // ── Mouse row (separated) ────────────────────────
    y += 8;
    const std::vector<K> mouseRow = {
        {"LMB",0x01,54},{"RMB",0x02,54},{"MMB",0x04,54},
        {"M4",0x05,54},{"M5",0x06,54}
    };
    {
        int x = 0;
        for (const auto& k : mouseRow) {
            m_mouse.append({ QRect(x, y, k.w, KH), k.l, k.vk });
            x += k.w + GAP;
        }
    }

    m_totalW = maxX - GAP + 4;
    m_totalH = y + KH + 4;
    setFixedSize(m_totalW, m_totalH);
}

// ── drawKey ───────────────────────────────────────────
void VirtualKeyboard::drawKey(QPainter& p, const KeyDef& kd) const
{
    bool  bound = m_binds.contains(kd.vk);
    QRect r     = kd.rect;

    if (bound) {
        const BindInfo& bi = m_binds[kd.vk];

        // Glow behind key
        QColor glow = bi.color;
        glow.setAlpha(40);
        p.setPen(Qt::NoPen);
        p.setBrush(glow);
        p.drawRoundedRect(r.adjusted(-2,-2,2,2), 5, 5);

        // Key fill — colored
        p.setBrush(bi.color);
        p.setPen(bi.color.lighter(130));
        p.drawRoundedRect(r, 3, 3);

        // Label
        p.setPen(QColor(10, 10, 15));
    } else {
        // Normal unbound key
        p.setPen(Qt::NoPen);
        p.setBrush(Pal::FRAME);
        p.drawRoundedRect(r, 3, 3);

        // Subtle border
        p.setPen(QPen(Pal::BORDER, 1));
        p.setBrush(Qt::NoBrush);
        p.drawRoundedRect(r.adjusted(0,0,-1,-1), 3, 3);

        p.setPen(Pal::DIM);
    }

    QFont f("Segoe UI", 7, bound ? QFont::Bold : QFont::Normal);
    p.setFont(f);
    p.drawText(r, Qt::AlignCenter, QString::fromUtf8(kd.label));
}

// ── paintEvent ────────────────────────────────────────
void VirtualKeyboard::paintEvent(QPaintEvent*)
{
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);
    p.setRenderHint(QPainter::TextAntialiasing);

    // Background
    p.fillRect(rect(), Pal::BG);

    // ── Keyboard keys ────────────────────────────────
    for (const auto& kd : m_keys)
        drawKey(p, kd);

    // ── Mouse row label ──────────────────────────────
    if (!m_mouse.isEmpty()) {
        int labelY = m_mouse.first().rect.top() - 11;
        p.setFont(QFont("Segoe UI", 8));
        p.setPen(Pal::DIM);
        p.drawText(0, labelY, m_totalW, 11,
                   Qt::AlignLeft | Qt::AlignVCenter,
                   "Souris");

        for (const auto& kd : m_mouse)
            drawKey(p, kd);
    }

    // ── Legend ───────────────────────────────────────
    if (m_binds.isEmpty()) return;

    // Collect unique macro entries (dedup by name)
    QMap<QString, QColor> legend;
    for (auto it = m_binds.begin(); it != m_binds.end(); ++it)
        legend.insert(it->name, it->color);

    int lx = 0;
    int ly = m_totalH - 1;   // will be extended if needed (we don't overflow)
    p.setFont(QFont("Segoe UI", 8, QFont::Medium));

    // Draw legend chips inline at bottom-right of widget
    // (the widget height is fixed — we'll draw over BG padding area)
    // Find legend Y below mouse row
    int legendY = m_mouse.isEmpty()
                    ? m_keys.last().rect.bottom() + 10
                    : m_mouse.first().rect.bottom() + 10;

    (void)lx; (void)ly;

    if (legendY + 18 > m_totalH) return; // no room

    for (auto it = legend.begin(); it != legend.end(); ++it) {
        // Color dot
        p.setPen(Qt::NoPen);
        p.setBrush(it.value());
        p.drawEllipse(QRectF(lx + 2, legendY + 4, 8, 8));

        // Name
        p.setPen(Pal::SOFT);
        QFont lf("Segoe UI", 8);
        p.setFont(lf);
        QFontMetrics fm(lf);
        QString nm = it.key();
        int tw = fm.horizontalAdvance(nm);
        p.drawText(lx + 14, legendY, tw + 4, 16,
                   Qt::AlignLeft | Qt::AlignVCenter, nm);
        lx += 14 + tw + 14;
        if (lx + 80 > m_totalW) { lx = 0; legendY += 18; }
    }
}
