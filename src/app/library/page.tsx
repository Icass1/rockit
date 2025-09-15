"use client";

import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { langData } from "@/stores/lang";
import { LibraryFilters } from "@/components/Library/LibraryFilters";
import { FeaturedLists } from "@/components/Library/FeaturedLists";
import { LibraryLists } from "@/components/Library/LibraryLists";
import { useSession } from "next-auth/react";

export default function LibraryPage() {
  const $lang = useStore(langData);
  const [filterMode, setFilterMode] = useState<"default" | "asc" | "desc">(
    "default"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryView, setLibraryView] = useState<"grid" | "byArtist">("grid");

  // usamos useSession pero tipamos de forma segura para leer user.libraryView si existe
  const rawSession = useSession();
  const session = rawSession as unknown as {
    status: "loading" | "authenticated" | "unauthenticated";
    data?: { user?: { libraryView?: "grid" | "byArtist" } };
  };

  useEffect(() => {
    if (session.status === "authenticated") {
      const view = session.data?.user?.libraryView;
      if (view === "grid" || view === "byArtist") {
        setLibraryView(view);
      } else {
        setLibraryView("grid");
      }
    } else {
      setLibraryView("grid");
    }
  }, [session.status, session.data]);

  if (!$lang) return null;

  return (
    <div className="h-full w-full overflow-y-auto pt-24 pb-24 md:px-8">
      <section className="flex items-center justify-between px-10 md:px-0">
        <div className="hidden md:flex">
          <h1 className="text-4xl font-bold text-white">{$lang.library}</h1>
        </div>

        <LibraryFilters
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          libraryView={libraryView}
          setLibraryView={setLibraryView}
        />
      </section>

      <FeaturedLists filterMode={filterMode} searchQuery={searchQuery} />

      <LibraryLists
        filterMode={filterMode}
        searchQuery={searchQuery}
        libraryView={libraryView}
      />
    </div>
  );
}
