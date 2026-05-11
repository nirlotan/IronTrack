/**
 * Train — your routines, starter programs, and exercise library in one place.
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, ScreenBackground, tokens } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import {
  Card,
  ListRow,
  SegmentedControl,
  PillButton,
  SectionHeader,
  LargeTitle,
  Badge,
} from '../../src/components/ios';
import { SearchBox } from '../../src/components/SearchBox';
import { bodyPartKeys, bodyPartNameKeys } from '../../src/data/exercises';
import { getExerciseName } from '../../src/utils/helpers';
import type { BodyPart, Exercise } from '../../src/types';

type Section = 'routines' | 'programs' | 'exercises';

export default function TrainScreen() {
  const { colors } = useTheme();
  const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [section, setSection] = useState<Section>('routines');
  const [search, setSearch] = useState('');

  const templates = useAppStore((s) => s.templates);
  const programs = useAppStore((s) => s.programs);
  const installedProgramIds = useAppStore((s) => s.installedProgramIds);
  const exercises = useAppStore((s) => s.exercises);
  const installProgram = useAppStore((s) => s.installProgram);
  const startWorkoutFromTemplate = useAppStore((s) => s.startWorkoutFromTemplate);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);
  const addCustomExercise = useAppStore((s) => s.addCustomExercise);
  const deleteCustomExercise = useAppStore((s) => s.deleteCustomExercise);

  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBodyPart, setCustomBodyPart] = useState<BodyPart>('chest');

  const filteredTemplates = useMemo(
    () => templates.filter((tpl) => tpl.name.toLowerCase().includes(search.toLowerCase())),
    [templates, search]
  );

  const filteredExercises = useMemo(
    () =>
      exercises.filter((e) =>
        getExerciseName(e, t, language).toLowerCase().includes(search.toLowerCase())
      ),
    [exercises, search, t, language]
  );

  const handleStart = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startWorkoutFromTemplate(id);
      router.push('/active-workout');
    },
    [startWorkoutFromTemplate, router]
  );

  const handleDeleteTemplate = useCallback(
    (id: string) => {
      Alert.alert(t('delete'), t('delete_template_confirm'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteTemplate(id) },
      ]);
    },
    [deleteTemplate, t]
  );

  const handleInstallProgram = useCallback(
    (id: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      installProgram(id);
    },
    [installProgram]
  );

  const handleAddCustom = useCallback(() => {
    if (!customName.trim()) return;
    addCustomExercise(customName.trim(), customBodyPart, language);
    setCustomName('');
    setCustomModalOpen(false);
  }, [addCustomExercise, customBodyPart, customName, language]);

  return (
    <ScreenBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 140,
          paddingHorizontal: tokens.spacing.lg,
          gap: tokens.spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <LargeTitle
          title={t('train_title')}
          trailing={
            section === 'routines' ? (
              <Pressable
                onPress={() => router.push('/create-template')}
                hitSlop={12}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surfaceContainerHigh,
                })}
              >
                <Ionicons name="add" size={22} color={colors.primary} />
              </Pressable>
            ) : section === 'exercises' ? (
              <Pressable
                onPress={() => setCustomModalOpen(true)}
                hitSlop={12}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surfaceContainerHigh,
                })}
              >
                <Ionicons name="add" size={22} color={colors.primary} />
              </Pressable>
            ) : null
          }
        />

        <SegmentedControl<Section>
          value={section}
          onChange={setSection}
          segments={[
            { value: 'routines', label: t('train_routines') },
            { value: 'programs', label: t('train_programs') },
            { value: 'exercises', label: t('train_exercises') },
          ]}
        />

        {section !== 'programs' ? (
          <SearchBox
            value={search}
            onChangeText={setSearch}
            placeholder={section === 'routines' ? t('templates_search') : t('library_search')}
          />
        ) : null}

        {/* ─── Routines ─────────────────────────────────────────── */}
        {section === 'routines' ? (
          filteredTemplates.length === 0 ? (
            <Animated.View entering={FadeIn} style={{ paddingTop: 40, alignItems: 'center', gap: 12 }}>
              <Ionicons name="barbell-outline" size={56} color={colors.outline} />
              <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 18 }}>{t('no_routines_yet')}</Text>
              <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
                {t('no_routines_hint')}
              </Text>
              <PillButton title={t('new_routine')} icon="add-circle" onPress={() => router.push('/create-template')} />
            </Animated.View>
          ) : (
            <View style={{ gap: tokens.spacing.md }}>
              {filteredTemplates.map((tpl, i) => {
                const totalSets = tpl.exercises.reduce((s, e) => s + e.sets, 0);
                const renderRight = () => (
                  <RectButton
                    style={[styles.swipeAction, { backgroundColor: colors.error }]}
                    onPress={() => handleDeleteTemplate(tpl.id)}
                  >
                    <Ionicons name="trash" size={20} color={colors.onError} />
                  </RectButton>
                );
                return (
                  <Animated.View key={tpl.id} entering={FadeInDown.delay(i * 40).springify()}>
                    <Swipeable
                      overshootLeft={false}
                      overshootRight={false}
                      {...(isRTL ? { renderLeftActions: renderRight } : { renderRightActions: renderRight })}
                    >
                      <Card>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 14 }}>
                          <View style={[styles.routineIcon, { backgroundColor: tpl.colorTag ?? colors.primaryContainer }]}>
                            <Text style={{ fontSize: 22 }}>{tpl.emoji ?? '🏋️'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 17, textAlign: isRTL ? 'right' : 'left' }}
                            >
                              {tpl.name}
                            </Text>
                            <Text
                              style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 13, marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}
                            >
                              {tpl.exercises.length} {t('template_exercises')} · {totalSets} {t('template_total_sets')}
                            </Text>
                          </View>
                          <Pressable
                            hitSlop={10}
                            onPress={() => router.push(`/edit-template?id=${tpl.id}` as any)}
                          >
                            <Ionicons name="ellipsis-horizontal" size={20} color={colors.onSurfaceVariant} />
                          </Pressable>
                        </View>
                        <View style={{ height: 12 }} />
                        <PillButton title={t('start_workout')} icon="play" fullWidth onPress={() => handleStart(tpl.id)} />
                      </Card>
                    </Swipeable>
                  </Animated.View>
                );
              })}
            </View>
          )
        ) : null}

        {/* ─── Programs ─────────────────────────────────────────── */}
        {section === 'programs' ? (
          <View style={{ gap: tokens.spacing.md }}>
            <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 13, paddingHorizontal: 4, textAlign: isRTL ? 'right' : 'left' }}>
              {t('program_starts_here')}
            </Text>
            {programs.map((p, i) => {
              const installed = installedProgramIds.includes(p.id);
              return (
                <Animated.View key={p.id} entering={FadeInDown.delay(i * 50).springify()}>
                  <Card>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 14 }}>
                      <View style={[styles.routineIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
                        <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 17 }}>
                            {t(p.nameKey as any)}
                          </Text>
                          {installed ? <Badge label="✓" /> : null}
                        </View>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 6 }}>
                          <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 12 }}>
                            {p.daysPerWeek} {t('days_per_week')}
                          </Text>
                          <Text style={{ color: colors.outline }}>·</Text>
                          <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 12 }}>
                            {t(`level_${p.level}` as any)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={{ color: colors.onSurface, fontFamily: fontRegular, fontSize: 14, marginTop: 12, textAlign: isRTL ? 'right' : 'left' }}>
                      {t(p.descriptionKey as any)}
                    </Text>
                    <View style={{ height: 12 }} />
                    <PillButton
                      title={installed ? t('program_installed') : t('install_program')}
                      icon={installed ? 'checkmark-circle' : 'add-circle'}
                      variant={installed ? 'secondary' : 'primary'}
                      fullWidth
                      onPress={() => handleInstallProgram(p.id)}
                      disabled={installed}
                    />
                  </Card>
                </Animated.View>
              );
            })}
          </View>
        ) : null}

        {/* ─── Exercises library ────────────────────────────────── */}
        {section === 'exercises' ? (
          <View style={{ gap: tokens.spacing.md }}>
            {bodyPartKeys
              .map((bp) => ({
                bp,
                items: filteredExercises.filter((e) => e.bodyPart === bp),
              }))
              .filter((g) => g.items.length > 0)
              .map((group) => (
                <View key={group.bp}>
                  <SectionHeader title={t(bodyPartNameKeys[group.bp] as any)} />
                  <Card style={{ padding: 0 }}>
                    {group.items.map((ex, i) => (
                      <ExerciseRow
                        key={ex.id}
                        exercise={ex}
                        onDelete={
                          ex.isCustom
                            ? () =>
                                Alert.alert(t('delete'), t('delete_exercise_confirm'), [
                                  { text: t('cancel'), style: 'cancel' },
                                  {
                                    text: t('delete'),
                                    style: 'destructive',
                                    onPress: () => deleteCustomExercise(ex.id),
                                  },
                                ])
                            : undefined
                        }
                        separator={i < group.items.length - 1}
                      />
                    ))}
                  </Card>
                </View>
              ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Custom exercise modal */}
      <Modal
        visible={customModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCustomModalOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surfaceContainer }]} onPress={() => {}}>
            <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 18, marginBottom: 14 }}>
              {t('add_custom_exercise')}
            </Text>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder={t('exercise_name')}
              placeholderTextColor={colors.outline}
              style={{
                backgroundColor: colors.fillTertiary,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.onSurface,
                fontSize: 16,
                marginBottom: 14,
              }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddCustom}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontBold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
              {t('body_part')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {bodyPartKeys.map((bp) => {
                const active = customBodyPart === bp;
                return (
                  <Pressable
                    key={bp}
                    onPress={() => setCustomBodyPart(bp)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: active ? colors.primary : colors.fillTertiary,
                    }}
                  >
                    <Text style={{ color: active ? colors.onPrimary : colors.onSurface, fontFamily: fontBold, fontSize: 13 }}>
                      {t(bodyPartNameKeys[bp] as any)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ height: 16 }} />
            <PillButton title={t('add')} icon="add" fullWidth onPress={handleAddCustom} disabled={!customName.trim()} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

function ExerciseRow({
  exercise,
  onDelete,
  separator,
}: {
  exercise: Exercise;
  onDelete?: () => void;
  separator?: boolean;
}) {
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  return (
    <ListRow
      title={getExerciseName(exercise, t, language)}
      subtitle={exercise.isCustom ? t('custom_exercise') : t(bodyPartNameKeys[exercise.bodyPart] as any)}
      separator={separator}
      leading={
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={exercise.isCustom ? 'star' : 'fitness'} size={16} color={colors.primary} />
        </View>
      }
      rightAccessory={
        onDelete ? (
          <Pressable onPress={onDelete} hitSlop={10}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  routineIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeAction: {
    width: 70,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    padding: tokens.spacing.lg,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});
