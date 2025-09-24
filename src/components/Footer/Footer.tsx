"use client";

import PictureInPictureImage from "@/components/Footer/PictureInPicture/PictureInPicture";
import FooterLeft from "@/components/Footer/FooterLeft";
import FooterCenter from "@/components/Footer/FooterCenter";
import VolumeSlider from "@/components/Footer/VolumeSlider";
import TogglePlayerUI from "@/components/Footer/TogglePlayerUI";

export default function Footer() {
    return (
        <footer
            id="app-footer"
            className="box-border h-full w-full px-2 pt-2 text-white md:bg-[#1a1a1a]/90 md:px-5 md:py-4"
            style={{ backdropFilter: "blur(10px)" }}
        >
            <div className="flex h-full w-full items-center justify-between md:justify-center">
                <FooterLeft></FooterLeft>

                <FooterCenter></FooterCenter>

                <div className="group hidden h-full w-1/3 items-center justify-end gap-x-5 md:flex">
                    {/* <Devices></Devices> */}
                    <PictureInPictureImage />
                    <VolumeSlider />
                    <TogglePlayerUI />
                </div>
            </div>
        </footer>
    );
}
