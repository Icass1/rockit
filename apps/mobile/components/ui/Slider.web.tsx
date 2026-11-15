import type { ComponentProps } from "react";
import type NativeSlider from "@react-native-community/slider";
import { View } from "react-native";

/** Browser range control with the same value/commit contract as the native slider. */
export default function Slider({
    value = 0,
    minimumValue = 0,
    maximumValue = 1,
    step = 1,
    onValueChange,
    onSlidingComplete,
    minimumTrackTintColor,
    accessibilityLabel,
    disabled,
    style,
}: ComponentProps<typeof NativeSlider>) {
    return (
        <View style={style}>
            <input
                type="range"
                aria-label={accessibilityLabel}
                min={minimumValue}
                max={maximumValue}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(event) =>
                    onValueChange?.(Number(event.currentTarget.value))
                }
                onPointerUp={(event) =>
                    onSlidingComplete?.(Number(event.currentTarget.value))
                }
                onKeyUp={(event) =>
                    onSlidingComplete?.(Number(event.currentTarget.value))
                }
                style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 40,
                    margin: 0,
                    accentColor:
                        typeof minimumTrackTintColor === "string"
                            ? minimumTrackTintColor
                            : undefined,
                }}
            />
        </View>
    );
}
