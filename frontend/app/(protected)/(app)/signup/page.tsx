"use client";

import SignupModal from "@/components/Auth/SignupModal";

export default function SignupPage() {
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
            <SignupModal />
        </div>
    );
}
