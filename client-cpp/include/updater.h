// ══════════════════════════════════════════════════════
//  updater.h — Auto-update checker
//  Compares current version with latest on server,
//  returns update info if a newer version is available.
// ══════════════════════════════════════════════════════
#pragma once
#include <string>

namespace updater {

// ── Version of this build ──
// Update this string each time you release a new .exe
static const char* CURRENT_VERSION = "5.0.7";

struct UpdateInfo {
    bool        available  = false;
    bool        mandatory  = false;   // true → user cannot skip this update
    std::string latestVersion;
    std::string downloadUrl;
    std::string changelog;
};

class UpdateChecker {
public:
    explicit UpdateChecker(const std::string& apiBaseUrl);

    // Performs a synchronous HTTP check.
    // Call from a background thread to avoid blocking the render loop.
    UpdateInfo check();

private:
    std::string m_apiUrl;

    // Returns >0 if a > b, 0 if equal, <0 if a < b (semver comparison)
    int compareVersions(const std::string& a, const std::string& b);

    std::string jsonExtract(const std::string& json, const std::string& key);
};

} // namespace updater
