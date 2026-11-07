"use client";

import type { JSX } from "react";
import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";
import KeyboardHandler from "@/components/KeyboardHandler/KeyboardHandler";
import Navigation from "@/components/Navigation/Navigation";
import PlayerUI from "@/components/PlayerUI/PlayerUI";

export default function DesktopChrome(): JSX.Element {
    return (
        <>
            <KeyboardHandler />
            <PlayerUI />
            <div className="fixed right-0 bottom-0 left-0 z-40 h-24">
                <Footer />
            </div>
            <div className="fixed top-0 right-0 left-12 z-40 h-24 w-auto">
                <Header />
            </div>
            <div className="fixed top-0 bottom-24 left-0 z-40">
                <Navigation />
            </div>
        </>
    );
}
