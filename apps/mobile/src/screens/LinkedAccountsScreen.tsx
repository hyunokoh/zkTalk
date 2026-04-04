import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Linking from 'expo-linking';
import { api } from '../lib/api';
import { GOOGLE_AUTH_REQUEST_CONFIG, hasGoogleAuthConfig } from '../lib/auth-config';
import { useTranslation } from '../lib/i18n';
import {
  isSimulatorHarnessEnabled,
  readSimulatorHarnessJson,
  writeSimulatorHarnessJson,
} from '../lib/simulator-harness';
import { borderRadius, colors, fontSize, spacing } from '../theme';

type AuthMethodType = 'phone' | 'email' | 'google' | 'apple';
type CountryCodeOption = {
  label: string;
  value: string;
  stripLeadingZero?: boolean;
};

interface AuthMethod {
  id: string;
  type: AuthMethodType;
  identifier: string;
  verifiedAt: string | null;
  createdAt: string;
}

function getMethodLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  type: AuthMethodType,
) {
  switch (type) {
    case 'phone':
      return t('settings.authMethodPhone');
    case 'email':
      return t('settings.authMethodEmail');
    case 'google':
      return t('settings.authMethodGoogle');
    case 'apple':
      return t('settings.authMethodApple');
  }
}

function maskIdentifier(type: AuthMethodType, identifier: string) {
  if (type === 'phone') {
    const digits = identifier.replace(/\D/g, '');
    if (digits.length < 4) return identifier;
    return `${identifier.slice(0, Math.max(0, identifier.length - 4))}${digits.slice(-4)}`;
  }

  if (type === 'email') {
    const [localPart, domain] = identifier.split('@');
    if (!localPart || !domain) return identifier;
    const visible = localPart.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(1, localPart.length - visible.length))}@${domain}`;
  }

  return identifier;
}

function normalizePhoneNumberInput(value: string): string {
  return value.replace(/\D/g, '');
}

export default function LinkedAccountsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'ios');
  const [linkingProvider, setLinkingProvider] = useState<AuthMethodType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryCode, setCountryCode] = useState('+82');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneLinkRequested, setPhoneLinkRequested] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailToken, setEmailToken] = useState('');
  const [emailLinkRequested, setEmailLinkRequested] = useState(false);
  const devActionAttemptedRef = useRef(false);
  const incomingUrl = Linking.useURL();
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest(
    GOOGLE_AUTH_REQUEST_CONFIG,
  );

  const methodsQuery = useQuery({
    queryKey: ['auth-methods'],
    queryFn: () => api<{ methods: AuthMethod[] }>('/api/me/auth-methods'),
  });

  const COUNTRY_OPTIONS: CountryCodeOption[] = [
    { label: t('auth.countryKorea'), value: '+82', stripLeadingZero: true },
    { label: t('auth.countryUnitedStates'), value: '+1' },
    { label: t('auth.countryJapan'), value: '+81', stripLeadingZero: true },
  ];

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setAppleAvailable(false);
      return;
    }

    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const unlinkMutation = useMutation({
    mutationFn: async (method: AuthMethod) => {
      await api(`/api/me/auth-methods/${method.id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth-methods'] });
    },
  });

  const linkMutation = useMutation({
    mutationFn: async ({
      provider,
      idToken,
      name,
    }: {
      provider: 'google' | 'apple';
      idToken: string;
      name?: string;
    }) => {
      await api(`/api/me/link/${provider}`, {
        method: 'POST',
        body: {
          idToken,
          ...(name ? { name } : {}),
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth-methods'] });
    },
  });

  const emailLinkRequestMutation = useMutation({
    mutationFn: async (email: string) =>
      api<{ sent: boolean; token?: string }>('/api/me/link/email/request', {
        method: 'POST',
        body: { email },
      }),
  });

  const emailLinkVerifyMutation = useMutation({
    mutationFn: async (token: string) =>
      api('/api/me/link/email/verify', {
        method: 'POST',
        body: { token },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth-methods'] });
    },
  });

  const phoneLinkRequestMutation = useMutation({
    mutationFn: async (phone: string) =>
      api<{ sent: boolean; code?: string }>('/api/me/link/phone/request', {
        method: 'POST',
        body: { phoneNumber: phone },
      }),
  });

  const phoneLinkVerifyMutation = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) =>
      api('/api/me/link/phone/verify', {
        method: 'POST',
        body: { phoneNumber: phone, code },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth-methods'] });
    },
  });

  useEffect(() => {
    async function handleGoogleResponse() {
      if (!googleResponse || googleResponse.type !== 'success') return;

      const idToken =
        googleResponse.params?.id_token ??
        googleResponse.authentication?.idToken ??
        null;

      if (!idToken) {
        Alert.alert(t('common.error'), t('settings.linkGoogleMissingToken'));
        setLinkingProvider(null);
        return;
      }

      try {
        await linkMutation.mutateAsync({ provider: 'google', idToken });
        Alert.alert(t('settings.linkSuccessTitle'), t('settings.linkGoogleSuccessBody'));
      } catch (error) {
        Alert.alert(
          t('common.error'),
          error instanceof Error ? error.message : t('settings.linkFailed'),
        );
      } finally {
        setLinkingProvider(null);
      }
    }

    void handleGoogleResponse();
  }, [googleResponse, linkMutation, t]);

  const linkedTypes = useMemo(
    () => new Set((methodsQuery.data?.methods ?? []).map((method) => method.type)),
    [methodsQuery.data?.methods],
  );

  useEffect(() => {
    if (linkedTypes.has('phone')) {
      setPhoneNumber('');
      setPhoneOtp('');
      setPhoneLinkRequested(false);
    }

    if (linkedTypes.has('email')) {
      setEmailInput('');
      setEmailToken('');
      setEmailLinkRequested(false);
    }
  }, [linkedTypes]);

  useEffect(() => {
    async function handleIncomingEmailLink() {
      if (!incomingUrl || linkedTypes.has('email')) return;

      const { queryParams } = Linking.parse(incomingUrl);
      const token = typeof queryParams?.token === 'string' ? queryParams.token.trim() : '';
      const mode = typeof queryParams?.mode === 'string' ? queryParams.mode : '';

      if (!token || mode !== 'link-email') return;

      setEmailLinkRequested(true);
      setEmailToken(token);

      try {
        await emailLinkVerifyMutation.mutateAsync(token);
        setEmailInput('');
        setEmailToken('');
        setEmailLinkRequested(false);
        Alert.alert(t('settings.linkSuccessTitle'), t('settings.linkEmailSuccessBody'));
      } catch (error) {
        Alert.alert(
          t('common.error'),
          error instanceof Error ? error.message : t('settings.linkFailed'),
        );
      }
    }

    void handleIncomingEmailLink();
  }, [emailLinkVerifyMutation, incomingUrl, linkedTypes, t]);

  useEffect(() => {
    if (!isSimulatorHarnessEnabled || devActionAttemptedRef.current) return;

    async function runDevAction() {
      const action = await readSimulatorHarnessJson<
        | { type: 'linkEmail'; email?: string }
        | { type: 'linkPhone'; phoneNumber?: string }
        | { type: 'unlink'; methodType?: AuthMethodType; identifier?: string }
      >('dev-linked-accounts-action.json');
      if (!action) return;

      try {
        if (action.type === 'unlink' && methodsQuery.isLoading) {
          return;
        }

        devActionAttemptedRef.current = true;

        if (action.type === 'linkEmail') {
          const email = action.email?.trim().toLowerCase();
          if (!email) {
            throw new Error('Missing email for linked accounts dev action');
          }

          setEmailInput(email);
          const requestResult = await emailLinkRequestMutation.mutateAsync(email);
          if (!requestResult.token) {
            throw new Error('Email link token was not returned');
          }

          setEmailLinkRequested(true);
          setEmailToken(requestResult.token);
          await emailLinkVerifyMutation.mutateAsync(requestResult.token);
          await queryClient.invalidateQueries({ queryKey: ['auth-methods'] });

          await writeSimulatorHarnessJson(
            'dev-linked-accounts-result.json',
            {
              ok: true,
              action: 'linkEmail',
              email,
              tokenLength: requestResult.token.length,
            },
          );
          return;
        }

        if (action.type === 'linkPhone') {
          const phoneNumber = action.phoneNumber?.trim();
          if (!phoneNumber) {
            throw new Error('Missing phoneNumber for linked accounts dev action');
          }

          const countryMatch = phoneNumber.match(/^(\+\d{1,3})(\d+)$/);
          if (!countryMatch) {
            throw new Error(`Unsupported phone number format: ${phoneNumber}`);
          }

          const [, nextCountryCode, nationalNumber] = countryMatch;
          setCountryCode(nextCountryCode);
          setPhoneNumber(nationalNumber);

          const requestResult = await phoneLinkRequestMutation.mutateAsync(phoneNumber);
          if (!requestResult.code) {
            throw new Error('Phone verification code was not returned');
          }

          setPhoneLinkRequested(true);
          setPhoneOtp(requestResult.code);
          await phoneLinkVerifyMutation.mutateAsync({
            phone: phoneNumber,
            code: requestResult.code,
          });
          await queryClient.invalidateQueries({ queryKey: ['auth-methods'] });

          await writeSimulatorHarnessJson(
            'dev-linked-accounts-result.json',
            {
              ok: true,
              action: 'linkPhone',
              phoneNumber,
              code: requestResult.code,
            },
          );
          return;
        }

        if (action.type === 'unlink') {
          const methods = methodsQuery.data?.methods ?? [];
          const targetMethod = methods.find((method) => {
            if (action.methodType && method.type !== action.methodType) {
              return false;
            }

            if (action.identifier && method.identifier !== action.identifier) {
              return false;
            }

            return true;
          });

          if (!targetMethod) {
            throw new Error('No matching auth method found to unlink');
          }

          await unlinkMutation.mutateAsync(targetMethod);
          await queryClient.invalidateQueries({ queryKey: ['auth-methods'] });

          await writeSimulatorHarnessJson(
            'dev-linked-accounts-result.json',
            {
              ok: true,
              action: 'unlink',
              methodType: targetMethod.type,
              identifier: targetMethod.identifier,
            },
          );
        }
      } catch (error) {
        await writeSimulatorHarnessJson(
          'dev-linked-accounts-result.json',
          {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    void runDevAction();
  }, [
    emailLinkRequestMutation,
    emailLinkVerifyMutation,
    phoneLinkRequestMutation,
    phoneLinkVerifyMutation,
    unlinkMutation,
    methodsQuery.data?.methods,
    methodsQuery.isLoading,
    queryClient,
  ]);

  const availableProviders = [
    !linkedTypes.has('phone')
      ? {
          type: 'phone' as const,
          label: t('settings.authMethodPhone'),
          hint: t('settings.linkPhoneHint'),
          disabled: false,
          disabledBadge: null,
        }
      : null,
    !linkedTypes.has('email')
      ? {
          type: 'email' as const,
          label: t('settings.authMethodEmail'),
          hint: t('settings.linkEmailHint'),
          disabled: false,
          disabledBadge: null,
        }
      : null,
    !linkedTypes.has('google')
      ? {
          type: 'google' as const,
          label: t('settings.authMethodGoogle'),
          hint: hasGoogleAuthConfig()
            ? t('settings.linkGoogleHint')
            : t('settings.linkGoogleSetupHint'),
          disabled: !hasGoogleAuthConfig(),
          disabledBadge: !hasGoogleAuthConfig() ? t('auth.socialLoginSetup') : null,
        }
      : null,
    !linkedTypes.has('apple')
      ? {
          type: 'apple' as const,
          label: t('settings.authMethodApple'),
          hint:
            Platform.OS === 'ios' && appleAvailable
              ? t('settings.linkAppleHint')
              : t('settings.linkAppleUnavailableHint'),
          disabled: Platform.OS !== 'ios' || !appleAvailable,
          disabledBadge:
            Platform.OS !== 'ios' || !appleAvailable ? t('auth.socialLoginIosOnly') : null,
        }
      : null,
  ].filter(Boolean) as Array<{
    type: 'phone' | 'email' | 'google' | 'apple';
    label: string;
    hint: string;
    disabled: boolean;
    disabledBadge: string | null;
  }>;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredAvailableProviders = useMemo(() => {
    if (!normalizedSearchQuery) {
      return availableProviders;
    }

    return availableProviders.filter((provider) =>
      [provider.label, provider.hint, provider.disabledBadge ?? '']
        .some((value) => value.toLowerCase().includes(normalizedSearchQuery)),
    );
  }, [availableProviders, normalizedSearchQuery]);
  const filteredMethods = useMemo(() => {
    const methods = methodsQuery.data?.methods ?? [];

    if (!normalizedSearchQuery) {
      return methods;
    }

    return methods.filter((method) =>
      [
        getMethodLabel(t, method.type),
        method.identifier,
        maskIdentifier(method.type, method.identifier),
      ].some((value) => value.toLowerCase().includes(normalizedSearchQuery)),
    );
  }, [methodsQuery.data?.methods, normalizedSearchQuery, t]);

  const selectedCountry = COUNTRY_OPTIONS.find((option) => option.value === countryCode);
  const normalizedPhoneNumber = normalizePhoneNumberInput(phoneNumber);
  const subscriberNumber =
    selectedCountry?.stripLeadingZero && normalizedPhoneNumber.startsWith('0')
      ? normalizedPhoneNumber.slice(1)
      : normalizedPhoneNumber;
  const fullPhoneNumber = `${countryCode}${subscriberNumber}`;

  const handleUnlink = (method: AuthMethod) => {
    const label = `${getMethodLabel(t, method.type)} • ${maskIdentifier(method.type, method.identifier)}`;
    Alert.alert(
      t('settings.unlinkAccountTitle'),
      t('settings.unlinkAccountConfirm', { label }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.unlink'),
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkMutation.mutateAsync(method);
            } catch (error) {
              Alert.alert(
                t('common.error'),
                error instanceof Error ? error.message : t('settings.unlinkFailed'),
              );
            }
          },
        },
      ],
    );
  };

  const handleLinkGoogle = async () => {
    if (!hasGoogleAuthConfig()) {
      Alert.alert(t('auth.socialLoginUnavailableTitle'), t('auth.googleConfigMissing'));
      return;
    }

    if (!googleRequest) {
      Alert.alert(t('auth.socialLoginUnavailableTitle'), t('auth.googleUnavailable'));
      return;
    }

    setLinkingProvider('google');

    try {
      const result = await promptGoogleAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') {
        setLinkingProvider(null);
      }
    } catch (error) {
      setLinkingProvider(null);
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('settings.linkFailed'),
      );
    }
  };

  const handleRequestEmailLink = async () => {
    const normalizedEmail = emailInput.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert(t('common.error'), t('auth.enterEmail'));
      return;
    }

    setLinkingProvider('email');

    try {
      const result = await emailLinkRequestMutation.mutateAsync(normalizedEmail);
      setEmailLinkRequested(true);
      if (__DEV__ && result.token) {
        setEmailToken(result.token);
        Alert.alert(
          t('settings.linkEmailDevTokenTitle'),
          t('settings.linkEmailDevTokenBody', { token: result.token }),
        );
      } else {
        Alert.alert(t('settings.linkEmailSentTitle'), t('settings.linkEmailSentBody'));
      }
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('settings.linkFailed'),
      );
    } finally {
      setLinkingProvider(null);
    }
  };

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

  const handleRequestPhoneLink = async () => {
    if (!normalizedPhoneNumber) {
      Alert.alert(t('common.error'), t('auth.enterPhoneNumber'));
      return;
    }

    setLinkingProvider('phone');

    try {
      const result = await phoneLinkRequestMutation.mutateAsync(fullPhoneNumber);
      setPhoneLinkRequested(true);
      if (result.code) {
        setPhoneOtp(result.code);
        Alert.alert(t('settings.linkPhoneCodeTitle'), t('settings.linkPhoneCodeBody', { code: result.code }));
      } else {
        Alert.alert(t('settings.linkPhoneSentTitle'), t('settings.linkPhoneSentBody'));
      }
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('settings.linkFailed'),
      );
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleVerifyPhoneLink = async () => {
    if (phoneOtp.trim().length !== 6) {
      Alert.alert(t('common.error'), t('settings.linkPhoneCodeRequired'));
      return;
    }

    setLinkingProvider('phone');

    try {
      await phoneLinkVerifyMutation.mutateAsync({
        phone: fullPhoneNumber,
        code: phoneOtp.trim(),
      });
      setPhoneNumber('');
      setPhoneOtp('');
      setPhoneLinkRequested(false);
      Alert.alert(t('settings.linkSuccessTitle'), t('settings.linkPhoneSuccessBody'));
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('settings.linkFailed'),
      );
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleVerifyEmailLink = async () => {
    const token = emailToken.trim();
    if (!token) {
      Alert.alert(t('common.error'), t('settings.linkEmailTokenRequired'));
      return;
    }

    setLinkingProvider('email');

    try {
      await emailLinkVerifyMutation.mutateAsync(token);
      setEmailInput('');
      setEmailToken('');
      setEmailLinkRequested(false);
      Alert.alert(t('settings.linkSuccessTitle'), t('settings.linkEmailSuccessBody'));
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('settings.linkFailed'),
      );
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleLinkApple = async () => {
    if (Platform.OS !== 'ios' || !appleAvailable) {
      Alert.alert(t('auth.socialLoginUnavailableTitle'), t('auth.appleUnavailable'));
      return;
    }

    setLinkingProvider('apple');

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

      await linkMutation.mutateAsync({
        provider: 'apple',
        idToken: credential.identityToken,
        ...(fullName ? { name: fullName } : {}),
      });

      Alert.alert(t('settings.linkSuccessTitle'), t('settings.linkAppleSuccessBody'));
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ERR_REQUEST_CANCELED'
      ) {
        setLinkingProvider(null);
        return;
      }

      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('settings.linkFailed'),
      );
    } finally {
      setLinkingProvider(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <Text style={styles.hint}>{t('settings.linkedAccountsHint')}</Text>

        {methodsQuery.isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>{t('settings.linkedAccountsLoading')}</Text>
          </View>
        ) : methodsQuery.isError ? (
          <View style={styles.centerState}>
            <Text style={styles.stateText}>{t('common.errorOccurred')}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredMethods}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.section}>
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('settings.linkedAccountsSearchPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {filteredAvailableProviders.length > 0 ? (
                  <>
                    <Text style={styles.sectionTitle}>{t('settings.linkAccountTitle')}</Text>
                    {filteredAvailableProviders.map((provider) => {
                      const isBusy = linkingProvider === provider.type;
                      if (provider.type === 'phone') {
                        return (
                          <View key={provider.type} style={styles.linkCardStack}>
                            <View style={styles.linkCardHeader}>
                              <View style={styles.linkCardBody}>
                                <Text style={styles.methodLabel}>{provider.label}</Text>
                                <Text style={styles.linkHint}>{provider.hint}</Text>
                              </View>
                            </View>
                            <View style={styles.phoneRow}>
                              <TouchableOpacity
                                style={styles.countryCodeButton}
                                onPress={handleCountryCodePress}
                                disabled={isBusy || phoneLinkRequestMutation.isPending}
                              >
                                <Text style={styles.countryCodeText}>{countryCode}</Text>
                              </TouchableOpacity>
                              <TextInput
                                style={[styles.emailInput, styles.phoneInput]}
                                placeholder={t('auth.phonePlaceholder')}
                                placeholderTextColor={colors.textMuted}
                                keyboardType="phone-pad"
                                autoComplete="tel"
                                value={phoneNumber}
                                onChangeText={(value) => setPhoneNumber(normalizePhoneNumberInput(value))}
                                editable={!isBusy && !phoneLinkRequestMutation.isPending}
                              />
                            </View>
                            <TouchableOpacity
                              style={[styles.inlineButton, isBusy && styles.unlinkButtonDisabled]}
                              onPress={handleRequestPhoneLink}
                              disabled={isBusy || phoneLinkRequestMutation.isPending}
                            >
                              <Text style={styles.inlineButtonText}>
                                {t('settings.linkPhoneSendButton')}
                              </Text>
                            </TouchableOpacity>
                            {phoneLinkRequested ? (
                              <>
                                <TextInput
                                  style={styles.emailInput}
                                  placeholder={t('auth.verificationCode')}
                                  placeholderTextColor={colors.textMuted}
                                  keyboardType="number-pad"
                                  value={phoneOtp}
                                  onChangeText={(value) => setPhoneOtp(value.replace(/\D/g, '').slice(0, 6))}
                                  editable={!isBusy && !phoneLinkVerifyMutation.isPending}
                                />
                                <TouchableOpacity
                                  style={[styles.inlineButton, isBusy && styles.unlinkButtonDisabled]}
                                  onPress={handleVerifyPhoneLink}
                                  disabled={isBusy || phoneLinkVerifyMutation.isPending}
                                >
                                  <Text style={styles.inlineButtonText}>
                                    {t('settings.linkPhoneVerifyButton')}
                                  </Text>
                                </TouchableOpacity>
                              </>
                            ) : null}
                          </View>
                        );
                      }

                      if (provider.type === 'email') {
                        return (
                          <View key={provider.type} style={styles.linkCardStack}>
                            <View style={styles.linkCardHeader}>
                              <View style={styles.linkCardBody}>
                                <Text style={styles.methodLabel}>{provider.label}</Text>
                                <Text style={styles.linkHint}>{provider.hint}</Text>
                              </View>
                            </View>
                            <TextInput
                              style={styles.emailInput}
                              placeholder={t('auth.emailPlaceholder')}
                              placeholderTextColor={colors.textMuted}
                              keyboardType="email-address"
                              autoCapitalize="none"
                              autoCorrect={false}
                              autoComplete="email"
                              value={emailInput}
                              onChangeText={setEmailInput}
                              editable={!isBusy && !emailLinkRequestMutation.isPending}
                            />
                            <TouchableOpacity
                              style={[styles.inlineButton, isBusy && styles.unlinkButtonDisabled]}
                              onPress={handleRequestEmailLink}
                              disabled={isBusy || emailLinkRequestMutation.isPending}
                            >
                              <Text style={styles.inlineButtonText}>
                                {t('settings.linkEmailSendButton')}
                              </Text>
                            </TouchableOpacity>
                            {emailLinkRequested ? (
                              <>
                                <TextInput
                                  style={styles.emailInput}
                                  placeholder={t('settings.linkEmailTokenPlaceholder')}
                                  placeholderTextColor={colors.textMuted}
                                  autoCapitalize="none"
                                  autoCorrect={false}
                                  value={emailToken}
                                  onChangeText={setEmailToken}
                                  editable={!isBusy && !emailLinkVerifyMutation.isPending}
                                />
                                <TouchableOpacity
                                  style={[styles.inlineButton, isBusy && styles.unlinkButtonDisabled]}
                                  onPress={handleVerifyEmailLink}
                                  disabled={isBusy || emailLinkVerifyMutation.isPending}
                                >
                                  <Text style={styles.inlineButtonText}>
                                    {t('settings.linkEmailVerifyButton')}
                                  </Text>
                                </TouchableOpacity>
                              </>
                            ) : null}
                          </View>
                        );
                      }

                      return (
                        <TouchableOpacity
                          key={provider.type}
                          style={[
                            styles.linkCard,
                            provider.disabled && styles.linkCardDisabled,
                            isBusy && styles.unlinkButtonDisabled,
                          ]}
                          onPress={
                            provider.type === 'google' ? handleLinkGoogle : handleLinkApple
                          }
                          disabled={isBusy || linkMutation.isPending}
                        >
                          <View style={styles.linkCardBody}>
                            <Text style={styles.methodLabel}>{provider.label}</Text>
                            <Text style={styles.linkHint}>{provider.hint}</Text>
                          </View>
                          {isBusy ? (
                            <ActivityIndicator color={colors.primary} />
                          ) : provider.disabledBadge ? (
                            <View style={styles.linkBadge}>
                              <Text style={styles.linkBadgeText}>{provider.disabledBadge}</Text>
                            </View>
                          ) : (
                            <Text style={styles.linkAction}>{t('settings.link')}</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </>
                ) : !normalizedSearchQuery && availableProviders.length === 0 ? (
                  <View style={styles.allSetCard}>
                    <Text style={styles.methodLabel}>{t('settings.linkedAccountsAllSetTitle')}</Text>
                    <Text style={styles.linkHint}>{t('settings.linkedAccountsAllSetBody')}</Text>
                  </View>
                ) : null}
              </View>
            }
            ListHeaderComponentStyle={styles.listHeader}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Text style={styles.stateText}>
                  {normalizedSearchQuery
                    ? t('settings.linkedAccountsNoSearchResults')
                    : t('settings.linkedAccountsEmpty')}
                </Text>
                {normalizedSearchQuery ? (
                  <Text style={styles.helperText}>{t('settings.linkedAccountsNoSearchResultsBody')}</Text>
                ) : null}
              </View>
            }
            renderItem={({ item }) => {
              const methodCount = methodsQuery.data?.methods.length ?? 0;
              const canUnlink = methodCount > 1;
              const isBusy = unlinkMutation.isPending && unlinkMutation.variables?.id === item.id;
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.methodLabel}>{getMethodLabel(t, item.type)}</Text>
                    <Text style={styles.verifiedBadge}>{t('settings.authMethodVerified')}</Text>
                  </View>
                  <Text style={styles.identifier}>{maskIdentifier(item.type, item.identifier)}</Text>
                  {!canUnlink && (
                    <Text style={styles.helperText}>{t('settings.unlinkOnlyMethodHint')}</Text>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.unlinkButton,
                      (!canUnlink || isBusy) && styles.unlinkButtonDisabled,
                      !canUnlink && styles.unlinkButtonBlocked,
                    ]}
                    onPress={() => handleUnlink(item)}
                    disabled={!canUnlink || isBusy}
                  >
                    <Text
                      style={[
                        styles.unlinkButtonText,
                        !canUnlink && styles.unlinkButtonTextDisabled,
                      ]}
                    >
                      {t('settings.unlink')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: spacing.md,
  },
  stateText: {
    color: colors.textMuted,
    fontSize: fontSize.xl,
    textAlign: 'center',
  },
  listContent: {
    gap: spacing.md,
  },
  listHeader: {
    marginBottom: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.backgroundDark,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: fontSize.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  verifiedBadge: {
    color: colors.success,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  identifier: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    lineHeight: 18,
  },
  linkCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  linkCardStack: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  linkCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  allSetCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  countryCodeButton: {
    alignItems: 'center',
    backgroundColor: colors.backgroundDark,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minWidth: 72,
    paddingHorizontal: spacing.lg,
  },
  countryCodeText: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  linkCardDisabled: {
    opacity: 0.8,
  },
  linkCardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  emailInput: {
    backgroundColor: colors.backgroundDark,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: fontSize.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  phoneInput: {
    flex: 1,
  },
  inlineButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  inlineButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  linkHint: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 18,
  },
  linkAction: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  linkBadge: {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  linkBadgeText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  unlinkButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  unlinkButtonDisabled: {
    opacity: 0.6,
  },
  unlinkButtonBlocked: {
    borderColor: colors.border,
  },
  unlinkButtonText: {
    color: colors.error,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  unlinkButtonTextDisabled: {
    color: colors.textMuted,
  },
});
