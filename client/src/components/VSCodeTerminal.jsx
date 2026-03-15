import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Custom HTML/CSS terminal component — replaces xterm.js entirely.
 * Uses a simple scrollable <div> for output and captures keyboard input directly.
 * Supports: local echo, blinking cursor, cursor movement, command history, copy/paste.
 */
const VSCodeTerminal = ({ socket, terminalId, isActive }) => {
    const containerRef = useRef(null);
    const outputRef = useRef(null);
    const inputLineRef = useRef(null);
    const bufferedOutput = useRef([]);
    const isAttached = useRef(false);
    const [isFocused, setIsFocused] = useState(false);
    const { theme } = useTheme();
    const isLight = theme === 'light';

    // Theme-aware color palette
    const colors = useMemo(() => ({
        bg: isLight ? '#f5f5f5' : '#1e1e1e',
        text: isLight ? '#1e1e1e' : '#cccccc',
        cursorBg: isLight ? '#333333' : '#aeafad',
        cursorText: isLight ? '#f5f5f5' : '#1e1e1e',
        selectionBg: isLight ? 'rgba(0, 100, 200, 0.2)' : 'rgba(38, 79, 120, 0.8)',
    }), [isLight]);

    // Client-side input state
    const currentInputRef = useRef('');
    const cursorPosRef = useRef(0);

    // Client-side command history
    const historyRef = useRef([]);
    const historyIndexRef = useRef(-1);

    // Parse ANSI escape codes into styled HTML spans
    const ansiToHtml = useCallback((text) => {
        // Theme-aware ANSI color maps
        const colorMap = isLight ? {
            '30': '#1e1e1e', '31': '#c72e2e', '32': '#1a7f37', '33': '#9a6700',
            '34': '#0550ae', '35': '#8250df', '36': '#0e7171', '37': '#57606a',
            '90': '#6e7781', '91': '#cf222e', '92': '#116329', '93': '#7d4e00',
            '94': '#0969da', '95': '#8250df', '96': '#0e7171', '97': '#24292f',
        } : {
            '30': '#1e1e1e', '31': '#f44747', '32': '#6a9955', '33': '#d7ba7d',
            '34': '#569cd6', '35': '#c586c0', '36': '#4ec9b0', '37': '#d4d4d4',
            '90': '#808080', '91': '#f44747', '92': '#6a9955', '93': '#d7ba7d',
            '94': '#569cd6', '95': '#c586c0', '96': '#4ec9b0', '97': '#e5e5e5',
        };

        // eslint-disable-next-line no-control-regex
        const ansiRegex = /\x1b\[([0-9;]*)m/g;
        let result = '';
        let lastIndex = 0;
        let currentColor = null;
        let isBold = false;

        let match;
        while ((match = ansiRegex.exec(text)) !== null) {
            const before = text.slice(lastIndex, match.index);
            if (before) result += escapeHtml(before);
            lastIndex = match.index + match[0].length;

            const codes = match[1].split(';').filter(Boolean);
            for (const code of codes) {
                if (code === '0' || code === '') {
                    currentColor = null;
                    isBold = false;
                    result += '</span>';
                } else if (code === '1') {
                    isBold = true;
                } else if (colorMap[code]) {
                    currentColor = colorMap[code];
                    result += `<span style="color:${currentColor};${isBold ? 'font-weight:bold;' : ''}">`;
                }
            }
        }

        const remaining = text.slice(lastIndex);
        if (remaining) result += escapeHtml(remaining);
        return result;
    }, [isLight]);

    function escapeHtml(text) {
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const linkColor = isLight ? '#0550ae' : '#569cd6';
        return escaped.replace(
            /(https?:\/\/[^\s<>&"')\]]+)/g,
            `<a href="$1" target="_blank" rel="noopener noreferrer" style="color:${linkColor};text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">$1</a>`
        );
    }

    const scrollToBottom = useCallback(() => {
        const container = containerRef.current;
        if (container) {
            const scrollDiv = container.firstElementChild;
            if (scrollDiv) scrollDiv.scrollTop = scrollDiv.scrollHeight;
        }
    }, []);

    // Render the current input line with cursor at the right position
    const renderInputLine = useCallback(() => {
        const el = inputLineRef.current;
        if (!el) return;

        const input = currentInputRef.current;
        const pos = cursorPosRef.current;

        const before = escapeHtml(input.slice(0, pos));
        const cursorChar = input[pos] || '';
        const after = pos < input.length ? escapeHtml(input.slice(pos + 1)) : '';

        // Render: text before cursor | cursor block (with char or space) | text after cursor
        const cursorBg = isFocused ? colors.cursorBg : 'transparent';
        const cursorColor = isFocused ? colors.cursorText : colors.text;
        const cursorDisplay = isFocused
            ? `<span class="term-cursor" style="background:${cursorBg};color:${cursorColor};">${cursorChar ? escapeHtml(cursorChar) : ' '}</span>`
            : (cursorChar ? escapeHtml(cursorChar) : '');

        el.innerHTML = before + cursorDisplay + after;
        scrollToBottom();
    }, [isFocused, scrollToBottom, colors]);

    // Re-render cursor when focus changes
    useEffect(() => {
        renderInputLine();
    }, [isFocused, renderInputLine]);

    // Write server data to the terminal output
    const writeToTerminal = useCallback((data) => {
        const el = outputRef.current;
        if (!el) return;

        let cleaned = data;

        // Handle clear screen
        // eslint-disable-next-line no-control-regex
        if (/\x1b\[2J/g.test(cleaned)) {
            el.innerHTML = '';
            // eslint-disable-next-line no-control-regex
            cleaned = cleaned.replace(/\x1b\[2J/g, '').replace(/\x1b\[H/g, '');
            if (!cleaned.trim()) return;
        }

        // eslint-disable-next-line no-control-regex
        cleaned = cleaned.replace(/\x1b\[\?[0-9;]*[hlsr]/g, '');
        // eslint-disable-next-line no-control-regex
        cleaned = cleaned.replace(/\x1b\[[0-9;]*[ABCDJKGHS]/g, '');
        // eslint-disable-next-line no-control-regex
        cleaned = cleaned.replace(/\x1b\]0;[^\x07]*\x07/g, '');
        // eslint-disable-next-line no-control-regex
        cleaned = cleaned.replace(/\x1b\[[?]?[0-9;]*[a-zA-Z]/g, function (match) {
            if (match.endsWith('m')) return match;
            return '';
        });

        cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        const html = ansiToHtml(cleaned);
        el.innerHTML += html;
        scrollToBottom();
    }, [ansiToHtml, scrollToBottom]);

    // Socket event listeners
    useEffect(() => {
        if (!socket || !terminalId) return;

        const handleOutput = ({ id, data }) => {
            if (id !== terminalId) return;
            if (isAttached.current && outputRef.current) {
                writeToTerminal(data);
            } else {
                bufferedOutput.current.push(data);
            }
        };

        const handleExit = ({ id, exitCode }) => {
            if (id !== terminalId) return;
            const msg = `\n[Process exited with code ${exitCode}]\n`;
            if (isAttached.current && outputRef.current) {
                writeToTerminal(msg);
            } else {
                bufferedOutput.current.push(msg);
            }
        };

        const handleError = ({ id, error }) => {
            if (id !== terminalId) return;
            const msg = `\n[Error: ${error}]\n`;
            if (isAttached.current && outputRef.current) {
                writeToTerminal(msg);
            } else {
                bufferedOutput.current.push(msg);
            }
        };

        socket.on('terminal:output', handleOutput);
        socket.on('terminal:exit', handleExit);
        socket.on('terminal:error', handleError);

        return () => {
            socket.off('terminal:output', handleOutput);
            socket.off('terminal:exit', handleExit);
            socket.off('terminal:error', handleError);
        };
    }, [socket, terminalId, writeToTerminal]);

    // Listen for code execution output from the Run button
    useEffect(() => {
        if (!isActive) return;

        const handleRunOutput = (e) => {
            writeToTerminal(e.detail);
        };

        window.addEventListener('terminal:run-output', handleRunOutput);
        return () => window.removeEventListener('terminal:run-output', handleRunOutput);
    }, [isActive, writeToTerminal]);

    // Flush buffered output when tab becomes active
    useEffect(() => {
        if (isActive && outputRef.current && !isAttached.current) {
            isAttached.current = true;
            bufferedOutput.current.forEach(data => writeToTerminal(data));
            bufferedOutput.current = [];
        }
    }, [isActive, writeToTerminal]);

    // Replace current input and re-render
    const setInput = useCallback((text) => {
        currentInputRef.current = text;
        cursorPosRef.current = text.length;
        renderInputLine();
    }, [renderInputLine]);

    // Handle keyboard input
    const handleKeyDown = useCallback((e) => {
        if (!socket || !terminalId) return;

        // Allow Cmd+C/V/X to work natively
        if (e.metaKey && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
            return;
        }

        // Cmd+A: select only terminal content, not the whole page
        if (e.metaKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            e.stopPropagation();
            const selection = window.getSelection();
            const range = document.createRange();
            const scrollDiv = containerRef.current?.firstElementChild;
            if (scrollDiv) {
                range.selectNodeContents(scrollDiv);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const input = currentInputRef.current;
        const pos = cursorPosRef.current;

        if (e.key === 'Enter') {
            const cmd = input.trim();
            if (cmd) historyRef.current.push(cmd);
            historyIndexRef.current = -1;
            // Move input text to the permanent output
            if (outputRef.current) {
                outputRef.current.innerHTML += escapeHtml(input) + '\n';
            }
            currentInputRef.current = '';
            cursorPosRef.current = 0;
            renderInputLine();
            // Send the FULL command + newline to bash (not char-by-char)
            socket.emit('terminal:input', { id: terminalId, data: input + '\n' });
        } else if (e.key === 'Backspace') {
            if (pos > 0) {
                currentInputRef.current = input.slice(0, pos - 1) + input.slice(pos);
                cursorPosRef.current = pos - 1;
                renderInputLine();
            }
        } else if (e.key === 'Delete') {
            if (pos < input.length) {
                currentInputRef.current = input.slice(0, pos) + input.slice(pos + 1);
                renderInputLine();
            }
        } else if (e.key === 'ArrowLeft') {
            if (pos > 0) {
                cursorPosRef.current = pos - 1;
                renderInputLine();
            }
        } else if (e.key === 'ArrowRight') {
            if (pos < input.length) {
                cursorPosRef.current = pos + 1;
                renderInputLine();
            }
        } else if (e.key === 'Home') {
            cursorPosRef.current = 0;
            renderInputLine();
        } else if (e.key === 'End') {
            cursorPosRef.current = input.length;
            renderInputLine();
        } else if (e.key === 'ArrowUp') {
            const history = historyRef.current;
            if (history.length > 0) {
                if (historyIndexRef.current === -1) {
                    historyIndexRef.current = history.length - 1;
                } else if (historyIndexRef.current > 0) {
                    historyIndexRef.current--;
                }
                setInput(history[historyIndexRef.current]);
            }
        } else if (e.key === 'ArrowDown') {
            const history = historyRef.current;
            if (historyIndexRef.current !== -1) {
                if (historyIndexRef.current < history.length - 1) {
                    historyIndexRef.current++;
                    setInput(history[historyIndexRef.current]);
                } else {
                    historyIndexRef.current = -1;
                    setInput('');
                }
            }
        } else if (e.key === 'Tab') {
            // Tab completion — send current input + tab
            socket.emit('terminal:input', { id: terminalId, data: input + '\t' });
        } else if (e.key === 'Escape') {
            // Do nothing
        } else if (e.ctrlKey && e.key.length === 1) {
            const code = e.key.toLowerCase().charCodeAt(0) - 96;
            if (code >= 1 && code <= 26) {
                const char = String.fromCharCode(code);
                if (code === 3) { // Ctrl+C
                    if (outputRef.current) {
                        outputRef.current.innerHTML += escapeHtml(input) + '^C\n';
                    }
                    currentInputRef.current = '';
                    cursorPosRef.current = 0;
                    historyIndexRef.current = -1;
                    renderInputLine();
                    socket.emit('terminal:input', { id: terminalId, data: char });
                } else if (code === 12) { // Ctrl+L
                    if (outputRef.current) outputRef.current.innerHTML = '';
                    currentInputRef.current = '';
                    cursorPosRef.current = 0;
                    renderInputLine();
                } else {
                    socket.emit('terminal:input', { id: terminalId, data: char });
                }
            }
        } else if (e.key.length === 1 && !e.metaKey) {
            // Insert character at cursor position (local only — sent on Enter)
            currentInputRef.current = input.slice(0, pos) + e.key + input.slice(pos);
            cursorPosRef.current = pos + 1;
            renderInputLine();
        }
    }, [socket, terminalId, renderInputLine, setInput]);

    // Handle paste
    const handlePaste = useCallback((e) => {
        if (!socket || !terminalId) return;
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        if (text) {
            const input = currentInputRef.current;
            const pos = cursorPosRef.current;
            currentInputRef.current = input.slice(0, pos) + text + input.slice(pos);
            cursorPosRef.current = pos + text.length;
            renderInputLine();
        }
    }, [socket, terminalId, renderInputLine]);

    const handleFocus = useCallback(() => setIsFocused(true), []);
    const handleBlur = useCallback(() => setIsFocused(false), []);
    const handleClick = useCallback(() => {
        containerRef.current?.focus();
    }, []);

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onClick={handleClick}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
                width: '100%',
                height: '100%',
                display: isActive ? 'flex' : 'none',
                flexDirection: 'column',
                backgroundColor: colors.bg,
                cursor: 'text',
                outline: 'none',
            }}
        >
            <div
                className="terminal-output-area"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '8px 12px',
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace",
                    fontSize: '13px',
                    lineHeight: '1.4',
                    color: colors.text,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    userSelect: 'text',
                    cursor: 'text',
                }}
            >
                <span ref={outputRef}></span>
                <span ref={inputLineRef}></span>
            </div>
            <style>{`
                @keyframes terminalBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                .term-cursor {
                    animation: terminalBlink 1s step-end infinite;
                }
                .terminal-output-area ::selection {
                    background-color: ${colors.selectionBg};
                    color: ${colors.text};
                }
                .terminal-output-area ::-moz-selection {
                    background-color: ${colors.selectionBg};
                    color: ${colors.text};
                }
            `}</style>
        </div>
    );
};

export default VSCodeTerminal;
