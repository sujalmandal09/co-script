import React, { useState, useCallback, useEffect, useRef } from 'react';

const API = 'http://localhost:3001/api/workspace';

// File type icons (material icons)
const getFileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    const icons = {
        js: '🟨', jsx: '⚛️', ts: '🔷', tsx: '⚛️',
        py: '🐍', java: '☕', c: '🔧', cpp: '🔧', cs: '🔷',
        html: '🌐', css: '🎨', json: '📋', md: '📝',
        go: '🔵', rs: '🦀', rb: '💎', php: '🐘',
        env: '🔒', gitignore: '📂', yml: '⚙️', yaml: '⚙️',
        txt: '📄', sh: '📜', sql: '🗃️',
    };
    return icons[ext] || '📄';
};

// --- Tree Node Component ---
const TreeNode = ({ node, depth, onFileClick, activeFile, onContextMenu }) => {
    const [expanded, setExpanded] = useState(false);
    const [children, setChildren] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        if (node.type === 'file') {
            onFileClick(node);
            return;
        }

        if (!expanded && !children) {
            setLoading(true);
            try {
                const res = await fetch(`${API}/tree?path=${encodeURIComponent(node.path)}`);
                const data = await res.json();
                setChildren(data.tree || []);
            } catch (e) {
                console.error('Failed to load directory:', e);
                setChildren([]);
            }
            setLoading(false);
        }
        setExpanded(!expanded);
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, node);
    };

    const isActive = node.type === 'file' && activeFile === node.path;

    return (
        <div>
            <div
                onClick={handleToggle}
                onContextMenu={handleContextMenu}
                className={`flex items-center gap-1 py-[3px] px-2 cursor-pointer text-[13px] select-none transition-colors ${isActive
                        ? 'bg-[#094771] text-white'
                        : 'text-gray-300 hover:bg-[#2a2d2e]'
                    }`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
            >
                {/* Expand/collapse arrow */}
                {node.type === 'directory' ? (
                    <span className="text-[10px] text-gray-400 w-3 inline-block">
                        {loading ? '⟳' : expanded ? '▾' : '▸'}
                    </span>
                ) : (
                    <span className="w-3 inline-block" />
                )}
                {/* Icon */}
                <span className="text-xs">
                    {node.type === 'directory' ? (expanded ? '📂' : '📁') : getFileIcon(node.name)}
                </span>
                {/* Name */}
                <span className="truncate">{node.name}</span>
            </div>
            {/* Children */}
            {expanded && children && children.map(child => (
                <TreeNode
                    key={child.path}
                    node={child}
                    depth={depth + 1}
                    onFileClick={onFileClick}
                    activeFile={activeFile}
                    onContextMenu={onContextMenu}
                />
            ))}
        </div>
    );
};

// --- Main WorkspaceExplorer Component ---
const WorkspaceExplorer = ({ onFileOpen, activeFile, workspacePath, onWorkspaceChange }) => {
    const [tree, setTree] = useState([]);
    const [gitBranch, setGitBranch] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [creating, setCreating] = useState(null); // { parentPath, type: 'file'|'folder' }
    const [newName, setNewName] = useState('');
    const newNameRef = useRef(null);

    // Load workspace tree
    const loadWorkspace = useCallback(async (folderPath) => {
        try {
            const res = await fetch(`${API}/open`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderPath }),
            });
            const data = await res.json();
            if (data.tree) {
                setTree(data.tree);
                setGitBranch(data.gitBranch);
                if (onWorkspaceChange) onWorkspaceChange(folderPath);
            }
        } catch (e) {
            console.error('Failed to open workspace:', e);
        }
    }, [onWorkspaceChange]);

    // Load on mount if workspace exists
    useEffect(() => {
        if (workspacePath) {
            loadWorkspace(workspacePath);
        }
    }, [workspacePath]);

    // Open Folder handler
    const handleOpenFolder = async () => {
        const folderPath = prompt('Enter folder path to open as workspace:\n\n(e.g., /Users/bishalll/myproject)');
        if (folderPath && folderPath.trim()) {
            await loadWorkspace(folderPath.trim());
        }
    };

    // File click -> open in editor
    const handleFileClick = async (node) => {
        try {
            const res = await fetch(`${API}/read?path=${encodeURIComponent(node.path)}`);
            const data = await res.json();
            if (data.content !== undefined) {
                onFileOpen({
                    name: node.name,
                    path: node.path,
                    content: data.content,
                });
            }
        } catch (e) {
            console.error('Failed to read file:', e);
        }
    };

    // Context menu
    const handleContextMenu = (e, node) => {
        setContextMenu({ x: e.clientX, y: e.clientY, node });
    };

    useEffect(() => {
        const close = () => setContextMenu(null);
        if (contextMenu) document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [contextMenu]);

    // Create file/folder
    const handleCreate = async (parentPath, type) => {
        setCreating({ parentPath, type });
        setNewName('');
        setContextMenu(null);
        setTimeout(() => newNameRef.current?.focus(), 50);
    };

    const finishCreate = async () => {
        if (!creating || !newName.trim()) { setCreating(null); return; }
        const targetPath = `${creating.parentPath}/${newName.trim()}`;
        try {
            await fetch(`${API}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetPath, type: creating.type }),
            });
            // Reload tree
            if (workspacePath) loadWorkspace(workspacePath);
        } catch (e) {
            console.error('Create failed:', e);
        }
        setCreating(null);
    };

    // Delete
    const handleDelete = async (node) => {
        if (!window.confirm(`Delete "${node.name}"?`)) return;
        setContextMenu(null);
        try {
            await fetch(`${API}/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetPath: node.path }),
            });
            if (workspacePath) loadWorkspace(workspacePath);
        } catch (e) {
            console.error('Delete failed:', e);
        }
    };

    // Rename
    const handleRename = async (node) => {
        const newNodeName = prompt('New name:', node.name);
        if (!newNodeName || newNodeName === node.name) { setContextMenu(null); return; }
        setContextMenu(null);
        const parentDir = node.path.substring(0, node.path.lastIndexOf('/'));
        const newPath = `${parentDir}/${newNodeName}`;
        try {
            await fetch(`${API}/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPath: node.path, newPath }),
            });
            if (workspacePath) loadWorkspace(workspacePath);
        } catch (e) {
            console.error('Rename failed:', e);
        }
    };

    const workspaceName = workspacePath ? workspacePath.split('/').pop() : null;

    return (
        <div className="h-full flex flex-col bg-[#252526] text-gray-300 text-sm select-none">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#333]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Workspace
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleOpenFolder}
                        className="text-gray-400 hover:text-white p-0.5 hover:bg-[#333] rounded text-xs"
                        title="Open Folder"
                    >
                        📂
                    </button>
                    {workspacePath && (
                        <button
                            onClick={() => loadWorkspace(workspacePath)}
                            className="text-gray-400 hover:text-white p-0.5 hover:bg-[#333] rounded text-xs"
                            title="Refresh"
                        >
                            ⟳
                        </button>
                    )}
                </div>
            </div>

            {/* Workspace name + git branch */}
            {workspaceName && (
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-200 bg-[#2d2d2d] border-b border-[#333] flex items-center gap-2">
                    <span>{workspaceName}</span>
                    {gitBranch && (
                        <span className="text-[10px] text-gray-400 bg-[#333] px-1.5 py-0.5 rounded">
                            ⎇ {gitBranch}
                        </span>
                    )}
                </div>
            )}

            {/* Tree */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
                {!workspacePath ? (
                    <div className="text-center py-8 text-gray-500 text-xs">
                        <p className="mb-3">No workspace folder open</p>
                        <button
                            onClick={handleOpenFolder}
                            className="px-3 py-1.5 bg-[#007acc] text-white rounded text-xs hover:bg-[#006bb3] transition-colors"
                        >
                            Open Folder
                        </button>
                    </div>
                ) : tree.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-xs">Empty folder</div>
                ) : (
                    tree.map(node => (
                        <TreeNode
                            key={node.path}
                            node={node}
                            depth={0}
                            onFileClick={handleFileClick}
                            activeFile={activeFile}
                            onContextMenu={handleContextMenu}
                        />
                    ))
                )}
                {/* Inline create input */}
                {creating && (
                    <div className="px-4 py-1">
                        <input
                            ref={newNameRef}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={finishCreate}
                            onKeyDown={(e) => { if (e.key === 'Enter') finishCreate(); if (e.key === 'Escape') setCreating(null); }}
                            placeholder={`New ${creating.type} name...`}
                            className="bg-[#3c3c3c] text-white text-xs px-2 py-1 rounded outline-none w-full border border-[#007acc]"
                        />
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed bg-[#252526] border border-[#454545] rounded shadow-xl z-[9999] py-1 min-w-[160px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.node.type === 'directory' && (
                        <>
                            <button onClick={() => handleCreate(contextMenu.node.path, 'file')} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#094771] hover:text-white">
                                New File
                            </button>
                            <button onClick={() => handleCreate(contextMenu.node.path, 'folder')} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#094771] hover:text-white">
                                New Folder
                            </button>
                            <div className="border-t border-[#454545] my-1" />
                        </>
                    )}
                    <button onClick={() => handleRename(contextMenu.node)} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#094771] hover:text-white">
                        Rename
                    </button>
                    <button onClick={() => handleDelete(contextMenu.node)} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-[#094771] hover:text-white">
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

export default WorkspaceExplorer;
