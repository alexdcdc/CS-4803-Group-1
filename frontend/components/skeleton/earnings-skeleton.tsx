import { StyleSheet, View } from 'react-native';

import { Skeleton } from './skeleton';
import { SkeletonText } from './skeleton-text';

export function EarningsSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <SkeletonText width={140} size="small" />
        <SkeletonText width={90} />
      </View>
      <SkeletonText width={180} size="small" />
      <Skeleton height={42} radius={10} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(10,126,164,0.08)',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  button: { marginTop: 4 },
});
