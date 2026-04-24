import { useVideoPlayer, VideoView } from 'expo-video';
import { Image, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { VideoStatus } from '@/data/types';

interface MockVideoPlayerProps {
  /** Fallback background color while no Mux asset is available yet */
  color: string;
  /** If true, renders at full screen height */
  fullScreen?: boolean;
  height?: number;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  status?: VideoStatus;
}

export function MockVideoPlayer({
  color,
  fullScreen,
  height = 200,
  videoUrl,
  thumbnailUrl,
  status,
}: MockVideoPlayerProps) {
  const player = useVideoPlayer(videoUrl ?? null, (p) => {
    p.loop = false;
  });

  const containerStyle = [
    styles.container,
    { backgroundColor: color },
    fullScreen ? StyleSheet.absoluteFillObject : { height },
  ];

  if (videoUrl) {
    return (
      <View style={containerStyle}>
        <VideoView
          style={StyleSheet.absoluteFillObject}
          player={player}
          allowsFullscreen
          nativeControls
          contentFit="cover"
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={StyleSheet.absoluteFillObject} />
      ) : null}
      <View style={styles.overlay}>
        <View style={styles.playButton}>
          <IconSymbol name="play.fill" size={40} color="rgba(255,255,255,0.6)" />
        </View>
        {status && status !== 'ready' && (
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
  },
});
