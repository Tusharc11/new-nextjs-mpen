'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '../sidebar/sidebar';
import Navbar from '../navbar/navbar';
import { useSidebarStore } from '../store/useSidebarStore';
import { authService } from '@/lib/auth-service';
import AuthStatus from '../ui/AuthStatus';

interface ClientLayoutProps {
    children: React.ReactNode;
}

// List of routes that should use the authenticated layout
const AUTHENTICATED_ROUTES = [
    '/dashboard',
    '/manage-staff',
    '/manage-student', 
    '/manage-course',
    '/manage-subject',
    '/manage-fees',
    '/manage-result',
    '/manage-leave',
    '/manage-timetable',
    '/attendance',
    '/announcements',
    '/profile',
    '/calendar',
    '/manage-transport',
    '/manage-transport/add',
    '/manage-marksheet',
    '/manage-admitCard',
];

export default function ClientLayout({ children }: ClientLayoutProps) {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { isExpanded } = useSidebarStore();

    useEffect(() => {
        setMounted(true);
        checkAuthStatus();
        
        // Listen for auth changes
        const handleAuthChange = () => {
            checkAuthStatus();
        };
        
        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    // Start/stop auth service based on authentication status
    useEffect(() => {
        if (isAuthenticated) {
            authService.start();
            
            // Add activity listeners for refresh on user interaction
            const handleUserActivity = () => {
                authService.refreshOnActivity();
            };
            
            const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
            events.forEach(event => {
                document.addEventListener(event, handleUserActivity, { passive: true });
            });
            
            return () => {
                events.forEach(event => {
                    document.removeEventListener(event, handleUserActivity);
                });
                authService.stop();
            };
        } else {
            authService.stop();
        }
    }, [isAuthenticated]);

    const checkAuthStatus = () => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            setIsAuthenticated(!!token);
        }
    };

    if (!mounted) {
        return <div>{children}</div>;
    }

    // Check if current route needs authenticated layout
    const isAuthenticatedRoute = AUTHENTICATED_ROUTES.some(route => pathname.startsWith(route));

    // If not an authenticated route or user is not authenticated, just render children
    if (!isAuthenticatedRoute || !isAuthenticated) {
        return <>{children}</>;
    }

    // Render authenticated layout - no memoization to prevent persistence issues
    return (
        <div className="relative h-screen overflow-hidden bg-gray-100 dark:bg-neutral-900">
            <AuthStatus />
            <Sidebar />
            <div 
                className={`${isExpanded ? 'ml-64' : 'ml-16'} h-full flex flex-col transition-all duration-300 ease-in-out`}
            >
                <Navbar />
                <main className="flex-1 overflow-auto pt-16">
                    {children}
                </main>
            </div>
        </div>
    );
}