import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/progress-bar';
import { CreditBadge } from '@/components/credit-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getFeed, recordInteraction, FeedItem } from '@/services/api-client';

const MOCK_COMMENTS = [
  { id: '1', user: 'Alex M.', text: 'This project is amazing! Can\'t wait to see the final result.' },
  { id: '2', user: 'Jordan K.', text: 'Just backed this. Everyone should check it out!' },
  { id: '3', user: 'Sam L.', text: 'The rewards are so worth it.' },
  { id: '4', user: 'Riley P.', text: 'How long until the campaign ends?' },
  { id: '5', user: 'Casey T.', text: 'Shared this with all my friends!' },
];

export default function FeedScreen() {
  const { projects, user } = useApp();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const [commentsVisible, setCommentsVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [containerHeight, setContainerHeight] = useState(0);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  // Load feed from API when user is available
  useEffect(() => {
    if (!user) {
      // Fall back to local project data when not authenticated
      const items = projects.flatMap((project) =>
        project.videos.map((video) => ({
          video: { ...video, videoUrl: null },
          project: {
            id: project.id,
            title: project.title,
            creatorName: project.creatorName,
            raisedCredits: project.raisedCredits,
            goalCredits: project.goalCredits,
            backerCount: project.backerCount,
          },
          interaction: { liked: false, disliked: false },
        })),
      );
      setFeedItems(items);
      return;
    }
    getFeed(20, 0)
      .then(setFeedItems)
      .catch(() => {
        // Fallback to projects-based feed
        const items = projects.flatMap((project) =>
          project.videos.map((video) => ({
            video: { ...video, videoUrl: null },
            project: {
              id: project.id,
              title: project.title,
              creatorName: project.creatorName,
              raisedCredits: project.raisedCredits,
              goalCredits: project.goalCredits,
              backerCount: project.backerCount,
            },
            interaction: { liked: false, disliked: false },
          })),
        );
        setFeedItems(items);
      });
  }, [user, projects]);

  const handleLike = useCallback(
    async (videoId: string, currentlyLiked: boolean) => {
      await recordInteraction(videoId, 'like');
      setFeedItems((prev) =>
        prev.map((item) =>
          item.video.id === videoId
            ? {
                ...item,
                interaction: {
                  liked: !currentlyLiked,
                  disliked: false,
                },
              }
            : item,
        ),
      );
    },
    [],
  );

  const handleDislike = useCallback(
    async (videoId: string, currentlyDisliked: boolean) => {
      await recordInteraction(videoId, 'dislike');
      setFeedItems((prev) =>
        prev.map((item) =>
          item.video.id === videoId
            ? {
                ...item,
                interaction: {
                  liked: false,
                  disliked: !currentlyDisliked,
                },
              }
            : item,
        ),
      );
    },
    [],
  );

  const handleAddComment = useCallback(() => {
    if (!commentText.trim()) return;
    setComments((prev) => [
      { id: String(Date.now()), user: 'You', text: commentText.trim() },
      ...prev,
    ]);
    setCommentText('');
  }, [commentText]);

  const renderItem = ({ item }: { item: FeedItem }) => {
    const { project, video, interaction } = item;
    const progress = project.goalCredits > 0 ? project.raisedCredits / project.goalCredits : 0;

    return (
      <View style={[styles.feedItem, { height: containerHeight }]}>
        {/* Video placeholder */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: video.placeholderColor }]}>
          <View style={styles.playIcon}>
            <IconSymbol name="play.fill" size={48} color="rgba(255,255,255,0.5)" />
          </View>
        </View>

        {/* Bottom overlay */}
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

        {/* Right side action bar */}
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
            onPress={() => setCommentsVisible(true)}>
            <IconSymbol name="bubble.right.fill" size={28} color="#fff" />
            <ThemedText style={styles.sideLabel}>{comments.length}</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      {/* Fixed credit balance overlay */}
      {user && (
        <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="none">
          <CreditBadge amount={user.creditBalance} />
        </View>
      )}

      {containerHeight > 0 && (
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
        />
      )}

      {/* Comments bottom sheet */}
      <Modal
        visible={commentsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentsVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCommentsVisible(false)} />
        <View style={[styles.commentsSheet, { paddingBottom: insets.bottom || 16 }]}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.commentsHeader}>
            <ThemedText style={styles.commentsTitle}>
              Comments ({comments.length})
            </ThemedText>
            <Pressable onPress={() => setCommentsVisible(false)}>
              <IconSymbol name="xmark" size={22} color="#888" />
            </Pressable>
          </View>

          {/* Comment list */}
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            style={styles.commentsList}
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                  <ThemedText style={styles.commentAvatarText}>
                    {item.user.charAt(0)}
                  </ThemedText>
                </View>
                <View style={styles.commentContent}>
                  <ThemedText style={styles.commentUser}>{item.user}</ThemedText>
                  <ThemedText style={styles.commentText}>{item.text}</ThemedText>
                </View>
              </View>
            )}
          />

          {/* Input */}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#999"
              value={commentText}
              onChangeText={setCommentText}
              onSubmitEditing={handleAddComment}
              returnKeyType="send"
            />
            <Pressable
              style={[styles.sendButton, !commentText.trim() && { opacity: 0.4 }]}
              onPress={handleAddComment}
              disabled={!commentText.trim()}>
              <IconSymbol name="paperplane.fill" size={20} color="#fff" />
            </Pressable>
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

  // Comments bottom sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  commentsSheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
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
  commentsList: { marginVertical: 8 },
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
});
