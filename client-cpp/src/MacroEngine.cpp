// ══════════════════════════════════════════════════════
//  MacroEngine.cpp — routes all inputs through InputSender
//  (Interception driver if installed, SendInput fallback)
// ══════════════════════════════════════════════════════
#include "MacroEngine.h"
#include "InputSender.h"

#ifdef _WIN32
#  include <windows.h>
#endif

#include <chrono>

MacroEngine::MacroEngine(QObject* parent) : QObject(parent) {}
MacroEngine::~MacroEngine() { stopEngine(); }

// ── Setters ───────────────────────────────────────────────────────────────────
void MacroEngine::setGlobal          (const GlobalCfg&          c) { std::lock_guard<std::mutex> l(m_mutex); m_global       = c; }
void MacroEngine::setDoubleEdit      (const DoubleEditCfg&       c) { std::lock_guard<std::mutex> l(m_mutex); m_dEdit        = c; }
void MacroEngine::setDragEdit        (const DragEditCfg&         c) { std::lock_guard<std::mutex> l(m_mutex); m_drag         = c; }
void MacroEngine::setShotgunPullout  (const ShotgunPulloutCfg&   c) { std::lock_guard<std::mutex> l(m_mutex); m_shotgun      = c; }
void MacroEngine::setAutoBuild       (const AutoBuildCfg&        c) { std::lock_guard<std::mutex> l(m_mutex); m_autoBuild    = c; }
void MacroEngine::setPickUp          (const PickUpCfg&           c) { std::lock_guard<std::mutex> l(m_mutex); m_pickup       = c; }
void MacroEngine::setSingleEdit      (const SingleEditCfg&       c) { std::lock_guard<std::mutex> l(m_mutex); m_sEdit        = c; }
void MacroEngine::setInstantBuildSpam(const InstantBuildSpamCfg& c) { std::lock_guard<std::mutex> l(m_mutex); m_ibSpam       = c; }
void MacroEngine::setItemPullout     (const ItemPulloutCfg&      c) { std::lock_guard<std::mutex> l(m_mutex); m_itemPullout  = c; }
void MacroEngine::setWallRetake      (const WallRetakeCfg&       c) { std::lock_guard<std::mutex> l(m_mutex); m_wallRetake   = c; }
void MacroEngine::setPrefire         (const PrefireCfg&          c) { std::lock_guard<std::mutex> l(m_mutex); m_prefire      = c; }

// ── Engine ────────────────────────────────────────────────────────────────────
void MacroEngine::startEngine() {
    if (m_running.exchange(true)) return;
    InputSender::instance().init();
    m_thread = std::thread(&MacroEngine::pollLoop, this);
}

void MacroEngine::stopEngine() {
    if (m_buildActive.load()) {
        AutoBuildCfg ab;
        { std::lock_guard<std::mutex> l(m_mutex); ab = m_autoBuild; }
        InputSender::instance().send(ab.holdVK, false);
        m_buildActive.store(false);
    }
    m_running.store(false);
    if (m_thread.joinable()) m_thread.join();
}

// ── Windows key-state helper ──────────────────────────────────────────────────
bool MacroEngine::isDown(int vk) {
#ifdef _WIN32
    return vk > 0 && (GetAsyncKeyState(vk) & 0x8000) != 0;
#else
    (void)vk; return false;
#endif
}

// ── Polling loop ──────────────────────────────────────────────────────────────
void MacroEngine::pollLoop() {
    using clock = std::chrono::steady_clock;
    using ms    = std::chrono::milliseconds;

    auto& input = InputSender::instance();

    // ── State machine pour Double Edit / Single Edit ─────────────────────────
    // Évite les Sleep bloquants : chaque étape a un timestamp planifié.
    // id=0 → inactif ; id>0 → numéro d'étape en cours.
    struct SeqStep {
        int  id = 0;
        std::chrono::steady_clock::time_point at{clock::now()};
    };
    SeqStep deSeq, seSeq;

    // Rising / falling edge state
    bool dragWas      = false;
    bool shotgunWas   = false;
    bool buildTrigWas = false;
    bool seditWas     = false;
    bool masterTogWas = false;
    bool ipEditWas    = false;
    bool ipBuildWas   = false;

    // Timing for hold-based macros
    auto pickupNext  = clock::now();
    auto buildRepeat = clock::now();
    auto prefireNext = clock::now();
    auto wrNext      = clock::now();
    auto ibWallNext  = clock::now();
    auto ibRampNext  = clock::now();
    auto ibFloorNext = clock::now();
    auto ibConeNext  = clock::now();
    auto deSpamNext  = clock::now();
    auto seSpamNext  = clock::now();

    while (m_running.load()) {
        auto now = clock::now();

        // Snapshot all configs under lock
        GlobalCfg            global;
        DoubleEditCfg        de;
        DragEditCfg          drag;
        ShotgunPulloutCfg    shot;
        AutoBuildCfg         ab;
        PickUpCfg            pu;
        SingleEditCfg        se;
        InstantBuildSpamCfg  ibSpam;
        ItemPulloutCfg       ip;
        WallRetakeCfg        wr;
        PrefireCfg           pf;
        {
            std::lock_guard<std::mutex> lk(m_mutex);
            global  = m_global;
            de      = m_dEdit;
            drag    = m_drag;
            shot    = m_shotgun;
            ab      = m_autoBuild;
            pu      = m_pickup;
            se      = m_sEdit;
            ibSpam  = m_ibSpam;
            ip      = m_itemPullout;
            wr      = m_wallRetake;
            pf      = m_prefire;
        }

        // ══════════════════════════════════════════════
        //  MASTER TOGGLE — activer/désactiver toutes les macros
        // ══════════════════════════════════════════════
        if (global.masterToggleVK) {
            bool cur = isDown(global.masterToggleVK);
            if (cur && !masterTogWas) {
                bool newVal = !m_globalEnabled.load();
                m_globalEnabled.store(newVal);
                if (!newVal) {
                    // Désactivation : relâcher les touches éventuellement maintenues
                    if (m_buildActive.load()) {
                        input.send(ab.holdVK, false);
                        m_buildActive.store(false);
                        QMetaObject::invokeMethod(this, [this]() {
                            emit autoBuildToggled(false);
                        }, Qt::QueuedConnection);
                    }
                    // Réinitialiser les state machines et relâcher les touches
                    if (deSeq.id > 0) {
                        input.send(de.editVK,    false);
                        input.send(de.confirmVK, false);
                        deSeq.id = 0;
                    }
                    if (seSeq.id > 0) {
                        input.send(se.editVK,    false);
                        input.send(se.confirmVK, false);
                        seSeq.id = 0;
                    }
                }
                QMetaObject::invokeMethod(this, [this, newVal]() {
                    emit globalToggled(newVal);
                }, Qt::QueuedConnection);
            }
            masterTogWas = cur;
        }

        // Macros globalement désactivées → skip tout
        if (!m_globalEnabled.load()) {
#ifdef _WIN32
            Sleep(1);
#endif
            continue;
        }

        // ══════════════════════════════════════════════
        //  1. HOLD EDIT — state machine non-bloquante
        //  Maintenir trigger → édit+confirm en boucle.
        //  Relâcher → s'arrête proprement après le cycle.
        // ══════════════════════════════════════════════
        if (de.enabled && de.triggerVK) {
            bool held = isDown(de.triggerVK);

            // Démarrer un nouveau cycle si trigger tenu et séquence inactive
            if (held && deSeq.id == 0 && now >= deSpamNext) {
                deSeq.id = 1;
                deSeq.at = now;
            }

            if (deSeq.id > 0 && now >= deSeq.at) {
                auto t = clock::now();
                const int kH  = 16;
                const int dMs = std::max(de.delayMs, 25);
                switch (deSeq.id) {
                case 1: input.send(de.editVK,    true);  deSeq.id=2; deSeq.at=t+ms(kH);  break;
                case 2: input.send(de.editVK,    false); deSeq.id=3; deSeq.at=t+ms(dMs); break;
                case 3: input.send(de.confirmVK, true);  deSeq.id=4; deSeq.at=t+ms(kH);  break;
                case 4: input.send(de.confirmVK, false);
                        deSeq.id = 0;
                        deSpamNext = t + ms(de.repeatDelayMs);
                        break;
                default: deSeq.id = 0; break;
                }
            }
        }

        // ══════════════════════════════════════════════
        //  2. DRAG EDIT
        //  Zéro délai avant le drag : edit + reset en tap 5ms
        //  Seul delayMs compte (fenêtre de drag après le reset)
        // ══════════════════════════════════════════════
        if (drag.enabled && drag.triggerVK) {
            bool cur = isDown(drag.triggerVK);
            if (cur && !dragWas) {
                // ① Ouvre l'édit (tap minimal)
                input.send(drag.editVK, true);
                Sleep(5);
                input.send(drag.editVK, false);
                // ② Reset (tap minimal — reste en mode édit)
                input.send(drag.resetVK, true);
                Sleep(5);
                input.send(drag.resetVK, false);
                // ③ Hold confirm — LA fenêtre de drag commence ici
                input.send(drag.holdVK, true);
                Sleep(drag.delayMs);
                // ④ Relâche → confirme l'édit
                input.send(drag.holdVK, false);
            }
            dragWas = cur;
        }

        // ══════════════════════════════════════════════
        //  3. SHOTGUN PULLOUT
        // ══════════════════════════════════════════════
        if (shot.enabled && shot.watchVK) {
            bool cur = isDown(shot.watchVK);
            if (shotgunWas && !cur) {
                Sleep(shot.delayMs);
                input.send(shot.shotgunVK, true);
                Sleep(15);
                input.send(shot.shotgunVK, false);
            }
            shotgunWas = cur;
        }

        // ══════════════════════════════════════════════
        //  4. AUTO BUILD
        // ══════════════════════════════════════════════
        if (ab.enabled && ab.triggerVK) {
            bool cur = isDown(ab.triggerVK);
            if (cur && !buildTrigWas) {
                bool wasActive = m_buildActive.load();
                if (!wasActive) {
                    input.send(ab.holdVK, true);
                    m_buildActive.store(true);
                    buildRepeat = now;
                    QMetaObject::invokeMethod(this, [this]() {
                        emit autoBuildToggled(true);
                    }, Qt::QueuedConnection);
                } else {
                    input.send(ab.holdVK, false);
                    m_buildActive.store(false);
                    QMetaObject::invokeMethod(this, [this]() {
                        emit autoBuildToggled(false);
                    }, Qt::QueuedConnection);
                }
            }
            buildTrigWas = cur;
        }

        // Maintenir le hold vivant toutes les 50 ms
        if (m_buildActive.load() && ab.holdVK) {
            if (now >= buildRepeat) {
                input.send(ab.holdVK, true);
                buildRepeat = now + ms(50);
            }
        }

        // Auto build désactivé globalement mais encore actif → relâcher
        if (!ab.enabled && m_buildActive.load()) {
            input.send(ab.holdVK, false);
            m_buildActive.store(false);
            QMetaObject::invokeMethod(this, [this]() {
                emit autoBuildToggled(false);
            }, Qt::QueuedConnection);
        }

        // ══════════════════════════════════════════════
        //  5. PICK UP
        // ══════════════════════════════════════════════
        if (pu.enabled && pu.triggerVK && isDown(pu.triggerVK)) {
            if (now >= pickupNext) {
                if (pu.triggerVK == pu.pickupVK) {
                    input.send(pu.pickupVK, false);
                    Sleep(15);
                    input.send(pu.pickupVK, true);
                } else {
                    input.send(pu.pickupVK, true);
                    Sleep(20);
                    input.send(pu.pickupVK, false);
                }
                int period = pu.cps > 0 ? 1000 / pu.cps : 100;
                pickupNext = now + ms(period);
            }
        }

        // ══════════════════════════════════════════════
        //  6. SINGLE EDIT — state machine non-bloquante
        // ══════════════════════════════════════════════
        if (se.enabled && se.triggerVK) {
            bool cur    = isDown(se.triggerVK);
            bool rising = cur && !seditWas;
            bool spamOk = cur && seditWas && se.holdToSpam
                          && seSeq.id == 0 && now >= seSpamNext;

            if ((rising || spamOk) && seSeq.id == 0) {
                seSeq.id = 1;
                seSeq.at = now;
            }

            if (seSeq.id > 0 && now >= seSeq.at) {
                const int kH = 16;
                switch (seSeq.id) {
                case 1: input.send(se.editVK,    true);  seSeq.id=2; seSeq.at=now+ms(kH);         break;
                case 2: input.send(se.editVK,    false); seSeq.id=3; seSeq.at=now+ms(se.delayMs); break;
                case 3: input.send(se.confirmVK, true);  seSeq.id=4; seSeq.at=now+ms(kH);         break;
                case 4: input.send(se.confirmVK, false);
                        seSeq.id = 0;
                        if (se.holdToSpam) {
                            int p = se.spamCps > 0 ? 1000/se.spamCps : 300;
                            seSpamNext = now + ms(p);
                        }
                        break;
                }
            }
            seditWas = cur;
        }

        // ══════════════════════════════════════════════
        //  7. INSTANT BUILD SPAM
        //  Chaque touche de pièce est son propre trigger :
        //  maintenir F1 = spam mur+pose, F3 = spam rampe+pose, etc.
        //  Les pièces sont indépendantes (timers séparés).
        // ══════════════════════════════════════════════
        if (ibSpam.enabled) {
            using tp = clock::time_point;
            auto doIBPiece = [&](bool on, int pieceVK, tp& nextTime) {
                if (!on || !pieceVK) return;
                if (!isDown(pieceVK)) return;
                if (now < nextTime)   return;
                // Re-tap la pièce pour s'assurer qu'elle est sélectionnée
                input.send(pieceVK, true);
                Sleep(8);
                input.send(pieceVK, false);
                Sleep(ibSpam.delayMs);
                input.send(ibSpam.placeVK, true);
                Sleep(8);
                input.send(ibSpam.placeVK, false);
                int period = ibSpam.cps > 0 ? 1000 / ibSpam.cps : 125;
                nextTime = clock::now() + ms(period);
            };
            doIBPiece(ibSpam.wallOn,  ibSpam.wallVK,  ibWallNext);
            doIBPiece(ibSpam.rampOn,  ibSpam.rampVK,  ibRampNext);
            doIBPiece(ibSpam.floorOn, ibSpam.floorVK, ibFloorNext);
            doIBPiece(ibSpam.coneOn,  ibSpam.coneVK,  ibConeNext);
        }

        // ══════════════════════════════════════════════
        //  8. ITEM PULLOUT — falling edge automatique
        // ══════════════════════════════════════════════
        if (ip.enabled) {
            bool curEdit  = ip.afterEdit  && ip.editConfirmVK ? isDown(ip.editConfirmVK) : false;
            bool curBuild = ip.afterBuild && ip.buildPlaceVK  ? isDown(ip.buildPlaceVK)  : false;
            if ((ipEditWas && !curEdit) || (ipBuildWas && !curBuild)) {
                Sleep(ip.delayMs);
                input.send(ip.itemVK, true);  Sleep(15); input.send(ip.itemVK, false);
            }
            ipEditWas  = curEdit;
            ipBuildWas = curBuild;
        }

        // ══════════════════════════════════════════════
        //  9. WALL RETAKE — hold + spam placement
        // ══════════════════════════════════════════════
        if (wr.enabled && wr.triggerVK && isDown(wr.triggerVK)) {
            if (now >= wrNext) {
                input.send(wr.buildVK, true);  Sleep(15); input.send(wr.buildVK, false);
                Sleep(5);
                input.send(wr.wallVK,  true);  Sleep(15); input.send(wr.wallVK,  false);
                Sleep(5);
                input.send(wr.placeVK, true);  Sleep(20); input.send(wr.placeVK, false);
                int period = wr.cps > 0 ? 1000 / wr.cps : 125;
                wrNext = now + ms(period);
            }
        }

        // ══════════════════════════════════════════════
        // 10. PREFIRE
        // ══════════════════════════════════════════════
        if (pf.enabled && pf.triggerVK && isDown(pf.triggerVK)) {
            if (now >= prefireNext) {
                input.send(pf.fireVK, true);
                Sleep(20);
                input.send(pf.fireVK, false);
                int period = pf.cps > 0 ? 1000 / pf.cps : 125;
                prefireNext = now + ms(period);
            }
        }

#ifdef _WIN32
        Sleep(1);
#endif
    }
}
