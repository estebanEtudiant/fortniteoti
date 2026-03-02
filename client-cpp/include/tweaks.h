// ══════════════════════════════════════════════════════════════════════
//  tweaks.h — SLIDE Performance Utility — Tous les modules d'optimisation
// ══════════════════════════════════════════════════════════════════════
#pragma once
#include "gui.h"

namespace tweaks {

    // ── Modules individuels ──────────────────────────────────────────
    // Chaque module peut être lancé indépendamment ou via applyAll().

    // 🛡️  Sécurité — point de restauration + backup registre
    void applyBackup  (AppState& s);

    // 🪟  Windows / Système — services, SMB, multimedia, UI
    void applyWindows (AppState& s);

    // 🎮  Game Mode / Game Bar / GameDVR — SAFE (Danger 1-2/5)
    void applyGameMode   (AppState& s);

    // 🔧  Services & Télémétrie — Delivery Opt, Xbox, WU, DiagTrack — SAFE (Danger 1-2/5)
    void applyServices   (AppState& s);

    // 🎮  GPU — HAGS, PCIe power, TDR, DWM, Aero
    void applyGpu     (AppState& s);

    // 🧠  CPU — power throttling, scheduler, boost, core parking
    void applyCpu     (AppState& s);

    // 🧬  RAM — standby flush, paging, compression
    void applyRam     (AppState& s);

    // 🧹  Nettoyage — TEMP, shader cache, DNS flush, corbeille
    void applyCleanup (AppState& s);

    // 🌐  Réseau — Nagle, TCP, DNS, SMB, reset stack
    void applyNetwork (AppState& s);

    // 💾  Stockage — TRIM, NTFS, prefetch, 8.3, write cache
    void applyStorage (AppState& s);

    // 🖱️  Input — souris 1:1, clavier, USB power, controller polling
    void applyInput   (AppState& s);

    // ⚡  Power — Ultimate Performance, CPU 100%, boost, ASPM, veille
    void applyPower          (AppState& s);

    // 🛡️  Defender — Exclusions Fortnite/Epic (réduit stutters IO)
    void applyDefender       (AppState& s);

    // 🔒  WU Driver Block — empêche WU d'écraser le driver GPU stable
    void applyWUDriverBlock  (AppState& s);

    // 🖼️  MPO — désactive Multi-Plane Overlay (fix flicker/stutter NVIDIA)
    void applyMPO            (AppState& s);

    // 🌐  NIC Low Latency — RSS/RSC + Interrupt Moderation + EEE
    void applyNicLatency     (AppState& s);

    // ── Combinés ────────────────────────────────────────────────────
    void applyAll     (AppState& s);  // Backup → tous les modules en séquence
    void revertAll    (AppState& s);  // Restaure les paramètres Windows par défaut

    // ── Vérification état système (read-only, Win32 registre) ────────
    // applied = nb tweaks confirmés OK ; total = nb vérifiés
    // applied == -1 → module non vérifiable (Backup, Cleanup, NicLatency)
    struct CheckResult { int applied = -1; int total = 0; };

    CheckResult checkWindows();
    CheckResult checkGameMode();
    CheckResult checkServices();
    CheckResult checkGpu();
    CheckResult checkCpu();
    CheckResult checkRam();
    CheckResult checkNetwork();
    CheckResult checkStorage();
    CheckResult checkInput();
    CheckResult checkPower();
    CheckResult checkDefender();
    CheckResult checkWUDriverBlock();
    CheckResult checkMPO();

} // namespace tweaks