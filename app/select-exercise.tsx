import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/appStore';
import { getExerciseName } from '../src/utils/helpers';
import { bodyPartKeys, bodyPartNameKeys } from '../src/data/exercises';
import type { BodyPart } from '../src/types';

export default function SelectExerciseScreen() {
  const { colors } = useTheme();
  const { t, isRTL, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const exercises = useAppStore((s) => s.exercises);
  const addExerciseToWorkout = useAppStore((s) => s.addExerciseToWorkout);
  const addCustomExercise = useAppStore((s) => s.addCustomExercise);

  const [search, setSearch] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBodyPart, setCustomBodyPart] = useState<BodyPart>('chest');

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

  const handleSelect = (exerciseId: string) => {
    addExerciseToWorkout(exerciseId);
    router.back();
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    addCustomExercise(customName.trim(), customBodyPart, language);
    setCustomName('');
    setShowCustomModal(false);
    // The new exercise is now in store; user can select it
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('add_exercise')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceContainerLow }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('library_search')}
            placeholderTextColor={colors.outlineVariant}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Custom Exercise — first option */}
        <TouchableOpacity
          style={[styles.customBtn, { backgroundColor: colors.surfaceContainerHighest }]}
          onPress={() => setShowCustomModal(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.customBtnText, { color: colors.primary }]}>
            ⊕ {t('add_custom_exercise')}
          </Text>
        </TouchableOpacity>

        {/* Exercise Groups */}
        {grouped.map((group) => (
          <View key={group.bodyPart} style={styles.group}>
            <Text style={[styles.groupTitle, { color: colors.onBackground, textAlign: isRTL ? 'right' : 'left' }]}>
              {group.label}
            </Text>
            {group.items.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={[styles.exerciseItem, { backgroundColor: colors.surfaceContainerLow }]}
                onPress={() => handleSelect(exercise.id)}
              >
                <Text style={[styles.exerciseName, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left' }]}>
                  {getExerciseName(exercise, t, language)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Custom Exercise Modal */}
      <Modal visible={showCustomModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surfaceContainer }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left' }]}>
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
            <Text style={[styles.modalLabel, { color: colors.onSurfaceVariant, textAlign: isRTL ? 'right' : 'left' }]}>
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
                      { color: customBodyPart === bp ? colors.onPrimaryContainer : colors.onSurface },
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
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.onSurface }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primaryContainer }]}
                onPress={handleAddCustom}
              >
                <Text style={[styles.modalBtnText, { color: colors.onPrimaryContainer }]}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  backBtn: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, marginBottom: 8 },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  searchBox: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  searchInput: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
  },
  customBtn: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  customBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  group: { marginBottom: 20 },
  groupTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  exerciseItem: {
    padding: 18,
    borderRadius: 12,
    marginBottom: 6,
  },
  exerciseName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
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
    borderRadius: 12,
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
    borderRadius: 20,
    marginRight: 8,
  },
  chipText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalBtnText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 },
});
