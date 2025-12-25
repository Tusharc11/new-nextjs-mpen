'use client';

import React, { useState, useEffect } from 'react';
import { authService } from '@/lib/auth-service';

export default function AuthStatus() {
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const updateTimeRemaining = () => {
            const remaining = authService.getTokenTimeRemaining();
            setTimeRemaining(remaining);
            
            // Show status if token expires in less than 2 hours
            setIsVisible(remaining !== null && remaining < 2 * 60 * 60 * 1000);
        };

        // Update immediately
        updateTimeRemaining();
        
        // Update every minute
        const interval = setInterval(updateTimeRemaining, 60000);
        
        return () => clearInterval(interval);
    }, []);

    if (!isVisible || !timeRemaining) {
        return null;
    }

    const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
    const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3 shadow-lg">
            <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-700 dark:text-blue-300">
                    Session expires in {hours > 0 ? `${hours}h ` : ''}{minutes}m
                </span>
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Auto-refresh enabled
            </div>
        </div>
    );
}