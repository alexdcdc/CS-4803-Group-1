import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  useFonts as useDMSans,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider, useApp } from '@/context/app-context';
import { SettingsProvider } from '@/context/settings-context';
import { ToastProvider } from '@/components/toast/toast-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Colors, Fonts } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const { user, loading } = useApp();
  const router = useRouter();
  const segments = useSegments();

  const currentGroup = segments[0];
  const inAuth = currentGroup === '(auth)';
  const inOnboarding = currentGroup === 'onboarding';
  // /auth/callback handles its own routing after exchanging the recovery / verification code.
  const inAuthCallback = currentGroup === 'auth';
  // /reset-password runs immediately after a recovery code exchange and may
  // briefly observe user=null while the /users/me fetch is in flight. The
  // Supabase session is already valid here, so the screen can stay even when
  // the profile hasn't hydrated yet.
  const inResetPassword = currentGroup === 'reset-password';

  let redirectTo: '/(auth)' | '/onboarding' | '/(tabs)' | null = null;
  if (!loading && !inAuthCallback && !inResetPassword) {
    if (!user && !inAuth) redirectTo = '/(auth)';
    else if (user && !user.hasCompletedOnboarding && !inOnboarding) redirectTo = '/onboarding';
    else if (user && user.hasCompletedOnboarding && (inAuth || inOnboarding))
      redirectTo = '/(tabs)';
  }

  const settling = loading || redirectTo !== null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  return (
    <>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: Fonts.displayBold },
        }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ title: 'Account', presentation: 'modal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="donate" options={{ presentation: 'modal', title: 'Donate' }} />
        <Stack.Screen name="recharge" options={{ presentation: 'modal', title: 'Recharge Credits' }} />
        <Stack.Screen name="create-campaign" options={{ presentation: 'modal', title: 'New Campaign' }} />
        <Stack.Screen name="upload-content" options={{ presentation: 'modal', title: 'Upload Content' }} />
        <Stack.Screen name="add-reward" options={{ presentation: 'modal', title: 'Add Reward' }} />
        <Stack.Screen name="project/[id]" options={{ title: 'Project' }} />
        <Stack.Screen
          name="project-feed"
          options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen name="campaign/[id]" options={{ title: 'Campaign' }} />
      </Stack>
      {settling ? <AuthSplash /> : null}
      <StatusBar style="auto" />
    </>
  );
}

function AuthSplash() {
  return (
    <ThemedView style={splashStyles.overlay}>
      <View style={splashStyles.logoCircle}>
        <IconSymbol name="play.fill" size={48} color="#fff" />
      </View>
      <ThemedText type="title" style={splashStyles.appName}>
        QuickStarter
      </ThemedText>
      <ActivityIndicator style={splashStyles.spinner} color={Brand.primary} />
    </ThemedView>
  );
}

const splashStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: Brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  appName: {
    textAlign: 'center',
    marginBottom: 24,
  },
  spinner: {
    marginTop: 8,
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [grotesk] = useSpaceGrotesk({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  const [dmSans] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const navTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const palette = Colors[colorScheme ?? 'light'];
  const themedNavTheme = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      primary: Brand.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
    },
  };

  if (!grotesk || !dmSans) {
    return null;
  }

  return (
    <ToastProvider>
      <AppProvider>
        <SettingsProvider>
          <ThemeProvider value={themedNavTheme}>
            <RootNavigator />
          </ThemeProvider>
        </SettingsProvider>
      </AppProvider>
    </ToastProvider>
  );
}
