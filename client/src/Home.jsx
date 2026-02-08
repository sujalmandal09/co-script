import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { socket } from "./socket";
import { useAuth } from "./AuthContext";
import "./Home.css";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [joinStatus, setJoinStatus] = useState(""); // "", "pending", "declined"
  const [createdRoomId, setCreatedRoomId] = useState("");
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Set username from auth
  useEffect(() => {
    if (user?.name) {
      setUserName(user.name);
    }
  }, [user]);

  // Countdown timer
  useEffect(() => {
    const targetDate = new Date('February 28, 2026 12:00:00 GMT+05:30');

    const timer = setInterval(() => {
      const now = new Date();
      const nowIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const distance = targetDate - nowIST;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Socket event handlers
  useEffect(() => {
    // Room created successfully
    socket.on("room_created", ({ roomId, isHost }) => {
      setCreatedRoomId(roomId);
      // Navigate to the room as host
      navigate(`/room/${roomId}?host=true`);
    });

    // Join request pending
    socket.on("join_pending", ({ message }) => {
      setJoinStatus("pending");
    });

    // Join accepted
    socket.on("join_accepted", ({ roomId }) => {
      setJoinStatus("");
      navigate(`/room/${roomId}`);
    });

    // Join declined
    socket.on("join_declined", ({ message }) => {
      setJoinStatus("declined");
      setTimeout(() => setJoinStatus(""), 3000);
    });

    // Join error
    socket.on("join_error", ({ error }) => {
      setJoinStatus("");
      alert(error);
    });

    return () => {
      socket.off("room_created");
      socket.off("join_pending");
      socket.off("join_accepted");
      socket.off("join_declined");
      socket.off("join_error");
    };
  }, [navigate]);

  const createRoom = () => {
    socket.emit("create_room", {
      userId: user?.id,
      userName: user?.name || "Host"
    });
  };

  const joinRoom = () => {
    if (!roomId.trim()) return;
    if (!userName.trim()) {
      alert("Please enter your name");
      return;
    }

    socket.emit("request_join", {
      roomId: roomId.toUpperCase(),
      userId: user?.id,
      userName
    });
  };

  const handleKeyPress = (e) => {
    // if (e.key === 'Enter') {
    //   joinRoom();
    // }
  };

  // Dark mode hook - basic check
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="font-display text-slate-900 dark:text-slate-100 mesh-gradient min-h-screen transition-colors duration-300">
      <nav className="sticky top-0 z-50 glass border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
              <span className="material-icons-round">code</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">CoScript</span>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Signed in as</span>
                <span className="text-sm font-semibold">{user.name}</span>
              </div>
            ) : null}

            {user && (
              <button
                onClick={logout}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg transition-all flex items-center gap-2"
              >
                <span className="material-icons-round text-sm">logout</span>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-12 pb-24">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-primary dark:text-blue-400 rounded-full text-sm font-bold tracking-wide uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Now Live: BHAVANS Edition
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Collaborative <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500">Code Editor</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Discover, code, collaborate – CoScript makes real-time coding effortless. Your next project starts right here.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm">
              <span className="material-icons-round text-emerald-500 text-lg">check_circle</span>
              <span className="text-sm font-semibold">Real-time collaboration</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm">
              <span className="material-icons-round text-emerald-500 text-lg">check_circle</span>
              <span className="text-sm font-semibold">Multiple languages</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm">
              <span className="material-icons-round text-emerald-500 text-lg">check_circle</span>
              <span className="text-sm font-semibold">Instant sync</span>
            </div>
          </div>
        </div>

        <div className="relative max-w-4xl mx-auto mb-20 group">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary to-emerald-500 rounded-[2.5rem] opacity-20 blur-2xl group-hover:opacity-30 transition-opacity"></div>
          <div className="relative glass rounded-2xl overflow-hidden shadow-2xl border border-white/20 dark:border-slate-700/50">
            <div className="bg-slate-100/80 dark:bg-slate-800/80 px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900 rounded-md shadow-sm">
                <span className="material-icons-round text-sm text-slate-400">description</span>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-300">main.js</span>
              </div>
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-slate-800 bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold">SM</div>
                <div className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-slate-800 bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">JD</div>
                <div className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-slate-800 bg-amber-500 flex items-center justify-center text-[10px] text-white font-bold">AL</div>
              </div>
            </div>
            <div className="p-8 font-mono text-sm leading-relaxed overflow-x-auto bg-slate-50 dark:bg-[#0b1222]">
              <div className="flex gap-6">
                <div className="text-slate-400 text-right select-none space-y-0.5">
                  <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div><div>7</div><div>8</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-purple-500 dark:text-purple-400">function <span className="text-blue-600 dark:text-blue-400">collaborate</span>() {'{'}</div>
                  <div className="pl-4"><span className="text-slate-500 dark:text-slate-400">// Connecting peers...</span></div>
                  <div className="pl-4">
                    <span className="text-slate-900 dark:text-slate-100">const room = </span>
                    <span className="text-emerald-600 dark:text-emerald-400">"CO-SCRIPT-PRO"</span>;
                  </div>
                  <div className="pl-4 flex items-center">
                    <span className="text-slate-900 dark:text-slate-100">console.log(</span>
                    <span className="text-emerald-600 dark:text-emerald-400">"Starting session"</span>
                    <span className="text-slate-900 dark:text-slate-100">);</span>
                    <div className="relative ml-1">
                      <div className="w-0.5 h-5 bg-blue-500 cursor-blink"></div>
                      <div className="absolute -top-6 left-0 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded font-sans font-bold whitespace-nowrap">Sujal</div>
                    </div>
                  </div>
                  <div className="pl-4"><span className="text-slate-900 dark:text-slate-100">return true;</span></div>
                  <div>{'}'}</div>
                  <div className="pt-2 flex items-center">
                    <span className="text-blue-600 dark:text-blue-400">collaborate</span>
                    <span className="text-slate-900 dark:text-slate-100">();</span>
                    <div className="relative ml-1">
                      <div className="w-0.5 h-5 bg-emerald-500"></div>
                      <div className="absolute -bottom-6 left-0 px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] rounded font-sans font-bold whitespace-nowrap">Sarah</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto glass rounded-[2rem] p-8 md:p-12 shadow-2xl border border-white/30 dark:border-slate-700/30" id="actions">
          <h2 className="text-2xl font-extrabold text-center mb-10 tracking-tight text-slate-900 dark:text-white">CREATE OR JOIN ROOM</h2>
          <div className="flex flex-col gap-8">
            <button
              onClick={createRoom}
              className="w-full bg-primary hover:bg-blue-700 text-white py-5 px-8 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <span className="material-icons-round">add_circle</span>
              Create New Collaborative Room
            </button>
            <div className="relative flex items-center gap-4">
              <div className="flex-grow h-px bg-slate-200 dark:bg-slate-800"></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">or join existing</span>
              <div className="flex-grow h-px bg-slate-200 dark:bg-slate-800"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-slate-400 group-focus-within:text-primary transition-colors">vpn_key</span>
                <input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-mono tracking-widest text-slate-900 dark:text-white"
                  placeholder="Enter 6-char Code"
                  type="text"
                  maxLength={6}
                />
              </div>
              <button
                onClick={joinRoom}
                className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-white py-4 px-6 border border-slate-200 dark:border-slate-700 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {joinStatus === "pending" ? (
                  <span className="material-icons-round animate-spin">refresh</span>
                ) : (
                  <span className="material-icons-round">login</span>
                )}
                {joinStatus === "pending" ? "Waiting..." : "Request to Join"}
              </button>
            </div>
          </div>
          <div className="mt-12 text-center">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Final Release Countdown</p>
            <div className="flex justify-center gap-4 md:gap-8">
              <div className="text-center">
                <div className="text-3xl font-extrabold text-primary">{timeLeft.days.toString().padStart(3, '0')}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Days</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-extrabold text-primary">{timeLeft.hours.toString().padStart(2, '0')}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hours</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-extrabold text-primary">{timeLeft.minutes.toString().padStart(2, '0')}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mins</div>
              </div>
            </div>
            <p className="mt-6 text-sm italic text-slate-400">Until February 28, 2026 • 12:00 PM</p>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-200/50 dark:border-slate-800/50 text-center text-slate-500 text-sm">
        <p>© 2024 CoScript Engine. Designed for performance and collaboration.</p>
      </footer>
    </div>
  );
}