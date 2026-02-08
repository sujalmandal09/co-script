import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import Editor from "@monaco-editor/react";
import { socket } from "./socket";
import { useAuth } from "./AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import JoinRequestNotification from "./components/JoinRequestNotification";
import InviteModal from "./components/InviteModal";
import SettingsModal from "./components/SettingsModal";
import "./EditorPage.css";

// Refactored to keep the NEW UI but RESTORE full functionality and branding

export default function EditorPage() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  // --- EDITOR STATE ---
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");

  // --- ROOM & HOST STATE ---
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(searchParams.get("host") === "true");
  const [clients, setClients] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);

  // --- UI STATE ---
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  // Modals & Popovers
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserList, setShowUserList] = useState(false); // For user list popover
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false); // For custom dropdown

  // Sidebar Toggles
  const [showExplorer, setShowExplorer] = useState(true);
  const [showChat, setShowChat] = useState(true);

  // --- CHAT STATE ---
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  // Removed activeTab state as Activity section is removed

  // --- FILES STATE ---
  const [files, setFiles] = useState({
    "main.js": { name: "main.js", language: "javascript", content: "// Write your JavaScript code here\nconsole.log('Hello World!');" },
    "styles.css": { name: "styles.css", language: "css", content: "/* Add your CSS styles here */\nbody {\n  background: #f0f0f0;\n}" }
  });
  const [activeFile, setActiveFile] = useState("main.js");
  const [expandedFolders, setExpandedFolders] = useState({}); // Track expanded specific folders by path string

  // --- TERMINAL STATE ---
  const [activeTerminalTab, setActiveTerminalTab] = useState('terminal'); // 'terminal', 'debug', 'output'
  const [terminalHeight, setTerminalHeight] = useState(192); // Default 192px (~48 tailwind unit)
  const [showTerminal, setShowTerminal] = useState(true);
  const isResizingTerminal = useRef(false);

  // Resize Logic
  const startResizingTerminal = useCallback((e) => {
    e.preventDefault(); // Prevent text selection
    isResizingTerminal.current = true;
    document.addEventListener('mousemove', handleResizeTerminal);
    document.addEventListener('mouseup', stopResizingTerminal);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none'; // Disable selection while dragging
  }, []);

  const stopResizingTerminal = useCallback(() => {
    isResizingTerminal.current = false;
    document.removeEventListener('mousemove', handleResizeTerminal);
    document.removeEventListener('mouseup', stopResizingTerminal);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const handleResizeTerminal = useCallback((e) => {
    if (!isResizingTerminal.current) return;
    // Calculate height from bottom
    const newHeight = window.innerHeight - e.clientY;
    // Constraints: Min 36px (header), Max 80% of screen
    if (newHeight >= 36 && newHeight <= window.innerHeight * 0.8) {
      setTerminalHeight(newHeight);
    }
  }, []);

  const programmingLanguages = [
    { id: "javascript", name: "JavaScript", ext: "js", icon: "javascript" },
    { id: "python", name: "Python", ext: "py", icon: "data_object" },
    { id: "java", name: "Java", ext: "java", icon: "coffee" },
    { id: "cpp", name: "C++", ext: "cpp", icon: "code" },
    { id: "csharp", name: "C#", ext: "cs", icon: "code" },
    { id: "rust", name: "Rust", ext: "rs", icon: "settings" },
    { id: "go", name: "Go", ext: "go", icon: "code" },
  ];

  const getUserColor = (name) => {
    const colors = ["#8B5CF6", "#06B6D4", "#F59E0B", "#EC4899", "#10B981"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // --- SOCKET & APP LOGIC ---

  useEffect(() => {
    if (!roomId) { navigate("/"); return; }

    // Join Room logic
    if (isHost) {
      // As host, we join immediately
      socket.emit("join_room", { roomId, username: user?.name || "Host" });
      setClients([{ socketId: socket.id, username: user?.name || "Host", color: getUserColor(user?.name || "Host"), isHost: true }]);
    }

    // Handlers
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleLoadCode = ({ code: loadedCode }) => setCode(loadedCode || "");

    const handleCodeUpdate = ({ code: updatedCode }) => {
      if (updatedCode !== code) setCode(updatedCode);
    };

    const handleJoinRequest = ({ socketId, userName, userId }) => {
      if (isHost) setJoinRequests(prev => [...prev, { socketId, userName, userId }]);
    };

    const handleUserJoined = ({ userName, socketId }) => {
      setClients(prev => {
        if (prev.find(c => c.socketId === socketId)) return prev;
        return [...prev, { socketId, username: userName, color: getUserColor(userName) }];
      });
      // Add Activity Log - Displayed as system message in chat
      setMessages(prev => [...prev, { system: true, text: `${userName} joined the session` }]);
    };

    const handleUserLeft = ({ socketId, userName }) => {
      setClients(prev => prev.filter(c => c.socketId !== socketId));
      setMessages(prev => [...prev, { system: true, text: `${userName || 'A user'} left` }]);
    };

    const handleRoomUsers = ({ users, hostSocketId }) => {
      setClients(users.map(u => ({
        socketId: u.socketId,
        username: u.userName,
        color: getUserColor(u.userName),
        isHost: u.socketId === hostSocketId
      })));
    };

    const handleReceiveMessage = ({ username, message, time }) => {
      setMessages(prev => [...prev, {
        username,
        text: message,
        time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: false
      }]);
    };

    // Listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("load_code", handleLoadCode);
    socket.on("code_update", handleCodeUpdate);
    socket.on("join_request", handleJoinRequest);
    socket.on("user_joined", handleUserJoined);
    socket.on("user_left", handleUserLeft);
    socket.on("room_users", handleRoomUsers);
    socket.on("receive_message", handleReceiveMessage);

    socket.emit("get_room_users", { roomId });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("load_code", handleLoadCode);
      socket.off("code_update", handleCodeUpdate);
      socket.off("join_request", handleJoinRequest);
      socket.off("user_joined", handleUserJoined);
      socket.off("user_left", handleUserLeft);
      socket.off("room_users", handleRoomUsers);
      socket.off("receive_message", handleReceiveMessage);

      socket.emit("leave_room", { roomId });
    };
  }, [roomId, navigate, isHost, user]);

  // Code Change
  const handleChange = useCallback((value = "") => {
    setCode(value);
    setFiles(prev => ({
      ...prev,
      [activeFile]: { ...prev[activeFile], content: value }
    }));
    socket.emit("code_change", { roomId, code: value });
  }, [roomId, activeFile]);

  const handleFileSwitch = (fileName) => {
    const file = files[fileName];
    // Guard: don't switch if file doesn't exist or is a folder
    if (!file || file.isFolder) {
      return;
    }
    setActiveFile(fileName);
    setLanguage(file.language || 'plaintext');
    setCode(file.content || '');
    // In a real multi-file system, we would sync file switch too. 
    // For now, this updates the local editor view.
  };

  // Run Code
  const handleRunCode = async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    // Explicitly set 'Compiling...' first
    setOutput(["Compiling..."]);

    try {
      const response = await fetch("http://localhost:3001/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code }),
      });
      const result = await response.json();

      if (result.success) {
        setOutput((result.output || "✓ Code executed successfully").split('\n'));
      } else {
        // Enhanced Error Display logic from EnhancedTerminal will be in render
        setOutput((result.error || "Unknown Error").split('\n'));
      }
    } catch (error) {
      setOutput([`✗ Error: ${error.message}`]);
    }
    setIsRunning(false);
  };

  // Chat Send
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgData = {
      roomId,
      username: user?.name || "Me",
      message: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Optimistic update
    setMessages(prev => [...prev, { ...msgData, text: newMessage, isMe: true }]); // mapped to text for UI

    // Emit
    socket.emit("send_message", msgData);
    setNewMessage("");
  };

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const copyRoomId = async () => {
    try { await navigator.clipboard.writeText(roomId); } catch (e) { }
  };

  // --- FILE SYSTEM LOGIC ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // If folder upload (webkitdirectory)
      if (file.webkitRelativePath) {
        // This usually only gives one file if not iterated, handled differently usually.
        // For simplicity in this mock, we assume 'files' has all files.
        const allFiles = Array.from(e.target.files);
        const newFiles = { ...files };

        allFiles.forEach(f => {
          // Basic flattening of structure for this simple mock
          // In a real app we'd build a tree. Here we just add flat keys for display.
          const path = f.webkitRelativePath || f.name;
          if (!newFiles[path]) {
            newFiles[path] = {
              name: f.name,
              path: path,
              language: f.name.split('.').pop(),
              content: "// Loaded from upload"
            };
            // Attempt to read content if text
            const reader = new FileReader();
            reader.onload = (ev) => {
              setFiles(prev => ({
                ...prev,
                [path]: { ...prev[path], content: ev.target.result }
              }));
            };
            reader.readAsText(f);
          }
        });
        setFiles(newFiles);
      } else {
        // Single file
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target.result;
          setFiles(prev => ({
            ...prev,
            [file.name]: { name: file.name, language: "javascript", content: content }
          }));
          setCode(content);
          setActiveFile(file.name);
        };
        reader.readAsText(file);
      }
    }
  };

  const createNewFile = () => {
    const fileName = prompt("Enter file name (e.g., script.js):");
    if (fileName && !files[fileName]) {
      setFiles(prev => ({
        ...prev,
        [fileName]: { name: fileName, language: fileName.split('.').pop() || 'txt', content: "" }
      }));
      setActiveFile(fileName);
    }
  };

  const createNewFolder = () => {
    const folderName = prompt("Enter folder name:");
    if (folderName) {
      const path = folderName + "/";
      if (!files[path]) {
        setFiles(prev => ({
          ...prev,
          [path]: { name: folderName, path: path, isFolder: true }
        }));
        setExpandedFolders(prev => ({ ...prev, [path]: true }));
      }
    }
  };

  // Helper function to detect language from file extension
  const getLanguageFromExtension = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const langMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'txt': 'plaintext'
    };
    return langMap[ext] || 'plaintext';
  };

  // Folders/files to skip for performance
  const EXCLUDED_FOLDERS = ['node_modules', '.git', '.next', 'dist', 'build', '.cache', 'coverage'];
  const EXCLUDED_FILES = ['.DS_Store', 'Thumbs.db'];

  // Helper function to recursively read a directory
  const readDirectoryRecursively = async (dirHandle, parentPath, filesMap) => {
    const folderPath = parentPath ? `${parentPath}${dirHandle.name}/` : `${dirHandle.name}/`;

    // Add folder entry
    filesMap[folderPath] = {
      name: dirHandle.name,
      path: folderPath,
      isFolder: true
    };

    // Iterate through all entries in the directory
    for await (const entry of dirHandle.values()) {
      // Skip hidden files/folders (starting with .)
      if (entry.name.startsWith('.') && entry.name !== '.env') continue;
      // Skip excluded folders
      if (entry.kind === 'directory' && EXCLUDED_FOLDERS.includes(entry.name)) continue;
      // Skip excluded files
      if (entry.kind === 'file' && EXCLUDED_FILES.includes(entry.name)) continue;

      if (entry.kind === 'directory') {
        // Recursively read subdirectory
        await readDirectoryRecursively(entry, folderPath, filesMap);
      } else if (entry.kind === 'file') {
        // Read file content
        try {
          const file = await entry.getFile();
          const content = await file.text();
          const filePath = folderPath + entry.name;

          filesMap[filePath] = {
            name: entry.name,
            path: filePath,
            language: getLanguageFromExtension(entry.name),
            content: content
          };
        } catch (err) {
          console.warn(`Could not read file ${entry.name}:`, err);
        }
      }
    }
  };

  // Open folder using native File System Access API
  const openFolder = async () => {
    try {
      // Check if the API is supported
      if (!('showDirectoryPicker' in window)) {
        alert('Your browser does not support opening local folders. Please use Chrome, Edge, or another Chromium-based browser.');
        return;
      }

      // Open native folder picker dialog
      const dirHandle = await window.showDirectoryPicker();

      // Recursively read all files from the selected folder
      const newFiles = {};
      await readDirectoryRecursively(dirHandle, '', newFiles);

      // Update state with all read files
      setFiles(prev => ({ ...prev, ...newFiles }));

      // Expand the root folder
      setExpandedFolders(prev => ({ ...prev, [dirHandle.name + '/']: true }));

      // If there are files, open the first one
      const firstFile = Object.keys(newFiles).find(key => !newFiles[key].isFolder);
      if (firstFile) {
        handleFileSwitch(firstFile);
      }

    } catch (err) {
      // User cancelled the picker - this is not an error
      if (err.name !== 'AbortError') {
        console.error('Error opening folder:', err);
        alert('Error opening folder: ' + err.message);
      }
    }
  };

  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const buildFileTree = (filesMap) => {
    const tree = {};
    Object.keys(filesMap).forEach(path => {
      const parts = path.split('/');
      let currentLevel = tree;
      if (parts.length > 0 && parts[parts.length - 1] === "") {
        parts.pop();
      }
      parts.forEach((part, index) => {
        if (!currentLevel[part]) {
          currentLevel[part] = {
            __meta: { name: part, path: parts.slice(0, index + 1).join("/") + (index < parts.length - 1 ? "/" : "") },
            children: {}
          };
        }
        if (index === parts.length - 1) {
          const fileData = filesMap[path];
          if (fileData) currentLevel[part].__fileData = fileData;
        }
        currentLevel = currentLevel[part].children;
      });
    });
    return tree;
  };

  const FileTreeNode = ({ node, name, fullPath, level = 0 }) => {
    const isFolder = !node.__fileData || node.__fileData.isFolder;
    const isExpanded = expandedFolders[fullPath] || false;
    const indentWith = level * 12;

    const childrenKeys = Object.keys(node.children || {}).sort((a, b) => {
      const aIsFolder = !node.children[a].__fileData || node.children[a].__fileData.isFolder;
      const bIsFolder = !node.children[b].__fileData || node.children[b].__fileData.isFolder;
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      return a.localeCompare(b);
    });

    if (isFolder) {
      return (
        <div>
          <div
            className="flex items-center gap-1.5 px-2 py-1 text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-technical select-none transition-colors"
            style={{ paddingLeft: `${indentWith + 8}px` }}
            onClick={() => toggleFolder(fullPath)}
          >
            <span className={`material-icons-round text-[18px] text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
            <span className="material-icons-round text-[16px] text-amber-500/80">{isExpanded ? 'folder_open' : 'folder'}</span>
            <span className="text-sm font-medium truncate">{name}</span>
          </div>

          {isExpanded && (
            <div>
              {childrenKeys.map(childName => (
                <FileTreeNode
                  key={childName}
                  node={node.children[childName]}
                  name={childName}
                  fullPath={node.children[childName].__meta.path}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      );
    } else {
      // It's a File
      const file = node.__fileData;
      const isActive = activeFile === file.name || (activeFile === fullPath);

      return (
        <div
          onClick={() => handleFileSwitch(fullPath)}
          className={`flex items-center gap-2 px-2 py-1 cursor-pointer rounded-technical transition-colors ${isActive ? 'bg-white dark:bg-slate-800 text-primary shadow-sm border border-border-main dark:border-slate-700' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800'}`}
          style={{ marginLeft: `${indentWith + 12}px` }}
        >
          <span className={`material-icons-round text-[16px] ${file.language === 'css' ? 'text-indigo-400' : 'text-amber-400'}`}>
            {file.language === 'css' ? 'css' : 'javascript'}
          </span>
          <span className={`text-sm truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>{name}</span>
        </div>
      );
    }
  };

  const renderFileTree = () => {
    const tree = buildFileTree(files);
    return (
      <div className="space-y-0.5 mt-1 pb-4">
        {Object.keys(tree).sort((a, b) => {
          const nodeA = tree[a];
          const nodeB = tree[b];
          const aIsFolder = !nodeA.__fileData || nodeA.__fileData.isFolder;
          const bIsFolder = !nodeB.__fileData || nodeB.__fileData.isFolder;
          if (aIsFolder && !bIsFolder) return -1;
          if (!aIsFolder && bIsFolder) return 1;
          return a.localeCompare(b);
        }).map(rootName => (
          <FileTreeNode
            key={rootName}
            node={tree[rootName]}
            name={rootName}
            fullPath={tree[rootName].__meta.path}
          />
        ))}
      </div>
    );
  };

  const handleAcceptRequest = (request) => {
    socket.emit("join_response", { roomId, requesterSocketId: request.socketId, accepted: true, userName: request.userName });
    setJoinRequests(prev => prev.filter(r => r.socketId !== request.socketId));
  };
  const handleDeclineRequest = (request) => {
    socket.emit("join_response", { roomId, requesterSocketId: request.socketId, accepted: false });
    setJoinRequests(prev => prev.filter(r => r.socketId !== request.socketId));
  };


  return (
    <div className="bg-white font-display text-slate-900 h-screen flex flex-col overflow-hidden selection:bg-indigo-100 dark:bg-slate-900 dark:text-slate-100">

      {/* Notifications */}
      {isHost && (
        <JoinRequestNotification
          requests={joinRequests}
          onAccept={handleAcceptRequest}
          onDecline={handleDeclineRequest}
        />
      )}
      {showInviteModal && <InviteModal roomId={roomId} clients={clients} onClose={() => setShowInviteModal(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple webkitdirectory="" mozdirectory="" />

      {/* --- HEADER --- */}
      <header className="flex items-center justify-between h-12 px-4 bg-white dark:bg-slate-900 border-b border-border-main dark:border-slate-800 z-50">
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle */}
          <button
            onClick={() => setShowExplorer(!showExplorer)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Toggle Sidebar"
          >
            <span className="material-icons-round text-xl">menu</span>
          </button>

          {/* Branding Matched to Home.jsx */}
          <div className="flex items-center gap-2">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
              <span className="material-icons-round text-lg">code</span>
            </div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">CoScript</h1>
          </div>

          <div className="h-4 w-[1px] bg-border-main dark:bg-slate-800"></div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-sidebar-bg dark:bg-slate-800 px-2 py-1 border border-border-main dark:border-slate-700 rounded-technical">
            <span>#{roomId}</span>
            <button onClick={copyRoomId} className="hover:text-primary transition-colors flex items-center" title="Copy Room ID">
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* User Avatars with Logic */}
          <div className="flex -space-x-1 relative">
            {clients.slice(0, 3).map((c, i) => (
              <div
                key={i}
                className="size-7 rounded-technical border border-border-main dark:border-slate-700 flex items-center justify-center text-white text-[10px] font-bold"
                style={{ backgroundColor: c.color }}
                title={c.username}
              >
                {c.username.substring(0, 2).toUpperCase()}
              </div>
            ))}
            {clients.length > 3 && (
              <button
                onClick={() => setShowUserList(!showUserList)}
                className="size-7 rounded-technical border border-border-main dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-10"
              >
                +{clients.length - 3}
              </button>
            )}

            {/* User List Popover */}
            {showUserList && (
              <div className="absolute top-8 right-0 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 animate-scaleIn">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 mb-1">Participants</div>
                {clients.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                    <div className="size-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: c.color }}>
                      {c.username.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{c.username}</span>
                    {c.isHost && <span className="text-[9px] text-amber-500 font-bold border border-amber-500/30 px-1 rounded">HOST</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-primary hover:bg-blue-700 text-white px-3 py-1.5 rounded-technical text-xs font-medium transition-colors shadow-sm"
          >
            Share
          </button>

          <div className="h-4 w-[1px] bg-border-main dark:bg-slate-800"></div>



          {/* Terminal Toggle */}
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`transition-colors ${showTerminal ? 'text-primary' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            title="Toggle Terminal"
          >
            <span className="material-symbols-outlined text-xl">terminal</span>
          </button>

          <div className="h-4 w-[1px] bg-border-main dark:bg-slate-800"></div>

          {/* Chat Toggle Button */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`transition-colors ${showChat ? 'text-primary' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            title="Toggle Team Chat"
          >
            <span className="material-icons-round text-xl">chat</span>
          </button>

          {/* Functional Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Settings"
          >
            <span className="material-symbols-outlined text-sm">settings</span>
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex overflow-hidden">

        {/* LEFT SIDEBAR (EXPLORER) - Collapsible with Transition */}
        {/* LEFT SIDEBAR (EXPLORER) - Collapsible with Transition */}
        <aside className={`bg-sidebar-bg dark:bg-slate-950 flex flex-col border-r border-border-main dark:border-slate-800 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${showExplorer ? 'w-60 opacity-100' : 'w-0 opacity-0 border-r-0'}`}>
          <div className="w-60 min-w-[15rem] flex flex-col h-full"> {/* Fixed width inner container to prevent squashing */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-slate-400 text-sm">folder_open</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Explorer</span>
              </div>
              {/* File Actions */}
              <div className="flex gap-2 text-slate-400">
                <button onClick={openFolder} className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title="Open Folder">
                  <span className="material-icons-round text-sm">create_new_folder</span>
                </button>
                <button onClick={createNewFile} className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title="New File">
                  <span className="material-icons-round text-sm">note_add</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title="Upload File/Folder">
                  <span className="material-icons-round text-sm">upload_file</span>
                </button>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 mt-2">
              {renderFileTree()}
            </nav>

            <div className="p-3 border-t border-border-main dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
              <div className="flex items-center gap-2">
                <div className={`size-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isConnected ? 'System Online' : 'Reconnecting...'}</span>
              </div>
            </div>
          </div>
        </aside>


        {/* CENTER (EDITOR) */}
        <section className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-900 relative">

          {/* Editor Tabs / Breadcrumbs */}
          <div className="flex items-center bg-sidebar-bg dark:bg-slate-950 h-9 border-b border-border-main dark:border-slate-800">
            <div className="flex h-full">
              {Object.entries(files)
                .filter(([path, file]) => !file.isFolder) // Only show files, not folders
                .slice(0, 10) // Limit to 10 tabs to prevent overflow
                .map(([path, file]) => (
                  <div
                    key={path}
                    onClick={() => handleFileSwitch(path)}
                    className={`flex items-center gap-2 px-3 border-r border-border-main dark:border-slate-800 text-[11px] cursor-pointer transition-colors ${activeFile === path ? 'bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 border-t-2 border-t-primary' : 'font-medium text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <span className={`material-icons-round text-[14px] ${activeFile === path ? 'text-primary' : ''}`}>description</span>
                    {file.name}
                    {activeFile === path && (
                      <span className="material-icons-round text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded p-0.5 ml-1">close</span>
                    )}
                  </div>
                ))}
            </div>
            <div className="flex-1 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <span>src</span>
                <span>/</span>
                <span>components</span>
                <span>/</span>
                <span className="text-slate-600 dark:text-slate-300 font-bold">{activeFile}</span>
              </div>

              {/* Custom Language Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg hover:border-primary transition-colors uppercase tracking-wider"
                >
                  {programmingLanguages.find(l => l.id === language)?.name}
                  <span className="material-icons-round text-[14px] text-slate-400">expand_more</span>
                </button>

                {showLanguageDropdown && (
                  <div className="absolute right-0 top-8 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-scaleIn">
                    {programmingLanguages.map(l => (
                      <button
                        key={l.id}
                        onClick={() => { setLanguage(l.id); setShowLanguageDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-[11px] font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${language === l.id ? 'text-primary bg-blue-50/50 dark:bg-blue-900/10' : 'text-slate-600 dark:text-slate-300'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-icons-round text-[14px] text-slate-400">{l.icon || 'code'}</span>
                          {l.name}
                        </div>
                        {language === l.id && <span className="material-icons-round text-[14px]">check</span>}
                      </button>
                    ))}
                  </div>
                )}
                {/* Overlay to close */}
                {showLanguageDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowLanguageDropdown(false)}></div>}
              </div>
            </div>
          </div>

          {/* Monaco Editor Wrapper */}
          <div className="flex-1 overflow-hidden relative">
            <Editor
              height="100%"
              language={language}
              value={code}
              theme={theme === "light" ? "light" : "vs-dark"}
              onChange={handleChange}
              options={{
                minimap: { enabled: false }, // Clean look
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 22,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                overviewRulerBorder: false,
                renderLineHighlight: "line",
                lineNumbers: "on",
                folding: true,
              }}
            />
          </div>

          {/* Terminal / Console Panel */}
          {showTerminal && (
            <div
              style={{ height: terminalHeight }}
              className="border-t border-border-main dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-[height] duration-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 relative"
            >
              {/* Drag Handle */}
              <div
                onMouseDown={startResizingTerminal}
                className="absolute top-0 left-0 w-full h-1 cursor-row-resize hover:bg-primary/50 group z-50 transform -translate-y-0.5"
              >
                <div className="mx-auto w-12 h-full bg-transparent group-hover:bg-primary rounded-full transition-colors"></div>
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border-main dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTerminalTab('terminal')}
                    className={`text-[10px] font-bold pb-1 transition-colors uppercase tracking-wider ${activeTerminalTab === 'terminal' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
                  >
                    Console
                  </button>
                  <button
                    onClick={() => setActiveTerminalTab('output')}
                    className={`text-[10px] font-bold pb-1 transition-colors uppercase tracking-wider ${activeTerminalTab === 'output' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
                  >
                    Output
                  </button>
                  <button
                    onClick={() => setActiveTerminalTab('debug')}
                    className={`text-[10px] font-bold pb-1 transition-colors uppercase tracking-wider ${activeTerminalTab === 'debug' ? 'text-primary border-b-2 border-primary' : 'text-slate-400'}`}
                  >
                    Debug
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOutput([])} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Clear">
                    <span className="material-symbols-outlined text-[16px]">block</span>
                  </button>

                  {/* Run Button (Restored Position) */}
                  <button
                    onClick={handleRunCode}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 px-3 py-1.5 rounded-technical text-[10px] font-bold transition-all shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[14px]">{isRunning ? 'sync' : 'play_arrow'}</span>
                    {isRunning ? 'RUNNING...' : 'RUN'}
                  </button>

                  {/* Close Button */}
                  <button onClick={() => setShowTerminal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2" title="Close Terminal">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>

              {/* Real Terminal Output Logic */}
              <div className="flex-1 p-4 font-mono text-[13px] text-slate-600 dark:text-slate-300 overflow-y-auto space-y-1">
                {output.length === 0 ? (
                  <>
                    <p className="text-slate-400 italic">// Console output will appear here...</p>
                    <p className="text-slate-400 cursor-blink border-l-2 border-transparent pl-0.5">&gt; _</p>
                  </>
                ) : (
                  output.map((line, i) => {
                    // Basic parsing for colors
                    let className = "whitespace-pre-wrap";
                    if (line.toLowerCase().includes("error")) className += " text-red-500 font-bold";
                    else if (line.toLowerCase().includes("success")) className += " text-emerald-600 font-bold";
                    else if (line.toLowerCase().includes("warn")) className += " text-amber-500";
                    return <p key={i} className={className}>{line}</p>;
                  })
                )}
              </div>
            </div>
          )}
        </section>


        {/* RIGHT SIDEBAR (CHAT) - Collapsible with Transition */}
        <aside
          className={`bg-sidebar-bg dark:bg-slate-950 border-l border-border-main dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0`}
          style={{
            width: showChat ? '288px' : '0px',
            opacity: showChat ? 1 : 0,
            borderLeftWidth: showChat ? '1px' : '0px'
          }}
        >
          <div className="w-72 min-w-[18rem] flex flex-col h-full"> {/* Fixed width inner container */}
            {/* Chat Header - No Tabs */}
            <div className="flex border-b border-border-main dark:border-slate-800 bg-white dark:bg-slate-900 border-t border-t-transparent">
              <div
                className="flex-1 p-3 text-center text-[11px] font-bold uppercase tracking-widest text-primary border-b-2 border-primary"
              >
                Team Chat
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {messages.filter(m => !m.system).length === 0 && (
                <div className="text-center py-4">
                  <span className="text-[10px] text-slate-400 italic">No messages yet.</span>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col gap-1 ${msg.system ? 'items-center text-center' : ''}`}>
                  {msg.system ? (
                    <span className="text-[9px] text-slate-400 font-medium italic py-1">{msg.text}</span>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${msg.isMe ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}>
                          {msg.username}
                        </span>
                        <span className="text-[9px] text-slate-400">{msg.time || 'Just now'}</span>
                      </div>
                      <div className={`p-2.5 rounded-technical border-l-2 text-[12px] leading-snug shadow-sm ${msg.isMe ? 'bg-indigo-50 dark:bg-indigo-900/20 text-slate-700 dark:text-slate-200 border-primary' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'}`}>
                        {msg.text}
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Remove check for activeTab since it is always chat */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-border-main dark:border-slate-800">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-border-main dark:border-slate-700 rounded-technical text-[12px] px-3 py-2 focus:ring-0 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:text-white"
                  placeholder="Type a message..."
                  type="text"
                />
                <button type="submit" className="absolute right-2 text-slate-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </form>
            </div>

          </div>
        </aside>

      </main>

      {/* Floating Help Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <button className="size-8 bg-white dark:bg-slate-800 border border-border-main dark:border-slate-700 rounded-technical flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-md">
          <span className="material-symbols-outlined text-[18px]">help</span>
        </button>
      </div>

    </div>
  );
}