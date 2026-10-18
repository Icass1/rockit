import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { notificationText, type NotificationResponse } from "@rockit/shared";
import { useRouter } from "expo-router";
import { AppState, Pressable, Text, View } from "react-native";
import { notificationInbox } from "@/lib/notifications/inbox";
import { useVocabulary } from "@/lib/vocabulary";
import { Header, PageContainer, SectionTitle } from "@/components/layout";

export default function NotificationsScreen() {
    const { vocabulary } = useVocabulary();
    const router = useRouter();
    const items = useStore(notificationInbox.items);
    const total = useStore(notificationInbox.total);
    const error = useStore(notificationInbox.error);
    useEffect(() => {
        const refresh = (): void => {
            if (AppState.currentState === "active")
                void notificationInbox.refresh();
        };
        refresh();
        const timer = setInterval(refresh, 30_000);
        const subscription = AppState.addEventListener("change", refresh);
        return (): void => {
            clearInterval(timer);
            subscription.remove();
            notificationInbox.clear();
        };
    }, []);
    const open = async (item: NotificationResponse): Promise<void> => {
        await notificationInbox.read(item.publicId);
        if (item.destination) {
            const destination = await notificationInbox.destination(
                item.publicId
            );
            if (destination) router.push(destination as never);
        }
    };
    return (
        <>
            <Header />
            <PageContainer bottomPadding={200}>
                <SectionTitle>{vocabulary.NOTIFICATIONS}</SectionTitle>
                {error && (
                    <Text style={{ color: "#f87171" }}>
                        {vocabulary.NOTIFICATION_LOAD_FAILED}
                    </Text>
                )}
                {items.length === 0 && (
                    <Text style={{ color: "#aaa" }}>
                        {vocabulary.NOTIFICATION_EMPTY}
                    </Text>
                )}
                {items.map((item) => (
                    <Pressable
                        key={item.publicId}
                        onPress={(): void => {
                            void open(item);
                        }}
                        style={{ paddingVertical: 16 }}
                    >
                        <Text
                            style={{
                                color: item.readAt ? "#aaa" : "#fff",
                                fontWeight: item.readAt ? "normal" : "bold",
                            }}
                        >
                            {notificationText(item, vocabulary)}
                        </Text>
                    </Pressable>
                ))}
                {items.length < total && (
                    <Pressable
                        onPress={(): void => {
                            void notificationInbox.refresh(true);
                        }}
                    >
                        <Text style={{ color: "#fff" }}>
                            {vocabulary.NOTIFICATION_MORE}
                        </Text>
                    </Pressable>
                )}
            </PageContainer>
        </>
    );
}
