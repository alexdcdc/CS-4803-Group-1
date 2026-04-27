import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'quickstarter.donateSettings.v1';

export interface DonateSettings {
  doubleTapEnabled: boolean;
  autoDonateAmount: number;
  hasSeenDoubleTapHint: boolean;
}

const DEFAULTS: DonateSettings = {
  doubleTapEnabled: true,
  autoDonateAmount: 10,
  hasSeenDoubleTapHint: false,
};

interface SettingsContextValue extends DonateSettings {
  hydrated: boolean;
  setDoubleTapEnabled: (enabled: boolean) => void;
  setAutoDonateAmount: (amount: number) => void;
  markDoubleTapHintSeen: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

async function readStored(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(STORAGE_KEY);
}

async function writeStored(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, value);
    } catch {
      // ignore quota / private mode
    }
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, value);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DonateSettings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readStored()
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<DonateSettings>;
            setSettings({ ...DEFAULTS, ...parsed });
          } catch {
            // corrupt — fall back to defaults
          }
        }
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: DonateSettings) => {
    setSettings(next);
    writeStored(JSON.stringify(next)).catch(() => {
      // best-effort persistence; in-memory state is still updated
    });
  }, []);

  const setDoubleTapEnabled = useCallback(
    (enabled: boolean) => persist({ ...settings, doubleTapEnabled: enabled }),
    [persist, settings],
  );

  const setAutoDonateAmount = useCallback(
    (amount: number) => {
      const clean = Number.isFinite(amount) ? Math.max(1, Math.round(amount)) : DEFAULTS.autoDonateAmount;
      persist({ ...settings, autoDonateAmount: clean });
    },
    [persist, settings],
  );

  const markDoubleTapHintSeen = useCallback(() => {
    if (settings.hasSeenDoubleTapHint) return;
    persist({ ...settings, hasSeenDoubleTapHint: true });
  }, [persist, settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      hydrated,
      setDoubleTapEnabled,
      setAutoDonateAmount,
      markDoubleTapHintSeen,
    }),
    [settings, hydrated, setDoubleTapEnabled, setAutoDonateAmount, markDoubleTapHintSeen],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
