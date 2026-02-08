import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const SettingsModal = ({ onClose }) => {
    const { theme, setTheme } = useTheme();
    const [showAbout, setShowAbout] = useState(false);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 w-[400px] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-scaleIn">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <span className="material-icons-round text-slate-500">settings</span>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Theme Section */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Appearance</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                            >
                                <div className="size-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                                    <span className="material-icons-round text-amber-500 text-sm">light_mode</span>
                                </div>
                                <span className={`text-sm font-semibold ${theme === 'light' ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>Light Mode</span>
                            </button>

                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                            >
                                <div className="size-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                                    <span className="material-icons-round text-blue-400 text-sm">dark_mode</span>
                                </div>
                                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>Dark Mode</span>
                            </button>
                        </div>
                    </div>

                    {/* Application Info */}
                    <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                        {/* Version */}
                        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="material-icons-round text-slate-400">info</span>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Version</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-500">1.0</span>
                        </div>

                        {/* About */}
                        <div
                            onClick={() => setShowAbout(!showAbout)}
                            className="flex flex-col p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <span className="material-icons-round text-slate-400">description</span>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">About CoScript</span>
                                </div>
                                <span className={`material-icons-round text-slate-400 text-sm transition-transform ${showAbout ? 'rotate-90' : ''}`}>chevron_right</span>
                            </div>

                            {showAbout && (
                                <div className="mt-3 ml-8 text-xs text-slate-500 dark:text-slate-400 leading-relaxed animate-fadeIn">
                                    <p>A real-time collaborative code editor built with React and Node.js.</p>
                                    <p className="mt-2">Features:</p>
                                    <ul className="list-disc pl-4 space-y-1 mt-1">
                                        <li>Real-time collaborative editing</li>
                                        <li>Multiple language support</li>
                                        <li>Socket.io synchronization</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Report Issue */}
                        <a
                            href="mailto:support@coscript.com?subject=Issue Report"
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 group transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-icons-round text-slate-400 group-hover:text-red-500 transition-colors">bug_report</span>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Report Issue</span>
                            </div>
                            <span className="material-icons-round text-slate-400 text-sm group-hover:text-red-500 transition-colors">open_in_new</span>
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-primary hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
