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
exports.default = ChannelSearchScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("../lib/api");
var i18n_1 = require("../lib/i18n");
var simulator_harness_1 = require("../lib/simulator-harness");
var EmptyState_1 = require("../components/EmptyState");
var theme_1 = require("../theme");
function ChannelSearchScreen(_a) {
    var _b;
    var navigation = _a.navigation, route = _a.route;
    var t = (0, i18n_1.useTranslation)().t;
    var _c = (0, react_1.useState)(''), query = _c[0], setQuery = _c[1];
    var deferredQuery = (0, react_1.useDeferredValue)(query.trim());
    var _d = (0, react_query_1.useQuery)({
        queryKey: ['channel-search', route.params.channelId, deferredQuery],
        enabled: deferredQuery.length > 0,
        queryFn: function () {
            return (0, api_1.api)("/api/search/messages?q=".concat(encodeURIComponent(deferredQuery), "&communityId=").concat(encodeURIComponent(route.params.communityId), "&channelId=").concat(encodeURIComponent(route.params.channelId)));
        },
    }), data = _d.data, isFetching = _d.isFetching;
    var results = (_b = data === null || data === void 0 ? void 0 : data.messages) !== null && _b !== void 0 ? _b : [];
    var isSearching = query.trim() !== deferredQuery || isFetching;
    (0, react_1.useEffect)(function () {
        if (!simulator_harness_1.isSimulatorHarnessEnabled)
            return;
        function runDevAction() {
            return __awaiter(this, void 0, void 0, function () {
                var action;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-channel-search-action.json')];
                        case 1:
                            action = _b.sent();
                            if (!action)
                                return [2 /*return*/];
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, , 3, 5]);
                            if (action.type !== 'search')
                                return [2 /*return*/];
                            setQuery((_a = action.query) !== null && _a !== void 0 ? _a : '');
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-channel-search-action.json')];
                        case 4:
                            _b.sent();
                            return [7 /*endfinally*/];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        }
        void runDevAction();
    }, []);
    return (<react_native_safe_area_context_1.SafeAreaView style={styles.container}>
      <react_native_1.View style={styles.searchBar}>
        <react_native_1.Text style={styles.searchIcon}>{"\uD83D\uDD0D"}</react_native_1.Text>
        <react_native_1.TextInput style={styles.searchInput} placeholder={t('channel.searchPlaceholder')} placeholderTextColor={theme_1.colors.textMuted} value={query} onChangeText={setQuery} autoFocus returnKeyType="search"/>
        {isSearching ? (<react_native_1.ActivityIndicator size="small" color={theme_1.colors.primary}/>) : null}
      </react_native_1.View>

      <react_native_1.FlatList data={results} keyExtractor={function (item) { return item.message.id; }} keyboardShouldPersistTaps="handled" renderItem={function (_a) {
            var item = _a.item;
            return (<react_native_1.TouchableOpacity style={styles.resultCard} activeOpacity={0.8} onPress={function () {
                    return navigation.replace('ChannelScreen', {
                        channelId: route.params.channelId,
                        communityId: route.params.communityId,
                        channelName: route.params.channelName,
                        focusMessageId: item.message.id,
                    });
                }}>
            <react_native_1.View style={styles.resultHeader}>
              <react_native_1.Text style={styles.author}>{item.author.displayName}</react_native_1.Text>
              <react_native_1.Text style={styles.timestamp}>
                {new Date(item.message.createdAt).toLocaleDateString()}
              </react_native_1.Text>
            </react_native_1.View>
            <react_native_1.Text style={styles.preview} numberOfLines={3}>
              {item.message.bodyPlaintext || item.message.bodyMarkdown || t('message.deleted')}
            </react_native_1.Text>
          </react_native_1.TouchableOpacity>);
        }} ListEmptyComponent={<react_native_1.View style={styles.emptyWrap}>
            <EmptyState_1.default icon={"\uD83D\uDD0D"} title={deferredQuery.length > 0
                ? t('channel.searchEmpty')
                : t('channel.searchHintTitle')} subtitle={deferredQuery.length > 0
                ? t('channel.searchEmptyBody')
                : t('channel.searchHintBody')}/>
          </react_native_1.View>} contentContainerStyle={results.length === 0 ? styles.emptyList : styles.list}/>
    </react_native_safe_area_context_1.SafeAreaView>);
}
var styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme_1.colors.background,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        marginHorizontal: theme_1.spacing.lg,
        marginTop: theme_1.spacing.lg,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        gap: theme_1.spacing.sm,
    },
    searchIcon: {
        fontSize: theme_1.fontSize.lg,
    },
    searchInput: {
        flex: 1,
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.lg,
        paddingVertical: theme_1.spacing.sm,
    },
    list: {
        paddingVertical: theme_1.spacing.md,
    },
    emptyList: {
        flexGrow: 1,
    },
    emptyWrap: {
        flex: 1,
    },
    resultCard: {
        backgroundColor: theme_1.colors.surface,
        borderRadius: theme_1.borderRadius.lg,
        marginHorizontal: theme_1.spacing.lg,
        marginBottom: theme_1.spacing.md,
        padding: theme_1.spacing.lg,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme_1.spacing.md,
        marginBottom: theme_1.spacing.sm,
    },
    author: {
        color: theme_1.colors.textPrimary,
        fontSize: theme_1.fontSize.base,
        fontWeight: '600',
        flex: 1,
    },
    timestamp: {
        color: theme_1.colors.textDim,
        fontSize: theme_1.fontSize.xs,
    },
    preview: {
        color: theme_1.colors.textSecondary,
        fontSize: theme_1.fontSize.base,
        lineHeight: 20,
    },
});
