'use client'

import React, { useState, useCallback } from 'react';
import AnnouncementList from '@/app/components/announcements/AnnouncementList';
import CreateAnnouncementForm from '@/app/components/announcements/CreateAnnouncementForm';

export default function AnnouncementsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAnnouncementCreated = useCallback(() => {
    // Trigger a refresh of the announcement list
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-64px)] p-3 sm:p-4 lg:p-6 bg-base-100">
      <div className="card bg-base-300 border border-base-content/20 shadow-xl h-fit w-full max-w-6xl mx-auto">
        <div className="card-body p-4 sm:p-5 lg:p-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h2 className="card-title text-lg sm:text-xl lg:text-2xl text-base-content">
              Announcements
            </h2>
          </div>

          {/* Content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Create Announcement Form */}
            <CreateAnnouncementForm onAnnouncementCreated={handleAnnouncementCreated} />

            {/* Divider */}
            <div className="divider text-base-content/50 text-xs sm:text-sm">Recent Announcements</div>

            {/* Announcement List */}
            <AnnouncementList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </div>
  );
} 