"use client";

import { useEffect, useState } from 'react';

export default function ThinkingTimer({ startTime }: { startTime: number }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
        return () => clearInterval(interval);
    }, [startTime]);

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    return (
        <span className="font-mono">
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
    );
}
