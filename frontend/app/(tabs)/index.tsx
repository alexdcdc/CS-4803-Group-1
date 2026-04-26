import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { MockVideoPlayer } from '@/components/mock-video-player';
import { ProgressBar } from '@/components/progress-bar';
import { CreditBadge } from '@/components/credit-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PendingIndicator } from '@/components/pending-indicator';
import { CommentListSkeleton, FeedItemSkeleton } from '@/components/skeleton';
import { getFeed, FeedItem } from '@/services/api-client';

export default function FeedScreen() {
  const {
    projects,
    user,
    recordInteraction,
    commentsByVideo,
    commentCounts,
    pending,
    loadVideoComments,
    addVideoComment,
    deleteVideoComment,
    setCommentCount,
  } = useApp();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const [activeCommentsVideoId, setActiveCommentsVideoId] = useState<string | null>(null);
  // Holds the last opened video id so the modal contents stay populated through
  // the fade-out animation after activeCommentsVideoId is cleared.
  const [displayedCommentsVideoId, setDisplayedCommentsVideoId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [containerHeight, setContainerHeight] = useState(0);
  const [feedItems, setFeedItems] = useState<FeedItem[] | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 80 });
  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: { item: FeedItem }[] }) => {
      const first = viewableItems[0];
      if (first) setActiveVideoId(first.item.video.id);
    },
  );

  // Fallback feed derived from local projects — used while authenticated feed
  // hasn't loaded yet, or for unauthenticated browsing.
  const fallbackFeed = useMemo<FeedItem[]>(() => {
    return projects.flatMap((project) =>
      project.videos.map((video) => ({
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
      })),
    );
  }, [projects]);

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

  useEffect(() => {
    if (activeVideoId !== null) return;
    if (feedItems && feedItems.length > 0) {
      setActiveVideoId(feedItems[0].video.id);
    }
  }, [feedItems, activeVideoId]);

  // Seed per-video comment counts from the feed payload so the side-bar number
  // is accurate before the user opens the modal.
  useEffect(() => {
    if (!feedItems) return;
    feedItems.forEach((item) => setCommentCount(item.video.id, item.commentCount));
  }, [feedItems, setCommentCount]);

  // Load real comments when the modal is opened for a video, and pin the
  // displayed id so contents survive the close animation.
  useEffect(() => {
    if (activeCommentsVideoId) {
      setDisplayedCommentsVideoId(activeCommentsVideoId);
      loadVideoComments(activeCommentsVideoId);
    }
  }, [activeCommentsVideoId, loadVideoComments]);

  const handleLike = useCallback(
    (videoId: string, currentlyLiked: boolean) => {
      // Optimistic local update; record interaction in background.
      setFeedItems((prev) =>
        prev
          ? prev.map((item) =>
              item.video.id === videoId
                ? {
                    ...item,
                    interaction: { liked: !currentlyLiked, disliked: false },
                  }
                : item,
            )
          : prev,
      );
      recordInteraction(videoId, 'like');
    },
    [recordInteraction],
  );

  const handleDislike = useCallback(
    (videoId: string, currentlyDisliked: boolean) => {
      setFeedItems((prev) =>
        prev
          ? prev.map((item) =>
              item.video.id === videoId
                ? {
                    ...item,
                    interaction: { liked: false, disliked: !currentlyDisliked },
                  }
                : item,
            )
          : prev,
      );
      recordInteraction(videoId, 'dislike');
    },
    [recordInteraction],
  );

  const handleAddComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text || !displayedCommentsVideoId) return;
    const result = await addVideoComment(displayedCommentsVideoId, text);
    if (result) setCommentText('');
  }, [commentText, displayedCommentsVideoId, addVideoComment]);

  const activeCommentsLoaded =
    displayedCommentsVideoId !== null && commentsByVideo[displayedCommentsVideoId] !== undefined;
  const activeComments = displayedCommentsVideoId
    ? commentsByVideo[displayedCommentsVideoId] ?? []
    : [];
  const activeCommentsPending = displayedCommentsVideoId
    ? (pending.comments[displayedCommentsVideoId]?.length ?? 0) > 0
    : false;
  const sendDisabled = !commentText.trim() || activeCommentsPending || !user;

  const renderItem = ({ item }: { item: FeedItem }) => {
    const { project, video, interaction } = item;
    const progress = project.goalCredits > 0 ? project.raisedCredits / project.goalCredits : 0;

    return (
      <View style={[styles.feedItem, { height: containerHeight }]}>
        <MockVideoPlayer
          color={video.placeholderColor}
          videoUrl={video.videoUrl}
          thumbnailUrl={video.thumbnailUrl}
          status={video.status}
          fullScreen
          controls={false}
          loop
          active={video.id === activeVideoId}
        />

        <View style={styles.bottomOverlay}>
          <ThemedText style={styles.videoTitle}>{video.title}</ThemedText>
          <ThemedText style={styles.projectTitle}>{project.title}</ThemedText>
          <ThemedText style={styles.creatorName}>by {project.creatorName}</ThemedText>

          <View style={styles.progressSection}>
            <ProgressBar progress={progress} height={4} />
            <ThemedText style={styles.progressText}>
              {project.raisedCredits.toLocaleString()} / {project.goalCredits.toLocaleString()} credits
            </ThemedText>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={styles.donateButton}
              onPress={() =>
                router.push({ pathname: '/donate', params: { projectId: project.id } })
              }>
              <IconSymbol name="heart.fill" size={18} color="#fff" />
              <ThemedText style={styles.donateText}>Donate</ThemedText>
            </Pressable>

            <Pressable
              style={styles.detailButton}
              onPress={() =>
                router.push({ pathname: '/project/[id]', params: { id: project.id } })
              }>
              <ThemedText style={styles.detailText}>View Details</ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.sideBar}>
          <Pressable
            style={styles.sideButton}
            onPress={() => handleLike(video.id, interaction.liked)}>
            <IconSymbol
              name="hand.thumbsup.fill"
              size={28}
              color={interaction.liked ? '#22c55e' : '#fff'}
            />
            <ThemedText style={styles.sideLabel}>Like</ThemedText>
          </Pressable>

          <Pressable
            style={styles.sideButton}
            onPress={() => handleDislike(video.id, interaction.disliked)}>
            <IconSymbol
              name="hand.thumbsdown.fill"
              size={28}
              color={interaction.disliked ? '#ef4444' : '#fff'}
            />
            <ThemedText style={styles.sideLabel}>Dislike</ThemedText>
          </Pressable>

          <Pressable
            style={styles.sideButton}
            onPress={() =>
              router.push({ pathname: '/donate', params: { projectId: project.id } })
            }>
            <IconSymbol name="heart.fill" size={28} color="#fff" />
            <ThemedText style={styles.sideLabel}>{project.backerCount}</ThemedText>
          </Pressable>

          <Pressable
            style={styles.sideButton}
            onPress={() => setActiveCommentsVideoId(video.id)}>
            <IconSymbol name="bubble.right.fill" size={28} color="#fff" />
            <ThemedText style={styles.sideLabel}>
              {commentCounts[video.id] ?? item.commentCount ?? 0}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

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
        <FlatList
          ref={flatListRef}
          data={feedItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.video.id}
          showsVerticalScrollIndicator={false}
          pagingEnabled
          getItemLayout={(_, index) => ({
            length: containerHeight,
            offset: containerHeight * index,
            index,
          })}
          viewabilityConfig={viewabilityConfigRef.current}
          onViewableItemsChanged={onViewableItemsChangedRef.current}
        />
      )}

      <Modal
        visible={activeCommentsVideoId !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setActiveCommentsVideoId(null)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setActiveCommentsVideoId(null)}
          />
          <View style={[styles.commentsSheet, { paddingBottom: insets.bottom || 16 }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.commentsHeader}>
            <ThemedText style={styles.commentsTitle}>
              {activeCommentsLoaded ? `Comments (${activeComments.length})` : 'Comments'}
            </ThemedText>
            <Pressable onPress={() => setActiveCommentsVideoId(null)}>
              <IconSymbol name="xmark" size={22} color="#888" />
            </Pressable>
          </View>

          {!activeCommentsLoaded ? (
            <View style={styles.commentsList}>
              <CommentListSkeleton count={6} />
            </View>
          ) : (
          <FlatList
            data={activeComments}
            keyExtractor={(c) => c.id}
            style={styles.commentsList}
            ListEmptyComponent={
              <ThemedText style={styles.emptyComments}>Be the first to comment.</ThemedText>
            }
            renderItem={({ item: comment }) => {
              const isOwn = !!user && comment.userId === user.id;
              return (
                <View style={styles.commentRow}>
                  <View style={styles.commentAvatar}>
                    <ThemedText style={styles.commentAvatarText}>
                      {comment.userName.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={styles.commentContent}>
                    <ThemedText style={styles.commentUser}>{comment.userName}</ThemedText>
                    <ThemedText style={styles.commentText}>{comment.text}</ThemedText>
                  </View>
                  {isOwn && displayedCommentsVideoId && (
                    <Pressable
                      hitSlop={8}
                      onPress={() => deleteVideoComment(displayedCommentsVideoId, comment.id)}
                      style={styles.commentDeleteButton}>
                      <IconSymbol name="trash.fill" size={16} color="rgba(255,255,255,0.5)" />
                    </Pressable>
                  )}
                </View>
              );
            }}
          />
          )}

          {user ? (
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#999"
                value={commentText}
                onChangeText={setCommentText}
                onSubmitEditing={handleAddComment}
                returnKeyType="send"
                editable={!activeCommentsPending}
                maxLength={500}
              />
              <Pressable
                style={[styles.sendButton, sendDisabled && { opacity: 0.4 }]}
                onPress={handleAddComment}
                disabled={sendDisabled}>
                {activeCommentsPending ? (
                  <PendingIndicator size={14} color="#fff" style={styles.sendPending} />
                ) : (
                  <IconSymbol name="paperplane.fill" size={20} color="#fff" />
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.commentInputRow}>
              <ThemedText style={styles.signInHint}>Sign in to comment.</ThemedText>
            </View>
          )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  feedItem: {
    justifyContent: 'flex-end',
    position: 'relative',
  },
  playIcon: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bottomOverlay: {
    padding: 16,
    paddingBottom: 20,
    paddingRight: 70,
    gap: 4,
  },
  videoTitle: { color: '#fff', fontSize: 13, opacity: 0.7 },
  projectTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  creatorName: { color: '#fff', fontSize: 14, opacity: 0.8 },
  progressSection: { marginTop: 8, gap: 4 },
  progressText: { color: '#fff', fontSize: 12, opacity: 0.7 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e11d48',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  donateText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  detailButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  detailText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sideBar: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
    gap: 20,
  },
  sideButton: { alignItems: 'center', gap: 2 },
  sideLabel: { color: '#fff', fontSize: 12 },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  commentsSheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '60%',
    paddingHorizontal: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  commentsTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  commentsList: { flex: 1, marginVertical: 8 },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  commentContent: { flex: 1, gap: 2 },
  commentUser: { color: '#fff', fontWeight: '600', fontSize: 13 },
  commentText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20 },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendPending: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  commentDeleteButton: {
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  emptyComments: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  signInHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
    paddingVertical: 10,
  },
});
