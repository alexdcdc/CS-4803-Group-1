import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useApp } from '@/context/app-context';
import { useSettings } from '@/context/settings-context';
import { useToast } from '@/components/toast/toast-context';
import { ThemedText } from '@/components/themed-text';
import { MockVideoPlayer } from '@/components/mock-video-player';
import { ProgressBar } from '@/components/progress-bar';
import { CreditBadge } from '@/components/credit-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PendingIndicator } from '@/components/pending-indicator';
import { CommentListSkeleton, FeedItemSkeleton } from '@/components/skeleton';
import { Brand, Fonts } from '@/constants/theme';
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
    donate,
  } = useApp();
  const {
    doubleTapEnabled,
    autoDonateAmount,
    hasSeenDoubleTapHint,
    markDoubleTapHintSeen,
  } = useSettings();
  const toast = useToast();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [activeCommentsVideoId, setActiveCommentsVideoId] = useState<string | null>(null);
  // Holds the last opened video id so the modal contents stay populated through
  // the fade-out animation after activeCommentsVideoId is cleared.
  const [displayedCommentsVideoId, setDisplayedCommentsVideoId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [containerHeight, setContainerHeight] = useState(0);
  const [feedItems, setFeedItems] = useState<FeedItem[] | null>(null);
  const [cycleCount, setCycleCount] = useState(1);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  type CycledItem = FeedItem & { cycleKey: string };

  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 80 });
  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: { item: CycledItem }[] }) => {
      const first = viewableItems[0];
      if (first) setActiveVideoId(first.item.video.id);
    },
  );

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
          ? prev.map((item) => {
              if (item.video.id !== videoId) return item;
              const wasDisliked = item.interaction.disliked;
              return {
                ...item,
                interaction: { liked: !currentlyLiked, disliked: false },
                likeCount: Math.max(0, item.likeCount + (currentlyLiked ? -1 : 1)),
                dislikeCount: Math.max(0, item.dislikeCount + (wasDisliked ? -1 : 0)),
              };
            })
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
          ? prev.map((item) => {
              if (item.video.id !== videoId) return item;
              const wasLiked = item.interaction.liked;
              return {
                ...item,
                interaction: { liked: false, disliked: !currentlyDisliked },
                dislikeCount: Math.max(0, item.dislikeCount + (currentlyDisliked ? -1 : 1)),
                likeCount: Math.max(0, item.likeCount + (wasLiked ? -1 : 0)),
              };
            })
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

  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  // Position of the most recent touch-down on the feed Pressable. Captured
  // from onPressIn (which fires on touch start with reliable coords) and read
  // back in onPress so the heart spawns where the finger actually landed
  // rather than at a stale/release position.
  const lastTouchPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Tracks projects already double-tapped this session so a second optimistic
  // tap can't fire before the server reconciles the new transaction.
  const donatedRef = useRef<Set<string>>(new Set());

  type FloatingHeart = { id: number; itemKey: string; x: number; y: number; anim: Animated.Value };
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const heartIdRef = useRef(0);

  const hasBackedProject = useCallback(
    (projectId: string, projectTitle: string) => {
      if (donatedRef.current.has(projectId)) return true;
      return (
        user?.transactions.some(
          (t) => t.type === 'donation' && t.label.includes(projectTitle),
        ) ?? false
      );
    },
    [user],
  );

  const spawnHeart = useCallback((itemKey: string, x: number, y: number) => {
    const id = ++heartIdRef.current;
    // Start the animation already partway through the pop-in so the heart is
    // visible at full opacity on the very first frame — Instagram-style
    // immediate feedback.
    const anim = new Animated.Value(0.05);
    setHearts((prev) => [...prev, { id, itemKey, x, y, anim }]);
    Animated.timing(anim, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    });
  }, []);

  const handleVideoTap = useCallback(
    (projectId: string, projectTitle: string, itemKey: string, x: number, y: number) => {
      if (!doubleTapEnabled) return;
      const now = Date.now();
      const last = lastTapRef.current;
      if (!last || last.id !== projectId || now - last.time >= 300) {
        lastTapRef.current = { id: projectId, time: now };
        return;
      }
      lastTapRef.current = null;

      if (hasBackedProject(projectId, projectTitle)) {
        // Already backed — open the donate sheet so they can see their prior
        // contribution and back again if they want.
        router.push({ pathname: '/donate', params: { projectId } });
        return;
      }
      if (!user) {
        toast.show('Sign in to donate', 'info');
        return;
      }
      if (user.creditBalance < autoDonateAmount) {
        toast.show('Insufficient credits', 'error');
        return;
      }

      // Immediate visual feedback — heart pops in at the tap point and floats
      // up. Fires synchronously before any state updates so the animation
      // starts on the same frame as the gesture.
      spawnHeart(itemKey, x, y);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      donatedRef.current.add(projectId);
      donate(projectId, autoDonateAmount).then((result) => {
        if (result.success) {
          // Confirmation toast lands once the server has acknowledged the
          // donation — the heart is the immediate response.
          toast.show(`Donated ${autoDonateAmount} credits to ${projectTitle}`, 'success');
        } else {
          donatedRef.current.delete(projectId);
        }
      });

      if (!hasSeenDoubleTapHint) {
        markDoubleTapHintSeen();
        Alert.alert(
          'Double-tap to donate',
          `You can double-tap any video to instantly donate ${autoDonateAmount} credits. You can change the amount or turn this off in Account settings.`,
          [{ text: 'Got it' }],
        );
      }
    },
    [
      autoDonateAmount,
      donate,
      doubleTapEnabled,
      hasBackedProject,
      hasSeenDoubleTapHint,
      markDoubleTapHintSeen,
      router,
      spawnHeart,
      toast,
      user,
    ],
  );

  const activeCommentsLoaded =
    displayedCommentsVideoId !== null && commentsByVideo[displayedCommentsVideoId] !== undefined;
  const activeComments = displayedCommentsVideoId
    ? commentsByVideo[displayedCommentsVideoId] ?? []
    : [];
  const activeCommentsPending = displayedCommentsVideoId
    ? (pending.comments[displayedCommentsVideoId]?.length ?? 0) > 0
    : false;
  const sendDisabled = !commentText.trim() || activeCommentsPending || !user;

  const renderItem = ({ item }: { item: CycledItem }) => {
    const { project, video, interaction } = item;
    const progress = project.goalCredits > 0 ? project.raisedCredits / project.goalCredits : 0;
    const itemHearts = hearts.filter((h) => h.itemKey === item.cycleKey);
    const alreadyBacked = hasBackedProject(project.id, project.title);

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
          active={isFocused && video.id === activeVideoId}
        />

        {doubleTapEnabled && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPressIn={(e) => {
              lastTouchPosRef.current = {
                x: e.nativeEvent.locationX,
                y: e.nativeEvent.locationY,
              };
            }}
            onPress={() => {
              const { x, y } = lastTouchPosRef.current;
              handleVideoTap(project.id, project.title, item.cycleKey, x, y);
            }}
          />
        )}

        {itemHearts.map((h) => (
          <Animated.View
            key={h.id}
            pointerEvents="none"
            style={[
              styles.floatingHeart,
              {
                left: h.x - 44,
                top: h.y - 44,
                opacity: h.anim.interpolate({
                  inputRange: [0, 0.65, 1],
                  outputRange: [1, 1, 0],
                }),
                transform: [
                  {
                    translateY: h.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -180],
                    }),
                  },
                  {
                    scale: h.anim.interpolate({
                      inputRange: [0, 0.15, 0.4, 1],
                      outputRange: [0.7, 1.25, 1, 1],
                    }),
                  },
                ],
              },
            ]}>
            <IconSymbol name="heart.fill" size={88} color={Brand.accent} />
          </Animated.View>
        ))}

        <View style={styles.bottomOverlay}>
          <ThemedText style={styles.videoTitle}>{video.title}</ThemedText>
          <ThemedText style={styles.projectTitle}>{project.title}</ThemedText>
          <ThemedText style={styles.creatorName}>by {project.creatorName}</ThemedText>

          <View style={styles.progressSection}>
            <ProgressBar progress={progress} height={5} fillColor={Brand.secondary} trackColor="rgba(255,255,255,0.18)" />
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
              color={interaction.liked ? Brand.secondary : '#fff'}
            />
            <ThemedText style={styles.sideLabel}>{item.likeCount}</ThemedText>
          </Pressable>

          <Pressable
            style={styles.sideButton}
            onPress={() => handleDislike(video.id, interaction.disliked)}>
            <IconSymbol
              name="hand.thumbsdown.fill"
              size={28}
              color={interaction.disliked ? Brand.error : '#fff'}
            />
            <ThemedText style={styles.sideLabel}>{item.dislikeCount}</ThemedText>
          </Pressable>

          <Pressable
            style={styles.sideButton}
            onPress={() =>
              router.push({ pathname: '/donate', params: { projectId: project.id } })
            }>
            <IconSymbol
              name={alreadyBacked ? 'heart.fill' : 'heart'}
              size={28}
              color={alreadyBacked ? Brand.accent : '#fff'}
            />
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
          data={cycledItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.cycleKey}
          showsVerticalScrollIndicator={false}
          pagingEnabled
          getItemLayout={(_, index) => ({
            length: containerHeight,
            offset: containerHeight * index,
            index,
          })}
          viewabilityConfig={viewabilityConfigRef.current}
          onViewableItemsChanged={onViewableItemsChangedRef.current}
          onEndReached={handleEndReached}
          onEndReachedThreshold={2}
          initialNumToRender={3}
          maxToRenderPerBatch={2}
          windowSize={5}
          removeClippedSubviews={false}
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
  videoTitle: { color: '#fff', fontSize: 13, opacity: 0.7, fontFamily: Fonts.sans },
  projectTitle: { color: '#fff', fontSize: 24, fontWeight: '700', fontFamily: Fonts.displayBold, letterSpacing: -0.4 },
  creatorName: { color: '#fff', fontSize: 14, opacity: 0.85, fontFamily: Fonts.sans },
  progressSection: { marginTop: 10, gap: 6 },
  progressText: { color: '#fff', fontSize: 12, opacity: 0.8, fontFamily: Fonts.sansMedium },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.accent,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    shadowColor: Brand.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  donateText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: Fonts.displayBold, letterSpacing: 0.2 },
  floatingHeart: {
    position: 'absolute',
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  detailText: { color: '#fff', fontWeight: '600', fontSize: 14, fontFamily: Fonts.sansMedium },
  sideBar: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
    gap: 12,
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
  commentsTitle: { color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: Fonts.displayBold, letterSpacing: -0.2 },
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Brand.primary,
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
