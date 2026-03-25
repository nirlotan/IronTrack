import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, ScreenBackground } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import { getExerciseName, formatVolume } from '../../src/utils/helpers';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const sessions = useAppStore((s) => s.sessions);
  const exercises = useAppStore((s) => s.exercises);
  const startWorkoutFromSession = useAppStore((s) => s.startWorkoutFromSession);

  const filtered = sessions.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const getExName = (id: string) => {
    const ex = exercises.find((e) => e.id === id);
    return ex ? getExerciseName(ex, t, language) : id;
  };

  const handleRepeat = (sessionId: string) => {
    startWorkoutFromSession(sessionId);
    router.push('/(tabs)/workout');
  };

  return (
    <ScreenBackground style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.primary, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
          {t('history_title')}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceContainerLow, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialIcons name="search" size={18} color={colors.outlineVariant} style={{ marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontRegular }]}
            placeholder={t('history_search')}
            placeholderTextColor={colors.outlineVariant}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('recent_workouts')}
          </Text>
        </View>

        {filtered.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.outlineVariant }]}>
              {t('no_history')}
            </Text>
          </View>
        )}

        {/* Session Cards */}
        {filtered.map((session) => {
          // Top exercises for chips
          const topExercises = session.exercises.slice(0, 3).map((ex) => {
            const maxWeight = Math.max(...ex.sets.filter((s) => s.isCompleted).map((s) => s.weight ?? 0));
            return { name: getExName(ex.exerciseId), maxWeight };
          });

          return (
            <View
              key={session.id}
              style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
            >
              {/* Ghost text */}
              <Text style={[styles.ghostText, { color: colors.onSurface }]}>
                {session.name.substring(0, 8).toUpperCase()}
              </Text>

              <View style={styles.cardInner}>
                {/* Header Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
                      {session.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <MaterialIcons name="calendar-today" size={12} color={colors.onSurfaceVariant} />
                      <Text style={[styles.metaText, { color: colors.onSurfaceVariant, fontFamily: fontRegular }]}>
                        {session.date}
                      </Text>
                      <View style={[styles.metaDot, { backgroundColor: colors.outlineVariant }]} />
                      <MaterialIcons name="timer" size={12} color={colors.onSurfaceVariant} />
                      <Text style={[styles.metaText, { color: colors.onSurfaceVariant, fontFamily: fontRegular }]}>
                        {session.durationMinutes ?? 0} {t('minutes')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.volumeContainer}>
                    <Text style={[styles.volumeValue, { color: colors.primary }]}>
                      {formatVolume(session.totalVolume ?? 0)}
                    </Text>
                    <Text style={[styles.volumeLabel, { color: colors.onSurfaceVariant }]}>
                      {t('kg_lifted')}
                    </Text>
                  </View>
                </View>

                {/* Exercise Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                  {topExercises.map((ex, i) => (
                    <View
                      key={i}
                      style={[styles.chip, { backgroundColor: colors.surfaceContainerHighest }]}
                    >
                      <Text style={[styles.chipName, { color: colors.onSurface }]}>{ex.name}</Text>
                      {ex.maxWeight > 0 && (
                        <Text style={[styles.chipWeight, { color: colors.primary }]}>
                          {ex.maxWeight}kg
                        </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>

                {/* Repeat Button */}
                <TouchableOpacity
                  style={[styles.repeatBtn, { backgroundColor: colors.primaryContainer }]}
                  onPress={() => handleRepeat(session.id)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="replay" size={16} color={colors.onPrimaryContainer} />
                  <Text style={[styles.repeatBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}>
                    {t('repeat_workout')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  scroll: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
  },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'Manrope_400Regular', fontSize: 15 },

  // Card
  card: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  ghostText: {
    position: 'absolute',
    top: -8,
    left: -8,
    fontSize: 60,
    fontFamily: 'SpaceGrotesk_700Bold',
    opacity: 0.03,
    letterSpacing: -2,
  },
  cardInner: { position: 'relative', zIndex: 1 },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  volumeContainer: { alignItems: 'flex-end' },
  volumeValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
  },
  volumeLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  chipsRow: { flexDirection: 'row', marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  chipName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
  },
  chipWeight: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 16,
  },
  repeatBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
