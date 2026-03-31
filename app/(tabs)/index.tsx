import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, ScreenBackground } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';

export default function TemplatesScreen() {
  const { colors } = useTheme();
  const { t, isRTL, fontBold, fontRegular } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const templates = useAppStore((s) => s.templates);
  const startEmptyWorkout = useAppStore((s) => s.startEmptyWorkout);
  const startWorkoutFromTemplate = useAppStore((s) => s.startWorkoutFromTemplate);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);

  const filtered = templates.filter((tmpl) =>
    tmpl.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleStart = (templateId: string) => {
    startWorkoutFromTemplate(templateId);
    router.push('/(tabs)/workout');
  };

  const handleNewWorkout = () => {
    startEmptyWorkout();
    router.push('/(tabs)/workout');
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('delete'), t('delete_template_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteTemplate(id) },
    ]);
  };

  const renderDeleteAction = (id: string) => (
    <RectButton
      style={[styles.swipeDeleteAction, { backgroundColor: colors.error }]}
      onPress={() => handleDelete(id)}
    >
      <MaterialIcons name="delete" size={20} color={colors.onError} />
      <Text style={[styles.swipeDeleteText, { color: colors.onError, fontFamily: fontBold }]}>
        {t('delete')}
      </Text>
    </RectButton>
  );

  return (
    <ScreenBackground style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.primary, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
          {t('templates_title')}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surfaceContainerLow, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialIcons name="search" size={18} color={colors.outlineVariant} style={{ marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }} />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: colors.onSurface,
                fontFamily: fontRegular,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            placeholder={t('templates_search')}
            placeholderTextColor={colors.outlineVariant}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Create New Template */}
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.primaryContainer }]}
          onPress={handleNewWorkout}
          activeOpacity={0.8}
        >
          <Text style={[styles.createBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}> 
            + {t('new_workout')}
          </Text>
        </TouchableOpacity>

        {/* Template Cards */}
        {filtered.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.outlineVariant }]}>
              {t('no_templates')}
            </Text>
          </View>
        )}

        {filtered.map((template, index) => {
          const totalSets = template.exercises.reduce((acc, e) => acc + e.targetSets, 0);
          return (
            <Swipeable
              key={template.id}
              overshootLeft={false}
              overshootRight={false}
              leftThreshold={40}
              rightThreshold={40}
              renderLeftActions={() => renderDeleteAction(template.id)}
              renderRightActions={() => renderDeleteAction(template.id)}
            >
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}
                activeOpacity={0.95}
                onLongPress={() => handleDelete(template.id)}
              >
                {/* Ghost number */}
                <Text style={[styles.cardGhostNumber, { color: colors.onSurface }]}> 
                  {String(index + 1).padStart(2, '0')}
                </Text>

                <View style={styles.cardContent}>
                  {/* Card Header with edit */}
                  <View style={styles.cardHeader}>
                    <TouchableOpacity onPress={() => router.push(`/edit-template?id=${template.id}`)}>
                      <MaterialIcons name="more-horiz" size={28} color={colors.outlineVariant} />
                    </TouchableOpacity>
                  </View>

                  {/* Template Name */}
                  <Text style={[styles.cardTitle, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}> 
                    {template.name}
                  </Text>

                  {/* Stats Row */}
                  <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: colors.outlineVariant, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}> 
                        {t('template_exercises')}
                      </Text>
                      <Text style={[styles.statValue, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}> 
                        {template.exercises.length}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: colors.outlineVariant, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}> 
                        {t('template_total_sets')}
                      </Text>
                      <Text style={[styles.statValue, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}> 
                        {totalSets}
                      </Text>
                    </View>

                    {/* Play Button */}
                    <TouchableOpacity
                      style={[styles.playBtn, { backgroundColor: colors.primaryContainer }]}
                      onPress={() => handleStart(template.id)}
                    >
                      <MaterialIcons name="play-arrow" size={26} color={colors.onPrimaryContainer} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Swipeable>
          );
        })}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    letterSpacing: 1,
  },
  createBtn: {
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  createBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
  },
  card: {
    borderRadius: 10,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cardGhostNumber: {
    position: 'absolute',
    left: -8,
    bottom: -20,
    fontSize: 120,
    fontFamily: 'SpaceGrotesk_700Bold',
    opacity: 0.04,
    lineHeight: 120,
  },
  cardContent: { position: 'relative', zIndex: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  cardMoreIcon: { fontSize: 24, letterSpacing: 2 },
  cardTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statItem: { marginRight: 24 },
  statLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteAction: {
    width: 92,
    marginBottom: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  swipeDeleteText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playIcon: { fontSize: 18 },
});
