'use client'

import React, { useState, useEffect } from 'react';
import { Bell, Calendar, CalendarRange, MessageSquare, ShoppingBag } from 'lucide-react';
import { useSidebarStore } from '../store/useSidebarStore';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '../ui/button';

const Navbar = () => {
  const { isExpanded, organizationName } = useSidebarStore();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <div 
      className={`fixed top-0 ${resolvedTheme === 'light' ? 'bg-blue-100' : 'bg-black'} h-16 z-[999] transition-all duration-300 ease-in-out ${
        isExpanded ? 'left-64 w-[calc(100%-16rem)]' : 'left-16 w-[calc(100%-4rem)]'
      }`}
    >
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left side - Organization name when sidebar is collapsed */}
        {!isExpanded && (
          <div className="flex items-center">
            <span className="text-lg font-bold text-primary truncate max-w-xs">
              {organizationName}
            </span>
          </div>
        )}
        
        {/* Right side - Icons */}
        <div className={`flex items-center gap-4 ${isExpanded ? 'ml-auto' : ''}`}>
          {/* Calendar Button */}
          <div className="hidden sm:block">
            <Button
              variant="neutral"
              outline
              className="btn-sm btn-ghost"
              onClick={() => router.push('/manage-timetable')}
            >
              <CalendarRange className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">Timetable</span>
            </Button>
          </div>
          
          {/* Mobile Calendar Icon */}
          <div className="sm:hidden">
            <Button
              variant="neutral"
              outline
              className="btn-sm btn-ghost"
              onClick={() => router.push('/manage-timetable')}
            >
              <CalendarRange className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">Timetable</span>
            </Button>
          </div>

          {/* Notifications */}
          <div className="dropdown dropdown-end">
            <button 
              className="btn btn-ghost btn-circle tooltip tooltip-left"
              data-tip="announcements"
              onClick={() => router.push('/announcements')}
            >
              <div className="indicator">
                <Bell className="w-5 h-5 text-primary" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
