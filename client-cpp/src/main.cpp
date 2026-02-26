// ══════════════════════════════════════════════════════════════════════
//  FortniteOptimizer 2026 — main.cpp (Qt 6)
//  Entry point: admin check → anti-debug → QApplication → MainWindow
// ══════════════════════════════════════════════════════════════════════
#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>

#include <QApplication>
#include <QMessageBox>
#include <QFont>
#include <QFontDatabase>

#include "MainWindow.h"
#include "AppController.h"
#include "anti_debug.h"

static const std::string API_URL = "http://57.128.255.1:3000";

// ── Entry point ──────────────────────────────────────────────────────
// Note: admin elevation is handled by the embedded manifest (app.manifest).
// Windows shows the UAC prompt before launching the process, so no
// re-launch trick is needed and Qt DLLs are always found correctly.
int main(int argc, char* argv[]) {
    if (!antidebug::checkIntegrity()) {
        MessageBoxW(nullptr,
            L"Environnement non securise detecte.\n"
            L"Fermez les outils de debugging et relancez.",
            L"FortniteOptimizer 2026 — Securite", MB_ICONERROR | MB_OK);
        return 1;
    }

    QApplication app(argc, argv);
    app.setApplicationName("FortniteOptimizer2026");
    app.setApplicationVersion("2026.1.0");
    app.setOrganizationName("404Tweaks");

    QFont defaultFont("Segoe UI", 11);
    defaultFont.setHintingPreference(QFont::PreferFullHinting);
    app.setFont(defaultFont);

    AppController controller(API_URL);
    MainWindow    window(&controller);

    window.show();
    controller.init();

    return app.exec();
}
