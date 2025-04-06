"use client";

import PictureInPictureImage from "@/components/PictureInPicture";
import FooterLeft from "@/components/Footer/FooterLeft";
import FooterCenter from "@/components/Footer/FooterCenter";
import VolumeSlider from "@/components//VolumeSlider";
import TogglePlayerUI from "@/components//TogglePlayerUI";

export default function Footer() {
    return (
        <footer
            className="md:bg-[#1a1a1a]/80 text-white md:py-4 md:px-5 px-2 pt-2 w-full h-full box-border"
            style={{ backdropFilter: "blur(10px)" }}
        >
            <div className="flex md:justify-center justify-between items-center w-full h-full">
                <FooterLeft></FooterLeft>

                <FooterCenter></FooterCenter>

                <div className="hidden md:flex items-center w-1/3 h-full justify-end gap-x-5 group">
                    <PictureInPictureImage />
                    <VolumeSlider />
                    <TogglePlayerUI />
                </div>
            </div>
        </footer>
    );
}
