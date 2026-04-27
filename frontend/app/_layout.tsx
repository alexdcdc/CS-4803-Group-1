import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider, useApp } from '@/context/app-context';
import { ToastProvider } from '@/components/toast/toast-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

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

  let redirectTo: '/(auth)' | '/onboarding' | '/(tabs)' | null = null;
  if (!loading) {
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
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
      <ActivityIndicator style={splashStyles.spinner} />
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
    borderRadius: 48,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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

  return (
    <ToastProvider>
      <AppProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
        </ThemeProvider>
      </AppProvider>
    </ToastProvider>
  );
}
