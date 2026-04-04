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
exports.wsManager = void 0;
var network_config_1 = require("./network-config");
var storage_1 = require("./storage");
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function normalizePayload(raw) {
    var payload = isRecord(raw.data)
        ? __assign({}, raw.data) : raw.data === null || raw.data === undefined
        ? {}
        : { value: raw.data };
    if (raw.channelId && !payload.channelId) {
        payload.channelId = raw.channelId;
    }
    if (raw.communityId && !payload.communityId) {
        payload.communityId = raw.communityId;
    }
    if (raw.conversationId && !payload.conversationId) {
        payload.conversationId = raw.conversationId;
    }
    return payload;
}
// ---------------------------------------------------------------------------
// WebSocket Manager (singleton)
// ---------------------------------------------------------------------------
var WebSocketManager = /** @class */ (function () {
    function WebSocketManager() {
        this.ws = null;
        this.status = 'disconnected';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.subscribedChannels = new Set();
        this.subscribedCommunities = new Set();
        this.eventListeners = new Set();
        this.statusListeners = new Set();
        this.isManualDisconnect = false;
    }
    // ------ Connection ------
    WebSocketManager.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var token, wsUrl;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN
                            || ((_b = this.ws) === null || _b === void 0 ? void 0 : _b.readyState) === WebSocket.CONNECTING) {
                            return [2 /*return*/];
                        }
                        this.isManualDisconnect = false;
                        if (this.reconnectTimer) {
                            clearTimeout(this.reconnectTimer);
                            this.reconnectTimer = null;
                        }
                        if (!network_config_1.WS_ORIGIN) {
                            console.warn('[WS] API URL is not configured, skipping connect');
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, (0, storage_1.getToken)()];
                    case 1:
                        token = _c.sent();
                        if (!token) {
                            console.warn('[WS] No auth token, skipping connect');
                            return [2 /*return*/];
                        }
                        this.setStatus('connecting');
                        try {
                            wsUrl = "".concat(network_config_1.WS_ORIGIN, "/api/ws?token=").concat(encodeURIComponent(token));
                            this.ws = new WebSocket(wsUrl);
                            this.ws.onopen = function () {
                                _this.reconnectAttempts = 0;
                                _this.setStatus('connected');
                                _this.startHeartbeat();
                                // Re-subscribe to all channels/communities after reconnect
                                _this.resubscribeAll();
                            };
                            this.ws.onmessage = function (event) {
                                try {
                                    var data = JSON.parse(event.data);
                                    if (!(data === null || data === void 0 ? void 0 : data.event) || data.event === 'heartbeat_ack')
                                        return;
                                    _this.notifyListeners({
                                        type: data.event,
                                        payload: normalizePayload(data),
                                        timestamp: data.timestamp,
                                    });
                                }
                                catch (_a) {
                                    // Ignore non-JSON messages
                                }
                            };
                            this.ws.onerror = function (_error) {
                                console.warn('[WS] Connection error');
                            };
                            this.ws.onclose = function () {
                                _this.stopHeartbeat();
                                _this.ws = null;
                                if (!_this.isManualDisconnect) {
                                    _this.setStatus('reconnecting');
                                    _this.scheduleReconnect();
                                }
                                else {
                                    _this.setStatus('disconnected');
                                }
                            };
                        }
                        catch (error) {
                            console.error('[WS] Failed to create WebSocket:', error);
                            this.setStatus('reconnecting');
                            this.scheduleReconnect();
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    WebSocketManager.prototype.disconnect = function () {
        this.isManualDisconnect = true;
        this.stopHeartbeat();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.setStatus('disconnected');
        this.reconnectAttempts = 0;
    };
    // ------ Subscribe / Unsubscribe ------
    WebSocketManager.prototype.subscribe = function (channelId) {
        this.subscribedChannels.add(channelId);
        this.send({ type: 'subscribe_channel', channelId: channelId });
    };
    WebSocketManager.prototype.unsubscribe = function (channelId) {
        this.subscribedChannels.delete(channelId);
        this.send({ type: 'unsubscribe_channel', channelId: channelId });
    };
    WebSocketManager.prototype.subscribeCommunity = function (communityId) {
        this.subscribedCommunities.add(communityId);
        this.send({ type: 'subscribe_community', communityId: communityId });
    };
    WebSocketManager.prototype.unsubscribeCommunity = function (communityId) {
        this.subscribedCommunities.delete(communityId);
        this.send({ type: 'unsubscribe_community', communityId: communityId });
    };
    // ------ Send ------
    WebSocketManager.prototype.send = function (msg) {
        var _a;
        if (((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) !== WebSocket.OPEN) {
            console.warn('[WS] Cannot send, not connected');
            return;
        }
        this.ws.send(JSON.stringify(msg));
    };
    // ------ Typing indicators ------
    WebSocketManager.prototype.sendTypingStarted = function (channelId) {
        this.send({ type: 'typing_start', channelId: channelId });
    };
    WebSocketManager.prototype.sendTypingStopped = function (channelId) {
        this.send({ type: 'typing_stop', channelId: channelId });
    };
    // ------ Event listeners ------
    WebSocketManager.prototype.addEventListener = function (listener) {
        var _this = this;
        this.eventListeners.add(listener);
        return function () {
            _this.eventListeners.delete(listener);
        };
    };
    WebSocketManager.prototype.addStatusListener = function (listener) {
        var _this = this;
        this.statusListeners.add(listener);
        return function () {
            _this.statusListeners.delete(listener);
        };
    };
    WebSocketManager.prototype.getStatus = function () {
        return this.status;
    };
    // ------ Internal helpers ------
    WebSocketManager.prototype.setStatus = function (status) {
        this.status = status;
        this.statusListeners.forEach(function (listener) { return listener(status); });
    };
    WebSocketManager.prototype.notifyListeners = function (event) {
        this.eventListeners.forEach(function (listener) {
            try {
                listener(event);
            }
            catch (err) {
                console.error('[WS] Event listener error:', err);
            }
        });
    };
    WebSocketManager.prototype.scheduleReconnect = function () {
        var _this = this;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('[WS] Max reconnect attempts reached');
            this.setStatus('disconnected');
            return;
        }
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
        var delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;
        this.reconnectTimer = setTimeout(function () {
            _this.connect();
        }, delay);
    };
    WebSocketManager.prototype.resubscribeAll = function () {
        for (var _i = 0, _a = this.subscribedChannels; _i < _a.length; _i++) {
            var channelId = _a[_i];
            this.send({ type: 'subscribe_channel', channelId: channelId });
        }
        for (var _b = 0, _c = this.subscribedCommunities; _b < _c.length; _b++) {
            var communityId = _c[_b];
            this.send({ type: 'subscribe_community', communityId: communityId });
        }
    };
    WebSocketManager.prototype.startHeartbeat = function () {
        var _this = this;
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(function () {
            _this.send({ type: 'heartbeat' });
        }, 30000);
    };
    WebSocketManager.prototype.stopHeartbeat = function () {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    };
    return WebSocketManager;
}());
// Export singleton
exports.wsManager = new WebSocketManager();
