import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import Animated, { SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, ScreenBackground } from '../src/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/appStore';
import { getExerciseName } from '../src/utils/helpers';
import { SearchBox } from '../src/components/SearchBox';
import { bodyPartKeys, bodyPartNameKeys } from '../src/data/exercises';
import type { BodyPart } from '../src/types';

export default function SelectExerciseScreen() {
  const { colors } = useTheme();
  const { t, isRTL, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();

  const exercises = useAppStore((s) => s.exercises);
  const addExerciseToWorkout = useAppStore((s) => s.addExerciseToWorkout);
  const addCustomExercise = useAppStore((s) => s.addCustomExercise);

  const [search, setSearch] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBodyPart, setCustomBodyPart] = useState<BodyPart>('chest');
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
    <ScreenBackground style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>← {t('back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('add_exercise')}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
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

      {/* Custom Exercise Overlay */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowCustomModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              Keyboard.dismiss();
              setShowCustomModal(false);
            }}
          />
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutUp}
            style={{ width: '100%' }}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={{
                paddingTop: insets.top,
                paddingBottom: Math.max(insets.bottom, 16) + keyboardInset,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
              showsVerticalScrollIndicator={false}
            >
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: colors.surfaceContainer,
                    maxHeight: windowHeight - insets.top - insets.bottom - 24,
                    marginBottom: keyboardInset,
                  },
                ]}
              >
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
                  ref={customNameRef}
                  returnKeyType="done"
                  onSubmitEditing={handleAddCustom}
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
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </ScreenBackground>
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
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalScroll: {
    width: '100%',
  },
  modalContent: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 24,
    paddingBottom: 24,
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
