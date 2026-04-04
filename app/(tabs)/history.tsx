import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, ScreenBackground } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import { SearchBox } from '../../src/components/SearchBox';
import { SessionCard } from '../../src/components/SessionCard';
import type { WorkoutSession } from '../../src/types';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { t, isRTL, fontBold, fontRegular } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const sessions = useAppStore((s) => s.sessions);
  const startWorkoutFromSession = useAppStore((s) => s.startWorkoutFromSession);

  const filtered = sessions.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleRepeat = useCallback(
    (sessionId: string) => {
      startWorkoutFromSession(sessionId);
      router.push('/active-workout');
    },
    [startWorkoutFromSession, router]
  );

  return (
    <ScreenBackground style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 12 }]}>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.primary, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold },
          ]}
        >
          {t('history_title')}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: WorkoutSession) => item.id}
        renderItem={({ item }) => (
          <SessionCard session={item} onRepeat={handleRepeat} />
        )}
        ListHeaderComponent={
          <View>
            <SearchBox
              value={search}
              onChangeText={setSearch}
              placeholder={t('history_search')}
            />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold },
              ]}
            >
              {t('recent_workouts')}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={48} color={colors.outlineVariant} />
            <Text style={[styles.emptyText, { color: colors.outlineVariant, fontFamily: fontRegular }]}>
              {t('no_history')}
            </Text>
          </View>
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  listContent: { paddingHorizontal: 24 },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 16,
  },
  emptyText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
  },
});
