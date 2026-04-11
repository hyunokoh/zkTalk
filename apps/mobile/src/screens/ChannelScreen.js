'use strict';
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.default = ChannelScreen;
var react_1 = require('react');
var react_native_1 = require('react-native');
var native_1 = require('@react-navigation/native');
var react_query_1 = require('@tanstack/react-query');
var expo_file_system_1 = require('expo-file-system');
var LegacyFileSystem = require('expo-file-system/legacy');
var api_1 = require('../lib/api');
var ai_1 = require('../lib/ai');
var offline_queue_1 = require('../lib/offline-queue');
var error_message_1 = require('../lib/error-message');
var useWebSocket_1 = require('../hooks/useWebSocket');
var file_picker_1 = require('../lib/file-picker');
var storage_1 = require('../lib/storage');
var auth_1 = require('../stores/auth');
var i18n_1 = require('../lib/i18n');
var simulator_harness_1 = require('../lib/simulator-harness');
var MessageBubble_1 = require('../components/MessageBubble');
var MessageComposer_1 = require('../components/MessageComposer');
var MessageActionSheet_1 = require('../components/MessageActionSheet');
var AttachmentLightbox_1 = require('../components/AttachmentLightbox');
var EmptyState_1 = require('../components/EmptyState');
var LoadingSpinner_1 = require('../components/LoadingSpinner');
var theme_1 = require('../theme');
var shared_1 = require('@zktalk/shared');
function flattenMessage(item) {
  var _a, _b;
  if ('message' in item) {
    return __assign(__assign({}, item.message), {
      author: item.author,
      attachments:
        (_b = (_a = item.attachments) !== null && _a !== void 0 ? _a : item.message.attachments) !==
          null && _b !== void 0
          ? _b
          : [],
    });
  }
  return item;
}
function ChannelScreen(_a) {
  var _this = this;
  var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
  var navigation = _a.navigation,
    route = _a.route;
  var _0 = route.params,
    channelId = _0.channelId,
    focusMessageId = _0.focusMessageId;
  var _1 = (0, i18n_1.useTranslation)(),
    t = _1.t,
    locale = _1.locale;
  var rootNavigation = (0, native_1.useNavigation)();
  var listRef = (0, react_1.useRef)(null);
  var _2 = (0, react_1.useState)([]),
    pendingMessages = _2[0],
    setPendingMessages = _2[1];
  var _3 = (0, react_1.useState)(null),
    pendingAttachment = _3[0],
    setPendingAttachment = _3[1];
  var _4 = (0, react_1.useState)(null),
    uploadProgress = _4[0],
    setUploadProgress = _4[1];
  var _5 = (0, react_1.useState)(false),
    showAttachMenu = _5[0],
    setShowAttachMenu = _5[1];
  var _6 = (0, react_1.useState)(null),
    replyTo = _6[0],
    setReplyTo = _6[1];
  var _7 = (0, react_1.useState)(null),
    editingMessage = _7[0],
    setEditingMessage = _7[1];
  var _8 = (0, react_1.useState)(null),
    actionMessage = _8[0],
    setActionMessage = _8[1];
  var _9 = (0, react_1.useState)({}),
    translatedBodies = _9[0],
    setTranslatedBodies = _9[1];
  var _10 = (0, react_1.useState)(null),
    authToken = _10[0],
    setAuthToken = _10[1];
  var _11 = (0, react_1.useState)(null),
    openingAttachmentId = _11[0],
    setOpeningAttachmentId = _11[1];
  var _12 = (0, react_1.useState)(null),
    previewGallery = _12[0],
    setPreviewGallery = _12[1];
  var _13 = (0, react_1.useState)(null),
    selectedMessageId = _13[0],
    setSelectedMessageId = _13[1];
  var _14 = (0, react_1.useState)(''),
    composerDraftText = _14[0],
    setComposerDraftText = _14[1];
  var _15 = (0, react_1.useState)(''),
    composerDraftSeed = _15[0],
    setComposerDraftSeed = _15[1];
  var _16 = (0, react_1.useState)(null),
    composerDraftKey = _16[0],
    setComposerDraftKey = _16[1];
  var _17 = (0, react_1.useState)(''),
    topic = _17[0],
    setTopic = _17[1];
  var devComposeInFlightRef = (0, react_1.useRef)(false);
  var devAttachmentAttemptedRef = (0, react_1.useRef)(false);
  var lastMarkedReadMessageIdRef = (0, react_1.useRef)(null);
  var messageRefreshTimeoutRef = (0, react_1.useRef)(null);
  var queryClient = (0, react_query_1.useQueryClient)();
  var currentUser = (0, auth_1.useAuthStore)(function (s) {
    return s.user;
  });
  var isFocused = (0, native_1.useIsFocused)();
  var wsStatus = (0, useWebSocket_1.useWebSocketStatus)();
  var shouldPollMessages = wsStatus !== 'connected';
  var endpoint = '/api/channels/'.concat(channelId, '/messages');
  var channelDetailData = (0, react_query_1.useQuery)({
    queryKey: ['channel', channelId],
    queryFn: function () {
      return (0, api_1.api)('/api/channels/'.concat(channelId));
    },
  }).data;
  var permissionsData = (0, react_query_1.useQuery)({
    queryKey: ['channel-me-permissions', channelId],
    queryFn: function () {
      return (0, api_1.api)('/api/channels/'.concat(channelId, '/me-permissions'));
    },
  }).data;
  var aiRuntime = (0, react_query_1.useQuery)({
    queryKey: ['ai-runtime'],
    queryFn: ai_1.fetchAiRuntime,
    staleTime: 60000,
  }).data;
  var canManageChannel =
    (_b =
      permissionsData === null || permissionsData === void 0
        ? void 0
        : permissionsData.permissions.canManageChannel) !== null && _b !== void 0
      ? _b
      : false;
  var canPostChannel =
    (_c =
      permissionsData === null || permissionsData === void 0
        ? void 0
        : permissionsData.permissions.canPostMessage) !== null && _c !== void 0
      ? _c
      : true;
  var canReactToMessages =
    (_d =
      permissionsData === null || permissionsData === void 0
        ? void 0
        : permissionsData.permissions.canReact) !== null && _d !== void 0
      ? _d
      : true;
  var canUploadAttachment =
    (_e =
      permissionsData === null || permissionsData === void 0
        ? void 0
        : permissionsData.permissions.canUploadAttachment) !== null && _e !== void 0
      ? _e
      : true;
  var isArchived =
    (_f =
      channelDetailData === null || channelDetailData === void 0
        ? void 0
        : channelDetailData.channel.isArchived) !== null && _f !== void 0
      ? _f
      : false;
  var requiresTopic =
    (_g =
      channelDetailData === null || channelDetailData === void 0
        ? void 0
        : channelDetailData.channel.requireTopic) !== null && _g !== void 0
      ? _g
      : false;
  var sourceDmConversation =
    (_h =
      channelDetailData === null || channelDetailData === void 0
        ? void 0
        : channelDetailData.channel.sourceDmConversation) !== null && _h !== void 0
      ? _h
      : null;
  var sourceDmName =
    ((_j =
      sourceDmConversation === null || sourceDmConversation === void 0
        ? void 0
        : sourceDmConversation.name) === null || _j === void 0
      ? void 0
      : _j.trim()) || null;
  var sourceDmTypeLabel = sourceDmConversation
    ? sourceDmConversation.type === 'direct'
      ? t('dm.filterDirect')
      : t('dm.filterGroup')
    : null;
  var sourceDmHeaderLabel = sourceDmTypeLabel
    ? ''.concat(sourceDmTypeLabel, ' ').concat(t('dm.historyCompact'))
    : t('dm.historyCompact');
  var sourceDmFullLabel = sourceDmName
    ? ''.concat(sourceDmHeaderLabel, ' \u00B7 ').concat(sourceDmName)
    : sourceDmHeaderLabel;
  var sourceDmBody = sourceDmName
    ? t('channel.sourceDmNamedBody', { name: sourceDmName })
    : t('channel.sourceDmBody');
  var channelName =
    (_l =
      (_k =
        channelDetailData === null || channelDetailData === void 0
          ? void 0
          : channelDetailData.channel.name) !== null && _k !== void 0
        ? _k
        : route.params.channelName) !== null && _l !== void 0
      ? _l
      : t('nav.channel');
  var channelDescription =
    ((_m =
      channelDetailData === null || channelDetailData === void 0
        ? void 0
        : channelDetailData.channel.description) === null || _m === void 0
      ? void 0
      : _m.trim()) || t('channel.headerSubtitle');
  var openSourceDmHistory = (0, react_1.useCallback)(
    function () {
      var _a;
      if (!sourceDmConversation) {
        return;
      }
      rootNavigation.navigate('Main', {
        screen: 'DmTab',
        params: {
          screen: 'DmScreen',
          params: {
            conversationId: sourceDmConversation.id,
            displayName:
              (_a = sourceDmConversation.name) !== null && _a !== void 0 ? _a : t('dm.message'),
          },
        },
      });
    },
    [rootNavigation, sourceDmConversation, t],
  );
  var openChannelSearch = (0, react_1.useCallback)(
    function () {
      if (!route.params.communityId) {
        return;
      }
      navigation.navigate('ChannelSearch', {
        channelId: channelId,
        communityId: route.params.communityId,
        channelName: route.params.channelName,
      });
    },
    [channelId, navigation, route.params.channelName, route.params.communityId],
  );
  var openChannelPolls = (0, react_1.useCallback)(
    function () {
      navigation.navigate('ChannelPolls', {
        channelId: channelId,
        communityId: route.params.communityId,
        channelName: route.params.channelName,
      });
    },
    [channelId, navigation, route.params.channelName, route.params.communityId],
  );
  var openChannelPins = (0, react_1.useCallback)(
    function () {
      navigation.navigate('ChannelPins', {
        channelId: channelId,
        channelName: route.params.channelName,
        communityId: route.params.communityId,
      });
    },
    [channelId, navigation, route.params.channelName, route.params.communityId],
  );
  var openEditChannel = (0, react_1.useCallback)(
    function () {
      if (!route.params.communityId) {
        return;
      }
      navigation.navigate('EditChannel', {
        channelId: channelId,
        communityId: route.params.communityId,
        channelName: channelName,
      });
    },
    [channelId, channelName, navigation, route.params.communityId],
  );
  (0, react_1.useLayoutEffect)(
    function () {
      navigation.setOptions({
        title: '# '.concat(channelName),
        headerStyle: {
          backgroundColor: theme_1.colors.talkPanel,
        },
        headerTintColor: theme_1.colors.textPrimary,
        headerTitleStyle: {
          color: theme_1.colors.textPrimary,
          fontWeight: '700',
        },
        headerRight: function () {
          return (
            <react_native_1.View style={styles.headerActions}>
              {sourceDmConversation ? (
                <react_native_1.TouchableOpacity
                  testID="channel-header-history"
                  onPress={openSourceDmHistory}
                  hitSlop={8}
                  style={styles.headerIconAction}
                  accessibilityRole="button"
                  accessibilityLabel={sourceDmFullLabel}
                >
                  <react_native_1.Text style={styles.headerIconText}>
                    {'\u21A9'}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
              ) : null}
              {route.params.communityId ? (
                <react_native_1.TouchableOpacity
                  testID="channel-header-search"
                  onPress={openChannelSearch}
                  hitSlop={8}
                  style={styles.headerIconAction}
                  accessibilityRole="button"
                  accessibilityLabel={t('channel.searchHintTitle')}
                >
                  <react_native_1.Text style={styles.headerIconText}>
                    {'\u2315'}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
              ) : null}
              {route.params.communityId ? (
                <react_native_1.TouchableOpacity
                  testID="channel-header-pins"
                  onPress={openChannelPins}
                  hitSlop={8}
                  style={styles.headerIconAction}
                  accessibilityRole="button"
                  accessibilityLabel={t('pin.pinned')}
                >
                  <react_native_1.Text style={styles.headerIconText}>
                    {'\uD83D\uDCCC'}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
              ) : null}
            </react_native_1.View>
          );
        },
      });
    },
    [
      canManageChannel,
      channelName,
      navigation,
      route.params.communityId,
      openChannelSearch,
      openEditChannel,
      openChannelPins,
      openChannelPolls,
      openSourceDmHistory,
      sourceDmHeaderLabel,
      t,
    ],
  );
  // WebSocket subscription for real-time updates
  var _15 = (0, useWebSocket_1.useChannelSubscription)(channelId),
    queuedEventCount = _15.queuedEventCount,
    consumeEvents = _15.consumeEvents,
    typingUserIds = _15.typingUserIds;
  var _16 = (0, useWebSocket_1.useTypingIndicator)(channelId),
    startTyping = _16.startTyping,
    stopTyping = _16.stopTyping;
  var scheduleMessageRefresh = (0, react_1.useCallback)(
    function (delayMs) {
      if (delayMs === void 0) {
        delayMs = 1200;
      }
      if (messageRefreshTimeoutRef.current) {
        clearTimeout(messageRefreshTimeoutRef.current);
      }
      messageRefreshTimeoutRef.current = setTimeout(function () {
        messageRefreshTimeoutRef.current = null;
        void queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      }, delayMs);
    },
    [channelId, queryClient],
  );
  var _17 = (0, react_query_1.useQuery)({
      queryKey: ['messages', channelId],
      queryFn: function () {
        return __awaiter(_this, void 0, void 0, function () {
          var res, messages;
          var _a, _b;
          return __generator(this, function (_c) {
            switch (_c.label) {
              case 0:
                return [4 /*yield*/, (0, api_1.api)(endpoint)];
              case 1:
                res = _c.sent();
                messages = ((_a = res.messages) !== null && _a !== void 0 ? _a : []).map(
                  flattenMessage,
                );
                return [
                  2 /*return*/,
                  {
                    messages: messages,
                    unreadCounts: (_b = res.unreadCounts) !== null && _b !== void 0 ? _b : {},
                  },
                ];
            }
          });
        });
      },
      refetchInterval: shouldPollMessages ? 30000 : false,
    }),
    data = _17.data,
    isLoading = _17.isLoading,
    refetch = _17.refetch,
    isRefetching = _17.isRefetching;
  var messages =
    (_o = data === null || data === void 0 ? void 0 : data.messages) !== null && _o !== void 0
      ? _o
      : [];
  var unreadCounts =
    (_p = data === null || data === void 0 ? void 0 : data.unreadCounts) !== null && _p !== void 0
      ? _p
      : {};
  var rootMessageIds = messages
    .filter(function (message) {
      return !message.parentMessageId && !message.threadId;
    })
    .map(function (message) {
      return message.id;
    });
  var threadSummariesData = (0, react_query_1.useQuery)({
    queryKey: ['thread-summaries', channelId, rootMessageIds.join(',')],
    enabled: rootMessageIds.length > 0,
    queryFn: function () {
      return (0, api_1.api)(
        '/api/threads?rootMessageIds='.concat(encodeURIComponent(rootMessageIds.join(','))),
      );
    },
  }).data;
  var threadSummariesByRootId = new Map(
    ((_q =
      threadSummariesData === null || threadSummariesData === void 0
        ? void 0
        : threadSummariesData.items) !== null && _q !== void 0
      ? _q
      : []
    ).map(function (item) {
      return [item.thread.rootMessageId, item.thread];
    }),
  );
  var hasFocusedMessage = focusMessageId
    ? messages.some(function (message) {
        return message.id === focusMessageId;
      })
    : true;
  var focusedMessageData = (0, react_query_1.useQuery)({
    queryKey: ['message', focusMessageId],
    enabled: !!focusMessageId && !hasFocusedMessage,
    queryFn: function () {
      return __awaiter(_this, void 0, void 0, function () {
        var res;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [4 /*yield*/, (0, api_1.api)('/api/messages/'.concat(focusMessageId))];
            case 1:
              res = _a.sent();
              return [2 /*return*/, flattenMessage(res)];
          }
        });
      });
    },
  }).data;
  var mergedMessages = react_1.default.useMemo(
    function () {
      var baseMessages =
        focusedMessageData &&
        !messages.some(function (message) {
          return message.id === focusedMessageData.id;
        })
          ? __spreadArray(__spreadArray([], messages, true), [focusedMessageData], false)
          : messages;
      var seen = new Set();
      return baseMessages.filter(function (message) {
        if (seen.has(message.id)) {
          return false;
        }
        seen.add(message.id);
        return true;
      });
    },
    [focusedMessageData, messages],
  );
  var latestVisibleMessageId =
    (_s = (_r = mergedMessages[0]) === null || _r === void 0 ? void 0 : _r.id) !== null &&
    _s !== void 0
      ? _s
      : null;
  var messageIds = mergedMessages.map(function (message) {
    return message.id;
  });
  var reactionsData = (0, react_query_1.useQuery)({
    queryKey: ['message-reactions', channelId, messageIds],
    enabled: messageIds.length > 0,
    queryFn: function () {
      return (0, api_1.api)(
        '/api/reactions?messageIds='.concat(messageIds.map(encodeURIComponent).join(',')),
      );
    },
  }).data;
  var reactionsByMessageId =
    (_t =
      reactionsData === null || reactionsData === void 0
        ? void 0
        : reactionsData.reactionsByMessageId) !== null && _t !== void 0
      ? _t
      : {};
  var pollsData = (0, react_query_1.useQuery)({
    queryKey: ['polls-by-message', channelId, messageIds],
    enabled: messageIds.length > 0,
    queryFn: function () {
      return (0, api_1.api)(
        '/api/polls?messageIds='.concat(messageIds.map(encodeURIComponent).join(',')),
      );
    },
  }).data;
  var pollsByMessageId =
    (_u = pollsData === null || pollsData === void 0 ? void 0 : pollsData.pollsByMessageId) !==
      null && _u !== void 0
      ? _u
      : {};
  (0, react_1.useEffect)(function () {
    return function () {
      if (messageRefreshTimeoutRef.current) {
        clearTimeout(messageRefreshTimeoutRef.current);
      }
    };
  }, []);
  // Handle real-time WebSocket events
  (0, react_1.useEffect)(
    function () {
      if (queuedEventCount === 0) return;
      var newEvents = consumeEvents();
      var _loop_1 = function (event_1) {
        var payload = event_1.payload;
        switch (event_1.type) {
          case 'message.created': {
            queryClient.setQueryData(['messages', channelId], function (old) {
              var _a;
              if (!old) return old;
              var newMsg = flattenMessage(payload);
              // Avoid duplicates
              if (
                old.messages.some(function (m) {
                  return m.id === newMsg.id;
                })
              )
                return old;
              return {
                messages: __spreadArray([newMsg], old.messages, true),
                unreadCounts: (_a = old.unreadCounts) !== null && _a !== void 0 ? _a : {},
              };
            });
            scheduleMessageRefresh();
            break;
          }
          case 'message.updated': {
            queryClient.setQueryData(['messages', channelId], function (old) {
              var _a;
              if (!old) return old;
              var updated = flattenMessage(payload);
              return {
                messages: old.messages.map(function (m) {
                  return m.id === updated.id ? __assign(__assign({}, m), updated) : m;
                }),
                unreadCounts: (_a = old.unreadCounts) !== null && _a !== void 0 ? _a : {},
              };
            });
            break;
          }
          case 'message.deleted': {
            var deletedId_1 = payload.messageId;
            queryClient.setQueryData(['messages', channelId], function (old) {
              var _a;
              if (!old) return old;
              return {
                messages: old.messages.filter(function (m) {
                  return m.id !== deletedId_1;
                }),
                unreadCounts: (_a = old.unreadCounts) !== null && _a !== void 0 ? _a : {},
              };
            });
            break;
          }
          case 'message.reaction_added':
          case 'message.reaction_removed': {
            void queryClient.invalidateQueries({ queryKey: ['message-reactions', channelId] });
            break;
          }
          case 'thread.created':
          case 'thread.updated':
          case 'thread.locked': {
            void queryClient.invalidateQueries({ queryKey: ['thread-summaries', channelId] });
            break;
          }
          case 'channel.updated': {
            void queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
            break;
          }
        }
      };
      for (var _i = 0, newEvents_1 = newEvents; _i < newEvents_1.length; _i++) {
        var event_1 = newEvents_1[_i];
        _loop_1(event_1);
      }
    },
    [queuedEventCount, channelId, consumeEvents, queryClient, scheduleMessageRefresh],
  );
  // Check for pending offline messages on mount
  (0, react_1.useEffect)(
    function () {
      var checkPending = function () {
        return __awaiter(_this, void 0, void 0, function () {
          var queued, channelPending;
          return __generator(this, function (_a) {
            switch (_a.label) {
              case 0:
                return [4 /*yield*/, (0, offline_queue_1.getPendingMessages)()];
              case 1:
                queued = _a.sent();
                channelPending = queued.filter(function (m) {
                  return m.endpoint === endpoint;
                });
                setPendingMessages(
                  channelPending.map(function (m) {
                    var _a;
                    return {
                      id: m.id,
                      body: (_a = m.body.bodyMarkdown) !== null && _a !== void 0 ? _a : '',
                      createdAt: m.createdAt,
                    };
                  }),
                );
                return [2 /*return*/];
            }
          });
        });
      };
      checkPending();
    },
    [endpoint],
  );
  (0, react_1.useEffect)(function () {
    (0, storage_1.getToken)()
      .then(setAuthToken)
      .catch(function () {
        return setAuthToken(null);
      });
  }, []);
  (0, react_1.useEffect)(
    function () {
      if (!isArchived) return;
      setReplyTo(null);
      setEditingMessage(null);
      setPendingAttachment(null);
      setShowAttachMenu(false);
      setTopic('');
    },
    [isArchived],
  );
  (0, react_1.useEffect)(
    function () {
      var _a;
      if (editingMessage) {
        setTopic((_a = editingMessage.topic) !== null && _a !== void 0 ? _a : '');
        return;
      }
      if (!requiresTopic) {
        setTopic('');
      }
    },
    [editingMessage, requiresTopic],
  );
  (0, native_1.useFocusEffect)(
    (0, react_1.useCallback)(
      function () {
        if (!latestVisibleMessageId) {
          return undefined;
        }
        if (lastMarkedReadMessageIdRef.current === latestVisibleMessageId) {
          return undefined;
        }
        var cancelled = false;
        var timeout = setTimeout(function () {
          void (function () {
            return __awaiter(_this, void 0, void 0, function () {
              var _a;
              return __generator(this, function (_b) {
                switch (_b.label) {
                  case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [
                      4 /*yield*/,
                      (0, api_1.api)('/api/channels/'.concat(channelId, '/read'), {
                        method: 'POST',
                        body: { lastMessageId: latestVisibleMessageId },
                      }),
                    ];
                  case 1:
                    _b.sent();
                    if (cancelled) {
                      return [2 /*return*/];
                    }
                    lastMarkedReadMessageIdRef.current = latestVisibleMessageId;
                    void queryClient.invalidateQueries({
                      queryKey: ['channels', route.params.communityId],
                    });
                    void queryClient.invalidateQueries({ queryKey: ['inbox-summary'] });
                    return [3 /*break*/, 3];
                  case 2:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                  case 3:
                    return [2 /*return*/];
                }
              });
            });
          })();
        }, 250);
        return function () {
          cancelled = true;
          clearTimeout(timeout);
        };
      },
      [channelId, latestVisibleMessageId, queryClient, route.params.communityId],
    ),
  );
  var sendMutation = (0, react_query_1.useMutation)({
    mutationFn: function (body) {
      return __awaiter(_this, void 0, void 0, function () {
        var attachmentData,
          pendingAttachmentName,
          err_1,
          fallbackBody,
          messageBody,
          trimmedTopic,
          result,
          err_2,
          shouldQueue,
          fallbackBody,
          queuedBody,
          trimmedTopic,
          queued_1;
        var _a, _b;
        return __generator(this, function (_c) {
          switch (_c.label) {
            case 0:
              if (!editingMessage) return [3 /*break*/, 2];
              return [
                4 /*yield*/,
                (0, api_1.api)('/api/messages/'.concat(editingMessage.id), {
                  method: 'PATCH',
                  body: { bodyMarkdown: body },
                }),
              ];
            case 1:
              _c.sent();
              return [2 /*return*/, { queued: false }];
            case 2:
              attachmentData = null;
              pendingAttachmentName =
                (_a =
                  pendingAttachment === null || pendingAttachment === void 0
                    ? void 0
                    : pendingAttachment.name) !== null && _a !== void 0
                  ? _a
                  : null;
              if (!pendingAttachment) return [3 /*break*/, 6];
              setUploadProgress(0);
              _c.label = 3;
            case 3:
              _c.trys.push([3, 5, , 6]);
              return [
                4 /*yield*/,
                (0, file_picker_1.uploadFile)(
                  pendingAttachment,
                  { channelId: channelId },
                  setUploadProgress,
                ),
              ];
            case 4:
              attachmentData = _c.sent();
              return [3 /*break*/, 6];
            case 5:
              err_1 = _c.sent();
              setUploadProgress(null);
              throw err_1;
            case 6:
              _c.trys.push([6, 10, , 12]);
              fallbackBody =
                body.trim().length > 0
                  ? body
                  : pendingAttachment &&
                      (0, shared_1.isImageAttachmentMimeType)(
                        pendingAttachment.mimeType,
                        pendingAttachment.name,
                      )
                    ? ' '
                    : pendingAttachmentName || ' ';
              messageBody = { bodyMarkdown: fallbackBody };
              if (replyTo) {
                messageBody.parentMessageId = replyTo.id;
              }
              trimmedTopic = topic.trim();
              if (trimmedTopic) {
                messageBody.topic = trimmedTopic;
              }
              return [
                4 /*yield*/,
                (0, api_1.api)(endpoint, {
                  method: 'POST',
                  body: messageBody,
                  headers: {
                    'X-Request-Id': (0, api_1.createRequestId)(),
                  },
                }),
              ];
            case 7:
              result = _c.sent();
              if (
                !(
                  attachmentData &&
                  ((_b = result.message) === null || _b === void 0 ? void 0 : _b.id)
                )
              )
                return [3 /*break*/, 9];
              return [
                4 /*yield*/,
                (0, file_picker_1.attachToMessage)(result.message.id, attachmentData),
              ];
            case 8:
              _c.sent();
              _c.label = 9;
            case 9:
              return [2 /*return*/, { queued: false }];
            case 10:
              err_2 = _c.sent();
              shouldQueue = !(err_2 instanceof api_1.ApiError) || err_2.status === 0;
              if (!shouldQueue) {
                throw err_2;
              }
              if (pendingAttachment) {
                throw err_2;
              }
              fallbackBody = body.trim().length > 0 ? body : pendingAttachmentName || ' ';
              queuedBody = { bodyMarkdown: fallbackBody };
              trimmedTopic = topic.trim();
              if (trimmedTopic) {
                queuedBody.topic = trimmedTopic;
              }
              return [4 /*yield*/, (0, offline_queue_1.enqueueMessage)(endpoint, queuedBody)];
            case 11:
              queued_1 = _c.sent();
              setPendingMessages(function (prev) {
                return __spreadArray(
                  __spreadArray([], prev, true),
                  [{ id: queued_1.id, body: body, createdAt: queued_1.createdAt }],
                  false,
                );
              });
              return [2 /*return*/, { queued: true }];
            case 12:
              return [2 /*return*/];
          }
        });
      });
    },
    onSuccess: function (result) {
      if (!result.queued && shouldPollMessages) {
        void queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      }
      setPendingAttachment(null);
      setUploadProgress(null);
      setReplyTo(null);
      setEditingMessage(null);
      if (!requiresTopic) {
        setTopic('');
      }
      stopTyping();
      if (result.queued) {
        react_native_1.Alert.alert(t('common.offline'), t('common.offlineQueue'));
      }
    },
    onError: function () {
      setUploadProgress(null);
    },
  });
  // Delete handler for action sheet
  var handleDelete = (0, react_1.useCallback)(
    function (message) {
      react_native_1.Alert.alert(t('message.delete'), t('message.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('message.delete'),
          style: 'destructive',
          onPress: function () {
            (0, api_1.api)('/api/messages/'.concat(message.id), { method: 'DELETE' })
              .then(function () {
                queryClient.setQueryData(['messages', channelId], function (old) {
                  if (!old) return old;
                  return {
                    messages: old.messages.filter(function (m) {
                      return m.id !== message.id;
                    }),
                  };
                });
              })
              .catch(function () {});
          },
        },
      ]);
    },
    [t, channelId, queryClient],
  );
  // Reply handler for action sheet
  var handleReply = (0, react_1.useCallback)(
    function () {
      if (actionMessage) {
        setEditingMessage(null);
        setReplyTo(actionMessage);
      }
      setActionMessage(null);
    },
    [actionMessage],
  );
  var handleEdit = (0, react_1.useCallback)(
    function () {
      if (!actionMessage) return;
      setReplyTo(null);
      setPendingAttachment(null);
      setShowAttachMenu(false);
      setEditingMessage(actionMessage);
      setActionMessage(null);
    },
    [actionMessage],
  );
  var handleOpenThread = (0, react_1.useCallback)(
    function () {
      return __awaiter(_this, void 0, void 0, function () {
        var threadId, _a, error_1;
        return __generator(this, function (_b) {
          switch (_b.label) {
            case 0:
              if (!actionMessage) return [2 /*return*/];
              _b.label = 1;
            case 1:
              _b.trys.push([1, 5, , 6]);
              if (!actionMessage.threadId) return [3 /*break*/, 2];
              _a = actionMessage.threadId;
              return [3 /*break*/, 4];
            case 2:
              return [
                4 /*yield*/,
                (0, api_1.api)('/api/messages/'.concat(actionMessage.id, '/thread'), {
                  method: 'POST',
                }),
              ];
            case 3:
              _a = _b.sent().id;
              _b.label = 4;
            case 4:
              threadId = _a;
              navigation.navigate('ThreadScreen', {
                threadId: threadId,
                channelId: channelId,
                communityId: route.params.communityId,
                channelName: route.params.channelName,
                rootMessageId: actionMessage.id,
              });
              return [3 /*break*/, 6];
            case 5:
              error_1 = _b.sent();
              react_native_1.Alert.alert(
                t('common.error'),
                error_1 instanceof Error ? error_1.message : t('thread.openFailed'),
              );
              return [3 /*break*/, 6];
            case 6:
              return [2 /*return*/];
          }
        });
      });
    },
    [actionMessage, channelId, navigation, route.params.channelName, route.params.communityId, t],
  );
  var openThreadForMessage = (0, react_1.useCallback)(
    function (message) {
      return __awaiter(_this, void 0, void 0, function () {
        var existingThreadId, threadId, _a, _b, error_2;
        var _c;
        return __generator(this, function (_d) {
          switch (_d.label) {
            case 0:
              _d.trys.push([0, 6, , 7]);
              existingThreadId =
                (_c = threadSummariesByRootId.get(message.id)) === null || _c === void 0
                  ? void 0
                  : _c.id;
              if (!existingThreadId) return [3 /*break*/, 1];
              _a = existingThreadId;
              return [3 /*break*/, 5];
            case 1:
              if (!message.threadId) return [3 /*break*/, 2];
              _b = message.threadId;
              return [3 /*break*/, 4];
            case 2:
              return [
                4 /*yield*/,
                (0, api_1.api)('/api/messages/'.concat(message.id, '/thread'), {
                  method: 'POST',
                }),
              ];
            case 3:
              _b = _d.sent().id;
              _d.label = 4;
            case 4:
              _a = _b;
              _d.label = 5;
            case 5:
              threadId = _a;
              navigation.navigate('ThreadScreen', {
                threadId: threadId,
                channelId: channelId,
                communityId: route.params.communityId,
                channelName: route.params.channelName,
                rootMessageId: message.id,
              });
              return [3 /*break*/, 7];
            case 6:
              error_2 = _d.sent();
              react_native_1.Alert.alert(
                t('common.error'),
                error_2 instanceof Error ? error_2.message : t('thread.openFailed'),
              );
              return [3 /*break*/, 7];
            case 7:
              return [2 /*return*/];
          }
        });
      });
    },
    [
      channelId,
      navigation,
      route.params.channelName,
      route.params.communityId,
      t,
      threadSummariesByRootId,
    ],
  );
  var handleBookmark = (0, react_1.useCallback)(
    function () {
      if (!actionMessage) return;
      (0, api_1.api)('/api/bookmarks/'.concat(actionMessage.id), { method: 'POST' }).catch(
        function (error) {
          react_native_1.Alert.alert(
            t('common.error'),
            error instanceof Error ? error.message : t('settings.bookmarksSaveFailed'),
          );
        },
      );
    },
    [actionMessage, t],
  );
  var handlePin = (0, react_1.useCallback)(
    function () {
      if (!actionMessage) return;
      (0, api_1.api)('/api/channels/'.concat(channelId, '/pins/').concat(actionMessage.id), {
        method: 'POST',
      }).catch(function (error) {
        react_native_1.Alert.alert(
          t('common.error'),
          error instanceof Error ? error.message : t('channel.pinFailed'),
        );
      });
    },
    [actionMessage, channelId, t],
  );
  var toggleReaction = (0, react_1.useCallback)(
    function (messageId, emoji) {
      return __awaiter(_this, void 0, void 0, function () {
        var reactedByMe, error_3;
        var _a, _b;
        return __generator(this, function (_c) {
          switch (_c.label) {
            case 0:
              reactedByMe =
                (_b =
                  (_a = reactionsByMessageId[messageId]) === null || _a === void 0
                    ? void 0
                    : _a.some(function (reaction) {
                        return (
                          reaction.emoji === emoji &&
                          reaction.users.some(function (user) {
                            return (
                              user.id ===
                              (currentUser === null || currentUser === void 0
                                ? void 0
                                : currentUser.id)
                            );
                          })
                        );
                      })) !== null && _b !== void 0
                  ? _b
                  : false;
              _c.label = 1;
            case 1:
              _c.trys.push([1, 6, , 7]);
              if (!reactedByMe) return [3 /*break*/, 3];
              return [
                4 /*yield*/,
                (0, api_1.api)(
                  '/api/messages/'
                    .concat(messageId, '/reactions/')
                    .concat(encodeURIComponent(emoji)),
                  {
                    method: 'DELETE',
                  },
                ),
              ];
            case 2:
              _c.sent();
              return [3 /*break*/, 5];
            case 3:
              return [
                4 /*yield*/,
                (0, api_1.api)('/api/messages/'.concat(messageId, '/reactions'), {
                  method: 'POST',
                  body: { emoji: emoji },
                }),
              ];
            case 4:
              _c.sent();
              _c.label = 5;
            case 5:
              queryClient.invalidateQueries({ queryKey: ['message-reactions', channelId] });
              return [3 /*break*/, 7];
            case 6:
              error_3 = _c.sent();
              react_native_1.Alert.alert(
                t('common.error'),
                error_3 instanceof Error ? error_3.message : t('message.reactionFailed'),
              );
              return [3 /*break*/, 7];
            case 7:
              return [2 /*return*/];
          }
        });
      });
    },
    [
      channelId,
      currentUser === null || currentUser === void 0 ? void 0 : currentUser.id,
      queryClient,
      reactionsByMessageId,
      t,
    ],
  );
  var handleReact = (0, react_1.useCallback)(
    function (emoji) {
      if (!actionMessage) return;
      void toggleReaction(actionMessage.id, emoji);
    },
    [actionMessage, toggleReaction],
  );
  var votePollMutation = (0, react_query_1.useMutation)({
    mutationFn: function (_a) {
      var pollId = _a.pollId,
        optionId = _a.optionId,
        voted = _a.voted;
      return voted
        ? (0, api_1.api)('/api/polls/'.concat(pollId, '/vote/').concat(optionId), {
            method: 'DELETE',
          })
        : (0, api_1.api)('/api/polls/'.concat(pollId, '/vote'), {
            method: 'POST',
            body: { optionId: optionId },
          });
    },
    onSuccess: function () {
      return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [
                4 /*yield*/,
                Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['polls', channelId] }),
                  queryClient.invalidateQueries({ queryKey: ['polls-by-message', channelId] }),
                ]),
              ];
            case 1:
              _a.sent();
              return [2 /*return*/];
          }
        });
      });
    },
    onError: function (error) {
      react_native_1.Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('poll.voteFailed'),
      );
    },
  });
  var handleTranslate = (0, react_1.useCallback)(
    function () {
      var existing;
      if (!actionMessage) return Promise.resolve();
      existing = translatedBodies[actionMessage.id];
      if (existing) {
        setTranslatedBodies(function (prev) {
          var next = __assign({}, prev);
          delete next[actionMessage.id];
          return next;
        });
        return Promise.resolve();
      }
      return (0, api_1.api)('/api/translate', {
        method: 'POST',
        body: {
          text: actionMessage.bodyPlaintext,
          targetLang: locale,
        },
      })
        .then(function (result) {
          var resolution = (0, shared_1.resolveTranslationResponse)({
            response: result,
            targetLanguage: locale,
            sourceVersion: (0, shared_1.getTranslationRenderSourceVersion)(actionMessage),
          });
          if (!resolution.entry) {
            react_native_1.Alert.alert(
              t('common.error'),
              resolution.state === 'runtime-disabled'
                ? t('message.translationDisabled')
                : resolution.runtime.issue
                  ? t('message.translationUnavailableWithIssue', {
                      issue: resolution.runtime.issue,
                    })
                  : t('message.translationUnavailable'),
            );
            return;
          }
          setTranslatedBodies(function (prev) {
            var _a;
            return __assign(
              __assign({}, prev),
              ((_a = {}),
              (_a[actionMessage.id] = {
                entry: resolution.entry,
                runtimeStatus: resolution.runtime.status,
                issue: resolution.runtime.issue,
              }),
              _a),
            );
          });
        })
        .catch(function (error_4) {
          react_native_1.Alert.alert(
            t('common.error'),
            error_4 instanceof Error ? error_4.message : t('message.translateFailed'),
          );
        });
    },
    [actionMessage, locale, t, translatedBodies],
  );
  var applyComposerDraft = (0, react_1.useCallback)(function (nextDraft) {
    setComposerDraftSeed(nextDraft);
    setComposerDraftText(nextDraft);
    setComposerDraftKey('ai-draft-'.concat(Date.now()));
  }, []);
  var aiRuntimePresentation = (0, ai_1.getAiRuntimePresentation)(t, aiRuntime);
  var aiStatusLabel = aiRuntimePresentation === null || aiRuntimePresentation === void 0 ? void 0 : aiRuntimePresentation.label;
  var aiStatusTone = (aiRuntimePresentation === null || aiRuntimePresentation === void 0 ? void 0 : aiRuntimePresentation.tone) ?? 'unavailable';
  var aiStatusRuntimeDescription = (aiRuntimePresentation === null || aiRuntimePresentation === void 0 ? void 0 : aiRuntimePresentation.description) ?? t('common.loading');
  var aiStatusDescription = [aiStatusRuntimeDescription, t('ai.selectedMessageScopeHint')]
    .filter(Boolean)
    .join(' ');
  var handleAiReplyDraft = (0, react_1.useCallback)(
    function () {
      return __awaiter(_this, void 0, void 0, function () {
        var contract, reply, error_5;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              if (!actionMessage) {
                return [2 /*return*/];
              }
              contract = (0, ai_1.buildSelectedMessageAiAction)({
                action: 'reply-draft',
                surface: 'channel',
                sourceMessage: {
                  authorDisplayName:
                    (_b = actionMessage.author) === null || _b === void 0 ? void 0 : _b.displayName,
                  bodyText: actionMessage.bodyPlaintext,
                },
              });
              if (contract.errorKey || !contract.chatMessages) {
                react_native_1.Alert.alert(
                  t('common.error'),
                  t(contract.errorKey || 'ai.selectedMessageUnavailable'),
                );
                return [2 /*return*/];
              }
              _a.label = 1;
            case 1:
              _a.trys.push([1, 3, , 4]);
              return [4 /*yield*/, (0, ai_1.requestAiChat)(contract.chatMessages)];
            case 2:
              reply = _a.sent();
              setReplyTo(actionMessage);
              setEditingMessage(null);
              applyComposerDraft(reply);
              react_native_1.Alert.alert(
                t('ai.messageReplyDraft'),
                t((0, ai_1.getSelectedMessageAiAppliedMessageKey)('reply-draft', aiRuntime)),
              );
              return [3 /*break*/, 4];
            case 3:
              error_5 = _a.sent();
              react_native_1.Alert.alert(
                t('common.error'),
                (0, error_message_1.getUserFacingErrorMessage)(error_5, t),
              );
              return [3 /*break*/, 4];
            case 4:
              return [2 /*return*/];
          }
        });
        var _b;
      });
    },
    [actionMessage, aiRuntime, applyComposerDraft, t],
  );
  var handleAiRewriteDraft = (0, react_1.useCallback)(
    function () {
      return __awaiter(_this, void 0, void 0, function () {
        var contract, rewrittenDraft, error_6;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              if (!actionMessage) {
                return [2 /*return*/];
              }
              contract = (0, ai_1.buildSelectedMessageAiAction)({
                action: 'rewrite-draft',
                surface: 'channel',
                sourceMessage: {
                  authorDisplayName:
                    (_b = actionMessage.author) === null || _b === void 0 ? void 0 : _b.displayName,
                  bodyText: actionMessage.bodyPlaintext,
                },
                currentDraft: composerDraftText,
              });
              if (contract.errorKey || !contract.chatMessages) {
                react_native_1.Alert.alert(
                  t('common.error'),
                  t(contract.errorKey || 'ai.selectedMessageUnavailable'),
                );
                return [2 /*return*/];
              }
              _a.label = 1;
            case 1:
              _a.trys.push([1, 3, , 4]);
              return [4 /*yield*/, (0, ai_1.requestAiChat)(contract.chatMessages)];
            case 2:
              rewrittenDraft = _a.sent();
              applyComposerDraft(rewrittenDraft);
              react_native_1.Alert.alert(
                t('ai.messageRewriteDraft'),
                t((0, ai_1.getSelectedMessageAiAppliedMessageKey)('rewrite-draft', aiRuntime)),
              );
              return [3 /*break*/, 4];
            case 3:
              error_6 = _a.sent();
              react_native_1.Alert.alert(
                t('common.error'),
                (0, error_message_1.getUserFacingErrorMessage)(error_6, t),
              );
              return [3 /*break*/, 4];
            case 4:
              return [2 /*return*/];
          }
        });
        var _b;
      });
    },
    [actionMessage, aiRuntime, applyComposerDraft, composerDraftText, t],
  );
  var handleReport = (0, react_1.useCallback)(
    function () {
      if (!actionMessage || !route.params.communityId) return;
      var submitReport = function (reasonCode) {
        (0, api_1.api)('/api/reports', {
          method: 'POST',
          body: {
            communityId: route.params.communityId,
            messageId: actionMessage.id,
            reportedUserId: actionMessage.authorUserId,
            reasonCode: reasonCode,
          },
        })
          .then(function () {
            react_native_1.Alert.alert(t('message.reportTitle'), t('message.reportSubmitted'));
          })
          .catch(function (error) {
            react_native_1.Alert.alert(
              t('common.error'),
              error instanceof Error ? error.message : t('message.reportFailed'),
            );
          });
      };
      react_native_1.Alert.alert(t('message.reportTitle'), t('message.reportBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('message.reportSpam'),
          onPress: function () {
            return submitReport('spam');
          },
        },
        {
          text: t('message.reportHarassment'),
          onPress: function () {
            return submitReport('harassment');
          },
        },
        {
          text: t('message.reportInappropriate'),
          onPress: function () {
            return submitReport('inappropriate');
          },
        },
      ]);
    },
    [actionMessage, route.params.communityId, t],
  );
  // Attachment handlers
  var handlePickImage = (0, react_1.useCallback)(
    function () {
      return __awaiter(_this, void 0, void 0, function () {
        var file, error_5;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              setShowAttachMenu(false);
              _a.label = 1;
            case 1:
              _a.trys.push([1, 3, , 4]);
              return [4 /*yield*/, (0, file_picker_1.pickImage)()];
            case 2:
              file = _a.sent();
              if (file) setPendingAttachment(file);
              return [3 /*break*/, 4];
            case 3:
              error_5 = _a.sent();
              react_native_1.Alert.alert(
                t('common.error'),
                error_5 instanceof Error ? error_5.message : t('common.errorOccurred'),
              );
              return [3 /*break*/, 4];
            case 4:
              return [2 /*return*/];
          }
        });
      });
    },
    [t],
  );
  var handleTakePhoto = (0, react_1.useCallback)(
    function () {
      return __awaiter(_this, void 0, void 0, function () {
        var file, error_6;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              setShowAttachMenu(false);
              _a.label = 1;
            case 1:
              _a.trys.push([1, 3, , 4]);
              return [4 /*yield*/, (0, file_picker_1.takePhoto)()];
            case 2:
              file = _a.sent();
              if (file) setPendingAttachment(file);
              return [3 /*break*/, 4];
            case 3:
              error_6 = _a.sent();
              react_native_1.Alert.alert(
                t('common.error'),
                error_6 instanceof Error ? error_6.message : t('common.errorOccurred'),
              );
              return [3 /*break*/, 4];
            case 4:
              return [2 /*return*/];
          }
        });
      });
    },
    [t],
  );
  var handlePickDocument = (0, react_1.useCallback)(
    function () {
      return __awaiter(_this, void 0, void 0, function () {
        var file, error_7;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              setShowAttachMenu(false);
              _a.label = 1;
            case 1:
              _a.trys.push([1, 3, , 4]);
              return [4 /*yield*/, (0, file_picker_1.pickDocument)()];
            case 2:
              file = _a.sent();
              if (file) setPendingAttachment(file);
              return [3 /*break*/, 4];
            case 3:
              error_7 = _a.sent();
              react_native_1.Alert.alert(
                t('common.error'),
                error_7 instanceof Error ? error_7.message : t('common.errorOccurred'),
              );
              return [3 /*break*/, 4];
            case 4:
              return [2 /*return*/];
          }
        });
      });
    },
    [t],
  );
  var handleToggleAttachMenu = (0, react_1.useCallback)(function () {
    setShowAttachMenu(function (prev) {
      return !prev;
    });
  }, []);
  var handleShareAttachment = (0, react_1.useCallback)(
    function (attachment) {
      return __awaiter(_this, void 0, void 0, function () {
        var token, _a, attachmentDirectory, targetFile, downloadedFile, error_8;
        return __generator(this, function (_b) {
          switch (_b.label) {
            case 0:
              if (openingAttachmentId) return [2 /*return*/];
              setOpeningAttachmentId(attachment.id);
              _b.label = 1;
            case 1:
              _b.trys.push([1, 7, 8, 9]);
              if (!(authToken !== null && authToken !== void 0)) return [3 /*break*/, 2];
              _a = authToken;
              return [3 /*break*/, 4];
            case 2:
              return [4 /*yield*/, (0, storage_1.getToken)()];
            case 3:
              _a = _b.sent();
              _b.label = 4;
            case 4:
              token = _a;
              attachmentDirectory = new expo_file_system_1.Directory(
                expo_file_system_1.Paths.cache,
                'attachments',
              );
              attachmentDirectory.create({ idempotent: true, intermediates: true });
              targetFile = new expo_file_system_1.File(
                attachmentDirectory,
                ''.concat(sanitizeAttachmentName(attachment.fileName)),
              );
              return [
                4 /*yield*/,
                expo_file_system_1.File.downloadFileAsync(
                  (0, file_picker_1.getAttachmentFileUrl)(attachment.id),
                  targetFile,
                  {
                    idempotent: true,
                    headers: token ? { Authorization: 'Bearer '.concat(token) } : undefined,
                  },
                ),
              ];
            case 5:
              downloadedFile = _b.sent();
              return [
                4 /*yield*/,
                react_native_1.Share.share({
                  title: attachment.fileName,
                  message: attachment.fileName,
                  url: downloadedFile.uri,
                }),
              ];
            case 6:
              _b.sent();
              return [3 /*break*/, 9];
            case 7:
              error_8 = _b.sent();
              react_native_1.Alert.alert(
                t('common.error'),
                error_8 instanceof Error ? error_8.message : t('channel.openAttachmentFailed'),
              );
              return [3 /*break*/, 9];
            case 8:
              setOpeningAttachmentId(null);
              return [7 /*endfinally*/];
            case 9:
              return [2 /*return*/];
          }
        });
      });
    },
    [authToken, openingAttachmentId, t],
  );
  var handleOpenAttachment = (0, react_1.useCallback)(
    function (attachment, attachments) {
      return __awaiter(_this, void 0, void 0, function () {
        var imageAttachments, index;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              if (
                (0, shared_1.isImageAttachmentMimeType)(attachment.mimeType, attachment.fileName)
              ) {
                imageAttachments = (
                  attachments !== null && attachments !== void 0 ? attachments : [attachment]
                ).filter(function (item) {
                  return (0, shared_1.isImageAttachmentMimeType)(item.mimeType, item.fileName);
                });
                index = imageAttachments.findIndex(function (item) {
                  return item.id === attachment.id;
                });
                setPreviewGallery({
                  attachments: imageAttachments.length > 0 ? imageAttachments : [attachment],
                  index: index >= 0 ? index : 0,
                });
                return [2 /*return*/];
              }
              return [4 /*yield*/, handleShareAttachment(attachment)];
            case 1:
              _a.sent();
              return [2 /*return*/];
          }
        });
      });
    },
    [handleShareAttachment],
  );
  var handleSend = (0, react_1.useCallback)(
    function (text) {
      return __awaiter(_this, void 0, void 0, function () {
        var trimmed, error_9, isOffline, message;
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              trimmed = text.trim();
              if ((!trimmed && !pendingAttachment) || sendMutation.isPending)
                return [2 /*return*/, false];
              if (!editingMessage && requiresTopic && !topic.trim()) {
                react_native_1.Alert.alert(t('common.error'), t('channel.topicRequired'));
                return [2 /*return*/, false];
              }
              setShowAttachMenu(false);
              _a.label = 1;
            case 1:
              _a.trys.push([1, 3, , 4]);
              return [4 /*yield*/, sendMutation.mutateAsync(trimmed)];
            case 2:
              _a.sent();
              return [2 /*return*/, true];
            case 3:
              error_9 = _a.sent();
              isOffline = error_9 instanceof api_1.ApiError && error_9.status === 0;
              message =
                pendingAttachment && isOffline
                  ? t('channel.attachmentNeedsConnection')
                  : (0, error_message_1.getUserFacingErrorMessage)(error_9, t, {
                      rateLimitedKey: pendingAttachment
                        ? 'message.attachmentRateLimited'
                        : 'common.rateLimited',
                    });
              react_native_1.Alert.alert(t('common.error'), message);
              return [2 /*return*/, false];
            case 4:
              return [2 /*return*/];
          }
        });
      });
    },
    [editingMessage, pendingAttachment, requiresTopic, sendMutation, t, topic],
  );
  (0, react_1.useEffect)(
    function () {
      if (!simulator_harness_1.isSimulatorHarnessEnabled) {
        return;
      }
      var cancelled = false;
      function tryDevCompose() {
        return __awaiter(this, void 0, void 0, function () {
          var payload, sent;
          return __generator(this, function (_a) {
            switch (_a.label) {
              case 0:
                if (cancelled || devComposeInFlightRef.current) {
                  return [2 /*return*/];
                }
                devComposeInFlightRef.current = true;
                return [
                  4 /*yield*/,
                  (0, simulator_harness_1.readSimulatorHarnessJson)('dev-compose.json'),
                ];
              case 1:
                payload = _a.sent();
                if (!payload || cancelled) {
                  devComposeInFlightRef.current = false;
                  return [2 /*return*/];
                }
                _a.label = 2;
              case 2:
                _a.trys.push([2, , 8, 9]);
                if (
                  (payload === null || payload === void 0 ? void 0 : payload.channelId) !==
                  channelId
                ) {
                  return [2 /*return*/];
                }
                if (!(typeof payload.body !== 'string' || payload.body.trim().length === 0))
                  return [3 /*break*/, 4];
                return [
                  4 /*yield*/,
                  (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-compose.json'),
                ];
              case 3:
                _a.sent();
                return [2 /*return*/];
              case 4:
                return [4 /*yield*/, handleSend(payload.body)];
              case 5:
                sent = _a.sent();
                if (!sent) return [3 /*break*/, 7];
                return [
                  4 /*yield*/,
                  (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-compose.json'),
                ];
              case 6:
                _a.sent();
                _a.label = 7;
              case 7:
                return [3 /*break*/, 9];
              case 8:
                devComposeInFlightRef.current = false;
                return [7 /*endfinally*/];
              case 9:
                return [2 /*return*/];
            }
          });
        });
      }
      void tryDevCompose();
      var interval = setInterval(function () {
        void tryDevCompose();
      }, 1000);
      return function () {
        cancelled = true;
        clearInterval(interval);
      };
    },
    [channelId, handleSend],
  );
  (0, react_1.useEffect)(
    function () {
      if (
        !simulator_harness_1.isSimulatorHarnessEnabled ||
        devAttachmentAttemptedRef.current ||
        !simulator_harness_1.simulatorHarnessDirectory
      ) {
        return;
      }
      var cancelled = false;
      devAttachmentAttemptedRef.current = true;
      function tryDevAttachment() {
        return __awaiter(this, void 0, void 0, function () {
          var payload, tempFileName, tempUri, attachmentData, messageBody, trimmedTopic, result;
          var _a, _b, _c;
          return __generator(this, function (_d) {
            switch (_d.label) {
              case 0:
                return [
                  4 /*yield*/,
                  (0, simulator_harness_1.readSimulatorHarnessJson)('dev-attachment.json'),
                ];
              case 1:
                payload = _d.sent();
                if (!payload || cancelled) {
                  devAttachmentAttemptedRef.current = false;
                  return [2 /*return*/];
                }
                _d.label = 2;
              case 2:
                _d.trys.push([2, , 11, 12]);
                return [
                  4 /*yield*/,
                  (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-attachment.json'),
                ];
              case 3:
                _d.sent();
                if (
                  (payload === null || payload === void 0 ? void 0 : payload.channelId) !==
                    channelId ||
                  typeof payload.contents !== 'string' ||
                  !payload.contents.length
                ) {
                  return [2 /*return*/];
                }
                tempFileName = payload.fileName || 'dev-attachment-'.concat(Date.now(), '.txt');
                tempUri = ''
                  .concat(simulator_harness_1.simulatorHarnessDirectory)
                  .concat(tempFileName);
                return [
                  4 /*yield*/,
                  LegacyFileSystem.writeAsStringAsync(tempUri, payload.contents),
                ];
              case 4:
                _d.sent();
                return [
                  4 /*yield*/,
                  (0, file_picker_1.uploadFile)(
                    {
                      uri: tempUri,
                      name: tempFileName,
                      mimeType: payload.mimeType || 'text/plain',
                      size: payload.contents.length,
                    },
                    { channelId: channelId },
                  ),
                ];
              case 5:
                attachmentData = _d.sent();
                messageBody = {
                  bodyMarkdown:
                    ((_a = payload.body) === null || _a === void 0 ? void 0 : _a.trim()) ||
                    ((_b = payload.fileName) === null || _b === void 0 ? void 0 : _b.trim()) ||
                    ' ',
                };
                trimmedTopic = topic.trim();
                if (trimmedTopic) {
                  messageBody.topic = trimmedTopic;
                }
                return [
                  4 /*yield*/,
                  (0, api_1.api)(endpoint, {
                    method: 'POST',
                    body: messageBody,
                    headers: {
                      'X-Request-Id': (0, api_1.createRequestId)(),
                    },
                  }),
                ];
              case 6:
                result = _d.sent();
                if (!((_c = result.message) === null || _c === void 0 ? void 0 : _c.id))
                  return [3 /*break*/, 9];
                return [
                  4 /*yield*/,
                  (0, file_picker_1.attachToMessage)(result.message.id, attachmentData),
                ];
              case 7:
                _d.sent();
                return [
                  4 /*yield*/,
                  queryClient.invalidateQueries({ queryKey: ['messages', channelId] }),
                ];
              case 8:
                _d.sent();
                _d.label = 9;
              case 9:
                return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessPath)(tempUri)];
              case 10:
                _d.sent();
                return [3 /*break*/, 12];
              case 11:
                devAttachmentAttemptedRef.current = false;
                return [7 /*endfinally*/];
              case 12:
                return [2 /*return*/];
            }
          });
        });
      }
      void tryDevAttachment();
      return function () {
        cancelled = true;
      };
    },
    [channelId, endpoint, queryClient, t, topic],
  );
  (0, react_1.useEffect)(
    function () {
      if (!focusMessageId || mergedMessages.length === 0) return;
      var focusIndex = mergedMessages.findIndex(function (message) {
        return message.id === focusMessageId;
      });
      if (focusIndex === -1) return;
      var timer = setTimeout(function () {
        var _a;
        (_a = listRef.current) === null || _a === void 0
          ? void 0
          : _a.scrollToIndex({
              index: focusIndex,
              animated: true,
              viewPosition: 0.5,
            });
      }, 50);
      return function () {
        return clearTimeout(timer);
      };
    },
    [focusMessageId, mergedMessages],
  );
  if (isLoading) {
    return <LoadingSpinner_1.default text={t('channel.loadingMessages')} />;
  }
  var messagesById = new Map(
    mergedMessages.map(function (message) {
      return [message.id, message];
    }),
  );
  var renderAttachments = function (attachments, isOwn) {
    var imageAttachments = attachments.filter(function (attachment) {
      return (0, shared_1.isImageAttachmentMimeType)(attachment.mimeType, attachment.fileName);
    });
    var fileAttachments = attachments.filter(function (attachment) {
      return !(0, shared_1.isImageAttachmentMimeType)(attachment.mimeType, attachment.fileName);
    });
    var visibleImageAttachments = imageAttachments.slice(0, 4);
    return (
      <react_native_1.View style={[styles.attachments, isOwn && styles.attachmentsOwn]}>
        {imageAttachments.length > 0 ? (
          <react_native_1.View
            style={[
              styles.attachmentImageGrid,
              imageAttachments.length === 1 && styles.attachmentImageGridSingle,
              isOwn && styles.attachmentImageGridOwn,
            ]}
          >
            {visibleImageAttachments.map(function (attachment, index) {
              var isSingle = imageAttachments.length === 1;
              var isHero = imageAttachments.length === 3 && index === 0;
              var extraCount =
                imageAttachments.length > 4 && index === 3 ? imageAttachments.length - 4 : 0;
              return (
                <react_native_1.TouchableOpacity
                  key={attachment.id}
                  testID={'channel-attachment-image-'.concat(attachment.id)}
                  style={[
                    styles.attachmentImageCard,
                    isSingle && styles.attachmentImageCardSingle,
                    !isSingle && styles.attachmentImageCardGrid,
                    isHero && styles.attachmentImageCardHero,
                  ]}
                  activeOpacity={0.88}
                  onPress={function () {
                    return void handleOpenAttachment(attachment, attachments);
                  }}
                >
                  <react_native_1.Image
                    source={__assign(
                      { uri: (0, file_picker_1.getAttachmentFileUrl)(attachment.id) },
                      authToken ? { headers: { Authorization: 'Bearer '.concat(authToken) } } : {},
                    )}
                    style={styles.attachmentImage}
                    resizeMode="cover"
                  />
                  {extraCount > 0 ? (
                    <react_native_1.View style={styles.attachmentImageMoreOverlay}>
                      <react_native_1.Text style={styles.attachmentImageMoreText}>
                        {'+'.concat(extraCount)}
                      </react_native_1.Text>
                    </react_native_1.View>
                  ) : null}
                </react_native_1.TouchableOpacity>
              );
            })}
          </react_native_1.View>
        ) : null}
        {fileAttachments.map(function (attachment) {
          return (
            <react_native_1.View key={attachment.id} style={styles.attachmentItem}>
              <react_native_1.TouchableOpacity
                testID={'channel-attachment-file-'.concat(attachment.id)}
                style={styles.attachmentFile}
                activeOpacity={0.8}
                onPress={function () {
                  return void handleOpenAttachment(attachment, attachments);
                }}
                disabled={openingAttachmentId === attachment.id}
              >
                <react_native_1.View style={styles.attachmentFileIconWrap}>
                  <react_native_1.Text style={styles.attachmentFileIcon}>
                    {'\uD83D\uDCC4'}
                  </react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.attachmentFileContent}>
                  <react_native_1.View style={styles.attachmentFileMetaRow}>
                    <react_native_1.View style={styles.attachmentFileTypeBadge}>
                      <react_native_1.Text style={styles.attachmentFileTypeBadgeText}>
                        {getAttachmentKindLabel(attachment.fileName, attachment.mimeType)}
                      </react_native_1.Text>
                    </react_native_1.View>
                  </react_native_1.View>
                  <react_native_1.Text style={styles.attachmentFileName} numberOfLines={1}>
                    {attachment.fileName}
                  </react_native_1.Text>
                  <react_native_1.Text style={styles.attachmentSize}>
                    {openingAttachmentId === attachment.id
                      ? t('channel.openingAttachment')
                      : formatFileSize(attachment.fileSize)}
                  </react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.attachmentFileCta}>
                  <react_native_1.Text style={styles.attachmentFileCtaText}>
                    {t('channel.shareAttachment')}
                  </react_native_1.Text>
                </react_native_1.View>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          );
        })}
      </react_native_1.View>
    );
  };
  return (
    <react_native_1.KeyboardAvoidingView
      testID="channel-screen"
      style={styles.container}
      behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <react_native_1.FlatList
        testID="channel-message-list"
        ref={listRef}
        data={mergedMessages}
        keyExtractor={function (item) {
          return item.id;
        }}
        inverted
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={function () {}}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={react_native_1.Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        refreshControl={
          <react_native_1.RefreshControl
            refreshing={isFocused && isRefetching}
            onRefresh={refetch}
            tintColor={theme_1.colors.primary}
          />
        }
        renderItem={function (_a) {
          var _b, _c, _d, _e, _f, _g, _h, _j, _k;
          var item = _a.item,
            index = _a.index;
          var isOwn =
            item.authorUserId ===
            (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id);
          var previousMessage = index > 0 ? mergedMessages[index - 1] : undefined;
          var nextMessage =
            index < mergedMessages.length - 1 ? mergedMessages[index + 1] : undefined;
          var startsGroup =
            (previousMessage === null || previousMessage === void 0
              ? void 0
              : previousMessage.authorUserId) !== item.authorUserId;
          var endsGroup =
            (nextMessage === null || nextMessage === void 0 ? void 0 : nextMessage.authorUserId) !==
            item.authorUserId;
          var repliedMessage = item.parentMessageId
            ? messagesById.get(item.parentMessageId)
            : undefined;
          var messagePoll = pollsByMessageId[item.id];
          var threadSummary = threadSummariesByRootId.get(item.id);
          var itemAttachments = (_b = item.attachments) !== null && _b !== void 0 ? _b : [];
          var messageReactions =
            (_c = reactionsByMessageId[item.id]) !== null && _c !== void 0 ? _c : [];
          var displayBody = (0, shared_1.shouldHideAttachmentBody)(
            item.bodyPlaintext || item.bodyMarkdown,
            itemAttachments,
          )
            ? ''
            : item.bodyPlaintext;
          return (
            <react_native_1.View>
              {index === 0 ||
              new Date(mergedMessages[index - 1].createdAt).toDateString() !==
                new Date(item.createdAt).toDateString() ? (
                <react_native_1.View style={styles.dateDividerRow}>
                  <react_native_1.View style={styles.dateDividerLine} />
                  <react_native_1.Text style={styles.dateDividerText}>
                    {new Date(item.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                    })}
                  </react_native_1.Text>
                  <react_native_1.View style={styles.dateDividerLine} />
                </react_native_1.View>
              ) : null}
              <react_native_1.TouchableOpacity
                testID={`channel-message-touchable-${item.id}`}
                activeOpacity={1}
                onLongPress={function () {
                  setSelectedMessageId(item.id);
                  setActionMessage(item);
                }}
                delayLongPress={400}
              >
                <react_native_1.View
                  style={item.id === focusMessageId ? styles.focusedMessageWrap : undefined}
                >
                  <MessageBubble_1.default
                    authorName={
                      (_e =
                        (_d = item.author) === null || _d === void 0 ? void 0 : _d.displayName) !==
                        null && _e !== void 0
                        ? _e
                        : t('common.unknown')
                    }
                    authorAvatarUrl={
                      (_g =
                        (_f = item.author) === null || _f === void 0 ? void 0 : _f.avatarUrl) !==
                        null && _g !== void 0
                        ? _g
                        : null
                    }
                    body={displayBody}
                    topic={item.topic}
                    translatedBody={translatedBodies[item.id]?.entry?.translatedText}
                    translatedLabel={
                      translatedBodies[item.id]
                        ? translatedBodies[item.id].runtimeStatus === 'mock'
                          ? t('message.translatedMock')
                          : t('message.translated')
                        : undefined
                    }
                    replyAuthorName={
                      (_j =
                        (_h =
                          repliedMessage === null || repliedMessage === void 0
                            ? void 0
                            : repliedMessage.author) === null || _h === void 0
                          ? void 0
                          : _h.displayName) !== null && _j !== void 0
                        ? _j
                        : t('message.reply')
                    }
                    replyBody={
                      item.parentMessageId
                        ? (_k =
                            repliedMessage === null || repliedMessage === void 0
                              ? void 0
                              : repliedMessage.bodyPlaintext) !== null && _k !== void 0
                          ? _k
                          : t('message.replyUnavailable')
                        : undefined
                    }
                    time={new Date(item.createdAt).toLocaleTimeString('ko-KR', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                    isOwn={isOwn}
                    isEdited={item.isEdited}
                    editedLabel={t('message.edited')}
                    readCount={itemAttachments.length > 0 ? undefined : unreadCounts[item.id]}
                    showAvatar={startsGroup}
                    showAuthorName={startsGroup}
                    startsGroup={startsGroup}
                    endsGroup={endsGroup}
                    showActionChips={selectedMessageId === item.id}
                    reactions={messageReactions.map(function (reaction) {
                      return {
                        emoji: reaction.emoji,
                        count: reaction.count,
                        reactedByMe: reaction.users.some(function (user) {
                          return (
                            user.id ===
                            (currentUser === null || currentUser === void 0
                              ? void 0
                              : currentUser.id)
                          );
                        }),
                      };
                    })}
                    poll={
                      messagePoll
                        ? __assign(__assign({}, messagePoll), {
                            footerLabel: ''
                              .concat(
                                t('poll.totalVotes', { count: messagePoll.totalVotes }),
                                ' \u2022 ',
                              )
                              .concat(messagePoll.closed ? t('poll.closed') : t('poll.open')),
                          })
                        : undefined
                    }
                    onPressPollOption={
                      messagePoll
                        ? function (optionId, voted) {
                            votePollMutation.mutate({
                              pollId: messagePoll.id,
                              optionId: optionId,
                              voted: voted,
                            });
                          }
                        : undefined
                    }
                    onPressReaction={
                      canReactToMessages
                        ? function (emoji) {
                            void toggleReaction(item.id, emoji);
                          }
                        : undefined
                    }
                    onPressAddReaction={
                      canReactToMessages
                        ? function () {
                            return setActionMessage(item);
                          }
                        : undefined
                    }
                    onPressMore={function () {
                      return setActionMessage(item);
                    }}
                    threadButtonLabel={
                      threadSummary
                        ? t('thread.openThread', { count: threadSummary.replyCount })
                        : undefined
                    }
                    onPressThread={
                      threadSummary
                        ? function () {
                            void openThreadForMessage(item);
                          }
                        : undefined
                    }
                  />
                  {itemAttachments.length > 0 ? (
                    <react_native_1.View
                      style={[
                        styles.attachmentMetaRow,
                        isOwn ? styles.attachmentMetaRowOwn : styles.attachmentMetaRowOther,
                      ]}
                    >
                      {isOwn ? (
                        <react_native_1.View
                          style={[styles.attachmentMetaColumn, styles.attachmentMetaColumnOwn]}
                        >
                          {(unreadCounts[item.id] !== null && unreadCounts[item.id] !== void 0
                            ? unreadCounts[item.id]
                            : 0) > 0 ? (
                            <react_native_1.Text style={styles.attachmentReadCount}>
                              {formatUnreadCount(
                                unreadCounts[item.id] !== null && unreadCounts[item.id] !== void 0
                                  ? unreadCounts[item.id]
                                  : 0,
                              )}
                            </react_native_1.Text>
                          ) : null}
                          {messageReactions.length === 0 ? (
                            <react_native_1.Text style={styles.attachmentMetaTime}>
                              {new Date(item.createdAt).toLocaleTimeString('ko-KR', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </react_native_1.Text>
                          ) : null}
                        </react_native_1.View>
                      ) : null}
                      <react_native_1.View style={styles.attachmentMetaMain}>
                        {renderAttachments(itemAttachments, isOwn)}
                      </react_native_1.View>
                      {!isOwn ? (
                        <react_native_1.View
                          style={[styles.attachmentMetaColumn, styles.attachmentMetaColumnOther]}
                        >
                          {(unreadCounts[item.id] !== null && unreadCounts[item.id] !== void 0
                            ? unreadCounts[item.id]
                            : 0) > 0 ? (
                            <react_native_1.Text style={styles.attachmentReadCount}>
                              {formatUnreadCount(
                                unreadCounts[item.id] !== null && unreadCounts[item.id] !== void 0
                                  ? unreadCounts[item.id]
                                  : 0,
                              )}
                            </react_native_1.Text>
                          ) : null}
                          {messageReactions.length === 0 ? (
                            <react_native_1.Text style={styles.attachmentMetaTime}>
                              {new Date(item.createdAt).toLocaleTimeString('ko-KR', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </react_native_1.Text>
                          ) : null}
                        </react_native_1.View>
                      ) : null}
                    </react_native_1.View>
                  ) : null}
                </react_native_1.View>
              </react_native_1.TouchableOpacity>
            </react_native_1.View>
          );
        }}
        ListHeaderComponent={
          pendingMessages.length > 0 ? (
            <react_native_1.View style={styles.pendingSection}>
              {pendingMessages.map(function (pm) {
                return (
                  <react_native_1.View key={pm.id} style={styles.pendingItem}>
                    <react_native_1.Text style={styles.pendingBody}>{pm.body}</react_native_1.Text>
                    <react_native_1.Text style={styles.pendingLabel}>
                      {t('channel.sendingMsg')}
                    </react_native_1.Text>
                  </react_native_1.View>
                );
              })}
            </react_native_1.View>
          ) : null
        }
        ListEmptyComponent={
          <react_native_1.View style={{ transform: [{ scaleY: -1 }] }}>
            <EmptyState_1.default
              icon="message"
              title={t('channel.noMessages')}
              subtitle={t('channel.beFirst')}
            />
          </react_native_1.View>
        }
        contentContainerStyle={[
          styles.listContent,
          mergedMessages.length === 0 && pendingMessages.length === 0
            ? styles.emptyContainer
            : null,
        ]}
      />

      {/* Typing indicator */}
      {typingUserIds.length > 0 && (
        <react_native_1.View style={styles.typingBar}>
          <react_native_1.Text style={styles.typingText}>
            {typingUserIds.length === 1
              ? t('channel.typing')
              : t('channel.typingMultiple', { count: typingUserIds.length })}
          </react_native_1.Text>
        </react_native_1.View>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <react_native_1.View style={styles.replyBar}>
          <react_native_1.View style={styles.replyContent}>
            <react_native_1.Text style={styles.replyLabel}>
              {t('message.reply')}
            </react_native_1.Text>
            <react_native_1.Text style={styles.replyText} numberOfLines={1}>
              {replyTo.bodyPlaintext}
            </react_native_1.Text>
          </react_native_1.View>
          <react_native_1.TouchableOpacity
            onPress={function () {
              return setReplyTo(null);
            }}
          >
            <react_native_1.Text style={styles.replyClose}>{'\u2715'}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      )}

      {editingMessage && (
        <react_native_1.View style={styles.replyBar}>
          <react_native_1.View style={styles.replyContent}>
            <react_native_1.Text style={styles.replyLabel}>{t('common.edit')}</react_native_1.Text>
            <react_native_1.Text style={styles.replyText} numberOfLines={1}>
              {editingMessage.bodyPlaintext}
            </react_native_1.Text>
          </react_native_1.View>
          <react_native_1.TouchableOpacity
            onPress={function () {
              return setEditingMessage(null);
            }}
          >
            <react_native_1.Text style={styles.replyClose}>{'\u2715'}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      )}

      {!isArchived && canPostChannel && requiresTopic && (
        <react_native_1.View style={styles.topicBar}>
          <react_native_1.Text style={styles.topicLabel}>{t('channel.topic')}</react_native_1.Text>
          <react_native_1.TextInput
            style={styles.topicInput}
            value={topic}
            onChangeText={setTopic}
            placeholder={t('channel.topicPlaceholder')}
            placeholderTextColor={theme_1.colors.textDim}
            maxLength={200}
          />
        </react_native_1.View>
      )}

      {/* Pending attachment preview */}
      {pendingAttachment && (
        <react_native_1.View testID="channel-pending-attachment" style={styles.attachmentPreview}>
          {(0, shared_1.isImageAttachmentMimeType)(
            pendingAttachment.mimeType,
            pendingAttachment.name,
          ) ? (
            <>
              <react_native_1.Image
                testID="channel-pending-attachment-image"
                source={{ uri: pendingAttachment.uri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <react_native_1.View style={styles.previewMeta}>
                <react_native_1.View style={styles.previewBadgeRow}>
                  <react_native_1.Text style={styles.previewBadge}>
                    {getAttachmentKindLabel(pendingAttachment.name, pendingAttachment.mimeType)}
                  </react_native_1.Text>
                </react_native_1.View>
                <react_native_1.Text
                  testID="channel-pending-attachment-name"
                  style={styles.previewFileName}
                  numberOfLines={1}
                >
                  {pendingAttachment.name}
                </react_native_1.Text>
                <react_native_1.Text style={styles.previewFileMeta}>
                  {formatFileSize(pendingAttachment.size)}
                </react_native_1.Text>
              </react_native_1.View>
            </>
          ) : (
            <>
              <react_native_1.View style={styles.previewFileIconWrap}>
                <react_native_1.Text style={styles.previewFileIconLabel}>
                  {getAttachmentKindLabel(pendingAttachment.name, pendingAttachment.mimeType)}
                </react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={styles.previewMeta}>
                <react_native_1.View style={styles.previewBadgeRow}>
                  <react_native_1.Text style={styles.previewBadge}>
                    {getAttachmentKindLabel(pendingAttachment.name, pendingAttachment.mimeType)}
                  </react_native_1.Text>
                </react_native_1.View>
                <react_native_1.Text
                  testID="channel-pending-attachment-name"
                  style={styles.previewFileName}
                  numberOfLines={1}
                >
                  {pendingAttachment.name}
                </react_native_1.Text>
                <react_native_1.Text style={styles.previewFileMeta}>
                  {formatFileSize(pendingAttachment.size)}
                </react_native_1.Text>
              </react_native_1.View>
            </>
          )}
          <react_native_1.TouchableOpacity
            testID="channel-pending-attachment-remove"
            style={styles.removeAttachment}
            onPress={function () {
              return setPendingAttachment(null);
            }}
          >
            <react_native_1.Text style={styles.removeAttachmentText}>
              {t('channel.remove')}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      )}

      {/* Upload progress */}
      {uploadProgress !== null && (
        <react_native_1.View style={styles.progressBar}>
          <react_native_1.View
            style={[
              styles.progressFill,
              { width: ''.concat(Math.round(uploadProgress * 100), '%') },
            ]}
          />
        </react_native_1.View>
      )}

      {/* Attachment menu */}
      {showAttachMenu && (
        <react_native_1.View testID="channel-attach-menu" style={styles.attachMenu}>
          <react_native_1.TouchableOpacity
            testID="channel-attach-menu-photo"
            style={styles.attachMenuItem}
            onPress={handlePickImage}
          >
            <react_native_1.Text style={styles.attachMenuText}>
              {t('channel.photoVideo')}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity
            testID="channel-attach-menu-camera"
            style={styles.attachMenuItem}
            onPress={handleTakePhoto}
          >
            <react_native_1.Text style={styles.attachMenuText}>
              {t('channel.camera')}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity
            testID="channel-attach-menu-document"
            style={styles.attachMenuItem}
            onPress={handlePickDocument}
          >
            <react_native_1.Text style={styles.attachMenuText}>
              {t('channel.document')}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>
          <react_native_1.TouchableOpacity
            testID="channel-attach-menu-poll"
            style={styles.attachMenuItem}
            onPress={function () {
              setShowAttachMenu(false);
              openChannelPolls();
            }}
          >
            <react_native_1.Text style={styles.attachMenuText}>
              {t('poll.title')}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      )}

      {(isArchived || !canPostChannel) && (
        <react_native_1.View style={styles.archivedBanner}>
          <react_native_1.Text style={styles.archivedBannerTitle}>
            {t('channel.archivedTitle')}
          </react_native_1.Text>
          <react_native_1.Text style={styles.archivedBannerText}>
            {isArchived ? t('channel.archivedReadOnly') : t('channel.readOnlyNoPost')}
          </react_native_1.Text>
        </react_native_1.View>
      )}

      {/* Composer */}
      {!isArchived && canPostChannel && (
        <MessageComposer_1.default
          placeholder={editingMessage ? t('message.editPlaceholder') : t('channel.messageInput')}
          sendLabel={editingMessage ? t('common.save') : t('channel.send')}
          sendingLabel={t('channel.sending')}
          isSending={sendMutation.isPending}
          onSend={handleSend}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          onDraftChange={setComposerDraftText}
          onPressAdd={editingMessage || !canUploadAttachment ? undefined : handleToggleAttachMenu}
          allowEmptySubmit={!!pendingAttachment}
          draftText={
            (_v =
              (_u =
                editingMessage === null || editingMessage === void 0
                  ? void 0
                  : editingMessage.bodyMarkdown) !== null && _u !== void 0
                ? _u
                : editingMessage === null || editingMessage === void 0
                  ? void 0
                  : editingMessage.bodyPlaintext) !== null && _v !== void 0
              ? _v
              : composerDraftSeed
          }
          draftKey={
            (_w =
              editingMessage === null || editingMessage === void 0 ? void 0 : editingMessage.id) !==
              null && _w !== void 0
              ? _w
              : composerDraftKey
          }
        />
      )}

      <AttachmentLightbox_1.default
        attachments={
          (_x =
            previewGallery === null || previewGallery === void 0
              ? void 0
              : previewGallery.attachments) !== null && _x !== void 0
            ? _x
            : []
        }
        currentIndex={
          (_y =
            previewGallery === null || previewGallery === void 0
              ? void 0
              : previewGallery.index) !== null && _y !== void 0
            ? _y
            : 0
        }
        authToken={authToken}
        isSharing={
          openingAttachmentId ===
          ((_z =
            previewGallery === null || previewGallery === void 0
              ? void 0
              : previewGallery.attachments[previewGallery.index]) === null || _z === void 0
            ? void 0
            : _z.id)
        }
        closeLabel={t('common.cancel')}
        shareLabel={t('channel.shareAttachment')}
        sharingLabel={t('channel.openingAttachment')}
        previousLabel={t('lightbox.previous')}
        nextLabel={t('lightbox.next')}
        onClose={function () {
          return setPreviewGallery(null);
        }}
        onNavigate={function (index) {
          return setPreviewGallery(function (current) {
            return current ? __assign(__assign({}, current), { index: index }) : current;
          });
        }}
        onShare={function () {
          var attachment =
            previewGallery === null || previewGallery === void 0
              ? void 0
              : previewGallery.attachments[previewGallery.index];
          if (!attachment) {
            return;
          }
          void handleShareAttachment(attachment);
        }}
      />

      {/* KakaoTalk-style message action sheet */}
      {actionMessage && (
        <MessageActionSheet_1.default
          message={actionMessage}
          isOwn={
            actionMessage.authorUserId ===
            (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id)
          }
          onReply={canPostChannel ? handleReply : undefined}
          onThread={handleOpenThread}
          onEdit={
            canPostChannel &&
            actionMessage.authorUserId ===
              (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id)
              ? handleEdit
              : undefined
          }
          onReport={
            actionMessage.authorUserId !==
              (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id) &&
            route.params.communityId
              ? handleReport
              : undefined
          }
          onTranslate={handleTranslate}
          onAiReplyDraft={handleAiReplyDraft}
          onAiRewriteDraft={handleAiRewriteDraft}
          aiStatusLabel={aiStatusLabel}
          aiStatusTone={aiStatusTone}
          aiStatusDescription={aiStatusDescription}
          aiActionsDisabled={!(0, ai_1.isAiRuntimeUsable)(aiRuntime)}
          onReact={canReactToMessages ? handleReact : undefined}
          onPin={handlePin}
          onBookmark={handleBookmark}
          onClose={function () {
            return setActionMessage(null);
          }}
          onDelete={handleDelete}
        />
      )}
    </react_native_1.KeyboardAvoidingView>
  );
}
function formatFileSize(bytes) {
  if (bytes < 1024) return ''.concat(bytes, ' B');
  if (bytes < 1024 * 1024) return ''.concat((bytes / 1024).toFixed(1), ' KB');
  return ''.concat((bytes / (1024 * 1024)).toFixed(1), ' MB');
}
function sanitizeAttachmentName(fileName) {
  var normalized = fileName.trim().replace(/[\/\\:\u0000-\u001F]/g, '_');
  return normalized.length > 0 ? normalized : 'attachment';
}
function getAttachmentKindLabel(fileName, mimeType) {
  var _a;
  if ((0, shared_1.isImageAttachmentMimeType)(mimeType, fileName)) return 'IMG';
  var extension = (_a = fileName.split('.').pop()) === null || _a === void 0 ? void 0 : _a.trim();
  if (extension) {
    return extension.toUpperCase().slice(0, 6);
  }
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'XLS';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'ZIP';
  if (mimeType.includes('audio')) return 'AUDIO';
  if (mimeType.includes('video')) return 'VIDEO';
  return 'FILE';
}
var styles = react_native_1.StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme_1.colors.talkBackground,
  },
  emptyContainer: {
    flex: 1,
    paddingBottom: theme_1.spacing.xl,
  },
  listContent: {
    paddingTop: theme_1.spacing.sm,
    paddingBottom: theme_1.spacing.sm,
  },
  sourceHistoryBannerWrap: {
    paddingHorizontal: theme_1.spacing.md,
    paddingTop: theme_1.spacing.sm,
  },
  sourceHistoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme_1.spacing.sm,
    backgroundColor: theme_1.colors.talkPanel,
    borderWidth: 1,
    borderColor: theme_1.colors.talkPanelBorder,
    borderRadius: 18,
    paddingHorizontal: theme_1.spacing.md,
    paddingVertical: theme_1.spacing.sm - 2,
  },
  sourceHistoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2b2d31',
    borderRadius: 999,
    paddingHorizontal: theme_1.spacing.sm,
    paddingVertical: 4,
  },
  sourceHistoryBadgeText: {
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.xs,
    fontWeight: '700',
  },
  sourceHistoryTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#40444b',
    borderRadius: 999,
    paddingHorizontal: theme_1.spacing.sm,
    paddingVertical: 4,
  },
  sourceHistoryTypeBadgeText: {
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.xs,
    fontWeight: '700',
  },
  sourceHistoryContent: {
    flex: 1,
  },
  sourceHistoryTitle: {
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.sm,
    fontWeight: '700',
  },
  sourceHistoryName: {
    marginTop: 2,
    color: theme_1.colors.talkMeta,
    fontSize: theme_1.fontSize.xs,
    fontWeight: '600',
  },
  sourceHistoryBody: {
    marginTop: 2,
    color: theme_1.colors.talkMeta,
    fontSize: theme_1.fontSize.xs,
  },
  sourceHistoryButton: {
    backgroundColor: theme_1.colors.primary,
    borderRadius: 12,
    paddingHorizontal: theme_1.spacing.md,
    paddingVertical: theme_1.spacing.xs,
  },
  sourceHistoryButtonText: {
    color: theme_1.colors.white,
    fontSize: theme_1.fontSize.sm,
    fontWeight: '700',
  },
  headerAction: {
    fontSize: 20,
    marginRight: theme_1.spacing.sm,
    color: theme_1.colors.talkMeta,
  },
  channelHeroWrap: {
    paddingHorizontal: theme_1.spacing.md,
    paddingTop: theme_1.spacing.sm,
    paddingBottom: theme_1.spacing.xs,
  },
  channelHeroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme_1.colors.talkPanelBorder,
    backgroundColor: theme_1.colors.talkPanel,
    paddingHorizontal: theme_1.spacing.md,
    paddingVertical: theme_1.spacing.md,
  },
  channelHeroEyebrow: {
    color: theme_1.colors.talkMeta,
    fontSize: theme_1.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  channelHeroTitle: {
    marginTop: theme_1.spacing.xs,
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.lg,
    fontWeight: '700',
  },
  channelHeroBody: {
    marginTop: theme_1.spacing.xs,
    color: theme_1.colors.talkMeta,
    fontSize: theme_1.fontSize.sm,
    lineHeight: 20,
  },
  channelHeroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme_1.spacing.xs,
    marginTop: theme_1.spacing.sm,
  },
  channelHeroMetaBadge: {
    borderRadius: 999,
    backgroundColor: '#40444b',
    paddingHorizontal: theme_1.spacing.sm,
    paddingVertical: 6,
  },
  channelHeroMetaBadgeText: {
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.xs,
    fontWeight: '700',
  },
  channelHeroActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme_1.spacing.sm,
    marginTop: theme_1.spacing.sm,
  },
  channelHeroActionChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme_1.colors.talkPanelBorder,
    backgroundColor: theme_1.colors.talkOtherBubble,
    paddingHorizontal: theme_1.spacing.md,
    paddingVertical: theme_1.spacing.xs + 2,
  },
  channelHeroActionChipPrimary: {
    backgroundColor: theme_1.colors.primary,
    borderColor: theme_1.colors.primary,
  },
  channelHeroActionChipText: {
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.sm,
    fontWeight: '700',
  },
  channelHeroActionChipPrimaryText: {
    color: theme_1.colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme_1.colors.talkPanel,
    marginLeft: theme_1.spacing.xs,
  },
  headerIconText: {
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.base,
    fontWeight: '600',
  },
  // Pending offline messages
  pendingSection: {
    paddingHorizontal: theme_1.spacing.lg,
    paddingVertical: theme_1.spacing.sm,
  },
  pendingItem: {
    backgroundColor: 'rgba(254,229,0,0.72)',
    borderRadius: 18,
    padding: theme_1.spacing.md,
    marginBottom: theme_1.spacing.xs,
    opacity: 0.6,
    alignSelf: 'flex-end',
    maxWidth: '78%',
    borderWidth: 1,
    borderColor: theme_1.colors.talkOwnBubbleBorder,
  },
  pendingBody: {
    color: '#1f2933',
    fontSize: theme_1.fontSize.base,
  },
  pendingLabel: {
    color: '#9a6d00',
    fontSize: theme_1.fontSize.xs,
    marginTop: theme_1.spacing.xs,
    textAlign: 'right',
  },
  // Attachments in messages
  attachments: {
    paddingHorizontal: theme_1.spacing.lg,
    paddingBottom: theme_1.spacing.xs,
  },
  focusedMessageWrap: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: theme_1.borderRadius.xl,
    marginHorizontal: theme_1.spacing.sm,
  },
  attachmentsOwn: {
    alignItems: 'flex-end',
  },
  attachmentImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme_1.spacing.xs,
    maxWidth: 284,
  },
  attachmentImageGridSingle: {
    maxWidth: 200,
  },
  attachmentImageGridOwn: {
    alignSelf: 'flex-end',
  },
  attachmentItem: {
    marginTop: theme_1.spacing.xs,
  },
  attachmentImageCard: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme_1.colors.talkOtherBubbleBorder,
    backgroundColor: theme_1.colors.talkOtherBubble,
    position: 'relative',
  },
  attachmentImageCardSingle: {
    width: 200,
    height: 150,
  },
  attachmentImageCardGrid: {
    width: 138,
    height: 138,
  },
  attachmentImageCardHero: {
    width: 284,
    height: 138,
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme_1.colors.talkOtherBubble,
  },
  attachmentImageMoreOverlay: __assign(__assign({}, react_native_1.StyleSheet.absoluteFillObject), {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 48, 64, 0.42)',
  }),
  attachmentImageMoreText: {
    color: theme_1.colors.white,
    fontSize: theme_1.fontSize.lg,
    fontWeight: '800',
  },
  attachmentFile: {
    backgroundColor: theme_1.colors.talkOtherBubble,
    borderRadius: 16,
    padding: theme_1.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme_1.colors.talkOtherBubbleBorder,
    gap: theme_1.spacing.sm,
    minWidth: 220,
  },
  attachmentFileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2b2d31',
    borderWidth: 1,
    borderColor: theme_1.colors.talkOtherBubbleBorder,
  },
  attachmentFileIcon: {
    fontSize: 20,
  },
  attachmentFileContent: {
    flex: 1,
    minWidth: 0,
  },
  attachmentFileMetaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  attachmentFileTypeBadge: {
    borderRadius: 999,
    backgroundColor: '#2b2d31',
    paddingHorizontal: theme_1.spacing.sm,
    paddingVertical: 3,
  },
  attachmentFileTypeBadgeText: {
    color: theme_1.colors.talkMeta,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  attachmentFileName: {
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.base,
    fontWeight: '700',
    flex: 1,
  },
  attachmentSize: {
    color: theme_1.colors.talkMeta,
    fontSize: theme_1.fontSize.sm,
    marginTop: 2,
  },
  attachmentFileCta: {
    borderRadius: 999,
    backgroundColor: '#2b2d31',
    paddingHorizontal: theme_1.spacing.sm,
    paddingVertical: theme_1.spacing.xs,
    borderWidth: 1,
    borderColor: theme_1.colors.talkOtherBubbleBorder,
  },
  attachmentFileCtaText: {
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.xs,
    fontWeight: '700',
  },
  attachmentMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  attachmentMetaRowOwn: {
    alignSelf: 'flex-end',
  },
  attachmentMetaRowOther: {
    alignSelf: 'flex-start',
  },
  attachmentMetaMain: {
    flexShrink: 1,
    minWidth: 0,
  },
  attachmentMetaColumn: {
    minWidth: 14,
    alignSelf: 'flex-end',
    gap: 1,
    pointerEvents: 'none',
  },
  attachmentMetaColumnOther: {
    alignItems: 'flex-start',
  },
  attachmentMetaColumnOwn: {
    alignItems: 'flex-end',
  },
  attachmentReadCount: {
    color: theme_1.colors.talkMeta,
    fontSize: 10,
    fontWeight: '800',
  },
  attachmentMetaTime: {
    color: theme_1.colors.talkMeta,
    fontSize: 10,
    fontWeight: '500',
  },
  dateDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme_1.spacing.sm,
    marginHorizontal: theme_1.spacing.lg,
    marginTop: theme_1.spacing.md,
    marginBottom: theme_1.spacing.sm,
  },
  dateDividerLine: {
    flex: 1,
    height: react_native_1.StyleSheet.hairlineWidth,
    backgroundColor: theme_1.colors.talkPanelBorder,
  },
  dateDividerText: {
    color: theme_1.colors.talkMeta,
    fontSize: theme_1.fontSize.xs,
    fontWeight: '700',
  },
  // Typing indicator
  typingBar: {
    paddingHorizontal: theme_1.spacing.lg,
    paddingVertical: theme_1.spacing.xs,
    backgroundColor: 'transparent',
  },
  typingText: {
    color: theme_1.colors.talkMeta,
    fontSize: theme_1.fontSize.sm,
    fontStyle: 'italic',
  },
  // Reply indicator
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme_1.spacing.lg,
    paddingVertical: theme_1.spacing.sm,
    backgroundColor: theme_1.colors.talkPanel,
    borderTopWidth: 1,
    borderTopColor: theme_1.colors.talkPanelBorder,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    color: theme_1.colors.talkMeta,
    fontSize: theme_1.fontSize.base,
  },
  replyClose: {
    color: theme_1.colors.talkMeta,
    fontSize: 18,
    paddingHorizontal: theme_1.spacing.sm,
  },
  topicBar: {
    paddingHorizontal: theme_1.spacing.md,
    paddingTop: theme_1.spacing.sm,
    paddingBottom: theme_1.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme_1.colors.talkPanelBorder,
    backgroundColor: theme_1.colors.talkPanel,
  },
  topicLabel: {
    color: theme_1.colors.talkMeta,
    fontSize: theme_1.fontSize.xs,
    fontWeight: '700',
    marginBottom: theme_1.spacing.xs,
    textTransform: 'uppercase',
  },
  topicInput: {
    backgroundColor: theme_1.colors.talkOtherBubble,
    borderRadius: theme_1.borderRadius.lg,
    paddingHorizontal: theme_1.spacing.md,
    paddingVertical: theme_1.spacing.sm,
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.base,
    borderWidth: 1,
    borderColor: theme_1.colors.talkPanelBorder,
  },
  // Attachment preview (pending upload)
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme_1.spacing.md,
    marginTop: theme_1.spacing.xs,
    marginBottom: theme_1.spacing.xs,
    paddingHorizontal: theme_1.spacing.md,
    paddingVertical: theme_1.spacing.sm,
    backgroundColor: theme_1.colors.talkPanel,
    borderWidth: 1,
    borderColor: theme_1.colors.talkPanelBorder,
    borderRadius: theme_1.borderRadius.lg,
    gap: theme_1.spacing.sm,
  },
  previewImage: {
    width: 68,
    height: 68,
    borderRadius: theme_1.borderRadius.md,
  },
  previewMeta: {
    flex: 1,
    minWidth: 0,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    marginBottom: theme_1.spacing.xs,
  },
  previewBadge: {
    color: '#f0d74c',
    backgroundColor: 'rgba(240, 215, 76, 0.14)',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: theme_1.spacing.sm,
    paddingVertical: 3,
    fontSize: theme_1.fontSize.xs,
    fontWeight: '700',
  },
  previewFileName: {
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.base,
    fontWeight: '600',
  },
  previewFileMeta: {
    color: theme_1.colors.textSecondary,
    fontSize: theme_1.fontSize.sm,
    marginTop: 2,
  },
  previewFileIconWrap: {
    width: 68,
    height: 68,
    borderRadius: theme_1.borderRadius.md,
    backgroundColor: theme_1.colors.talkOtherBubble,
    borderWidth: 1,
    borderColor: theme_1.colors.talkPanelBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFileIconLabel: {
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.sm,
    fontWeight: '800',
  },
  removeAttachment: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme_1.spacing.sm,
    paddingVertical: theme_1.spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  removeAttachmentText: {
    color: theme_1.colors.error,
    fontSize: theme_1.fontSize.sm,
    fontWeight: '700',
  },
  // Upload progress bar
  progressBar: {
    height: 3,
    backgroundColor: theme_1.colors.talkPanel,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f0d74c',
  },
  // Attachment picker menu
  attachMenu: {
    backgroundColor: theme_1.colors.talkPanel,
    borderTopWidth: 1,
    borderTopColor: theme_1.colors.talkPanelBorder,
    paddingVertical: theme_1.spacing.xs,
  },
  attachMenuItem: {
    paddingVertical: theme_1.spacing.md,
    paddingHorizontal: theme_1.spacing.lg,
  },
  attachMenuText: {
    color: theme_1.colors.textPrimary,
    fontSize: theme_1.fontSize.base,
  },
  archivedBanner: {
    backgroundColor: theme_1.colors.talkPanel,
    borderTopWidth: 1,
    borderTopColor: theme_1.colors.talkPanelBorder,
    paddingHorizontal: theme_1.spacing.lg,
    paddingVertical: theme_1.spacing.md,
  },
  archivedBannerTitle: {
    color: theme_1.colors.warning,
    fontSize: theme_1.fontSize.base,
    fontWeight: '700',
  },
  archivedBannerText: {
    color: theme_1.colors.talkMeta,
    fontSize: theme_1.fontSize.sm,
    lineHeight: 18,
    marginTop: theme_1.spacing.xs,
  },
});
