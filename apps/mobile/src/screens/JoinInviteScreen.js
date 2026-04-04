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
exports.default = JoinInviteScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
function normalizeInviteCode(value) {
    var _a;
    var trimmed = value.trim();
    if (!trimmed)
        return '';
    var invitePathMatch = trimmed.match(/\/invite(?:s)?\/([a-zA-Z0-9_-]+)/i);
    if (invitePathMatch === null || invitePathMatch === void 0 ? void 0 : invitePathMatch[1]) {
        return invitePathMatch[1];
    }
    var codeLabelMatch = trimmed.match(/code[:\s]+([a-zA-Z0-9_-]+)/i);
    if (codeLabelMatch === null || codeLabelMatch === void 0 ? void 0 : codeLabelMatch[1]) {
        return codeLabelMatch[1];
    }
    var compact = trimmed.replace(/\s+/g, ' ');
    var tokens = compact.match(/[a-zA-Z0-9_-]{6,32}/g);
    if (!(tokens === null || tokens === void 0 ? void 0 : tokens.length)) {
        return trimmed;
    }
    return (_a = tokens[tokens.length - 1]) !== null && _a !== void 0 ? _a : trimmed;
}
function JoinInviteScreen(_a) {
    var _this = this;
    var navigation = _a.navigation;
    var t = (0, i18n_1.useTranslation)().t;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _b = (0, react_1.useState)(''), inviteCode = _b[0], setInviteCode = _b[1];
    var joinMutation = (0, react_query_1.useMutation)({
        mutationFn: function (code) {
            return (0, api_1.api)("/api/invites/".concat(encodeURIComponent(code), "/join"), {
                method: 'POST',
            });
        },
        onSuccess: function (result) { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, queryClient.invalidateQueries({ queryKey: ['communities'] })];
                    case 1:
                        _b.sent();
                        navigation.replace('HomeScreen', {
                            selectedCommunityId: (_a = result.membership) === null || _a === void 0 ? void 0 : _a.communityId,
                        });
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('community.joinInviteFailed'));
        },
    });
    var handleJoin = (0, react_1.useCallback)(function () {
        var code = normalizeInviteCode(inviteCode);
        if (!code) {
            react_native_1.Alert.alert(t('common.error'), t('community.inviteCodeRequired'));
            return;
        }
        joinMutation.mutate(code);
    }, [inviteCode, joinMutation, t]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled)
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-join-invite-action.json')];
                        case 1:
                            action = _a.sent();
                            if (!action)
                                return [2 /*return*/];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, , 3, 5]);
                            if (action.type !== 'join' || !action.code)
                                return [2 /*return*/];
                            setInviteCode(action.code);
                            joinMutation.mutate(normalizeInviteCode(action.code));
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-join-invite-action.json')];
                        case 4:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, [joinMutation]);
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.View style={styles.content}>
        <react_native_1.Text style={styles.title}>{t('community.joinInviteTitle')}</react_native_1.Text>
        <react_native_1.Text style={styles.subtitle}>{t('community.joinInviteBody')}</react_native_1.Text>

        <react_native_1.TextInput style={styles.input} value={inviteCode} onChangeText={setInviteCode} placeholder={t('community.inviteCodePlaceholder')} placeholderTextColor={theme_1.colors.textMuted} autoCapitalize="none" autoCorrect={false}/>
        <react_native_1.Text style={styles.hint}>{t('community.inviteCodeHint')}</react_native_1.Text>

        <react_native_1.TouchableOpacity style={[styles.button, joinMutation.isPending && styles.buttonDisabled]} onPress={handleJoin} disabled={joinMutation.isPending}>
          <react_native_1.Text style={styles.buttonText}>
            {joinMutation.isPending ? t('community.joiningInvite') : t('community.joinInviteCta')}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    content: {
        padding: theme_1.spacing.xl,
        gap: theme_1.spacing.lg,
    },
    title: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.xxl,
        fontWeight: '700',
    },
    subtitle: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.body,
        lineHeight: 22,
    },
    input: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.body,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
    },
    hint: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.sm,
        lineHeight: 20,
    },
    button: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.xl,
        alignItems: 'center',
        paddingVertical: theme_1.spacing.md,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.md,
        fontWeight: '700',
    },
});
