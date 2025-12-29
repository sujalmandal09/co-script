import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import "./Home.css";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const navigate = useNavigate();

  // Countdown timer - November 18 11:00 PM to Feb 28th 12:00 PM 2026 (Indian Time)
  useEffect(() => {
    // Set target date: February 28, 2026, 12:00 PM IST
    const targetDate = new Date('February 28, 2026 12:00:00 GMT+05:30');
    
    const timer = setInterval(() => {
      const now = new Date();
      // Convert to IST (UTC+5:30)
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

  const createRoom = () => {
    const id = uuid();
    navigate(`/room/${id}`);
  };

  const joinRoom = () => {
    if (!roomId.trim()) return;
    navigate(`/room/${roomId}`);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      joinRoom();
    }
  };

  return (
    <div className="home-container">
      {/* Header - Centered Logo */}
      <header className="main-header">
        <div className="logo-container">
          <div className="logo">
            <span className="logo-text">CoScript</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="tag-container">
            <span className="tag">BHAVANS</span>
          </div>
          
          <h1 className="hero-title">
            Collaborative Code Editor
          </h1>
          
          <p className="hero-description">
            Discover, code, collaborate – CoScript makes real-time coding effortless. Your next project starts right here.
          </p>

          {/* Countdown Timer */}
          <div className="countdown-section">
            <h3 className="countdown-title">Launching in</h3>
            <div className="countdown-timer">
              <div className="time-unit">
                <span className="time-value">{timeLeft.days.toString().padStart(3, '0')}</span>
                <span className="time-label">DAYS</span>
              </div>
              <div className="time-unit">
                <span className="time-value">{timeLeft.hours.toString().padStart(2, '0')}</span>
                <span className="time-label">HOURS</span>
              </div>
              <div className="time-unit">
                <span className="time-value">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                <span className="time-label">MINUTES</span>
              </div>
              <div className="time-unit">
                <span className="time-value">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                <span className="time-label">SECONDS</span>
              </div>
            </div>
            <p className="countdown-note">Until February 28, 2026 • 12:00 PM</p>
          </div>

          {/* Feature List */}
          <div className="feature-list-section">
            <div className="feature-check">
              <span className="check-icon">✔</span>
              <span>Real-time collaboration</span>
            </div>
            <div className="feature-check">
              <span className="check-icon">✔</span>
              <span>Multiple languages</span>
            </div>
            <div className="feature-check">
              <span className="check-icon">✔</span>
              <span>Instant sync</span>
            </div>
          </div>

          {/* Room Actions - Centered without Free Access badge */}
          <div className="room-actions">
            <div className="action-card">
              <div className="card-header">
                <h4>Create or Join Room</h4>
              </div>
              
              <div className="action-buttons">
                <button 
                  onClick={createRoom}
                  className="action-btn primary-btn"
                >
                  + Create New Room
                </button>

                <div className="join-section">
                  <input
                    placeholder="Enter Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="room-input"
                  />
                  <button 
                    onClick={joinRoom}
                    disabled={!roomId.trim()}
                    className="action-btn secondary-btn"
                  >
                    Join Room
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Steps Section */}
          {/* <div className="steps-section">
            <h3 className="section-title">Get Started in 4 Simple Steps</h3>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-icon">🔍</div>
                <h4>SEARCH</h4>
                <p>Find coding rooms</p>
              </div>
              <div className="step-card">
                <div className="step-icon">💬</div>
                <h4>CHAT</h4>
                <p>Communicate in real-time</p>
              </div>
              <div className="step-card">
                <div className="step-icon">⚡</div>
                <h4>CODE</h4>
                <p>Collaborate instantly</p>
              </div>
              <div className="step-card">
                <div className="step-icon">📊</div>
                <h4>TRACK</h4>
                <p>Monitor changes</p>
              </div>
            </div>
          </div> */}

          {/* Final CTA */}
          {/* <div className="final-cta">
            <p className="cta-text">Your coding collaboration starts right here.</p>
          </div> */}
        </div>
      </div>

      {/* Footer */}
      {/* <footer className="main-footer">
        <p>&copy; 2024 CoScript App. All rights reserved.</p>
      </footer> */}
    </div>
  );
}