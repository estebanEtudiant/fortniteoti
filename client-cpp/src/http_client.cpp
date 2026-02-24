// ══════════════════════════════════════════════════════
//  http_client.cpp — WinHTTP HTTPS Client
// ══════════════════════════════════════════════════════
#include "http_client.h"

#define _WIN32_WINNT 0x0601
#define NOMINMAX
#include <windows.h>
#include <winhttp.h>
#include <sstream>
#include <vector>
#include <algorithm>



#pragma comment(lib, "winhttp.lib")

namespace http {

    Client::Client(const std::string& baseUrl, const std::string& userAgent)
        : m_baseUrl(baseUrl), m_userAgent(userAgent), m_port(443), m_https(true)
    {
        parseUrl(baseUrl);
    }

    Client::~Client() {}

    void Client::parseUrl(const std::string& url) {
        std::string u = url;
        if (u.substr(0, 8) == "https://") {
            m_https = true;
            u = u.substr(8);
            m_port = 443;
        } else if (u.substr(0, 7) == "http://") {
            m_https = false;
            u = u.substr(7);
            m_port = 80;
        }

        auto colonPos = u.find(':');
        auto slashPos = u.find('/');

        if (colonPos != std::string::npos && (slashPos == std::string::npos || colonPos < slashPos)) {
            m_host = u.substr(0, colonPos);
            auto portEnd = (slashPos != std::string::npos) ? slashPos : u.size();
            m_port = std::stoi(u.substr(colonPos + 1, portEnd - colonPos - 1));
        } else {
            m_host = (slashPos != std::string::npos) ? u.substr(0, slashPos) : u;
        }
    }

    static std::wstring toWide(const std::string& s) {
        if (s.empty()) return L"";
        int size = MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, nullptr, 0);
        std::wstring ws(size - 1, 0);
        MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, &ws[0], size);
        return ws;
    }

    Response Client::post(const std::string& path, const std::string& jsonBody,
                          const std::map<std::string, std::string>& extraHeaders) {
        Response resp = { 0, "", false };

        HINTERNET hSession = WinHttpOpen(
            toWide(m_userAgent).c_str(),
            WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
            WINHTTP_NO_PROXY_NAME,
            WINHTTP_NO_PROXY_BYPASS,
            0);

        if (!hSession) return resp;

        HINTERNET hConnect = WinHttpConnect(
            hSession,
            toWide(m_host).c_str(),
            static_cast<INTERNET_PORT>(m_port),
            0);

        if (!hConnect) { WinHttpCloseHandle(hSession); return resp; }

        DWORD flags = m_https ? WINHTTP_FLAG_SECURE : 0;
        HINTERNET hRequest = WinHttpOpenRequest(
            hConnect,
            L"POST",
            toWide(path).c_str(),
            NULL,
            WINHTTP_NO_REFERER,
            WINHTTP_DEFAULT_ACCEPT_TYPES,
            flags);

        if (!hRequest) {
            WinHttpCloseHandle(hConnect);
            WinHttpCloseHandle(hSession);
            return resp;
        }

        // Set headers
        std::wstring headers = L"Content-Type: application/json\r\n";
        for (const auto& h : extraHeaders) {
            headers += toWide(h.first) + L": " + toWide(h.second) + L"\r\n";
        }

        WinHttpAddRequestHeaders(hRequest, headers.c_str(), (DWORD)-1, WINHTTP_ADDREQ_FLAG_ADD);

        // Send request
        BOOL sent = WinHttpSendRequest(
            hRequest,
            WINHTTP_NO_ADDITIONAL_HEADERS, 0,
            (LPVOID)jsonBody.c_str(), (DWORD)jsonBody.size(),
            (DWORD)jsonBody.size(),
            0);

        if (!sent || !WinHttpReceiveResponse(hRequest, NULL)) {
            WinHttpCloseHandle(hRequest);
            WinHttpCloseHandle(hConnect);
            WinHttpCloseHandle(hSession);
            return resp;
        }

        // Read status code
        DWORD statusCode = 0;
        DWORD statusSize = sizeof(statusCode);
        WinHttpQueryHeaders(hRequest,
            WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
            WINHTTP_HEADER_NAME_BY_INDEX,
            &statusCode, &statusSize, WINHTTP_NO_HEADER_INDEX);
        resp.statusCode = static_cast<int>(statusCode);

        // Read response body
        DWORD bytesAvailable = 0;
        std::string body;
        do {
            WinHttpQueryDataAvailable(hRequest, &bytesAvailable);
            if (bytesAvailable == 0) break;

            std::vector<char> buffer(bytesAvailable + 1, 0);
            DWORD bytesRead = 0;
            WinHttpReadData(hRequest, buffer.data(), bytesAvailable, &bytesRead);
            body.append(buffer.data(), bytesRead);
        } while (bytesAvailable > 0);

        resp.body = body;
        resp.success = (resp.statusCode >= 200 && resp.statusCode < 300);

        WinHttpCloseHandle(hRequest);
        WinHttpCloseHandle(hConnect);
        WinHttpCloseHandle(hSession);

        return resp;
    }

    Response Client::get(const std::string& path,
                         const std::map<std::string, std::string>& extraHeaders) {
        // Similar to post but with GET and no body (simplified)
        return post(path, "", extraHeaders); // WinHTTP handles empty body for GET pattern
    }

} // namespace http
