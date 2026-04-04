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
exports.default = VoiceCallScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
// LiveKit native modules don't work in Expo Go - use lazy import
var AudioSession = null;
var LiveKitRoom = null;
var useRoomContext = null;
var useParticipants = null;
var useLocalParticipant = null;
try {
    var lkNative = require('@livekit/react-native');
    AudioSession = lkNative.AudioSession;
    var lkComponents = require('@livekit/components-react');
    LiveKitRoom = lkComponents.LiveKitRoom;
    useRoomContext = lkComponents.useRoomContext;
    useParticipants = lkComponents.useParticipants;
    useLocalParticipant = lkComponents.useLocalParticipant;
}
catch (_a) {
    // LiveKit not available in Expo Go
}
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var network_config_1 = require("../lib/network-config");
var storage_1 = require("../lib/storage");
var voice_runtime_1 = require("../lib/voice-runtime");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
function ParticipantTile(_a) {
    var participant = _a.participant;
    var t = (0, i18n_1.useTranslation)().t;
    return (<react_native_1.View style={[styles.participantTile, participant.isSpeaking && styles.participantSpeaking]}>
      <react_native_1.View style={[styles.participantAvatar, participant.isMuted && styles.participantMuted]}>
        <react_native_1.Text style={styles.participantInitial}>
          {(participant.name || participant.identity).charAt(0).toUpperCase()}
        </react_native_1.Text>
      </react_native_1.View>
      <react_native_1.Text style={styles.participantName} numberOfLines={1}>
        {participant.name || participant.identity}
      </react_native_1.Text>
      {participant.isMuted && (<react_native_1.Text style={styles.mutedBadge}>{t('voice.muted')}</react_native_1.Text>)}
    </react_native_1.View>);
}
function CallControls(_a) {
    var isMuted = _a.isMuted, isCameraOn = _a.isCameraOn, onToggleMute = _a.onToggleMute, onToggleCamera = _a.onToggleCamera, onLeave = _a.onLeave;
    var t = (0, i18n_1.useTranslation)().t;
    return (<react_native_1.View style={styles.controls}>
      <react_native_1.TouchableOpacity style={[styles.controlButton, isMuted && styles.controlButtonActive]} onPress={onToggleMute}>
        <react_native_1.Text style={styles.controlIcon}>{isMuted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}</react_native_1.Text>
        <react_native_1.Text style={styles.controlLabel}>{isMuted ? t('voice.unmute') : t('voice.mute')}</react_native_1.Text>
      </react_native_1.TouchableOpacity>

      <react_native_1.TouchableOpacity style={[styles.controlButton, isCameraOn && styles.controlButtonActive]} onPress={onToggleCamera}>
        <react_native_1.Text style={styles.controlIcon}>{isCameraOn ? "\uD83D\uDCF7" : "\uD83D\uDCF5"}</react_native_1.Text>
        <react_native_1.Text style={styles.controlLabel}>
          {isCameraOn ? t('voice.cameraOffShort') : t('voice.cameraOnShort')}
        </react_native_1.Text>
      </react_native_1.TouchableOpacity>

      <react_native_1.TouchableOpacity style={[styles.controlButton, styles.leaveButton]} onPress={onLeave}>
        <react_native_1.Text style={styles.controlIcon}>{"\uD83D\uDCDE"}</react_native_1.Text>
        <react_native_1.Text style={[styles.controlLabel, styles.leaveLabel]}>{t('voice.leave')}</react_native_1.Text>
      </react_native_1.TouchableOpacity>
    </react_native_1.View>);
}
function RoomView(_a) {
    var _this = this;
    var _b;
    var channelName = _a.channelName, startWithVideo = _a.startWithVideo, onLeave = _a.onLeave;
    var t = (0, i18n_1.useTranslation)().t;
    var room = useRoomContext === null || useRoomContext === void 0 ? void 0 : useRoomContext();
    var participants = (_b = useParticipants === null || useParticipants === void 0 ? void 0 : useParticipants()) !== null && _b !== void 0 ? _b : [];
    var localParticipant = useLocalParticipant === null || useLocalParticipant === void 0 ? void 0 : useLocalParticipant();
    var _c = (0, react_1.useState)(false), isMuted = _c[0], setIsMuted = _c[1];
    var _d = (0, react_1.useState)(false), isCameraOn = _d[0], setIsCameraOn = _d[1];
    var _e = (0, react_1.useState)(''), searchQuery = _e[0], setSearchQuery = _e[1];
    (0, react_1.useEffect)(function () {
        if (!startWithVideo || isCameraOn || !(localParticipant === null || localParticipant === void 0 ? void 0 : localParticipant.localParticipant)) {
            return;
        }
        var cancelled = false;
        function enableCamera() {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, localParticipant.localParticipant.setCameraEnabled(true)];
                        case 1:
                            _b.sent();
                            if (!cancelled) {
                                setIsCameraOn(true);
                            }
                            return [3 /*break*/, 3];
                        case 2:
                            _a = _b.sent();
                            if (!cancelled) {
                                react_native_1.Alert.alert(t('common.error'), t('voice.toggleCameraFailed'));
                            }
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        }
        void enableCamera();
        return function () {
            cancelled = true;
        };
    }, [isCameraOn, localParticipant, startWithVideo, t]);
    var handleToggleMute = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    if (!localParticipant.localParticipant) return [3 /*break*/, 2];
                    return [4 /*yield*/, localParticipant.localParticipant.setMicrophoneEnabled(isMuted)];
                case 1:
                    _b.sent();
                    setIsMuted(!isMuted);
                    _b.label = 2;
                case 2: return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    react_native_1.Alert.alert(t('common.error'), t('voice.toggleMicFailed'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [isMuted, localParticipant, t]);
    var handleToggleCamera = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    if (!localParticipant.localParticipant) return [3 /*break*/, 2];
                    return [4 /*yield*/, localParticipant.localParticipant.setCameraEnabled(!isCameraOn)];
                case 1:
                    _b.sent();
                    setIsCameraOn(!isCameraOn);
                    _b.label = 2;
                case 2: return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    react_native_1.Alert.alert(t('common.error'), t('voice.toggleCameraFailed'));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); }, [isCameraOn, localParticipant, t]);
    var participantList = (0, react_1.useMemo)(function () {
        return participants.map(function (p) {
            var _a, _b, _c;
            return ({
                identity: (_a = p.identity) !== null && _a !== void 0 ? _a : t('common.unknown'),
                name: (_c = (_b = p.name) !== null && _b !== void 0 ? _b : p.identity) !== null && _c !== void 0 ? _c : t('common.unknown'),
                isSpeaking: p.isSpeaking,
                isMuted: !p.isMicrophoneEnabled,
                hasCamera: p.isCameraEnabled,
            });
        });
    }, [participants, t]);
    var filteredParticipantList = (0, react_1.useMemo)(function () {
        var normalizedQuery = searchQuery.trim().toLowerCase();
        if (!normalizedQuery) {
            return participantList;
        }
        return participantList.filter(function (participant) {
            return [participant.name, participant.identity]
                .some(function (value) { return value.toLowerCase().includes(normalizedQuery); });
        });
    }, [participantList, searchQuery]);
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.StatusBar barStyle="light-content"/>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.channelName}>{channelName}</react_native_1.Text>
        <react_native_1.Text style={styles.participantCount}>
          {t('voice.participants', { count: participantList.length })}
        </react_native_1.Text>
      </react_native_1.View>

      <react_native_1.View style={styles.searchWrap}>
        <react_native_1.TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder={t('voice.searchPlaceholder')} placeholderTextColor={theme_1.colors.textSecondary} autoCapitalize="none" autoCorrect={false} returnKeyType="search"/>
      </react_native_1.View>

      <react_native_1.FlatList data={filteredParticipantList} keyExtractor={function (item) { return item.identity; }} numColumns={2} contentContainerStyle={styles.participantGrid} columnWrapperStyle={styles.participantRow} renderItem={function (_a) {
        var item = _a.item;
        return <ParticipantTile participant={item}/>;
    }} ListEmptyComponent={<react_native_1.View style={styles.emptyState}>
            <react_native_1.Text style={styles.emptyText}>
              {searchQuery.trim() ? t('voice.noSearchResults') : t('voice.waitingForOthers')}
            </react_native_1.Text>
            {searchQuery.trim() ? (<react_native_1.Text style={styles.emptySubtext}>{t('voice.noSearchResultsBody')}</react_native_1.Text>) : null}
          </react_native_1.View>}/>

      <CallControls isMuted={isMuted} isCameraOn={isCameraOn} onToggleMute={handleToggleMute} onToggleCamera={handleToggleCamera} onLeave={onLeave}/>
    </react_native_safe_area_context_1.SafeAreaView>);
}
function VoiceCallScreen(_a) {
    var _this = this;
    var route = _a.route, navigation = _a.navigation;
    var t = (0, i18n_1.useTranslation)().t;
    var _b = route.params, channelId = _b.channelId, channelName = _b.channelName, communityId = _b.communityId, _c = _b.startWithVideo, startWithVideo = _c === void 0 ? false : _c;
    var _d = (0, react_1.useState)(null), token = _d[0], setToken = _d[1];
    var _e = (0, react_1.useState)(null), wsUrl = _e[0], setWsUrl = _e[1];
    var _f = (0, react_1.useState)(true), isConnecting = _f[0], setIsConnecting = _f[1];
    var _g = (0, react_1.useState)(null), error = _g[0], setError = _g[1];
    var hasLeftRef = (0, react_1.useRef)(false);
    var devActionAttemptedRef = (0, react_1.useRef)(false);
    var leaveVoice = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (hasLeftRef.current)
                        return [2 /*return*/];
                    hasLeftRef.current = true;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 6]);
                    return [4 /*yield*/, (0, api_1.api)("/api/channels/".concat(channelId, "/voice/leave"), {
                            method: 'POST',
                        })];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 6];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, (AudioSession === null || AudioSession === void 0 ? void 0 : AudioSession.stopAudioSession())];
                case 5:
                    _b.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [channelId]);
    (0, react_1.useEffect)(function () {
        var cancelled = false;
        function joinVoice() {
            return __awaiter(this, void 0, void 0, function () {
                var data, nextWsUrl, err_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 3, , 4]);
                            // Start audio session for iOS
                            return [4 /*yield*/, (AudioSession === null || AudioSession === void 0 ? void 0 : AudioSession.startAudioSession())];
                        case 1:
                            // Start audio session for iOS
                            _b.sent();
                            return [4 /*yield*/, (0, api_1.api)("/api/channels/".concat(channelId, "/voice/join"), { method: 'POST' })];
                        case 2:
                            data = _b.sent();
                            nextWsUrl = (_a = data.url) !== null && _a !== void 0 ? _a : network_config_1.LIVEKIT_URL;
                            if (!data.token || !nextWsUrl) {
                                throw new Error(t('voice.invalidSession'));
                            }
                            if (!cancelled) {
                                setToken(data.token);
                                setWsUrl(nextWsUrl);
                                setIsConnecting(false);
                            }
                            void (0, storage_1.setLastVoiceChannelForCommunity)(communityId, channelId);
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _b.sent();
                            if (!cancelled) {
                                setError(err_1 instanceof Error ? err_1.message : t('voice.joinFailed'));
                                setIsConnecting(false);
                            }
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        }
        joinVoice();
        return function () {
            cancelled = true;
            leaveVoice().catch(function () { });
        };
    }, [channelId, communityId, leaveVoice, t]);
    var handleLeave = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, leaveVoice()];
                case 1:
                    _a.sent();
                    navigation.goBack();
                    return [2 /*return*/];
            }
        });
    }); }, [leaveVoice, navigation]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttemptedRef.current) {
            return;
        }
        if (!token || !wsUrl) {
            return;
        }
        devActionAttemptedRef.current = true;
        function runDevVoiceAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action, participants, devError_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-voice-action.json')];
                        case 1:
                            action = _a.sent();
                            if (!action)
                                return [2 /*return*/];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 6, , 8]);
                            if (action.type !== 'cycle') {
                                throw new Error('Unsupported voice dev action');
                            }
                            return [4 /*yield*/, (0, api_1.api)("/api/channels/".concat(channelId, "/voice/participants"))];
                        case 3:
                            participants = _a.sent();
                            return [4 /*yield*/, leaveVoice()];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-voice-result.json', {
                                    ok: true,
                                    action: action.type,
                                    channelId: channelId,
                                    participantCount: participants.participants.length,
                                    wsUrl: wsUrl,
                                    hasToken: Boolean(token),
                                })];
                        case 5:
                            _a.sent();
                            navigation.goBack();
                            return [3 /*break*/, 8];
                        case 6:
                            devError_1 = _a.sent();
                            return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)('dev-voice-result.json', {
                                    ok: false,
                                    error: devError_1 instanceof Error ? devError_1.message : String(devError_1),
                                    channelId: channelId,
                                })];
                        case 7:
                            _a.sent();
                            return [3 /*break*/, 8];
                        case 8: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevVoiceAction();
    }, [channelId, leaveVoice, navigation, token, wsUrl]);
    if (isConnecting) {
        return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
        <react_native_1.StatusBar barStyle="light-content"/>
        <react_native_1.View style={styles.loadingContainer}>
          <react_native_1.ActivityIndicator size="large" color={theme_1.colors.primary}/>
          <react_native_1.Text style={styles.loadingText}>{t('voice.connecting')}</react_native_1.Text>
          <react_native_1.Text style={styles.loadingSubtext}>{channelName}</react_native_1.Text>
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    if (error) {
        return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
        <react_native_1.StatusBar barStyle="light-content"/>
        <react_native_1.View style={styles.loadingContainer}>
          <react_native_1.Text style={styles.errorIcon}>{"\u26A0\uFE0F"}</react_native_1.Text>
          <react_native_1.Text style={styles.errorText}>{error}</react_native_1.Text>
          <react_native_1.TouchableOpacity style={styles.retryButton} onPress={function () { return navigation.goBack(); }}>
            <react_native_1.Text style={styles.retryText}>{t('voice.goBack')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    if (!token || !wsUrl) {
        return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
        <react_native_1.StatusBar barStyle="light-content"/>
        <react_native_1.View style={styles.loadingContainer}>
          <react_native_1.Text style={styles.errorIcon}>{"\u26A0\uFE0F"}</react_native_1.Text>
          <react_native_1.Text style={styles.errorText}>{t('voice.invalidSession')}</react_native_1.Text>
          <react_native_1.TouchableOpacity style={styles.retryButton} onPress={function () { return navigation.goBack(); }}>
            <react_native_1.Text style={styles.retryText}>{t('voice.goBack')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    if (!LiveKitRoom) {
        return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
        <react_native_1.StatusBar barStyle="light-content"/>
        <react_native_1.View style={styles.loadingContainer}>
          <react_native_1.Text style={styles.errorIcon}>{"\uD83D\uDCDE"}</react_native_1.Text>
          <react_native_1.Text style={styles.errorText}>{t('voice.notAvailableTitle')}</react_native_1.Text>
          <react_native_1.Text style={styles.errorSubtext}>
            {voice_runtime_1.isNativeVoiceCallingAvailable ? t('voice.notAvailable') : t('voice.notAvailableBody')}
          </react_native_1.Text>
          <react_native_1.TouchableOpacity style={styles.retryButton} onPress={function () { return navigation.goBack(); }}>
            <react_native_1.Text style={styles.retryText}>{t('voice.goBack')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>
      </react_native_safe_area_context_1.SafeAreaView>);
    }
    return (<LiveKitRoom serverUrl={wsUrl} token={token} connect options={{
            adaptiveStream: { pixelDensity: 'screen' },
        }}>
      <RoomView channelName={channelName} startWithVideo={startWithVideo} onLeave={handleLeave}/>
    </LiveKitRoom>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.black,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme_1.spacing.xxxl,
    },
    loadingText: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '600',
        marginTop: theme_1.spacing.xl,
    },
    loadingSubtext: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.md,
        marginTop: theme_1.spacing.sm,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: theme_1.spacing.lg,
    },
    errorText: {
        color: theme_1.colors.danger,
        fontSize: theme_1.fontSize.body,
        textAlign: 'center',
        fontWeight: '700',
    },
    errorSubtext: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.md,
        lineHeight: 20,
        marginTop: theme_1.spacing.sm,
        marginBottom: theme_1.spacing.xl,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: theme_1.colors.surface,
        paddingHorizontal: theme_1.spacing.xxl,
        paddingVertical: theme_1.spacing.md,
        borderRadius: theme_1.borderRadius.md,
    },
    retryText: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.body,
        fontWeight: '600',
    },
    header: {
        alignItems: 'center',
        paddingVertical: theme_1.spacing.xl,
        borderBottomWidth: 0.5,
        borderBottomColor: theme_1.colors.border,
    },
    channelName: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.xl,
        fontWeight: '700',
    },
    participantCount: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        marginTop: theme_1.spacing.xs,
    },
    searchWrap: {
        paddingHorizontal: theme_1.spacing.lg,
        paddingTop: theme_1.spacing.md,
    },
    searchInput: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.base,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
    },
    participantGrid: {
        padding: theme_1.spacing.lg,
        flexGrow: 1,
    },
    participantRow: {
        justifyContent: 'space-around',
        marginBottom: theme_1.spacing.lg,
    },
    participantTile: {
        alignItems: 'center',
        width: '45%',
        paddingVertical: theme_1.spacing.xl,
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        borderWidth: 2,
        borderColor: theme_1.colors.transparent,
    },
    participantSpeaking: {
        borderColor: theme_1.colors.success,
    },
    participantAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme_1.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme_1.spacing.sm,
    },
    participantMuted: {
        backgroundColor: theme_1.colors.surfaceLight,
    },
    participantInitial: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xxl,
        fontWeight: '700',
    },
    participantName: {
        color: theme_1.colors.text,
        fontSize: theme_1.fontSize.md,
        fontWeight: '500',
        marginTop: theme_1.spacing.xs,
    },
    mutedBadge: {
        color: theme_1.colors.danger,
        fontSize: theme_1.fontSize.xs,
        marginTop: theme_1.spacing.xs,
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.body,
        textAlign: 'center',
    },
    emptySubtext: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.md,
        marginTop: theme_1.spacing.sm,
        textAlign: 'center',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: theme_1.spacing.xl,
        paddingHorizontal: theme_1.spacing.lg,
        gap: theme_1.spacing.xl,
        borderTopWidth: 0.5,
        borderTopColor: theme_1.colors.border,
    },
    controlButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: theme_1.colors.surface,
    },
    controlButtonActive: {
        backgroundColor: theme_1.colors.surfaceLight,
    },
    leaveButton: {
        backgroundColor: theme_1.colors.danger,
    },
    controlIcon: {
        fontSize: 24,
    },
    controlLabel: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.xs,
        marginTop: theme_1.spacing.xs,
        fontWeight: '500',
    },
    leaveLabel: {
        color: theme_1.colors.white,
    },
});
