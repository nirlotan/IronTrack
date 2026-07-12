/**
 * Profile — user identity, body-weight log, units, theme, language, integrations.
 */
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Switch,
    Modal,
    TextInput,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ScreenBackground, tokens } from '../../src/theme';
import { useTranslation, availableLocales } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import {
    Card,
    ListRow,
    PillButton,
    SectionHeader,
    LargeTitle,
    StatTile,
    SegmentedControl,
} from '../../src/components/ios';
import Constants from 'expo-constants';
import { isHealthKitSupported } from '../../src/utils/health';
import { accentColors } from '../../src/theme/colors';
import { formatWeight, fromDisplayWeight, toDisplayWeight, weightUnitLabel } from '../../src/utils/units';

type ThemeOption = 'dark' | 'light' | 'system';
type AccentOption = 'green' | 'purple' | 'orange';
type UnitsOption = 'metric' | 'imperial';

export default function ProfileScreen() {
    const { colors, isDark } = useTheme();
    const { t, isRTL, fontBold, fontRegular } = useTranslation();
    const insets = useSafeAreaInsets();

    const language = useAppStore((s) => s.language);
    const themeMode = useAppStore((s) => s.themeMode);
    const accentColor = useAppStore((s) => s.accentColor);
    const restTimerSeconds = useAppStore((s) => s.restTimerSeconds);
    const autoStartRestTimer = useAppStore((s) => s.autoStartRestTimer);
    const weeklyGoal = useAppStore((s) => s.weeklyGoal);
    const units = useAppStore((s) => s.units);
    const healthSyncEnabled = useAppStore((s) => s.healthSyncEnabled);
    const bodyWeightLog = useAppStore((s) => s.bodyWeightLog);
    const sessions = useAppStore((s) => s.sessions);
    const unlockedAchievements = useAppStore((s) => s.unlockedAchievements);

    const setLanguage = useAppStore((s) => s.setLanguage);
    const setThemeMode = useAppStore((s) => s.setThemeMode);
    const setAccentColor = useAppStore((s) => s.setAccentColor);
    const setRestTimerSeconds = useAppStore((s) => s.setRestTimerSeconds);
    const setAutoStartRestTimer = useAppStore((s) => s.setAutoStartRestTimer);
    const setWeeklyGoal = useAppStore((s) => s.setWeeklyGoal);
    const setUnits = useAppStore((s) => s.setUnits);
    const setHealthSyncEnabled = useAppStore((s) => s.setHealthSyncEnabled);
    const addBodyWeight = useAppStore((s) => s.addBodyWeight);
    const deleteBodyWeight = useAppStore((s) => s.deleteBodyWeight);

    const [langOpen, setLangOpen] = useState(false);
    const [bwOpen, setBwOpen] = useState(false);
    const [bwInput, setBwInput] = useState('');

    const currentLocale = availableLocales.find((l) => l.code === language);
    const lastBw = bodyWeightLog[0];

    const handleAddWeight = useCallback(() => {
        const v = parseFloat(bwInput.replace(',', '.'));
        if (!isFinite(v) || v <= 0) return;
        // Input arrives in the user's display unit; storage stays kg.
        addBodyWeight(fromDisplayWeight(v, units));
        setBwInput('');
        setBwOpen(false);
    }, [bwInput, addBodyWeight, units]);

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
                <LargeTitle title={t('profile_title')} />

                {/* ─── My stats ──────────────────────────────────────────── */}
                <Animated.View entering={FadeInDown.springify()}>
                    <SectionHeader title={t('my_stats')} />
                    <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
                        <StatTile label={t('total_workouts')} value={String(sessions.length)} icon="trophy" />
                        <StatTile
                            label={t('body_weight')}
                            value={lastBw ? `${toDisplayWeight(lastBw.weightKg, units)}` : '—'}
                            caption={lastBw ? weightUnitLabel(units) : undefined}
                            icon="body"
                            tint={colors.secondary}
                            onPress={() => setBwOpen(true)}
                        />
                        <StatTile
                            label={t('achievements')}
                            value={String(unlockedAchievements.length)}
                            icon="ribbon"
                            tint={colors.tertiary}
                        />
                    </View>
                </Animated.View>

                {/* ─── Goals ─────────────────────────────────────────────── */}
                <SectionHeader title={t('weekly_goal')} />
                <Card style={{ padding: tokens.spacing.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 32 }}>
                            {weeklyGoal}{' '}
                            <Text style={{ fontSize: 14, color: colors.onSurfaceVariant }}>{t('workouts_this_week')}</Text>
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Pressable
                                onPress={() => setWeeklyGoal(weeklyGoal - 1)}
                                style={[styles.stepBtn, { backgroundColor: colors.fillTertiary }]}
                            >
                                <Ionicons name="remove" size={20} color={colors.onSurface} />
                            </Pressable>
                            <Pressable
                                onPress={() => setWeeklyGoal(weeklyGoal + 1)}
                                style={[styles.stepBtn, { backgroundColor: colors.primary }]}
                            >
                                <Ionicons name="add" size={20} color={colors.onPrimary} />
                            </Pressable>
                        </View>
                    </View>
                </Card>

                {/* ─── Units ─────────────────────────────────────────────── */}
                <SectionHeader title={t('units')} />
                <SegmentedControl<UnitsOption>
                    value={units}
                    onChange={setUnits}
                    segments={[
                        { value: 'metric', label: t('units_metric') },
                        { value: 'imperial', label: t('units_imperial') },
                    ]}
                />

                {/* ─── Theme ─────────────────────────────────────────────── */}
                <SectionHeader title={t('theme')} />
                <SegmentedControl<ThemeOption>
                    value={themeMode}
                    onChange={setThemeMode}
                    segments={[
                        { value: 'dark', label: t('theme_dark') },
                        { value: 'light', label: t('theme_light') },
                        { value: 'system', label: t('theme_system') },
                    ]}
                />

                {/* ─── Accent ────────────────────────────────────────────── */}
                <SectionHeader title={t('accent_color')} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {(['green', 'purple', 'orange'] as AccentOption[]).map((acc) => {
                        const previews: Record<AccentOption, string> = {
                            green: accentColors.green[isDark ? 'dark' : 'light'].primary,
                            purple: accentColors.purple[isDark ? 'dark' : 'light'].primary,
                            orange: accentColors.orange[isDark ? 'dark' : 'light'].primary,
                        };
                        const active = accentColor === acc;
                        return (
                            <Pressable
                                key={acc}
                                onPress={() => setAccentColor(acc)}
                                style={{
                                    flex: 1,
                                    height: 64,
                                    borderRadius: tokens.radius.lg,
                                    backgroundColor: colors.surfaceContainer,
                                    borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                                    borderColor: active ? previews[acc] : colors.separator,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                }}
                            >
                                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: previews[acc] }} />
                                <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 11 }}>
                                    {t(`accent_${acc}` as any)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* ─── Rest timer ────────────────────────────────────────── */}
                <SectionHeader title={t('rest_timer_duration')} />
                <Card style={{ padding: 0 }}>
                    <View style={{ paddingHorizontal: tokens.spacing.lg, paddingVertical: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                            {[60, 90, 120, 150, 180].map((s) => {
                                const active = restTimerSeconds === s;
                                return (
                                    <Pressable
                                        key={s}
                                        onPress={() => setRestTimerSeconds(s)}
                                        style={{
                                            flex: 1,
                                            minWidth: 56,
                                            paddingVertical: 10,
                                            borderRadius: 10,
                                            backgroundColor: active ? colors.primary : colors.fillTertiary,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{ color: active ? colors.onPrimary : colors.onSurface, fontFamily: fontBold, fontSize: 14 }}>
                                            {s}s
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />
                    <ListRow
                        title={t('auto_start_rest_timer')}
                        subtitle={t('auto_start_rest_timer_hint')}
                        rightAccessory={
                            <Switch
                                value={autoStartRestTimer}
                                onValueChange={setAutoStartRestTimer}
                                trackColor={{ false: colors.fillTertiary, true: colors.primary }}
                            />
                        }
                    />
                </Card>

                {/* ─── Integrations ──────────────────────────────────────── */}
                {Platform.OS === 'ios' ? (
                    <>
                        <SectionHeader title={t('about')} />
                        <Card style={{ padding: 0 }}>
                            <ListRow
                                title={t('sync_apple_health')}
                                subtitle={
                                    isHealthKitSupported() ? t('sync_apple_health_hint') : t('health_unavailable')
                                }
                                leading={
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF2D55' + '22', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="heart" size={16} color="#FF2D55" />
                                    </View>
                                }
                                rightAccessory={
                                    <Switch
                                        value={healthSyncEnabled && isHealthKitSupported()}
                                        disabled={!isHealthKitSupported()}
                                        onValueChange={setHealthSyncEnabled}
                                        trackColor={{ false: colors.fillTertiary, true: colors.primary }}
                                    />
                                }
                                separator
                            />
                            <ListRow
                                title={t('language')}
                                value={currentLocale?.nativeName ?? 'English'}
                                onPress={() => setLangOpen(true)}
                                chevron
                                leading={
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="language" size={16} color={colors.onSurfaceVariant} />
                                    </View>
                                }
                                separator
                            />
                            <ListRow
                                title={t('version_label')}
                                value={Constants.expoConfig?.version ?? '1.0'}
                                leading={
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.fillTertiary, alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="information-circle" size={16} color={colors.onSurfaceVariant} />
                                    </View>
                                }
                            />
                        </Card>
                    </>
                ) : (
                    <>
                        <SectionHeader title={t('about')} />
                        <Card style={{ padding: 0 }}>
                            <ListRow
                                title={t('language')}
                                value={currentLocale?.nativeName ?? 'English'}
                                onPress={() => setLangOpen(true)}
                                chevron
                                separator
                            />
                            <ListRow title={t('version_label')} value={Constants.expoConfig?.version ?? '1.0'} />
                        </Card>
                    </>
                )}

                {/* ─── Body weight log ───────────────────────────────────── */}
                {bodyWeightLog.length > 0 ? (
                    <>
                        <SectionHeader title={t('body_weight_log')} />
                        <Card style={{ padding: 0 }}>
                            {bodyWeightLog.slice(0, 10).map((e, i, arr) => (
                                <ListRow
                                    key={e.id}
                                    title={formatWeight(e.weightKg, units)}
                                    subtitle={e.date}
                                    separator={i < arr.length - 1}
                                    rightAccessory={
                                        <Pressable onPress={() => deleteBodyWeight(e.id)} hitSlop={10} style={{ padding: 4 }}>
                                            <Ionicons name="trash-outline" size={16} color={colors.outline} />
                                        </Pressable>
                                    }
                                />
                            ))}
                        </Card>
                    </>
                ) : null}
            </ScrollView>

            {/* ─── Language modal ──────────────────────────────────────── */}
            <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setLangOpen(false)}>
                    <Pressable style={[styles.modalSheet, { backgroundColor: colors.surfaceContainer }]} onPress={() => { }}>
                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 18, marginBottom: 14 }}>
                            {t('language')}
                        </Text>
                        {availableLocales.map((loc, i) => {
                            const active = loc.code === language;
                            return (
                                <Pressable
                                    key={loc.code}
                                    onPress={() => {
                                        setLanguage(loc.code as any);
                                        setLangOpen(false);
                                    }}
                                    style={{
                                        paddingVertical: 14,
                                        flexDirection: isRTL ? 'row-reverse' : 'row',
                                        alignItems: 'center',
                                        gap: 12,
                                        borderBottomWidth: i < availableLocales.length - 1 ? StyleSheet.hairlineWidth : 0,
                                        borderBottomColor: colors.separator,
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 16 }}>{loc.nativeName}</Text>
                                        <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 12 }}>{loc.name}</Text>
                                    </View>
                                    {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                                </Pressable>
                            );
                        })}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ─── Body weight modal ───────────────────────────────────── */}
            <Modal visible={bwOpen} transparent animationType="fade" onRequestClose={() => setBwOpen(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setBwOpen(false)}>
                    <Pressable style={[styles.modalSheet, { backgroundColor: colors.surfaceContainer }]} onPress={() => { }}>
                        <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: 18, marginBottom: 14 }}>
                            {t('add_weight_entry')}
                        </Text>
                        <TextInput
                            value={bwInput}
                            onChangeText={setBwInput}
                            placeholder="75.5"
                            placeholderTextColor={colors.outline}
                            keyboardType="decimal-pad"
                            autoFocus
                            style={{
                                backgroundColor: colors.fillTertiary,
                                borderRadius: 12,
                                paddingHorizontal: 14,
                                paddingVertical: 14,
                                color: colors.onSurface,
                                fontSize: 24,
                                fontFamily: fontBold,
                                textAlign: 'center',
                                marginBottom: 16,
                            }}
                            returnKeyType="done"
                            onSubmitEditing={handleAddWeight}
                        />
                        <PillButton title={t('save')} icon="checkmark" fullWidth onPress={handleAddWeight} disabled={!bwInput.trim()} />
                    </Pressable>
                </Pressable>
            </Modal>
        </ScreenBackground>
    );
}

const styles = StyleSheet.create({
    stepBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
