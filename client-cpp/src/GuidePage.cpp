// ══════════════════════════════════════════════════════
//  GuidePage.cpp — Optimisations manuelles détaillées
// ══════════════════════════════════════════════════════
#include "GuidePage.h"
#include "Palette.h"

#include <QScrollArea>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFrame>
#include <QLabel>
#include <QFont>

// ── helpers ──────────────────────────────────────────────────────────────────

static QLabel* gLabel(const QString& t, int px, const QColor& c, bool bold = false, bool wrap = false) {
    auto* l = new QLabel(t);
    l->setStyleSheet(QString("color:%1;background:transparent;font-size:%2px;%3")
        .arg(c.name()).arg(px).arg(bold ? "font-weight:700;" : ""));
    if (wrap) l->setWordWrap(true);
    return l;
}

static QFrame* makeSep() {
    auto* s = new QFrame;
    s->setFrameShape(QFrame::NoFrame);
    s->setFixedHeight(1);
    s->setStyleSheet(QString("background:%1;border:none;").arg(Pal::BORDER.name()));
    return s;
}

// Badge de danger (1-5) coloré
static QLabel* dangerBadge(int lvl, const QString& label) {
    QColor col;
    if      (lvl <= 1) col = Pal::OK;
    else if (lvl <= 2) col = Pal::ACCENT;
    else if (lvl <= 3) col = Pal::WARN;
    else               col = Pal::ERR;

    QString bg = col.name();
    auto* lbl = new QLabel(label);
    lbl->setStyleSheet(QString(
        "color:#000000;"
        "background:%1;"
        "border-radius:4px;"
        "font-size:10px;"
        "font-weight:700;"
        "padding:2px 7px;")
        .arg(bg));
    lbl->setFixedHeight(18);
    lbl->setSizePolicy(QSizePolicy::Maximum, QSizePolicy::Fixed);
    return lbl;
}

// Carte d'optimisation individuelle
static QFrame* makeOptCard(
    const QString& title,
    int dangerLvl,
    const QString& badgeText,
    const QStringList& steps,
    const QString& tip = {})
{
    static int s_id = 0;
    QString name = QString("guide_opt_%1").arg(++s_id);

    auto* card = new QFrame;
    card->setObjectName(name);
    card->setStyleSheet(QString(
        "#%1{background:%2;border:1px solid %3;border-radius:8px;}")
        .arg(name, Pal::CARD2.name(), Pal::BORDER.name()));

    auto* v = new QVBoxLayout(card);
    v->setContentsMargins(16, 12, 16, 14);
    v->setSpacing(8);

    // Header row
    auto* hRow = new QHBoxLayout;
    hRow->setSpacing(10);
    hRow->addWidget(gLabel(title, 13, Pal::TEXT, true));
    hRow->addStretch();
    hRow->addWidget(dangerBadge(dangerLvl, badgeText));
    v->addLayout(hRow);

    v->addWidget(makeSep());

    // Steps
    for (const QString& step : steps) {
        auto* row = new QHBoxLayout;
        row->setSpacing(8);
        row->setContentsMargins(0, 0, 0, 0);

        auto* dot = new QLabel("•");
        dot->setFixedWidth(12);
        dot->setStyleSheet(QString("color:%1;background:transparent;font-size:13px;")
            .arg(Pal::ACCENT.name()));
        dot->setAlignment(Qt::AlignTop | Qt::AlignHCenter);

        auto* txt = gLabel(step, 12, Pal::SOFT, false, true);
        txt->setAlignment(Qt::AlignTop | Qt::AlignLeft);

        row->addWidget(dot);
        row->addWidget(txt, 1);
        v->addLayout(row);
    }

    // Optional tip
    if (!tip.isEmpty()) {
        v->addWidget(makeSep());
        auto* tipLbl = gLabel(tip, 11, Pal::WARN, false, true);
        v->addWidget(tipLbl);
    }

    return card;
}

// Section header avec séparateur coloré
static QWidget* makeSectionHeader(const QString& title, const QColor& accent) {
    auto* w = new QWidget;
    w->setStyleSheet("background:transparent;");
    auto* h = new QHBoxLayout(w);
    h->setContentsMargins(0, 0, 0, 0);
    h->setSpacing(12);

    auto* bar = new QFrame;
    bar->setFixedSize(4, 22);
    bar->setStyleSheet(QString("background:%1;border-radius:2px;border:none;").arg(accent.name()));

    auto* lbl = gLabel(title, 14, Pal::TEXT, true);

    h->addWidget(bar);
    h->addWidget(lbl);
    h->addStretch();
    return w;
}

// ── GuidePage ────────────────────────────────────────────────────────────────

GuidePage::GuidePage(QWidget* parent) : QWidget(parent) {
    buildUi();
}

void GuidePage::buildUi() {
    auto* outerV = new QVBoxLayout(this);
    outerV->setContentsMargins(0, 0, 0, 0);
    outerV->setSpacing(0);

    // Page title
    auto* titleW = new QWidget;
    titleW->setStyleSheet("background:transparent;");
    auto* titleH = new QHBoxLayout(titleW);
    titleH->setContentsMargins(0, 0, 0, 8);
    auto* titleLbl = gLabel("Guide Optimisations Manuelles", 17, Pal::TEXT, true);
    auto* subtitleLbl = gLabel("  —  Tout ce qu'aucun script ne peut faire à ta place", 13, Pal::DIM);
    titleH->addWidget(titleLbl);
    titleH->addWidget(subtitleLbl);
    titleH->addStretch();
    outerV->addWidget(titleW);

    // Scroll area
    auto* scroll = new QScrollArea;
    scroll->setWidgetResizable(true);
    scroll->setFrameShape(QFrame::NoFrame);
    scroll->setStyleSheet("QScrollArea{background:transparent;border:none;}"
                          "QWidget#guide_scroll_inner{background:transparent;}");
    scroll->setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);

    auto* inner = new QWidget;
    inner->setObjectName("guide_scroll_inner");
    auto* v = new QVBoxLayout(inner);
    v->setContentsMargins(0, 4, 8, 16);
    v->setSpacing(20);

    // ── 1 — GPU & Paramètres Jeu ─────────────────────────────────────────────
    v->addWidget(makeSectionHeader("GPU & Paramètres Jeu", Pal::ACCENT));

    v->addWidget(makeOptCard(
        "NVIDIA Reflex Low Latency",
        1, "SAFE  1/5",
        {
            "Dans Fortnite : Paramètres → Vidéo → NVIDIA Reflex Low Latency → Activé + Boost.",
            "Réduit la latence d'entrée en synchronisant le CPU et le GPU, évitant l'accumulation de frames dans la queue GPU (GPU-bound latency).",
            "Réglage recommandé : 'Activé + Boost' (Boost augmente la priorité GPU pour réduire encore le délai).",
            "Vérifier via NVIDIA FrameView ou LDAT que le PC Latency descend sous 30 ms."
        },
        "Tip : Reflex est incompatible avec certains overlays (RivaTuner). Désactive le framerate cap d'RTSS si tu utilises Reflex."));

    v->addWidget(makeOptCard(
        "NVIDIA Low Latency Mode (Control Panel)",
        2, "SAFE  2/5",
        {
            "NVIDIA Control Panel → Gérer les paramètres 3D → Low Latency Mode = Ultra.",
            "Utiliser UNIQUEMENT si le jeu ne supporte pas Reflex. Si Reflex est actif, ce réglage est ignoré.",
            "Réduit la pre-render queue à 1 frame (équivalent à l'ancien 'Maximum Pre-Rendered Frames = 1').",
            "Peut baisser légèrement les FPS en CPU-bound mais réduit la latence GPU de 10-20 ms."
        }));

    v->addWidget(makeOptCard(
        "AMD Anti-Lag / Anti-Lag+",
        2, "SAFE  2/5",
        {
            "AMD Software Adrenalin → Jeux → Graphiques → Anti-Lag = Activé.",
            "Anti-Lag+ (version 23.11+) est spécifique au jeu et fonctionne au niveau du driver — plus précis que l'Anti-Lag classique.",
            "Réduit l'input lag en retardant légèrement le CPU pour qu'il soit mieux aligné avec le GPU.",
            "Vérifier que Radeon Boost et Radeon Chill sont désactivés pour Fortnite (ils limitent les FPS)."
        },
        "Tip : Anti-Lag+ peut être incompatible avec certains anti-cheats. Vérifie la liste de compatibilité AMD."));

    // ── 2 — BIOS / UEFI ──────────────────────────────────────────────────────
    v->addWidget(makeSectionHeader("BIOS / UEFI", Pal::WARN));

    v->addWidget(makeOptCard(
        "XMP / EXPO — Activer la vitesse native de la RAM",
        1, "SAFE  1/5",
        {
            "Redémarre → Touche BIOS (DEL / F2 / F12 selon la carte mère) → Advanced → Memory Config.",
            "Intel : activer XMP Profile 1. AMD : activer EXPO (ou DOCP selon le BIOS).",
            "La RAM passe de 2133 MHz (JEDEC par défaut) à sa fréquence nominale (ex: 3200 / 4800 / 6000 MHz).",
            "Gain : réduction de la latence mémoire, hausse des 1% Low FPS jusqu'à +15% sur Fortnite.",
            "Si le système ne démarre plus : CMOS reset (retire la pile CR2032 5 secondes ou jumper CLRTC)."
        }));

    v->addWidget(makeOptCard(
        "Resizable BAR / Smart Access Memory",
        2, "SAFE  2/5",
        {
            "BIOS → Advanced → PCIe Configuration → Resizable BAR = Enabled.",
            "Prérequis : Windows 10 20H1+, GPU avec support (NVIDIA RTX 30+ ou AMD RX 6000+), BIOS récent.",
            "Permet au CPU d'accéder à l'intégralité de la VRAM en une seule transaction au lieu de segments de 256 MB.",
            "Vérifier dans GPU-Z (onglet Advanced, 'ReBAR' = Yes) après activation.",
            "Gain variable : 0–10% sur Fortnite selon le CPU/GPU. Parfois neutre, jamais négatif."
        }));

    v->addWidget(makeOptCard(
        "C-States CPU — Désactiver les états basse consommation",
        3, "EXPÉRIMENTAL  3/5",
        {
            "BIOS → Advanced → CPU Configuration → C-States = Disabled (ou Global C-States Control = Disabled).",
            "Empêche le processeur d'entrer en états de veille (C1/C2/C3/C6), éliminant la latence de réveil du CPU.",
            "Gain : réduction des micro-stutters liés au wake-up latency, surtout visible en 0.1% Low.",
            "Inconvénient : consommation et température CPU légèrement plus élevées en idle.",
            "Déconseillé sur laptop (batterie, surchauffe). Sur desktop uniquement."
        },
        "Attention : certaines cartes mères nomment cela 'CPU C6 State', 'Package C State', ou 'C-State Support'."));

    v->addWidget(makeOptCard(
        "ASPM PCIe — Active State Power Management",
        3, "EXPÉRIMENTAL  3/5",
        {
            "BIOS → Advanced → PCIe Configuration → ASPM = Disabled (ou 'PCIe ASPM Support = Disabled').",
            "Désactive la gestion de puissance des liens PCIe — évite les throttles de bande passante PCIe.",
            "Utile si tu constates des stutters lors de grosses transmissions de données GPU↔RAM.",
            "Pas visible sur tous les BIOS — peut être nommé 'L0s/L1 ASPM' ou absent.",
            "Impact mesuré surtout avec GPU haut de gamme sur PCIe 4.0 ou 5.0."
        }));

    // ── 3 — Drivers GPU ──────────────────────────────────────────────────────
    v->addWidget(makeSectionHeader("Drivers GPU", QColor(0x33, 0xC7, 0x6B)));

    v->addWidget(makeOptCard(
        "Choisir la bonne branche de driver",
        2, "SAFE  2/5",
        {
            "NVIDIA : Game Ready Driver (GRD) = nouvelle branche, Studio Driver (SD) = plus stable.",
            "Avant d'installer un nouveau GRD, consulte Reddit r/nvidia ou les forums pour les régressions signalées.",
            "AMD : driver WHQL recommandé plutôt que Optional. Évite les versions marquées 'Beta'.",
            "Fortnite est souvent optimisé dans les GRD des semaines de tournois (FNCS, Majors).",
            "Note la version actuelle (Panel de contrôle → Aide → Infos système) avant de changer."
        }));

    v->addWidget(makeOptCard(
        "DDU — Clean Install du driver GPU",
        1, "SAFE  1/5",
        {
            "Télécharge DDU (Display Driver Uninstaller) sur guru3d.com.",
            "Démarre en Mode Sans Échec : Paramètres → Récupération → Démarrage avancé → Résoudre les problèmes → Options avancées → Paramètres de démarrage → F4.",
            "Dans DDU : sélectionne 'GPU' + ton fabricant (NVIDIA/AMD), puis 'Clean and restart'.",
            "Après redémarrage en mode normal, installe le nouveau driver sans GeForce Experience si possible.",
            "Évite les résidus de registry et de DLL d'anciens drivers qui causent crashes et micro-stutters."
        },
        "Tip : désactive la connexion internet avant d'ouvrir DDU pour empêcher Windows Update de réinstaller son driver générique."));

    // ── 4 — Sécurité RISKY ───────────────────────────────────────────────────
    v->addWidget(makeSectionHeader("Sécurité — Optimisations RISQUÉES", Pal::ERR));

    v->addWidget(makeOptCard(
        "VBS / HVCI — Désactiver la sécurité virtualisée",
        5, "RISQUÉ  5/5",
        {
            "Vérifie si VBS est actif : Démarrer → msinfo32.exe → 'Virtualisation Based Security' = Running.",
            "Pour désactiver : regedit → HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard → EnableVirtualizationBasedSecurity = 0.",
            "Puis : cmd admin → bcdedit /set hypervisorlaunchtype off.",
            "Redémarre. Vérifier dans msinfo32 que VBS = 'Not enabled'.",
            "Gain potentiel : 5–15% GPU performance supplémentaires sur certains jeux (DX12 surtout)."
        },
        "AVERTISSEMENT : désactive la protection mémoire du kernel. Réduit significativement la résistance aux rootkits et exploits kernel. À réserver aux machines dédiées gaming uniquement. Jamais sur un PC personnel/professionnel."));

    v->addWidget(makeOptCard(
        "Hyper-V — Désactiver la virtualisation Windows",
        4, "RISQUÉ  4/5",
        {
            "Ouvre une invite de commandes en tant qu'admin.",
            "Commande : bcdedit /set hypervisorlaunchtype off",
            "Désactive aussi via : Panneau de configuration → Programmes → Activer/désactiver des fonctionnalités Windows → décocher 'Hyper-V' et 'Windows Hypervisor Platform'.",
            "Gain : supprime l'overhead de l'hyperviseur sur les appels système et les interruptions.",
            "Redémarre obligatoire. Vérifie dans msinfo32 : 'Hyper-V Requirements' doit afficher 'A hypervisor has not been detected'."
        },
        "AVERTISSEMENT : casse WSL2, Docker Desktop, Xbox Game Bar (enregistrement), Windows Sandbox, et toute VM Hyper-V. À faire uniquement sur un PC exclusivement dédié au gaming."));

    // ── 5 — Mesure & Validation ───────────────────────────────────────────────
    v->addWidget(makeSectionHeader("Mesure & Validation", Pal::SOFT));

    v->addWidget(makeOptCard(
        "Protocole Baseline — Tester une optimisation à la fois",
        1, "MÉTHODE  1/5",
        {
            "Avant toute modif : joue 3 sessions identiques (même map, même mode), note les valeurs FPS avg / 1% Low / 0.1% Low avec CapFrameX.",
            "Applique UNE SEULE optimisation, redémarre si nécessaire, rejoue 3 sessions dans les mêmes conditions.",
            "Compare les valeurs. Si l'amélioration est dans la marge d'erreur (< 3%), l'effet est non significatif.",
            "Respecte les conditions thermiques : attends que ton CPU/GPU soit à température stabilisée (10 min d'idle après démarrage).",
            "Documente chaque changement : date, version du driver, réglage modifié, résultat mesuré."
        }));

    v->addWidget(makeOptCard(
        "PresentMon — Analyse Frame Time",
        1, "OUTIL  1/5",
        {
            "Télécharge PresentMon (Intel, open-source) sur GitHub : github.com/GameTechDev/PresentMon.",
            "Lance en tant qu'admin. Attache au processus Fortnite : PresentMon.exe -process_name FortniteClient-Win64-Shipping.exe -output_file bench.csv",
            "Enregistre : frame time, GPU time, CPU time, display latency (GPU-to-display lag).",
            "Importe le CSV dans CapFrameX (outil gratuit) pour visualiser les spikes et calculer les percentiles.",
            "Indicateurs clés : msPC Latency (Input→Display < 30 ms), GPU Busy (stable sans spikes), 99th percentile frame time (< 16.7 ms pour 60 FPS constant)."
        },
        "Tip : PresentMon v2 inclut une UI graphique (PresentMonUI.exe) — plus simple d'utilisation que la ligne de commande."));

    v->addWidget(makeOptCard(
        "WPR / WPA — Analyser les Stutters Systèmes",
        1, "OUTIL  1/5",
        {
            "WPR (Windows Performance Recorder) et WPA font partie du Windows ADK (Kit de déploiement Windows).",
            "Démarrer un enregistrement (cmd admin) : wpr -start CPU -start DiskIO -start GPU -start Latency",
            "Reproduis le stutter (joue 5 min), puis stoppe : wpr -stop C:\\trace.etl",
            "Ouvre trace.etl dans WPA (Windows Performance Analyzer). Vue 'CPU Usage (Sampled)' identifie les spikes CPU.",
            "Vue 'GPU Activity' → 'RunningTime' montre si le GPU est sous-alimenté (bubble = stutter). Vue 'Disk I/O' → 'File I/O' identifie les accès disque lents pendant le jeu."
        },
        "Tip : le preset 'Gaming' de WPR (wpr -start Gaming.wprp) capture les traces les plus pertinentes pour Fortnite. Disponible sur GitHub : microsoft/Windows-Dev-Performance."));

    v->addStretch();

    scroll->setWidget(inner);
    outerV->addWidget(scroll, 1);
}
