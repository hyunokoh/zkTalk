"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.enqueueMessage = enqueueMessage;
exports.dequeueMessage = dequeueMessage;
exports.dequeueMessagesByEndpoint = dequeueMessagesByEndpoint;
exports.getPendingMessages = getPendingMessages;
exports.processQueue = processQueue;
exports.startNetworkListener = startNetworkListener;
exports.stopNetworkListener = stopNetworkListener;
exports.isOnline = isOnline;
var async_storage_1 = require("@react-native-async-storage/async-storage");
var netinfo_1 = require("@react-native-community/netinfo");
var api_1 = require("./api");
var QUEUE_KEY = 'zktalk_offline_queue';
var DEDUPE_WINDOW_MS = 30000;
var isProcessing = false;
var unsubscribeNetInfo = null;
/**
 * Load queued messages from AsyncStorage.
 */
function loadQueue() {
    return __awaiter(this, void 0, void 0, function () {
        var raw, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, async_storage_1.default.getItem(QUEUE_KEY)];
                case 1:
                    raw = _b.sent();
                    if (!raw)
                        return [2 /*return*/, []];
                    return [2 /*return*/, JSON.parse(raw)];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Save queued messages to AsyncStorage.
 */
function saveQueue(queue) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, async_storage_1.default.setItem(QUEUE_KEY, JSON.stringify(queue))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Enqueue a failed message for later retry.
 */
function enqueueMessage(endpoint, body) {
    return __awaiter(this, void 0, void 0, function () {
        var queue, serializedBody, existing, msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, loadQueue()];
                case 1:
                    queue = _a.sent();
                    serializedBody = JSON.stringify(body);
                    existing = queue.find(function (entry) {
                        return entry.endpoint === endpoint
                            && JSON.stringify(entry.body) === serializedBody
                            && Date.now() - entry.createdAt < DEDUPE_WINDOW_MS;
                    });
                    if (existing) {
                        return [2 /*return*/, existing];
                    }
                    msg = {
                        id: "".concat(Date.now(), "_").concat(Math.random().toString(36).slice(2, 8)),
                        endpoint: endpoint,
                        body: body,
                        createdAt: Date.now(),
                        retryCount: 0,
                    };
                    queue.push(msg);
                    return [4 /*yield*/, saveQueue(queue)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, msg];
            }
        });
    });
}
/**
 * Remove a specific message from the queue.
 */
function dequeueMessage(id) {
    return __awaiter(this, void 0, void 0, function () {
        var queue, filtered;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, loadQueue()];
                case 1:
                    queue = _a.sent();
                    filtered = queue.filter(function (m) { return m.id !== id; });
                    return [4 /*yield*/, saveQueue(filtered)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Remove queued messages that target a specific endpoint.
 */
function dequeueMessagesByEndpoint(endpoint) {
    return __awaiter(this, void 0, void 0, function () {
        var queue, filtered;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, loadQueue()];
                case 1:
                    queue = _a.sent();
                    filtered = queue.filter(function (m) { return m.endpoint !== endpoint; });
                    return [4 /*yield*/, saveQueue(filtered)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Get current pending messages.
 */
function getPendingMessages() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, loadQueue()];
        });
    });
}
/**
 * Process all queued messages in order.
 * Returns the number of successfully sent messages.
 */
function processQueue() {
    return __awaiter(this, void 0, void 0, function () {
        var sentCount, queue, remaining, _i, queue_1, msg, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (isProcessing)
                        return [2 /*return*/, 0];
                    isProcessing = true;
                    sentCount = 0;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, , 10, 11]);
                    return [4 /*yield*/, loadQueue()];
                case 2:
                    queue = _b.sent();
                    if (queue.length === 0)
                        return [2 /*return*/, 0];
                    remaining = [];
                    _i = 0, queue_1 = queue;
                    _b.label = 3;
                case 3:
                    if (!(_i < queue_1.length)) return [3 /*break*/, 8];
                    msg = queue_1[_i];
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, (0, api_1.api)(msg.endpoint, {
                            method: 'POST',
                            body: msg.body,
                        })];
                case 5:
                    _b.sent();
                    sentCount++;
                    return [3 /*break*/, 7];
                case 6:
                    _a = _b.sent();
                    // If still failing, keep in queue (up to 10 retries)
                    if (msg.retryCount < 10) {
                        remaining.push(__assign(__assign({}, msg), { retryCount: msg.retryCount + 1 }));
                    }
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8: return [4 /*yield*/, saveQueue(remaining)];
                case 9:
                    _b.sent();
                    return [3 /*break*/, 11];
                case 10:
                    isProcessing = false;
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/, sentCount];
            }
        });
    });
}
/**
 * Start listening for network changes. When connectivity is restored,
 * automatically process the queue.
 */
function startNetworkListener(onQueueProcessed) {
    var _this = this;
    if (unsubscribeNetInfo)
        return;
    var wasDisconnected = false;
    unsubscribeNetInfo = netinfo_1.default.addEventListener(function (state) { return __awaiter(_this, void 0, void 0, function () {
        var isConnected, count;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    isConnected = state.isConnected && state.isInternetReachable !== false;
                    if (!isConnected) {
                        wasDisconnected = true;
                        return [2 /*return*/];
                    }
                    if (!(wasDisconnected && isConnected)) return [3 /*break*/, 2];
                    wasDisconnected = false;
                    return [4 /*yield*/, processQueue()];
                case 1:
                    count = _a.sent();
                    if (count > 0 && onQueueProcessed) {
                        onQueueProcessed(count);
                    }
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); });
}
/**
 * Stop listening for network changes.
 */
function stopNetworkListener() {
    if (unsubscribeNetInfo) {
        unsubscribeNetInfo();
        unsubscribeNetInfo = null;
    }
}
/**
 * Check current network connectivity.
 */
function isOnline() {
    return __awaiter(this, void 0, void 0, function () {
        var state;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, netinfo_1.default.fetch()];
                case 1:
                    state = _a.sent();
                    return [2 /*return*/, !!(state.isConnected && state.isInternetReachable !== false)];
            }
        });
    });
}
