import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
const uuid = () => Crypto.randomUUID();
import { useTheme } from '../src/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/appStore';
import { getExerciseName } from '../src/utils/helpers';
import type { TemplateExercise, WorkoutTemplate } from '../src/types';

export default function CreateTemplateScreen() {
  const { colors } = useTheme();
  const { t, isRTL, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const exercises = useAppStore((s) => s.exercises);
  const addTemplate = useAppStore((s) => s.addTemplate);

  const [name, setName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<TemplateExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  const handleAddExercise = (exerciseId: string) => {
    setSelectedExercises((prev) => [
      ...prev,
      { exerciseId, targetSets: 3, targetReps: 10 },
    ]);
    setShowExercisePicker(false);
  };

  const handleUpdateExercise = (index: number, field: 'targetSets' | 'targetReps', value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setSelectedExercises((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: num };
      return updated;
    });
  };

  const handleRemoveExercise = (index: number) => {
    setSelectedExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim() || selectedExercises.length === 0) return;
    const template: WorkoutTemplate = {
      id: uuid(),
      name: name.trim(),
      exercises: selectedExercises,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    addTemplate(template);
    router.back();
  };

  if (showExercisePicker) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
            <Text style={[styles.backBtn, { color: colors.primary }]}>← {t('back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>
            {t('add_exercise')}
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          {exercises.map((ex) => (
            <TouchableOpacity
              key={ex.id}
              style={[styles.exercisePickItem, { backgroundColor: colors.surfaceContainerLow }]}
              onPress={() => handleAddExercise(ex.id)}
            >
              <Text style={[styles.exercisePickName, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left' }]}>
                {getExerciseName(ex, t, language)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backBtn, { color: colors.primary }]}>← {t('back')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.saveBtn, { color: colors.primaryContainer }]}>
              {t('save')}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerTitle, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('create_template')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name Input */}
        <TextInput
          style={[
            styles.nameInput,
            { backgroundColor: colors.surfaceContainerLow, color: colors.onSurface, textAlign: isRTL ? 'right' : 'left' },
          ]}
          placeholder={t('template_name')}
          placeholderTextColor={colors.outlineVariant}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        {/* Selected Exercises */}
        {selectedExercises.map((te, idx) => {
          const ex = exercises.find((e) => e.id === te.exerciseId);
          if (!ex) return null;
          return (
            <View key={idx} style={[styles.templateExercise, { backgroundColor: colors.surfaceContainerLow }]}>
              <View style={styles.templateExHeader}>
                <Text style={[styles.templateExName, { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left' }]}>
                  {getExerciseName(ex, t, language)}
                </Text>
                <TouchableOpacity onPress={() => handleRemoveExercise(idx)}>
                  <Text style={[styles.removeBtn, { color: colors.error }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.templateExRow}>
                <View style={styles.templateExField}>
                  <Text style={[styles.templateExLabel, { color: colors.outlineVariant, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('template_total_sets')}
                  </Text>
                  <TextInput
                    style={[styles.templateExInput, { backgroundColor: colors.surfaceContainer, color: colors.onSurface }]}
                    value={te.targetSets.toString()}
                    onChangeText={(v) => handleUpdateExercise(idx, 'targetSets', v)}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                </View>
                <View style={styles.templateExField}>
                  <Text style={[styles.templateExLabel, { color: colors.outlineVariant, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('reps')}
                  </Text>
                  <TextInput
                    style={[styles.templateExInput, { backgroundColor: colors.surfaceContainer, color: colors.onSurface }]}
                    value={te.targetReps.toString()}
                    onChangeText={(v) => handleUpdateExercise(idx, 'targetReps', v)}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                </View>
              </View>
            </View>
          );
        })}

        {/* Add Exercise Button */}
        <TouchableOpacity
          style={[styles.addExBtn, { backgroundColor: colors.surfaceContainerHighest }]}
          onPress={() => setShowExercisePicker(true)}
        >
          <Text style={[styles.addExText, { color: colors.primary }]}>
            + {t('add_exercise')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  backBtn: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
  },
  saveBtn: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
  },
  nameInput: {
    borderRadius: 12,
    padding: 18,
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 24,
  },
  templateExercise: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  templateExHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateExName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    flex: 1,
  },
  removeBtn: { fontSize: 18, fontWeight: '700' },
  templateExRow: { flexDirection: 'row', gap: 12 },
  templateExField: { flex: 1 },
  templateExLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 6,
  },
  templateExInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  addExBtn: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  addExText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exercisePickItem: {
    padding: 18,
    borderRadius: 12,
    marginBottom: 6,
  },
  exercisePickName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
});
