import { COLORS } from "@/constants/theme";
import { Search, X } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";

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
    placeholder = "Search music or videos...",
}: SearchBarProps) {
    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <Search size={18} color={COLORS.gray600} style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.gray400}
                    value={value}
                    onChangeText={onChangeText}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {value.length > 0 && !isSearching && (
                    <X
                        size={18}
                        color={COLORS.gray600}
                        style={styles.clearIcon}
                        onPress={onClear}
                    />
                )}
                {isSearching && (
                    <ActivityIndicator
                        size="small"
                        color={COLORS.accent}
                        style={styles.loader}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    inputContainer: {
        backgroundColor: "#202020",
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        height: 44,
        paddingHorizontal: 16,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: COLORS.white,
        fontSize: 16,
    },
    clearIcon: {
        marginLeft: 10,
    },
    loader: {
        marginLeft: 10,
    },
});
