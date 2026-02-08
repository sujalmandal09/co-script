import React, { useState } from 'react';

const InviteModal = ({ roomId, onClose, clients }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('Editor');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <div className="w-full max-w-[560px] bg-white dark:bg-[#1a1f26] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-200 dark:border-slate-800 font-display">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <span className="material-icons-round text-primary text-xl">person_add</span>
                        </div>
                        <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Invite to collaboration</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Share Link */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Share the private link</h4>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-stretch rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden group focus-within:border-primary transition-all">
                                <input
                                    className="w-full bg-transparent border-none text-slate-600 dark:text-slate-300 px-4 py-3 text-sm focus:ring-0"
                                    readOnly
                                    value={window.location.href}
                                />
                                <button
                                    onClick={handleCopy}
                                    className="px-4 border-l border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors flex items-center"
                                >
                                    <span className="material-icons-round text-lg">{copied ? 'check' : 'content_copy'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Invite Email */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Invite via email</h4>
                        <div className="flex flex-col sm:flex-row items-stretch gap-3">
                            <div className="flex-1">
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 dark:text-slate-200"
                                    placeholder="Add emails separated by commas..."
                                    type="text"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 pr-8 focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer text-slate-700 dark:text-slate-200"
                                >
                                    <option>Editor</option>
                                    <option>Viewer</option>
                                    <option>Admin</option>
                                </select>
                                <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all shadow-sm active:scale-[0.98]">
                                    Invite
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* People List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">People with access</h4>
                            <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">{clients.length} Members</span>
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {clients.map((client) => (
                                <div key={client.socketId} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="size-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center text-white font-bold text-sm"
                                            style={{ backgroundColor: client.color || '#229bc3' }}
                                        >
                                            {client.username.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                {client.username} {client.socketId === window.socket?.id ? '(You)' : ''}
                                            </p>
                                            <p className="text-xs text-slate-500">user@codecollab.io</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {client.isHost ? (
                                            <span className="text-xs font-medium text-slate-400 mr-2">Owner</span>
                                        ) : (
                                            <div className="relative">
                                                <select className="text-xs font-semibold bg-transparent border-none p-0 pr-6 text-slate-600 dark:text-slate-400 focus:ring-0 cursor-pointer hover:text-primary transition-colors">
                                                    <option>Editor</option>
                                                    <option>Viewer</option>
                                                    <option>Remove</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span className="material-icons-round text-[16px] text-green-500">verified_user</span>
                        Only people with the link can request access.
                    </p>
                    <button onClick={onClose} className="text-sm font-bold hover:text-slate-900 dark:hover:text-white transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InviteModal;
