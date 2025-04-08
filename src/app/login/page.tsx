import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import LoginModal from "@/components/Auth/LoginModal";

export default async function LoginPage() {
    const session = await getServerSession();
    console.log("LoginPage session", { session });

    if (session) {
        redirect("/");
    }

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
