# CoScript: Real-Time Collaborative Code Editor

## Overview
CoScript is a web-based, real-time collaborative code editor designed to simulate a complete Integrated Development Environment (IDE) directly in the browser. It enables multiple developers to write, execute, and debug code simultaneously in shared workspace rooms, making it ideal for pair programming, technical interviews, and remote team collaboration.

---

## Key Features

1. **Real-Time Synchronization:**
   - Powered by **Socket.io**, all keystrokes, cursors, and file changes are broadcasted to all users in a room with near-zero latency.
   
2. **Integrated Execution Environment:**
   - Users can securely compile and run code in multiple languages directly from the browser.
   - **Supported Languages:** JavaScript (Node.js), Python, Java, C, C++, and TypeScript.

3. **In-Browser Terminal:**
   - A fully functional, interactive terminal powered by `xterm.js` on the frontend and `node-pty` on the backend.
   - Allows developers to run bash commands, navigate the filesystem, and install packages just like a local VS Code instance.

4. **Secure Room Management:**
   - Host-controlled access: Hosts generate a unique 6-character alphanumeric Room ID.
   - "Waiting Room" mechanism: Guests request to join, and the host must explicitly approve or deny them.
   - Kick functionality: Hosts can remove disruptive users from the session.

5. **Advanced Code Editor:**
   - Integrates Microsoft's **Monaco Editor** (the core engine behind VS Code) for rich syntax highlighting, auto-completion, and error checking.

6. **Authentication & Safety:**
   - Supports traditional Email/Password login (hashed via `bcrypt`) alongside **Google OAuth** for quick onboarding.
   - Protected by JSON Web Tokens (JWT).

---

## Technical Stack

### Frontend (Client)
- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS
- **Editor:** Monaco Editor (`@monaco-editor/react`)
- **Real-Time Client:** Socket.io-client
- **Terminal Emulator:** Xterm.js
- **Routing:** React Router DOM

### Backend (Server)
- **Environment:** Node.js
- **Framework:** Express.js
- **WebSocket Server:** Socket.io
- **Terminal Integration:** Node-pty
- **Process Management:** Child Process (for compiling/executing code)
- **Authentication:** JSON Web Tokens (JWT), bcryptjs

### Database
- **Primary Datastore:** MongoDB
- **ODM:** Mongoose (Schemas for `Users` and `Rooms`)

---

## Project Structure

```text
CoScript/
├── client/                     # React Frontend
│   ├── public/                 # Static assets
│   ├── src/                    # Source code
│   │   ├── components/         # Reusable UI elements (Editor, Terminal, Sidebar)
│   │   ├── contexts/           # Global React Contexts (AuthContext)
│   │   ├── App.jsx             # Main Router Component
│   │   ├── Home.jsx            # Dashboard & Room Entry
│   │   └── AuthPage.jsx        # Login/Registration
│   └── package.json            # Client dependencies
│
├── Server/                     # Node.js Backend
│   ├── Config/                 # Database initialization
│   ├── Middleware/             # JWT Verification
│   ├── Models/                 # Mongoose Schemas (User.js, Room.js)
│   ├── Routes/                 # API Endpoints (authRoutes.js, FileRoutes.js)
│   ├── workspace/              # Sandboxed folder for file creation/execution
│   ├── CodeRunner.js           # Multi-language execution logic via child_process
│   ├── TerminalService.js      # node-pty integration logic
│   ├── Socket.js              # WebSocket event listeners and emitters
│   ├── Server.js               # Express HTTP entry point
│   └── package.json            # Server dependencies
│
└── package.json                # Root package (Concurrently scripts)
```

---

## Core Modules Breakdown

### 1. The Execution Engine (`CodeRunner.js`)
When a user clicks "Run", the frontend sends an HTTP POST request to the `/execute` endpoint containing the raw code and the selected language. 
- The backend generates a unique temporary directory using `uuid`.
- The code is written to a file (e.g., `code.py` or `Main.java`).
- `child_process.exec` is used to spawn the respective compiler/interpreter (e.g., `gcc`, `javac`, or `node`) with strict timeouts to prevent infinite loops.
- `stdout` and `stderr` are captured and returned to the client, after which the temporary directory is wiped.

### 2. The Real-Time Room Controller (`Socket.js`)
Handles the complex state of collaborative editing.
- **`request_join` & `join_response`:** Manages the waiting room queue, ensuring uninvited users cannot access the room's code unless the host's Socket ID emits an approval.
- **`code_change`:** Broadcasts delta updates or full file strings to all peers currently mapped to the specific `roomId`.

### 3. The Interactive Terminal (`TerminalService.js`)
Provides raw shell access.
- Spawns a pseudo-terminal (`pty`) process pointing to the local OS shell (e.g., `zsh` or `bash`).
- Binds standard input from the frontend's `Xterm.js` canvas directly to the `pty` process via WebSockets (`terminal:data`).
- Pipes standard output back to the client, rendering a perfect 1:1 terminal experience.

---

## Setup & Installation

### Prerequisites
- Node.js (v16+)
- MongoDB instance (Local or Atlas)
- C/C++/Java Compilers installed locally (if executing those languages)

### Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd CoScript
   ```

2. **Install global dependencies:**
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `/Server` directory:
   ```env
   MONGO_URI=mongodb://localhost:27017/coscript
   JWT_SECRET=your_super_secret_key
   PORT=3001
   ```

4. **Launch Application:**
   From the root `CoScript` folder, boot both client and server simultaneously:
   ```bash
   npm run dev
   ```
   *The application will be available at `http://localhost:3000`.*

---

## Future Enhancements
- **Docker Sandboxing:** Moving code execution from native child processes into ephemeral Docker containers to prevent malicious host execution.
- **Video/Audio Chat:** Integrating WebRTC to allow developers to speak directly to each other while coding.
- **Git Integration:** Allowing users to instantly pull from or push to a GitHub repository directly from the CoScript File Explorer.
- **Yjs / CRDTs:** Upgrading the real-time syncing mechanism from standard Socket emit to Conflict-free Replicated Data Types (CRDTs) to handle complex, simultaneous multi-line edits without cursor jumping.
