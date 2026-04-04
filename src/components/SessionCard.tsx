import { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useTranslation } from '../i18n';
import { useAppStore } from '../store/appStore';
import { getExerciseName, formatVolume } from '../utils/helpers';
import type { WorkoutSession } from '../types';

interface SessionCardProps {
    session: WorkoutSession;
    onRepeat: (sessionId: string) => void;
}

export const SessionCard = memo(function SessionCard({ session, onRepeat }: SessionCardProps) {
    const { colors } = useTheme();
    const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
    const exercises = useAppStore((s) => s.exercises);

    const topExercises = session.exercises.slice(0, 3).map((ex) => {
        const maxWeight = ex.sets
            .filter((s) => s.isCompleted)
            .reduce((max, s) => Math.max(max, s.weight ?? 0), 0);
        const exerciseData = exercises.find((e) => e.id === ex.exerciseId);
        const name = exerciseData ? getExerciseName(exerciseData, t, language) : ex.exerciseId;
        return { name, maxWeight };
    });

    return (
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLow }]}>
            <Text style={[styles.ghostText, { color: colors.onSurface }]}>
                {session.name.substring(0, 8).toUpperCase()}
            </Text>

            <View style={styles.cardInner}>
                <View
                    style={[
                        styles.cardHeaderRow,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                >
                    <View style={styles.titleBlock}>
                        <Text
                            style={[
                                styles.cardTitle,
                                { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold },
                            ]}
                        >
                            {session.name}
                        </Text>
                        <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <MaterialIcons name="calendar-today" size={12} color={colors.onSurfaceVariant} />
                            <Text style={[styles.metaText, { color: colors.onSurfaceVariant, fontFamily: fontRegular }]}>
                                {session.date}
                            </Text>
                            <View style={[styles.metaDot, { backgroundColor: colors.outlineVariant }]} />
                            <MaterialIcons name="timer" size={12} color={colors.onSurfaceVariant} />
                            <Text style={[styles.metaText, { color: colors.onSurfaceVariant, fontFamily: fontRegular }]}>
                                {session.durationMinutes ?? 0} {t('minutes')}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.volumeContainer}>
                        <Text style={[styles.volumeValue, { color: colors.primary, fontFamily: fontBold }]}>
                            {formatVolume(session.totalVolume ?? 0)}
                        </Text>
                        <Text style={[styles.volumeLabel, { color: colors.onSurfaceVariant, fontFamily: fontBold }]}>
                            {t('kg_lifted')}
                        </Text>
                    </View>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipsRow}
                >
                    {topExercises.map((ex, i) => (
                        <View key={i} style={[styles.chip, { backgroundColor: colors.surfaceContainerHighest }]}>
                            <Text style={[styles.chipName, { color: colors.onSurface, fontFamily: fontBold }]}>
                                {ex.name}
                            </Text>
                            {ex.maxWeight > 0 && (
                                <Text style={[styles.chipWeight, { color: colors.primary, fontFamily: fontBold }]}>
                                    {ex.maxWeight}kg
                                </Text>
                            )}
                        </View>
                    ))}
                </ScrollView>

                <TouchableOpacity
                    style={[styles.repeatBtn, { backgroundColor: colors.primaryContainer }]}
                    onPress={() => onRepeat(session.id)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('repeat_workout')}
                >
                    <MaterialIcons name="replay" size={16} color={colors.onPrimaryContainer} />
                    <Text style={[styles.repeatBtnText, { color: colors.onPrimaryContainer, fontFamily: fontBold }]}>
                        {t('repeat_workout')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    ghostText: {
        position: 'absolute',
        top: -8,
        left: -8,
        fontSize: 60,
        fontFamily: 'SpaceGrotesk_700Bold',
        opacity: 0.03,
        letterSpacing: -2,
    },
    cardInner: { position: 'relative', zIndex: 1 },
    cardHeaderRow: {
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titleBlock: { flex: 1 },
    cardTitle: {
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 18,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    metaRow: { alignItems: 'center', gap: 6 },
    metaText: { fontSize: 12 },
    metaDot: { width: 3, height: 3, borderRadius: 2 },
    volumeContainer: { alignItems: 'flex-end' },
    volumeValue: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22 },
    volumeLabel: {
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    chipsRow: { marginBottom: 16 },
    chip: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginRight: 8,
        gap: 6,
    },
    chipName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11 },
    chipWeight: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11 },
    repeatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 8,
        paddingVertical: 14,
    },
    repeatBtnText: {
        fontFamily: 'SpaceGrotesk_700Bold',
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
