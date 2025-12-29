import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { socket } from "./socket";
import "./EditorPage.css";
import logo from "./co-script-logo.jpg";
import { 
  FiCopy, 
  FiLogOut, 
  FiPlay, 
  FiCheck, 
  FiUsers,
  FiClock,
  FiGlobe
} from "react-icons/fi";

export default function EditorPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [language, setLanguage] = useState("javascript");
  const [theme, setTheme] = useState("vs-dark");
  const [timeLeft, setTimeLeft] = useState({ minutes: 5, seconds: 0 });
  const totalTime = { minutes: 5, seconds: 0 };
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const programmingLanguages = [
    { id: "javascript", name: "JavaScript", checked: true },
    { id: "python", name: "Python", checked: false },
    { id: "java", name: "Java", checked: false },
    { id: "cpp", name: "C++", checked: false },
    { id: "csharp", name: "C#", checked: false },
    { id: "typescript", name: "TypeScript", checked: false },
    { id: "go", name: "Go", checked: false },
    { id: "rust", name: "Rust", checked: false },
  ];

  const handleChange = useCallback((value = "") => {
    setCode(value);
    socket.emit("code_change", { roomId, code: value });
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    socket.emit("join_room", { roomId, username: "User" });

    const handleLoadCode = ({ code: loadedCode }) => setCode(loadedCode || "");
    const handleCodeUpdate = ({ code: updatedCode }) => {
      if (updatedCode !== code) {
        setCode(updatedCode);
      }
    };

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("load_code", handleLoadCode);
    socket.on("code_update", handleCodeUpdate);

    // Timer countdown from 5:00 to 0:00
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        } else {
          clearInterval(timer);
          return { minutes: 0, seconds: 0 };
        }
      });
    }, 1000);

    return () => {
      socket.off("load_code", handleLoadCode);
      socket.off("code_update", handleCodeUpdate);
      socket.emit("leave_room", { roomId });
      clearInterval(timer);
    };
  }, [roomId, navigate, code]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        console.log('Code saved!', { roomId, codeLength: code.length });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, roomId]);

  const [clients, setClients] = useState([
    { socketId: 1, username: "Mohitur", color: "#3B82F6" },
    { socketId: 2, username: "User", color: "#10B981" },
    { socketId: 3, username: "Alex", color: "#EF4444" },
    { socketId: 4, username: "Sarah", color: "#8B5CF6" },
  ]);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room ID:', err);
    }
  };

  const leaveRoom = () => {
    navigate("/");
  };

  const handleRunCode = () => {
    setIsRunning(true);
    console.log('Running code:', { language, codeLength: code.length });
    
    // Simulate code execution
    setTimeout(() => {
      setIsRunning(false);
      // Add your actual code execution logic here
    }, 1500);
  };

  const handleLanguageSelect = (langId) => {
    setLanguage(langId);
  };

  return (
    <div className="editor-container">
      {/* Sidebar */}
      <div className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-container">
            <img className="logo-image" src={logo} alt="Co-Script Logo" />
            <div>
              <h1 className="logo-text">Co-Script</h1>
              <div className="connection-status">
                <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
                <span className="status-text">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Timer Section */}
        <div className="timer-section">
          <div className="section-header">
            <FiClock className="section-icon" />
            <h3>Session Timer</h3>
          </div>
          <div className="timer-display">
            <span className="timer-text">
              {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <div className="timer-label">Time Remaining</div>
          </div>
        </div>

        {/* Connected Users */}
        <div className="users-section">
          <div className="section-header">
            <FiUsers className="section-icon" />
            <h3>Connected Users ({clients.length})</h3>
          </div>
          <div className="users-list">
            {clients.map((client) => (
              <div key={client.socketId} className="user-item">
                <div 
                  className="user-avatar"
                  style={{ backgroundColor: client.color }}
                >
                  {client.username.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{client.username}</span>
                {client.username === "User" && (
                  <span className="you-badge">You</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Language Selection */}
        <div className="language-section">
          <div className="section-header">
            <FiGlobe className="section-icon" />
            <h3>Programming Language</h3>
          </div>
          <div className="language-list">
            {programmingLanguages.map((lang) => (
              <label key={lang.id} className="language-option">
                <input
                  type="radio"
                  name="language"
                  value={lang.id}
                  checked={language === lang.id}
                  onChange={() => handleLanguageSelect(lang.id)}
                  className="language-radio"
                />
                <span className="language-name">{lang.name}</span>
                {language === lang.id && (
                  <FiCheck className="selected-icon" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Room Actions */}
        <div className="room-info">
          <div className="room-id-section">
            <div className="room-id-label">Room ID</div>
            <div className="room-id-display">
              <code className="room-id-text">{roomId}</code>
              <button 
                className={`copy-button ${copied ? 'copied' : ''}`}
                onClick={copyRoomId}
              >
                <FiCopy />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className={`run-button ${isRunning ? 'running' : ''}`}
            onClick={handleRunCode}
            disabled={isRunning}
          >
            <FiPlay />
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
          
          <button 
            className="leave-button"
            onClick={leaveRoom}
          >
            <FiLogOut />
            Leave Room
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="editor-area">
        <div className="editor-header">
          <div className="editor-info">
            <span className="current-language">{language.toUpperCase()}</span>
            <span className="code-stats">{code.length} characters</span>
          </div>
          <div className="theme-selector">
            <select 
              value={theme} 
              onChange={(e) => setTheme(e.target.value)}
              className="theme-dropdown"
            >
              <option value="vs">Light</option>
              <option value="vs-dark">Dark</option>
              <option value="hc-black">High Contrast</option>
            </select>
          </div>
        </div>
        
        <div className="monaco-container">
          <Editor
            height="100%"
            language={language}
            theme={theme}
            value={code}
            onChange={handleChange}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              renderLineHighlight: 'all',
              selectionHighlight: true,
              occurrencesHighlight: true,
              fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
              lineHeight: 1.6,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true },
            }}
          />
        </div>

        {/* Output Panel (Optional - for run results) */}
        <div className="output-panel">
          <div className="output-header">
            <h4>Output</h4>
            <button className="clear-output">Clear</button>
          </div>
          <div className="output-content">
            {isRunning ? (
              <div className="loading-output">Executing code...</div>
            ) : (
              <pre className="output-text">
                {/* Output will appear here */}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}