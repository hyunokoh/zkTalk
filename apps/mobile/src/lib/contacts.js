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
exports.syncContacts = syncContacts;
var Contacts = require("expo-contacts");
var Crypto = require("expo-crypto");
var api_1 = require("./api");
var i18n_1 = require("./i18n");
/**
 * Normalizes a phone number by removing everything except digits and leading +.
 */
function normalizePhoneNumber(phone) {
    var cleaned = phone.replace(/[^\d+]/g, '');
    // Ensure it starts with + for international format
    if (!cleaned.startsWith('+')) {
        // Assume Korean number if no country code
        if (cleaned.startsWith('0')) {
            return "+82".concat(cleaned.slice(1));
        }
        return "+".concat(cleaned);
    }
    return cleaned;
}
/**
 * Hashes a phone number using SHA-256 for privacy-preserving contact matching.
 */
function hashPhoneNumber(phone) {
    return __awaiter(this, void 0, void 0, function () {
        var normalized;
        return __generator(this, function (_a) {
            normalized = normalizePhoneNumber(phone);
            return [2 /*return*/, Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized)];
        });
    });
}
/**
 * Reads phone contacts, hashes their phone numbers, and sends them
 * to the server for matching against registered users.
 *
 * Returns an array of matched users that the current user can add as friends.
 */
function syncContacts() {
    return __awaiter(this, void 0, void 0, function () {
        var status, data, phoneNumbers, _i, data_1, contact, _a, _b, phone, normalizedSet, uniquePhones, _c, phoneNumbers_1, phone, normalized, hashes, result;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, Contacts.requestPermissionsAsync()];
                case 1:
                    status = (_d.sent()).status;
                    if (status !== 'granted') {
                        throw new Error((0, i18n_1.t)('friends.contactPermissionRequired'));
                    }
                    return [4 /*yield*/, Contacts.getContactsAsync({
                            fields: [Contacts.Fields.PhoneNumbers],
                        })];
                case 2:
                    data = (_d.sent()).data;
                    if (!data || data.length === 0) {
                        return [2 /*return*/, []];
                    }
                    phoneNumbers = [];
                    for (_i = 0, data_1 = data; _i < data_1.length; _i++) {
                        contact = data_1[_i];
                        if (contact.phoneNumbers) {
                            for (_a = 0, _b = contact.phoneNumbers; _a < _b.length; _a++) {
                                phone = _b[_a];
                                if (phone.number) {
                                    phoneNumbers.push(phone.number);
                                }
                            }
                        }
                    }
                    if (phoneNumbers.length === 0) {
                        return [2 /*return*/, []];
                    }
                    normalizedSet = new Set();
                    uniquePhones = [];
                    for (_c = 0, phoneNumbers_1 = phoneNumbers; _c < phoneNumbers_1.length; _c++) {
                        phone = phoneNumbers_1[_c];
                        normalized = normalizePhoneNumber(phone);
                        if (!normalizedSet.has(normalized)) {
                            normalizedSet.add(normalized);
                            uniquePhones.push(phone);
                        }
                    }
                    return [4 /*yield*/, Promise.all(uniquePhones.map(hashPhoneNumber))];
                case 3:
                    hashes = _d.sent();
                    return [4 /*yield*/, (0, api_1.api)('/api/contacts/sync', {
                            method: 'POST',
                            body: { hashes: hashes },
                        })];
                case 4:
                    result = _d.sent();
                    return [2 /*return*/, result.matches];
            }
        });
    });
}
