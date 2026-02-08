module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#4F46E5",
                "sidebar-bg": "#F8FAFC",
                "border-main": "#E2E8F0",
                "background-light": "#f8fafc", // Keep for compatibility or alias
                "background-dark": "#0f172a", // Keep for compatibility
                surface: {
                    light: '#ffffff',
                    dark: '#1e293b',
                },
            },
            fontFamily: {
                display: ["Inter", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            borderRadius: {
                DEFAULT: "0.75rem",
                'technical': '4px',
                '2xl': '1.5rem',
            },
        },
    },
    plugins: [],
};
