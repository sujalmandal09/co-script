const express = require("express");
const User = require("../Models/User");
const { authMiddleware, generateToken } = require("../Middleware/authMiddleware");

const router = express.Router();

// Email Signup
router.post("/signup", async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: "Email, password, and name are required",
            });
        }

        // Password length validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 6 characters",
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: "An account with this email already exists",
            });
        }

        // Create user
        const user = await User.create({
            email: email.toLowerCase(),
            password,
            name,
            authProvider: "email",
        });

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
            token,
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to create account",
        });
    }
});

// Email Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email and password are required",
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password",
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password",
            });
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
            token,
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to login",
        });
    }
});

// Google OAuth
router.post("/google", async (req, res) => {
    try {
        const { email, name, googleId } = req.body;

        if (!email || !name) {
            return res.status(400).json({
                success: false,
                error: "Email and name are required",
            });
        }

        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // Create new user for Google OAuth
            user = await User.create({
                email: email.toLowerCase(),
                name,
                authProvider: "google",
            });
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
            token,
        });
    } catch (error) {
        console.error("Google auth error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to authenticate with Google: " + error.message,
        });
    }
});

// Apple OAuth
router.post("/apple", async (req, res) => {
    try {
        const { email, name, appleId } = req.body;

        if (!email || !name) {
            return res.status(400).json({
                success: false,
                error: "Email and name are required",
            });
        }

        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            user = await User.create({
                email: email.toLowerCase(),
                name,
                authProvider: "apple",
            });
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
            token,
        });
    } catch (error) {
        console.error("Apple auth error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to authenticate with Apple",
        });
    }
});

// Get current user
router.get("/me", authMiddleware, async (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            email: req.user.email,
            name: req.user.name,
        },
    });
});

module.exports = router;
