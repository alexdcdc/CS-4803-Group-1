import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProjectCard } from '@/components/project-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Project } from '@/data/types';

export default function DiscoverScreen() {
  const { projects, searchProjects } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Project[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults(projects);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      const r = await searchProjects(query);
      setResults(r);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, projects, searchProjects]);

  const handlePress = useCallback(
    (project: Project) => {
      router.push({ pathname: '/project/[id]', params: { id: project.id } });
    },
    [router],
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        Discover
      </ThemedText>

      <View style={[styles.searchBar, { borderColor: textColor + '30' }]}>
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search projects or creators..."
          placeholderTextColor={textColor + '60'}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard project={item} onPress={() => handlePress(item)} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedText style={styles.empty}>No projects found.</ThemedText>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  heading: { paddingHorizontal: 16, marginBottom: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  list: { paddingBottom: 40 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
