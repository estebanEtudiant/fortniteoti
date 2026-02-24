// ══════════════════════════════════════════════════════
//  crypto_utils.cpp — SHA256 via Windows CNG, XOR obfuscation
// ══════════════════════════════════════════════════════
#include "crypto_utils.h"

#define _WIN32_WINNT 0x0601
#define NOMINMAX
#include <windows.h>
#include <bcrypt.h>
#include <ntstatus.h>
#include <sstream>
#include <iomanip>
#include <random>

#pragma comment(lib, "bcrypt.lib")

namespace crypto {

    std::string sha256(const std::string& input) {
        BCRYPT_ALG_HANDLE hAlg = NULL;
        BCRYPT_HASH_HANDLE hHash = NULL;
        BYTE hash[32]; // SHA256 = 32 bytes
        DWORD hashLen = 0;
        DWORD resultLen = 0;
        std::string result;

        if (BCryptOpenAlgorithmProvider(&hAlg, BCRYPT_SHA256_ALGORITHM, NULL, 0) != 0) {
            return "";
        }

        BCryptGetProperty(hAlg, BCRYPT_HASH_LENGTH, (PUCHAR)&hashLen, sizeof(hashLen), &resultLen, 0);

        if (BCryptCreateHash(hAlg, &hHash, NULL, 0, NULL, 0, 0) != 0) {
            BCryptCloseAlgorithmProvider(hAlg, 0);
            return "";
        }

        BCryptHashData(hHash, (PUCHAR)input.c_str(), (ULONG)input.size(), 0);
        BCryptFinishHash(hHash, hash, hashLen, 0);

        std::stringstream ss;
        ss << std::hex << std::setfill('0');
        for (DWORD i = 0; i < hashLen; i++) {
            ss << std::setw(2) << (int)hash[i];
        }
        result = ss.str();

        BCryptDestroyHash(hHash);
        BCryptCloseAlgorithmProvider(hAlg, 0);

        return result;
    }

    std::string generateNonce(size_t byteLength) {
        BCRYPT_ALG_HANDLE hAlg = NULL;
        std::vector<BYTE> buffer(byteLength);

        if (BCryptOpenAlgorithmProvider(&hAlg, BCRYPT_RNG_ALGORITHM, NULL, 0) == 0) {
            BCryptGenRandom(hAlg, buffer.data(), (ULONG)byteLength, 0);
            BCryptCloseAlgorithmProvider(hAlg, 0);
        } else {
            // Fallback: use C++ random
            std::random_device rd;
            std::mt19937 gen(rd());
            std::uniform_int_distribution<> dist(0, 255);
            for (auto& b : buffer) b = static_cast<BYTE>(dist(gen));
        }

        std::stringstream ss;
        ss << std::hex << std::setfill('0');
        for (auto b : buffer) {
            ss << std::setw(2) << (int)b;
        }
        return ss.str();
    }

    std::string xorCipher(const std::string& data, const std::string& key) {
        std::string result = data;
        for (size_t i = 0; i < data.size(); i++) {
            result[i] = data[i] ^ key[i % key.size()];
        }
        return result;
    }

    std::string deobfuscate(const char* encoded, size_t len, const char* key, size_t keyLen) {
        std::string result(len, '\0');
        for (size_t i = 0; i < len; i++) {
            result[i] = encoded[i] ^ key[i % keyLen];
        }
        return result;
    }

} // namespace crypto
