'use client'

import React, { useState } from 'react';
import { MoreVertical, Pin, Edit, Trash2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { IAnnouncement } from '@/app/api/models/announcement';

interface AnnouncementCardProps {
    announcement: IAnnouncement;
    currentUserId: string;
    onProfileClick: (userId: string) => void;
}

const categoryColors: Record<string, string> = {
    general: 'badge-primary',
    training: 'badge-ghost',
    special: 'badge-error',
};

export default function AnnouncementCard({
    announcement,
    currentUserId,
    onProfileClick
}: AnnouncementCardProps) {
    const [showFullContent, setShowFullContent] = useState(false);

    const isAuthor = announcement.senderId._id === currentUserId;

    const contentPreview = announcement.content.slice(0, 150); // Shorter preview for mobile
    const shouldShowReadMore = announcement.content.length > 150;

    return (
        <div className={`
            border border-base-300 rounded-lg p-3 sm:p-4 
          hover:bg-base-100/80 hover:shadow-md transition-all duration-200 
          bg-base-100 cursor-pointer min-w-0 
        `}>
            <div className="flex flex-col gap-3 sm:gap-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="avatar flex-shrink-0">
                            <div 
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-1 sm:ring-2 ring-base-300 cursor-pointer hover:ring-primary transition-all duration-200"
                                onClick={() => onProfileClick(String(announcement.senderId._id))}
                                title="Click to view profile"
                            >
                                <img
                                    src={announcement.senderId.profileImage || '/images/default-avatar.jpg'}
                                    alt={`${announcement.senderId.firstName} ${announcement.senderId.lastName}`}
                                    className="object-cover"
                                />
                            </div>
                        </div>

                        {/* Author info */}
                        <div className="flex-1 min-w-0">
                            <h3 
                                className="font-semibold text-base-content text-sm sm:text-base truncate cursor-pointer hover:text-primary transition-colors"
                                onClick={() => onProfileClick(String(announcement.senderId._id))}
                                title="Click to view profile"
                            >
                                {announcement.senderId.firstName} {announcement.senderId.lastName}
                            </h3>
                            <p className="text-xs sm:text-sm text-base-content/60 font-medium">
                                {announcement.senderId.role.charAt(0).toUpperCase() + announcement.senderId.role.slice(1).toLowerCase()}
                                <span className="hidden xs:inline"> • {formatDistanceToNow(announcement.addedDate, { addSuffix: true })}</span>
                            </p>
                            {/* Show time on mobile in a separate line */}
                            <p className="text-xs text-base-content/50 xs:hidden">
                                {formatDistanceToNow(announcement.addedDate, { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Category Badges */}
                <div className="flex flex-wrap gap-1 sm:gap-2">
                    <div className={`badge ${categoryColors[announcement.messageType] || 'bg-neutral-100 text-neutral-800 border-neutral-200'} badge-sm sm:badge-md font-medium text-xs sm:text-sm`}>
                        {announcement.messageType.charAt(0).toUpperCase() + announcement.messageType.slice(1).toLowerCase()}
                    </div>
                </div>

                {/* Title */}
                {/* <h2 className="text-base sm:text-lg lg:text-xl font-bold text-base-content leading-snug">
                    {announcement.content}
                </h2> */}

                {/* Content */}
                <div className="text-base-content/80 leading-relaxed text-lg sm:text-base lg:text-lg">
                    {showFullContent ? (
                        <>
                            <p className="whitespace-pre-wrap">{announcement.content}</p>
                            <button
                                onClick={() => setShowFullContent(false)}
                                className="text-primary hover:text-primary-focus transition-colors text-xs sm:text-sm mt-2 font-medium"
                            >
                                Show less
                            </button>
                        </>
                    ) : (
                        <>
                            <p>{contentPreview}{shouldShowReadMore && '...'}</p>
                            {shouldShowReadMore && (
                                <button
                                    onClick={() => setShowFullContent(true)}
                                    className="text-primary hover:text-primary-focus transition-colors text-xs sm:text-sm mt-2 font-medium"
                                >
                                    Read more
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 