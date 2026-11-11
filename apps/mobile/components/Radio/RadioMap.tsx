import { memo } from "react";
import countries from "@/assets/data/radio-world.json";
import type { BaseStationResponse } from "@rockit/shared";
import { useDesignTheme } from "@rockit/ui";
import { Platform, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useVocabulary } from "@/lib/vocabulary";

/** No tiles, WebView or location permissions: the same SVG runs in RN and RN Web. */
export default memo(function RadioMap({
    selected,
    onCountry,
    stations,
    onStation,
}: {
    selected: string;
    onCountry: (name: string) => void;
    stations: BaseStationResponse[];
    onStation: (station: BaseStationResponse) => void;
}) {
    const theme = useDesignTheme();
    const { vocabulary } = useVocabulary();
    return (
        <View
            style={{
                width: "100%",
                aspectRatio: 2,
                minHeight: theme.layout.artistArtwork,
            }}
        >
            <Svg
                width="100%"
                height="100%"
                viewBox="0 0 720 360"
                accessibilityLabel={vocabulary.RADIO}
            >
                {countries.map((country) => (
                    <Path
                        key={country.name}
                        d={country.d}
                        fill={
                            country.name === selected
                                ? theme.colors.primary
                                : theme.colors.secondary
                        }
                        stroke={theme.colors["border-subtle"]}
                        strokeWidth={0.7}
                        onPress={(event) => {
                            onCountry(country.name);
                            return event;
                        }}
                        accessibilityLabel={country.name}
                        {...(Platform.OS === "web"
                            ? {
                                  "aria-label": country.name,
                                  role: "button",
                                  tabIndex: 0,
                                  onKeyDown: (event: {
                                      key: string;
                                      preventDefault: () => void;
                                  }) => {
                                      if (
                                          event.key === "Enter" ||
                                          event.key === " "
                                      ) {
                                          event.preventDefault();
                                          onCountry(country.name);
                                      }
                                  },
                              }
                            : {})}
                    />
                ))}
                {stations
                    .filter(
                        (station) =>
                            station.geoLat != null && station.geoLong != null
                    )
                    .map((station) => (
                        <Circle
                            key={station.publicId}
                            cx={(station.geoLong! + 180) * 2}
                            cy={(90 - station.geoLat!) * 2}
                            r={4}
                            fill={theme.colors.primary}
                            stroke={theme.colors.foreground}
                            strokeWidth={1}
                            onPress={(event) => {
                                onStation(station);
                                return event;
                            }}
                            accessibilityLabel={station.name}
                            {...(Platform.OS === "web"
                                ? {
                                      "aria-label": station.name,
                                      role: "button",
                                      tabIndex: 0,
                                      onKeyDown: (event: {
                                          key: string;
                                          preventDefault: () => void;
                                      }) => {
                                          if (
                                              event.key === "Enter" ||
                                              event.key === " "
                                          ) {
                                              event.preventDefault();
                                              onStation(station);
                                          }
                                      },
                                  }
                                : {})}
                        />
                    ))}
            </Svg>
        </View>
    );
});
