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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CreatePollScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
function CreatePollScreen(_a) {
    var _this = this;
    var navigation = _a.navigation, route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var queryClient = (0, react_query_1.useQueryClient)();
    var devCreateAttemptedRef = (0, react_1.useRef)(false);
    var _b = (0, react_1.useState)(''), question = _b[0], setQuestion = _b[1];
    var _c = (0, react_1.useState)(['', '']), options = _c[0], setOptions = _c[1];
    var _d = (0, react_1.useState)(false), isAnonymous = _d[0], setIsAnonymous = _d[1];
    var _e = (0, react_1.useState)(false), allowMultiple = _e[0], setAllowMultiple = _e[1];
    var _f = (0, react_1.useState)(''), expiresInHours = _f[0], setExpiresInHours = _f[1];
    var createMutation = (0, react_query_1.useMutation)({
        mutationFn: function () {
            return (0, api_1.api)("/api/channels/".concat(route.params.channelId, "/polls"), {
                method: 'POST',
                body: {
                    question: question.trim(),
                    options: options.map(function (item) { return item.trim(); }).filter(Boolean),
                    isAnonymous: isAnonymous,
                    allowMultiple: allowMultiple,
                    expiresInHours: expiresInHours ? Number(expiresInHours) : undefined,
                },
            });
        },
        onSuccess: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            queryClient.invalidateQueries({ queryKey: ['polls', route.params.channelId] }),
                            queryClient.invalidateQueries({ queryKey: ['messages', route.params.channelId] }),
                            queryClient.invalidateQueries({ queryKey: ['polls-by-message', route.params.channelId] }),
                        ])];
                    case 1:
                        _a.sent();
                        react_native_1.Alert.alert(t('poll.createdTitle'), t('poll.createdBody'), [
                            { text: t('common.confirm'), onPress: function () { return navigation.goBack(); } },
                        ]);
                        return [2 /*return*/];
                }
            });
        }); },
        onError: function (error) {
            react_native_1.Alert.alert(t('common.error'), error instanceof Error ? error.message : t('poll.createFailed'));
        },
    });
    var addOption = (0, react_1.useCallback)(function () {
        if (options.length < 10) {
            setOptions(function (current) { return __spreadArray(__spreadArray([], current, true), [''], false); });
        }
    }, [options.length]);
    var removeOption = (0, react_1.useCallback)(function (index) {
        setOptions(function (current) { return (current.length > 2 ? current.filter(function (_, i) { return i !== index; }) : current); });
    }, []);
    var updateOption = (0, react_1.useCallback)(function (index, value) {
        setOptions(function (current) {
            var next = __spreadArray([], current, true);
            next[index] = value;
            return next;
        });
    }, []);
    var handleCreate = (0, react_1.useCallback)(function () {
        if (!question.trim()) {
            react_native_1.Alert.alert(t('common.error'), t('poll.questionRequired'));
            return;
        }
        if (options.map(function (item) { return item.trim(); }).filter(Boolean).length < 2) {
            react_native_1.Alert.alert(t('common.error'), t('poll.optionsRequired'));
            return;
        }
        createMutation.mutate();
    }, [createMutation, options, question, t]);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devCreateAttemptedRef.current) {
            return;
        }
        function runDevCreatePoll() {
            return __awaiter(this, void 0, void 0, function () {
                var parsed, nextQuestion, nextOptions;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-create-poll.json')];
                        case 1:
                            parsed = _c.sent();
                            if (!parsed) {
                                return [2 /*return*/];
                            }
                            devCreateAttemptedRef.current = true;
                            return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-create-poll.json')];
                        case 2:
                            _c.sent();
                            nextQuestion = ((_a = parsed === null || parsed === void 0 ? void 0 : parsed.question) === null || _a === void 0 ? void 0 : _a.trim()) || 'Simulator poll create test';
                            nextOptions = ((_b = parsed === null || parsed === void 0 ? void 0 : parsed.options) !== null && _b !== void 0 ? _b : ['Yes', 'No'])
                                .map(function (item) { return item.trim(); })
                                .filter(Boolean)
                                .slice(0, 10);
                            setQuestion(nextQuestion);
                            setOptions(nextOptions.length >= 2 ? nextOptions : ['Yes', 'No']);
                            setIsAnonymous(Boolean(parsed === null || parsed === void 0 ? void 0 : parsed.isAnonymous));
                            setAllowMultiple(Boolean(parsed === null || parsed === void 0 ? void 0 : parsed.allowMultiple));
                            setExpiresInHours((parsed === null || parsed === void 0 ? void 0 : parsed.expiresInHours) !== undefined && (parsed === null || parsed === void 0 ? void 0 : parsed.expiresInHours) !== null
                                ? String(parsed.expiresInHours)
                                : '');
                            return [2 /*return*/];
                    }
                });
            });
        }
        void runDevCreatePoll();
    }, []);
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || !devCreateAttemptedRef.current || createMutation.isPending) {
            return;
        }
        if (!question.trim() || options.map(function (item) { return item.trim(); }).filter(Boolean).length < 2) {
            return;
        }
        function submitDevCreatePoll() {
            return __awaiter(this, void 0, void 0, function () {
                var claimed;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.claimSimulatorHarnessMarker)('dev-create-poll-submitted.txt', question.trim())];
                        case 1:
                            claimed = _a.sent();
                            if (!claimed) {
                                return [2 /*return*/];
                            }
                            createMutation.mutate();
                            return [2 /*return*/];
                    }
                });
            });
        }
        void submitDevCreatePoll();
    }, [createMutation, options, question]);
    return (<react_native_1.KeyboardAvoidingView style={styles.container} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <react_native_1.ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('poll.question')}</react_native_1.Text>
          <react_native_1.TextInput style={styles.input} value={question} onChangeText={setQuestion} placeholder={t('poll.questionPlaceholder')} placeholderTextColor={theme_1.colors.textDim} maxLength={500} autoFocus/>
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('poll.options')}</react_native_1.Text>
          <react_native_1.View style={styles.optionsList}>
            {options.map(function (option, index) { return (<react_native_1.View key={"".concat(index)} style={styles.optionRow}>
                <react_native_1.TextInput style={[styles.input, styles.optionInput]} value={option} onChangeText={function (value) { return updateOption(index, value); }} placeholder={t('poll.option', { num: index + 1 })} placeholderTextColor={theme_1.colors.textDim} maxLength={200}/>
                {options.length > 2 ? (<react_native_1.TouchableOpacity style={styles.removeOptionButton} onPress={function () { return removeOption(index); }}>
                    <react_native_1.Text style={styles.removeOptionText}>{t('poll.removeOption')}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>) : null}
              </react_native_1.View>); })}
          </react_native_1.View>
          {options.length < 10 ? (<react_native_1.TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
              <react_native_1.Text style={styles.addOptionText}>+ {t('poll.addOption')}</react_native_1.Text>
            </react_native_1.TouchableOpacity>) : null}
        </react_native_1.View>

        <react_native_1.View style={styles.switchCard}>
          <react_native_1.View style={styles.switchRow}>
            <react_native_1.View style={styles.switchText}>
              <react_native_1.Text style={styles.switchTitle}>{t('poll.anonymous')}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ false: theme_1.colors.borderLight, true: theme_1.colors.primary }} thumbColor={theme_1.colors.white}/>
          </react_native_1.View>
          <react_native_1.View style={styles.switchRow}>
            <react_native_1.View style={styles.switchText}>
              <react_native_1.Text style={styles.switchTitle}>{t('poll.multiple')}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.Switch value={allowMultiple} onValueChange={setAllowMultiple} trackColor={{ false: theme_1.colors.borderLight, true: theme_1.colors.primary }} thumbColor={theme_1.colors.white}/>
          </react_native_1.View>
        </react_native_1.View>

        <react_native_1.View style={styles.field}>
          <react_native_1.Text style={styles.label}>{t('poll.expiresHours')}</react_native_1.Text>
          <react_native_1.TextInput style={styles.input} value={expiresInHours} onChangeText={setExpiresInHours} placeholder={t('poll.expiresPlaceholder')} placeholderTextColor={theme_1.colors.textDim} keyboardType="number-pad" maxLength={3}/>
        </react_native_1.View>

        <react_native_1.TouchableOpacity style={[styles.createButton, createMutation.isPending && styles.createButtonDisabled]} onPress={handleCreate} disabled={createMutation.isPending}>
          <react_native_1.Text style={styles.createButtonText}>
            {createMutation.isPending ? t('poll.creating') : t('poll.create')}
          </react_native_1.Text>
        </react_native_1.TouchableOpacity>
      </react_native_1.ScrollView>
    </react_native_1.KeyboardAvoidingView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: theme_1.spacing.lg,
        gap: theme_1.spacing.lg,
    },
    field: {
        gap: theme_1.spacing.sm,
    },
    label: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.md,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
    },
    optionsList: {
        gap: theme_1.spacing.sm,
    },
    optionRow: {
        flexDirection: 'row',
        gap: theme_1.spacing.sm,
        alignItems: 'center',
    },
    optionInput: {
        flex: 1,
    },
    removeOptionButton: {
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
    },
    removeOptionText: {
        color: theme_1.colors.danger,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '600',
    },
    addOptionButton: {
        alignSelf: 'flex-start',
        paddingVertical: theme_1.spacing.xs,
    },
    addOptionText: {
        color: theme_1.colors.primaryLight,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    switchCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.md,
        paddingHorizontal: theme_1.spacing.lg,
        paddingVertical: theme_1.spacing.sm,
        gap: theme_1.spacing.sm,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme_1.spacing.md,
    },
    switchText: {
        flex: 1,
    },
    switchTitle: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
    },
    createButton: {
        backgroundColor: theme_1.colors.primary,
        borderRadius: theme_1.borderRadius.xl,
        paddingVertical: theme_1.spacing.md,
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.7,
    },
    createButtonText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
});
