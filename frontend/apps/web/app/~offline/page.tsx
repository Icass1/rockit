import { JSX } from "react";
import Image from "next/image";
import Link from "next/link";

export default function OfflinePage(): JSX.Element {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
            <Image
                src="/logo-192.png"
                alt="Rockit"
                width={96}
                height={96}
                className="mb-6 opacity-80"
                priority
            />
            <h1 className="mb-2 text-2xl font-bold">Sin conexion</h1>
            <p className="mb-6 max-w-sm text-neutral-400">
                No hay conexion a internet. Puedes seguir escuchando tu musica
                descargada.
            </p>
            <Link
                href="/"
                className="rounded-full bg-[var(--rockit-pink,#ee1086)] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
            >
                Ir al inicio
            </Link>
        </div>
    );
}
