import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { t } from '../lib/i18n';
import {
  isSimulatorHarnessEnabled,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { colors, spacing, fontSize, borderRadius } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    if (isSimulatorHarnessEnabled) {
      void writeSimulatorHarnessJson(
        'error-boundary.json',
        {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          capturedAt: new Date().toISOString(),
        },
        true,
      );
    }
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>!</Text>
          <Text style={styles.title}>{t('errorBoundary.title')}</Text>
          <Text style={styles.message}>
            {t('errorBoundary.message')}
          </Text>
          {__DEV__ && this.state.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText} numberOfLines={6}>
                {this.state.error.message}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
            <Text style={styles.buttonText}>{t('errorBoundary.restart')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  icon: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.error,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.error,
    textAlign: 'center',
    lineHeight: 68,
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  errorBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xxl,
    width: '100%',
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.lg,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
});
