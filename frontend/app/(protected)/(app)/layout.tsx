import AppClientLayout from "@/components/Layout/AppClientLayout";
import { getLang } from "@/lib/utils/getLang";
//import { getUserInServer } from "@/lib/getUserInServer";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // TODO: Get user language from server and pass it to the client layout
    // const user = await getUserInServer();
    // const lang = user?.lang ?? "en";
    const lang = "en";
    const langFile = await getLang(lang);

    return (
        <AppClientLayout lang={lang} langFile={langFile}>
            {children}
        </AppClientLayout>
    );
}
