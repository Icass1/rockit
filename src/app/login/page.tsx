import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import LoginModal from "@/components/Auth/LoginModal";

export default async function LoginPage() {
    const session = await getServerSession();
    console.log({ session });

    if (session) {
        redirect("/");
    }

    return (
        <div className="h-full w-full relative">
            <LoginModal />
        </div>
    );
}
