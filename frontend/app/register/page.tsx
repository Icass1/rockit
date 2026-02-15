"use client";

import RegisterModal from "@/components/Auth/RegisterModal";

export default function RegisterPage() {
    return (
        <div
            className="relative h-full w-full"
            style={{
                backgroundImage: "url(/background.jpg)",
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
                backgroundPositionY: "bottom",
            }}
        >
            <RegisterModal />
        </div>
    );
}
