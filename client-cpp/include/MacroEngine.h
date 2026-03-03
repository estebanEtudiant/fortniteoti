// ══════════════════════════════════════════════════════
//  MacroEngine.h — macros Fortnite
//  Global · Double Edit · Drag Edit · Shotgun Pullout
//  Auto Build · Pick Up · Single Edit · Instant Build Spam
//  Item Pullout · Wall Retake · Prefire
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
    //  GLOBAL — toggle maître
    // ─────────────────────────────────────────────────
    struct GlobalCfg {
        int masterToggleVK = 0;   // appuyer = activer/désactiver toutes les macros
    };

    // ─────────────────────────────────────────────────
    //  1. DOUBLE EDIT
    //  Maintenir trigger → édit+confirm en boucle.
    // ─────────────────────────────────────────────────
    struct DoubleEditCfg {
        bool enabled        = false;
        int  triggerVK      = 'G';
        int  editVK         = 'G';
        int  confirmVK      = 0x01;
        int  delayMs        = 50;    // délai édit→confirm
        int  repeatDelayMs  = 200;   // délai entre chaque cycle
    };

    // ─────────────────────────────────────────────────
    //  2. DRAG EDIT
    // ─────────────────────────────────────────────────
    struct DragEditCfg {
        bool enabled   = false;
        int  triggerVK = 0x05;
        int  editVK    = 'G';
        int  resetVK   = 'R';
        int  holdVK    = 0x01;
        int  delayMs   = 80;
    };

    // ─────────────────────────────────────────────────
    //  3. SHOTGUN PULLOUT
    // ─────────────────────────────────────────────────
    struct ShotgunPulloutCfg {
        bool enabled   = false;
        int  watchVK   = 0x01;
        int  shotgunVK = '1';
        int  delayMs   = 20;
    };

    // ─────────────────────────────────────────────────
    //  4. AUTO BUILD
    // ─────────────────────────────────────────────────
    struct AutoBuildCfg {
        bool enabled   = false;
        int  triggerVK = 'Z';
        int  holdVK    = 0x01;
    };

    // ─────────────────────────────────────────────────
    //  5. PICK UP
    // ─────────────────────────────────────────────────
    struct PickUpCfg {
        bool enabled   = false;
        int  triggerVK = 0x04;
        int  pickupVK  = 'E';
        int  cps       = 10;
    };

    // ─────────────────────────────────────────────────
    //  6. SINGLE EDIT
    // ─────────────────────────────────────────────────
    struct SingleEditCfg {
        bool enabled    = false;
        int  triggerVK  = 'F';
        int  editVK     = 'G';
        int  confirmVK  = 0x01;
        int  delayMs    = 50;
        bool holdToSpam = false;
        int  spamCps    = 5;
    };

    // ─────────────────────────────────────────────────
    //  7. INSTANT BUILD SPAM (4 pièces, 1 trigger)
    //  Maintenir trigger → spam au CPS configuré,
    //  en alternant les pièces actives.
    // ─────────────────────────────────────────────────
    struct InstantBuildSpamCfg {
        bool enabled  = false;
        // Pas de triggerVK global : chaque touche de pièce est son propre trigger
        bool wallOn   = true;  int wallVK  = 0x70;   // F1 → trigger ET sélection mur
        bool rampOn   = true;  int rampVK  = 0x72;   // F3 → trigger ET sélection rampe
        bool floorOn  = false; int floorVK = 0x71;   // F2 → trigger ET sélection sol
        bool coneOn   = false; int coneVK  = 0x73;   // F4 → trigger ET sélection cône
        // Placement
        int  placeVK  = 0x01;
        int  delayMs  = 30;    // délai entre sélection et pose
        int  cps      = 8;     // spam CPS quand tenu
    };

    // ─────────────────────────────────────────────────
    //  8. ITEM PULLOUT
    // ─────────────────────────────────────────────────
    struct ItemPulloutCfg {
        bool enabled       = false;
        int  itemVK        = '1';
        bool afterEdit     = true;
        int  editConfirmVK = 0x01;
        bool afterBuild    = false;
        int  buildPlaceVK  = 0x01;
        int  delayMs       = 25;
    };

    // ─────────────────────────────────────────────────
    //  9. WALL RETAKE
    // ─────────────────────────────────────────────────
    struct WallRetakeCfg {
        bool enabled   = false;
        int  triggerVK = 0x05;
        int  buildVK   = 'Q';
        int  wallVK    = 0x70;
        int  placeVK   = 0x01;
        int  cps       = 8;
    };

    // ─────────────────────────────────────────────────
    // 10. PREFIRE
    // ─────────────────────────────────────────────────
    struct PrefireCfg {
        bool enabled   = false;
        int  triggerVK = 0x02;
        int  fireVK    = 0x01;
        int  cps       = 8;
    };

    explicit MacroEngine(QObject* parent = nullptr);
    ~MacroEngine();

    void setGlobal          (const GlobalCfg&          c);
    void setDoubleEdit      (const DoubleEditCfg&       c);
    void setDragEdit        (const DragEditCfg&         c);
    void setShotgunPullout  (const ShotgunPulloutCfg&   c);
    void setAutoBuild       (const AutoBuildCfg&        c);
    void setPickUp          (const PickUpCfg&           c);
    void setSingleEdit      (const SingleEditCfg&       c);
    void setInstantBuildSpam(const InstantBuildSpamCfg& c);
    void setItemPullout     (const ItemPulloutCfg&      c);
    void setWallRetake      (const WallRetakeCfg&       c);
    void setPrefire         (const PrefireCfg&          c);

    bool isAutoBuildActive() const { return m_buildActive.load(); }
    bool isGlobalEnabled()   const { return m_globalEnabled.load(); }

    void startEngine();
    void stopEngine();

signals:
    void autoBuildToggled(bool on);
    void globalToggled(bool enabled);

private:
    std::atomic<bool>    m_running      {false};
    std::atomic<bool>    m_buildActive  {false};
    std::atomic<bool>    m_globalEnabled{true};
    std::thread          m_thread;
    std::mutex           m_mutex;

    GlobalCfg            m_global;
    DoubleEditCfg        m_dEdit;
    DragEditCfg          m_drag;
    ShotgunPulloutCfg    m_shotgun;
    AutoBuildCfg         m_autoBuild;
    PickUpCfg            m_pickup;
    SingleEditCfg        m_sEdit;
    InstantBuildSpamCfg  m_ibSpam;
    ItemPulloutCfg       m_itemPullout;
    WallRetakeCfg        m_wallRetake;
    PrefireCfg           m_prefire;

    void pollLoop();
    static bool isDown(int vk);
};
