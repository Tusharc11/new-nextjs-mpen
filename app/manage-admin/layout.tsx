'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '../components/sidebar/sidebar';
import Navbar from '../components/navbar/navbar';
import { useSidebarStore } from '../components/store/useSidebarStore';
export default function ManageAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mounted, setMounted] = useState(false);
    const { isExpanded } = useSidebarStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div className="relative h-screen overflow-hidden bg-gray-100 dark:bg-neutral-900">
            <Sidebar />
            <div 
                className={`${isExpanded ? 'ml-64' : 'ml-16'} h-full flex flex-col transition-all duration-300 ease-in-out`}
            >
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}