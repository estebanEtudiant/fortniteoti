#include "I18n.h"

#include <QAbstractButton>
#include <QComboBox>
#include <QGroupBox>
#include <QHash>
#include <QLabel>
#include <QLineEdit>
#include <QPlainTextEdit>
#include <QRegularExpression>
#include <QSettings>
#include <QWidget>

namespace {
const QHash<QString, QString>& frStrings() {
    static const QHash<QString, QString> kStrings = {
        {"common.window_title", "404 Tweaks - Optimiseur"},
        {"common.app_name", "404 Tweaks"},

        {"sidebar.section.system", "SYSTEME"},
        {"sidebar.section.optimization", "OPTIMISATION"},
        {"sidebar.section.gameplay", "GAMEPLAY"},
        {"sidebar.tab.dashboard", "Dashboard"},
        {"sidebar.tab.modules", "Modules"},
        {"sidebar.tab.logs", "Logs"},
        {"sidebar.tab.settings", "Parametres"},
        {"sidebar.tab.guide", "Guide"},
        {"sidebar.tab.network", "Reseau"},
        {"sidebar.tab.drivers", "Drivers"},
        {"sidebar.tab.fortnite", "Fortnite"},
        {"sidebar.tab.macros", "Macros"},
        {"sidebar.status.active", "Session active"},
        {"sidebar.status.running", "En cours..."},
        {"sidebar.expiration.lifetime", "Lifetime"},

        {"settings.title", "Parametres"},
        {"settings.subtitle", "Configuration de l'outil."},
        {"settings.section.logs", "Affichage des logs"},
        {"settings.logs.auto_scroll", "Auto-scroll (suivre les nouveaux logs)"},
        {"settings.logs.compact", "Mode compact (masquer les lignes vides)"},
        {"settings.section.quick_nav", "Navigation rapide"},
        {"settings.nav.modules", "Aller aux Modules"},
        {"settings.nav.logs", "Aller aux Logs"},
        {"settings.nav.dashboard", "Aller au Dashboard"},
        {"settings.action.clear_logs", "Vider les logs"},
        {"settings.section.language", "Langue"},
        {"settings.language.subtitle", "Choisissez la langue de l'interface."},
        {"settings.section.license", "Informations de licence"},
        {"settings.license.plan", "Plan"},
        {"settings.license.expiration", "Expiration"},
        {"settings.license.hwid", "HWID"},
        {"settings.license.os", "OS"},
        {"settings.section.about", "A propos"},
        {"settings.about.name", "404 Tweaks"},
        {"settings.about.version", "Version   2026"},
        {"settings.about.tweaks", "Tweaks    100+ optimisations systeme"},
        {"settings.about.modules", "Modules   14 categories"},
        {"settings.warning", "Certains tweaks necessitent un redemarrage. Utilisez Backup & Securite avant toute optimisation."},
        {"settings.expiration.lifetime", "Lifetime"},
    };
    return kStrings;
}

const QHash<QString, QString>& enStrings() {
    static const QHash<QString, QString> kStrings = {
        {"common.window_title", "404 Tweaks - Optimizer"},
        {"common.app_name", "404 Tweaks"},

        {"sidebar.section.system", "SYSTEM"},
        {"sidebar.section.optimization", "OPTIMIZATION"},
        {"sidebar.section.gameplay", "GAMEPLAY"},
        {"sidebar.tab.dashboard", "Dashboard"},
        {"sidebar.tab.modules", "Modules"},
        {"sidebar.tab.logs", "Logs"},
        {"sidebar.tab.settings", "Settings"},
        {"sidebar.tab.guide", "Guide"},
        {"sidebar.tab.network", "Network"},
        {"sidebar.tab.drivers", "Drivers"},
        {"sidebar.tab.fortnite", "Fortnite"},
        {"sidebar.tab.macros", "Macros"},
        {"sidebar.status.active", "Active session"},
        {"sidebar.status.running", "Running..."},
        {"sidebar.expiration.lifetime", "Lifetime"},

        {"settings.title", "Settings"},
        {"settings.subtitle", "Tool configuration."},
        {"settings.section.logs", "Log display"},
        {"settings.logs.auto_scroll", "Auto-scroll (follow new logs)"},
        {"settings.logs.compact", "Compact mode (hide empty lines)"},
        {"settings.section.quick_nav", "Quick navigation"},
        {"settings.nav.modules", "Go to Modules"},
        {"settings.nav.logs", "Go to Logs"},
        {"settings.nav.dashboard", "Go to Dashboard"},
        {"settings.action.clear_logs", "Clear logs"},
        {"settings.section.language", "Language"},
        {"settings.language.subtitle", "Choose the interface language."},
        {"settings.section.license", "License information"},
        {"settings.license.plan", "Plan"},
        {"settings.license.expiration", "Expiration"},
        {"settings.license.hwid", "HWID"},
        {"settings.license.os", "OS"},
        {"settings.section.about", "About"},
        {"settings.about.name", "404 Tweaks"},
        {"settings.about.version", "Version   2026"},
        {"settings.about.tweaks", "Tweaks    100+ system optimizations"},
        {"settings.about.modules", "Modules   14 categories"},
        {"settings.warning", "Some tweaks require a reboot. Use Backup & Security before any optimization."},
        {"settings.expiration.lifetime", "Lifetime"},
    };
    return kStrings;
}

const QHash<QString, QString>& frToEnPhrases() {
    static const QHash<QString, QString> m = {
        {"Vue d'ensemble et actions rapides.", "Overview and quick actions."},
        {"Actions rapides", "Quick actions"},
        {"Optimise selon les modules actives dans l'onglet Modules.", "Optimizes according to enabled modules in the Modules tab."},
        {"Systeme pret. Aucune operation en cours.", "System ready. No operation in progress."},
        {"Derniere operation terminee. Redemarrage recommande.", "Last operation completed. Restart recommended."},
        {"Informations", "Information"},
        {"Modules inclus", "Included modules"},
        {"Actives dans l'onglet Modules. Cliquez pour configurer.", "Enabled in the Modules tab. Click to configure."},
        {"Etat du systeme", "System status"},
        {"Plan de licence", "License plan"},
        {"Modules actifs", "Active modules"},
        {"PRET", "READY"},
        {"EN COURS", "RUNNING"},

        {"Activez ou desactivez chaque composant et appliquez-les individuellement.", "Enable or disable each component and apply them individually."},

        {"Console d'execution en temps reel.", "Real-time execution console."},
        {"Aucune operation lancee. Utilisez le Dashboard ou les Modules.", "No operation started. Use Dashboard or Modules."},
        {"Operation terminee.  Redemarrage recommande.", "Operation completed. Restart recommended."},

        {"Entrez votre cle de licence pour continuer.", "Enter your license key to continue."},
        {"Cle de licence", "License key"},
        {"Activer", "Activate"},
        {"Verification en cours...", "Verifying..."},

        {"Mise a jour disponible !", "Update available!"},
        {"Version actuelle :", "Current version:"},
        {"Nouvelle version :", "New version:"},
        {"Telecharger la mise a jour", "Download update"},
        {"Plus tard", "Later"},

        {"Aucune notification", "No notifications"},
        {"Tout lire", "Mark all read"},
        {"A l'instant", "Just now"},

        {"DNS presets, moniteur ping temps reel, MTU", "DNS presets, real-time ping monitor, MTU"},
        {"Note : Le MTU standard pour Ethernet/WiFi est 1500. Un MTU reduit peut reduire la fragmentation sur VPN.", "Note: Standard MTU for Ethernet/WiFi is 1500. A lower MTU can reduce VPN fragmentation."},
        {"Adaptateur ou DNS vide.", "Adapter or DNS is empty."},
        {"Application en cours...", "Applying..."},
        {"DNS applique et cache vide !", "DNS applied and cache flushed!"},
        {"Erreur — lancez en Administrateur.", "Error — run as Administrator."},

        {"Detection GPU, version driver, telechargement direct", "GPU detection, driver version, direct download"},
        {"Detection du fabricant en cours...", "Detecting GPU vendor..."},
        {"Cliquez sur le bouton correspondant a votre fabricant GPU pour ouvrir la page officielle.", "Click the button matching your GPU vendor to open the official page."},
        {"Detection...", "Detecting..."},
        {"Inconnu", "Unknown"},
        {"GPU NVIDIA detecte. Allez sur geforce.com/drivers pour le dernier Game Ready Driver ou Studio Driver. Recommande : Game Ready.", "NVIDIA GPU detected. Go to geforce.com/drivers for the latest Game Ready or Studio Driver. Recommended: Game Ready."},
        {"GPU AMD detecte. Allez sur amd.com/support pour Adrenalin Edition. Desactivez Radeon Chill et Enhanced Sync pour moins de latence.", "AMD GPU detected. Go to amd.com/support for Adrenalin Edition. Disable Radeon Chill and Enhanced Sync for lower latency."},
        {"GPU Intel detecte. Allez sur intel.com/drivers pour Intel Arc & Iris Xe Graphics Driver.", "Intel GPU detected. Go to intel.com/drivers for Intel Arc & Iris Xe Graphics Driver."},
        {"Fabricant GPU non detecte automatiquement. Choisissez le bon bouton ci-dessous.", "GPU vendor not detected automatically. Choose the correct button below."},

        {"Lecture/ecriture directe de GameUserSettings.ini", "Direct read/write of GameUserSettings.ini"},
        {"Aucun fichier detecte", "No file detected"},
        {"Fortnite non detecte — utilisez Parcourir", "Fortnite not detected — use Browse"},
        {"Aucun fichier selectionne", "No file selected"},
        {"Fichier charge", "File loaded"},
        {"Recharge", "Reloaded"},
        {"Sauvegarde !", "Saved!"},
        {"Erreur d'ecriture", "Write error"},
        {"Preset Competitif", "Competitive Preset"},
        {"Qualite min, V-Sync off, Motion Blur off, FPS 240 — optimal pour le jeu competitif", "Low quality, V-Sync off, Motion Blur off, FPS 240 — optimal for competitive play"},
        {"Preset applique et sauvegarde !", "Preset applied and saved!"},
        {"Preset applique — erreur d'ecriture", "Preset applied — write error"},
        {"Preset applique — selectionnez un fichier pour sauvegarder", "Preset applied — select a file to save"},
        {"Fichier detecte et charge", "File detected and loaded"},
        {"Impossible d'ouvrir le fichier", "Unable to open file"},

        {"Guide Optimisations Manuelles", "Manual Optimization Guide"},
        {"GPU & Parametres Jeu", "GPU & Game Settings"},
        {"Securite — Optimisations RISQUEES", "Security — RISKY Optimizations"},
        {"Mesure & Validation", "Measurement & Validation"}
    };
    return m;
}

QHash<QString, QString> makeReverse(const QHash<QString, QString>& src) {
    QHash<QString, QString> out;
    for (auto it = src.constBegin(); it != src.constEnd(); ++it) out.insert(it.value(), it.key());
    return out;
}

const QHash<QString, QString>& enToFrPhrases() {
    static const QHash<QString, QString> m = makeReverse(frToEnPhrases());
    return m;
}

const QHash<QString, QString>& frToEnFragments() {
    static const QHash<QString, QString> m = {
        {"Parametres", "Settings"},
        {"Reseau", "Network"},
        {"LANCER L'OPTIMISATION", "RUN OPTIMIZATION"},
        {"Restaurer les parametres Windows", "Restore Windows settings"},
        {"Lancer la selection", "Run selected modules"},
        {"Tout activer", "Enable all"},
        {"Tout desactiver", "Disable all"},
        {"Verifier l'etat", "Check status"},
        {"Appliquer", "Apply"},
        {"Actif", "Active"},

        {"Aucune operation lancee", "No operation started"},
        {"Operation en cours", "Operation running"},
        {"Operation terminee", "Operation completed"},
        {"Redemarrage recommande", "Restart recommended"},

        {"Vider les logs", "Clear logs"},
        {"lancez une optimisation pour voir les logs", "run an optimization to view logs"},

        {"Optimiseur Reseau", "Network Optimizer"},
        {"Configuration DNS", "DNS Configuration"},
        {"Adaptateur", "Adapter"},
        {"Preset DNS", "DNS Preset"},
        {"Personnalise", "Custom"},
        {"DNS primaire", "Primary DNS"},
        {"DNS secondaire", "Secondary DNS"},
        {"Moniteur Ping", "Ping Monitor"},
        {"ACTUEL", "CURRENT"},
        {"MOY", "AVG"},
        {"MTU actuel", "Current MTU"},
        {"Rafraichir", "Refresh"},
        {"Non disponible", "Unavailable"},
        {"En attente...", "Waiting..."},

        {"Optimiseur Drivers", "Driver Optimizer"},
        {"Actualiser", "Refresh"},
        {"Informations GPU", "GPU Information"},
        {"Version driver", "Driver version"},
        {"Systeme", "System"},
        {"Telecharger les Drivers", "Download Drivers"},

        {"Parcourir", "Browse"},
        {"Recharger", "Reload"},
        {"SAUVEGARDER", "SAVE"},
        {"APPLIQUER LE PRESET", "APPLY PRESET"},
        {"Affichage", "Display"},
        {"Mode d'affichage", "Display mode"},
        {"Plein ecran", "Fullscreen"},
        {"Sans bordures", "Borderless"},
        {"Fenetre", "Windowed"},
        {"Limite FPS", "FPS limit"},
        {"Qualite Graphique", "Graphics Quality"},
        {"Desactive / Bas", "Off / Low"},
        {"Moyen", "Medium"},
        {"Eleve", "High"},
        {"Epique", "Epic"},
        {"Ombres", "Shadows"},
        {"Effets", "Effects"},
        {"Post-traitement", "Post-processing"},
        {"Reflexions", "Reflections"},
        {"Feuillage", "Foliage"},
        {"Compteur FPS in-game", "In-game FPS counter"},
        {"Affiche", "Show"},

        {"Mise a jour disponible", "Update available"},
        {"Telecharger la mise a jour", "Download update"},
        {"Plus tard", "Later"},
        {"Tout lire", "Mark all read"},
        {"Aucune notification", "No notifications"},

        {"tweaks selectionnes", "selected tweaks"}
    };
    return m;
}

const QHash<QString, QString>& enToFrFragments() {
    static const QHash<QString, QString> m = makeReverse(frToEnFragments());
    return m;
}

QString applyMapReplace(const QString& input, const QHash<QString, QString>& map) {
    QString out = input;
    for (auto it = map.constBegin(); it != map.constEnd(); ++it) {
        out.replace(it.key(), it.value(), Qt::CaseSensitive);
    }
    return out;
}

QString applyRegexEn(const QString& input) {
    QString out = input;

    QRegularExpression rxMin("^il y a\\s+(\\d+)\\s+min$");
    QRegularExpression rxHour("^il y a\\s+(\\d+)\\s+h$");
    QRegularExpression rxDay("^il y a\\s+(\\d+)\\s+j$");

    auto m = rxMin.match(out);
    if (m.hasMatch()) return QString("%1 min ago").arg(m.captured(1));

    m = rxHour.match(out);
    if (m.hasMatch()) return QString("%1 h ago").arg(m.captured(1));

    m = rxDay.match(out);
    if (m.hasMatch()) return QString("%1 d ago").arg(m.captured(1));

    return out;
}

QString applyRegexFr(const QString& input) {
    QString out = input;

    QRegularExpression rxMin("^(\\d+)\\s+min ago$");
    QRegularExpression rxHour("^(\\d+)\\s+h ago$");
    QRegularExpression rxDay("^(\\d+)\\s+d ago$");

    auto m = rxMin.match(out);
    if (m.hasMatch()) return QString("il y a %1 min").arg(m.captured(1));

    m = rxHour.match(out);
    if (m.hasMatch()) return QString("il y a %1 h").arg(m.captured(1));

    m = rxDay.match(out);
    if (m.hasMatch()) return QString("il y a %1 j").arg(m.captured(1));

    return out;
}
}

I18n& I18n::instance() {
    static I18n instance;
    return instance;
}

I18n::I18n() {
    loadLanguage();
}

QString I18n::text(const QString& key) const {
    const auto& primary = (m_language == Language::EN) ? enStrings() : frStrings();
    const auto it = primary.find(key);
    if (it != primary.end()) return it.value();

    const auto fallback = frStrings().find(key);
    if (fallback != frStrings().end()) return fallback.value();

    return key;
}

QString I18n::phrase(const QString& raw) const {
    if (raw.isEmpty()) return raw;

    if (m_language == Language::EN) {
        const auto exact = frToEnPhrases().find(raw);
        if (exact != frToEnPhrases().end()) return exact.value();

        QString out = applyMapReplace(raw, frToEnFragments());
        out = applyRegexEn(out);
        return out;
    }

    const auto exact = enToFrPhrases().find(raw);
    if (exact != enToFrPhrases().end()) return exact.value();

    QString out = applyMapReplace(raw, enToFrFragments());
    out = applyRegexFr(out);
    return out;
}

void I18n::translateWidgetTree(QWidget* root) const {
    if (!root) return;

    const auto labels = root->findChildren<QLabel*>();
    for (QLabel* label : labels) {
        const QString translated = phrase(label->text());
        if (translated != label->text()) label->setText(translated);
        if (!label->toolTip().isEmpty()) label->setToolTip(phrase(label->toolTip()));
    }

    const auto buttons = root->findChildren<QAbstractButton*>();
    for (QAbstractButton* button : buttons) {
        const QString translated = phrase(button->text());
        if (translated != button->text()) button->setText(translated);
        if (!button->toolTip().isEmpty()) button->setToolTip(phrase(button->toolTip()));
    }

    const auto lines = root->findChildren<QLineEdit*>();
    for (QLineEdit* line : lines) {
        if (!line->placeholderText().isEmpty()) {
            line->setPlaceholderText(phrase(line->placeholderText()));
        }
    }

    const auto plains = root->findChildren<QPlainTextEdit*>();
    for (QPlainTextEdit* plain : plains) {
        if (!plain->placeholderText().isEmpty()) {
            plain->setPlaceholderText(phrase(plain->placeholderText()));
        }
    }

    const auto combos = root->findChildren<QComboBox*>();
    for (QComboBox* combo : combos) {
        for (int i = 0; i < combo->count(); ++i) {
            const QString current = combo->itemText(i);
            const QString translated = phrase(current);
            if (translated != current) combo->setItemText(i, translated);
        }
    }

    const auto groups = root->findChildren<QGroupBox*>();
    for (QGroupBox* group : groups) {
        if (!group->title().isEmpty()) {
            group->setTitle(phrase(group->title()));
        }
    }
}

QString I18n::languageCode() const {
    return m_language == Language::EN ? "en" : "fr";
}

void I18n::setLanguage(Language language) {
    if (m_language == language) return;
    m_language = language;
    saveLanguage();
    emit languageChanged();
}

void I18n::setLanguageCode(const QString& code) {
    const QString normalized = code.trimmed().toLower();
    if (normalized == "en") {
        setLanguage(Language::EN);
        return;
    }
    setLanguage(Language::FR);
}

void I18n::loadLanguage() {
    QSettings settings;
    setLanguageCode(settings.value("ui/language", "fr").toString());
}

void I18n::saveLanguage() const {
    QSettings settings;
    settings.setValue("ui/language", languageCode());
}
