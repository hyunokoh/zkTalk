import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../lib/api';
import { GOOGLE_AUTH_REQUEST_CONFIG, hasGoogleAuthConfig } from '../lib/auth-config';
import { useAuthStore } from '../stores/auth';
import { useTranslation } from '../lib/i18n';
import {
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import Logo from '../components/Logo';
import { borderRadius, colors, fontSize, spacing } from '../theme';

type Step = 'phone' | 'otp' | 'email' | 'emailVerify';
type CountryCodeOption = {
  label: string;
  value: string;
  stripLeadingZero?: boolean;
};

const OTP_LENGTH = 6;

WebBrowser.maybeCompleteAuthSession();

function normalizePhoneNumberInput(value: string): string {
  return value.replace(/\D/g, '');
}

function extractMagicLinkToken(url: string): string | null {
  try {
    const { queryParams } = Linking.parse(url);
    const token = queryParams?.token;
    return typeof token === 'string' && token.trim().length > 0 ? token.trim() : null;
  } catch {
    return null;
  }
}

export default function LoginScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('phone');
  const [countryCode, setCountryCode] = useState('+82');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [emailToken, setEmailToken] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [devActionAttempted, setDevActionAttempted] = useState(false);
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<'google' | 'apple' | null>(
    null,
  );
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'ios');
  const login = useAuthStore((s) => s.login);
  const loginWithSessionToken = useAuthStore((s) => s.loginWithSessionToken);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const incomingUrl = Linking.useURL();
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest(
    GOOGLE_AUTH_REQUEST_CONFIG,
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setAppleAvailable(false);
      return;
    }

    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  useEffect(() => {
    async function handleGoogleResponse() {
      if (!googleResponse) return;

      if (googleResponse.type !== 'success') {
        if (googleResponse.type !== 'dismiss' && googleResponse.type !== 'cancel') {
          Alert.alert(t('auth.error'), t('auth.googleFailed'));
        }
        setSocialLoadingProvider(null);
        return;
      }

      const idToken = googleResponse.params?.id_token ?? googleResponse.authentication?.idToken;
      if (!idToken) {
        Alert.alert(t('auth.error'), t('auth.googleMissingToken'));
        setSocialLoadingProvider(null);
        return;
      }

      try {
        const data = await api<{ sessionToken: string }>('/api/auth/oauth/google', {
          method: 'POST',
          body: { idToken },
        });
        await loginWithSessionToken(data.sessionToken);
      } catch (err) {
        Alert.alert(t('auth.error'), err instanceof Error ? err.message : t('auth.googleFailed'));
      } finally {
        setSocialLoadingProvider(null);
      }
    }

    void handleGoogleResponse();
  }, [googleResponse, loginWithSessionToken, t]);

  useEffect(() => {
    async function handleIncomingMagicLink() {
      if (!incomingUrl) return;

      const token = extractMagicLinkToken(incomingUrl);
      if (!token) return;

      setStep('emailVerify');
      setEmailToken(token);

      try {
        const data = await api<{ sessionToken: string }>('/api/auth/magic-link/verify', {
          method: 'POST',
          body: { token },
        });
        await loginWithSessionToken(data.sessionToken);
      } catch (err) {
        Alert.alert(
          t('auth.error'),
          err instanceof Error ? err.message : t('auth.magicLinkVerifyFailed'),
        );
      }
    }

    void handleIncomingMagicLink();
  }, [incomingUrl, loginWithSessionToken, t]);

  const COUNTRY_OPTIONS: CountryCodeOption[] = [
    { label: t('auth.countryKorea'), value: '+82', stripLeadingZero: true },
    { label: t('auth.countryUnitedStates'), value: '+1' },
    { label: t('auth.countryJapan'), value: '+81', stripLeadingZero: true },
  ];

  const selectedCountry = COUNTRY_OPTIONS.find((option) => option.value === countryCode);
  const normalizedPhoneNumber = normalizePhoneNumberInput(phoneNumber);
  const subscriberNumber =
    selectedCountry?.stripLeadingZero && normalizedPhoneNumber.startsWith('0')
      ? normalizedPhoneNumber.slice(1)
      : normalizedPhoneNumber;
  const fullPhoneNumber = `${countryCode}${subscriberNumber}`;
  const isSocialLoading = socialLoadingProvider !== null;
  const showPrimaryAuthTabs = step === 'phone' || step === 'email';
  const hasDirectMagicLinkToken = emailToken.trim().length > 0;

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttempted || loading) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<
        | {
            type: 'phoneLogin';
            countryCode?: string;
            phoneNumber: string;
          }
        | {
            type: 'emailMagicLinkLogin';
            email: string;
          }
      >('dev-login-action.json');
      if (!action) return;

      try {
        setDevActionAttempted(true);

        if (action.type === 'phoneLogin') {
          const nextCountryCode = action.countryCode ?? '+82';
          const option = COUNTRY_OPTIONS.find((item) => item.value === nextCountryCode);
          const normalized = normalizePhoneNumberInput(action.phoneNumber);
          const subscriber =
            option?.stripLeadingZero && normalized.startsWith('0')
              ? normalized.slice(1)
              : normalized;
          const fullNumber = `${nextCountryCode}${subscriber}`;

          setCountryCode(nextCountryCode);
          setPhoneNumber(normalized);
          setStep('otp');

          const requestResult = await api<{ code?: string }>('/api/auth/phone/request', {
            method: 'POST',
            body: { phoneNumber: fullNumber },
          });
          const code = requestResult.code;
          if (!code) {
            throw new Error('Phone login dev action did not receive an OTP code');
          }

          setOtpDigits(code.slice(0, OTP_LENGTH).split(''));
          await login(fullNumber, code);
          await writeSimulatorHarnessJson(
            'dev-login-result.json',
            { ok: true, action: 'phoneLogin', phoneNumber: fullNumber },
          );
          return;
        }

        const trimmedEmail = action.email.trim();
        setEmail(trimmedEmail);
        setStep('emailVerify');
        const requestResult = await api<{ token?: string }>('/api/auth/magic-link/request', {
          method: 'POST',
          body: { email: trimmedEmail },
        });
        const token = requestResult.token;
        if (!token) {
          throw new Error('Magic-link login dev action did not receive a token');
        }
        setEmailToken(token);
        const verifyResult = await api<{ sessionToken: string }>('/api/auth/magic-link/verify', {
          method: 'POST',
          body: { token },
        });
        await loginWithSessionToken(verifyResult.sessionToken);
        await writeSimulatorHarnessJson(
          'dev-login-result.json',
          { ok: true, action: 'emailMagicLinkLogin', email: trimmedEmail },
        );
      } catch (error) {
        await writeSimulatorHarnessJson(
          'dev-login-result.json',
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    void runDevAction();
  }, [COUNTRY_OPTIONS, devActionAttempted, loading, login, loginWithSessionToken]);

  const handleCountryCodePress = () => {
    Alert.alert(
      t('auth.selectCountryCode'),
      undefined,
      [
        ...COUNTRY_OPTIONS.map((option) => ({
          text: option.value === countryCode ? `${option.label} ✓` : option.label,
          onPress: () => setCountryCode(option.value),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
    );
  };

  const handleGoogleLoginPress = async () => {
    if (!hasGoogleAuthConfig()) {
      Alert.alert(t('auth.socialLoginUnavailableTitle'), t('auth.googleConfigMissing'));
      return;
    }

    if (!googleRequest) {
      Alert.alert(t('auth.socialLoginUnavailableTitle'), t('auth.googleUnavailable'));
      return;
    }

    setSocialLoadingProvider('google');

    try {
      const result = await promptGoogleAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setSocialLoadingProvider(null);
      }
    } catch (err) {
      setSocialLoadingProvider(null);
      Alert.alert(t('auth.error'), err instanceof Error ? err.message : t('auth.googleFailed'));
    }
  };

  const handleAppleLoginPress = async () => {
    if (Platform.OS !== 'ios' || !appleAvailable) {
      Alert.alert(t('auth.socialLoginUnavailableTitle'), t('auth.appleUnavailable'));
      return;
    }

    setSocialLoadingProvider('apple');

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error(t('auth.appleMissingToken'));
      }

      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim();

      const data = await api<{ sessionToken: string }>('/api/auth/oauth/apple', {
        method: 'POST',
        body: {
          idToken: credential.identityToken,
          ...(fullName ? { name: fullName } : {}),
        },
      });

      await loginWithSessionToken(data.sessionToken);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        err.code === 'ERR_REQUEST_CANCELED'
      ) {
        setSocialLoadingProvider(null);
        return;
      }

      Alert.alert(t('auth.error'), err instanceof Error ? err.message : t('auth.appleFailed'));
    } finally {
      setSocialLoadingProvider(null);
    }
  };

  const requestOtp = async () => {
    if (!normalizedPhoneNumber) {
      Alert.alert(t('auth.error'), t('auth.enterPhoneNumber'));
      return;
    }

    setLoading(true);
    try {
      const res = await api<{ sent: boolean; code?: string }>('/api/auth/phone/request', {
        method: 'POST',
        body: { phoneNumber: fullPhoneNumber },
      });
      if (res.code) {
        Alert.alert(t('auth.devCode', { code: res.code }));
      }
      setStep('otp');
    } catch (err) {
      Alert.alert(t('auth.error'), err instanceof Error ? err.message : t('auth.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const requestMagicLink = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert(t('auth.error'), t('auth.enterEmail'));
      return;
    }

    setLoading(true);
    try {
      const res = await api<{ token?: string }>('/api/auth/magic-link/request', {
        method: 'POST',
        body: { email: trimmedEmail },
      });
      if (res.token) {
        setEmailToken(res.token);
      }
      setStep('emailVerify');
    } catch (err) {
      Alert.alert(
        t('auth.error'),
        err instanceof Error ? err.message : t('auth.emailSendFailed'),
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyMagicLinkToken = async (token = emailToken.trim()) => {
    if (!token) {
      Alert.alert(t('auth.error'), t('auth.enterMagicLinkToken'));
      return;
    }

    setLoading(true);
    try {
      const data = await api<{ sessionToken: string }>('/api/auth/magic-link/verify', {
        method: 'POST',
        body: { token },
      });
      await loginWithSessionToken(data.sessionToken);
    } catch (err) {
      Alert.alert(
        t('auth.error'),
        err instanceof Error ? err.message : t('auth.magicLinkVerifyFailed'),
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (code: string) => {
    if (code.length !== OTP_LENGTH) return;

    setLoading(true);
    try {
      await login(fullPhoneNumber, code);
    } catch (err) {
      Alert.alert(t('auth.error'), err instanceof Error ? err.message : t('auth.verifyFailed'));
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.split('').slice(0, OTP_LENGTH);
      const nextOtp = [...otpDigits];
      digits.forEach((digit, digitIndex) => {
        if (index + digitIndex < OTP_LENGTH) {
          nextOtp[index + digitIndex] = digit;
        }
      });
      setOtpDigits(nextOtp);
      const code = nextOtp.join('');
      if (code.length === OTP_LENGTH) {
        void verifyOtp(code);
      } else {
        otpRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]?.focus();
      }
      return;
    }

    const nextOtp = [...otpDigits];
    nextOtp[index] = value;
    setOtpDigits(nextOtp);

    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    const code = nextOtp.join('');
    if (code.length === OTP_LENGTH) {
      void verifyOtp(code);
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      const nextOtp = [...otpDigits];
      nextOtp[index - 1] = '';
      setOtpDigits(nextOtp);
    }
  };

  const handlePhoneNumberChange = (value: string) => {
    setPhoneNumber(normalizePhoneNumberInput(value));
  };

  const handleSelectStep = (nextStep: 'phone' | 'email') => {
    setStep(nextStep);
    setOtpDigits(Array(OTP_LENGTH).fill(''));
    setEmailToken('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <View style={styles.logoContainer}>
            <Logo size={80} />
            <Text style={styles.title}>{t('app.name')}</Text>
            <Text style={styles.subtitle}>{t('auth.tagline')}</Text>
          </View>

          {showPrimaryAuthTabs ? (
            <View style={styles.formContainer}>
              <View style={styles.authTabs}>
                <TouchableOpacity
                  style={[styles.authTab, step === 'phone' && styles.authTabActive]}
                  onPress={() => handleSelectStep('phone')}
                  disabled={loading || isSocialLoading}
                >
                  <Text style={[styles.authTabText, step === 'phone' && styles.authTabTextActive]}>
                    {t('auth.phone')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.authTab, step === 'email' && styles.authTabActive]}
                  onPress={() => handleSelectStep('email')}
                  disabled={loading || isSocialLoading}
                >
                  <Text style={[styles.authTabText, step === 'email' && styles.authTabTextActive]}>
                    {t('auth.email')}
                  </Text>
                </TouchableOpacity>
              </View>

              {step === 'phone' ? (
                <>
                  <Text style={styles.label}>{t('auth.phone')}</Text>
                  <View style={styles.phoneRow}>
                    <TouchableOpacity
                      style={styles.countryCodeButton}
                      onPress={handleCountryCodePress}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.countryCodeText}>{countryCode}</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder={t('auth.phonePlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      value={phoneNumber}
                      onChangeText={handlePhoneNumberChange}
                      editable={!loading && !isSocialLoading}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.buttonDisabled]}
                    onPress={requestOtp}
                    disabled={loading || isSocialLoading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.primaryButtonText}>{t('auth.sendCode')}</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.label}>{t('auth.email')}</Text>
                  <TextInput
                    style={styles.emailInput}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading && !isSocialLoading}
                  />

                  <TouchableOpacity
                    style={[styles.primaryButton, loading && styles.buttonDisabled]}
                    onPress={requestMagicLink}
                    disabled={loading || isSocialLoading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.primaryButtonText}>{t('auth.sendMagicLink')}</Text>
                    )}
                  </TouchableOpacity>

                  <Text style={styles.inlineHint}>{t('auth.magicLinkHint')}</Text>
                </>
              )}

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.or')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[
                  styles.socialButton,
                  !hasGoogleAuthConfig() && styles.socialButtonMuted,
                  (loading || isSocialLoading) && styles.buttonDisabled,
                ]}
                onPress={handleGoogleLoginPress}
                disabled={loading || isSocialLoading}
              >
                <Text style={styles.socialIcon}>G</Text>
                <Text style={styles.socialText}>{t('auth.google')}</Text>
                {socialLoadingProvider === 'google' ? (
                  <ActivityIndicator color={colors.text} />
                ) : !hasGoogleAuthConfig() ? (
                  <View style={styles.socialBadge}>
                    <Text style={styles.socialBadgeText}>{t('auth.socialLoginSetup')}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.socialButton,
                  (!appleAvailable || Platform.OS !== 'ios') && styles.socialButtonMuted,
                  (loading || isSocialLoading) && styles.buttonDisabled,
                ]}
                onPress={handleAppleLoginPress}
                disabled={loading || isSocialLoading}
              >
                <Text style={styles.socialIcon}>{'\u{F8FF}'}</Text>
                <Text style={styles.socialText}>{t('auth.apple')}</Text>
                {socialLoadingProvider === 'apple' ? (
                  <ActivityIndicator color={colors.text} />
                ) : Platform.OS !== 'ios' || !appleAvailable ? (
                  <View style={styles.socialBadge}>
                    <Text style={styles.socialBadgeText}>{t('auth.socialLoginIosOnly')}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          ) : step === 'otp' ? (
            <View style={styles.formContainer}>
              <Text style={styles.label}>{t('auth.verificationCode')}</Text>
              <Text style={styles.hint}>{t('auth.codeSentTo', { phone: fullPhoneNumber })}</Text>

              <View style={styles.otpRow}>
                {otpDigits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      otpRefs.current[index] = ref;
                    }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(index, value)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? OTP_LENGTH : 1}
                    editable={!loading}
                    autoFocus={index === 0}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {loading ? (
                <View style={styles.verifyingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.verifyingText}>{t('auth.verifying')}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => {
                  setStep('phone');
                  setOtpDigits(Array(OTP_LENGTH).fill(''));
                }}
              >
                <Text style={styles.backLinkText}>{t('auth.useDifferentNumber')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendLink} onPress={requestOtp} disabled={loading}>
                <Text style={styles.resendText}>{t('auth.resendCode')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={styles.label}>{t('auth.magicLinkToken')}</Text>
              <Text style={styles.hint}>{t('auth.magicLinkSentTo', { email: email.trim() })}</Text>

              {hasDirectMagicLinkToken ? (
                <View style={styles.devTokenCard}>
                  <Text style={styles.devTokenLabel}>{t('auth.magicLinkTokenReady')}</Text>
                  <Text selectable style={styles.devTokenValue}>
                    {emailToken}
                  </Text>
                </View>
              ) : null}

              <TextInput
                style={styles.emailInput}
                placeholder={t('auth.magicLinkTokenPlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                value={emailToken}
                onChangeText={setEmailToken}
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={() => void verifyMagicLinkToken()}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('auth.verifyMagicLink')}</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.inlineHint}>
                {hasDirectMagicLinkToken
                  ? t('auth.magicLinkDirectTokenHint')
                  : t('auth.magicLinkOpenHint')}
              </Text>

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => {
                  setStep('email');
                  setEmailToken('');
                }}
              >
                <Text style={styles.backLinkText}>{t('auth.useDifferentEmail')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendLink}
                onPress={requestMagicLink}
                disabled={loading}
              >
                <Text style={styles.resendText}>{t('auth.resendMagicLink')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    gap: 0,
  },
  authTabs: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.xl,
    padding: 4,
  },
  authTab: {
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    flex: 1,
    paddingVertical: spacing.md,
  },
  authTabActive: {
    backgroundColor: colors.primary,
  },
  authTabText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  authTabTextActive: {
    color: colors.white,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  inlineHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  devTokenCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  devTokenLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  devTokenValue: {
    color: colors.white,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  countryCodeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minWidth: 72,
    paddingHorizontal: spacing.lg,
  },
  countryCodeText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    color: colors.white,
    fontSize: fontSize.xl,
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  emailInput: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    color: colors.white,
    fontSize: fontSize.base,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginHorizontal: spacing.lg,
    fontWeight: '600',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  socialButtonMuted: {
    opacity: 0.78,
  },
  socialIcon: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '700',
  },
  socialText: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  socialBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  socialBadgeText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: fontSize.xxl,
    color: colors.white,
    fontWeight: '700',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
  },
  verifyingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  verifyingText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  backLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  backLinkText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  resendLink: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resendText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
