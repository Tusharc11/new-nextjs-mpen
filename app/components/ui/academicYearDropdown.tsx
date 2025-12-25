'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ISession } from '@/app/api/models/session';

interface AcademicYearDropdownProps {
  academicYears: ISession[];
  selectedYearId: ISession | null;
  onYearChange: (yearId: ISession) => void;
  isLoading?: boolean;
}

export default function AcademicYearDropdown({
  academicYears,
  selectedYearId,
  onYearChange,
  isLoading = false
}: AcademicYearDropdownProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Format academic year label helper function
  const formatAcademicYearLabel = (year: ISession | undefined) => {
    if (!year) return 'Select Academic Year';
    const startDate = new Date(year.startDate);
    const endDate = new Date(year.endDate);
    return `${startDate.toLocaleString('default', { month: 'short' })} ${startDate.getFullYear()} - ${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.academic-year-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative academic-year-dropdown">
      <button
        className="btn h-12 px-4 btn-outline border-base-300 bg-base-100 text-base-content flex items-center gap-2"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="loading loading-spinner loading-xs"></span>
            Loading...
          </>
        ) : (
          <>
            {selectedYearId ? 
              formatAcademicYearLabel(academicYears.find(year => year._id === selectedYearId._id)) : 
              "Select Academic Year"}
            <ChevronDown className="h-4 w-4" />
          </>
        )}
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-base-100 shadow-lg rounded-md border border-base-300 z-10">
          <ul className="py-1">
            {academicYears.map(year => (
              <li key={year._id}>
                <button
                  className={`w-full text-left px-4 py-2 hover:bg-base-200 ${selectedYearId?._id === year._id ? 'bg-base-200 text-primary' : 'text-base-content'}`}
                  onClick={() => {
                    onYearChange(year);
                    setIsDropdownOpen(false);
                  }}
                >
                  {formatAcademicYearLabel(year)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 