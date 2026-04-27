import { StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/context/app-context';
import { CreditBadge } from '@/components/credit-badge';
import { FeedItemSkeleton } from '@/components/skeleton';
import { VideoFeed } from '@/components/video-feed';
import { getFeed, FeedItem } from '@/services/api-client';

export default function FeedScreen() {
  const { projects, user, setCommentCount } = useApp();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [containerHeight, setContainerHeight] = useState(0);
  const [feedItems, setFeedItems] = useState<FeedItem[] | null>(null);
  const [cycleCount, setCycleCount] = useState(1);

  type CycledItem = FeedItem & { cycleKey: string };

  // Fallback feed derived from local projects — used while authenticated feed
  // hasn't loaded yet, or for unauthenticated browsing. One video per project.
  const fallbackFeed = useMemo<FeedItem[]>(() => {
    return projects
      .filter((project) => project.videos.length > 0)
      .map((project) => {
        const video = project.videos[0];
        return {
          video: { ...video, videoUrl: video.videoUrl ?? null },
          project: {
            id: project.id,
            title: project.title,
            creatorName: project.creatorName,
            raisedCredits: project.raisedCredits,
            goalCredits: project.goalCredits,
            backerCount: project.backerCount,
          },
          interaction: { liked: false, disliked: false },
          commentCount: 0,
          likeCount: 0,
          dislikeCount: 0,
        };
      });
  }, [projects]);

  // Repeat feedItems `cycleCount` times so the feed loops as the user scrolls.
  const cycledItems = useMemo<CycledItem[]>(() => {
    if (!feedItems || feedItems.length === 0) return [];
    const out: CycledItem[] = [];
    for (let cycle = 0; cycle < cycleCount; cycle++) {
      for (const item of feedItems) {
        out.push({ ...item, cycleKey: `${item.video.id}-${cycle}` });
      }
    }
    return out;
  }, [feedItems, cycleCount]);

  const handleEndReached = useCallback(() => {
    if (feedItems && feedItems.length > 0) {
      setCycleCount((c) => c + 1);
    }
  }, [feedItems]);

  useEffect(() => {
    if (!user) {
      setFeedItems(fallbackFeed);
      return;
    }
    let cancelled = false;
    getFeed(20, 0)
      .then((items) => {
        if (!cancelled) setFeedItems(items);
      })
      .catch(() => {
        if (!cancelled) setFeedItems(fallbackFeed);
      });
    return () => {
      cancelled = true;
    };
  }, [user, fallbackFeed]);

  // Seed per-video comment counts from the feed payload so the side-bar number
  // is accurate before the user opens the modal.
  useEffect(() => {
    if (!feedItems) return;
    feedItems.forEach((item) => setCommentCount(item.video.id, item.commentCount));
  }, [feedItems, setCommentCount]);

  const updateItemState = useCallback(
    (videoId: string, updater: (item: FeedItem) => FeedItem) => {
      setFeedItems((prev) =>
        prev ? prev.map((item) => (item.video.id === videoId ? updater(item) : item)) : prev,
      );
    },
    [],
  );

  const showSkeleton = containerHeight > 0 && feedItems === null;

  return (
    <View
      style={styles.container}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      {user && (
        <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="none">
          <CreditBadge amount={user.creditBalance} />
        </View>
      )}

      {showSkeleton && <FeedItemSkeleton height={containerHeight} />}

      {containerHeight > 0 && feedItems !== null && (
        <VideoFeed
          items={cycledItems}
          active={isFocused}
          containerHeight={containerHeight}
          onEndReached={handleEndReached}
          keyForItem={(item) => (item as CycledItem).cycleKey}
          updateItemState={updateItemState}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
