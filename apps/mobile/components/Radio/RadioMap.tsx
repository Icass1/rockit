import { memo } from "react";
import countries from "@/assets/data/radio-world.json";
import {
    locatedRadioStations,
    projectRadioLocation,
    RADIO_MAP_SIZE,
    type BaseStationResponse,
} from "@rockit/shared";
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
                aspectRatio: 1,
            }}
        >
            <Svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${RADIO_MAP_SIZE} ${RADIO_MAP_SIZE}`}
                preserveAspectRatio="xMidYMid meet"
                accessibilityLabel={vocabulary.RADIO}
            >
                {countries.map((country) => (
                    <Path
                        key={country.name}
                        d={country.d}
                        fill={
                            country.name === selected
                                ? theme.colors.primary
                                : theme.colors["surface-raised"]
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
                {locatedRadioStations(stations).map((station) => (
                    <Circle
                        key={station.publicId}
                        cx={
                            projectRadioLocation(
                                station.geoLat!,
                                station.geoLong!
                            ).x
                        }
                        cy={
                            projectRadioLocation(
                                station.geoLat!,
                                station.geoLong!
                            ).y
                        }
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
