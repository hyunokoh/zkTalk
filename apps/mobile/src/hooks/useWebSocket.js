"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWebSocketConnection = useWebSocketConnection;
exports.useWebSocketStatus = useWebSocketStatus;
exports.useWebSocket = useWebSocket;
exports.useChannelSubscription = useChannelSubscription;
exports.useDmSubscription = useDmSubscription;
exports.useTypingIndicator = useTypingIndicator;
var react_1 = require("react");
var websocket_1 = require("../lib/websocket");
var auth_1 = require("../stores/auth");
/**
 * Hook that manages WebSocket lifecycle — connects on mount when authenticated,
 * disconnects on unmount or logout.
 */
function useWebSocketConnection() {
    var userId = (0, auth_1.useAuthStore)(function (s) { var _a, _b; return (_b = (_a = s.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null; });
    (0, react_1.useEffect)(function () {
        if (!userId) {
            websocket_1.wsManager.disconnect();
            return;
        }
        websocket_1.wsManager.connect();
    }, [userId]);
}
function useWebSocketStatus() {
    var _a = (0, react_1.useState)(websocket_1.wsManager.getStatus()), status = _a[0], setStatus = _a[1];
    (0, react_1.useEffect)(function () { return websocket_1.wsManager.addStatusListener(setStatus); }, []);
    return status;
}
function useWebSocket() {
    useWebSocketConnection();
    var status = useWebSocketStatus();
    var _a = (0, react_1.useState)(null), lastEvent = _a[0], setLastEvent = _a[1];
    (0, react_1.useEffect)(function () {
        var removeEventListener = websocket_1.wsManager.addEventListener(setLastEvent);
        return function () {
            removeEventListener();
        };
    }, []);
    return { status: status, lastEvent: lastEvent };
}
/**
 * Hook to subscribe to a specific channel and receive its events.
 * Auto-subscribes on mount, unsubscribes on unmount.
 */
function useChannelSubscription(channelId) {
    var bufferedEventsRef = (0, react_1.useRef)([]);
    var _a = (0, react_1.useState)(0), queuedEventCount = _a[0], setQueuedEventCount = _a[1];
    var _b = (0, react_1.useState)(new Map()), typingUsers = _b[0], setTypingUsers = _b[1];
    (0, react_1.useEffect)(function () {
        if (!channelId)
            return;
        websocket_1.wsManager.subscribe(channelId);
        var removeListener = websocket_1.wsManager.addEventListener(function (event) {
            var _a, _b;
            var payload = event.payload;
            var nestedMessage = payload.message;
            var nestedChannel = payload.channel;
            var eventChannelId = (_b = (_a = nestedMessage === null || nestedMessage === void 0 ? void 0 : nestedMessage.channelId) !== null && _a !== void 0 ? _a : nestedChannel === null || nestedChannel === void 0 ? void 0 : nestedChannel.id) !== null && _b !== void 0 ? _b : payload.channelId;
            // Only handle events for this channel
            if (eventChannelId && eventChannelId !== channelId)
                return;
            switch (event.type) {
                case 'message.created':
                case 'message.updated':
                case 'message.deleted':
                case 'message.reaction_added':
                case 'message.reaction_removed':
                case 'thread.created':
                case 'thread.updated':
                case 'thread.locked':
                case 'channel.updated':
                    bufferedEventsRef.current.push(event);
                    setQueuedEventCount(function (prev) { return prev + 1; });
                    break;
                case 'typing.started': {
                    var userId_1 = payload.userId;
                    if (!userId_1)
                        break;
                    setTypingUsers(function (prev) {
                        var next = new Map(prev);
                        // Clear existing timeout for this user
                        var existing = next.get(userId_1);
                        if (existing)
                            clearTimeout(existing);
                        // Auto-remove after 5 seconds
                        var timeout = setTimeout(function () {
                            setTypingUsers(function (p) {
                                var n = new Map(p);
                                n.delete(userId_1);
                                return n;
                            });
                        }, 5000);
                        next.set(userId_1, timeout);
                        return next;
                    });
                    break;
                }
                case 'typing.stopped': {
                    var userId_2 = payload.userId;
                    if (!userId_2)
                        break;
                    setTypingUsers(function (prev) {
                        var next = new Map(prev);
                        var existing = next.get(userId_2);
                        if (existing)
                            clearTimeout(existing);
                        next.delete(userId_2);
                        return next;
                    });
                    break;
                }
            }
        });
        return function () {
            websocket_1.wsManager.unsubscribe(channelId);
            removeListener();
            // Clear typing timeouts on unmount
            setTypingUsers(function (prev) {
                prev.forEach(function (timeout) { return clearTimeout(timeout); });
                return new Map();
            });
        };
    }, [channelId]);
    // Consume (clear) all buffered events
    var consumeEvents = (0, react_1.useCallback)(function () {
        var current = bufferedEventsRef.current;
        bufferedEventsRef.current = [];
        setQueuedEventCount(0);
        return current;
    }, []);
    return {
        queuedEventCount: queuedEventCount,
        consumeEvents: consumeEvents,
        typingUserIds: Array.from(typingUsers.keys()),
    };
}
/**
 * Hook to subscribe to DM events for a specific conversation.
 */
function useDmSubscription(conversationId) {
    var bufferedEventsRef = (0, react_1.useRef)([]);
    var _a = (0, react_1.useState)(0), queuedEventCount = _a[0], setQueuedEventCount = _a[1];
    (0, react_1.useEffect)(function () {
        if (!conversationId)
            return;
        var removeListener = websocket_1.wsManager.addEventListener(function (event) {
            var _a, _b;
            if (event.type !== 'dm.message_created' &&
                event.type !== 'dm.message_updated' &&
                event.type !== 'dm.message_deleted' &&
                event.type !== 'dm.conversation_updated') {
                return;
            }
            var payload = event.payload;
            var nestedMessage = payload.message;
            var nestedConversation = payload.conversation;
            var eventConversationId = (_b = (_a = nestedMessage === null || nestedMessage === void 0 ? void 0 : nestedMessage.conversationId) !== null && _a !== void 0 ? _a : nestedConversation === null || nestedConversation === void 0 ? void 0 : nestedConversation.id) !== null && _b !== void 0 ? _b : payload.conversationId;
            if (eventConversationId === conversationId) {
                bufferedEventsRef.current.push(event);
                setQueuedEventCount(function (prev) { return prev + 1; });
            }
        });
        return function () {
            removeListener();
        };
    }, [conversationId]);
    var consumeEvents = (0, react_1.useCallback)(function () {
        var current = bufferedEventsRef.current;
        bufferedEventsRef.current = [];
        setQueuedEventCount(0);
        return current;
    }, []);
    return { queuedEventCount: queuedEventCount, consumeEvents: consumeEvents };
}
/**
 * Hook for sending typing indicators with debounce.
 */
function useTypingIndicator(channelId) {
    var typingTimeoutRef = (0, react_1.useRef)(null);
    var isTypingRef = (0, react_1.useRef)(false);
    var stopTyping = (0, react_1.useCallback)(function () {
        if (!channelId)
            return;
        if (isTypingRef.current) {
            isTypingRef.current = false;
            websocket_1.wsManager.sendTypingStopped(channelId);
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    }, [channelId]);
    var startTyping = (0, react_1.useCallback)(function () {
        if (!channelId)
            return;
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            websocket_1.wsManager.sendTypingStarted(channelId);
        }
        // Reset the auto-stop timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(function () {
            stopTyping();
        }, 3000);
    }, [channelId, stopTyping]);
    (0, react_1.useEffect)(function () {
        return function () {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);
    return { startTyping: startTyping, stopTyping: stopTyping };
}
