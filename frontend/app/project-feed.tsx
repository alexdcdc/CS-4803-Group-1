import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

import { useApp } from '@/context/app-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { VideoFeed } from '@/components/video-feed';
import { Project } from '@/data/types';
import * as api from '@/services/api-client';
import type { FeedItem } from '@/services/api-client';

function projectVideoToFeedItem(
  video: Project['videos'][number],
  project: Pick<Project, 'id' | 'title' | 'creatorName' | 'raisedCredits' | 'goalCredits' | 'backerCount'>,
): FeedItem {
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
}

export default function ProjectFeedScreen() {
  const { projectId, videoIndex } = useLocalSearchParams<{
    projectId: string;
    videoIndex?: string;
  }>();
  const router = useRouter();
  const { projects } = useApp();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const screenHeight = Dimensions.get('window').height;

  const fromContext = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const [project, setProject] = useState<Project | null>(fromContext ?? null);

  // Always refetch in the background so the feed renders the canonical project.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    api.getProject(projectId).then((p) => {
      if (!cancelled && p) setProject(p);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Items: project's own videos first, then one video from each other project as
  // a "similar projects" tail. Built once at mount so like/dislike state doesn't
  // reset if the underlying projects refresh.
  const initial = useMemo(() => {
    if (!project) return null;
    const projectItems = project.videos.map((video) =>
      projectVideoToFeedItem(video, project),
    );
    const similarItems = projects
      .filter((p) => p.id !== project.id && p.videos.length > 0)
      .map((p) => projectVideoToFeedItem(p.videos[0], p));
    return {
      items: [...projectItems, ...similarItems],
      projectVideoCount: projectItems.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const [items, setItems] = useState<FeedItem[]>([]);
  const [projectVideoCount, setProjectVideoCount] = useState(0);

  useEffect(() => {
    if (initial) {
      setItems(initial.items);
      setProjectVideoCount(initial.projectVideoCount);
    }
  }, [initial]);

  const updateItemState = useCallback(
    (videoId: string, updater: (item: FeedItem) => FeedItem) => {
      setItems((prev) => prev.map((item) => (item.video.id === videoId ? updater(item) : item)));
    },
    [],
  );

  const bannerForItem = useCallback(
    (_item: FeedItem, index: number) =>
      index >= projectVideoCount ? 'Showing similar projects' : undefined,
    [projectVideoCount],
  );

  const initialIndex = (() => {
    const parsed = videoIndex ? parseInt(videoIndex, 10) : 0;
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  })();

  return (
    <View style={styles.container}>
      {items.length > 0 && (
        <VideoFeed
          items={items}
          active={isFocused}
          containerHeight={screenHeight}
          initialIndex={initialIndex}
          bannerForItem={bannerForItem}
          updateItemState={updateItemState}
        />
      )}
      <Pressable
        style={[styles.closeButton, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        hitSlop={12}>
        <IconSymbol name="xmark" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
});
