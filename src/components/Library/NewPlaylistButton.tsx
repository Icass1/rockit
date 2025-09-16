"use client";

import { Plus, X, UploadCloud, Music, Edit2, Trash2, Package2, } from "lucide-react";
import { useState } from "react";
import Image from "@/components/Image";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { langData } from "@/stores/lang";

type MockItem = {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  year?: string;
  track?: string;
  cover?: string;
  selected?: boolean;
  editable?: boolean;
};

export default function NewPlaylistButton() {
  const [showCreatePlaylistMenu, setShowCreatePlaylistMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "upload">("create");

  // Create playlist state (reused)
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const lang = useStore(langData);
  const router = useRouter();

  // Placeholder library items (mocked albums/canciones)
  const [libraryItems, setLibraryItems] = useState<MockItem[]>(() => [
    {
      id: "alb-1",
      title: "Midnight Drive (Album)",
      artist: "Neon Roads",
      album: "Midnight Drive",
      year: "2021",
      cover: "/api/image/rockit-background.png",
      selected: false,
    },
    {
      id: "trk-1",
      title: "Neon Lights",
      artist: "Neon Roads",
      album: "Midnight Drive",
      year: "2021",
      cover: "/api/image/rockit-background.png",
      selected: false,
    },
    {
      id: "trk-2",
      title: "Starlit Avenue",
      artist: "Luna Vale",
      album: "Starlit Avenue",
      year: "2019",
      cover: "/api/image/rockit-background.png",
      selected: false,
    },
    {
      id: "alb-2",
      title: "Sunset Tape (Album)",
      artist: "Cassette City",
      album: "Sunset Tape",
      year: "2018",
      cover: "/api/image/rockit-background.png",
      selected: false,
    },
  ]);

  // Mock uploaded files state (UI only)
  const [uploadedFiles, setUploadedFiles] = useState<MockItem[]>([]);

  // Helpers
  const toggleLibrarySelect = (id: string) => {
    setLibraryItems((prev) => prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it)));
  };

  const addMockUploads = () => {
    // Add a few mock files to illustrate the flow (no real files uploaded)
    const nextIndex = uploadedFiles.length + 1;
    const newFiles: MockItem[] = [
      {
        id: `upload-${nextIndex}`,
        title: `New Track ${nextIndex}`,
        artist: "",
        album: "",
        year: "",
        track: `${nextIndex}`,
        cover: "/api/image/rockit-background.png",
        selected: true,
        editable: true,
      },
      {
        id: `upload-${nextIndex + 1}`,
        title: `Demo Song ${nextIndex + 1}`,
        artist: "",
        album: "",
        year: "",
        track: `${nextIndex + 1}`,
        cover: "/api/image/rockit-background.png",
        selected: true,
        editable: true,
      },
    ];
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const toggleUploadedSelect = (id: string) => {
    setUploadedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f)));
  };

  const updateUploadedMetadata = (id: string, key: keyof MockItem, value: string) => {
    setUploadedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  };

  const removeUploaded = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const selectAllLibrary = (val: boolean) => {
    setLibraryItems((prev) => prev.map((it) => ({ ...it, selected: val })));
  };

  const selectAllUploaded = (val: boolean) => {
    setUploadedFiles((prev) => prev.map((it) => ({ ...it, selected: val })));
  };

  // Create playlist action — reuse original logic (still performs fetch like original)
  const handleCreatePlaylist = () => {
    if (name.trim() === "") {
      setError("Enter a name for your new playlist");
      return;
    }

    // NOTE: We intentionally keep the same request as your working code.
    fetch("/api/playlist/new", {
      method: "POST",
      body: JSON.stringify({ name: name }),
    })
      .then((response) => response.json())
      .catch(() => {
        setError("Error creating your new playlist");
        return Promise.reject();
      })
      .then((data) => router.push(`/playlist/${data.id}`))
      .catch((err) => {
        // keep UI-friendly error
        setError(err?.toString() ?? "Unknown error");
      });
  };

  // Modal close helper
  const closeModal = () => {
    setShowCreatePlaylistMenu(false);
    setActiveTab("create");
    setName("");
    setError("");
    // keep mock states to allow user to reopen and see uploaded mock files
  };

  return (
    <>
      {/* Library tile (same clickable area, visually improved) */}
      <div
        className="library-item flex h-full w-full max-w-full min-w-0 flex-col transition-transform hover:scale-[1.03] cursor-pointer"
        onClick={() => {
          setShowCreatePlaylistMenu(true);
        }}
      >
        <div className="cover relative aspect-square h-auto w-full">
            <Image
                alt=""
                className="cover absolute top-0 left-0 aspect-square h-auto w-full rounded-md"
                src="/api/image/rockit-background.png"
            />
            <Plus className="cover absolute top-0 left-0 aspect-square h-auto w-full rounded-md p-6" />
        </div>
        <label className="min-h-6 truncate text-center font-semibold mt-2">{lang?.newplaylist ?? "Nueva playlist"}</label>
      </div>

      {/* Modal */}
      {showCreatePlaylistMenu && (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/70 p-4">
          <div className="relative mx-auto flex w-full max-w-4xl flex-col rounded-2xl bg-[#0b0b0b] p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-x-3">
                <div className="rounded-md bg-white/6 p-2">
                  <Music className="h-6 w-6 text-white/90" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">{
                    activeTab === "create" ? (lang?.newplaylist ?? "Crear playlist") : ("Subir canciones")
                  }</div>
                  <div className="text-sm text-gray-400">
                    {activeTab === "create"
                      ? "Crea una nueva playlist y añade álbumes o canciones desde tu librería."
                      : "Interfaz para subir archivos (ZIP / MP3) y editar metadatos."}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-x-2">
                {/* Tabs */}
                <div className="inline-flex items-center rounded-md bg-white/3 p-1">
                  <button
                    onClick={() => setActiveTab("create")}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                      activeTab === "create" ? "bg-white/8 text-white" : "text-gray-300"
                    }`}
                  >
                    {lang?.newplaylist ?? "Crear"}
                  </button>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                      activeTab === "upload" ? "bg-white/8 text-white" : "text-gray-300"
                    }`}
                  >
                    {"Subir"}
                  </button>
                </div>

                <button
                  onClick={closeModal}
                  className="rounded-md p-2 text-gray-300 hover:text-white"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex w-full gap-x-6">
              {/* Left column */}
              <div className="flex w-1/2 flex-col gap-y-4">
                {activeTab === "create" ? (
                  <>
                    {/* Playlist name and options */}
                    <div className="rounded-lg border border-white/6 bg-white/3 p-4">
                      <label className="block text-sm font-semibold text-white">
                        {lang?.newplaylistname ?? "Nombre de la playlist"}
                        {error && <span className="text-red-500"> — {error}</span>}
                      </label>
                      <input
                        className={`mt-2 w-full bg-transparent text-2xl font-bold outline-none ${
                          error ? "text-red-600" : "text-white"
                        }`}
                        value={name}
                        placeholder="Mi playlist perfecta"
                        onChange={(e) => {
                          setName(e.target.value);
                          setError("");
                        }}
                        type="text"
                      />

                      <div className="mt-3 flex items-center gap-x-3">
                        <div className="flex items-center gap-x-2">
                          <div className="h-14 w-14 overflow-hidden rounded-md bg-white/6">
                            <Image alt="cover" src="/api/image/rockit-background.png" className="h-full w-full object-cover" />
                          </div>
                          <div className="text-sm text-gray-300">
                            <div className="font-medium text-white">Portada</div>
                            <div className="text-xs text-gray-400">Arrastra o selecciona (mockup)</div>
                          </div>
                        </div>

                        <div className="ml-auto flex items-center gap-x-2">
                          <button
                            onClick={() => {
                              // mock: swap sample cover
                            }}
                            className="rounded-md border border-gray-500 px-3 py-1 text-sm text-gray-300 hover:text-white"
                          >
                            Cambiar
                          </button>
                          <button
                            onClick={() => {
                              // mock: clear
                            }}
                            className="rounded-md border border-gray-500 px-3 py-1 text-sm text-gray-300 hover:text-white"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Choose from library (placeholder items) */}
                    <div className="rounded-lg border border-white/6 bg-white/3 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">Añadir desde la librería</div>
                        <div className="text-xs text-gray-400">Selecciona álbumes o canciones</div>
                      </div>

                      <div className="mt-3 flex items-center gap-x-2">
                        <input
                          className="w-full rounded-md border border-white/6 bg-transparent px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none"
                          placeholder="Buscar álbum o canción (mock)"
                          type="search"
                          onChange={() => {
                            // mock search — no-op
                          }}
                        />
                        <button
                          onClick={() => selectAllLibrary(true)}
                          className="rounded-md border border-gray-500 px-3 py-2 text-sm text-gray-300 hover:text-white"
                        >
                          Seleccionar todo
                        </button>
                        <button
                          onClick={() => selectAllLibrary(false)}
                          className="rounded-md border border-gray-500 px-3 py-2 text-sm text-gray-300 hover:text-white"
                        >
                          Limpiar
                        </button>
                      </div>

                      <div className="mt-4 max-h-56 overflow-auto">
                        <ul className="space-y-3">
                          {libraryItems.map((it) => (
                            <li key={it.id} className="flex items-center gap-x-3 rounded-md p-2 hover:bg-white/2">
                              <input
                                type="checkbox"
                                checked={!!it.selected}
                                onChange={() => toggleLibrarySelect(it.id)}
                                className="h-4 w-4 accent-green-500"
                              />
                              <div className="h-12 w-12 overflow-hidden rounded-md">
                                <Image alt={it.title} src={it.cover ?? "/api/image/rockit-background.png"} className="h-full w-full object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-white">{it.title}</div>
                                <div className="truncate text-xs text-gray-400">{it.artist} • {it.year}</div>
                              </div>
                              <div className="text-xs text-gray-400">Album / Pista</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-2 flex gap-x-3">
                      <button
                        onClick={closeModal}
                        className="rounded-md border border-gray-500 px-4 py-2 text-sm text-gray-300 hover:text-white"
                      >
                        {lang?.cancel ?? "Cancelar"}
                      </button>

                      <div className="ml-auto flex gap-x-2">
                        <button
                          onClick={() => {
                            // Mock "preview" of selected items — for UI only
                            const selected = libraryItems.filter((it) => it.selected);
                            if (selected.length === 0) {
                              setError("Selecciona al menos un álbum o pista (mock)");
                              return;
                            }
                            setError("");
                            // no further action — UI-only
                          }}
                          className="rounded-md border border-gray-500 px-4 py-2 text-sm text-gray-300 hover:text-white"
                        >
                          Vista previa
                        </button>

                        <button
                          onClick={handleCreatePlaylist}
                          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                        >
                          {lang?.create ?? "Crear"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Upload tab */
                  <>
                    <div className="rounded-lg border border-white/6 bg-white/3 p-4">
                      <div className="flex items-start gap-x-4">
                        <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-white/8 bg-white/4">
                          <UploadCloud className="h-8 w-8 text-white/90" />
                        </div>

                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">Sube tu ZIP / MP3 (UI mock)</div>
                          <div className="mt-1 text-xs text-gray-400">
                            Arrastra un ZIP con carpetas de álbumes o varios MP3. Aquí se mostrarán los archivos y podrás editar metadatos uno a uno.
                          </div>

                          <div className="mt-3 flex gap-x-2">
                            <button
                              onClick={() => {
                                // no real upload — open mock add
                                addMockUploads();
                              }}
                              className="rounded-md border border-gray-500 px-3 py-2 text-sm text-gray-300 hover:text-white"
                            >
                              Añadir archivos (mock)
                            </button>
                            <button
                              onClick={() => {
                                // mock: pretend to accept ZIP
                                setUploadedFiles((prev) => [
                                  ...prev,
                                  {
                                    id: `zip-${Date.now()}`,
                                    title: "Album (ZIP import preview)",
                                    artist: "",
                                    album: "Imported Album",
                                    year: "",
                                    track: "",
                                    cover: "/api/image/rockit-background.png",
                                    selected: true,
                                    editable: false,
                                  },
                                ]);
                              }}
                              className="rounded-md border border-gray-500 px-3 py-2 text-sm text-gray-300 hover:text-white"
                            >
                              Simular ZIP
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Uploaded files list & metadata editor */}
                    <div className="rounded-lg border border-white/6 bg-white/3 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">Archivos detectados</div>
                        <div className="flex items-center gap-x-2">
                          <button
                            onClick={() => selectAllUploaded(true)}
                            className="rounded-md border border-gray-500 px-3 py-1 text-sm text-gray-300 hover:text-white"
                          >
                            Seleccionar todo
                          </button>
                          <button
                            onClick={() => selectAllUploaded(false)}
                            className="rounded-md border border-gray-500 px-3 py-1 text-sm text-gray-300 hover:text-white"
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 max-h-72 overflow-auto">
                        {uploadedFiles.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-y-3 py-10 text-center text-gray-400">
                            <Package2 className="h-10 w-10 text-gray-400" />
                            <div>No hay archivos (añade mock files para ver la UI)</div>
                            <button
                              onClick={addMockUploads}
                              className="rounded-md border border-gray-500 px-3 py-1 text-sm text-gray-300 hover:text-white"
                            >
                              Añadir mock files
                            </button>
                          </div>
                        ) : (
                          <ul className="space-y-3">
                            {uploadedFiles.map((f) => (
                              <li key={f.id} className="rounded-md p-3 hover:bg-white/2">
                                <div className="flex items-start gap-x-3">
                                  <input
                                    type="checkbox"
                                    checked={!!f.selected}
                                    onChange={() => toggleUploadedSelect(f.id)}
                                    className="h-4 w-4 accent-green-500 mt-1"
                                  />
                                  <div className="h-12 w-12 overflow-hidden rounded-md">
                                    <Image alt={f.title} src={f.cover ?? "/api/image/rockit-background.png"} className="h-full w-full object-cover" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-white">{f.title}</div>
                                        <div className="truncate text-xs text-gray-400">{f.artist || "Artista desconocido"}</div>
                                      </div>

                                      <div className="ml-3 flex items-center gap-x-2">
                                        <button
                                          onClick={() => {
                                            // toggle editable state
                                            setUploadedFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, editable: !x.editable } : x)));
                                          }}
                                          className="rounded-md p-1 text-gray-300 hover:text-white"
                                          title="Editar metadatos"
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => removeUploaded(f.id)}
                                          className="rounded-md p-1 text-gray-300 hover:text-white"
                                          title="Eliminar"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Metadata editor (inline) */}
                                    {f.editable ? (
                                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                                        <input
                                          className="rounded-md border border-white/6 bg-transparent px-2 py-1 text-sm text-white outline-none"
                                          value={f.title}
                                          onChange={(e) => updateUploadedMetadata(f.id, "title", e.target.value)}
                                          placeholder="Título"
                                        />
                                        <input
                                          className="rounded-md border border-white/6 bg-transparent px-2 py-1 text-sm text-white outline-none"
                                          value={f.artist}
                                          onChange={(e) => updateUploadedMetadata(f.id, "artist", e.target.value)}
                                          placeholder="Artista"
                                        />
                                        <input
                                          className="rounded-md border border-white/6 bg-transparent px-2 py-1 text-sm text-white outline-none"
                                          value={f.album}
                                          onChange={(e) => updateUploadedMetadata(f.id, "album", e.target.value)}
                                          placeholder="Álbum"
                                        />
                                        <input
                                          className="rounded-md border border-white/6 bg-transparent px-2 py-1 text-sm text-white outline-none"
                                          value={f.year}
                                          onChange={(e) => updateUploadedMetadata(f.id, "year", e.target.value)}
                                          placeholder="Año"
                                        />
                                        <input
                                          className="rounded-md border border-white/6 bg-transparent px-2 py-1 text-sm text-white outline-none"
                                          value={f.track}
                                          onChange={(e) => updateUploadedMetadata(f.id, "track", e.target.value)}
                                          placeholder="# Pista"
                                        />
                                        <div className="flex items-center gap-x-2">
                                          <button
                                            onClick={() => setUploadedFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, editable: false } : x)))}
                                            className="rounded-md border border-gray-500 px-3 py-1 text-sm text-gray-300 hover:text-white"
                                          >
                                            Guardar
                                          </button>
                                          <button
                                            onClick={() => {
                                              // cancel edit — no undo history in mock, simply close editor
                                              setUploadedFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, editable: false } : x)));
                                            }}
                                            className="rounded-md border border-gray-500 px-3 py-1 text-sm text-gray-300 hover:text-white"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="mt-3 flex items-center gap-x-4 text-xs text-gray-400">
                                        <div>{f.album || "— Álbum"}</div>
                                        <div>{f.year || "— Año"}</div>
                                        <div>{f.track ? `#${f.track}` : "— Pista"}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Footer actions for upload tab */}
                      <div className="mt-3 flex items-center gap-x-3">
                        <button
                          onClick={() => {
                            // mock add — not functional upload
                            addMockUploads();
                          }}
                          className="rounded-md border border-gray-500 px-4 py-2 text-sm text-gray-300 hover:text-white"
                        >
                          Añadir archivos
                        </button>

                        <button
                          onClick={() => {
                            // pretend to create a playlist from selected uploads (UI only)
                            const selected = uploadedFiles.filter((f) => f.selected);
                            if (selected.length === 0) {
                              setError("Selecciona al menos una pista para crear playlist (mock)");
                              return;
                            }
                            setError("");
                            // We still call the real create playlist endpoint (reusing function),
                            // but we do NOT send files — this is a UI-only mock for metadata flow.
                            handleCreatePlaylist();
                          }}
                          className="ml-auto rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                        >
                          Crear playlist con seleccionadas
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right column: preview + details */}
              <div className="flex w-1/2 flex-col gap-y-4">
                <div className="rounded-lg border border-white/6 bg-white/3 p-4">
                  <div className="text-sm font-semibold text-white">Preview de la playlist</div>
                  <div className="mt-3 flex flex-col gap-y-3">
                    <div className="flex items-center gap-x-3">
                      <div className="h-16 w-16 overflow-hidden rounded-md">
                        <Image alt="playlist" src="/api/image/rockit-background.png" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{name || "Nombre de playlist (pendiente)"}</div>
                        <div className="text-xs text-gray-400">Tracks: {libraryItems.filter((it) => it.selected).length + uploadedFiles.filter((f) => f.selected).length}</div>
                        <div className="text-xs text-gray-400">Visibilidad: Privada (mock)</div>
                      </div>
                    </div>

                    <div className="rounded-md border border-white/6 bg-white/4 p-3 text-sm text-gray-300">
                      <div className="font-medium text-white">Contenido seleccionado</div>
                      <div className="mt-2 max-h-40 overflow-auto text-xs text-gray-300">
                        <ul className="space-y-2">
                          {libraryItems.filter((it) => it.selected).map((it) => (
                            <li key={it.id} className="flex items-center gap-x-2">
                              <div className="h-7 w-7 overflow-hidden rounded-sm">
                                <Image alt={it.title} src={it.cover ?? "/api/image/rockit-background.png"} className="h-full w-full object-cover" />
                              </div>
                              <div className="truncate">{it.title} <span className="text-gray-500"> — {it.artist}</span></div>
                            </li>
                          ))}
                          {uploadedFiles.filter((f) => f.selected).map((f) => (
                            <li key={f.id} className="flex items-center gap-x-2">
                              <div className="h-7 w-7 overflow-hidden rounded-sm">
                                <Image alt={f.title} src={f.cover ?? "/api/image/rockit-background.png"} className="h-full w-full object-cover" />
                              </div>
                              <div className="truncate">{f.title} <span className="text-gray-500"> — {f.artist || "—"}</span></div>
                            </li>
                          ))}
                          {libraryItems.filter((it) => it.selected).length + uploadedFiles.filter((f) => f.selected).length === 0 && (
                            <li className="text-gray-500">Ningún elemento seleccionado aún</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400">
                      Metadatos disponibles: título, artista, álbum, año, número de pista.
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/6 bg-white/3 p-4">
                  <div className="text-sm font-semibold text-white">Consejos / Notas</div>
                  <ul className="mt-3 list-inside list-disc space-y-2 text-xs text-gray-400">
                    <li>Este modal es un mockup de la interfaz: la subida y extracción de ZIP no se realizará aquí.</li>
                    <li>Puedes seleccionar álbumes o pistas desde la izquierda para agregarlos a la playlist.</li>
                    <li>En la pestaña Subir puedes editar metadatos individualmente antes de crear la playlist.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
