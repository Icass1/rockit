import Link from "next/link";
import Image from "next/image";

type ErrorCode = 404 | 500 | 403 | 401;

const ERROR_CONTENT: Record<ErrorCode, { title: string; subtitle: string; description: string }> = {
    401: {
        title: "401",
        subtitle: "🎵 Backstage pass required",
        description: "You need to be logged in to access this page.",
    },
    403: {
        title: "403",
        subtitle: "🎵 This track is not for your ears",
        description: "You don't have permission to access this page.",
    },
    404: {
        title: "404",
        subtitle: "🎵 This track doesn't exist",
        description: "We couldn't find what you were looking for, but don't worry — Rock It! still plays on.",
    },
    500: {
        title: "500",
        subtitle: "🎵 Whoops! Looks like this track is off-key",
        description: "Something went wrong on our end. Give it another spin in a moment.",
    },
};

export default function ErrorPage({ code }: { code: ErrorCode }) {
    const { title, subtitle, description } = ERROR_CONTENT[code] ?? ERROR_CONTENT[500];

    return (
        <div className="relative flex h-screen w-full flex-col items-center justify-center select-none bg-linear-to-r from-[#d185ca] to-[#ffbb9e]">
            <div className="flex h-auto flex-col items-center gap-8 md:flex-row">
                <div className="w-full text-center text-black">
                    <h1 className="mb-4 text-6xl font-bold md:text-9xl">
                        {title}
                    </h1>
                    <p className="mb-2 text-xl font-semibold text-balance md:text-3xl">
                        {subtitle}
                    </p>
                    <p className="text-sm font-medium md:text-base">
                        {description}
                    </p>
                </div>

                <div className="relative flex aspect-square w-1/2 items-center justify-center md:w-2/3">
                    <div className="absolute h-[92%] w-[92%] rounded-full bg-white" />
                    <Image
                        width={1080}
                        height={1080}
                        src="/vinil-cd.png"
                        alt="Vinyl Record"
                        className="animate-spin-decelerate absolute h-[90%] w-[90%] rounded-full object-cover"
                    />
                    <Image
                        width={500}
                        height={500}
                        src="/brazovinilo.png"
                        alt="Vinyl Arm"
                        className="absolute top-0 right-0 z-20 h-[70%] w-[70%] translate-x-10 -translate-y-2 rotate-[-20deg]"
                    />
                </div>
            </div>

            <Link
                href="/"
                className="mt-10 rounded-full bg-white px-5 py-2 text-lg font-bold text-black shadow-md transition md:mt-20 md:hover:bg-neutral-200"
            >
                Return Back to Home
            </Link>
        </div>
    );
}
