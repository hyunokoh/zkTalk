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
exports.default = BackupScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var expo_file_system_1 = require("expo-file-system");
var DocumentPicker = require("expo-document-picker");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
function BackupScreen() {
    var _this = this;
    var t = (0, i18n_1.useTranslation)().t;
    var _a = (0, react_1.useState)('idle'), state = _a[0], setState = _a[1];
    var _b = (0, react_1.useState)(''), progress = _b[0], setProgress = _b[1];
    var devActionAttemptedRef = react_1.default.useRef(false);
    var shareBackupFile = function (fileUri, filename) { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, react_native_1.Share.share({
                            title: filename,
                            message: filename,
                            url: fileUri,
                        })];
                case 1:
                    _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = _b.sent();
                    react_native_1.Alert.alert(t('backup.shareFailedTitle'), t('backup.shareFailedBody'));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var handleBackup = function () { return __awaiter(_this, void 0, void 0, function () {
        var backupData, raw, encoded, timestamp, filename_1, file_1, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setState('backing_up');
                    setProgress(t('backup.progressDownload'));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, (0, api_1.api)('/api/me/backup', {
                            method: 'POST',
                        })];
                case 2:
                    backupData = _a.sent();
                    setProgress(t('backup.progressEncrypt'));
                    raw = JSON.stringify(backupData);
                    encoded = btoa(unescape(encodeURIComponent(raw)));
                    timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    filename_1 = "zktalk-backup-".concat(timestamp, ".json");
                    file_1 = new expo_file_system_1.File(expo_file_system_1.Paths.document, filename_1);
                    return [4 /*yield*/, file_1.write(encoded)];
                case 3:
                    _a.sent();
                    setProgress('');
                    react_native_1.Alert.alert(t('backup.completeTitle'), t('backup.completeBody', { filename: filename_1 }), [
                        {
                            text: t('backup.share'),
                            onPress: function () {
                                void shareBackupFile(file_1.uri, filename_1);
                            },
                        },
                        { text: t('common.confirm') },
                    ]);
                    return [3 /*break*/, 6];
                case 4:
                    err_1 = _a.sent();
                    react_native_1.Alert.alert(t('backup.failedTitle'), err_1 instanceof Error ? err_1.message : t('backup.failedBody'));
                    return [3 /*break*/, 6];
                case 5:
                    setState('idle');
                    setProgress('');
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var handleRestore = function () { return __awaiter(_this, void 0, void 0, function () {
        var result, file, pickedFile, encoded, raw, err_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, 5, 6]);
                    return [4 /*yield*/, DocumentPicker.getDocumentAsync({
                            type: 'application/json',
                            copyToCacheDirectory: true,
                        })];
                case 1:
                    result = _b.sent();
                    if (result.canceled || !((_a = result.assets) === null || _a === void 0 ? void 0 : _a[0])) {
                        return [2 /*return*/];
                    }
                    file = result.assets[0];
                    setState('restoring');
                    setProgress(t('backup.progressRead'));
                    pickedFile = new expo_file_system_1.File(file.uri);
                    return [4 /*yield*/, pickedFile.text()];
                case 2:
                    encoded = _b.sent();
                    setProgress(t('backup.progressDecrypt'));
                    try {
                        raw = decodeURIComponent(escape(atob(encoded)));
                        JSON.parse(raw);
                    }
                    catch (_c) {
                        throw new Error(t('backup.invalidFile'));
                    }
                    setProgress(t('backup.progressUpload'));
                    return [4 /*yield*/, (0, api_1.api)('/api/me/restore', {
                            method: 'POST',
                            body: { encryptedData: encoded },
                        })];
                case 3:
                    _b.sent();
                    setProgress('');
                    react_native_1.Alert.alert(t('backup.restoreCompleteTitle'), t('backup.restoreCompleteBody'), [{ text: t('common.confirm') }]);
                    return [3 /*break*/, 6];
                case 4:
                    err_2 = _b.sent();
                    react_native_1.Alert.alert(t('backup.restoreFailedTitle'), err_2 instanceof Error ? err_2.message : t('backup.restoreFailedBody'));
                    return [3 /*break*/, 6];
                case 5:
                    setState('idle');
                    setProgress('');
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var isWorking = state !== 'idle';
    react_1.default.useEffect(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled || devActionAttemptedRef.current) {
            return;
        }
        devActionAttemptedRef.current = true;
        function tryDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var payload, pickedFile, encoded, rawJson, err_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-backup-action.json')];
                        case 1:
                            payload = _a.sent();
                            if (!payload)
                                return [2 /*return*/];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 8, 9, 11]);
                            if (!((payload === null || payload === void 0 ? void 0 : payload.action) === 'backup')) return [3 /*break*/, 4];
                            return [4 /*yield*/, handleBackup()];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 7];
                        case 4:
                            if (!((payload === null || payload === void 0 ? void 0 : payload.action) === 'restore' && payload.fileUri)) return [3 /*break*/, 7];
                            setState('restoring');
                            setProgress(t('backup.progressRead'));
                            pickedFile = new expo_file_system_1.File(payload.fileUri);
                            return [4 /*yield*/, pickedFile.text()];
                        case 5:
                            encoded = _a.sent();
                            setProgress(t('backup.progressDecrypt'));
                            try {
                                rawJson = decodeURIComponent(escape(atob(encoded)));
                                JSON.parse(rawJson);
                            }
                            catch (_b) {
                                throw new Error(t('backup.invalidFile'));
                            }
                            setProgress(t('backup.progressUpload'));
                            return [4 /*yield*/, (0, api_1.api)('/api/me/restore', {
                                    method: 'POST',
                                    body: { encryptedData: encoded },
                                })];
                        case 6:
                            _a.sent();
                            setProgress('');
                            _a.label = 7;
                        case 7: return [3 /*break*/, 11];
                        case 8:
                            err_3 = _a.sent();
                            react_native_1.Alert.alert(t('common.error'), err_3 instanceof Error ? err_3.message : t('backup.failedBody'));
                            return [3 /*break*/, 11];
                        case 9:
                            setState('idle');
                            setProgress('');
                            return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-backup-action.json')];
                        case 10:
                            _a.sent();
                            return [7 /*endfinally*/];
                        case 11: return [2 /*return*/];
                    }
                });
            });
        }
        void tryDevAction();
    }, [t]);
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['bottom']}>
      <react_native_1.View style={styles.content}>
        {/* Header */}
        <react_native_1.View style={styles.headerSection}>
          <react_native_1.Text style={styles.icon}>{'💾'}</react_native_1.Text>
          <react_native_1.Text style={styles.title}>{t('backup.title')}</react_native_1.Text>
          <react_native_1.Text style={styles.subtitle}>{t('backup.subtitle')}</react_native_1.Text>
        </react_native_1.View>

        {/* Progress */}
        {isWorking && (<react_native_1.View style={styles.progressCard}>
            <react_native_1.ActivityIndicator size="small" color={theme_1.colors.primary}/>
            <react_native_1.Text style={styles.progressText}>{progress}</react_native_1.Text>
          </react_native_1.View>)}

        {/* Actions */}
        <react_native_1.View style={styles.actions}>
          <react_native_1.TouchableOpacity style={[styles.actionCard, isWorking && styles.actionDisabled]} onPress={handleBackup} disabled={isWorking}>
            <react_native_1.Text style={styles.actionIcon}>{'⬇️'}</react_native_1.Text>
            <react_native_1.Text style={styles.actionTitle}>{t('backup.create')}</react_native_1.Text>
            <react_native_1.Text style={styles.actionDesc}>{t('backup.createDesc')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>

          <react_native_1.TouchableOpacity style={[styles.actionCard, isWorking && styles.actionDisabled]} onPress={handleRestore} disabled={isWorking}>
            <react_native_1.Text style={styles.actionIcon}>{'⬆️'}</react_native_1.Text>
            <react_native_1.Text style={styles.actionTitle}>{t('backup.restore')}</react_native_1.Text>
            <react_native_1.Text style={styles.actionDesc}>{t('backup.restoreDesc')}</react_native_1.Text>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        {/* Info */}
        <react_native_1.View style={styles.infoCard}>
          <react_native_1.Text style={styles.infoTitle}>{t('backup.infoTitle')}</react_native_1.Text>
          <react_native_1.Text style={styles.infoText}>{t('backup.infoText')}</react_native_1.Text>
        </react_native_1.View>
      </react_native_1.View>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    content: {
        flex: 1,
        padding: theme_1.spacing.lg,
    },
    headerSection: {
        alignItems: 'center',
        marginTop: theme_1.spacing.xxl,
        marginBottom: theme_1.spacing.xxxl,
    },
    icon: {
        fontSize: 48,
        marginBottom: theme_1.spacing.lg,
    },
    title: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.title,
        fontWeight: '700',
        marginBottom: theme_1.spacing.sm,
    },
    subtitle: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.base,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: theme_1.spacing.lg,
    },
    progressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
        marginBottom: theme_1.spacing.lg,
        gap: theme_1.spacing.md,
    },
    progressText: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        flex: 1,
    },
    actions: {
        gap: theme_1.spacing.md,
        marginBottom: theme_1.spacing.xxl,
    },
    actionCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.lg,
    },
    actionDisabled: {
        opacity: 0.5,
    },
    actionIcon: {
        fontSize: 28,
    },
    actionTitle: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.xxl,
        fontWeight: '600',
    },
    actionDesc: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.md,
        flex: 1,
    },
    infoCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        padding: theme_1.spacing.lg,
        borderLeftWidth: 3,
        borderLeftColor: theme_1.colors.primary,
    },
    infoTitle: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
        marginBottom: theme_1.spacing.xs,
    },
    infoText: {
        color: theme_1.colors.textMuted,
        fontSize: theme_1.fontSize.md,
        lineHeight: 18,
    },
});
