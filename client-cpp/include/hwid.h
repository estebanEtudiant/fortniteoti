// ══════════════════════════════════════════════════════
//  hwid.h — Hardware ID Generation
//  Collects: CPU ID + Disk Serial + Windows SID → SHA256
// ══════════════════════════════════════════════════════
#pragma once
#include <string>

namespace hwid {
    // Generate the final HWID hash (SHA256 hex string, 64 chars)
    std::string generate();

    // Individual component getters (for machineInfo)
    std::string getCpuId();
    std::string getDiskSerial();
    std::string getWindowsSid();
    std::string getHostname();
    std::string getOsVersion();
}
