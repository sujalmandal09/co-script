import React, { useState, useRef, useEffect } from 'react';
import VSCodeTerminal from './VSCodeTerminal';

const TerminalTabs = ({ socket, onClose, workspacePath }) => {
    const [tabs, setTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [renamingTab, setRenamingTab] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [contextMenu, setContextMenu] = useState(null);
    const renameInputRef = useRef(null);
    const didAutoCreate = useRef(false);

    // Create a new terminal via socket
    const createTerminal = () => {
        if (!socket) return;
        const cwd = workspacePath || undefined;
        socket.emit('terminal:create', { cwd });
    };

    // Create first terminal on mount (only once)
    useEffect(() => {
        if (socket && !didAutoCreate.current) {
            didAutoCreate.current = true;
            createTerminal();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket]);

    // Listen for terminal:created/killed/renamed events
    useEffect(() => {
        if (!socket) return;

        const handleCreated = ({ id, name, shell, cwd }) => {
            setTabs(prev => {
                const clientName = `Terminal ${prev.length + 1}`;
                return [...prev, { id, name: clientName, shell, cwd }];
            });
            setActiveTab(id);
        };

        const handleKilled = ({ id }) => {
            setTabs(prev => {
                const remaining = prev.filter(t => t.id !== id);
                setActiveTab(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
                return remaining;
            });
        };

        const handleRenamed = ({ id, name }) => {
            setTabs(prev => prev.map(t => t.id === id ? { ...t, name } : t));
        };

        socket.on('terminal:created', handleCreated);
        socket.on('terminal:killed', handleKilled);
        socket.on('terminal:renamed', handleRenamed);

        return () => {
            socket.off('terminal:created', handleCreated);
            socket.off('terminal:killed', handleKilled);
            socket.off('terminal:renamed', handleRenamed);
        };
    }, [socket]);

    const killTerminal = (id) => {
        if (socket) socket.emit('terminal:kill', { id });
    };

    const startRename = (tab) => {
        setRenamingTab(tab.id);
        setRenameValue(tab.name);
        setContextMenu(null);
        setTimeout(() => renameInputRef.current?.focus(), 50);
    };

    const finishRename = () => {
        if (renamingTab && renameValue.trim() && socket) {
            socket.emit('terminal:rename', { id: renamingTab, name: renameValue.trim() });
        }
        setRenamingTab(null);
    };

    const handleTabContextMenu = (e, tab) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, tab });
    };

    // Close context menu on click outside
    useEffect(() => {
        const close = () => setContextMenu(null);
        if (contextMenu) document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [contextMenu]);

    return (
        <div className="h-full w-full bg-[#1e1e1e] flex flex-col">
            {/* Tab Bar */}
            <div className="flex items-center bg-[#252526] border-b border-[#333] px-1 flex-shrink-0 select-none">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1.5">Terminal</span>

                <div className="flex items-center gap-0 overflow-x-auto flex-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            onContextMenu={(e) => handleTabContextMenu(e, tab)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-[#333] whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc] border-b-0'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]'
                                }`}
                        >
                            <span className="text-[10px] text-green-400">⬤</span>
                            {renamingTab === tab.id ? (
                                <input
                                    ref={renameInputRef}
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={finishRename}
                                    onKeyDown={(e) => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setRenamingTab(null); }}
                                    className="bg-[#3c3c3c] text-white text-xs px-1 py-0 rounded outline-none w-20"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span>{tab.name}</span>
                            )}
                            <span
                                onClick={(e) => { e.stopPropagation(); killTerminal(tab.id); }}
                                className="text-gray-500 hover:text-white text-[10px] ml-1 cursor-pointer"
                            >
                                ✕
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1 px-2">
                    <button
                        onClick={createTerminal}
                        className="text-gray-400 hover:text-white p-1 hover:bg-[#333] rounded text-sm"
                        title="New Terminal"
                    >
                        +
                    </button>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1 hover:bg-[#333] rounded text-sm"
                        title="Close Panel"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Terminal Instances */}
            <div className="flex-1 relative overflow-hidden">
                {tabs.length === 0 && (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                        No terminals open.{' '}
                        <button onClick={createTerminal} className="text-blue-400 hover:underline ml-1">
                            Create one
                        </button>
                    </div>
                )}
                {tabs.map(tab => (
                    <VSCodeTerminal
                        key={tab.id}
                        socket={socket}
                        terminalId={tab.id}
                        isActive={activeTab === tab.id}
                    />
                ))}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed bg-[#252526] border border-[#454545] rounded shadow-xl z-[9999] py-1 min-w-[140px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        onClick={() => startRename(contextMenu.tab)}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#094771] hover:text-white"
                    >
                        Rename
                    </button>
                    <button
                        onClick={() => { killTerminal(contextMenu.tab.id); setContextMenu(null); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#094771] hover:text-white"
                    >
                        Kill Terminal
                    </button>
                </div>
            )}
        </div>
    );
};

export default TerminalTabs;
