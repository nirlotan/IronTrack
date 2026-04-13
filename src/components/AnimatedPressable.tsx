import { useCallback } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

// Emil's strong ease-out: starts fast, feels responsive
const PRESS_EASING = Easing.bezier(0.23, 1, 0.32, 1);
const SCALE_DOWN = 0.97;
const PRESS_DURATION = 160; // ms — button press feedback: 100-160ms

interface AnimatedPressableProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scaleValue?: number;
  haptic?: boolean;
  disabled?: boolean;
  accessibilityRole?: string;
  accessibilityLabel?: string;
}

export function AnimatedPressable({
  onPress,
  style,
  children,
  scaleValue = SCALE_DOWN,
  haptic = false,
  disabled = false,
  accessibilityRole,
  accessibilityLabel,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      scale.value = withTiming(scaleValue, {
        duration: PRESS_DURATION,
        easing: PRESS_EASING,
      });
      opacity.value = withTiming(0.85, {
        duration: PRESS_DURATION,
        easing: PRESS_EASING,
      });
    })
    .onFinalize(() => {
      scale.value = withTiming(1, {
        duration: PRESS_DURATION,
        easing: PRESS_EASING,
      });
      opacity.value = withTiming(1, {
        duration: PRESS_DURATION,
        easing: PRESS_EASING,
      });
    })
    .onEnd(() => {
      if (haptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    });

  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress();
    }
  }, [disabled, onPress]);

  // GestureDetector doesn't fire onPress by itself — we use onEnd + runOnJS
  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      'worklet';
      scale.value = withTiming(scaleValue, {
        duration: PRESS_DURATION,
        easing: PRESS_EASING,
      });
      opacity.value = withTiming(0.85, {
        duration: PRESS_DURATION,
        easing: PRESS_EASING,
      });
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withTiming(1, {
        duration: PRESS_DURATION,
        easing: PRESS_EASING,
      });
      opacity.value = withTiming(1, {
        duration: PRESS_DURATION,
        easing: PRESS_EASING,
      });
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[animatedStyle, style]}
        accessible
        accessibilityRole={(accessibilityRole as any) ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        onTouchEnd={handlePress}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
