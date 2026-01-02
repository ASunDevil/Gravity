"use client";

import { useTheme } from '@/lib/ThemeContext';
import { useEffect, useState } from 'react';

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    return (
        <div className="flex bg-card border border-border rounded-full p-1 shadow-sm">
            {(['light', 'dark', 'neon'] as const).map((t) => (
                <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                        theme === t
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
            ))}
        </div>
    );
}
