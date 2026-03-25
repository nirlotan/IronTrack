import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ScreenBackground } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/appStore';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t, isRTL, fontBold } = useTranslation();
  const insets = useSafeAreaInsets();

  const language = useAppStore((s) => s.language);
  const themeMode = useAppStore((s) => s.themeMode);
  const restTimerSeconds = useAppStore((s) => s.restTimerSeconds);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const setRestTimerSeconds = useAppStore((s) => s.setRestTimerSeconds);

  return (
    <ScreenBackground style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.primary, textAlign: isRTL ? 'right' : 'left', fontFamily: fontBold }]}>
          {t('settings_title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Language */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.outlineVariant, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('language')}
          </Text>
          <View style={styles.optionRow}>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                {
                  backgroundColor:
                    language === 'en' ? colors.primaryContainer : colors.surfaceContainerHighest,
                },
              ]}
              onPress={() => setLanguage('en')}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color:
                      language === 'en' ? colors.onPrimaryContainer : colors.onSurface,
                  },
                ]}
              >
                {t('english')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                {
                  backgroundColor:
                    language === 'he' ? colors.primaryContainer : colors.surfaceContainerHighest,
                },
              ]}
              onPress={() => setLanguage('he')}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color:
                      language === 'he' ? colors.onPrimaryContainer : colors.onSurface,
                  },
                ]}
              >
                {t('hebrew')}
              </Text>
            </TouchableOpacity>
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
  sectionLabel: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  optionText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
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
});
