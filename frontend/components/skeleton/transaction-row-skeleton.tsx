import { StyleSheet, View } from 'react-native';

import { Skeleton } from './skeleton';
import { SkeletonText } from './skeleton-text';

export function TransactionRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={36} height={36} radius={18} />
      <View style={styles.info}>
        <SkeletonText width="60%" size="small" />
        <SkeletonText width="30%" size="small" />
      </View>
      <Skeleton width={48} height={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  info: { flex: 1, gap: 6 },
});
