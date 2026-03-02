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
void MacroEngine::setDoubleEdit    (const DoubleEditCfg&     c) { std::lock_guard<std::mutex> l(m_mutex); m_dEdit     = c; }
void MacroEngine::setDragEdit      (const DragEditCfg&       c) { std::lock_guard<std::mutex> l(m_mutex); m_drag      = c; }
void MacroEngine::setShotgunPullout(const ShotgunPulloutCfg& c) { std::lock_guard<std::mutex> l(m_mutex); m_shotgun   = c; }
void MacroEngine::setAutoBuild     (const AutoBuildCfg&      c) { std::lock_guard<std::mutex> l(m_mutex); m_autoBuild = c; }
void MacroEngine::setPickUp        (const PickUpCfg&         c) { std::lock_guard<std::mutex> l(m_mutex); m_pickup    = c; }

// ── Engine ────────────────────────────────────────────────────────────────────
void MacroEngine::startEngine() {
    if (m_running.exchange(true)) return;
    // Initialise the input backend (Interception or SendInput)
    InputSender::instance().init();
    m_thread = std::thread(&MacroEngine::pollLoop, this);
}

void MacroEngine::stopEngine() {
    // Release any held key before stopping
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

    // Rising / falling edge state
    bool deditWas     = false;
    bool dragWas      = false;
    bool shotgunWas   = false;
    bool buildTrigWas = false;

    // Timing for hold-based macros
    auto pickupNext  = clock::now();
    auto buildRepeat = clock::now();

    while (m_running.load()) {
        auto now = clock::now();

        // Snapshot all configs under lock
        DoubleEditCfg     de;
        DragEditCfg       drag;
        ShotgunPulloutCfg shot;
        AutoBuildCfg      ab;
        PickUpCfg         pu;
        {
            std::lock_guard<std::mutex> lk(m_mutex);
            de   = m_dEdit;
            drag = m_drag;
            shot = m_shotgun;
            ab   = m_autoBuild;
            pu   = m_pickup;
        }

        // ══════════════════════════════════════════════
        //  1. DOUBLE EDIT
        // ══════════════════════════════════════════════
        if (de.enabled && de.triggerVK) {
            bool cur = isDown(de.triggerVK);
            if (cur && !deditWas) {

                if (de.useSprint && de.sprintVK) input.send(de.sprintVK, true);
                if (de.useCrouch && de.crouchVK) input.send(de.crouchVK, true);

                // Temps minimum de hold : 1 frame @ 60fps = 16ms, on prend 20ms plancher
                // Pour Edit on Release : Fortnite doit voir l'édit ouvert → min 50ms
                int holdMs  = std::max(de.delayMs / 2, 20);
                int holdEOR = std::max(de.delayMs,     50); // Edit on Release hold

                if (de.editOnRelease) {
                    // Fortnite "Edit on Release" :
                    //   appuyer editVK ouvre l'édit (Fortnite attend le hold),
                    //   relâcher confirme. On tient suffisamment longtemps.
                    input.send(de.editVK, true);
                    Sleep(holdEOR);                 // hold → édit s'ouvre
                    input.send(de.editVK, false);   // release = confirm 1er édit
                    Sleep(de.delayMs);
                    input.send(de.editVK, true);
                    Sleep(holdEOR);
                    input.send(de.editVK, false);   // release = confirm 2ème édit
                } else {
                    // Mode standard : touche confirm séparée
                    input.send(de.editVK, true);
                    Sleep(holdMs);
                    input.send(de.editVK, false);
                    Sleep(de.delayMs);
                    input.send(de.confirmVK, true);
                    Sleep(20);
                    input.send(de.confirmVK, false);

                    Sleep(de.delayMs);

                    input.send(de.editVK, true);
                    Sleep(holdMs);
                    input.send(de.editVK, false);
                    Sleep(de.delayMs);
                    input.send(de.confirmVK, true);
                    Sleep(20);
                    input.send(de.confirmVK, false);
                }

                if (de.useSprint && de.sprintVK) input.send(de.sprintVK, false);
                if (de.useCrouch && de.crouchVK) input.send(de.crouchVK, false);
            }
            deditWas = cur;
        }

        // ══════════════════════════════════════════════
        //  2. DRAG EDIT
        // ══════════════════════════════════════════════
        if (drag.enabled && drag.triggerVK) {
            bool cur = isDown(drag.triggerVK);
            if (cur && !dragWas) {
                // ① Ouvre l'édit (tap)
                input.send(drag.editVK, true);
                Sleep(std::max(drag.delayMs / 2, 20));
                input.send(drag.editVK, false);

                // ② Reset en mode édit → vide la sélection (reste en édit)
                input.send(drag.resetVK, true);
                Sleep(20);
                input.send(drag.resetVK, false);
                Sleep(10);

                // ③ Hold confirm (LMB) — le joueur drage ses cases pendant ce temps
                input.send(drag.holdVK, true);
                Sleep(drag.delayMs);

                // ④ Relâche confirm → CONFIRME l'édit
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
                    // Même touche : UP bref → re-press DOWN
                    // La touche se termine en état DOWN → isDown() reste true
                    // à la prochaine itération (le spam continue tant que tenu)
                    input.send(pu.pickupVK, false); // Fortnite voit un relâchement
                    Sleep(15);
                    input.send(pu.pickupVK, true);  // Fortnite voit un nouveau press
                } else {
                    // Touches différentes : DOWN → UP classique
                    input.send(pu.pickupVK, true);
                    Sleep(20);
                    input.send(pu.pickupVK, false);
                }
                int period = (pu.cps > 0) ? (1000 / pu.cps) : 100;
                pickupNext = now + ms(period);
            }
        }

#ifdef _WIN32
        Sleep(1);
#endif
    }
}
