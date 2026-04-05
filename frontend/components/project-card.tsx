import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/progress-bar';
import { Project } from '@/data/types';

interface ProjectCardProps {
  project: Project;
  onPress?: () => void;
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  const progress = project.goalCredits > 0 ? project.raisedCredits / project.goalCredits : 0;
  const videoColor = project.videos[0]?.placeholderColor ?? '#333';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.thumbnail, { backgroundColor: videoColor }]} />
      <View style={styles.info}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {project.title}
        </ThemedText>
        <ThemedText style={styles.creator} numberOfLines={1}>
          {project.creatorName}
        </ThemedText>
        <ProgressBar progress={progress} trackColor="rgba(0,0,0,0.1)" fillColor="#22c55e" height={4} />
        <ThemedText style={styles.stats}>
          {project.raisedCredits.toLocaleString()} / {project.goalCredits.toLocaleString()} credits
          {'  '}·{'  '}
          {project.backerCount} backers
        </ThemedText>
      </View>
    </Pressable>
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
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  title: { fontSize: 16, fontWeight: '600' },
  creator: { fontSize: 13, opacity: 0.6 },
  stats: { fontSize: 12, opacity: 0.5, marginTop: 2 },
});
