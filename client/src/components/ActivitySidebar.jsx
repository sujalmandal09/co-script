import React, { useState, useEffect, useRef } from 'react';

const ActivitySidebar = ({ clients, socket, roomId }) => {
    const [activeTab, setActiveTab] = useState('chat');
    const [messages, setMessages] = useState([
        { type: 'system', content: `Welcome to Room ${roomId}.`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    const [activityLog, setActivityLog] = useState([
        { type: 'join', user: 'System', detail: 'Room initialized', time: 'Just now' }
    ]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Listen for incoming messages
    useEffect(() => {
        if (!socket) return;

        const messageHandler = ({ username, message, time }) => {
            setMessages(prev => [...prev, { type: 'user', username, content: message, timestamp: time }]);
        };

        socket.on('receive_message', messageHandler);

        // Mock Activity Events (hook to real ones later)
        const joinHandler = ({ username }) => {
            setActivityLog(prev => [{ type: 'join', user: username, detail: 'Joined the room', time: 'Just now' }, ...prev]);
        };
        socket.on('user_joined', joinHandler);

        return () => {
            socket.off('receive_message', messageHandler);
            socket.off('user_joined', joinHandler);
        };
    }, [socket]);

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        const msgData = {
            roomId,
            username: 'You',
            message: newMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        // Emit logic would be here, for now local update + mock emit
        // socket.emit('send_message', msgData); 
        setMessages(prev => [...prev, { type: 'user', username: 'You', content: newMessage, timestamp: msgData.time }]);
        setNewMessage('');
        // To truly work, needs username from context. For now 'You'.
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }

    return (
        <aside className="w-80 md:w-96 bg-[#f8fbfb] dark:bg-[#111317] border-l border-slate-200 dark:border-slate-800 flex flex-col font-display transition-colors">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-6">
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-sm font-bold tracking-tight transition-colors ${activeTab === 'chat' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    <span className="material-icons-round text-lg">chat</span>
                    Chat
                </button>
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-sm font-bold tracking-tight transition-colors ${activeTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                    <span className="material-icons-round text-lg">history</span>
                    Activity
                </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {activeTab === 'chat' ? (
                    <>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex items-end gap-3 max-w-[85%] ${msg.username === 'You' ? 'ml-auto justify-end' : ''} group`}>
                                    {msg.username !== 'You' && (
                                        <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {msg.username ? msg.username[0] : 'S'}
                                        </div>
                                    )}
                                    <div className={`flex flex-col gap-1 ${msg.username === 'You' ? 'items-end' : ''}`}>
                                        <span className="text-slate-400 text-[11px] font-medium mx-1">
                                            {msg.username || 'System'} • {msg.timestamp || 'Now'}
                                        </span>
                                        <div className={`text-sm p-3 rounded-xl shadow-sm ${msg.username === 'You' ? 'bg-primary text-white rounded-br-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                    {msg.username === 'You' && (
                                        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary border border-primary">
                                            Y
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Composer */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#16181d]">
                            <div className="flex flex-col gap-3">
                                <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:border-primary transition-all p-2">
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none h-12 py-1 placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
                                        placeholder="Type a message..."
                                    ></textarea>
                                    <div className="flex items-center justify-end mt-1">
                                        <button
                                            onClick={handleSendMessage}
                                            className="bg-primary text-white p-1.5 rounded-lg hover:bg-primary/90 shadow-sm transition-all flex items-center gap-2 px-3"
                                        >
                                            <span className="text-xs font-bold">SEND</span>
                                            <span className="material-icons-round text-sm">send</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3">Today</h4>
                        <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:h-full before:w-[1px] before:bg-slate-200 dark:before:bg-slate-800">
                            {/* Static mocked activity for demo, can map mockActivityLog here */}
                            <div className="flex items-start gap-4 relative pl-2">
                                <div className="absolute left-[5px] top-1 w-2 h-2 rounded-full bg-green-500 ring-4 ring-white dark:ring-[#111317]"></div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Build complete</p>
                                    <p className="text-xs text-slate-500">Successfully deployed to local • 30s ago</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 relative pl-2">
                                <div className="absolute left-[5px] top-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-white dark:ring-[#111317]"></div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Project Initialized</p>
                                    <p className="text-xs text-slate-500">Room created by Host • 5m ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default ActivitySidebar;
