import { StyleSheet, View } from 'react-native';

import { Skeleton } from './skeleton';
import { SkeletonText } from './skeleton-text';

export function VideoTileSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={60} height={40} radius={6} />
      <View style={styles.info}>
        <SkeletonText width="65%" size="small" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  info: { flex: 1, gap: 4 },
});
