// ══════════════════════════════════════════════════════
//  http_client.h — HTTPS client using WinHTTP
// ══════════════════════════════════════════════════════
#pragma once
#include <string>
#include <map>

namespace http {

    struct Response {
        int statusCode;
        std::string body;
        bool success; // true if 2xx
    };

    class Client {
    public:
        Client(const std::string& baseUrl, const std::string& userAgent = "FnOptimizer/2026");
        ~Client();

        Response post(const std::string& path, const std::string& jsonBody,
                      const std::map<std::string, std::string>& headers = {});
        Response get(const std::string& path,
                     const std::map<std::string, std::string>& headers = {});

    private:
        std::string m_baseUrl;
        std::string m_userAgent;
        std::string m_host;
        int m_port;
        bool m_https;

        void parseUrl(const std::string& url);
    };

} // namespace http
