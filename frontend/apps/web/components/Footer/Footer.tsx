"use client";

import type { JSX } from "react";
import FooterCenter from "@/components/Footer/FooterCenter";
import FooterLeft from "@/components/Footer/FooterLeft";
import PictureInPicture from "@/components/Footer/PictureInPicture/PictureInPicture";
import TogglePlayerUI from "@/components/Footer/TogglePlayerUI";
import VolumeSlider from "@/components/Footer/VolumeSlider";

export default function Footer(): JSX.Element {
    return (
        <footer
            id="app-footer"
            className="box-border h-full w-full px-2 pt-2 text-white backdrop-blur-md md:px-5 md:py-4"
            style={{ backgroundColor: "rgba(26,26,26,0.9)" }}
        >
            <div className="flex h-full w-full items-center justify-between md:justify-center">
                <FooterLeft />
                <FooterCenter />
                <div className="group hidden h-full w-1/3 items-center justify-end gap-x-5 md:flex">
                    <PictureInPicture />
                    <VolumeSlider />
                    <TogglePlayerUI />
                </div>
            </div>
        </footer>
    );
}
