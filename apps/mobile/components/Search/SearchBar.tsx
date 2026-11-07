import {
    IconButton,
    useDesignTheme,
    useThemedStyles,
    type DesignTheme,
} from "@rockit/ui";
import { Search, X } from "@rockit/ui/icons";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import { useVocabulary } from "@/lib/vocabulary";

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    isSearching: boolean;
    onClear: () => void;
    placeholder?: string;
}

export default function SearchBar({
    value,
    onChangeText,
    isSearching,
    onClear,
    placeholder,
}: SearchBarProps) {
    const theme = useDesignTheme();
    const styles = useThemedStyles(createStyles);
    const { vocabulary } = useVocabulary();
    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <Search
                    size={18}
                    color={theme.legacy.gray600}
                    style={styles.icon}
                />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder ?? vocabulary.SEARCH}
                    placeholderTextColor={theme.legacy.gray400}
                    value={value}
                    onChangeText={onChangeText}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {value.length > 0 && !isSearching && (
                    <IconButton
                        label={vocabulary.SEARCH_CLEAR}
                        onPress={onClear}
                    >
                        <X size={18} color={theme.legacy.gray600} />
                    </IconButton>
                )}
                {isSearching && (
                    <ActivityIndicator
                        size="small"
                        color={theme.legacy.accent}
                        style={styles.loader}
                    />
                )}
            </View>
        </View>
    );
}

const createStyles = (theme: DesignTheme) =>
    StyleSheet.create({
        container: {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
        },
        inputContainer: {
            backgroundColor: theme.colors["muted"],
            borderRadius: theme.radius.full,
            flexDirection: "row",
            alignItems: "center",
            height: 44,
            paddingHorizontal: theme.spacing.lg,
        },
        icon: {
            marginRight: 10,
        },
        input: {
            flex: 1,
            color: theme.legacy.white,
            fontSize: theme.typography.label,
        },
        clearIcon: {
            marginLeft: 10,
        },
        loader: {
            marginLeft: 10,
        },
    });
