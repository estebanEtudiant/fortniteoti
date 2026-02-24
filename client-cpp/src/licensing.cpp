// ══════════════════════════════════════════════════════
//  licensing.cpp — License Client Implementation
// ══════════════════════════════════════════════════════
#include "licensing.h"
#include "hwid.h"
#include "http_client.h"
#include "crypto_utils.h"
#include "anti_debug.h"

#define _WIN32_WINNT 0x0601
#define NOMINMAX
#include <windows.h>
#include <shlobj.h>
#include <fstream>
#include <sstream>
#include <thread>
#include <chrono>
#include <ctime>

namespace licensing {

    // ── XOR key for local token encryption ──
    static const char TOKEN_CIPHER_KEY[] = "FnOpt2026-Local-v1";

    LicenseClient::LicenseClient(const std::string& apiBaseUrl)
        : m_apiUrl(apiBaseUrl), m_heartbeatRunning(false)
    {
        m_info.status = Status::NOT_ACTIVATED;

        // Generate HWID once at startup
        m_hwid = hwid::generate();

        // Load saved tokens (used for refresh, not for offline validation)
        loadTokens();
    }

    LicenseClient::~LicenseClient() {
        stopHeartbeatLoop();
    }

    // ══════════════════════════════════════════════════
    //  ACTIVATION
    // ══════════════════════════════════════════════════
    LicenseInfo LicenseClient::activate(const std::string& licenseKey) {
        // Anti-debug check
        if (!antidebug::checkIntegrity()) {
            m_info = { Status::DEBUGGER_DETECTED, "", "", "Debugger detected. Close debugging tools." };
            return m_info;
        }

        m_licenseKey = licenseKey;

        // Build request body
        std::string body = buildActivationJson(licenseKey, m_hwid);

        // Send request
        http::Client client(m_apiUrl);
        auto resp = client.post("/api/v1/auth/activate", body);

        if (!resp.success) {
            // Parse error
            std::string errorMsg = jsonExtract(resp.body, "message");
            std::string errorCode = jsonExtract(resp.body, "error");

            if (resp.statusCode == 401) {
                m_info = { Status::INVALID_KEY, "", "", errorMsg.empty() ? "Invalid license key" : errorMsg };
            } else if (resp.statusCode == 403) {
                if (errorCode.find("HWID") != std::string::npos || errorMsg.find("machine") != std::string::npos) {
                    m_info = { Status::HWID_MISMATCH, "", "", errorMsg };
                } else if (errorMsg.find("expired") != std::string::npos) {
                    m_info = { Status::EXPIRED, "", "", errorMsg };
                } else if (errorMsg.find("banned") != std::string::npos) {
                    m_info = { Status::BANNED, "", "", errorMsg };
                } else {
                    m_info = { Status::INVALID_KEY, "", "", errorMsg };
                }
            } else if (resp.statusCode == 429) {
                m_info = { Status::RATE_LIMITED, "", "", "Too many attempts. Wait and try again." };
            } else if (resp.statusCode == 0) {
                m_info = { Status::NETWORK_ERROR, "", "", "Cannot reach licensing server. Internet connection required." };
            } else {
                m_info = { Status::NETWORK_ERROR, "", "", "Server error: " + std::to_string(resp.statusCode) };
            }

            return m_info;
        }

        // Parse successful response
        m_accessToken = jsonExtract(resp.body, "accessToken");
        m_refreshToken = jsonExtract(resp.body, "refreshToken");
        m_offlineToken = jsonExtract(resp.body, "offlineToken");

        std::string plan = jsonExtract(resp.body, "plan");
        std::string expiresAt = jsonExtract(resp.body, "licenseExpiresAt");

        // Save tokens to disk (encrypted)
        saveTokens();

        m_info = { Status::VALID, plan, expiresAt, "License activated successfully" };
        return m_info;
    }

    // ══════════════════════════════════════════════════
    //  HEARTBEAT
    // ══════════════════════════════════════════════════
    Status LicenseClient::heartbeat() {
        if (m_accessToken.empty()) {
            if (!refreshAccessToken()) {
                return Status::NOT_ACTIVATED;
            }
        }

        // Anti-debug check (periodic)
        if (!antidebug::checkIntegrity()) {
            m_info.status = Status::DEBUGGER_DETECTED;
            return Status::DEBUGGER_DETECTED;
        }

        std::string body = buildHeartbeatJson(m_hwid);

        http::Client client(m_apiUrl);
        std::map<std::string, std::string> headers;
        headers["Authorization"] = "Bearer " + m_accessToken;

        auto resp = client.post("/api/v1/auth/heartbeat", body, headers);

        if (resp.statusCode == 401) {
            // Token expired — try refresh
            if (refreshAccessToken()) {
                // Retry heartbeat with new token
                headers["Authorization"] = "Bearer " + m_accessToken;
                resp = client.post("/api/v1/auth/heartbeat", body, headers);
            }
        }

        if (!resp.success) {
            if (resp.statusCode == 0) {
                return Status::NETWORK_ERROR;
            }

            std::string status = jsonExtract(resp.body, "status");
            if (status == "banned") {
                m_info.status = Status::BANNED;
                clearTokens();
                return Status::BANNED;
            } else if (status == "expired") {
                m_info.status = Status::EXPIRED;
                clearTokens();
                return Status::EXPIRED;
            }

            return Status::NETWORK_ERROR;
        }

        std::string status = jsonExtract(resp.body, "status");
        if (status == "banned") {
            m_info.status = Status::BANNED;
            clearTokens();
            return Status::BANNED;
        } else if (status == "expired") {
            m_info.status = Status::EXPIRED;
            clearTokens();
            return Status::EXPIRED;
        }

        m_info.status = Status::VALID;
        return Status::VALID;
    }

    bool LicenseClient::isValid() {
        return m_info.status == Status::VALID;
    }

    LicenseInfo LicenseClient::getInfo() const {
        return m_info;
    }

    // ══════════════════════════════════════════════════
    //  HEARTBEAT LOOP (background thread)
    // ══════════════════════════════════════════════════
    void LicenseClient::startHeartbeatLoop(int intervalSeconds) {
        m_heartbeatRunning = true;
        std::thread([this, intervalSeconds]() {
            while (m_heartbeatRunning) {
                std::this_thread::sleep_for(std::chrono::seconds(intervalSeconds));
                if (!m_heartbeatRunning) break;

                Status result = heartbeat();
                if (result == Status::BANNED || result == Status::EXPIRED) {
                    // License revoked — the main app should check isValid()
                    break;
                }
            }
        }).detach();
    }

    void LicenseClient::stopHeartbeatLoop() {
        m_heartbeatRunning = false;
    }

    // ══════════════════════════════════════════════════
    //  TOKEN MANAGEMENT
    // ══════════════════════════════════════════════════
    bool LicenseClient::refreshAccessToken() {
        if (m_refreshToken.empty()) return false;

        std::string body = "{\"refreshToken\":\"" + m_refreshToken + "\"}";
        http::Client client(m_apiUrl);
        auto resp = client.post("/api/v1/auth/refresh", body);

        if (resp.success) {
            m_accessToken = jsonExtract(resp.body, "accessToken");
            saveTokens();
            return !m_accessToken.empty();
        }

        return false;
    }

    // Base64url decode helper for JWT payload parsing
    static std::string base64UrlDecode(const std::string& input) {
        std::string b64 = input;
        // Replace URL-safe chars
        for (auto& c : b64) {
            if (c == '-') c = '+';
            else if (c == '_') c = '/';
        }
        // Pad to multiple of 4
        while (b64.size() % 4 != 0) b64 += '=';

        static const std::string chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        std::string result;
        int val = 0, bits = -8;
        for (unsigned char c : b64) {
            if (c == '=') break;
            auto pos = chars.find(c);
            if (pos == std::string::npos) continue;
            val = (val << 6) + static_cast<int>(pos);
            bits += 6;
            if (bits >= 0) {
                result += static_cast<char>((val >> bits) & 0xFF);
                bits -= 8;
            }
        }
        return result;
    }

    bool LicenseClient::validateOfflineToken() {
        if (m_offlineToken.empty()) return false;

        // Parse JWT: header.payload.signature
        auto dot1 = m_offlineToken.find('.');
        if (dot1 == std::string::npos) return false;
        auto dot2 = m_offlineToken.find('.', dot1 + 1);
        if (dot2 == std::string::npos) return false;

        // Decode payload
        std::string payloadB64 = m_offlineToken.substr(dot1 + 1, dot2 - dot1 - 1);
        std::string payload = base64UrlDecode(payloadB64);

        // Extract "exp" (JWT expiry timestamp in seconds)
        std::string expStr;
        auto expPos = payload.find("\"exp\"");
        if (expPos != std::string::npos) {
            auto colonPos = payload.find(':', expPos);
            if (colonPos != std::string::npos) {
                auto start = colonPos + 1;
                while (start < payload.size() && (payload[start] == ' ' || payload[start] == '\t')) start++;
                auto end = payload.find_first_of(",}", start);
                if (end != std::string::npos) {
                    expStr = payload.substr(start, end - start);
                }
            }
        }

        if (expStr.empty()) {
            // No exp claim found — trust the token if it was saved
            return true;
        }

        // Compare with current time
        long long expTime = 0;
        try { expTime = std::stoll(expStr); } catch (...) { return true; }

        long long now = static_cast<long long>(time(nullptr));

        // Token is valid if not yet expired
        return now < expTime;
    }

    std::string LicenseClient::getTokenFilePath() {
        char appData[MAX_PATH];
        SHGetFolderPathA(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, appData);
        std::string dir = std::string(appData) + "\\FnOptimizer2026";
        CreateDirectoryA(dir.c_str(), NULL);
        return dir + "\\.license";
    }

    void LicenseClient::saveTokens() {
        std::string data;
        data += m_accessToken + "\n";
        data += m_refreshToken + "\n";
        data += m_offlineToken + "\n";
        data += m_licenseKey + "\n";

        // Encrypt with XOR
        std::string encrypted = crypto::xorCipher(data, TOKEN_CIPHER_KEY);

        std::ofstream file(getTokenFilePath(), std::ios::binary);
        if (file.is_open()) {
            file.write(encrypted.c_str(), encrypted.size());
            file.close();

            // Hide the file
            SetFileAttributesA(getTokenFilePath().c_str(), FILE_ATTRIBUTE_HIDDEN);
        }
    }

    bool LicenseClient::loadTokens() {
        std::ifstream file(getTokenFilePath(), std::ios::binary);
        if (!file.is_open()) return false;

        std::string encrypted((std::istreambuf_iterator<char>(file)),
                               std::istreambuf_iterator<char>());
        file.close();

        if (encrypted.empty()) return false;

        std::string data = crypto::xorCipher(encrypted, TOKEN_CIPHER_KEY);

        // Parse lines
        std::istringstream stream(data);
        std::string line;

        if (std::getline(stream, line)) m_accessToken = line;
        if (std::getline(stream, line)) m_refreshToken = line;
        if (std::getline(stream, line)) m_offlineToken = line;
        if (std::getline(stream, line)) m_licenseKey = line;

        return !m_refreshToken.empty();
    }

    void LicenseClient::clearTokens() {
        m_accessToken.clear();
        m_refreshToken.clear();
        m_offlineToken.clear();
        DeleteFileA(getTokenFilePath().c_str());
    }

    // ══════════════════════════════════════════════════
    //  MINIMAL JSON HELPERS (no external dependency)
    // ══════════════════════════════════════════════════
    std::string LicenseClient::jsonExtract(const std::string& json, const std::string& key) {
        std::string searchKey = "\"" + key + "\"";
        auto pos = json.find(searchKey);
        if (pos == std::string::npos) return "";

        pos = json.find(':', pos + searchKey.size());
        if (pos == std::string::npos) return "";

        // Skip whitespace
        pos++;
        while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\t')) pos++;

        if (pos >= json.size()) return "";

        if (json[pos] == '"') {
            // String value
            pos++;
            auto end = json.find('"', pos);
            if (end == std::string::npos) return "";
            return json.substr(pos, end - pos);
        } else if (json[pos] == 'n' && json.substr(pos, 4) == "null") {
            return "";
        } else {
            // Number or boolean
            auto end = json.find_first_of(",}", pos);
            if (end == std::string::npos) return "";
            return json.substr(pos, end - pos);
        }
    }

    std::string LicenseClient::buildActivationJson(const std::string& key, const std::string& hwidHash) {
        std::string nonce = crypto::generateNonce(16);
        long long timestamp = static_cast<long long>(time(nullptr)) * 1000;

        // Build machine info
        std::string os = hwid::getOsVersion();
        std::string cpu = hwid::getCpuId().substr(0, 16); // Truncated
        std::string hostname = hwid::getHostname();

        std::ostringstream ss;
        ss << "{"
           << "\"key\":\"" << key << "\","
           << "\"hwid\":\"" << hwidHash << "\","
           << "\"nonce\":\"" << nonce << "\","
           << "\"timestamp\":" << timestamp << ","
           << "\"machineInfo\":{"
           << "\"os\":\"" << os << "\","
           << "\"cpu\":\"" << cpu << "\","
           << "\"hostname\":\"" << hostname << "\","
           << "\"appVersion\":\"2026.1.0\""
           << "}"
           << "}";
        return ss.str();
    }

    std::string LicenseClient::buildHeartbeatJson(const std::string& hwidHash) {
        return "{\"hwid\":\"" + hwidHash + "\"}";
    }

} // namespace licensing
