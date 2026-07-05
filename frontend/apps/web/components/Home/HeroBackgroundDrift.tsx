"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { JSX } from "react";
import type { BaseSongWithAlbumResponse } from "@/dto";
import { useAmbientDrift } from "@/components/Home/hooks/useAmbientDrift";

interface HeroBackgroundDriftProps {
    songs: BaseSongWithAlbumResponse[];
    maxParticles?: number;
}

export default function HeroBackgroundDrift({
    songs,
    maxParticles = 7,
}: HeroBackgroundDriftProps): JSX.Element {
    const seedKeys = songs.map((s) => s.publicId);
    const particles = useAmbientDrift(seedKeys, { maxParticles });

    if (particles.length === 0) {
        return <div className="pointer-events-none absolute inset-0" aria-hidden="true" />;
    }

    return (
        <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
        >
            {particles.map((particle, index) => {
                const song = songs[index];
                if (!song) return null;

                const noMotion = particle.duration === 0;

                return (
                    <motion.div
                        key={particle.id}
                        className="absolute rounded-xl"
                        style={{
                            top: `${particle.top}%`,
                            left: `${particle.left}%`,
                            width: particle.size,
                            height: particle.size,
                            opacity: particle.opacity,
                            filter: `blur(${particle.blurPx}px)`,
                            willChange: noMotion ? undefined : "transform",
                        }}
                        animate={
                            noMotion
                                ? undefined
                                : {
                                      x: [
                                          0,
                                          particle.driftX,
                                          0,
                                          -particle.driftX,
                                          0,
                                      ],
                                      y: [
                                          0,
                                          particle.driftY,
                                          particle.driftY * 0.4,
                                          -particle.driftY * 0.6,
                                          0,
                                      ],
                                      rotate: [
                                          0,
                                          particle.rotate,
                                          0,
                                          -particle.rotate,
                                          0,
                                      ],
                                  }
                        }
                        transition={
                            noMotion
                                ? undefined
                                : {
                                      duration: particle.duration,
                                      delay: particle.delay,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                  }
                        }
                    >
                        <Image
                            src={song.imageUrl}
                            alt=""
                            fill
                            sizes="200px"
                            className="rounded-xl object-cover"
                        />
                    </motion.div>
                );
            })}
        </div>
    );
}
