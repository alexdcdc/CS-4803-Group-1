import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

export function makeTempId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `local-${prefix}-${Date.now()}-${random}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith('local-');
}

/**
 * Read a JSON-serialized seed value out of expo-router params. expo-router
 * coerces params to string, so we stringify on push and parse on pull. Falls
 * back to undefined if the param is missing or unparseable.
 */
export function useSeededParam<T>(name: string): T | undefined {
  const params = useLocalSearchParams<Record<string, string>>();
  const raw = params[name];
  return useMemo<T | undefined>(() => {
    if (typeof raw !== 'string' || raw.length === 0) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }, [raw]);
}

export function encodeSeed<T>(value: T): string {
  return JSON.stringify(value);
}
