// ══════════════════════════════════════════════════════
//  anti_debug.cpp — Basic anti-debugging
// ══════════════════════════════════════════════════════
#include "anti_debug.h"

#define _WIN32_WINNT 0x0601
#define NOMINMAX
#include <windows.h>
#include <tlhelp32.h>
#include <string>
#include <vector>
#include <algorithm>

namespace antidebug {

    // Check 1: IsDebuggerPresent API
    static bool check_api() {
        return IsDebuggerPresent() != FALSE;
    }

    // Check 2: CheckRemoteDebuggerPresent
    static bool check_remote() {
        BOOL debugged = FALSE;
        CheckRemoteDebuggerPresent(GetCurrentProcess(), &debugged);
        return debugged != FALSE;
    }

    // Check 3: NtGlobalFlag in PEB
    static bool check_peb() {
        // NtGlobalFlag at PEB offset 0x68 (x64) is set to 0x70 if debugged
#ifdef _WIN64
        PPEB peb = (PPEB)__readgsqword(0x60);
        DWORD flag = *(DWORD*)((BYTE*)peb + 0xBC);
#else
        PPEB peb = (PPEB)__readfsdword(0x30);
        DWORD flag = *(DWORD*)((BYTE*)peb + 0x68);
#endif
        return (flag & 0x70) != 0;
    }

    // Check 4: Known debugger process names
    static bool check_debugger_processes() {
        const std::vector<std::wstring> debuggers = {
            L"x64dbg.exe", L"x32dbg.exe", L"ollydbg.exe",
            L"ida.exe", L"ida64.exe", L"idag.exe", L"idag64.exe",
            L"dnspy.exe", L"cheatengine-x86_64.exe",
            L"processhacker.exe", L"httpdebugger.exe",
            L"fiddler.exe", L"wireshark.exe",
        };

        HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (hSnapshot == INVALID_HANDLE_VALUE) return false;

        PROCESSENTRY32W pe = {};
        pe.dwSize = sizeof(pe);

        if (Process32FirstW(hSnapshot, &pe)) {
            do {
                std::wstring name(pe.szExeFile);
                // Convert to lowercase
                std::transform(name.begin(), name.end(), name.begin(), ::towlower);

                for (const auto& dbg : debuggers) {
                    if (name == dbg) {
                        CloseHandle(hSnapshot);
                        return true;
                    }
                }
            } while (Process32NextW(hSnapshot, &pe));
        }

        CloseHandle(hSnapshot);
        return false;
    }

    // Check 5: Timing-based detection
    static bool check_timing() {
        LARGE_INTEGER freq, start, end;
        QueryPerformanceFrequency(&freq);
        QueryPerformanceCounter(&start);

        // Simple operation that should be fast
        volatile int x = 0;
        for (int i = 0; i < 100; i++) x += i;

        QueryPerformanceCounter(&end);

        // If this takes > 100ms, likely being debugged/stepped
        double elapsed = (double)(end.QuadPart - start.QuadPart) / freq.QuadPart;
        return elapsed > 0.1;
    }

    bool isDebuggerAttached() {
        return check_api() || check_remote() || check_debugger_processes();
    }

    bool checkIntegrity() {
        // Returns true if the environment is clean
        if (check_api()) return false;
        if (check_remote()) return false;
        if (check_debugger_processes()) return false;
        // check_timing() and check_peb() are more aggressive, use with caution
        return true;
    }

} // namespace antidebug
