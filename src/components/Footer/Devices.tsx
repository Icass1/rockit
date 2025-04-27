import { MonitorSmartphone } from "lucide-react";
import {
    PopupMenu,
    PopupMenuContent,
    PopupMenuTrigger,
} from "@/components/PopupMenu/PopupMenu";
import { useStore } from "@nanostores/react";
import { devices } from "@/stores/devices";
import { send } from "@/stores/audio";

export default function Devices() {
    const $devices = useStore(devices);

    const thisDevice = $devices.find((device) => device.you);

    const handleSetDevice = (deviceName: string | undefined) => {
        if (!deviceName) return;
        send({ setAudioPlayer: deviceName });
    };

    return (
        <PopupMenu>
            <PopupMenuTrigger>
                <MonitorSmartphone className="h-6 w-6 text-gray-400 md:hover:text-white" />
            </PopupMenuTrigger>
            <PopupMenuContent>
                <div className="flex flex-col gap-1 p-2">
                    <label className="text-sm">Your device</label>

                    <label
                        title={
                            thisDevice?.audioPlayer
                                ? "Currently playing in this device"
                                : "Click to play in this device"
                        }
                        onClick={() =>
                            thisDevice?.audioPlayer
                                ? null
                                : handleSetDevice(thisDevice?.deviceName)
                        }
                        className={
                            "font-semibold " +
                            (thisDevice?.audioPlayer
                                ? "[background-image:-webkit-linear-gradient(0deg,#fb6467,#ee1086)] bg-clip-text [-webkit-text-fill-color:transparent]"
                                : "")
                        }
                    >
                        {thisDevice?.deviceName}
                    </label>

                    <div className="h-[2px] w-full bg-neutral-600" />

                    <label className="text-sm">Other devices</label>

                    {$devices
                        .filter((device) => !device.you)
                        .map((device) => (
                            <label
                                onClick={() =>
                                    device.audioPlayer
                                        ? null
                                        : handleSetDevice(device.deviceName)
                                }
                                title={
                                    device.audioPlayer
                                        ? "Currently playing in this device"
                                        : "Click to play in this device"
                                }
                                key={device.deviceName}
                                className={
                                    "font-semibold " +
                                    (device.audioPlayer
                                        ? "[background-image:-webkit-linear-gradient(0deg,#fb6467,#ee1086)] bg-clip-text [-webkit-text-fill-color:transparent]"
                                        : "")
                                }
                            >
                                {device.deviceName}
                            </label>
                        ))}
                </div>
            </PopupMenuContent>
        </PopupMenu>
    );
}
