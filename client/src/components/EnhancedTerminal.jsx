import React, { useState, useEffect } from 'react';

const EnhancedTerminal = ({ output, isRunning, onClear, onClose }) => {
    const [activeTab, setActiveTab] = useState('terminal');
    const [progress, setProgress] = useState(0);

    // Simulate progress when running
    useEffect(() => {
        if (isRunning) {
            setProgress(0);
            const interval = setInterval(() => {
                setProgress(p => (p < 90 ? p + 10 : p));
            }, 300);
            return () => clearInterval(interval);
        } else if (progress > 0 && progress < 100) {
            setProgress(100);
            setTimeout(() => setProgress(0), 1000);
        }
    }, [isRunning, progress]);

    const hasError = output?.some(line => line.toLowerCase().includes('error'));

    return (
        <div className="h-[350px] w-full bg-[#0d1117] flex flex-col shadow-2xl border-t border-[#30363d] overflow-hidden font-display transition-all">
            {/* Status Bar: Build & Run */}
            <div className="bg-[#161b22] border-b border-[#30363d] px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 max-w-2xl">
                    <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className={`absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 ${isRunning ? 'animate-ping' : ''}`}></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                <p className="text-white text-xs font-bold uppercase tracking-wider">Build & Run</p>
                            </div>
                            <p className="text-primary text-xs font-mono font-bold">{progress}%</p>
                        </div>
                        <div className="h-1.5 w-full bg-[#30363d] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6 ml-8">
                    <div className="h-8 w-[1px] bg-[#30363d]"></div>
                    <p className="text-[#8b949e] text-xs font-medium">Environment: <span className="text-white">Node v20.x</span></p>
                </div>
            </div>

            {/* Toolbar & Tabs */}
            <div className="flex justify-between items-center bg-[#0d1117] px-4 border-b border-[#30363d]">
                <div className="flex gap-1">
                    {['terminal', 'debug', 'output'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex items-center px-4 py-3 border-b-2 text-xs font-bold tracking-widest uppercase transition-colors ${activeTab === tab ? 'border-primary text-white' : 'border-transparent text-[#8b949e] hover:text-white'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onClear} className="p-2 text-[#8b949e] hover:text-white hover:bg-white/5 rounded transition-all" title="Clear Logs">
                        <span className="material-icons-round text-[20px]">delete_sweep</span>
                    </button>
                    <button onClick={onClose} className="p-2 text-[#8b949e] hover:text-white hover:bg-white/5 rounded transition-all" title="Close Terminal">
                        <span className="material-icons-round text-[20px]">close</span>
                    </button>
                    {isRunning && (
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all border border-red-500/20 ml-2">
                            <span className="material-icons-round text-[18px]">stop_circle</span>
                            <span className="text-xs font-bold uppercase">Stop</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Terminal Output Area */}
            <div className="flex-1 overflow-y-auto bg-[#0d1117] p-0 font-mono text-[13px] leading-relaxed custom-scrollbar">
                {output && output.length > 0 ? (
                    <div className="p-4 flex flex-col gap-1">
                        {output.map((line, i) => {
                            const isError = line.toLowerCase().includes('error');
                            const isWarning = line.toLowerCase().includes('warn');
                            const isSuccess = line.toLowerCase().includes('success');

                            if (isError) {
                                return (
                                    <div key={i} className="mx-2 my-2 rounded-lg overflow-hidden border border-red-500/30 bg-red-500/5">
                                        <div className="bg-red-500/90 px-4 py-1.5 flex items-center gap-2">
                                            <span className="material-icons-round text-white text-[16px]">error</span>
                                            <span className="text-white font-bold uppercase tracking-tight text-[10px]">Error Output</span>
                                        </div>
                                        <div className="p-3 text-red-400 font-bold">
                                            {line}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={i} className={`flex items-start gap-4 px-2 py-1 border-l-4 hover:bg-white/5 transition-colors ${isSuccess ? 'border-green-500' : isWarning ? 'border-amber-500' : 'border-transparent'}`}>
                                    <span className="text-[#484f58] shrink-0 min-w-[60px] select-none text-[11px] pt-0.5">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                                    <div className="flex items-center gap-2">
                                        {isSuccess && <span className="material-icons-round text-green-500 text-[14px]">check_circle</span>}
                                        {isWarning && <span className="material-icons-round text-amber-500 text-[14px]">warning</span>}
                                        {!isSuccess && !isWarning && <span className="material-icons-round text-primary text-[14px]">info</span>}
                                        <p className="text-[#c9d1d9] break-all">{line}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-[#8b949e] opacity-50">
                        <span className="material-icons-round text-4xl mb-2">terminal</span>
                        <p>Ready to compile...</p>
                    </div>
                )}
            </div>

            {/* Terminal Footer */}
            <div className="bg-[#161b22] px-6 py-2 border-t border-[#30363d] flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px] text-[#8b949e]">
                    <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${hasError ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        <span>{hasError ? 'Issues Found' : 'No vulnerabilities found'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedTerminal;
