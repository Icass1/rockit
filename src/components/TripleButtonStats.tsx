import { useState } from 'react';
import UserStats from "@/components/UserStats.tsx";

export default function StatsPage() {
    const [selectedSection, setSelectedSection] = useState<string>('user');

    const updateSection = (section: string) => {
        setSelectedSection(section);
    };

    return (
        <div>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                    {selectedSection === 'user' && 'User Statistics'}
                    {selectedSection === 'general' && 'General Statistics'}
                    {selectedSection === 'friends' && 'Friends Statistics'}
                </h2>
                
                <div className="flex space-x-1 bg-[#1a1a1a] w-fit px-1 py-1 rounded-lg ml-auto">
                    <button
                        className={selectedSection === 'user' ? "px-4 py-2 rounded-md text-sm font-bold transition bg-pink-700 text-white" : "px-4 py-2 rounded-md text-sm font-bold transition bg-zinc-800 text-gray-400 hover:bg-zinc-700"}
                        onClick={() => updateSection('user')}
                    >
                        User
                    </button>
                    <button
                        className={selectedSection === 'general' ? "px-4 py-2 rounded-md text-sm font-bold transition bg-pink-700 text-white" : "px-4 py-2 rounded-md text-sm font-bold transition bg-zinc-800 text-gray-400 hover:bg-zinc-700"}
                        onClick={() => updateSection('general')}
                    >
                        General
                    </button>
                    <button
                        className={selectedSection === 'friends' ? "px-4 py-2 rounded-md text-sm font-bold transition bg-pink-700 text-white" : "px-4 py-2 rounded-md text-sm font-bold transition bg-zinc-800 text-gray-400 hover:bg-zinc-700"}
                        onClick={() => updateSection('friends')}
                    >
                        Friends
                    </button>
                </div>
            </div>

            <div className="mt-4">
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