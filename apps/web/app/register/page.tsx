import { JSX } from "react";
import RegisterModal from "@/components/Auth/RegisterModal";

export default function RegisterPage(): JSX.Element {
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
