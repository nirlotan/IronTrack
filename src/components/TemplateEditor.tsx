/**
 * TemplateEditor — shared full-screen editor for creating and editing routines.
 * Wrapped by app/create-template.tsx and app/edit-template.tsx.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, ScreenBackground, tokens } from '../theme';
import { useTranslation } from '../i18n';
import { useAppStore } from '../store/appStore';
import { getExerciseName } from '../utils/helpers';
import { SearchBox } from './SearchBox';
import { Card, IconButton, ModalHeader, PillButton, SectionHeader, Stepper } from './ios';
import { bodyPartKeys, bodyPartNameKeys } from '../data/exercises';
import type { TemplateExercise, WorkoutTemplate } from '../types';

const uuid = () => Crypto.randomUUID();

export function TemplateEditor({ templateId }: { templateId?: string }) {
  const { colors } = useTheme();
  const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const exercises = useAppStore((s) => s.exercises);
  const templates = useAppStore((s) => s.templates);
  const addTemplate = useAppStore((s) => s.addTemplate);
  const updateTemplate = useAppStore((s) => s.updateTemplate);

  const template = templateId ? templates.find((tmpl) => tmpl.id === templateId) : undefined;
  const isEdit = Boolean(templateId);

  const [name, setName] = useState(template?.name ?? '');
  const [selectedExercises, setSelectedExercises] = useState<TemplateExercise[]>(
    template?.exercises ?? []
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const grouped = useMemo(
    () =>
      bodyPartKeys
        .map((bp) => ({
          bodyPart: bp,
          label: t(bodyPartNameKeys[bp] as any),
          items: exercises.filter(
            (ex) =>
              ex.bodyPart === bp &&
              getExerciseName(ex, t, language).toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((g) => g.items.length > 0),
    [exercises, search, t, language]
  );

  const handleAddExercise = (exerciseId: string) => {
    setSelectedExercises((prev) => [...prev, { exerciseId, sets: 3, reps: 10, weight: null }]);
    setPickerOpen(false);
    setSearch('');
  };

  const handleUpdate = (index: number, field: 'sets' | 'reps' | 'weight', value: number | null) => {
    setSelectedExercises((prev) => {
      const updated = [...prev];
      if (field === 'weight') {
        updated[index] = { ...updated[index], weight: value };
      } else {
        updated[index] = { ...updated[index], [field]: Math.max(1, Math.round(value ?? 1)) };
      }
      return updated;
    });
  };

  const handleRemove = (index: number) => {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMove = (from: number, to: number) => {
    setSelectedExercises((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const canSave = Boolean(name.trim()) && selectedExercises.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (isEdit && template) {
      updateTemplate({
        ...template,
        name: name.trim(),
        exercises: selectedExercises,
        updatedAt: Date.now(),
      });
    } else {
      const created: WorkoutTemplate = {
        id: uuid(),
        name: name.trim(),
        exercises: selectedExercises,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addTemplate(created);
    }
    router.back();
  };

  if (isEdit && !template) {
    router.back();
    return null;
  }

  return (
    <ScreenBackground style={{ flex: 1 }}>
      <ModalHeader
        title={isEdit ? t('edit_template') : t('create_template')}
        onClose={() => router.back()}
        closeIcon="chevron-down"
        topInset={insets.top}
        action={{ title: t('save'), onPress: handleSave, disabled: !canSave }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: tokens.spacing.lg,
          paddingBottom: insets.bottom + 120,
          gap: tokens.spacing.md,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={[
            styles.nameInput,
            {
              backgroundColor: colors.surfaceContainer,
              color: colors.onSurface,
              fontFamily: fontBold,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          placeholder={t('template_name')}
          placeholderTextColor={colors.outline}
          value={name}
          onChangeText={setName}
          autoFocus={!isEdit}
          accessibilityLabel={t('template_name')}
        />

        {selectedExercises.map((te, idx) => {
          const ex = exercises.find((e) => e.id === te.exerciseId);
          if (!ex) return null;
          return (
            <Animated.View key={`${te.exerciseId}-${idx}`} entering={FadeInDown.springify()}>
              <Card>
                <View
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      color: colors.onSurface,
                      fontFamily: fontBold,
                      fontSize: 17,
                      flex: 1,
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {getExerciseName(ex, t, language)}
                  </Text>
                  <IconButton
                    icon="chevron-up"
                    size={32}
                    label={`${getExerciseName(ex, t, language)} up`}
                    tint={colors.onSurfaceVariant}
                    disabled={idx === 0}
                    onPress={() => handleMove(idx, idx - 1)}
                  />
                  <IconButton
                    icon="chevron-down"
                    size={32}
                    label={`${getExerciseName(ex, t, language)} down`}
                    tint={colors.onSurfaceVariant}
                    disabled={idx === selectedExercises.length - 1}
                    onPress={() => handleMove(idx, idx + 1)}
                  />
                  <IconButton
                    icon="trash-outline"
                    size={32}
                    label={`${t('delete')} ${getExerciseName(ex, t, language)}`}
                    tint={colors.error}
                    onPress={() => handleRemove(idx)}
                  />
                </View>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: tokens.spacing.md }}>
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: fontBold }]}>
                      {t('sets')}
                    </Text>
                    <Stepper
                      value={te.sets}
                      onChange={(v) => handleUpdate(idx, 'sets', v)}
                      step={1}
                      min={1}
                      label={t('sets')}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: fontBold }]}>
                      {t('reps')}
                    </Text>
                    <Stepper
                      value={te.reps}
                      onChange={(v) => handleUpdate(idx, 'reps', v)}
                      step={1}
                      min={1}
                      label={t('reps')}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant, fontFamily: fontBold }]}>
                      {t('weight_kg')}
                    </Text>
                    <Stepper
                      value={te.weight}
                      onChange={(v) => handleUpdate(idx, 'weight', v)}
                      step={2.5}
                      min={0}
                      label={t('weight_kg')}
                    />
                  </View>
                </View>
              </Card>
            </Animated.View>
          );
        })}

        {selectedExercises.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
            <Ionicons name="barbell-outline" size={44} color={colors.outline} />
            <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 14 }}>
              {t('no_routines_hint')}
            </Text>
          </View>
        ) : null}

        <PillButton
          title={t('add_exercise')}
          icon="add-circle-outline"
          variant="secondary"
          fullWidth
          onPress={() => setPickerOpen(true)}
        />
      </ScrollView>

      {/* Exercise picker sheet */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surfaceContainer, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text
                accessibilityRole="header"
                style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 18, flex: 1 }}
              >
                {t('add_exercise')}
              </Text>
              <IconButton icon="close" size={32} label={t('cancel')} tint={colors.onSurfaceVariant} onPress={() => setPickerOpen(false)} />
            </View>
            <SearchBox value={search} onChangeText={setSearch} placeholder={t('library_search')} />
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              {grouped.map((group) => (
                <View key={group.bodyPart}>
                  <SectionHeader title={group.label} style={{ paddingHorizontal: 0 }} />
                  <Card style={{ padding: 0 }}>
                    {group.items.map((ex, i) => (
                      <Pressable
                        key={ex.id}
                        onPress={() => handleAddExercise(ex.id)}
                        accessibilityRole="button"
                        accessibilityLabel={getExerciseName(ex, t, language)}
                        style={({ pressed }) => [
                          styles.pickRow,
                          {
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                            backgroundColor: pressed ? colors.fillTertiary : 'transparent',
                            borderBottomWidth: i < group.items.length - 1 ? StyleSheet.hairlineWidth : 0,
                            borderBottomColor: colors.separator,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: colors.onSurface,
                            fontFamily: fontRegular,
                            fontSize: 16,
                            flex: 1,
                            textAlign: isRTL ? 'right' : 'left',
                          }}
                        >
                          {getExerciseName(ex, t, language)}
                        </Text>
                        <Ionicons name="add" size={18} color={colors.primary} />
                      </Pressable>
                    ))}
                  </Card>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  nameInput: {
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: 16,
    fontSize: 18,
  },
  field: { flex: 1, gap: 6 },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: tokens.spacing.lg,
  },
  pickRow: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: tokens.spacing.lg,
    minHeight: 48,
    paddingVertical: 12,
  },
});
