import { createContext, useContext, useState, useEffect } from "react";

const API_URL = "http://localhost:3001/api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    // Check if user is already logged in
    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/me`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await response.json();
                    if (data.success) {
                        setUser(data.user);
                    } else {
                        // Token invalid, clear it
                        localStorage.removeItem("token");
                        setToken(null);
                    }
                } catch (error) {
                    console.error("Auth check failed:", error);
                    localStorage.removeItem("token");
                    setToken(null);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, [token]);

    // Email signup
    const signup = async (email, password, name) => {
        const response = await fetch(`${API_URL}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name }),
        });
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    // Email login
    const login = async (email, password) => {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    // Google OAuth
    const loginWithGoogle = async (googleData) => {
        const response = await fetch(`${API_URL}/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: googleData.email,
                name: googleData.name,
                googleId: googleData.sub,
            }),
        });
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    // Apple OAuth
    const loginWithApple = async (appleData) => {
        const response = await fetch(`${API_URL}/apple`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: appleData.email,
                name: appleData.name || appleData.email.split("@")[0],
                appleId: appleData.sub,
            }),
        });
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        localStorage.setItem("token", data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    // Logout
    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        signup,
        login,
        loginWithGoogle,
        loginWithApple,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

export default AuthContext;
