"use client";

import {
  Check,
  Forward,
  Play,
  Send,
  UserRoundPlus,
  UserRoundX,
  X,
} from "lucide-react";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";

export default function FriendsPage() {
  const $lang = useStore(langData);

  if (!$lang) return;
  return (
    <div className="my-20 md:mt-20 px-2 md:px-12 flex flex-col md:flex-row">
      <div className="flex flex-1 justify-between md:space-x-14 mt-8 flex-col md:flex-row">
        {/* Columna izquierda */}
        <div className="flex-1 flex flex-col items-center space-y-6">
          {/* SVG Gráfico circular */}
          <div className="relative flex items-center justify-center">
            <svg
              className="w-full h-full transform -rotate-90"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 120 120"
            >
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ee1086" />
                  <stop offset="100%" stopColor="#fb6467" />
                </linearGradient>
              </defs>
              <circle
                cx="60"
                cy="60"
                r="50"
                className="text-gray-200"
                strokeWidth="5"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="url(#gradient)"
                strokeWidth="5"
                fill="none"
                strokeDasharray="300"
                strokeDashoffset="78.539"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-white font-semibold text-3xl">Niv. 72</span>
          </div>

          <p className="text-white font-semibold text-4xl">
          </p>
          <p className="text-md text-center text-gray-400 md:px-6">
            {$lang.friends_points_descr}
          </p>
        </div>

        {/* Columna central */}
        <div className="relative flex-1 flex flex-col items-center my-14 md:my-0">
          <h1 className="text-white text-2xl md:text-3xl font-bold pb-4">
            {$lang.shared_2_you}
          </h1>
          <div className="overflow-y-scroll w-full p-6 space-y-6 md:h-auto h-[calc(100vh-30rem)]">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="group w-full bg-neutral-700 rounded-md p-4 flex items-center space-x-4 relative">
                <div className="relative w-24 h-24 hover:cursor-pointer">
                  <img
                    src="/song-placeholder.png"
                    alt="Imagen"
                    className="w-full h-full object-cover rounded-md group-hover:opacity-40 transition-opacity"
                  />
                  <Play className="h-8 w-8 absolute inset-0 m-auto text-4xl opacity-0 group-hover:opacity-100 transition-opacity fill-current" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <p className="text-left hover:underline truncate font-semibold text-lg">
                    Nombre de la canción {index + 1}
                  </p>
                  <p className="text-left hover:underline truncate text-md text-gray-400">
                    Autor de la canción {index + 1}
                  </p>
                  <p className="text-left hover:underline truncate text-sm text-gray-400">
                    Álbum de la canción {index + 1}
                  </p>
                </div>
                <div className="absolute -top-3 -right-2 bg-gradient-to-r from-[#ee1086] to-[#ce5254] text-white text-sm px-2 rounded-md flex items-center space-x-2">
                  <Forward className="h-7" />
                  <span>{$lang.shared_from} 'user {index + 1}'</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna derecha */}
        <div className="flex-1 bg-neutral-900 md:bg-neutral-800 rounded-2xl p-4 flex flex-col space-y-4 h-fit">
          <div className="flex justify-center items-center py-3">
            <h1 className="text-white text-2xl md:text-3xl font-bold text-center">
              {$lang.users_friends}
            </h1>
          </div>

          <div className="flex items-center bg-neutral-700 rounded-full p-2 my-4 md:mx-14">
            <input
              type="search"
              placeholder="Buscar usuarios..."
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 px-2"
            />
            <i className="fas fa-search text-gray-400" />
          </div>

          {/* Lista de solicitudes */}
          <div className="flex flex-col space-y-4 overflow-y-auto pt-3">
            <h2 className="text-white font-semibold text-left">
              {$lang.pending_requests}
            </h2>
            {/* Render solicitudes acá... igual que antes */}
          </div>

          {/* Lista de amigos */}
          <div className="flex flex-col space-y-4 overflow-y-auto pt-3">
            <h2 className="text-white font-semibold text-left">
              {$lang.friends_list}
            </h2>
            {/* Render amigos acá... */}
          </div>

          {/* Lista de usuarios */}
          <div className="flex flex-col space-y-4 overflow-y-auto pt-3">
            <h2 className="text-white font-semibold text-left">
              {$lang.users_list}
            </h2>
            {/* Render usuarios acá... */}
          </div>
        </div>
      </div>
    </div>
  );
}