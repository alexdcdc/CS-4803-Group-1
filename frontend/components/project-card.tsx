import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/progress-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Fonts, Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Project } from '@/data/types';

interface ProjectCardProps {
  project: Project;
  onPress?: () => void;
  logoUrl?: string;
}

export function ProjectCard({ project, onPress, logoUrl }: ProjectCardProps) {
  const progress = project.goalCredits > 0 ? project.raisedCredits / project.goalCredits : 0;
  const firstVideo = project.videos[0];
  const videoColor = firstVideo?.placeholderColor ?? Brand.primary;
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: surface, borderColor: border },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
      ]}
      onPress={onPress}>
      <View style={[styles.thumbnail, { backgroundColor: videoColor }]}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : firstVideo?.thumbnailUrl ? (
          <Image source={{ uri: firstVideo.thumbnailUrl }} style={StyleSheet.absoluteFillObject} />
        ) : (
          <IconSymbol name="play.fill" size={28} color="rgba(255,255,255,0.7)" />
        )}
      </View>
      <View style={styles.info}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {project.title}
        </ThemedText>
        <ThemedText style={styles.creator} numberOfLines={1}>
          {project.creatorName}
        </ThemedText>
        <ProgressBar progress={progress} trackColor={Brand.primarySoft} fillColor={Brand.primary} height={5} />
        <ThemedText style={styles.stats}>
          <ThemedText style={styles.statsHighlight}>
            {project.raisedCredits.toLocaleString()}
          </ThemedText>
          {' / '}
          {project.goalCredits.toLocaleString()} credits  ·  {project.backerCount} backers
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  thumbnail: {
    width: 84,
    height: 84,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 5,
  },
  title: { fontFamily: Fonts.displayBold, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  creator: { fontFamily: Fonts.sans, fontSize: 13, opacity: 0.6 },
  stats: { fontFamily: Fonts.sans, fontSize: 12, opacity: 0.65, marginTop: 2 },
  statsHighlight: { fontFamily: Fonts.sansBold, color: Brand.primary, opacity: 1, fontWeight: '700' },
});
