'use client';

import React, { useEffect, useState } from 'react';
import { StudentMemberDTO } from '../../api/dto/StudentMember';
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, Eye } from 'lucide-react';

export default function AddLeavePage() {
    const router = useRouter();
    const pathname = usePathname();

    const [leaveFromDate, setLeaveFromDate] = useState('');
    const [leaveToDate, setLeaveToDate] = useState('');
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [leaveReason, setLeaveReason] = useState('');
    const [adminList, setAdminList] = useState<StudentMemberDTO[]>([]);
    const [isLoadingAdminList, setIsLoadingAdminList] = useState(false);
    const [selectedApproverId, setSelectedApproverId] = useState('');
    const [userRole, setUserRole] = useState<string | null>(null);

    // Add this function to get user ID from token
    const getUserIdFromToken = () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;
            const payload = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));
            return decodedPayload.id;
        } catch (error) {
            return null;
        }
    };

    // Update the useEffect to fetch admin users and set user role
    useEffect(() => {
        // Get user role from token
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const payload = token.split('.')[1];
                    const decodedPayload = JSON.parse(atob(payload));
                    setUserRole(decodedPayload.role);
                } catch (error) {
                    toast.error('Error decoding token');
                }
            }
        }

        const fetchAdminList = async () => {
            try {
                const token = localStorage.getItem('token');

                if (!token) {
                  return;
                }
                setIsLoadingAdminList(true);
                const response = await fetch('/api/manage-staff?role=ADMIN');
                if (!response.ok) {
                    throw new Error('Failed to fetch admin list');
                }
                const data = await response.json();
                setAdminList(data);
                
                // Get user ID from token and set as selected staff if not already set
                const userId = getUserIdFromToken();
                if (userId && !selectedStaffId) {
                    setSelectedStaffId(userId);
                }
            } catch (error) {
                toast.error('Failed to load admin list');
            } finally {
                setIsLoadingAdminList(false);
            }
        };

        fetchAdminList();
    }, [selectedStaffId]);

    // Handle leave application submission
    const submitLeaveApplication = async () => {
        // Validate inputs
        if (!leaveFromDate || !leaveToDate) {
            toast.error('Please select both start and end dates');
            return;
        }

        if (new Date(leaveFromDate) > new Date(leaveToDate)) {
            toast.error('End date cannot be before start date');
            return;
        }

        if (!selectedStaffId) {
            toast.error('Please select a staff member');
            return;
        }

        if (!leaveReason.trim()) {
            toast.error('Please provide a reason for leave');
            return;
        }

        if (!selectedApproverId) {
            toast.error('Please select an approver');
            return;
        }

        try {
            const payload = {
                staffId: selectedStaffId,
                leaveFromDate: leaveFromDate,
                leaveToDate: leaveToDate,
                reason: leaveReason,
                approverId: selectedApproverId
            };

            const response = await fetch('/api/leave', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                toast.success('Leave application submitted successfully');
                // Reset form
                setLeaveFromDate('');
                setLeaveToDate('');
                setSelectedStaffId('');
                setLeaveReason('');
                setSelectedApproverId('');
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error('Failed to submit leave application: ' + (errorData.message || 'Unknown error'));
            }
        } catch (error) {
            toast.error('Error submitting leave application');
        }
    };

    return (
        <div className="flex flex-col w-full min-h-[calc(100vh-64px)] p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100 overflow-hidden">
            {/* Mobile and Tablet: Centered container with max-width */}
            <div className="block xl:hidden h-full">
                <div className="card bg-base-300 border border-base-content/20 shadow-xl h-full w-full max-w-6xl mx-auto flex flex-col">
                    <div className="card-body p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 flex-shrink-0">
                            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content mb-4">
                                Apply for Leave
                            </h1>

                            {/* Navigation Tabs - Hidden for students */}
                            {userRole !== 'STUDENT' && (
                                <div className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-4 sm:mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
                                    {/* Sliding Background Indicator */}
                                    <div 
                                        className={`absolute top-1 bottom-1 rounded-lg bg-base-100 shadow-sm transition-all duration-300 ease-in-out ${
                                            pathname === '/manage-leave/add' 
                                                ? 'left-1 right-1/2 mr-1.5' 
                                                : 'left-1/2 right-1 ml-1.5'
                                        }`}
                                    />
                                    
                                    <button
                                        onClick={() => router.push('/manage-leave/add')}
                                        className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${
                                            pathname === '/manage-leave/add' 
                                                ? 'text-emerald-600' 
                                                : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                    >
                                        <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-medium truncate">Apply Leave</span>
                                    </button>
                                    <button
                                        onClick={() => router.push('/manage-leave')}
                                        className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${
                                            pathname === '/manage-leave' 
                                                ? 'text-rose-700' 
                                                : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                    >
                                        <Eye className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-medium truncate">View Leave</span>
                                    </button>
                                </div>
                            )}

                            {/* Form Controls */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {/* Leave Date Range Selection */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content">Leave Start Date</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered w-full bg-base-100 text-base-content"
                                value={leaveFromDate}
                                onChange={(e) => setLeaveFromDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content">Leave End Date</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered w-full bg-base-100 text-base-content"
                                value={leaveToDate}
                                onChange={(e) => setLeaveToDate(e.target.value)}
                                min={leaveFromDate || new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        {/* Approver Selection */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content">Approver</span>
                            </label>
                            <div className="relative">
                                <select
                                    className="select select-bordered w-full bg-base-100 text-base-content"
                                    value={selectedApproverId}
                                    onChange={(e) => setSelectedApproverId(e.target.value)}
                                    disabled={isLoadingAdminList}
                                >
                                    <option value="">Select Approver</option>
                                    {adminList.map((admin) => (
                                        <option key={admin._id} value={admin._id} className="text-base-content bg-base-100">
                                            {admin.firstName} {admin.lastName}
                                        </option>
                                    ))}
                                </select>
                                {isLoadingAdminList && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <span className="loading loading-spinner loading-sm text-primary"></span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Reason for Leave - moved to be next to Approver */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content">Reason for Leave</span>
                            </label>
                            <textarea
                                className="textarea textarea-bordered h-24 bg-base-100 text-base-content"
                                placeholder="Please provide a reason for your leave request"
                                value={leaveReason}
                                onChange={(e) => setLeaveReason(e.target.value)}
                            ></textarea>
                        </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end mt-4 sm:mt-6 flex-shrink-0">
                            <Button
                                type="button"
                                variant="primary"
                                outline
                                onClick={submitLeaveApplication}
                                className="w-full sm:w-auto px-6"
                            >
                                Apply Leave
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop and Large Screens: Full width layout */}
            <div className="hidden xl:block h-full">
                <div className="bg-base-300 border border-base-content/20 rounded-lg shadow-xl h-full w-full flex flex-col overflow-hidden">
                    <div className="p-6 flex-shrink-0">
                        {/* Header */}
                        <div className="mb-6">
                            <h1 className="text-2xl xl:text-3xl font-bold text-base-content mb-6">
                                Apply for Leave
                            </h1>

                            {/* Navigation Tabs - Hidden for students */}
                            {userRole !== 'STUDENT' && (
                                <div className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
                                    {/* Sliding Background Indicator */}
                                    <div 
                                        className={`absolute top-1 bottom-1 rounded-lg bg-base-100 shadow-sm transition-all duration-300 ease-in-out ${
                                            pathname === '/manage-leave/add' 
                                                ? 'left-1 right-1/2 mr-1.5' 
                                                : 'left-1/2 right-1 ml-1.5'
                                        }`}
                                    />
                                    
                                    <button
                                        onClick={() => router.push('/manage-leave/add')}
                                        className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${
                                            pathname === '/manage-leave/add' 
                                                ? 'text-emerald-600' 
                                                : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                    >
                                        <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-medium truncate">Apply Leave</span>
                                    </button>
                                    <button
                                        onClick={() => router.push('/manage-leave')}
                                        className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${
                                            pathname === '/manage-leave' 
                                                ? 'text-rose-700' 
                                                : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                    >
                                        <Eye className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-medium truncate">View Leave</span>
                                    </button>
                                </div>
                            )}

                            {/* Form Controls */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Leave Date Range Selection */}
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Leave Start Date <span className="text-error">*</span></span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input input-bordered w-full bg-base-100 text-base-content"
                                        value={leaveFromDate}
                                        onChange={(e) => setLeaveFromDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Leave End Date <span className="text-error">*</span></span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input input-bordered w-full bg-base-100 text-base-content"
                                        value={leaveToDate}
                                        onChange={(e) => setLeaveToDate(e.target.value)}
                                        min={leaveFromDate || new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                {/* Approver Selection */}
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Approver <span className="text-error">*</span></span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="select select-bordered w-full bg-base-100 text-base-content"
                                            value={selectedApproverId}
                                            onChange={(e) => setSelectedApproverId(e.target.value)}
                                            disabled={isLoadingAdminList}
                                        >
                                            <option value="">Select Approver</option>
                                            {adminList.map((admin) => (
                                                <option key={admin._id} value={admin._id} className="text-base-content bg-base-100">
                                                    {admin.firstName} {admin.lastName}
                                                </option>
                                            ))}
                                        </select>
                                        {isLoadingAdminList && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <span className="loading loading-spinner loading-sm text-primary"></span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Reason for Leave */}
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Reason for Leave <span className="text-error">*</span></span>
                                    </label>
                                    <textarea
                                        className="textarea textarea-bordered h-24 bg-base-100 text-base-content resize-none"
                                        placeholder="Please provide a reason for your leave request"
                                        value={leaveReason}
                                        onChange={(e) => setLeaveReason(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end mt-8">
                                <Button
                                    type="button"
                                    variant="primary"
                                    outline
                                    onClick={submitLeaveApplication}
                                    className="px-8"
                                >
                                    Apply Leave
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}