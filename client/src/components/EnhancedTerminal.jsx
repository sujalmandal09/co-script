import React, { useEffect, useRef } from 'react';

const EnhancedTerminal = ({ onClose, onRun, output = [], onClear }) => {
    const outputRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    return (
        <div className="h-full w-full bg-[#1e1e1e] flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Console Output</span>
                <div className="flex items-center gap-3">
                    <button onClick={onRun} className="flex items-center gap-1 p-1 hover:bg-[#333] rounded text-green-400 font-bold" title="Run Code">
                        <span className="text-xs">▶ Run</span>
                    </button>
                    <button onClick={onClear} className="text-xs text-gray-400 hover:text-white px-2 py-1 hover:bg-[#333] rounded">Clear</button>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <span className="material-icons-round text-sm">close</span>
                    </button>
                </div>
            </div>

            {/* Output Area */}
            <div ref={outputRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1">
                {output.length === 0 && (
                    <div className="text-gray-500 italic">Ready to run code...</div>
                )}
                {output.map((line, i) => (
                    <div key={i} className={`${line.includes('Error') || line.includes('Exited') ? 'text-red-400' : 'text-gray-300'} whitespace-pre-wrap break-all`}>
                        {line}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EnhancedTerminal;
