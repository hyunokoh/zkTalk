import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { getAttachmentFileUrl } from '../lib/file-picker';
import {
  deleteSimulatorHarnessFile,
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { borderRadius, colors, fontSize as fs, spacing } from '../theme';

const MIN_ZOOM_SCALE = 1;
const MAX_ZOOM_SCALE = 4;
const LIGHTBOX_ACTION_FILE = 'dev-attachment-lightbox-action.json';
const LIGHTBOX_RESULT_FILE = 'dev-attachment-lightbox-result.json';

function clampZoomScale(scale: number): number {
  return Math.max(MIN_ZOOM_SCALE, Math.min(MAX_ZOOM_SCALE, scale));
}

function getTouchDistance(
  touches: readonly { pageX: number; pageY: number }[],
): number | null {
  if (touches.length < 2) {
    return null;
  }

  const [firstTouch, secondTouch] = touches;
  return Math.hypot(
    secondTouch.pageX - firstTouch.pageX,
    secondTouch.pageY - firstTouch.pageY,
  );
}

interface AttachmentLightboxProps {
  attachments: Array<{
    id: string;
    fileName: string;
  }>;
  currentIndex: number;
  authToken: string | null;
  isSharing: boolean;
  closeLabel: string;
  shareLabel: string;
  sharingLabel: string;
  previousLabel: string;
  nextLabel: string;
  onClose: () => void;
  onShare: () => void;
  onNavigate: (index: number) => void;
}

export default function AttachmentLightbox({
  attachments,
  currentIndex,
  authToken,
  isSharing,
  closeLabel,
  shareLabel,
  sharingLabel,
  previousLabel,
  nextLabel,
  onClose,
  onShare,
  onNavigate,
}: AttachmentLightboxProps) {
  const attachment = attachments[currentIndex];
  const zoomScale = useRef(new Animated.Value(MIN_ZOOM_SCALE)).current;
  const zoomScaleRef = useRef(MIN_ZOOM_SCALE);
  const pinchStartScaleRef = useRef(MIN_ZOOM_SCALE);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const lastHarnessRequestRef = useRef<string | null>(null);

  const applyZoomScale = (nextScale: number) => {
    const clampedScale = clampZoomScale(nextScale);
    zoomScaleRef.current = clampedScale;
    zoomScale.setValue(clampedScale);
    return clampedScale;
  };

  useEffect(() => {
    zoomScaleRef.current = MIN_ZOOM_SCALE;
    pinchStartScaleRef.current = MIN_ZOOM_SCALE;
    pinchStartDistanceRef.current = null;
    zoomScale.setValue(MIN_ZOOM_SCALE);
  }, [attachment?.id, zoomScale]);

  const pinchResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: (event) =>
          event.nativeEvent.touches.length >= 2,
        onMoveShouldSetPanResponderCapture: (event) =>
          event.nativeEvent.touches.length >= 2,
        onPanResponderGrant: (event) => {
          const distance = getTouchDistance(event.nativeEvent.touches);
          if (distance === null) {
            return;
          }

          pinchStartDistanceRef.current = distance;
          pinchStartScaleRef.current = zoomScaleRef.current;
        },
        onPanResponderMove: (event) => {
          const distance = getTouchDistance(event.nativeEvent.touches);
          if (distance === null) {
            pinchStartDistanceRef.current = null;
            pinchStartScaleRef.current = zoomScaleRef.current;
            return;
          }

          const startDistance = pinchStartDistanceRef.current;
          if (!startDistance) {
            pinchStartDistanceRef.current = distance;
            pinchStartScaleRef.current = zoomScaleRef.current;
            return;
          }

          applyZoomScale(pinchStartScaleRef.current * (distance / startDistance));
        },
        onPanResponderRelease: () => {
          pinchStartDistanceRef.current = null;
          pinchStartScaleRef.current = zoomScaleRef.current;
        },
        onPanResponderTerminate: () => {
          pinchStartDistanceRef.current = null;
          pinchStartScaleRef.current = zoomScaleRef.current;
        },
      }),
    [zoomScale],
  );

  useEffect(() => {
    if (!attachment || !isSimulatorHarnessEnabled) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function pollHarnessAction() {
      const action = await readSimulatorHarnessJson<{
        requestId?: string;
        type?: 'setZoom';
        scale?: number;
      }>(LIGHTBOX_ACTION_FILE);

      if (
        action?.type === 'setZoom' &&
        action.requestId &&
        action.requestId !== lastHarnessRequestRef.current &&
        typeof action.scale === 'number'
      ) {
        lastHarnessRequestRef.current = action.requestId;
        const appliedScale = applyZoomScale(action.scale);
        pinchStartScaleRef.current = appliedScale;
        pinchStartDistanceRef.current = null;
        await writeSimulatorHarnessJson(LIGHTBOX_RESULT_FILE, {
          requestId: action.requestId,
          attachmentId: attachment.id,
          requestedScale: action.scale,
          appliedScale,
          zoomPercent: Math.round(appliedScale * 100),
        });
        await deleteSimulatorHarnessFile(LIGHTBOX_ACTION_FILE);
      }

      if (!cancelled) {
        timeoutId = setTimeout(() => {
          void pollHarnessAction();
        }, 250);
      }
    }

    void pollHarnessAction();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [attachment, zoomScale]);

  if (!attachment) {
    return null;
  }

  const hasMultiple = attachments.length > 1;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={styles.overlay}
          testID="attachment-lightbox"
          accessible={false}
        >
          <TouchableWithoutFeedback>
            <View style={styles.card} accessible={false}>
              <View style={styles.header}>
                <Text testID="attachment-lightbox-file-name" accessible style={styles.fileName} numberOfLines={1}>
                  {attachment.fileName}
                </Text>
                <TouchableOpacity
                  testID="attachment-lightbox-close"
                  accessible
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel={closeLabel}
                  onPress={onClose}
                >
                  <Text style={styles.closeButtonText}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.imageFrame}>
                <View
                  testID="attachment-lightbox-image"
                  accessible
                  style={styles.imageTapTarget}
                >
                  <Animated.Image
                    {...pinchResponder.panHandlers}
                    source={{
                      uri: getAttachmentFileUrl(attachment.id),
                      ...(authToken
                        ? { headers: { Authorization: `Bearer ${authToken}` } }
                        : {}),
                    }}
                    style={[
                      styles.image,
                      {
                        transform: [{ scale: zoomScale }],
                      },
                    ]}
                    resizeMode="contain"
                  />
                </View>
                {hasMultiple ? (
                  <>
                    <TouchableOpacity
                      style={[styles.navButton, styles.navButtonLeft]}
                      accessibilityRole="button"
                      accessibilityLabel={previousLabel}
                      onPress={() =>
                        onNavigate(currentIndex > 0 ? currentIndex - 1 : attachments.length - 1)
                      }
                    >
                      <Text style={styles.navButtonText}>{'\u2039'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.navButton, styles.navButtonRight]}
                      accessibilityRole="button"
                      accessibilityLabel={nextLabel}
                      onPress={() =>
                        onNavigate(currentIndex < attachments.length - 1 ? currentIndex + 1 : 0)
                      }
                    >
                      <Text style={styles.navButtonText}>{'\u203A'}</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
              {hasMultiple ? (
                <View style={styles.counterWrap}>
                  <Text style={styles.counterText}>
                    {currentIndex + 1} / {attachments.length}
                  </Text>
                </View>
              ) : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  activeOpacity={0.85}
                  onPress={onClose}
                >
                  <Text style={styles.secondaryActionText}>{closeLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryAction}
                  activeOpacity={0.85}
                  onPress={onShare}
                  disabled={isSharing}
                >
                  <Text style={styles.primaryActionText}>
                    {isSharing ? sharingLabel : shareLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 32, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.talkPanel,
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  fileName: {
    flex: 1,
    color: '#203040',
    fontSize: fs.base,
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
    borderColor: colors.talkPanelBorder,
  },
  closeButtonText: {
    color: '#506779',
    fontSize: fs.lg,
    fontWeight: '700',
  },
  imageFrame: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#f4f7fa',
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
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
    borderColor: colors.talkPanelBorder,
  },
  navButtonLeft: {
    left: spacing.sm,
  },
  navButtonRight: {
    right: spacing.sm,
  },
  navButtonText: {
    color: '#506779',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
  counterWrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  counterText: {
    color: '#5d7284',
    fontSize: fs.sm,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryAction: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#eef3f7',
    borderWidth: 1,
    borderColor: colors.talkPanelBorder,
  },
  secondaryActionText: {
    color: '#4d6678',
    fontSize: fs.sm,
    fontWeight: '700',
  },
  primaryAction: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  primaryActionText: {
    color: colors.white,
    fontSize: fs.sm,
    fontWeight: '700',
  },
});
