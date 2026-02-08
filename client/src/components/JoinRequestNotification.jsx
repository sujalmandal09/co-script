import { useState, useEffect, useRef } from "react";
import "./JoinRequestNotification.css";

export default function JoinRequestNotification({
    requests,
    onAccept,
    onDecline
}) {
    const audioRef = useRef(null);
    const [playedIds, setPlayedIds] = useState(new Set());

    // Play notification sound for new requests
    useEffect(() => {
        if (requests.length > 0) {
            const newRequest = requests[requests.length - 1];
            if (!playedIds.has(newRequest.socketId)) {
                playNotificationSound();
                setPlayedIds(prev => new Set([...prev, newRequest.socketId]));
            }
        }
    }, [requests, playedIds]);

    const playNotificationSound = () => {
        // Create and play a beep sound programmatically
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // First beep
            const oscillator1 = audioContext.createOscillator();
            const gainNode1 = audioContext.createGain();
            oscillator1.connect(gainNode1);
            gainNode1.connect(audioContext.destination);
            oscillator1.frequency.value = 880; // A5 note
            oscillator1.type = "sine";
            gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator1.start(audioContext.currentTime);
            oscillator1.stop(audioContext.currentTime + 0.15);

            // Second beep (slightly delayed)
            setTimeout(() => {
                const oscillator2 = audioContext.createOscillator();
                const gainNode2 = audioContext.createGain();
                oscillator2.connect(gainNode2);
                gainNode2.connect(audioContext.destination);
                oscillator2.frequency.value = 1100; // Higher note
                oscillator2.type = "sine";
                gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                oscillator2.start(audioContext.currentTime);
                oscillator2.stop(audioContext.currentTime + 0.2);
            }, 150);
        } catch (e) {
            console.log("Audio notification not available");
        }
    };

    if (requests.length === 0) return null;

    return (
        <div className="join-requests-container">
            {requests.map((request) => (
                <div key={request.socketId} className="join-request-notification">
                    <div className="notification-header">
                        <span className="material-icons-round notification-icon">person_add</span>
                        <span className="notification-title">Join Request</span>
                    </div>

                    <div className="notification-body">
                        <div className="requester-avatar">
                            {request.userName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="requester-info">
                            <span className="requester-name">{request.userName}</span>
                            <span className="requester-message">wants to join the room</span>
                        </div>
                    </div>

                    <div className="notification-actions">
                        <button
                            className="action-btn decline-btn"
                            onClick={() => onDecline(request)}
                        >
                            <span className="material-icons-round">close</span>
                            Decline
                        </button>
                        <button
                            className="action-btn accept-btn"
                            onClick={() => onAccept(request)}
                        >
                            <span className="material-icons-round">check</span>
                            Accept
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
