import { StyleSheet, View } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0–1
  height?: number;
  trackColor?: string;
  fillColor?: string;
}

export function ProgressBar({
  progress,
  height = 6,
  trackColor = 'rgba(255,255,255,0.2)',
  fillColor = '#22c55e',
}: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: fillColor, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
