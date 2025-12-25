'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, X, Calendar, User, FileText, Clock, Plus, Eye, Trash, Trash2 } from 'lucide-react';
import ModalPopup from '../components/ui/modalPopup';
import { Button } from '../components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

export default function ViewLeavePage() {
    const router = useRouter();
    const pathname = usePathname();

    const [leaveApplications, setLeaveApplications] = useState<{
        _id: string,
        staffId: { firstName: string; lastName: string },
        reason: string,
        leaveFromDate: string,
        leaveToDate: string,
        status: string
    }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [approvers, setApprovers] = useState<{ _id: string; firstName: string; lastName: string }[]>([]);
    const [selectedApproverId, setSelectedApproverId] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAction, setCurrentAction] = useState<'approve' | 'cancel' | 'delete' | null>(null);
    const [currentApplicationId, setCurrentApplicationId] = useState<string | null>(null);
    const [currentApproverName, setCurrentApproverName] = useState('');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Check if we're on mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        // Get token from cookies or localStorage
        const getTokenFromCookie = () => {
            const cookies = document.cookie.split(';');
            const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='));
            return tokenCookie ? tokenCookie.split('=')[1] : '';
        };

        const token = getTokenFromCookie() || localStorage.getItem('auth-token');

        if (token) {
            try {
                // Decode JWT token (payload is the second part)
                const payload = token.split('.')[1];
                const decodedData = JSON.parse(atob(payload));

                // Set the user ID from token
                if (decodedData.id) {
                    setSelectedApproverId(decodedData.id);
                }

                // Also get the user role for conditional display logic
                if (decodedData.role) {
                    setUserRole(decodedData.role);
                }
            } catch (error) {
                console.error('Error decoding token:', error);
                toast.error('Failed to authenticate. Please login again.');
            }
        }

        // Fetch approvers for displaying name
        const fetchApprovers = async () => {
            try {
                const token = localStorage.getItem('token');

                if (!token) {
                  return;
                }
                const response = await fetch('/api/manage-staff?role=ADMIN');
                if (!response.ok) {
                    throw new Error('Failed to fetch approvers');
                }
                const data = await response.json();
                setApprovers(data);
            } catch (error) {
                console.error('Error fetching approvers:', error);
                toast.error('Failed to load approvers');
            }
        };

        fetchApprovers();
    }, []);

    // Update current approver name when approvers list or selectedApproverId changes
    useEffect(() => {
        if (approvers.length && selectedApproverId) {
            const currentApprover = approvers.find((approver: any) => approver._id === selectedApproverId);
            if (currentApprover) {
                setCurrentApproverName(`${currentApprover.firstName} ${currentApprover.lastName}`);
            }
        }
    }, [approvers, selectedApproverId]);

    useEffect(() => {
        if (!selectedApproverId || !userRole) return;

        const fetchLeaveApplications = async () => {
            try {
                setIsLoading(true);
                let url;

                // If user is STAFF, fetch their leave applications
                // If user is ADMIN, fetch leave applications they need to approve
                if (userRole === 'STAFF') {
                    url = `/api/leave?staffId=${selectedApproverId}`;
                } else {
                    url = `/api/leave?approverId=${selectedApproverId}`;
                }

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error('Failed to fetch leave applications');
                }

                const data = await response.json();
                setLeaveApplications(data);
            } catch (error) {
                console.error('Error fetching leave applications:', error);
                toast.error('Failed to fetch leave applications');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaveApplications();
    }, [selectedApproverId, userRole]);

    const handleApprove = async (id: string) => {
        try {
            const response = await fetch(`/api/leave?id=${id}&status=Approved`, {
                method: 'PUT',
            });

            if (!response.ok) {
                throw new Error('Failed to approve leave');
            }
            toast.success('Leave approved successfully');
            setLeaveApplications(prev => prev.map(application =>
                application._id === id ? { ...application, status: 'Approved' } : application
            ));
        } catch (error) {
            toast.error('Failed to approve leave');
        }
    };

    const handleCancel = async (id: string) => {
        try {
            const response = await fetch(`/api/leave?id=${id}&status=Cancelled`, {
                method: 'PUT',
            });

            if (!response.ok) {
                throw new Error('Failed to cancel leave');
            }
            toast.success('Leave cancelled successfully');
            setLeaveApplications(prev => prev.map(application =>
                application._id === id ? { ...application, status: 'Cancelled' } : application
            ));
        } catch (error) {
            toast.error('Failed to cancel leave');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/leave?id=${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete leave');
            }
            toast.success('Leave deleted successfully');
            setLeaveApplications(prev => prev.filter(application => application._id !== id));
        } catch (error) {
            toast.error('Failed to delete leave');
        }
    };

    const openModal = (action: 'approve' | 'cancel' | 'delete', id: string) => {
        setCurrentAction(action);
        setCurrentApplicationId(id);
        setIsModalOpen(true);
    };

    const handleConfirm = async () => {
        if (!currentApplicationId || !currentAction) return;

        if (currentAction === 'approve') {
            await handleApprove(currentApplicationId);
        } else if (currentAction === 'cancel') {
            await handleCancel(currentApplicationId);
        } else if (currentAction === 'delete') {
            await handleDelete(currentApplicationId);
        }

        setIsModalOpen(false);
    };

    // Helper function to check if delete button should be shown
    const canDeleteLeave = (application: any) => {
        // Only show for STAFF users (not ADMIN)
        if (userRole !== 'STAFF') return false;

        // Only show if current user owns this leave application
        if (application.staffId._id !== selectedApproverId) return false;

        // Only show if leave is not approved
        if (application.status === 'Pending') {
            const startDate = new Date(application.leaveFromDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day for comparison
            return startDate >= today;
        }
        else return false;

        // Only show if start date has not passed
        const startDate = new Date(application.leaveFromDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for comparison

        return startDate >= today;
    };

    // Mobile Card Component
    const LeaveCard = ({ application }: { application: any }) => (
        <div className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-300/50 hover:border-base-300 rounded-lg overflow-hidden">
            <div className="card-body p-4">
                {/* Header with name and actions */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                        <div className="avatar placeholder">
                            <div className="bg-gradient-to-br from-primary to-primary-focus text-primary-content rounded-full w-10 h-10 shadow-sm">
                                <span className="text-sm font-semibold">
                                    {application.staffId.firstName.charAt(0)}{application.staffId.lastName.charAt(0)}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-base-content text-sm sm:text-base leading-tight mb-1">
                                {application.staffId.firstName} {application.staffId.lastName}
                            </h3>
                            <span className={`badge badge-sm font-bold px-2 py-1 text-xs transition-all duration-300 ${application.status === 'Approved' ? 'bg-success/10 text-success border-success/50' :
                                application.status === 'Cancelled' ? 'bg-error/10 text-base-content/70 border-error/50' :
                                    'bg-warning/10 text-base-content/70 border-warning/50'
                                }`}>
                                {application.status}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {userRole === 'ADMIN' && application.status === 'Pending' && (
                            <div className="flex gap-1">
                                <Button
                                    outline
                                    variant="success"
                                    className="btn btn-xs hover:bg-success/10 transition-colors rounded-md"
                                    onClick={() => openModal('approve', application._id)}
                                >
                                    <Check className="w-3 h-3" />
                                </Button>
                                <Button
                                    outline
                                    variant="error"
                                    className="btn btn-xs hover:bg-error/10 transition-colors rounded-md"
                                    onClick={() => openModal('cancel', application._id)}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                        {canDeleteLeave(application) && (
                            <button
                                className="btn btn-xs btn-ghost hover:bg-error/20 transition-colors rounded-lg px-2"
                                onClick={() => openModal('delete', application._id)}
                                title="Delete Leave"
                            >
                                <Trash2 className="w-3 h-3 text-error" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Leave details */}
                <div className="space-y-2.5">
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <Calendar className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80 font-medium">
                            {new Date(application.leaveFromDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short', 
                                year: 'numeric'
                            })} - {new Date(application.leaveToDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </span>
                    </div>
                    <div className="flex items-start space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
                            <FileText className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80 leading-relaxed">
                            {application.reason}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col w-full min-h-[calc(100vh-64px)] p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100 overflow-hidden">
            {/* Mobile and Tablet: Centered container with max-width */}
            <div className="block xl:hidden h-full">
                <div className="card bg-base-300 border border-base-content/20 shadow-xl h-full w-full max-w-6xl mx-auto flex flex-col">
                    <div className="card-body p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 flex-shrink-0">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content mb-6">
                                    {userRole === 'ADMIN' ? 'Leave Applications' : 'My Leave Requests'}
                                </h1>
                                {userRole === 'ADMIN' && (
                                    <div className="flex items-center">
                                        <span className="text-sm text-base-content/70">Approver:</span>
                                        <span className="ml-2 font-semibold text-primary text-sm">
                                            {currentApproverName || 'Loading...'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Navigation Tabs - Hidden for students */}
                            {userRole !== 'STUDENT' && (
                                <div className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-4 sm:mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
                                    {/* Sliding Background Indicator */}
                                    <div
                                        className={`absolute top-1 bottom-1 rounded-lg bg-base-100 shadow-sm transition-all duration-300 ease-in-out ${pathname === '/manage-leave/add'
                                            ? 'left-1 right-1/2 mr-1.5'
                                            : 'left-1/2 right-1 ml-1.5'
                                            }`}
                                    />

                                    <button
                                        onClick={() => router.push('/manage-leave/add')}
                                        className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/manage-leave/add'
                                            ? 'text-emerald-600'
                                            : 'text-base-content/80 hover:text-base-content'
                                            }`}
                                    >
                                        <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-medium truncate">Apply Leave</span>
                                    </button>
                                    <button
                                        onClick={() => router.push('/manage-leave')}
                                        className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/manage-leave'
                                            ? 'text-rose-700'
                                            : 'text-base-content/80 hover:text-base-content'
                                            }`}
                                    >
                                        <Eye className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-medium truncate">View Leave</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                    <p className="text-base-content text-sm sm:text-base">Loading leave applications...</p>
                                </div>
                            ) : leaveApplications.length > 0 ? (
                                <>
                                    {/* Mobile Card Layout */}
                                    <div className="block md:hidden h-full">
                                        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                            <div className="space-y-3 sm:space-y-4 pb-4">
                                                {leaveApplications.map((application) => (
                                                    <LeaveCard key={application._id} application={application} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tablet Table Layout */}
                                    <div className="hidden md:block h-full overflow-hidden">
                                        <div className="border border-base-300 rounded-lg bg-base-100 h-full flex flex-col">
                                            <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                                <table className="table w-full">
                                                    <thead className="bg-base-200 border-b-2 border-base-content/20 sticky top-0 z-0">
                                                        <tr>
                                                            <th className="text-base-content text-sm lg:text-base min-w-[150px] text-center">Staff Name</th>
                                                            <th className="text-base-content text-sm lg:text-base min-w-[200px]">Reason</th>
                                                            <th className="text-base-content text-sm lg:text-base min-w-[120px]">Start Date</th>
                                                            <th className="text-base-content text-sm lg:text-base min-w-[120px]">End Date</th>
                                                            <th className="text-base-content text-sm lg:text-base min-w-[100px] text-center">Status</th>
                                                            {userRole === 'ADMIN' && (
                                                                <th className="text-base-content text-sm lg:text-base min-w-[100px] text-center">Actions</th>
                                                            )}
                                                            {userRole === 'STAFF' && (
                                                                <th className="text-base-content text-sm lg:text-base min-w-[100px] text-center">Actions</th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {leaveApplications.map((application) => (
                                                            <tr key={application._id} className="hover:bg-base-200 transition-colors">
                                                                <td className="text-base-content text-sm lg:text-base font-medium">
                                                                    {application.staffId.firstName} {application.staffId.lastName}
                                                                </td>
                                                                <td className="text-base-content text-sm lg:text-base" title={application.reason}>
                                                                    <div className="truncate max-w-[200px]">
                                                                        {application.reason}
                                                                    </div>
                                                                </td>
                                                                <td className="text-base-content text-sm lg:text-base">
                                                                    {new Date(application.leaveFromDate).toLocaleDateString()}
                                                                </td>
                                                                <td className="text-base-content text-sm lg:text-base">
                                                                    {new Date(application.leaveToDate).toLocaleDateString()}
                                                                </td>
                                                                <td className="text-center text-base-content/70">
                                                                    <span className={`badge badge-sm xs:badge-md sm:badge-lg font-bold px-2 xs:px-3 sm:px-4 py-1 xs:py-1 sm:py-2 text-xs xs:text-xs sm:text-sm md:text-base transition-all duration-300 ${application.status === 'Approved' ? 'bg-success/10 text-success border-success/50 group-hover/card:bg-success/20' :
                                                                        application.status === 'Cancelled' ? 'bg-error/10 text-base-content/70 border-error/50 group-hover/card:bg-error/20' :
                                                                            'bg-warning/10 text-base-content/70 border-warning/50 group-hover/card:bg-warning/20'
                                                                        }`}>                                                                        {application.status}
                                                                    </span>
                                                                </td>
                                                                {userRole === 'ADMIN' && (
                                                                    <td className="text-center">
                                                                        {application.status === 'Pending' && (
                                                                            <div className="flex gap-1 justify-center">
                                                                                <Button
                                                                                    outline
                                                                                    variant="success"
                                                                                    className="btn btn-md hover:bg-success/10"
                                                                                    onClick={() => openModal('approve', application._id)}
                                                                                    title="Approve Leave"
                                                                                >
                                                                                    <Check className="w-4 h-4" />
                                                                                </Button>
                                                                                <Button
                                                                                    outline
                                                                                    variant="error"
                                                                                    className="btn btn-md hover:bg-error/10"
                                                                                    onClick={() => openModal('cancel', application._id)}
                                                                                    title="Cancel Leave"
                                                                                >
                                                                                    <X className="w-4 h-4" />
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                )}
                                                                {userRole === 'STAFF' && (
                                                                    <td className="text-center">
                                                                        {canDeleteLeave(application) && (
                                                                            <button
                                                                                className="btn btn-xs btn-ghost hover:bg-error/20 transition-colors rounded-lg px-2"
                                                                                title="Delete Leave"
                                                                                onClick={() => openModal('delete', application._id)}
                                                                            >
                                                                                <Trash2 className="w-4 h-4 text-error" />
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="text-4xl sm:text-6xl mb-4">📋</div>
                                    <h3 className="text-base sm:text-lg font-semibold text-base-content mb-2">No leave applications found</h3>
                                    <p className="text-sm sm:text-base text-base-content/60 text-center max-w-md">
                                        {userRole === 'ADMIN' ? 'No leave applications to review at this time.' : 'You have no leave requests submitted.'}
                                    </p>
                                </div>
                            )}
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
                            <div className="flex justify-between items-center">
                                <h1 className="text-2xl xl:text-3xl font-bold text-base-content mb-6">
                                    {userRole === 'ADMIN' ? 'Leave Applications' : 'My Leave Requests'}
                                </h1>
                                {userRole === 'ADMIN' && (
                                    <div className="flex items-center">
                                        <span className="text-base text-base-content/70">Approver:</span>
                                        <span className="ml-3 font-semibold text-primary text-lg">
                                            {currentApproverName || 'Loading...'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Navigation Tabs - Hidden for students */}
                            {userRole !== 'STUDENT' && (
                                <div className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
                                    {/* Sliding Background Indicator */}
                                    <div
                                        className={`absolute top-1 bottom-1 rounded-lg bg-base-100 shadow-sm transition-all duration-300 ease-in-out ${pathname === '/manage-leave/add'
                                            ? 'left-1 right-1/2 mr-1.5'
                                            : 'left-1/2 right-1 ml-1.5'
                                            }`}
                                    />

                                    <button
                                        onClick={() => router.push('/manage-leave/add')}
                                        className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/manage-leave/add'
                                            ? 'text-emerald-600'
                                            : 'text-base-content/80 hover:text-base-content'
                                            }`}
                                    >
                                        <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-medium truncate">Apply Leave</span>
                                    </button>
                                    <button
                                        onClick={() => router.push('/manage-leave')}
                                        className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/manage-leave'
                                            ? 'text-rose-700'
                                            : 'text-base-content/80 hover:text-base-content'
                                            }`}
                                    >
                                        <Eye className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-medium truncate">View Leave</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-6 pb-6 overflow-hidden">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                <p className="text-base-content text-lg">Loading leave applications...</p>
                            </div>
                        ) : leaveApplications.length > 0 ? (
                            <div className="border border-base-300 rounded-lg bg-base-100 h-full flex flex-col overflow-hidden">
                                <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                    <table className="table w-full">
                                        <thead className="bg-base-200 border-b-2 border-base-content/20 sticky top-0 z-0">
                                            <tr>
                                                <th className="text-base-content font-semibold text-sm lg:text-base py-4 min-w-[200px]">Staff Name</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base py-4 min-w-[300px]">Reason</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base py-4 min-w-[140px]">From Date</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base py-4 min-w-[140px]">To Date</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base py-4 min-w-[120px] text-center">Status</th>
                                                {userRole === 'ADMIN' && (
                                                    <th className="text-base-content font-semibold text-sm lg:text-base py-4 min-w-[120px] text-center">Actions</th>
                                                )}
                                                {userRole === 'STAFF' && (
                                                    <th className="text-base-content font-semibold text-sm lg:text-base py-4 min-w-[120px] text-center">Actions</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaveApplications.map((application) => (
                                                <tr key={application._id} className="hover:bg-base-200 transition-colors">
                                                    <td className="text-base-content font-medium py-4">
                                                        {application.staffId.firstName} {application.staffId.lastName}
                                                    </td>
                                                    <td className="text-base-content py-4" title={application.reason}>
                                                        <div className="truncate max-w-[300px]">
                                                            {application.reason}
                                                        </div>
                                                    </td>
                                                    <td className="text-base-content py-4">
                                                        {new Date(application.leaveFromDate).toLocaleDateString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </td>
                                                    <td className="text-base-content py-4">
                                                        {new Date(application.leaveToDate).toLocaleDateString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </td>
                                                    <td className="py-4 text-center">
                                                        <span className={`badge badge-sm xs:badge-md sm:badge-lg font-bold px-2 xs:px-3 sm:px-4 py-1 xs:py-1 sm:py-2 text-xs xs:text-xs sm:text-sm md:text-base transition-all duration-300 ${application.status === 'Approved' ? 'bg-success/10 text-success border-success/50 group-hover/card:bg-success/20' :
                                                            application.status === 'Cancelled' ? 'bg-error/10 text-base-content/70 border-error/50 group-hover/card:bg-error/20' :
                                                                'bg-warning/10 text-base-content/70 border-warning/50 group-hover/card:bg-warning/20'
                                                            }`}>
                                                            {application.status}
                                                        </span>
                                                    </td>
                                                    {userRole === 'ADMIN' && (
                                                        <td className="py-4 text-center">
                                                            {application.status === 'Pending' && (
                                                                <div className="flex gap-2 justify-center">
                                                                    <Button
                                                                        outline
                                                                        variant="success"
                                                                        className="btn btn-sm hover:bg-success/10"
                                                                        onClick={() => openModal('approve', application._id)}
                                                                        title="Approve Leave"
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        outline
                                                                        variant="error"
                                                                        className="btn btn-sm hover:bg-error/10"
                                                                        onClick={() => openModal('cancel', application._id)}
                                                                        title="Cancel Leave"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    )}
                                                    {userRole === 'STAFF' && (
                                                        <td className="py-4 text-center">
                                                            {canDeleteLeave(application) && (
                                                                <button
                                                                    className="btn btn-xs btn-ghost hover:bg-error/20 transition-colors rounded-lg px-2"
                                                                    onClick={() => openModal('delete', application._id)}
                                                                    title="Delete Leave"
                                                                >
                                                                    <Trash2 className="w-4 h-4 text-error" />
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="text-6xl mb-6">📋</div>
                                <h3 className="text-xl font-semibold text-base-content mb-3">No leave applications found</h3>
                                <p className="text-base text-base-content/60 text-center max-w-lg">
                                    {userRole === 'ADMIN' ? 'No leave applications to review at this time. Applications will appear here when staff submit leave requests.' : 'You have no leave requests submitted. Contact your administrator to submit a leave request.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ModalPopup
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirm}
                confirmButtonColor={currentAction === 'delete' || currentAction === 'cancel' ? 'bg-red-600' : 'bg-success'}
                confirmButtonText={currentAction === 'delete' ? 'Yes, Delete' : currentAction ? currentAction.charAt(0).toUpperCase() + currentAction.slice(1) : ''}
                message={`Are you sure you want to ${currentAction === 'delete' ? 'delete' : currentAction || ''} this leave application?`}
            />
        </div>
    );
}