import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import SignupModal from "@/components/Auth/SignupModal";

export default async function SignupPage() {
    const session = await getServerSession();

    if (session) {
        redirect("/");
    }

    return (
        <div
            className="h-full w-full relative"
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
