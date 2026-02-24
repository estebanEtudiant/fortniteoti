// ══════════════════════════════════════════════════════
//  crypto_utils.h — Crypto utilities
// ══════════════════════════════════════════════════════
#pragma once
#include <string>

namespace crypto {
    // SHA256 hash → 64-char hex string (uses Windows CNG)
    std::string sha256(const std::string& input);

    // Generate random nonce (hex string)
    std::string generateNonce(size_t byteLength = 16);

    // XOR encrypt/decrypt a string (simple obfuscation for strings in binary)
    std::string xorCipher(const std::string& data, const std::string& key);

    // Decode an obfuscated string at runtime
    std::string deobfuscate(const char* encoded, size_t len, const char* key, size_t keyLen);
}
