const { spawn } = require('child_process');
const os = require('os');

// Map<terminalId, { process, socketId, cwd, name, timeout }>
const terminals = new Map();
const SESSION_TIMEOUT = 5 * 60 * 1000;
let idCounter = 0;
let _io = null;

function getDefaultShell() {
    // On macOS/Linux, use bash with interactive flag for proper prompt display
    // zsh -i with pipes hangs, so bash is more reliable
    return '/bin/bash';
}

function generateId() {
    return `term_${++idCounter}_${Date.now()}`;
}

/** Emit to the correct socket for a terminal session */
function emitToSession(session, event, data) {
    if (_io && session.socketId) {
        const targetSocket = _io.sockets.sockets.get(session.socketId);
        if (targetSocket) {
            targetSocket.emit(event, data);
        }
    }
}

/**
 * Attach terminal socket handlers to a socket connection.
 * Uses child_process.spawn with bash -i for interactive mode.
 * node-pty's pty.spawn() fails on Node v24 with posix_spawnp error.
 */
function initTerminalHandlers(socket, io) {
    _io = io;
    let terminalCount = 0; // Per-socket counter for naming

    // --- CREATE ---
    socket.on('terminal:create', (options = {}) => {
        const id = generateId();
        const cwd = options.cwd || process.env.HOME || os.homedir();
        terminalCount++;
        const name = options.name || `Terminal ${terminalCount}`;
        const shell = getDefaultShell();

        try {
            const proc = spawn(shell, ['--norc', '--noprofile', '-i'], {
                cwd,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    TERM: 'xterm-256color',
                    COLORTERM: 'truecolor',
                    LANG: 'en_US.UTF-8',
                    PS1: '\\[\\033[01;32m\\]\\u@coscript\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ ',
                },
            });

            const session = {
                process: proc,
                socketId: socket.id,
                cwd,
                name,
                timeout: null,
            };
            terminals.set(id, session);

            // Stream stdout to client
            proc.stdout.on('data', (data) => {
                const s = terminals.get(id);
                if (s) emitToSession(s, 'terminal:output', { id, data: data.toString() });
            });

            // Stream stderr to client (bash sends prompts via stderr)
            proc.stderr.on('data', (data) => {
                const s = terminals.get(id);
                if (s) emitToSession(s, 'terminal:output', { id, data: data.toString() });
            });

            proc.on('exit', (code, signal) => {
                const s = terminals.get(id);
                if (s) emitToSession(s, 'terminal:exit', { id, exitCode: code || 0 });
                terminals.delete(id);
                console.log(`[Terminal] ${id} exited (code=${code})`);
            });

            proc.on('error', (err) => {
                console.error(`[Terminal] ${id} error:`, err.message);
                const s = terminals.get(id);
                if (s) emitToSession(s, 'terminal:error', { id, error: err.message });
                terminals.delete(id);
            });

            socket.emit('terminal:created', { id, name, shell, cwd });
            console.log(`[Terminal] Created ${id} (${shell} -i) in ${cwd}`);

        } catch (err) {
            console.error('[Terminal] Create failed:', err.message);
            socket.emit('terminal:error', { id, error: err.message });
        }
    });

    // --- INPUT ---
    socket.on('terminal:input', ({ id, data }) => {
        const session = terminals.get(id);
        if (session && session.process && session.process.stdin && !session.process.stdin.destroyed) {
            try {
                session.process.stdin.write(data);
            } catch (e) { }
        }
    });

    // --- RESIZE (no-op for child_process pipes, but accept event) ---
    socket.on('terminal:resize', () => { });

    // --- KILL ---
    socket.on('terminal:kill', ({ id }) => {
        const session = terminals.get(id);
        if (session && session.process) {
            try {
                session.process.kill('SIGTERM');
                setTimeout(() => { try { session.process.kill('SIGKILL'); } catch (e) { } }, 1000);
            } catch (e) { }
            terminals.delete(id);
            socket.emit('terminal:killed', { id });
            console.log(`[Terminal] Killed ${id}`);
        }
    });

    // --- RENAME ---
    socket.on('terminal:rename', ({ id, name }) => {
        const session = terminals.get(id);
        if (session) {
            session.name = name;
            socket.emit('terminal:renamed', { id, name });
        }
    });

    // --- LIST ---
    socket.on('terminal:list', () => {
        const list = [];
        for (const [id, session] of terminals.entries()) {
            if (session.socketId === socket.id) {
                list.push({ id, name: session.name, cwd: session.cwd });
            }
        }
        socket.emit('terminal:list', list);
    });

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
        for (const [id, session] of terminals.entries()) {
            if (session.socketId === socket.id) {
                console.log(`[Terminal] Socket disconnected. Scheduling cleanup for ${id}`);
                session.timeout = setTimeout(() => {
                    console.log(`[Terminal] Timeout. Killing ${id}`);
                    try { session.process.kill(); } catch (e) { }
                    terminals.delete(id);
                }, SESSION_TIMEOUT);
            }
        }
    });
}

module.exports = { initTerminalHandlers };
