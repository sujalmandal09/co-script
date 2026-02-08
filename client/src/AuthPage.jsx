import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "./AuthPage.css";

export default function AuthPage() {
    const [mode, setMode] = useState("login"); // "login" or "signup"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login, signup, loginWithGoogle, loginWithApple } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Password validation for signup
        if (mode === "signup" && password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            if (mode === "login") {
                await login(email, password);
            } else {
                await signup(email, password, name);
            }
            navigate("/");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                console.log("Google Login Success, token:", tokenResponse);
                setLoading(true);
                // 1. Get user info from Google using the access token
                const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const userInfo = await userInfoResponse.json();
                console.log("Google User Info:", userInfo);

                // 2. Send to backend
                await loginWithGoogle(userInfo);
                navigate("/");
            } catch (err) {
                console.error("Google login processing failed:", err);
                setError("Failed to process Google login: " + err.message);
            } finally {
                setLoading(false);
            }
        },
        onError: (errorResponse) => {
            console.error("Google Login Error:", errorResponse);
            setError("Google login popup failed/closed.");
            setLoading(false);
        },
    });

    const handleGoogleLogin = () => {
        setError("");
        googleLogin();
    };

    const handleAppleLogin = async () => {
        // For demo purposes - in production, use Apple Sign-In SDK
        setError("Apple OAuth requires configuration. Please use email login for now.");
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                {/* Logo */}
                <div className="auth-logo">
                    <div className="logo-icon bg-primary text-white rounded-lg flex items-center justify-center" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
                        <span className="material-icons-round text-2xl">code</span>
                    </div>
                    <span className="logo-text text-2xl font-extrabold tracking-tight text-slate-900 ml-3">
                        CoScript
                    </span>
                </div>

                <h1 className="auth-title">
                    {mode === "login" ? "Welcome back" : "Create your account"}
                </h1>
                <p className="auth-subtitle">
                    {mode === "login"
                        ? "Sign in to continue to your collaborative coding sessions"
                        : "Join CoScript to start coding together"
                    }
                </p>

                {/* OAuth Buttons */}
                <div className="oauth-buttons">
                    <button
                        type="button"
                        className="oauth-btn google-btn"
                        onClick={handleGoogleLogin}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    <button
                        type="button"
                        className="oauth-btn apple-btn"
                        onClick={handleAppleLogin}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                        </svg>
                        Continue with Apple
                    </button>
                </div>

                <div className="divider">
                    <span>or continue with email</span>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        <span className="material-icons-round">error</span>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="auth-form">
                    {mode === "signup" && (
                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={mode === "signup" ? "Minimum 6 characters" : "Enter your password"}
                            required
                        />
                        {mode === "signup" && password.length > 0 && password.length < 6 && (
                            <span className="password-hint error">
                                Password must be at least 6 characters
                            </span>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                {mode === "login" ? "Signing in..." : "Creating account..."}
                            </>
                        ) : (
                            mode === "login" ? "Sign In" : "Create Account"
                        )}
                    </button>
                </form>

                {/* Toggle Mode */}
                <p className="toggle-mode">
                    {mode === "login" ? (
                        <>
                            Don't have an account?{" "}
                            <button type="button" onClick={() => { setMode("signup"); setError(""); }}>
                                Sign up
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{" "}
                            <button type="button" onClick={() => { setMode("login"); setError(""); }}>
                                Sign in
                            </button>
                        </>
                    )}
                </p>
            </div>

            {/* Background decoration */}
            <div className="auth-bg-decoration">
                <div className="bg-circle circle-1"></div>
                <div className="bg-circle circle-2"></div>
                <div className="bg-circle circle-3"></div>
            </div>
        </div>
    );
}
