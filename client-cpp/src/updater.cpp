// ══════════════════════════════════════════════════════
//  updater.cpp — Auto-update checker implementation
// ══════════════════════════════════════════════════════
#include "updater.h"
#include "http_client.h"

#include <sstream>
#include <vector>
#include <stdexcept>

namespace updater {

UpdateChecker::UpdateChecker(const std::string& apiBaseUrl)
    : m_apiUrl(apiBaseUrl) {}

UpdateInfo UpdateChecker::check() {
    UpdateInfo info;

    try {
        http::Client client(m_apiUrl);
        auto res = client.get("/api/v1/software/latest");

        if (!res.success || res.statusCode == 404) return info;

        std::string latest    = jsonExtract(res.body, "version");
        std::string url       = jsonExtract(res.body, "url");
        std::string chlog     = jsonExtract(res.body, "changelog");
        std::string mandatory = jsonExtract(res.body, "mandatory");

        if (latest.empty()) return info;

        if (compareVersions(latest, CURRENT_VERSION) > 0) {
            info.available     = true;
            info.mandatory     = (mandatory == "true" || mandatory == "1");
            info.latestVersion = latest;
            info.downloadUrl   = url;
            info.changelog     = chlog;
        }
    } catch (...) {
        // Network failure — silently ignore, update check is non-critical
    }

    return info;
}

int UpdateChecker::compareVersions(const std::string& a, const std::string& b) {
    auto parse = [](const std::string& v) -> std::vector<int> {
        std::vector<int> parts;
        std::istringstream ss(v);
        std::string token;
        while (std::getline(ss, token, '.')) {
            try   { parts.push_back(std::stoi(token)); }
            catch (...) { parts.push_back(0); }
        }
        while (parts.size() < 3) parts.push_back(0);
        return parts;
    };

    auto va = parse(a);
    auto vb = parse(b);

    for (size_t i = 0; i < 3; ++i) {
        if (va[i] > vb[i]) return  1;
        if (va[i] < vb[i]) return -1;
    }
    return 0;
}

std::string UpdateChecker::jsonExtract(const std::string& json, const std::string& key) {
    std::string search = "\"" + key + "\"";
    auto pos = json.find(search);
    if (pos == std::string::npos) return "";

    pos = json.find(':', pos + search.size());
    if (pos == std::string::npos) return "";

    pos = json.find_first_not_of(" \t\r\n", pos + 1);
    if (pos == std::string::npos) return "";

    if (json[pos] == '"') {
        ++pos;
        std::string result;
        for (size_t i = pos; i < json.size(); ++i) {
            if (json[i] == '"') break;
            if (json[i] == '\\' && i + 1 < json.size()) {
                ++i;
                switch (json[i]) {
                    case 'n':  result += '\n'; break;
                    case 't':  result += '\t'; break;
                    case 'r':  result += '\r'; break;
                    default:   result += json[i]; break;
                }
            } else {
                result += json[i];
            }
        }
        return result;
    }

    auto end = json.find_first_of(",}]", pos);
    if (end == std::string::npos) end = json.size();
    std::string val = json.substr(pos, end - pos);
    while (!val.empty() && (val.back() == ' ' || val.back() == '\t' ||
                            val.back() == '\r' || val.back() == '\n'))
        val.pop_back();
    return val;
}

} // namespace updater
