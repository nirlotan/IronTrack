/**
 * Select Exercise — full-screen modal picker for the active workout.
 * Uses the shared iOS design system: ModalHeader, SearchBox, chips, Card rows.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Alert,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ScreenBackground, tokens } from '../src/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/appStore';
import { getExerciseName } from '../src/utils/helpers';
import { SearchBox } from '../src/components/SearchBox';
import { ExerciseRow } from '../src/components/ExerciseRow';
import { ModalHeader, PillButton, SectionHeader, Card } from '../src/components/ios';
import { bodyPartKeys, bodyPartNameKeys } from '../src/data/exercises';
import type { BodyPart, Exercise } from '../src/types';

export default function SelectExerciseScreen() {
  const { colors } = useTheme();
  const { t, isRTL, language, fontBold } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();

  const exercises = useAppStore((s) => s.exercises);
  const addExerciseToWorkout = useAppStore((s) => s.addExerciseToWorkout);
  const addCustomExercise = useAppStore((s) => s.addCustomExercise);
  const updateCustomExercise = useAppStore((s) => s.updateCustomExercise);
  const deleteCustomExercise = useAppStore((s) => s.deleteCustomExercise);
  const selectedBodyPart = useAppStore((s) => s.lastSelectedBodyPart);
  const setSelectedBodyPart = useAppStore((s) => s.setLastSelectedBodyPart);

  const [search, setSearch] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBodyPart, setCustomBodyPart] = useState<BodyPart>('chest');
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const customNameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (showCustomModal) {
      // Small delay to ensure the view is rendered before focusing
      const timer = setTimeout(() => customNameRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [showCustomModal]);

  useEffect(() => {
    if (!showCustomModal) {
      setKeyboardInset(0);
      return;
    }

    const onKeyboardChange = (e: any) => {
      const keyboardHeight = e?.endCoordinates?.height ?? 0;
      setKeyboardInset(Math.max(0, keyboardHeight - insets.bottom));
    };

    const onKeyboardHide = () => setKeyboardInset(0);

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const changeEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, onKeyboardChange);
    const changeSub = Keyboard.addListener(changeEvent, onKeyboardChange);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      changeSub.remove();
      hideSub.remove();
    };
  }, [showCustomModal, insets.bottom]);

  const filteredByBodyPart =
    selectedBodyPart === 'all' ? exercises : exercises.filter((ex) => ex.bodyPart === selectedBodyPart);

  const filteredBySearch = filteredByBodyPart.filter((ex) =>
    getExerciseName(ex, t, language).toLowerCase().includes(search.toLowerCase())
  );

  const bodyPartsToShow = selectedBodyPart === 'all' ? bodyPartKeys : [selectedBodyPart];

  const grouped = bodyPartsToShow
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

  const handleSaveCustom = () => {
    if (!customName.trim()) return;
    if (editingExerciseId) {
      updateCustomExercise(editingExerciseId, customName.trim(), language);
    } else {
      const newId = addCustomExercise(customName.trim(), customBodyPart, language);
      addExerciseToWorkout(newId);
    }
    setCustomName('');
    setEditingExerciseId(null);
    setShowCustomModal(false);
    if (!editingExerciseId) {
      router.back();
    }
  };

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
      setShowCustomModal(true);
    },
    [t, language]
  );

  const handleCloseModal = () => {
    setShowCustomModal(false);
    setCustomName('');
    setEditingExerciseId(null);
  };

  const renderChip = (value: BodyPart | 'all', label: string) => {
    const active = selectedBodyPart === value;
    return (
      <Pressable
        key={value}
        onPress={() => setSelectedBodyPart(value)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
        style={[
          styles.filterChip,
          { backgroundColor: active ? colors.primary : colors.fillTertiary },
        ]}
      >
        <Text style={{ color: active ? colors.onPrimary : colors.onSurface, fontFamily: fontBold, fontSize: 13 }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScreenBackground style={styles.container}>
      <ModalHeader title={t('add_exercise')} onClose={() => router.back()} closeIcon="chevron-down" topInset={insets.top} />

      {/* Muscle filter */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.filterScroll,
            { paddingHorizontal: tokens.spacing.lg, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {renderChip('all', t('all' as any))}
          {bodyPartKeys.map((bp) => renderChip(bp, t(bodyPartNameKeys[bp] as any)))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: tokens.spacing.lg, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        <View style={{ marginTop: tokens.spacing.sm }}>
          <SearchBox value={search} onChangeText={setSearch} placeholder={t('library_search')} />
        </View>

        {/* Custom exercise — first option */}
        <PillButton
          title={t('add_custom_exercise')}
          icon="add-circle-outline"
          variant="secondary"
          fullWidth
          onPress={() => {
            if (selectedBodyPart !== 'all') {
              setCustomBodyPart(selectedBodyPart);
            }
            setShowCustomModal(true);
          }}
        />

        {/* Exercise groups */}
        {grouped.map((group) => (
          <View key={group.bodyPart}>
            <SectionHeader title={group.label} style={{ paddingHorizontal: 4 }} />
            {group.items.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                onPress={handleSelect}
                onDelete={handleDeleteExercise}
                onEdit={handleEditExercise}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Custom exercise sheet */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseModal} />
          <Animated.View entering={FadeIn} style={{ width: '100%' }}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.surfaceContainer,
                  maxHeight: windowHeight - insets.top - 24,
                  paddingBottom: Math.max(insets.bottom, 16) + keyboardInset,
                },
              ]}
            >
              <Text
                accessibilityRole="header"
                style={{
                  color: colors.onSurface,
                  fontFamily: fontBold,
                  fontSize: 18,
                  marginBottom: 14,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {editingExerciseId ? t('edit_exercise' as any) : t('add_custom_exercise')}
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: colors.fillTertiary, color: colors.onSurface },
                ]}
                placeholder={t('exercise_name')}
                placeholderTextColor={colors.outline}
                value={customName}
                onChangeText={setCustomName}
                textAlign={isRTL ? 'right' : 'left'}
                ref={customNameRef}
                returnKeyType="done"
                onSubmitEditing={handleSaveCustom}
                accessibilityLabel={t('exercise_name')}
              />
              {!editingExerciseId && (
                <>
                  <Text
                    style={{
                      color: colors.onSurfaceVariant,
                      fontFamily: fontBold,
                      fontSize: 12,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      marginBottom: 8,
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {t('body_part')}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                    style={{ marginBottom: 16 }}
                  >
                    {bodyPartKeys.map((bp) => {
                      const active = customBodyPart === bp;
                      return (
                        <Pressable
                          key={bp}
                          onPress={() => setCustomBodyPart(bp)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          style={[
                            styles.filterChip,
                            { backgroundColor: active ? colors.primary : colors.fillTertiary },
                          ]}
                        >
                          <Text
                            style={{
                              color: active ? colors.onPrimary : colors.onSurface,
                              fontFamily: fontBold,
                              fontSize: 13,
                            }}
                          >
                            {t(bodyPartNameKeys[bp] as any)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              )}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <PillButton title={t('cancel')} variant="secondary" onPress={handleCloseModal} style={{ flex: 1 }} />
                <PillButton
                  title={t('save')}
                  icon="checkmark"
                  onPress={handleSaveCustom}
                  disabled={!customName.trim()}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterWrapper: {
    paddingVertical: 4,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radius.pill,
    minHeight: 38,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: tokens.spacing.lg,
  },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
  },
});
