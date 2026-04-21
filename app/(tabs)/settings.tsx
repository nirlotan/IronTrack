import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, LayoutAnimation, Platform, UIManager } from 'react-native';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ScreenBackground } from '../../src/theme';
import { useTranslation, availableLocales } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { useState, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t, isRTL, fontBold } = useTranslation();
  const insets = useSafeAreaInsets();

  const language = useAppStore((s) => s.language);
  const themeMode = useAppStore((s) => s.themeMode);
  const accentColor = useAppStore((s) => s.accentColor);
  const restTimerSeconds = useAppStore((s) => s.restTimerSeconds);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const setAccentColor = useAppStore((s) => s.setAccentColor);
  const setRestTimerSeconds = useAppStore((s) => s.setRestTimerSeconds);
  const autoStartRestTimer = useAppStore((s) => s.autoStartRestTimer);
  const setAutoStartRestTimer = useAppStore((s) => s.setAutoStartRestTimer);

  const [isLanguageExpanded, setIsLanguageExpanded] = useState(false);

  const toggleLanguageExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsLanguageExpanded(!isLanguageExpanded);
  };

  const displayedLocales = useMemo(() => {
    if (isLanguageExpanded) return availableLocales;
    return availableLocales.filter(l => l.code === language);
  }, [isLanguageExpanded, language]);

  return (
    <ScreenBackground style={styles.container}>
      <View style={[styles.header, { paddingTop: 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.primary, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
          {t('settings_title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        {/* Language */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.sectionLabel, { color: colors.outlineVariant, textAlign: isRTL ? 'right' : 'left', marginBottom: 0 }]}>
              {t('language')}
            </Text>
          </View>
          
          <View style={styles.languageList}>
            {displayedLocales.map((locale) => {
              const isSelected = language === locale.code;

              return (
                <AnimatedPressable
                  key={locale.code}
                  style={[
                    styles.languageOption,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryContainer
                        : colors.surfaceContainerLow,
                      borderColor: isSelected ? colors.primary : colors.outlineVariant,
                      borderWidth: 1.5,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  onPress={() => {
                    if (!isLanguageExpanded) {
                      toggleLanguageExpand();
                    } else {
                      if (!isSelected) {
                        setLanguage(locale.code as any);
                      }
                      toggleLanguageExpand();
                    }
                  }}
                  haptic
                  accessibilityRole="radio"
                  accessibilityLabel={locale.nativeName}
                >
                  <View style={styles.languageInfo}>
                    <Text
                      style={[
                        styles.languageNativeName,
                        {
                          color: isSelected ? colors.onPrimaryContainer : colors.onSurface,
                          textAlign: isRTL ? 'right' : 'left',
                          fontFamily: fontBold,
                        },
                      ]}
                    >
                      {locale.nativeName}
                    </Text>
                    <Text
                      style={[
                        styles.languageName,
                        {
                          color: isSelected ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                          textAlign: isRTL ? 'right' : 'left',
                        },
                      ]}
                    >
                      {locale.name}
                    </Text>
                  </View>
                  <View 
                    style={[
                      styles.radioCircle, 
                      { 
                        borderColor: isSelected ? colors.primary : colors.outline,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        borderWidth: 2,
                      }
                    ]} 
                  >
                    {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.onPrimary }]} />}
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* Theme */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.outlineVariant, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('theme')}
          </Text>
          <View style={styles.optionRow}>
            {(['dark', 'light', 'system'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor:
                      themeMode === mode ? colors.primaryContainer : colors.surfaceContainerHighest,
                  },
                ]}
                onPress={() => setThemeMode(mode)}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color:
                        themeMode === mode ? colors.onPrimaryContainer : colors.onSurface,
                    },
                  ]}
                >
                  {t(`theme_${mode}` as any)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Accent Color */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.outlineVariant, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('accent_color')}
          </Text>
          <View style={styles.optionRow}>
            {(['green', 'purple', 'orange'] as const).map((acc) => {
              const previewColors = {
                green: '#bef264',
                purple: '#a855f7',
                orange: '#f97316',
              };
              const isSelected = accentColor === acc;

              return (
                <TouchableOpacity
                  key={acc}
                  style={[
                    styles.optionBtn,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryContainer
                        : colors.surfaceContainerHighest,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      gap: 8,
                    },
                  ]}
                  onPress={() => setAccentColor(acc)}
                >
                  <View
                    style={[
                      styles.colorCircle,
                      { backgroundColor: previewColors[acc] },
                    ]}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: isSelected ? colors.onPrimaryContainer : colors.onSurface,
                      },
                    ]}
                  >
                    {t(`accent_${acc}` as any)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Rest Timer Duration */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.outlineVariant, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('rest_timer_duration')}
          </Text>
          <View style={styles.timerRow}>
            {[60, 90, 120, 150, 180].map((seconds) => (
              <TouchableOpacity
                key={seconds}
                style={[
                  styles.timerBtn,
                  {
                    backgroundColor:
                      restTimerSeconds === seconds
                        ? colors.primaryContainer
                        : colors.surfaceContainerHighest,
                  },
                ]}
                onPress={() => setRestTimerSeconds(seconds)}
                accessibilityRole="radio"
                accessibilityState={{ checked: restTimerSeconds === seconds }}
                accessibilityLabel={`${seconds} ${t('minutes')}`}
              >
                <Text
                  style={[
                    styles.timerBtnText,
                    {
                      color:
                        restTimerSeconds === seconds
                          ? colors.onPrimaryContainer
                          : colors.onSurface,
                    },
                  ]}
                >
                  {seconds}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.toggleRow,
            { backgroundColor: colors.surfaceContainerLow, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View style={styles.toggleTextWrap}>
            <Text
              style={[
                styles.toggleTitle,
                { color: colors.onSurface, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold },
              ]}
            >
              {t('auto_start_rest_timer')}
            </Text>
            <Text
              style={[
                styles.toggleSubtitle,
                { color: colors.onSurfaceVariant, textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {t('auto_start_rest_timer_hint')}
            </Text>
          </View>
          <Switch
            value={autoStartRestTimer}
            onValueChange={setAutoStartRestTimer}
            trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
            thumbColor={autoStartRestTimer ? colors.primary : colors.outlineVariant}
          />
        </View>

        {/* App Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.surfaceContainerLow }]}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>IRONTRACK</Text>
          <Text style={[styles.infoBy, { color: colors.onSurfaceVariant }]}>by Yahav Lotan</Text>
          <Text style={[styles.infoVersion, { color: colors.outlineVariant }]}>v1.0.0</Text>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 12 },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 26,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  section: { marginBottom: 32 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  optionRow: { flexDirection: 'row', gap: 10 },
  languageList: { gap: 10, flexDirection: 'column' },
  languageOption: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageNativeName: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  languageName: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionBtn: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  optionText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  colorCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timerRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  timerBtn: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 60,
    alignItems: 'center',
  },
  timerBtnText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  infoBox: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  infoTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  infoBy: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginTop: 4,
  },
  infoVersion: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  toggleRow: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
  },
  toggleSubtitle: {
    marginTop: 3,
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
});
