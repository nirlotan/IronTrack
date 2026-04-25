import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useTranslation } from '../i18n';
import { getExerciseName } from '../utils/helpers';
import { bodyPartNameKeys } from '../data/exercises';
import type { BodyPart, Exercise } from '../types';

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

interface ExerciseRowProps {
  exercise: Exercise;
  onPress?: (exerciseId: string) => void;
  onDelete?: (exercise: Exercise) => void;
  onEdit?: (exercise: Exercise) => void;
}

export const ExerciseRow = memo(function ExerciseRow({
  exercise,
  onPress,
  onDelete,
  onEdit,
}: ExerciseRowProps) {
  const { colors } = useTheme();
  const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
  const lastTap = React.useRef<number>(0);

  const handlePress = () => {
    const now = Date.now();
    if (lastTap.current && (now - lastTap.current) < 300) {
      // Double tap detected
      if (exercise.isCustom && onEdit) {
        onEdit(exercise);
        lastTap.current = 0; // Reset after double tap
        return;
      }
    }
    lastTap.current = now;
    onPress?.(exercise.id);
  };

  const renderRightActions = (
    progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>
  ) => {
    if (!exercise.isCustom) return null;

    const transEdit = dragX.interpolate({
      inputRange: isRTL ? [0, 80] : [-160, -80, 0],
      outputRange: isRTL ? [-80, 0] : [0, 0, 80],
      extrapolate: 'clamp',
    });

    const transDelete = dragX.interpolate({
      inputRange: isRTL ? [0, 160] : [-80, 0],
      outputRange: isRTL ? [-80, 0] : [0, 80],
      extrapolate: 'clamp',
    });

    return (
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        {onEdit && (
          <TouchableOpacity
            onPress={() => onEdit(exercise)}
            style={[styles.actionBtn, { backgroundColor: colors.secondaryContainer }]}
          >
            <RNAnimated.View style={{ transform: [{ translateX: transEdit }] }}>
              <MaterialIcons name="edit" size={24} color={colors.onSecondaryContainer} />
            </RNAnimated.View>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(exercise)}
            style={[styles.actionBtn, { backgroundColor: colors.error }]}
          >
            <RNAnimated.View style={{ transform: [{ translateX: transDelete }] }}>
              <MaterialIcons name="delete-outline" size={24} color={colors.onError} />
            </RNAnimated.View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const content = (
    <View style={[styles.exerciseRow, { backgroundColor: colors.surfaceContainerLow }]}>
      <TouchableOpacity
        activeOpacity={onPress ? 0.7 : 1}
        onPress={handlePress}
        style={[
          styles.exerciseContent,
          { flexDirection: isRTL ? 'row-reverse' : 'row' }
        ]}
      >
        <View
          style={[
            styles.exerciseIcon,
            {
              backgroundColor: colors.surfaceContainerHighest,
              marginRight: isRTL ? 0 : 12,
              marginLeft: isRTL ? 12 : 0,
            },
          ]}
        >
          <MaterialIcons
            name={exercise.isCustom ? 'star' : BODY_PART_ICON[exercise.bodyPart]}
            size={18}
            color={colors.primary}
          />
        </View>
        <View style={styles.exerciseInfo}>
          <Text
            style={[
              styles.exerciseName,
              { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold },
            ]}
          >
            {getExerciseName(exercise, t, language)}
          </Text>
          <Text
            style={[
              styles.exerciseMeta,
              { color: colors.onSurfaceVariant, textAlign: isRTL ? 'right' : 'left', fontFamily: fontRegular },
            ]}
          >
            {exercise.isCustom ? t('custom_exercise') : t(bodyPartNameKeys[exercise.bodyPart] as any)}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (exercise.isCustom && (onDelete || onEdit)) {
    return (
      <Swipeable
        renderRightActions={isRTL ? undefined : renderRightActions}
        renderLeftActions={isRTL ? renderRightActions : undefined}
        friction={2}
      >
        {content}
      </Swipeable>
    );
  }

  return content;
});

const styles = StyleSheet.create({
  exerciseRow: {
    borderRadius: 10,
    marginBottom: 6,
    overflow: 'hidden',
  },
  exerciseContent: {
    padding: 14,
    alignItems: 'center',
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
    fontSize: 16,
  },
  exerciseMeta: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
  actionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 10,
  },
});
