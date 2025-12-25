'use client';

import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, Loader2, User, Mail, MapPin, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import { formatDate } from '@/utils/dateUtils';
import ModalPopup from '../components/ui/modalPopup';
import ProfileModal from '../components/ui/ProfileModal';
import toast from 'react-hot-toast';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

interface StaffMember {
    _id: number;
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    lastLogin: string;
    dateJoined: string;
}

export default function ManageStaffPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [staffMembers, setStaff] = useState<StaffMember[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedProfileStaffId, setSelectedProfileStaffId] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const staffRole = "STAFF";
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);

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
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (!token) return;
            const payload = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));
            const userRole = decodedPayload.role;
            setUserRole(userRole);
        }

        const fetchStaff = async () => {
            try {
                const response = await fetch(`/api/manage-staff?role=${staffRole}`);
                if (!response.ok) throw new Error('Failed to fetch staff');
                const data = await response.json();
                setStaff(data);
            } catch (error) {
                console.error('Error fetching staff:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStaff();
    }, []);

    const filteredStaff = staffMembers.filter(staff =>
        Object.values(staff).some(value =>
            value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const handleDeleteClick = (staffId: number) => {
        setSelectedStaffId(staffId);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedStaffId) return;

        try {
            const response = await fetch(`/api/manage-staff?id=${selectedStaffId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete staff');

            // Remove deleted staff from state
            setStaff(prevStaff => prevStaff.filter(staff => staff._id !== selectedStaffId));
            toast.success('Staff deleted successfully');
        } catch (error) {
            toast.error('Error deleting staff');
        }

        // Close modal after deleting
        setIsDeleteModalOpen(false);
        setSelectedStaffId(null);
    };

    // Handle profile modal
    const handleProfileClick = (staffId: number) => {
        setSelectedProfileStaffId(staffId.toString());
        setIsProfileModalOpen(true);
    };

    const handleProfileModalClose = () => {
        setIsProfileModalOpen(false);
        setSelectedProfileStaffId(null);
    };

    // Mobile Card Component
    const StaffCard = ({ staff }: { staff: StaffMember }) => (
        <div className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-300/50 hover:border-base-300 rounded-lg overflow-hidden">
            <div className="card-body p-4">
                {/* Header with name and actions */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="avatar placeholder">
                            <div className="bg-gradient-to-br from-primary to-primary-focus text-primary-content rounded-full w-10 h-10 shadow-sm">
                                <span className="text-sm font-semibold">
                                    {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                                </span>
                            </div>
                        </div>
                        <div>
                            <h3 
                                className="font-semibold text-base-content text-sm sm:text-base leading-tight cursor-pointer hover:text-primary transition-colors"
                                onClick={() => handleProfileClick(staff._id)}
                                title="Click to view profile"
                            >
                                {staff.firstName} {staff.lastName}
                            </h3>
                        </div>
                    </div>
                    {userRole === 'ADMIN' && (
                        <div className="flex gap-1">
                            <Link href={`/manage-staff/add?id=${staff._id}`}>
                                <button className="btn btn-ghost btn-xs sm:btn-sm hover:bg-info/10 transition-colors rounded-md">
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4 text-info" />
                                </button>
                            </Link>
                            <button
                                className="btn btn-ghost btn-xs sm:btn-sm hover:bg-error/10 transition-colors rounded-md"
                                onClick={() => handleDeleteClick(staff._id)}
                            >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-error" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Staff details */}
                <div className="space-y-2.5">
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <Mail className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80 truncate font-medium">
                            {staff.email}
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <MapPin className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80 truncate">
                            {staff.address}
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80">
                            Last login: <span className="font-medium">{staff?.lastLogin || 'N/A'}</span>
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <Calendar className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80">
                            Joined: <span className="font-medium">{formatDate(staff.dateJoined)}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col w-full h-[calc(100vh-64px)] p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100 overflow-hidden transition-all duration-100 ${isDeleteModalOpen ? 'blur-sm' : ''}`}>
            {/* Mobile and Tablet: Centered container with max-width */}
            <div className="block xl:hidden h-full">
                <div className="card bg-base-300 border border-base-content/20 shadow-xl h-full w-full max-w-6xl mx-auto flex flex-col">
                    <div className="card-body p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 flex-shrink-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content">
                                    Manage Staff
                                </h1>
                                <div className="text-sm sm:text-base text-base-content/70 font-medium mt-1 sm:mt-0">
                                    {searchTerm ? (
                                        <span>
                                            Showing {filteredStaff.length} of {staffMembers.length} staff members
                                        </span>
                                    ) : (
                                        <span>
                                            Total: {staffMembers.length} staff member{staffMembers.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Search and Add Button */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
                                <div className="relative w-full max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
                                    <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-base-content w-4 h-4 sm:w-5 sm:h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search staff members..."
                                        className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-sm sm:text-base bg-base-100/80 backdrop-blur-sm border border-base-content/20 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 placeholder:text-base-content/40 text-base-content/70"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                {userRole === 'ADMIN' && (
                                    <Link href="/manage-staff/add">
                                        <Button variant="primary" outline className="w-full sm:w-auto">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Staff
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4" />
                                    <p className="text-base-content text-sm sm:text-base">Loading staff...</p>
                                </div>
                            ) : filteredStaff.length > 0 ? (
                                <>
                                    {/* Mobile Card Layout */}
                                    <div className="block md:hidden h-full">
                                        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                            <div className="space-y-3 sm:space-y-4 pb-4">
                                                {filteredStaff.map((staff) => (
                                                    <StaffCard key={staff._id} staff={staff} />
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
                                                            <th className="text-base-content font-semibold text-sm lg:text-base min-w-[100px]">First Name</th>
                                                            <th className="text-base-content font-semibold text-sm lg:text-base min-w-[100px]">Last Name</th>
                                                            <th className="text-base-content font-semibold text-sm lg:text-base min-w-[180px]">Email</th>
                                                            <th className="text-base-content font-semibold text-sm lg:text-base min-w-[200px]">Address</th>
                                                            <th className="text-base-content font-semibold text-sm lg:text-base min-w-[120px]">Date Joined</th>
                                                            {userRole === 'ADMIN' && (
                                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[80px] text-center">Actions</th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredStaff.map((staff) => (
                                                            <tr key={staff._id} className="hover:bg-base-200 transition-colors">
                                                                <td className="text-base-content text-sm lg:text-base font-medium">{staff.firstName}</td>
                                                                <td className="text-base-content text-sm lg:text-base font-medium">{staff.lastName}</td>
                                                                <td className="text-base-content text-sm lg:text-base" title={staff.email}>
                                                                    <div className="truncate max-w-[180px]">{staff.email}</div>
                                                                </td>
                                                                <td className="text-base-content text-sm lg:text-base" title={staff.address}>
                                                                    <div className="truncate max-w-[200px]">{staff.address}</div>
                                                                </td>
                                                                <td className="text-base-content text-sm lg:text-base">{formatDate(staff.dateJoined)}</td>
                                                                {userRole === 'ADMIN' && (
                                                                    <td>
                                                                        <div className="flex gap-1 justify-center">
                                                                            <Link href={`/manage-staff/add?id=${staff._id}`}>
                                                                                <Button className="btn btn-ghost btn-sm hover:bg-info/10" title="Edit Staff">
                                                                                    <Edit className="w-4 h-4 text-info" />
                                                                                </Button>
                                                                            </Link>
                                                                            <Button
                                                                                className="btn btn-ghost btn-sm hover:bg-error/10"
                                                                                onClick={() => handleDeleteClick(staff._id)}
                                                                                title="Delete Staff"
                                                                            >
                                                                                <Trash2 className="w-4 h-4 text-error" />
                                                                            </Button>
                                                                        </div>
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
                                    <div className="text-4xl sm:text-6xl mb-4">👥</div>
                                    <h3 className="text-base sm:text-lg font-semibold text-base-content mb-2">No staff members found</h3>
                                    <p className="text-sm sm:text-base text-base-content/60 text-center max-w-md">
                                        {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first staff member'}
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
                            <div className="flex items-center justify-between mb-6">
                                <h1 className="text-2xl xl:text-3xl font-bold text-base-content">
                                    Manage Staff
                                </h1>
                                <div className="text-base text-base-content/70 font-medium">
                                    {searchTerm ? (
                                        <span>
                                            Showing {filteredStaff.length} of {staffMembers.length} staff members
                                        </span>
                                    ) : (
                                        <span>
                                            Total: {staffMembers.length} staff member{staffMembers.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Search and Add Button */}
                            <div className="flex gap-6 justify-between items-center">
                                <div className="relative flex-1 max-w-lg">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search staff members..."
                                        className="input input-bordered w-full pl-10 bg-base-100 text-base-content"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {userRole === 'ADMIN' && (
                                    <Link href="/manage-staff/add">
                                        <Button variant="primary" outline className="px-6">
                                            <Plus className="w-5 h-5 mr-2" />
                                            Add Staff Member
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-6 pb-6 overflow-hidden">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                <p className="text-base-content text-lg">Loading staff members...</p>
                            </div>
                        ) : filteredStaff.length > 0 ? (
                            <div className="border border-base-300 rounded-lg bg-base-100 h-full flex flex-col overflow-hidden">
                                <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                    <table className="table w-full">
                                        <thead className="bg-base-200 border-b-2 border-base-content/20 sticky top-0 z-0">
                                            <tr>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[120px]">First Name</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[120px]">Last Name</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[180px]">Email Address</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[200px]">Address</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[120px]">Date Joined</th>
                                                {userRole === 'ADMIN' && (
                                                    <th className="text-base-content font-semibold text-sm lg:text-base min-w-[80px] text-center">Actions</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStaff.map((staff) => (
                                                <tr key={staff._id} className="hover:bg-base-200 transition-colors">
                                                    <td className="text-base-content font-medium py-4">
                                                        <button 
                                                            onClick={() => handleProfileClick(staff._id)}
                                                            className="hover:text-primary cursor-pointer transition-colors"
                                                            title="Click to view profile"
                                                        >
                                                            {staff.firstName}
                                                        </button>
                                                    </td>
                                                    <td className="text-base-content font-medium py-4">
                                                        <button 
                                                            onClick={() => handleProfileClick(staff._id)}
                                                            className="hover:text-primary cursor-pointer transition-colors"
                                                            title="Click to view profile"
                                                        >
                                                            {staff.lastName}
                                                        </button>
                                                    </td>
                                                    <td className="text-base-content py-4" title={staff.email}>
                                                        <button 
                                                            onClick={() => handleProfileClick(staff._id)}
                                                            className="hover:text-primary cursor-pointer transition-colors"
                                                            title="Click to view profile"
                                                        >
                                                            {staff.email}
                                                        </button>
                                                    </td>
                                                    <td className="text-base-content py-4" title={staff.address}>
                                                        <div className="truncate max-w-[280px]">{staff.address}</div>
                                                    </td>
                                                    <td className="text-base-content py-4">{formatDate(staff.dateJoined)}</td>
                                                    {userRole === 'ADMIN' && (
                                                        <td className="py-4">
                                                            <div className="flex gap-2 justify-center">
                                                                <Link href={`/manage-staff/add?id=${staff._id}`}>
                                                                    <Button className="btn btn-ghost btn-sm hover:bg-info/10 px-3" title="Edit Staff Member">
                                                                        <Edit className="w-4 h-4 text-info" />
                                                                    </Button>
                                                                </Link>
                                                                <Button
                                                                    className="btn btn-ghost btn-sm hover:bg-error/10 px-3"
                                                                    onClick={() => handleDeleteClick(staff._id)}
                                                                    title="Delete Staff Member"
                                                                >
                                                                    <Trash2 className="w-4 h-4 text-error" />
                                                                </Button>
                                                            </div>
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
                                <div className="text-6xl mb-6">👥</div>
                                <h3 className="text-xl font-semibold text-base-content mb-3">No staff members found</h3>
                                <p className="text-base text-base-content/60 text-center max-w-lg">
                                    {searchTerm ? 'Try adjusting your search terms to find the staff member you\'re looking for' : 'Get started by adding your first staff member to the system'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ModalPopup
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                message="This will permanently delete this staff member."
            />

            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={handleProfileModalClose}
                userId={selectedProfileStaffId || ''}
                showClassInfo={false}
                isStudentModal={false}
                userRole={userRole || undefined}
            />
        </div>
    );
}