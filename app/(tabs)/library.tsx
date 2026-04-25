import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ScreenBackground } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import { SearchBox } from '../../src/components/SearchBox';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { ExerciseRow } from '../../src/components/ExerciseRow';
import { bodyPartKeys, bodyPartNameKeys } from '../../src/data/exercises';
import { getExerciseName } from '../../src/utils/helpers';
import type { BodyPart, Exercise } from '../../src/types';

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

// ── Screen ───────────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const { colors } = useTheme();
  const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBodyPart, setCustomBodyPart] = useState<BodyPart>('chest');
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  const exercises = useAppStore((s) => s.exercises);
  const addCustomExercise = useAppStore((s) => s.addCustomExercise);
  const updateCustomExercise = useAppStore((s) => s.updateCustomExercise);
  const deleteCustomExercise = useAppStore((s) => s.deleteCustomExercise);

  const filteredBySearch = exercises.filter((ex) =>
    getExerciseName(ex, t, language).toLowerCase().includes(search.toLowerCase())
  );

  const sections: Array<{ bodyPart: BodyPart; title: string; data: Exercise[] }> = bodyPartKeys
    .map((bp) => ({
      bodyPart: bp,
      title: t(bodyPartNameKeys[bp] as any),
      data: filteredBySearch.filter((ex) => ex.bodyPart === bp),
    }))
    .filter((g) => g.data.length > 0);

  const handleSaveCustom = useCallback(() => {
    if (!customName.trim()) return;
    if (editingExerciseId) {
      updateCustomExercise(editingExerciseId, customName.trim(), language);
    } else {
      addCustomExercise(customName.trim(), customBodyPart, language);
    }
    handleCloseModal();
  }, [customName, customBodyPart, language, addCustomExercise, updateCustomExercise, editingExerciseId]);

  const handleDeleteExercise = useCallback(
    (exercise: Exercise) => {
      Alert.alert(t('delete'), t('delete_exercise_confirm'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => deleteCustomExercise(exercise.id),
        },
      ]);
    },
    [deleteCustomExercise, t]
  );

  const handleEditExercise = useCallback(
    (exercise: Exercise) => {
      setCustomName(getExerciseName(exercise, t, language));
      setCustomBodyPart(exercise.bodyPart);
      setEditingExerciseId(exercise.id);
      setShowModal(true);
    },
    [t, language]
  );

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setCustomName('');
    setEditingExerciseId(null);
  }, []);

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
          {t('library_title')}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExerciseRow 
            exercise={item} 
            onDelete={handleDeleteExercise} 
            onEdit={handleEditExercise}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View
            style={[
              styles.groupHeader,
              {
                borderBottomColor: colors.outlineVariant + '25',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons
                name={BODY_PART_ICON[section.bodyPart]}
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.groupTitle, { color: colors.onBackground, fontFamily: fontBold }]}>
                {section.title}
              </Text>
            </View>
            <Text style={[styles.groupCount, { color: colors.primary + '99', fontFamily: fontBold }]}>
              {section.data.length} {t('exercises_count')}
            </Text>
          </View>
        )}
        ListHeaderComponent={
          <View>
            <SearchBox
              value={search}
              onChangeText={setSearch}
              placeholder={t('library_search')}
            />
            <AnimatedPressable
              style={[styles.customBtn, { backgroundColor: colors.primaryContainer }]}
              onPress={() => setShowModal(true)}
              haptic
              accessibilityRole="button"
              accessibilityLabel={t('add_custom_exercise')}
            >
              <MaterialIcons name="add-circle-outline" size={20} color={colors.onPrimaryContainer} />
              <Text style={[styles.customBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}>
                {t('add_custom_exercise')}
              </Text>
            </AnimatedPressable>
          </View>
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        maxToRenderPerBatch={15}
        windowSize={7}
      />

      {/* Custom Exercise Modal */}
      <Modal
        visible={showModal}
        animationType="fade"
        transparent
        onRequestClose={handleCloseModal}
      >
        {/* Backdrop */}
        <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutUp}
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surfaceContainer,
                paddingTop: insets.top + 24
              }
            ]}
          >
            <Pressable onPress={() => { }}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold },
                ]}
              >
                {editingExerciseId ? t('edit_exercise' as any) : t('add_custom_exercise')}
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: colors.surfaceContainerLow, color: colors.onSurface },
                ]}
                placeholder={t('exercise_name')}
                placeholderTextColor={colors.outlineVariant}
                value={customName}
                onChangeText={setCustomName}
                textAlign={isRTL ? 'right' : 'left'}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveCustom}
              />

              {!editingExerciseId && (
                <>
                  <Text
                    style={[
                      styles.modalLabel,
                      { color: colors.onSurfaceVariant, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold },
                    ]}
                  >
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
                        accessibilityRole="radio"
                        accessibilityState={{ checked: customBodyPart === bp }}
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
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.surfaceContainerHighest }]}
                  onPress={handleCloseModal}
                  accessibilityRole="button"
                  accessibilityLabel={t('cancel')}
                >
                  <Text style={[styles.modalBtnText, { color: colors.onSurface, fontFamily: fontBold }]}>
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primaryContainer }]}
                  onPress={handleSaveCustom}
                  accessibilityRole="button"
                  accessibilityLabel={t('save')}
                >
                  <Text style={[styles.modalBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}>
                    {t('save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
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
  listContent: { paddingHorizontal: 24 },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 18,
    gap: 8,
    marginBottom: 24,
  },
  customBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
    marginBottom: 12,
    marginTop: 20,
    backgroundColor: 'transparent',
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
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  modalInput: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  modalLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  chipRow: { marginBottom: 24 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  chipText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
