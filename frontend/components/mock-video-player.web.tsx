import Hls from 'hls.js';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { VideoStatus } from '@/data/types';

interface MockVideoPlayerProps {
  color: string;
  fullScreen?: boolean;
  height?: number;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  status?: VideoStatus;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  active?: boolean;
}

// JSX types in the RN project don't declare intrinsic DOM elements.
// These only render on web where the DOM exists.
const Video = 'video' as unknown as React.ComponentType<any>;
const Img = 'img' as unknown as React.ComponentType<any>;

export function MockVideoPlayer({
  color,
  fullScreen,
  height = 200,
  videoUrl,
  thumbnailUrl,
  status,
  controls = true,
  loop = false,
  muted = false,
  active = true,
}: MockVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoUrl) return;

    // Safari (and most iOS browsers) play HLS natively.
    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = videoUrl;
      return;
    }
    if (!Hls.isSupported()) return;

    const hls = new Hls();
    hls.loadSource(videoUrl);
    hls.attachMedia(el);
    return () => hls.destroy();
  }, [videoUrl]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoUrl) return;
    if (active) {
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      el.pause();
    }
  }, [active, videoUrl]);

  const containerStyle = [
    styles.container,
    { backgroundColor: color },
    fullScreen ? StyleSheet.absoluteFillObject : { height },
  ];

  if (videoUrl) {
    return (
      <View style={containerStyle}>
        <Video
          ref={videoRef}
          controls={controls || undefined}
          loop={loop || undefined}
          muted={muted || undefined}
          autoPlay={active || undefined}
          playsInline
          poster={thumbnailUrl ?? undefined}
          style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {thumbnailUrl && (
        <Img
          src={thumbnailUrl}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
      <View style={styles.overlay}>
        <View style={styles.playButton}>
          <IconSymbol name="play.fill" size={40} color="rgba(255,255,255,0.6)" />
        </View>
        {status && status !== 'ready' && <View style={styles.statusDot} />}
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
  statusDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
  },
});
