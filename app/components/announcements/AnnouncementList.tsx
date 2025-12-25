'use client'

import React, { useEffect, useState } from 'react';
import AnnouncementCard from '@/app/components/announcements/AnnouncementCard';
import { IAnnouncement } from '@/app/api/models/announcement';
import { toast } from 'react-hot-toast';
import ProfileModal from '@/app/components/ui/ProfileModal';

interface AnnouncementListProps {
    refreshTrigger?: number;
}

export default function AnnouncementList({ refreshTrigger }: AnnouncementListProps) {
    const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
    
    // Filter announcements based on user role and group type
    const filteredAnnouncements = announcements.filter(announcement => {
        if (!currentUserRole) return true; // Show all if role not determined yet
        
        // If announcement is for EVERYONE, show to all users
        if (announcement.groupType === 'EVERYONE') {
            return true;
        }
        
        // If announcement is for ALL_STAFF, only show to non-student roles
        if (announcement.groupType === 'ALL_STAFF') {
            return currentUserRole !== 'STUDENT';
        }
        
        // Default: show all announcements if groupType doesn't match known types
        return true;
    });

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    console.log('No token found, skipping announcements fetch');    
                    setAnnouncements([]);
                    return;
                }

                const response = await fetch('/api/announcement', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                
                if (!response.ok) {
                    // Don't show error toast if it's a 401 (likely due to logout)
                    if (response.status !== 401) {
                        toast.error('Failed to fetch announcements');
                    }
                    setAnnouncements([]);
                    return;
                }
                
                const data = await response.json();
                
                // Ensure data is an array before setting it
                if (Array.isArray(data)) {
                    setAnnouncements(data);
                } else {
                    toast.error('Expected array but received');
                    setAnnouncements([]);
                }
            } catch (error) {
                console.error('Error fetching announcements:', error);
                // Only show error if we have a token (user is authenticated)
                const token = localStorage.getItem('token');
                if (token) {
                    toast.error('Error fetching announcements');
                }
                setAnnouncements([]);
            }
        };

        // Initial fetch
        fetchAnnouncements();

        // Set up polling - fetch announcements every minute (60,000 ms)
        const intervalId = setInterval(() => {
            // Only fetch if page is visible (user hasn't tabbed away)
            if (document.visibilityState === 'visible') {
                fetchAnnouncements();
            }
        }, 60000);

        // Also fetch when user returns to the page
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchAnnouncements();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup interval and event listener on component unmount
        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const payload = token.split('.')[1];
                const decodedPayload = JSON.parse(atob(payload));
                const userId = decodedPayload.id;
                const userRole = decodedPayload.role;
                setCurrentUserId(userId);
                setCurrentUserRole(userRole);
            } catch (error) {
                toast.error('Error decoding token');
            }
        }   
    }, []);

    // Handle profile modal
    const handleProfileClick = (userId: string) => {
        setSelectedProfileUserId(userId);
        setIsProfileModalOpen(true);
    };

    const handleProfileModalClose = () => {
        setIsProfileModalOpen(false);
        setSelectedProfileUserId(null);
    };

    // const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
        // return b.addedDate.getTime() - a.addedDate.getTime();
    // });

    return (
        <div className="space-y-3 sm:space-y-4">
            {!Array.isArray(filteredAnnouncements) || filteredAnnouncements.length === 0 ? (
                <div className="text-center py-12 sm:py-16 px-4">
                    <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📢</div>
                    <h3 className="text-base sm:text-lg font-semibold text-base-content mb-2">
                        {currentUserRole === 'STUDENT' ? 'No announcements for students yet' : 'No announcements yet'}
                    </h3>
                    <p className="text-sm sm:text-base text-base-content/60 max-w-md mx-auto">
                        {currentUserRole === 'STUDENT' 
                            ? 'Check back later for announcements from your teachers and staff!'
                            : 'Be the first to share an announcement with your school community!'
                        }
                    </p>
                </div>
            ) : (
                filteredAnnouncements.map((announcement) => (
                    <AnnouncementCard
                        key={announcement._id}
                        announcement={announcement}
                        currentUserId={currentUserId || ''}
                        onProfileClick={handleProfileClick}
                    />
                ))
            )}
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={handleProfileModalClose}
                userId={selectedProfileUserId || ''}
                showClassInfo={false}
                isStudentModal={false}
                userRole={currentUserRole || undefined}
            />
        </div>
    );
} 