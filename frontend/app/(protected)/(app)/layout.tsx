import AppClientLayout from "@/components/Layout/AppClientLayout";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AppClientLayout>{children}</AppClientLayout>;
}
