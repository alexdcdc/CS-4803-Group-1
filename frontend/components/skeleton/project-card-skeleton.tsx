import { StyleSheet, View } from 'react-native';

import { Skeleton } from './skeleton';
import { SkeletonText } from './skeleton-text';

export function ProjectCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={80} height={80} radius={8} />
      <View style={styles.info}>
        <SkeletonText width="70%" />
        <SkeletonText width="40%" size="small" />
        <Skeleton height={4} radius={2} />
        <SkeletonText width="55%" size="small" />
      </View>
    </View>
  );
}

export function ProjectCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
});
