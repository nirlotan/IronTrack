/**
 * iOS-inspired component primitives.
 *
 * - Card: rounded grouped-list container with subtle separator support.
 * - ListRow: single row inside a Card; renders a leading icon, title, value, chevron.
 * - SegmentedControl: filled segmented control (UISegmentedControl).
 * - PillButton: filled primary / secondary / ghost pill.
 * - StatTile: large-number tile for dashboards.
 * - ProgressRing: SVG ring with center label, smoothly animated.
 * - GradientFAB: tab-bar center action.
 * - SectionHeader: small uppercase grouped-list header.
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, tokens } from '../theme';
import { useTranslation } from '../i18n';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Card ────────────────────────────────────────────────────────────────────

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Tighter padding for content-heavy cards */
  compact?: boolean;
}

export function Card({ children, style, compact }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainer,
          padding: compact ? tokens.spacing.md : tokens.spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── List row ────────────────────────────────────────────────────────────────

export interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  leading?: React.ReactNode;
  /** Show chevron at the right (LTR) / left (RTL) edge. */
  chevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
  /** Render a hairline separator below. */
  separator?: boolean;
  rightAccessory?: React.ReactNode;
}

export function ListRow({
  title,
  subtitle,
  value,
  leading,
  chevron,
  onPress,
  destructive,
  separator,
  rightAccessory,
}: ListRowProps) {
  const { colors } = useTheme();
  const { isRTL, fontRegular, fontBold } = useTranslation();
  const titleColor = destructive ? colors.error : colors.onSurface;
  const Comp: any = onPress ? Pressable : View;

  return (
    <>
      <Comp
        onPress={onPress}
        style={({ pressed }: any) => [
          styles.row,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            backgroundColor: pressed ? colors.fillTertiary : 'transparent',
          },
        ]}
      >
        {leading ? <View style={styles.rowLeading}>{leading}</View> : null}
        <View style={styles.rowMain}>
          <Text
            numberOfLines={1}
            style={[
              styles.rowTitle,
              { color: titleColor, fontFamily: fontBold, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={2}
              style={[
                styles.rowSubtitle,
                {
                  color: colors.onSurfaceVariant,
                  fontFamily: fontRegular,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightAccessory ?? null}
        {value ? (
          <Text style={[styles.rowValue, { color: colors.onSurfaceVariant, fontFamily: fontRegular }]}>
            {value}
          </Text>
        ) : null}
        {chevron ? (
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={18}
            color={colors.outline}
            style={{ marginLeft: 4 }}
          />
        ) : null}
      </Comp>
      {separator ? (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.separator,
            marginLeft: isRTL ? 0 : tokens.spacing.lg,
            marginRight: isRTL ? tokens.spacing.lg : 0,
          }}
        />
      ) : null}
    </>
  );
}

// ── Segmented control ──────────────────────────────────────────────────────

export interface SegmentedControlProps<T extends string> {
  segments: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({ segments, value, onChange, style }: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const { fontBold } = useTranslation();
  return (
    <View
      style={[
        styles.segmented,
        { backgroundColor: colors.fillTertiary },
        style,
      ]}
    >
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            onPress={() => {
              if (!active) Haptics.selectionAsync();
              onChange(s.value);
            }}
            style={[
              styles.segmentedItem,
              active && {
                backgroundColor: colors.surfaceContainerHigh,
                ...tokens.shadowMicro,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.segmentedLabel,
                {
                  color: active ? colors.onSurface : colors.onSurfaceVariant,
                  fontFamily: fontBold,
                },
              ]}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Pill button ────────────────────────────────────────────────────────────

export interface PillButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PillButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  size = 'md',
  fullWidth,
  disabled,
  style,
}: PillButtonProps) {
  const { colors } = useTheme();
  const { fontBold, isRTL } = useTranslation();

  const heights = { sm: 36, md: 46, lg: 54 };
  const fontSizes = { sm: 14, md: 16, lg: 17 };

  const variants = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    secondary: { bg: colors.fillTertiary, fg: colors.onSurface },
    ghost: { bg: 'transparent', fg: colors.primary },
    destructive: { bg: colors.error, fg: colors.onError },
  } as const;
  const v = variants[variant];

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: v.bg,
          height: heights[size],
          width: fullWidth ? '100%' : undefined,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={fontSizes[size] + 2} color={v.fg} /> : null}
      <Text style={[styles.pillLabel, { color: v.fg, fontFamily: fontBold, fontSize: fontSizes[size] }]}>
        {title}
      </Text>
    </Pressable>
  );
}

// ── Stat tile ──────────────────────────────────────────────────────────────

export interface StatTileProps {
  label: string;
  value: string;
  caption?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  tint?: string;
  onPress?: () => void;
}

export function StatTile({ label, value, caption, icon, tint, onPress }: StatTileProps) {
  const { colors } = useTheme();
  const { fontBold, fontRegular, isRTL } = useTranslation();
  const accent = tint ?? colors.primary;

  const inner = (
    <View style={[styles.statTile, { backgroundColor: colors.surfaceContainer }]}>
      <View style={[styles.statHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.statLabel, { color: colors.onSurfaceVariant, fontFamily: fontBold, textAlign: isRTL ? 'right' : 'left' }]}>
          {label}
        </Text>
        {icon ? <Ionicons name={icon} size={14} color={accent} /> : null}
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.statValue,
          { color: colors.onSurface, fontFamily: fontBold, textAlign: isRTL ? 'right' : 'left' },
        ]}
      >
        {value}
      </Text>
      {caption ? (
        <Text style={[styles.statCaption, { color: accent, fontFamily: fontRegular, textAlign: isRTL ? 'right' : 'left' }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.95 : 1, flex: 1 }]}
    >
      {inner}
    </Pressable>
  );
}

// ── Progress ring ──────────────────────────────────────────────────────────

export interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  gradient?: boolean;
}

export function ProgressRing({
  progress,
  size = 120,
  stroke = 12,
  color,
  trackColor,
  label,
  sublabel,
  gradient = true,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const { fontBold, fontRegular } = useTranslation();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));

  const dashOffset = useSharedValue(circumference);

  useEffect(() => {
    dashOffset.value = withTiming(circumference * (1 - clamped), {
      duration: 800,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
    });
  }, [clamped, circumference]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  const strokeColor = color ?? colors.primary;
  const track = trackColor ?? colors.fillTertiary;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {gradient ? (
          <Defs>
            <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={strokeColor} stopOpacity="1" />
              <Stop offset="1" stopColor={strokeColor} stopOpacity="0.65" />
            </SvgGradient>
          </Defs>
        ) : null}
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={gradient ? 'url(#ringGrad)' : strokeColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {label ? (
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ color: colors.onSurface, fontFamily: fontBold, fontSize: size / 4.5 }}>
            {label}
          </Text>
          {sublabel ? (
            <Text style={{ color: colors.onSurfaceVariant, fontFamily: fontRegular, fontSize: 11, marginTop: 2 }}>
              {sublabel}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ── Gradient FAB ───────────────────────────────────────────────────────────

export interface GradientFABProps {
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  size?: number;
  label?: string;
}

export function GradientFAB({ onPress, icon = 'add', size = 60, label }: GradientFABProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.92, { damping: 14, stiffness: 220 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={{ alignItems: 'center' }}
    >
      <Animated.View
        style={[
          styles.fab,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            transform: [{ scale }],
          },
        ]}
      >
        <Ionicons name={icon} size={size * 0.55} color={colors.onPrimary} />
      </Animated.View>
      {label ? (
        <Text style={{ color: colors.onSurfaceVariant, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 10, marginTop: 4, letterSpacing: 0.8 }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ── Section header ─────────────────────────────────────────────────────────

export interface SectionHeaderProps {
  title: string;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, trailing, style }: SectionHeaderProps) {
  const { colors } = useTheme();
  const { fontBold, isRTL } = useTranslation();
  return (
    <View
      style={[
        styles.sectionHeader,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
        style,
      ]}
    >
      <Text
        style={[
          styles.sectionHeaderTitle,
          { color: colors.onSurfaceVariant, fontFamily: fontBold, textAlign: isRTL ? 'right' : 'left' },
        ]}
      >
        {title.toUpperCase()}
      </Text>
      {trailing}
    </View>
  );
}

// ── Large title (iOS navigation-style page header) ──────────────────────────

export interface LargeTitleProps {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}

export function LargeTitle({ title, subtitle, trailing }: LargeTitleProps) {
  const { colors } = useTheme();
  const { fontBold, fontRegular, isRTL } = useTranslation();
  return (
    <View style={[styles.largeTitle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.onSurface,
            fontFamily: fontBold,
            fontSize: tokens.type.largeTitle,
            letterSpacing: -0.6,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: colors.onSurfaceVariant,
              fontFamily: fontRegular,
              fontSize: 14,
              marginTop: 2,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────

export function Badge({ label, color }: { label: string; color?: string }) {
  const { colors } = useTheme();
  const { fontBold } = useTranslation();
  const tint = color ?? colors.primary;
  return (
    <View style={[styles.badge, { backgroundColor: tint }]}>
      <Text style={{ color: colors.onPrimary, fontFamily: fontBold, fontSize: 10, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
  },
  row: {
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: tokens.spacing.lg,
    alignItems: 'center',
    gap: 12,
  },
  rowLeading: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16 },
  rowSubtitle: { fontSize: 13 },
  rowValue: { fontSize: 15 },
  segmented: {
    borderRadius: tokens.radius.md,
    padding: 3,
    flexDirection: 'row',
    height: 32,
  },
  segmentedItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md - 3,
    paddingHorizontal: 8,
  },
  segmentedLabel: { fontSize: 13 },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.xl,
    gap: 8,
  },
  pillLabel: { letterSpacing: 0.2 },
  statTile: {
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    flex: 1,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  statHeader: { alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  statValue: { fontSize: 28, letterSpacing: -0.5, marginTop: 6 },
  statCaption: { fontSize: 12 },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
  },
  sectionHeader: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderTitle: { fontSize: 12, letterSpacing: 0.6 },
  largeTitle: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.md,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
    alignSelf: 'flex-start',
  },
});
