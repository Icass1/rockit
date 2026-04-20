"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { HomeStatsResponse } from "@/dto";
import { rockIt } from "@/lib/rockit/rockIt";
import { useHomeData } from "@/components/Home/hooks/useHomeData";
import QuickSelectionsSection from "@/components/Home/sections/QuickSelectionsSection";
import SongScrollSection from "@/components/Home/sections/SongScrollSection";
import LoadingComponent from "@/components/Loading";

const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

function getPreviousMonthKey() {
  return MONTH_KEYS[(new Date().getMonth() + 11) % 12];
}

function useOnClient<T>(fn: () => T, initialValue: T): T {
  return useSyncExternalStore(
    () => () => {},
    fn,
    () => initialValue
  );
}

interface HomeClientProps {
  initialStats?: HomeStatsResponse | null;
}

export default function HomeClient({ initialStats }: HomeClientProps) {
  const data = useHomeData(initialStats);
  const router = useRouter();
  const previousMonthKey = useOnClient(getPreviousMonthKey, null);

  const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

  useEffect(() => {
    if (data?.isEmpty) router.push("/library");
  }, [data?.isEmpty, router]);

  if (!data) {
    return (
      <div className="flex h-screen flex-row items-center justify-center gap-2 text-xl font-semibold">
        <LoadingComponent />
        <span>Loading...</span>
      </div>
    );
  }

  if (!previousMonthKey) {
    return (
      <div className="flex h-screen flex-row items-center justify-center gap-2 text-xl font-semibold">
        <LoadingComponent />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <QuickSelectionsSection
        title={$vocabulary.QUICK_SELECTIONS}
        songs={data.randomSongsLastMonth}
      />
      <SongScrollSection
        title={$vocabulary.RECENTLY_PLAYED}
        songs={data.songsByTimePlayed}
        className="py-5"
      />
      <SongScrollSection
        title={"NOSTALGIC_MIX"}
        songs={data.nostalgicMix}
      />
      <SongScrollSection
        title={$vocabulary.HIDDEN_GEMS}
        songs={data.hiddenGems}
      />
      <SongScrollSection
        title={$vocabulary.COMMUNITY_TOP}
        songs={data.communityTop}
        className="py-5"
      />
      <SongScrollSection
        title={`${$vocabulary[previousMonthKey as keyof typeof $vocabulary]} Recap`}
        songs={data.monthlyTop}
      />
      <SongScrollSection
        title={$vocabulary.MOOD_SONGS}
        songs={data.moodSongs}
      />
    </div>
  );
}