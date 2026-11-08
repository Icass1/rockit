import { getTheme } from "@rockit/theme";
import { processColor } from "react-native";

it("all semantic palette values used by native styles are accepted by the native renderer", () => {
    for (const mode of ["dark", "light"] as const) {
        for (const [name, value] of Object.entries(getTheme(mode))) {
            if (name.endsWith("-rgb") || name === "logo-filter") continue;
            expect({ name, mode, value: processColor(value) }).not.toEqual({
                name,
                mode,
                value: undefined,
            });
            expect(processColor(value)).not.toBeNull();
        }
    }
});
