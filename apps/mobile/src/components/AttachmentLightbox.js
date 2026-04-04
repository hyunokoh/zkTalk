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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AttachmentLightbox;
var react_1 = require("react");
var react_native_1 = require("react-native");
var file_picker_1 = require("../lib/file-picker");
var simulator_harness_1 = require("../lib/simulator-harness");
var theme_1 = require("../theme");
var MIN_ZOOM_SCALE = 1;
var MAX_ZOOM_SCALE = 4;
var LIGHTBOX_ACTION_FILE = 'dev-attachment-lightbox-action.json';
var LIGHTBOX_RESULT_FILE = 'dev-attachment-lightbox-result.json';
function clampZoomScale(scale) {
    return Math.max(MIN_ZOOM_SCALE, Math.min(MAX_ZOOM_SCALE, scale));
}
function getTouchDistance(touches) {
    if (touches.length < 2) {
        return null;
    }
    var firstTouch = touches[0], secondTouch = touches[1];
    return Math.hypot(secondTouch.pageX - firstTouch.pageX, secondTouch.pageY - firstTouch.pageY);
}
function AttachmentLightbox(_a) {
    var attachments = _a.attachments, currentIndex = _a.currentIndex, authToken = _a.authToken, isSharing = _a.isSharing, closeLabel = _a.closeLabel, shareLabel = _a.shareLabel, sharingLabel = _a.sharingLabel, previousLabel = _a.previousLabel, nextLabel = _a.nextLabel, onClose = _a.onClose, onShare = _a.onShare, onNavigate = _a.onNavigate;
    var attachment = attachments[currentIndex];
    var zoomScale = (0, react_1.useRef)(new react_native_1.Animated.Value(MIN_ZOOM_SCALE)).current;
    var zoomScaleRef = (0, react_1.useRef)(MIN_ZOOM_SCALE);
    var pinchStartScaleRef = (0, react_1.useRef)(MIN_ZOOM_SCALE);
    var pinchStartDistanceRef = (0, react_1.useRef)(null);
    var lastHarnessRequestRef = (0, react_1.useRef)(null);
    var applyZoomScale = function (nextScale) {
        var clampedScale = clampZoomScale(nextScale);
        zoomScaleRef.current = clampedScale;
        zoomScale.setValue(clampedScale);
        return clampedScale;
    };
    (0, react_1.useEffect)(function () {
        zoomScaleRef.current = MIN_ZOOM_SCALE;
        pinchStartScaleRef.current = MIN_ZOOM_SCALE;
        pinchStartDistanceRef.current = null;
        zoomScale.setValue(MIN_ZOOM_SCALE);
    }, [attachment === null || attachment === void 0 ? void 0 : attachment.id, zoomScale]);
    var pinchResponder = (0, react_1.useMemo)(function () {
        return react_native_1.PanResponder.create({
            onStartShouldSetPanResponderCapture: function (event) {
                return event.nativeEvent.touches.length >= 2;
            },
            onMoveShouldSetPanResponderCapture: function (event) {
                return event.nativeEvent.touches.length >= 2;
            },
            onPanResponderGrant: function (event) {
                var distance = getTouchDistance(event.nativeEvent.touches);
                if (distance === null) {
                    return;
                }
                pinchStartDistanceRef.current = distance;
                pinchStartScaleRef.current = zoomScaleRef.current;
            },
            onPanResponderMove: function (event) {
                var distance = getTouchDistance(event.nativeEvent.touches);
                if (distance === null) {
                    pinchStartDistanceRef.current = null;
                    pinchStartScaleRef.current = zoomScaleRef.current;
                    return;
                }
                var startDistance = pinchStartDistanceRef.current;
                if (!startDistance) {
                    pinchStartDistanceRef.current = distance;
                    pinchStartScaleRef.current = zoomScaleRef.current;
                    return;
                }
                applyZoomScale(pinchStartScaleRef.current * (distance / startDistance));
            },
            onPanResponderRelease: function () {
                pinchStartDistanceRef.current = null;
                pinchStartScaleRef.current = zoomScaleRef.current;
            },
            onPanResponderTerminate: function () {
                pinchStartDistanceRef.current = null;
                pinchStartScaleRef.current = zoomScaleRef.current;
            },
        });
    }, [zoomScale]);
    (0, react_1.useEffect)(function () {
        if (!attachment || !simulator_harness_1.isSimulatorHarnessEnabled) {
            return;
        }
        var cancelled = false;
        var timeoutId = null;
        var pollHarnessAction = function () { return __awaiter(_this, void 0, void 0, function () {
            var action, appliedScale;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)(LIGHTBOX_ACTION_FILE)];
                    case 1:
                        action = _a.sent();
                        if (!(action && action.type === 'setZoom' && action.requestId && action.requestId !== lastHarnessRequestRef.current && typeof action.scale === 'number')) return [3 /*break*/, 4];
                        lastHarnessRequestRef.current = action.requestId;
                        appliedScale = applyZoomScale(action.scale);
                        pinchStartScaleRef.current = appliedScale;
                        pinchStartDistanceRef.current = null;
                        return [4 /*yield*/, (0, simulator_harness_1.writeSimulatorHarnessJson)(LIGHTBOX_RESULT_FILE, {
                                requestId: action.requestId,
                                attachmentId: attachment.id,
                                requestedScale: action.scale,
                                appliedScale: appliedScale,
                                zoomPercent: Math.round(appliedScale * 100),
                            })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)(LIGHTBOX_ACTION_FILE)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        if (!cancelled) {
                            timeoutId = setTimeout(function () {
                                void pollHarnessAction();
                            }, 250);
                        }
                        return [2 /*return*/];
                }
            });
        }); };
        var _this = this;
        void pollHarnessAction();
        return function () {
            cancelled = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [attachment, zoomScale]);
    if (!attachment) {
        return null;
    }
    var hasMultiple = attachments.length > 1;
    return (<react_native_1.Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <react_native_1.TouchableWithoutFeedback onPress={onClose}>
        <react_native_1.View style={styles.overlay} testID="attachment-lightbox" accessible={false}>
          <react_native_1.TouchableWithoutFeedback>
            <react_native_1.View style={styles.card} accessible={false}>
              <react_native_1.View style={styles.header}>
                <react_native_1.Text testID="attachment-lightbox-file-name" accessible style={styles.fileName} numberOfLines={1}>
                  {attachment.fileName}
                </react_native_1.Text>
                <react_native_1.TouchableOpacity testID="attachment-lightbox-close" accessible style={styles.closeButton} accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose}>
                  <react_native_1.Text style={styles.closeButtonText}>{'\u2715'}</react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
              <react_native_1.View style={styles.imageFrame}>
                <react_native_1.View testID="attachment-lightbox-image" accessible style={styles.imageTapTarget}>
                  <react_native_1.Animated.Image {...pinchResponder.panHandlers} source={__assign({ uri: (0, file_picker_1.getAttachmentFileUrl)(attachment.id) }, (authToken
            ? { headers: { Authorization: "Bearer ".concat(authToken) } }
            : {}))} style={[
            styles.image,
            {
                transform: [{ scale: zoomScale }],
            },
        ]} resizeMode="contain"/>
                </react_native_1.View>
                {hasMultiple ? (<>
                    <react_native_1.TouchableOpacity style={[styles.navButton, styles.navButtonLeft]} accessibilityRole="button" accessibilityLabel={previousLabel} onPress={function () {
                return onNavigate(currentIndex > 0 ? currentIndex - 1 : attachments.length - 1);
            }}>
                      <react_native_1.Text style={styles.navButtonText}>{'\u2039'}</react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                    <react_native_1.TouchableOpacity style={[styles.navButton, styles.navButtonRight]} accessibilityRole="button" accessibilityLabel={nextLabel} onPress={function () {
                return onNavigate(currentIndex < attachments.length - 1 ? currentIndex + 1 : 0);
            }}>
                      <react_native_1.Text style={styles.navButtonText}>{'\u203A'}</react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                  </>) : null}
              </react_native_1.View>
              {hasMultiple ? (<react_native_1.View style={styles.counterWrap}>
                  <react_native_1.Text style={styles.counterText}>
                    {currentIndex + 1} / {attachments.length}
                  </react_native_1.Text>
                </react_native_1.View>) : null}
              <react_native_1.View style={styles.actions}>
                <react_native_1.TouchableOpacity style={styles.secondaryAction} activeOpacity={0.85} onPress={onClose}>
                  <react_native_1.Text style={styles.secondaryActionText}>{closeLabel}</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity style={styles.primaryAction} activeOpacity={0.85} onPress={onShare} disabled={isSharing}>
                  <react_native_1.Text style={styles.primaryActionText}>
                    {isSharing ? sharingLabel : shareLabel}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
            </react_native_1.View>
          </react_native_1.TouchableWithoutFeedback>
        </react_native_1.View>
      </react_native_1.TouchableWithoutFeedback>
    </react_native_1.Modal>);
}
var styles = react_native_1.StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(16, 24, 32, 0.78)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme_1.spacing.lg,
    },
    card: {
        width: '100%',
        maxWidth: 460,
        borderRadius: theme_1.borderRadius.xl,
        backgroundColor: theme_1.colors.talkPanel,
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        padding: theme_1.spacing.md,
        shadowColor: theme_1.colors.black,
        shadowOpacity: 0.22,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 12 },
        elevation: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme_1.spacing.sm,
        marginBottom: theme_1.spacing.md,
    },
    fileName: {
        flex: 1,
        color: '#203040',
        fontSize: theme_1.fontSize.base,
        fontWeight: '700',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eef3f7',
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
    },
    closeButtonText: {
        color: '#506779',
        fontSize: theme_1.fontSize.lg,
        fontWeight: '700',
    },
    imageFrame: {
        borderRadius: theme_1.borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: '#f4f7fa',
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageTapTarget: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
        aspectRatio: 1,
        maxHeight: 420,
        backgroundColor: '#f4f7fa',
    },
    navButton: {
        position: 'absolute',
        top: '50%',
        marginTop: -20,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
    },
    navButtonLeft: {
        left: theme_1.spacing.sm,
    },
    navButtonRight: {
        right: theme_1.spacing.sm,
    },
    navButtonText: {
        color: '#506779',
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 30,
    },
    counterWrap: {
        alignItems: 'center',
        marginTop: theme_1.spacing.sm,
    },
    counterText: {
        color: '#5d7284',
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: theme_1.spacing.sm,
        marginTop: theme_1.spacing.md,
    },
    secondaryAction: {
        borderRadius: 999,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        backgroundColor: '#eef3f7',
        borderWidth: 1,
        borderColor: theme_1.colors.talkPanelBorder,
    },
    secondaryActionText: {
        color: '#4d6678',
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
    primaryAction: {
        borderRadius: 999,
        paddingHorizontal: theme_1.spacing.md,
        paddingVertical: theme_1.spacing.sm,
        backgroundColor: theme_1.colors.primary,
    },
    primaryActionText: {
        color: theme_1.colors.white,
        fontSize: theme_1.fontSize.sm,
        fontWeight: '700',
    },
});
