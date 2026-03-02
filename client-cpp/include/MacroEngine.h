// ══════════════════════════════════════════════════════
//  MacroEngine.h — 5 macros Fortnite
//  1. Double Edit   2. Drag Edit   3. Shotgun Pullout
//  4. Auto Build    5. Pick Up
// ══════════════════════════════════════════════════════
#pragma once
#include <QObject>
#include <atomic>
#include <thread>
#include <mutex>

class MacroEngine : public QObject {
    Q_OBJECT
public:

    // ─────────────────────────────────────────────────
    //  1. DOUBLE EDIT
    //  triggerVK pressé → (sprint/crouch optionnel) →
    //  editVK → delay → confirmVK → delay →
    //  editVK → delay → confirmVK
    // ─────────────────────────────────────────────────
    struct DoubleEditCfg {
        bool enabled       = false;
        int  triggerVK     = 'G';    // touche déclencheur (souvent = editVK)
        int  editVK        = 'G';    // ouvre le mode edit
        int  confirmVK     = 0x01;   // LMB — valide l'edit (ignoré si editOnRelease)
        int  delayMs       = 50;     // délai entre chaque action
        bool editOnRelease = false;  // relâcher editVK confirme (option Fortnite)
        bool useSprint     = false;  // maintenir sprint pendant la séquence
        int  sprintVK      = 0x10;   // VK_SHIFT
        bool useCrouch     = false;  // maintenir crouch pendant la séquence
        int  crouchVK      = 'C';
    };

    // ─────────────────────────────────────────────────
    //  2. DRAG EDIT
    //  triggerVK pressé → editVK (ouvre) → maintient
    //  holdVK (confirm) pendant delayMs → resetVK →
    //  relâche holdVK
    // ─────────────────────────────────────────────────
    struct DragEditCfg {
        bool enabled    = false;
        int  triggerVK  = 0x05;   // M4 — déclencheur
        int  editVK     = 'G';    // bind edit
        int  resetVK    = 'R';    // bind reset edit
        int  holdVK     = 0x01;   // LMB — tenu pendant le drag
        int  delayMs    = 50;     // durée du drag (ms)
    };

    // ─────────────────────────────────────────────────
    //  3. SHOTGUN PULLOUT
    //  Dès que watchVK est relâché → appuie sur
    //  shotgunVK (sortir le pompe automatiquement)
    // ─────────────────────────────────────────────────
    struct ShotgunPulloutCfg {
        bool enabled    = false;
        int  watchVK    = 0x01;   // LMB — surveille ce relâchement
        int  shotgunVK  = '1';    // slot arme à sortir
        int  delayMs    = 20;     // délai avant le switch
    };

    // ─────────────────────────────────────────────────
    //  4. AUTO BUILD
    //  triggerVK toggle ON/OFF → maintient holdVK
    //  en continu (le programme hold pour vous)
    // ─────────────────────────────────────────────────
    struct AutoBuildCfg {
        bool enabled    = false;
        int  triggerVK  = 'Z';    // toggle activer/désactiver
        int  holdVK     = 0x01;   // touche maintenue (LMB → poser)
    };

    // ─────────────────────────────────────────────────
    //  5. PICK UP
    //  Maintenir triggerVK → spam pickupVK au CPS
    //  configuré (ramasser plus vite)
    // ─────────────────────────────────────────────────
    struct PickUpCfg {
        bool enabled    = false;
        int  triggerVK  = 0x04;   // MMB — maintenir pour activer
        int  pickupVK   = 'E';    // touche ramassage
        int  cps        = 10;     // répétitions/seconde
    };

    explicit MacroEngine(QObject* parent = nullptr);
    ~MacroEngine();

    void setDoubleEdit    (const DoubleEditCfg&     c);
    void setDragEdit      (const DragEditCfg&       c);
    void setShotgunPullout(const ShotgunPulloutCfg& c);
    void setAutoBuild     (const AutoBuildCfg&      c);
    void setPickUp        (const PickUpCfg&         c);

    // Call after all setters — switches state live
    bool isAutoBuildActive() const { return m_buildActive.load(); }

    void startEngine();
    void stopEngine();

signals:
    void autoBuildToggled(bool on);

private:
    std::atomic<bool> m_running{false};
    std::atomic<bool> m_buildActive{false};
    std::thread       m_thread;
    std::mutex        m_mutex;

    DoubleEditCfg     m_dEdit;
    DragEditCfg       m_drag;
    ShotgunPulloutCfg m_shotgun;
    AutoBuildCfg      m_autoBuild;
    PickUpCfg         m_pickup;

    void pollLoop();
    static bool isDown(int vk);
};
