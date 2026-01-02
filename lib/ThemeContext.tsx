"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'neon';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Default to 'light' to avoid mismatch, sync in useEffect
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('gravity-theme') as Theme;
        if (stored) {
            setThemeState(stored);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setThemeState('dark');
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem('gravity-theme', theme);
        
        // Remove all theme classes first
        document.documentElement.classList.remove('light', 'dark', 'neon');
        document.documentElement.classList.add(theme);
        
        // Ensure color-scheme is updated
        document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';

    }, [theme, mounted]);

    const setTheme = (t: Theme) => {
        setThemeState(t);
    };

    if (!mounted) {
        // Render nothing or a loader to prevent flash
        // But for SSR purposes, we might render children with default light theme but it might flash.
        // Let's render children to be safe for SEO/Hydration, but styling might jump.
        // Actually, returning null prevents hydration mismatch but harms SEO. 
        // A common pattern is to accept the flash or use script injection (too complex here).
        // Let's just return children.
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
