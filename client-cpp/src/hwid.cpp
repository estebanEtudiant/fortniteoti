// ══════════════════════════════════════════════════════
//  hwid.cpp — Hardware ID Generation Implementation
// ══════════════════════════════════════════════════════
#include "hwid.h"
#include "crypto_utils.h"

#define _WIN32_WINNT 0x0601
#define NOMINMAX
#include <windows.h>
#include <intrin.h>
#include <sddl.h>
#include <sstream>
#include <iomanip>

#pragma comment(lib, "advapi32.lib")

namespace hwid {

    std::string getCpuId() {
        int cpuInfo[4] = { 0 };
        std::stringstream ss;

        // CPUID leaf 0 (vendor)
        __cpuid(cpuInfo, 0);
        ss << std::hex << std::setfill('0');
        ss << std::setw(8) << cpuInfo[1]   // EBX
           << std::setw(8) << cpuInfo[3]   // EDX
           << std::setw(8) << cpuInfo[2];  // ECX

        // CPUID leaf 1 (processor info)
        __cpuid(cpuInfo, 1);
        ss << std::setw(8) << cpuInfo[0]   // EAX (stepping, model, family)
           << std::setw(8) << cpuInfo[3];  // EDX (feature flags)

        return ss.str();
    }

    std::string getDiskSerial() {
        char volumeName[MAX_PATH + 1] = { 0 };
        char fsName[MAX_PATH + 1] = { 0 };
        DWORD serialNumber = 0;
        DWORD maxComponentLen = 0;
        DWORD fsFlags = 0;

        // Get volume serial number of the system drive
        if (GetVolumeInformationA(
                "C:\\", volumeName, sizeof(volumeName),
                &serialNumber, &maxComponentLen, &fsFlags,
                fsName, sizeof(fsName))) {
            std::stringstream ss;
            ss << std::hex << std::setfill('0') << std::setw(8) << serialNumber;
            return ss.str();
        }

        // Fallback: use computer name
        char computerName[MAX_COMPUTERNAME_LENGTH + 1] = { 0 };
        DWORD size = sizeof(computerName);
        GetComputerNameA(computerName, &size);
        return std::string(computerName);
    }

    std::string getWindowsSid() {
        HANDLE hToken = NULL;
        if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &hToken)) {
            return "unknown-sid";
        }

        DWORD dwSize = 0;
        GetTokenInformation(hToken, TokenUser, NULL, 0, &dwSize);

        BYTE* buffer = new BYTE[dwSize];
        std::string sidStr = "unknown-sid";

        if (GetTokenInformation(hToken, TokenUser, buffer, dwSize, &dwSize)) {
            TOKEN_USER* pTokenUser = reinterpret_cast<TOKEN_USER*>(buffer);
            LPSTR strSid = nullptr;
            if (ConvertSidToStringSidA(pTokenUser->User.Sid, &strSid)) {
                sidStr = strSid;
                LocalFree(strSid);
            }
        }

        delete[] buffer;
        CloseHandle(hToken);
        return sidStr;
    }

    std::string getHostname() {
        char name[MAX_COMPUTERNAME_LENGTH + 1] = { 0 };
        DWORD size = sizeof(name);
        GetComputerNameA(name, &size);
        return std::string(name);
    }

    std::string getOsVersion() {
        // Use RtlGetVersion for accurate version
        typedef LONG(WINAPI* RtlGetVersionPtr)(PRTL_OSVERSIONINFOW);
        HMODULE hMod = GetModuleHandleW(L"ntdll.dll");
        if (!hMod) return "unknown";

        auto pRtlGetVersion = reinterpret_cast<RtlGetVersionPtr>(
            GetProcAddress(hMod, "RtlGetVersion"));
        if (!pRtlGetVersion) return "unknown";

        RTL_OSVERSIONINFOW osvi = {};
        osvi.dwOSVersionInfoSize = sizeof(osvi);
        pRtlGetVersion(&osvi);

        std::stringstream ss;
        ss << "Windows " << osvi.dwMajorVersion << "." << osvi.dwMinorVersion
           << " Build " << osvi.dwBuildNumber;
        return ss.str();
    }

    // ── Main HWID generation ──
    // Combines all identifiers and produces SHA256
    std::string generate() {
        std::string combined;
        combined += "CPUID:" + getCpuId() + "|";
        combined += "DISK:" + getDiskSerial() + "|";
        combined += "SID:" + getWindowsSid() + "|";
        // Add a static salt to make rainbow tables harder
        combined += "SALT:FnOpt2026-HWID-v1";

        return crypto::sha256(combined);
    }

} // namespace hwid
