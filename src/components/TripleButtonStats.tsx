import { useState } from 'react';
import UserStats from "@/components/UserStats.tsx";

export default function StatsPage() {
    const [selectedSection, setSelectedSection] = useState<string>('user');

    const updateSection = (section: string) => {
        setSelectedSection(section);
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                {/* Encabezado dinámico */}
                <h2 className="text-2xl font-bold text-center md:text-left">
                    {selectedSection === 'user' && 'User Statistics'}
                    {selectedSection === 'general' && 'General Statistics'}
                    {selectedSection === 'friends' && 'Friends Statistics'}
                </h2>

                {/* Toggle Switch */}
                <div className="flex space-x-1 bg-[#1a1a1a] px-1 py-1 rounded-lg">
                    {['user', 'general', 'friends'].map((section) => (
                        <button
                            key={section}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition ${
                                selectedSection === section
                                    ? "bg-pink-700 text-white"
                                    : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                            }`}
                            onClick={() => updateSection(section)}
                        >
                            {section.charAt(0).toUpperCase() + section.slice(1)}
                        </button>
                    ))}
                </div>
            </div>


            <div className="my-4">
                <div id="dynamic-content">
                    {selectedSection === "user" && (
                        <div>
                            <UserStats />
                        </div>
                    )}

                    {selectedSection === "general" && (
                        <div className="text-center text-gray-400">
                            <p>Aquí se mostrarán estadísticas generales de Rock It!</p>
                        </div>
                    )}

                    {selectedSection === "friends" && (
                        <div className="text-center text-gray-400">
                            <p>Aquí se mostrarán estadísticas y comparativas con tus amigos.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};