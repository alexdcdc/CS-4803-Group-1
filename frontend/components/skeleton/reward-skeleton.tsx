import { StyleSheet, View } from 'react-native';

import { Skeleton } from './skeleton';
import { SkeletonText } from './skeleton-text';

export function RewardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Skeleton width={18} height={18} radius={4} />
        <SkeletonText width="55%" />
      </View>
      <SkeletonText width="90%" size="small" />
      <SkeletonText width="35%" size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.15)',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
