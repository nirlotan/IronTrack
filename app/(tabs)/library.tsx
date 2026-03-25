import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ScreenBackground } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import { bodyPartKeys, bodyPartNameKeys } from '../../src/data/exercises';
import { getExerciseName } from '../../src/utils/helpers';
import type { BodyPart } from '../../src/types';

const BODY_PART_ICON: Record<BodyPart, React.ComponentProps<typeof MaterialIcons>['name']> = {
  chest: 'fitness-center',
  back: 'rowing',
  legs: 'directions-run',
  shoulders: 'accessibility-new',
  arms: 'sports-handball',
  core: 'self-improvement',
  cardio: 'favorite',
  other: 'category',
};

export default function LibraryScreen() {
  const { colors } = useTheme();
  const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBodyPart, setCustomBodyPart] = useState<BodyPart>('chest');

  const exercises = useAppStore((s) => s.exercises);
  const addCustomExercise = useAppStore((s) => s.addCustomExercise);

  const filteredBySearch = exercises.filter((ex) =>
    getExerciseName(ex, t, language).toLowerCase().includes(search.toLowerCase())
  );

  const grouped = bodyPartKeys
    .map((bp) => ({
      bodyPart: bp,
      label: t(bodyPartNameKeys[bp] as any),
      items: filteredBySearch.filter((ex) => ex.bodyPart === bp),
    }))
    .filter((g) => g.items.length > 0);

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    addCustomExercise(customName.trim(), customBodyPart, language);
    setCustomName('');
    setShowModal(false);
  };

  return (
    <ScreenBackground style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.primary, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
          {t('library_title')}
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
            placeholder={t('library_search')}
            placeholderTextColor={colors.outlineVariant}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Add Custom Exercise Button — first in list */}
        <TouchableOpacity
          style={[styles.customBtn, { backgroundColor: colors.primaryContainer }]}
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add-circle-outline" size={20} color={colors.onPrimaryContainer} />
          <Text style={[styles.customBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}>
            {t('add_custom_exercise')}
          </Text>
        </TouchableOpacity>

        {/* Exercise Groups */}
        {grouped.map((group) => (
          <View key={group.bodyPart} style={styles.group}>
            <View style={[styles.groupHeader, { borderBottomColor: colors.outlineVariant + '25', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name={BODY_PART_ICON[group.bodyPart]} size={16} color={colors.primary} />
                <Text style={[styles.groupTitle, { color: colors.onBackground, fontFamily: fontBold }]}>
                  {group.label}
                </Text>
              </View>
              <Text style={[styles.groupCount, { color: colors.primary + '99', fontFamily: fontBold }]}>
                {group.items.length} {t('exercises_count')}
              </Text>
            </View>
            {group.items.map((exercise) => (
              <View
                key={exercise.id}
                style={[styles.exerciseRow, { backgroundColor: colors.surfaceContainerLow, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <View style={[styles.exerciseIcon, { backgroundColor: colors.surfaceContainerHighest, marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]}>
                  <MaterialIcons
                    name={exercise.isCustom ? 'star' : BODY_PART_ICON[exercise.bodyPart]}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
                    {getExerciseName(exercise, t, language)}
                  </Text>
                  <Text style={[styles.exerciseMeta, { color: colors.onSurfaceVariant, textAlign: isRTL ? 'right' : 'left', fontFamily: fontRegular }]}>
                    {exercise.isCustom ? t('custom_exercise') : t(bodyPartNameKeys[exercise.bodyPart] as any)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Custom Exercise Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceContainer }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
              {t('add_custom_exercise')}
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.surfaceContainerLow, color: colors.onSurface }]}
              placeholder={t('exercise_name')}
              placeholderTextColor={colors.outlineVariant}
              value={customName}
              onChangeText={setCustomName}
              textAlign={isRTL ? 'right' : 'left'}
              autoFocus
            />

            <Text style={[styles.modalLabel, { color: colors.onSurfaceVariant, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
              {t('body_part')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {bodyPartKeys.map((bp) => (
                <TouchableOpacity
                  key={bp}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        customBodyPart === bp ? colors.primaryContainer : colors.surfaceContainerHighest,
                    },
                  ]}
                  onPress={() => setCustomBodyPart(bp)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          customBodyPart === bp ? colors.onPrimaryContainer : colors.onSurface,
                      },
                    ]}
                  >
                    {t(bodyPartNameKeys[bp] as any)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surfaceContainerHighest }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.onSurface, fontFamily: fontBold }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primaryContainer }]}
                onPress={handleAddCustom}
              >
                <Text style={[styles.modalBtnText, { color: '#ffffff', fontFamily: fontBold }]}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
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
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
  },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 18,
    gap: 8,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0)',
  },
  customBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  group: { marginBottom: 32 },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
    marginBottom: 12,
  },
  groupTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    letterSpacing: -0.5,
  },
  groupCount: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 6,
  },
  exerciseIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: { flex: 1 },
  exerciseName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
  exerciseMeta: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  modalInput: {
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    marginBottom: 16,
  },
  modalLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', marginBottom: 24 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
  },
  chipText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
});
