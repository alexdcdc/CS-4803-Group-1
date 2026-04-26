import { Skeleton, SkeletonProps } from './skeleton';

interface SkeletonTextProps extends Omit<SkeletonProps, 'height'> {
  size?: 'small' | 'default' | 'title';
}

const HEIGHTS = { small: 12, default: 16, title: 28 } as const;

export function SkeletonText({ size = 'default', ...rest }: SkeletonTextProps) {
  return <Skeleton height={HEIGHTS[size]} {...rest} />;
}
