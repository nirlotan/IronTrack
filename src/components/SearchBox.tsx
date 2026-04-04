import { View, TextInput, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useTranslation } from '../i18n';

interface SearchBoxProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

export function SearchBox({ value, onChangeText, placeholder }: SearchBoxProps) {
    const { colors } = useTheme();
    const { isRTL, fontRegular } = useTranslation();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.surfaceContainerLow,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                },
            ]}
        >
            <MaterialIcons
                name="search"
                size={18}
                color={colors.outlineVariant}
                style={{ marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }}
            />
            <TextInput
                style={[
                    styles.input,
                    { color: colors.onSurface, fontFamily: fontRegular, textAlign: isRTL ? 'right' : 'left' },
                ]}
                placeholder={placeholder}
                placeholderTextColor={colors.outlineVariant}
                value={value}
                onChangeText={onChangeText}
                returnKeyType="search"
                clearButtonMode="while-editing"
                accessibilityRole="search"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 16,
    },
    input: {
        flex: 1,
        fontSize: 15,
        letterSpacing: 0.2,
    },
});
