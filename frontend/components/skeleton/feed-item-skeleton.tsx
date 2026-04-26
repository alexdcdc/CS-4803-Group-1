import { StyleSheet, View } from 'react-native';

import { Skeleton } from './skeleton';

interface FeedItemSkeletonProps {
  height: number;
}

export function FeedItemSkeleton({ height }: FeedItemSkeletonProps) {
  return (
    <View style={[styles.host, { height }]}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1c1c1e' }]} />
      <View style={styles.bottom}>
        <Skeleton width="35%" height={11} />
        <Skeleton width="80%" height={22} />
        <Skeleton width="50%" height={13} />
        <View style={styles.progressWrap}>
          <Skeleton height={4} radius={2} />
          <Skeleton width="40%" height={11} />
        </View>
        <View style={styles.actionRow}>
          <Skeleton width={120} height={40} radius={20} />
          <Skeleton width={120} height={40} radius={20} />
        </View>
      </View>
      <View style={styles.sideBar}>
        <Skeleton width={36} height={36} radius={18} />
        <Skeleton width={36} height={36} radius={18} />
        <Skeleton width={36} height={36} radius={18} />
        <Skeleton width={36} height={36} radius={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { justifyContent: 'flex-end', position: 'relative' },
  bottom: { padding: 16, paddingBottom: 20, paddingRight: 70, gap: 8 },
  progressWrap: { gap: 6, marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  sideBar: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    alignItems: 'center',
    gap: 20,
  },
});
