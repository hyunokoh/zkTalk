"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAesKey = generateAesKey;
exports.sha256 = sha256;
exports.isE2eeSupported = isE2eeSupported;
exports.generateKeyPair = generateKeyPair;
exports.ensureKeyPair = ensureKeyPair;
exports.encryptMessage = encryptMessage;
exports.decryptMessage = decryptMessage;
exports.deriveSharedKey = deriveSharedKey;
var Crypto = require("expo-crypto");
var secure_storage_1 = require("./secure-storage");
var api_1 = require("./api");
// ---------------------------------------------------------------------------
// E2EE Crypto helpers for DM encryption
//
// MVP approach:
// - Uses SubtleCrypto (available in modern RN/Hermes via expo-crypto polyfill)
// - AES-256-GCM for message encryption
// - ECDH P-256 for key exchange
// - Keys stored in SecureStore (iOS Keychain / Android Keystore)
// ---------------------------------------------------------------------------
// Generate a random AES key as a hex string (for channel group keys)
function generateAesKey() {
    return __awaiter(this, void 0, void 0, function () {
        var bytes;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Crypto.getRandomBytesAsync(32)];
                case 1:
                    bytes = _a.sent();
                    return [2 /*return*/, bytesToHex(bytes)];
            }
        });
    });
}
// Generate a random IV for AES-GCM
function generateIv() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Crypto.getRandomBytesAsync(12)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
// SHA-256 hash
function sha256(data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Key generation and management
// ---------------------------------------------------------------------------
function getSubtleCrypto() {
    var _a;
    return typeof globalThis.crypto !== 'undefined' && ((_a = globalThis.crypto) === null || _a === void 0 ? void 0 : _a.subtle)
        ? globalThis.crypto.subtle
        : null;
}
function isE2eeSupported() {
    return getSubtleCrypto() !== null;
}
/**
 * Generate an ECDH key pair and store in secure storage.
 * Returns the public key as a base64 string for sharing with server.
 */
function generateKeyPair() {
    return __awaiter(this, void 0, void 0, function () {
        var subtle, keyPair, publicKeyRaw, privateKeyJwk, publicKeyBase64, privateKeyJson, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    subtle = getSubtleCrypto();
                    if (!subtle) {
                        throw new Error('Web Crypto is not available in this runtime');
                    }
                    return [4 /*yield*/, subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits'])];
                case 1:
                    keyPair = _a.sent();
                    return [4 /*yield*/, subtle.exportKey('raw', keyPair.publicKey)];
                case 2:
                    publicKeyRaw = _a.sent();
                    return [4 /*yield*/, subtle.exportKey('jwk', keyPair.privateKey)];
                case 3:
                    privateKeyJwk = _a.sent();
                    publicKeyBase64 = arrayBufferToBase64(publicKeyRaw);
                    privateKeyJson = JSON.stringify(privateKeyJwk);
                    return [4 /*yield*/, (0, secure_storage_1.storeE2eeKeyPair)(privateKeyJson, publicKeyBase64)];
                case 4:
                    _a.sent();
                    return [2 /*return*/, publicKeyBase64];
                case 5:
                    error_1 = _a.sent();
                    console.error('[Crypto] Key generation failed:', error_1);
                    throw new Error('Failed to generate E2EE key pair');
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Ensure we have a key pair. Generate one if not present.
 * Registers the public key with the server.
 */
function ensureKeyPair() {
    return __awaiter(this, void 0, void 0, function () {
        var existing, publicKey, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, secure_storage_1.getE2eeKeyPair)()];
                case 1:
                    existing = _a.sent();
                    if (existing)
                        return [2 /*return*/, existing.publicKey];
                    return [4 /*yield*/, generateKeyPair()];
                case 2:
                    publicKey = _a.sent();
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, (0, api_1.api)('/api/me/keys', {
                            method: 'PUT',
                            body: { publicKey: publicKey },
                        })];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_2 = _a.sent();
                    console.warn('[Crypto] Failed to register public key:', error_2);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/, publicKey];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Message encryption / decryption (AES-GCM)
// ---------------------------------------------------------------------------
/**
 * Encrypt a plaintext message with a shared key (hex string).
 * Returns a JSON string containing { iv, ciphertext } both base64-encoded.
 */
function encryptMessage(plaintext, keyHex) {
    return __awaiter(this, void 0, void 0, function () {
        var subtle, keyBytes, cryptoKey, iv, encodedText, ciphertextBuffer, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    subtle = getSubtleCrypto();
                    if (!subtle) {
                        throw new Error('Web Crypto is not available in this runtime');
                    }
                    keyBytes = hexToBytes(keyHex);
                    return [4 /*yield*/, subtle.importKey('raw', keyBytes.buffer, { name: 'AES-GCM' }, false, ['encrypt'])];
                case 1:
                    cryptoKey = _a.sent();
                    return [4 /*yield*/, generateIv()];
                case 2:
                    iv = _a.sent();
                    encodedText = new TextEncoder().encode(plaintext);
                    return [4 /*yield*/, subtle.encrypt({ name: 'AES-GCM', iv: iv.buffer }, cryptoKey, encodedText.buffer)];
                case 3:
                    ciphertextBuffer = _a.sent();
                    return [2 /*return*/, JSON.stringify({
                            iv: arrayBufferToBase64(iv.buffer),
                            ciphertext: arrayBufferToBase64(ciphertextBuffer),
                        })];
                case 4:
                    error_3 = _a.sent();
                    console.error('[Crypto] Encryption failed:', error_3);
                    throw new Error('Failed to encrypt message');
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Decrypt an encrypted message payload using a shared key (hex string).
 * Expects a JSON string with { iv, ciphertext } both base64-encoded.
 */
function decryptMessage(encryptedPayload, keyHex) {
    return __awaiter(this, void 0, void 0, function () {
        var subtle, _a, ivBase64, ciphertextBase64, keyBytes, cryptoKey, iv, ciphertext, decryptedBuffer, error_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    subtle = getSubtleCrypto();
                    if (!subtle) {
                        throw new Error('Web Crypto is not available in this runtime');
                    }
                    _a = JSON.parse(encryptedPayload), ivBase64 = _a.iv, ciphertextBase64 = _a.ciphertext;
                    keyBytes = hexToBytes(keyHex);
                    return [4 /*yield*/, subtle.importKey('raw', keyBytes.buffer, { name: 'AES-GCM' }, false, ['decrypt'])];
                case 1:
                    cryptoKey = _b.sent();
                    iv = base64ToArrayBuffer(ivBase64);
                    ciphertext = base64ToArrayBuffer(ciphertextBase64);
                    return [4 /*yield*/, subtle.decrypt({ name: 'AES-GCM', iv: iv }, cryptoKey, ciphertext)];
                case 2:
                    decryptedBuffer = _b.sent();
                    return [2 /*return*/, new TextDecoder().decode(decryptedBuffer)];
                case 3:
                    error_4 = _b.sent();
                    console.error('[Crypto] Decryption failed:', error_4);
                    throw new Error('Failed to decrypt message');
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// ECDH shared secret derivation
// ---------------------------------------------------------------------------
/**
 * Derive a shared AES key from our private key and the other party's public key.
 */
function deriveSharedKey(privateKeyJson, otherPublicKeyBase64) {
    return __awaiter(this, void 0, void 0, function () {
        var subtle, privateKeyJwk, privateKey, otherPublicKeyBuffer, otherPublicKey, sharedBits, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    subtle = getSubtleCrypto();
                    if (!subtle) {
                        throw new Error('Web Crypto is not available in this runtime');
                    }
                    privateKeyJwk = JSON.parse(privateKeyJson);
                    return [4 /*yield*/, subtle.importKey('jwk', privateKeyJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])];
                case 1:
                    privateKey = _a.sent();
                    otherPublicKeyBuffer = new Uint8Array(base64ToArrayBuffer(otherPublicKeyBase64));
                    return [4 /*yield*/, subtle.importKey('raw', otherPublicKeyBuffer.buffer, { name: 'ECDH', namedCurve: 'P-256' }, false, [])];
                case 2:
                    otherPublicKey = _a.sent();
                    return [4 /*yield*/, subtle.deriveBits({ name: 'ECDH', public: otherPublicKey }, privateKey, 256)];
                case 3:
                    sharedBits = _a.sent();
                    return [2 /*return*/, bytesToHex(new Uint8Array(sharedBits))];
                case 4:
                    error_5 = _a.sent();
                    console.error('[Crypto] Key derivation failed:', error_5);
                    throw new Error('Failed to derive shared key');
                case 5: return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
}
function hexToBytes(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}
function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
function base64ToArrayBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
