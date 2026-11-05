"use client";

import { JSX } from "react";
import Link from "next/link";
import { useStore } from "@nanostores/react";
import { Vocabulary } from "@rockit/shared";
import { ChartLine, Download, Lock } from "lucide-react";
import DownloadLibrarySetting from "@/components/Downloader/DownloadLibrarySetting";
import { useRuntimeServices } from "@/components/providers/RuntimeProvider";
import { useVocabulary } from "@/components/providers/VocabularyProvider";
import ChangeLang from "@/components/Settings/ChangeLang";
import CrossFadeInput from "@/components/Settings/CrossFadeInput";
import DownloadAppButton from "@/components/Settings/DownloadAppButton";
import { useSettingsUser } from "@/components/Settings/hooks/useSettingsUser";
import ListeningHistorySetting from "@/components/Settings/ListeningHistorySetting";
import LogOutButton from "@/components/Settings/LogOutButton";
import NotificationSettings from "@/components/Settings/NotificationSettings";
import ProfileImageInput from "@/components/Settings/ProfileImageInput";

function SettingsSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}): JSX.Element {
    return (
        <div className="border-border-subtle/60 bg-secondary/50 flex flex-col gap-3 rounded-2xl border p-4 md:p-5">
            <h3 className="text-subtle-foreground text-[10px] font-bold tracking-widest uppercase">
                {title}
            </h3>
            {children}
        </div>
    );
}

function ProfileSidebar(): JSX.Element {
    const { username, image } = useSettingsUser();

    return (
        <div className="flex flex-col items-center gap-4">
            <ProfileImageInput image={image} username={username} />

            <div className="text-center">
                <p className="text-foreground-strong text-lg font-bold">
                    {username}
                </p>
                <p className="text-subtle-foreground text-sm">@{username}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
                <LogOutButton />
                <Link
                    href="/stats"
                    className="bg-muted text-foreground-strong hover:bg-info-hover flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors md:hidden"
                >
                    <ChartLine className="h-4 w-4" />
                    Stats
                </Link>
                <Link
                    href="/downloader"
                    className="bg-muted text-foreground-strong hover:bg-info-hover flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors md:hidden"
                >
                    <Download className="h-4 w-4" />
                    Downloads
                </Link>
            </div>
        </div>
    );
}

function PasswordSection({
    vocabulary,
}: {
    vocabulary: Vocabulary;
}): JSX.Element {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="new-password"
                    className="text-muted-foreground text-sm font-medium"
                >
                    {vocabulary.NEW_PASSWORD}
                </label>
                <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="border-border bg-muted text-foreground-strong focus:border-primary focus:ring-primary w-full rounded-xl border px-4 py-2.5 text-sm transition-colors focus:ring-1 focus:outline-none"
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="repeat-password"
                    className="text-muted-foreground text-sm font-medium"
                >
                    {vocabulary.REPEAT_PASSWORD ?? "Repeat password"}
                </label>
                <input
                    id="repeat-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="border-border bg-muted text-foreground-strong focus:border-primary focus:ring-primary w-full rounded-xl border px-4 py-2.5 text-sm transition-colors focus:ring-1 focus:outline-none"
                />
            </div>
        </div>
    );
}

function DisplayNameInput({
    vocabulary,
}: {
    vocabulary: Vocabulary;
}): JSX.Element {
    const { username, isAuthenticated } = useSettingsUser();

    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor="display-name"
                className="text-muted-foreground text-sm font-medium"
            >
                {vocabulary.DISPLAY_NAME}
            </label>
            <input
                id="display-name"
                type="text"
                defaultValue={username}
                disabled={isAuthenticated}
                className="border-border bg-muted text-foreground-strong focus:border-primary focus:ring-primary w-full rounded-xl border px-4 py-2.5 text-sm transition-colors focus:ring-1 focus:outline-none disabled:opacity-50"
            />
        </div>
    );
}

function SettingsContent(): JSX.Element {
    const $vocabulary = useVocabulary();

    return (
        <div className="mx-auto max-w-4xl px-4 md:px-8 md:py-10 md:pb-10">
            <h1 className="text-foreground-strong mb-6 text-2xl font-bold">
                {$vocabulary.USER_SETTINGS}
            </h1>

            <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                <div className="md:sticky md:top-0 md:w-64 md:shrink-0">
                    <div className="border-border-subtle/60 bg-secondary/50 rounded-2xl border p-5">
                        <ProfileSidebar />
                    </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <SettingsSection title={$vocabulary.DISPLAY_NAME}>
                        <DisplayNameInput vocabulary={$vocabulary} />
                    </SettingsSection>

                    <SettingsSection title={$vocabulary.LANGUAGE}>
                        <ChangeLang />
                    </SettingsSection>

                    <SettingsSection title={$vocabulary.CHANGE_PASSWORD}>
                        <div className="mb-1 flex items-center gap-2">
                            <Lock className="text-subtle-foreground h-3.5 w-3.5" />
                            <span className="text-subtle-foreground text-xs">
                                Leave blank to keep current password
                            </span>
                        </div>
                        <PasswordSection vocabulary={$vocabulary} />
                    </SettingsSection>

                    <SettingsSection title={$vocabulary.DOWNLOADS}>
                        <DownloadLibrarySetting />
                    </SettingsSection>

                    <SettingsSection title="Player">
                        <ListeningHistorySetting />
                    </SettingsSection>

                    <SettingsSection title="Audio">
                        <CrossFadeInput />
                    </SettingsSection>

                    <SettingsSection
                        title={$vocabulary.NOTIFICATIONS_SUBSCRIPTIONS}
                    >
                        <NotificationSettings />
                    </SettingsSection>

                    <SettingsSection title={$vocabulary.DOWNLOAD_APP}>
                        <DownloadAppButton />
                    </SettingsSection>
                </div>
            </div>
        </div>
    );
}

export default function SettingsClient(): JSX.Element {
    const { userManager } = useRuntimeServices();
    const scope = useStore(userManager.scopeAtom);
    return <SettingsContent key={scope} />;
}
