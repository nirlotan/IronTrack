import { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

// Emil's principles:
// - Start from scale(0.95), never scale(0) — nothing appears from nothing
// - Stagger delays: 30-80ms between items
// - UI animations under 300ms
// - ease-out for entering elements (starts fast, feels responsive)
const ENTER_DURATION = 350;
const STAGGER_DELAY = 50; // ms between each item
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

interface FadeInStaggerProps {
  index: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxDelay?: number;
}

export function FadeInStagger({
  index,
  children,
  style,
  maxDelay = 300,
}: FadeInStaggerProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  const delay = Math.min(index * STAGGER_DELAY, maxDelay);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: ENTER_DURATION, easing: EASE_OUT })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: ENTER_DURATION, easing: EASE_OUT })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
