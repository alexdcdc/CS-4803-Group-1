import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export type ToastTone = 'info' | 'success' | 'error';

interface ToastEntry {
  id: number;
  text: string;
  tone: ToastTone;
}

interface ToastApi {
  show: (text: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_BG: Record<ToastTone, string> = {
  info: '#0a7ea4',
  success: '#22c55e',
  error: '#e11d48',
};

const DURATION_MS = 3500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const show = useCallback<ToastApi['show']>((text, tone = 'info') => {
    const id = ++idRef.current;
    setEntries((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => dismiss(id), DURATION_MS);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastHost entries={entries} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastHost({ entries, onDismiss }: { entries: ToastEntry[]; onDismiss: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  if (entries.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 24 }]}>
      {entries.map((entry) => (
        <ToastRow key={entry.id} entry={entry} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

function ToastRow({ entry, onDismiss }: { entry: ToastEntry; onDismiss: (id: number) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }], backgroundColor: TONE_BG[entry.tone] }]}>
      <Pressable style={styles.pressable} onPress={() => onDismiss(entry.id)}>
        <ThemedText style={styles.text} lightColor="#fff" darkColor="#fff">
          {entry.text}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
  },
  toast: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  pressable: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: { fontSize: 14, fontWeight: '600' },
});
