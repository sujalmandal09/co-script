const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const WORKSPACE_DIR = path.join(__dirname, 'workspace');

// Store shell sessions: key -> { process, history, socketId, timeout, cwd }
const sessions = new Map();

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes grace period

/**
 * Initialize terminal handlers for a socket connection
 */
const initPtyHandlers = (socket) => {
    socket.on('terminal:start', (options = {}) => {
        const { cols, rows, userId } = options;
        const key = userId || socket.id; // Use userId for persistence if available

        console.log(`[Terminal] terminal:start request from ${socket.id} (key: ${key})`);

        // Check for existing session
        if (sessions.has(key)) {
            const session = sessions.get(key);
            console.log(`[Terminal] Resuming session for ${key}`);

            // Clear any pending kill timeout
            if (session.timeout) {
                clearTimeout(session.timeout);
                session.timeout = null;
            }

            // Update socket reference
            session.socketId = socket.id;
            sessions.set(key, session);

            // Replay history
            if (session.history && session.history.length > 0) {
                socket.emit('terminal:output', session.history.join(''));
            }

            socket.emit('terminal:started', { shell: 'bash (resumed)', cwd: session.cwd });
            return;
        }

        // Start new session
        const cwd = options.cwd || process.cwd();

        try {
            let shellProcess;

            if (os.platform() === 'win32') {
                shellProcess = spawn('cmd.exe', ['/K'], {
                    cwd,
                    stdio: ['pipe', 'pipe', 'pipe']
                });
            } else {
                // Use bash with --norc to skip startup files for speed/cleanliness
                shellProcess = spawn('/bin/bash', ['--norc', '--noprofile'], {
                    cwd,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: {
                        PATH: process.env.PATH,
                        HOME: process.env.HOME || '/tmp',
                        TERM: 'xterm-256color',
                        LANG: 'en_US.UTF-8'
                    }
                });
            }

            const session = {
                process: shellProcess,
                cwd,
                history: [],
                socketId: socket.id,
                timeout: null
            };
            sessions.set(key, session);

            const addToHistory = (data) => {
                session.history.push(data);
                // Keep last ~500 chunks of history
                if (session.history.length > 500) {
                    session.history = session.history.slice(-200);
                }
            };

            // Helper to emit to the *current* socket for this session
            const emitToCurrentSocket = (event, data) => {
                const currentSession = sessions.get(key);
                // We emit to the socket registered in currentSession.socketId
                // However, we don't have global io access here easily. 
                // But in this scope, 'socket' is the one that started THIS specific listener instance.
                // If the user reconnected, 'terminal:start' was called again with the NEW socket.
                // The 'initPtyHandlers' closure for the NEW socket will have the NEW 'socket' object.
                // PROBLEM: The 'shellProcess.stdout.on' listener is bound to the OLD socket's closure/init call!
                // When we create the process, we bind listeners ONCE.
                // We need a way to route output to the dynamic 'current' socket.

                // FIX: Use an event emitter pattern or update a reference on session object.
                if (currentSession && currentSession.emitOutput) {
                    currentSession.emitOutput(event, data);
                }
            };

            // Set up the dynamic emitter on the session object
            // This function will be updated/overwritten if we were re-initializing, 
            // but here we are creating NEW, so we set the initial one.
            session.emitOutput = (event, data) => {
                socket.emit(event, data);
            };

            shellProcess.stdout.on('data', (data) => {
                const output = data.toString();
                addToHistory(output);
                emitToCurrentSocket('terminal:output', output);
            });

            shellProcess.stderr.on('data', (data) => {
                const output = data.toString();
                addToHistory(output);
                emitToCurrentSocket('terminal:output', output);
            });

            shellProcess.on('exit', (code, signal) => {
                console.log(`[Terminal] Process exited code=${code}`);
                emitToCurrentSocket('terminal:exit', code || 0);
                sessions.delete(key);
            });

            shellProcess.on('error', (err) => {
                console.error('[Terminal] Process error:', err);
                emitToCurrentSocket('terminal:error', err.message);
                sessions.delete(key);
            });

            console.log(`[Terminal] Started bash for ${key}`);
            socket.emit('terminal:started', { shell: 'bash', cwd });

        } catch (error) {
            console.error(`[Terminal] Failed: ${error.message}`);
            socket.emit('terminal:error', error.message);
        }
    });

    // START Handler wrapper to update the emitOutput function on connection
    // The logic above creates the process. But if we resume (lines 20-35), 
    // we need to update 'session.emitOutput' to use the NEW socket.
    // Let's attach a "global" listener to update it. 
    // Actually, line 30 `sessions.set(key, session)` updates the object reference.
    // We can just add `session.emitOutput = (ev, d) => socket.emit(ev, d);` in the resume block.
    // I entered this logic inside the `if (sessions.has(key))` block in my mind, let's verify.
    // Yes, I need to add that line in the resumption block.

    // I will rewrite the resumption block below to include this fix.
};

// Re-defining for clarity and correctness with the fix:
const initPtyHandlersFixed = (socket) => {
    socket.on('terminal:start', (options = {}) => {
        const { cols, rows, userId } = options;
        const key = userId || socket.id;

        // Check for existing session
        if (sessions.has(key)) {
            const session = sessions.get(key);
            console.log(`[Terminal] Resuming session for ${key}`);

            if (session.timeout) {
                clearTimeout(session.timeout);
                session.timeout = null;
            }

            session.socketId = socket.id;
            // CRITICAL: Update the emitter to use the NEW socket
            session.emitOutput = (event, data) => {
                socket.emit(event, data);
            };
            sessions.set(key, session);

            if (session.history && session.history.length > 0) {
                socket.emit('terminal:output', session.history.join(''));
            }

            socket.emit('terminal:started', { shell: 'bash (resumed)', cwd: session.cwd });
            return;
        }

        // Start new session
        const cwd = options.cwd || WORKSPACE_DIR;

        try {
            let shellProcess;
            if (os.platform() === 'win32') {
                shellProcess = spawn('cmd.exe', ['/K'], { cwd });
            } else {
                shellProcess = spawn('/bin/bash', ['--norc', '--noprofile'], {
                    cwd,
                    env: { ...process.env, TERM: 'xterm-256color' }
                });
            }

            const session = {
                process: shellProcess,
                cwd,
                history: [],
                socketId: socket.id,
                timeout: null,
                emitOutput: (event, data) => socket.emit(event, data) // Initial emitter
            };
            sessions.set(key, session);

            const addToHistory = (data) => {
                session.history.push(data);
                if (session.history.length > 1000) session.history = session.history.slice(-500);
            };

            shellProcess.stdout.on('data', (data) => {
                const output = data.toString();
                addToHistory(output);
                // Use the latest emitter from the session object
                const current = sessions.get(key);
                if (current && current.emitOutput) current.emitOutput('terminal:output', output);
            });

            shellProcess.stderr.on('data', (data) => {
                const output = data.toString();
                addToHistory(output);
                const current = sessions.get(key);
                if (current && current.emitOutput) current.emitOutput('terminal:output', output);
            });

            shellProcess.on('exit', (code) => {
                const current = sessions.get(key);
                if (current && current.emitOutput) current.emitOutput('terminal:exit', code || 0);
                sessions.delete(key);
            });

            socket.emit('terminal:started', { shell: 'bash', cwd });

        } catch (error) {
            socket.emit('terminal:error', error.message);
        }
    });

    socket.on('terminal:input', (data) => {
        // Find session by socket.id
        let session = null;
        for (const s of sessions.values()) {
            if (s.socketId === socket.id) {
                session = s;
                break;
            }
        }
        if (session && session.process) {
            try { session.process.stdin.write(data); } catch (e) { }
        }
    });

    socket.on('terminal:stop', () => {
        // Explicit stop/restart
        let key = null;
        for (const [k, s] of sessions.entries()) {
            if (s.socketId === socket.id) {
                key = k;
                break;
            }
        }
        if (key) {
            const session = sessions.get(key);
            if (session.process) session.process.kill();
            sessions.delete(key);
        }
    });

    socket.on('disconnect', () => {
        let key = null;
        for (const [k, s] of sessions.entries()) {
            if (s.socketId === socket.id) {
                key = k;
                break;
            }
        }
        if (key) {
            const session = sessions.get(key);
            console.log(`[Terminal] Client disconnected. Scheduling cleanup for ${key}`);
            session.timeout = setTimeout(() => {
                console.log(`[Terminal] Timeout. Killing ${key}`);
                if (session.process) session.process.kill();
                sessions.delete(key);
            }, SESSION_TIMEOUT);
        }
    });
};

module.exports = { initPtyHandlers: initPtyHandlersFixed };
