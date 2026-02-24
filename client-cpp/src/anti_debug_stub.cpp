#include "anti_debug.h"

namespace antidebug {
    bool isDebuggerAttached() { return false; }
    bool checkIntegrity()     { return true;  }
}
