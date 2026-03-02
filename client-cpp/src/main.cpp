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

#include <array>
#include <string>

// ── Compile-time XOR string obfuscation ──────────────────────────────────────
// La string n'existe JAMAIS en clair dans le binaire.
// Elle est reconstruite octet par octet en RAM au lancement.
// Clé XOR : 0x5A (arbitraire, changer à chaque build si besoin)
namespace {
    static constexpr uint8_t XOR_KEY = 0x5A;

    // Encode une string littérale en tableau XOR (fait par le compilateur)
    template<std::size_t N>
    constexpr std::array<uint8_t, N> xorEncode(const char (&s)[N]) {
        std::array<uint8_t, N> out{};
        for (std::size_t i = 0; i < N; ++i)
            out[i] = static_cast<uint8_t>(s[i]) ^ XOR_KEY;
        return out;
    }

    // Décode le tableau XOR en std::string à l'exécution
    template<std::size_t N>
    std::string xorDecode(const std::array<uint8_t, N>& arr) {
        std::string out;
        out.reserve(N - 1);
        for (std::size_t i = 0; i < N - 1; ++i)   // -1 : skip null byte
            out += static_cast<char>(arr[i] ^ XOR_KEY);
        return out;
    }

    // "https://api.404tweaks.tech" encodée au compile-time
    static constexpr auto ENC_API = xorEncode("https://api.404tweaks.tech");
}

// Appel : xorDecode(ENC_API) → reconstruit la string uniquement en RAM

// ── Entry point ──────────────────────────────────────────────────────
// Note: admin elevation is handled by the embedded manifest (app.manifest).
// Windows shows the UAC prompt before launching the process, so no
// re-launch trick is needed and Qt DLLs are always found correctly.
int main(int argc, char* argv[]) {

    QApplication app(argc, argv);
    app.setApplicationName("FortniteOptimizer2026");
    app.setApplicationVersion("2026.1.0");
    app.setOrganizationName("404Tweaks");

    QFont defaultFont("Segoe UI", 11);
    defaultFont.setHintingPreference(QFont::PreferFullHinting);
    app.setFont(defaultFont);

    AppController controller(xorDecode(ENC_API));
    MainWindow    window(&controller);

    window.show();
    controller.init();

    return app.exec();
}
