import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useApp } from '@/context/app-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProjectCard } from '@/components/project-card';
import { ProjectCardSkeletonList } from '@/components/skeleton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Fonts, Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Project } from '@/data/types';
import { getProjectLogo } from '@/data/project-logos';

export default function DiscoverScreen() {
  const { projects, searchProjects, loading } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Project[] | null>(null);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const r = await searchProjects(query);
        setResults(r);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, searchProjects]);

  const handlePress = useCallback(
    (project: Project) => {
      router.push({ pathname: '/project/[id]', params: { id: project.id } });
    },
    [router],
  );

  const data = results ?? projects;
  const showColdStart = !loading ? false : data.length === 0;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText type="title" style={styles.heading}>
          Discover
        </ThemedText>
      </View>

      <View style={[styles.searchBar, { backgroundColor: surface, borderColor: border }]}>
        <IconSymbol name="magnifyingglass" size={18} color={Brand.primary} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search projects or creators..."
          placeholderTextColor={textColor + '60'}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={Brand.primary} />}
      </View>

      {showColdStart ? (
        <ProjectCardSkeletonList count={6} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              logoUrl={getProjectLogo(item.id)}
              onPress={() => handlePress(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText style={styles.empty}>
              {searching ? 'Searching…' : 'No projects found.'}
            </ThemedText>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 6,
  },
  heading: { flexShrink: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    fontFamily: Fonts.sans,
  },
  list: { paddingTop: 4, paddingBottom: 40 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
});
