// ══════════════════════════════════════════════════════
//  licensing.h — License Client
//  Handles: Activation, Heartbeat, Offline mode, Token storage
// ══════════════════════════════════════════════════════
#pragma once
#include <string>
#include <functional>

namespace licensing {

    enum class Status {
        VALID,
        EXPIRED,
        BANNED,
        HWID_MISMATCH,
        INVALID_KEY,
        NETWORK_ERROR,
        RATE_LIMITED,
        DEBUGGER_DETECTED,
        NOT_ACTIVATED,
    };

    struct LicenseInfo {
        Status status;
        std::string plan;
        std::string expiresAt;
        std::string message;
    };

    class LicenseClient {
    public:
        LicenseClient(const std::string& apiBaseUrl);
        ~LicenseClient();

        // Main activation flow
        LicenseInfo activate(const std::string& licenseKey);

        // Periodic heartbeat (call every 5 min from a thread)
        Status heartbeat();

        // Check if can run (online or offline)
        bool isValid();

        // Get current license info
        LicenseInfo getInfo() const;

        // Start background heartbeat thread
        void startHeartbeatLoop(int intervalSeconds = 300);
        void stopHeartbeatLoop();

    private:
        std::string m_apiUrl;
        std::string m_hwid;
        std::string m_accessToken;
        std::string m_refreshToken;
        std::string m_offlineToken;
        std::string m_licenseKey;
        LicenseInfo m_info;
        bool m_heartbeatRunning;

        // Token storage (encrypted on disk)
        void saveTokens();
        bool loadTokens();
        void clearTokens();
        std::string getTokenFilePath();

        // Token refresh
        bool refreshAccessToken();

        // Offline validation
        bool validateOfflineToken();

        // Simple JSON helpers (no external dependency)
        std::string jsonExtract(const std::string& json, const std::string& key);
        std::string buildActivationJson(const std::string& key, const std::string& hwid);
        std::string buildHeartbeatJson(const std::string& hwid);
    };

} // namespace licensing
