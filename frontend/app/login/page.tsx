import LoginModal from "@/components/Auth/LoginModal";

export default function LoginPage() {
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
            <LoginModal />
        </div>
    );
}
