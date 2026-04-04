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
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulatorHarnessDirectory = exports.isSimulatorHarnessEnabled = void 0;
exports.getSimulatorHarnessPath = getSimulatorHarnessPath;
exports.readSimulatorHarnessFile = readSimulatorHarnessFile;
exports.readSimulatorHarnessJson = readSimulatorHarnessJson;
exports.writeSimulatorHarnessFile = writeSimulatorHarnessFile;
exports.writeSimulatorHarnessJson = writeSimulatorHarnessJson;
exports.deleteSimulatorHarnessFile = deleteSimulatorHarnessFile;
exports.deleteSimulatorHarnessPath = deleteSimulatorHarnessPath;
exports.claimSimulatorHarnessMarker = claimSimulatorHarnessMarker;
var expo_constants_1 = require("expo-constants");
var Device = require("expo-device");
var LegacyFileSystem = require("expo-file-system/legacy");
function parseSimulatorHarnessFlag(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value !== 'string') {
        return null;
    }
    var normalized = value.trim().toLowerCase();
    if (!normalized) {
        return null;
    }
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false;
    }
    return null;
}
var configuredSimulatorHarnessFlag = (_a = parseSimulatorHarnessFlag(process.env.EXPO_PUBLIC_ENABLE_SIMULATOR_HARNESS)) !== null && _a !== void 0 ? _a : parseSimulatorHarnessFlag((_c = (_b = expo_constants_1.default.expoConfig) === null || _b === void 0 ? void 0 : _b.extra) === null || _c === void 0 ? void 0 : _c.enableSimulatorHarness);
exports.isSimulatorHarnessEnabled = !Device.isDevice &&
    (configuredSimulatorHarnessFlag === true ||
        (__DEV__ && configuredSimulatorHarnessFlag !== false));
exports.simulatorHarnessDirectory = exports.isSimulatorHarnessEnabled
    ? (_d = LegacyFileSystem.documentDirectory) !== null && _d !== void 0 ? _d : null
    : null;
function getSimulatorHarnessPath(filename) {
    return exports.simulatorHarnessDirectory ? "".concat(exports.simulatorHarnessDirectory).concat(filename) : null;
}
function readSimulatorHarnessFile(filename) {
    return __awaiter(this, void 0, void 0, function () {
        var path;
        return __generator(this, function (_a) {
            path = getSimulatorHarnessPath(filename);
            if (!path) {
                return [2 /*return*/, ''];
            }
            return [2 /*return*/, LegacyFileSystem.readAsStringAsync(path).catch(function () { return ''; })];
        });
    });
}
function readSimulatorHarnessJson(filename) {
    return __awaiter(this, void 0, void 0, function () {
        var raw;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, readSimulatorHarnessFile(filename)];
                case 1:
                    raw = _a.sent();
                    if (!raw) {
                        return [2 /*return*/, null];
                    }
                    try {
                        return [2 /*return*/, JSON.parse(raw)];
                    }
                    catch (_b) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function writeSimulatorHarnessFile(filename, contents) {
    return __awaiter(this, void 0, void 0, function () {
        var path;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    path = getSimulatorHarnessPath(filename);
                    if (!path) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, LegacyFileSystem.writeAsStringAsync(path, contents).catch(function () { })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function writeSimulatorHarnessJson(filename_1, payload_1) {
    return __awaiter(this, arguments, void 0, function (filename, payload, pretty) {
        if (pretty === void 0) { pretty = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, writeSimulatorHarnessFile(filename, JSON.stringify(payload, null, pretty ? 2 : undefined))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function deleteSimulatorHarnessFile(filename) {
    return __awaiter(this, void 0, void 0, function () {
        var path;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    path = getSimulatorHarnessPath(filename);
                    return [4 /*yield*/, deleteSimulatorHarnessPath(path)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function deleteSimulatorHarnessPath(path) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!path) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, LegacyFileSystem.deleteAsync(path, { idempotent: true }).catch(function () { })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function claimSimulatorHarnessMarker(filename, markerValue) {
    return __awaiter(this, void 0, void 0, function () {
        var currentValue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, readSimulatorHarnessFile(filename)];
                case 1:
                    currentValue = _a.sent();
                    if (currentValue === markerValue) {
                        return [2 /*return*/, false];
                    }
                    return [4 /*yield*/, writeSimulatorHarnessFile(filename, markerValue)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, true];
            }
        });
    });
}
