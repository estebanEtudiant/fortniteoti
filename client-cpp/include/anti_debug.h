// ══════════════════════════════════════════════════════
//  anti_debug.h — Basic anti-debugging checks
// ══════════════════════════════════════════════════════
#pragma once

namespace antidebug {
    // Returns true if a debugger is detected
    bool isDebuggerAttached();

    // Run all checks, returns true if clean
    bool checkIntegrity();
}
