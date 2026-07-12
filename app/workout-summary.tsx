/**
 * Workout Summary — post-finish celebration screen.
 * Shows duration / volume / sets with count-up numerals, new PRs,
 * freshly unlocked achievements, and a 1–5 star rating.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, ScreenBackground, tokens } from '../src/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/appStore';
import { Card, PillButton, AnimatedNumber, SectionHeader } from '../src/components/ios';
import { getExerciseName } from '../src/utils/helpers';
import { formatWeightCompact, weightUnitLabel } from '../src/utils/units';
import { achievements as achievementCatalog } from '../src/data/achievements';

export default function WorkoutSummaryScreen() {
    const { colors } = useTheme();
    const { t, isRTL, language, fontBold, fontRegular } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const sessions = useAppStore((s) => s.sessions);
    const exercises = useAppStore((s) => s.exercises);
    const units = useAppStore((s) => s.units);
    const rateSession = useAppStore((s) => s.rateSession);
    const recentlyUnlocked = useAppStore((s) => s.recentlyUnlockedAchievements);
    const saveSessionAsTemplate = useAppStore((s) => s.saveSessionAsTemplate);

    const session = useMemo(() => sessions.find((s) => s.id === id), [sessions, id]);
    const [rating, setRating] = useState<number>(session?.rating ?? 0);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateSaved, setTemplateSaved] = useState(false);

    const stats = useMemo(() => {
        if (!session) return { completedSets: 0, prSets: [] as Array<{ name: string; kinds: string[] }>, avgRpe: null as number | null };
        let completedSets = 0;
        let rpeSum = 0;
        let rpeCount = 0;
        const prSets: Array<{ name: string; kinds: string[] }> = [];
        for (const ex of session.exercises) {
            const info = exercises.find((e) => e.id === ex.exerciseId);
            for (const set of ex.sets) {
                if (!set.isCompleted) continue;
                completedSets += 1;
                if (set.rpe != null) {
                    rpeSum += set.rpe;
                    rpeCount += 1;
                }
                if (set.isPR && set.prKinds?.length) {
                    prSets.push({
                        name: info ? getExerciseName(info, t, language) : ex.exerciseId,
                        kinds: set.prKinds.map((k) => t(`pr_${k}` as any)),
                    });
                }
            }
        }
        return {
            completedSets,
            prSets,
            avgRpe: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
        };
    }, [session, exercises, t, language]);

    const newAchievements = useMemo(
        () => recentlyUnlocked
            .map((aid) => achievementCatalog.find((a) => a.id === aid))
            .filter(Boolean),
        [recentlyUnlocked]
    );

    // Deep link to a gone session — bail out gracefully (never during render).
    useEffect(() => {
        if (!session) router.replace('/(tabs)');
    }, [session]);

    if (!session) return null;

    const handleRate = (v: number) => {
        Haptics.selectionAsync();
        setRating(v);
        rateSession(session.id, v);
    };

    const handleDone = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.replace('/(tabs)');
    };

    const handleOpenTemplateModal = () => {
        Haptics.selectionAsync();
        setTemplateName(session.name || '');
        setTemplateModalOpen(true);
    };

    const handleSaveTemplate = () => {
        const created = saveSessionAsTemplate(session.id, templateName);
        if (!created) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTemplateModalOpen(false);
        setTemplateSaved(true);
    };

    const unit = weightUnitLabel(units);

    return (
        <ScreenBackground style={{ flex: 1 }}>
            <ScrollView
                contentContainerStyle={{
                    paddingTop: insets.top + 24,
                    paddingBottom: insets.bottom + 40,
                    paddingHorizontal: tokens.spacing.lg,
                    gap: tokens.spacing.md,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── Hero ────────────────────────────────────────────── */}
                <Animated.View entering={ZoomIn.springify().damping(14)} style={{ alignItems: 'center', gap: 10 }}>
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDim]}
                        style={[styles.trophyCircle, { shadowColor: colors.primary }]}
                    >
                        <Ionicons name="trophy" size={44} color={colors.onPrimary} />
                    </LinearGradient>
                    <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: tokens.type.title1, letterSpacing: -0.5 }}>
                        {t('workout_complete')}
                    </Text>
                    <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 15 }}>
                        {t('congrats')} · {session.name}
                    </Text>
                </Animated.View>

                {/* ─── Numbers ─────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(120).springify()}>
                    <Card hero>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-around' }}>
                            <SummaryStat
                                label={t('duration')}
                                value={session.durationMinutes ?? 0}
                                suffix={t('minutes')}
                            />
                            <View style={[styles.vDivider, { backgroundColor: colors.separator }]} />
                            <SummaryStat
                                label={t('total_volume')}
                                value={session.totalVolume ?? 0}
                                format={(v) => formatWeightCompact(v, units)}
                                suffix={unit}
                            />
                            <View style={[styles.vDivider, { backgroundColor: colors.separator }]} />
                            <SummaryStat label={t('sets_completed')} value={stats.completedSets} suffix="" />
                        </View>
                        {stats.avgRpe != null ? (
                            <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 12, textAlign: 'center', marginTop: 12 }}>
                                {t('avg_rpe')}: {stats.avgRpe}
                            </Text>
                        ) : null}
                    </Card>
                </Animated.View>

                {/* ─── PRs ─────────────────────────────────────────────── */}
                {stats.prSets.length > 0 ? (
                    <Animated.View entering={FadeInDown.delay(220).springify()}>
                        <SectionHeader title={t('new_prs')} />
                        <Card style={{ gap: 10 }}>
                            {stats.prSets.map((pr, i) => (
                                <View key={`${pr.name}-${i}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={[styles.prDot, { backgroundColor: colors.tertiaryContainer }]}>
                                        <Text style={{ fontSize: 15 }}>🏆</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 15, textAlign: isRTL ? 'right' : 'left' }}>
                                            {pr.name}
                                        </Text>
                                        <Text style={{ color: colors.tertiary, fontFamily: fontRegular, fontSize: 12, textAlign: isRTL ? 'right' : 'left' }}>
                                            {pr.kinds.join(' · ')}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </Card>
                    </Animated.View>
                ) : null}

                {/* ─── Achievements ────────────────────────────────────── */}
                {newAchievements.length > 0 ? (
                    <Animated.View entering={FadeInDown.delay(300).springify()}>
                        <SectionHeader title={t('achievements')} />
                        <Card style={{ gap: 12 }}>
                            {newAchievements.map((a) => (
                                <View key={a!.id} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
                                    <Text style={{ fontSize: 30 }}>{a!.emoji}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 15, textAlign: isRTL ? 'right' : 'left' }}>
                                            {t(a!.titleKey as any)}
                                        </Text>
                                        <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 12, textAlign: isRTL ? 'right' : 'left' }}>
                                            {t(a!.descriptionKey as any)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </Card>
                    </Animated.View>
                ) : null}

                {/* ─── Rating ──────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(380).springify()}>
                    <SectionHeader title={t('rate_workout')} />
                    <Card>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
                            {[1, 2, 3, 4, 5].map((v) => (
                                <Pressable key={v} onPress={() => handleRate(v)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${v}/5`}>
                                    <Ionicons
                                        name={rating >= v ? 'star' : 'star-outline'}
                                        size={34}
                                        color={rating >= v ? colors.primary : colors.outline}
                                    />
                                </Pressable>
                            ))}
                        </View>
                    </Card>
                </Animated.View>

                <View style={{ height: 8 }} />
                <PillButton
                    title={templateSaved ? t('template_created') : t('save_as_template')}
                    icon={templateSaved ? 'checkmark-circle' : 'bookmark-outline'}
                    variant="secondary"
                    size="lg"
                    fullWidth
                    disabled={templateSaved}
                    onPress={handleOpenTemplateModal}
                />
                <PillButton title={t('done')} icon="checkmark" size="lg" fullWidth onPress={handleDone} />
            </ScrollView>

            {/* ─── Save as template modal ──────────────────────────── */}
            <Modal
                visible={templateModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setTemplateModalOpen(false)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setTemplateModalOpen(false)}>
                    <Pressable style={[styles.modalSheet, { backgroundColor: colors.surfaceContainer }]} onPress={() => { }}>
                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 18, marginBottom: 14 }}>
                            {t('save_as_template')}
                        </Text>
                        <TextInput
                            value={templateName}
                            onChangeText={setTemplateName}
                            placeholder={t('template_name')}
                            placeholderTextColor={colors.outline}
                            style={{
                                backgroundColor: colors.fillTertiary,
                                borderRadius: 12,
                                paddingHorizontal: 14,
                                paddingVertical: 12,
                                color: colors.onSurface,
                                fontSize: 16,
                                marginBottom: 16,
                            }}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={handleSaveTemplate}
                            textAlign={isRTL ? 'right' : 'left'}
                        />
                        <PillButton
                            title={t('save')}
                            icon="bookmark"
                            fullWidth
                            onPress={handleSaveTemplate}
                            disabled={!templateName.trim()}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </ScreenBackground>
    );
}

function SummaryStat({
    label,
    value,
    suffix,
    format,
}: {
    label: string;
    value: number;
    suffix: string;
    format?: (v: number) => string;
}) {
    const { colors } = useTheme();
    const { fontBold } = useTranslation();
    return (
        <View style={{ alignItems: 'center', gap: 2, flex: 1 }}>
            <AnimatedNumber
                value={value}
                format={format}
                duration={900}
                style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 32, letterSpacing: -0.8 }}
            />
            <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontBold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                {label}{suffix ? ` (${suffix})` : ''}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    trophyCircle: {
        width: 92,
        height: 92,
        borderRadius: 46,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOpacity: 0.5,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
    },
    vDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
    prDot: {
        width: 34,
        height: 34,
        borderRadius: 17,
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
