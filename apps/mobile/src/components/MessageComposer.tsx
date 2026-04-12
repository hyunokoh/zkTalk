import React, { useRef, useCallback, useState, memo, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  TextInputChangeEventData,
} from 'react-native';
import { colors, spacing, fontSize as fs, borderRadius } from '../theme';
import { isSimulatorHarnessEnabled } from '../lib/simulator-harness';

// Popular emojis for the picker
const EMOJI_LIST = [
  '\u{1F600}', '\u{1F602}', '\u{1F605}', '\u{1F606}', '\u{1F60D}', '\u{1F618}',
  '\u{1F60E}', '\u{1F914}', '\u{1F644}', '\u{1F62D}', '\u{1F621}', '\u{1F625}',
  '\u{1F44D}', '\u{1F44F}', '\u{1F64F}', '\u{1F4AA}', '\u{2764}\u{FE0F}', '\u{1F525}',
  '\u{1F389}', '\u{1F38A}', '\u{2705}', '\u{274C}', '\u{2B50}', '\u{1F4AF}',
  '\u{1F60A}', '\u{1F609}', '\u{1F917}', '\u{1F92D}', '\u{1F4A1}', '\u{1F44B}',
];

interface MessageComposerProps {
  placeholder: string;
  sendLabel: string;
  sendingLabel: string;
  isSending: boolean;
  onSend: (text: string) => void | boolean | Promise<void | boolean>;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  onPressAdd?: () => void;
  allowEmptySubmit?: boolean;
  draftText?: string;
  draftKey?: string | null;
  testIDPrefix?: string;
  onDraftChange?: (text: string) => void;
}

/**
 * Isolated message composer component.
 * Uses React.memo to prevent parent re-renders (message polling, WebSocket events,
 * FlatList updates) from propagating to the TextInput, which would break Korean
 * IME composition.
 *
 * Key design decisions:
 * - Text stored in a ref (textRef), NOT state. No setState = no re-render.
 * - Uses `onChange` (nativeEvent.text) instead of `onChangeText` to avoid
 *   issues with controlled vs uncontrolled inputs during IME composition.
 * - inputRef.clear() is used to reset the input after sending (not controlled value).
 */
const MessageComposer = memo(function MessageComposer({
  placeholder,
  sendLabel,
  sendingLabel,
  isSending,
  onSend,
  onTypingStart,
  onTypingStop,
  onPressAdd,
  allowEmptySubmit = false,
  draftText,
  draftKey,
  testIDPrefix = 'message-composer',
  onDraftChange,
}: MessageComposerProps) {
  const textRef = useRef('');
  const inputRef = useRef<TextInput>(null);
  const isTypingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [controlledText, setControlledText] = useState('');

  const getCurrentInputText = useCallback(() => {
    const nativeText = (inputRef.current as (TextInput & { _lastNativeText?: string }) | null)?._lastNativeText;
    if (typeof nativeText === 'string' && nativeText.length > 0) {
      return nativeText;
    }

    return textRef.current;
  }, []);

  const applyTextChange = useCallback(
    (nextText: string) => {
      textRef.current = nextText;
      if (isSimulatorHarnessEnabled) {
        setControlledText(nextText);
      }
      onDraftChange?.(nextText);
      const hasText = nextText.trim().length > 0;
      if (hasText && !isTypingRef.current) {
        isTypingRef.current = true;
        onTypingStart?.();
      } else if (!hasText && isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop?.();
      }
    },
    [onTypingStart, onTypingStop],
  );

  const handleChange = useCallback(
    (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
      applyTextChange(e.nativeEvent.text);
    },
    [applyTextChange],
  );

  const handleChangeText = useCallback(
    (nextText: string) => {
      applyTextChange(nextText);
    },
    [applyTextChange],
  );

  const handleSend = useCallback(async () => {
    const currentText = getCurrentInputText();
    if (currentText !== textRef.current) {
      textRef.current = currentText;
      onDraftChange?.(currentText);
    }

    const trimmed = currentText.trim();
    if ((!trimmed && !allowEmptySubmit) || isSending || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    try {
      const shouldClear = await Promise.resolve(onSend(trimmed));
      if (shouldClear === false) return;
      textRef.current = '';
      if (isSimulatorHarnessEnabled) {
        setControlledText('');
      }
      inputRef.current?.clear();
      onDraftChange?.('');
      isTypingRef.current = false;
      setShowEmoji(false);
      onTypingStop?.();
    } finally {
      isSubmittingRef.current = false;
    }
  }, [allowEmptySubmit, getCurrentInputText, isSending, onDraftChange, onSend, onTypingStop]);

  const handleEmojiPress = useCallback((emoji: string) => {
    textRef.current += emoji;
    if (isSimulatorHarnessEnabled) {
      setControlledText(textRef.current);
    }
    // We need to set the native text value. Since we don't use controlled
    // value, we use setNativeProps.
    inputRef.current?.setNativeProps({ text: textRef.current });
    onDraftChange?.(textRef.current);
    if (!isTypingRef.current && textRef.current.trim().length > 0) {
      isTypingRef.current = true;
      onTypingStart?.();
    }
  }, [onTypingStart]);

  const toggleEmoji = useCallback(() => {
    setShowEmoji((prev) => !prev);
  }, []);

  useEffect(() => {
    if (draftKey === undefined) return;

    textRef.current = draftText ?? '';
    if (isSimulatorHarnessEnabled) {
      setControlledText(textRef.current);
    }
    onDraftChange?.(textRef.current);
    inputRef.current?.setNativeProps({
      text: textRef.current,
      selection: {
        start: textRef.current.length,
        end: textRef.current.length,
      },
    });
    inputRef.current?.focus();

    const hasText = textRef.current.trim().length > 0;
    if (hasText) {
      isTypingRef.current = true;
      onTypingStart?.();
    } else if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop?.();
    }
  }, [draftKey, draftText, onDraftChange, onTypingStart, onTypingStop]);

  return (
    <View>
      {showEmoji && (
        <View style={styles.emojiPanel}>
          <ScrollView
            horizontal={false}
            contentContainerStyle={styles.emojiGrid}
            keyboardShouldPersistTaps="always"
          >
            {EMOJI_LIST.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiButton}
                onPress={() => handleEmojiPress(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={styles.composer}>
        {onPressAdd && (
          <TouchableOpacity
            testID={`${testIDPrefix}-attach`}
            style={styles.attachButton}
            onPress={onPressAdd}
            activeOpacity={0.8}
          >
            <Text style={styles.attachButtonText}>{'\u{1F4CE}'}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.inputWrap}>
          <TextInput
            testID={`${testIDPrefix}-input`}
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.talkSubtle}
            onChange={handleChange}
            onChangeText={handleChangeText}
            value={isSimulatorHarnessEnabled ? controlledText : undefined}
            multiline
            maxLength={32000}
          />
        </View>
        <TouchableOpacity
          testID={`${testIDPrefix}-emoji`}
          style={styles.emojiToggle}
          onPress={toggleEmoji}
          activeOpacity={0.8}
        >
          <Text style={styles.emojiToggleText}>
            {showEmoji ? '\u{2328}\u{FE0F}' : '\u263A'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`${testIDPrefix}-send`}
          style={[styles.sendButton, isSending && styles.sendDisabled]}
          onPress={handleSend}
          disabled={isSending}
          activeOpacity={0.85}
          accessibilityLabel={isSending ? sendingLabel : sendLabel}
        >
          <Text style={styles.sendText}>{isSending ? '...' : '\u27A4'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default MessageComposer;

const styles = StyleSheet.create({
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.talkBackground,
    borderTopWidth: 1,
    borderTopColor: colors.talkPanelBorder,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.talkPanel,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  attachButtonText: {
    color: colors.talkMeta,
    fontSize: 18,
    lineHeight: 20,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.talkPanel,
    borderRadius: 20,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginRight: spacing.xs,
  },
  input: {
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: fs.base,
    maxHeight: 120,
    minHeight: 40,
  },
  emojiToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
    backgroundColor: colors.talkPanel,
  },
  emojiToggleText: {
    fontSize: 18,
  },
  sendButton: {
    backgroundColor: colors.talkOwnBubble,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 18,
  },
  // Emoji panel
  emojiPanel: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 24,
    backgroundColor: colors.talkPanel,
    maxHeight: 180,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emojiButton: {
    width: '16.66%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 26,
  },
});
