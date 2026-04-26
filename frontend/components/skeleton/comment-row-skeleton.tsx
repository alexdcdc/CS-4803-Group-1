import { StyleSheet, View } from 'react-native';

import { Skeleton } from './skeleton';
import { SkeletonText } from './skeleton-text';

export function CommentRowSkeleton({ lineWidth = '85%' }: { lineWidth?: `${number}%` }) {
  return (
    <View style={styles.row}>
      <Skeleton width={32} height={32} radius={16} />
      <View style={styles.info}>
        <SkeletonText width="35%" size="small" />
        <SkeletonText width={lineWidth} size="small" />
      </View>
    </View>
  );
}

export function CommentListSkeleton({ count = 5 }: { count?: number }) {
  const widths: `${number}%`[] = ['90%', '70%', '85%', '60%', '75%'];
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <CommentRowSkeleton key={i} lineWidth={widths[i % widths.length]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  info: { flex: 1, gap: 6 },
});
