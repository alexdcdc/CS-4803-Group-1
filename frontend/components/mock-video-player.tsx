import { StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';

interface MockVideoPlayerProps {
  color: string;
  /** If true, renders at full screen height */
  fullScreen?: boolean;
  height?: number;
}

export function MockVideoPlayer({ color, fullScreen, height = 200 }: MockVideoPlayerProps) {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: color },
        fullScreen ? StyleSheet.absoluteFillObject : { height },
      ]}>
      <View style={styles.playButton}>
        <IconSymbol name="play.fill" size={40} color="rgba(255,255,255,0.6)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
