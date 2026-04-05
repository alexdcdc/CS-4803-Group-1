import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider, useApp } from '@/context/app-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const { user, loading } = useApp();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user) {
      // Not logged in — go to auth screens
      if (!inAuth) {
        router.replace('/(auth)');
      }
    } else if (!user.hasCompletedOnboarding) {
      // Logged in but hasn't picked a role yet
      if (!inOnboarding) {
        router.replace('/onboarding');
      }
    } else {
      // Fully authenticated and onboarded
      if (inAuth || inOnboarding) {
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, segments, router]);

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
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootNavigator />
      </ThemeProvider>
    </AppProvider>
  );
}
