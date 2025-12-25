'use client';

import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, Loader2, BookOpen, Users, Calendar, Clock, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import { formatDate } from '@/utils/dateUtils';
import ModalPopup from '../components/ui/modalPopup';
import toast from 'react-hot-toast';
import { UserRole } from '@/lib/role';
import AcademicYearDropdown from '../components/ui/academicYearDropdown';
import { ISession } from '../api/models/session';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

interface Subject {
    _id: string;
    subject: string;
    classNumber: string;
    courseId: {
        class: {
            classNumber: string;
        };
        _id: string;
    };
    sectionIds: {
        section: string;
        _id: string;
    }[];
    staffIds: {
        firstName: string;
        lastName: string;
        _id: string;
    }[];
    academicYearId: {
        startDate: string;
        endDate: string;
        _id: string;
    };
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function ManageSubjectPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [academicYears, setAcademicYears] = useState<ISession[]>([]);
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<ISession | null>(null);
    const [isLoadingAcademicYears, setIsLoadingAcademicYears] = useState(true);

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
            const userId = decodedPayload.id;
            setUserRole(userRole);
            setUserId(userId);

            const fetchAcademicYears = async () => {
                try {
                    const token = localStorage.getItem('token');

                    if (!token) {
                      return;
                    }
                    setIsLoadingAcademicYears(true);
                    const response = await fetch('/api/session');
                    if (!response.ok) {
                        throw new Error('Failed to fetch academic years');
                    }
                    const data = await response.json();

                    setAcademicYears(data);

                    if (data.length > 0) {
                        // Sort by startDate in descending order
                        const sortedYears = [...data].sort((a, b) =>
                            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                        );
                        setSelectedAcademicYearId(sortedYears[0]);
                    }
                } catch (error) {
                    toast.error('Failed to load academic years');
                } finally {
                    setIsLoadingAcademicYears(false);
                }
            };
            fetchAcademicYears();
        }
    }, []);

    useEffect(() => {
        if (userId && selectedAcademicYearId) {
            const fetchSubjects = async () => {
                try {
                    setIsLoading(true);
                    
                    // Fetch subjects
                    const subjectsResponse = userRole === UserRole.STUDENT && userId 
                        ? await fetch(`/api/manage-subject?studentId=${userId}&role=${userRole}&academicYearId=${selectedAcademicYearId._id}`) 
                        : await fetch(`/api/manage-subject?academicYearId=${selectedAcademicYearId._id}`);

                    if (!subjectsResponse.ok) throw new Error('Failed to fetch subjects');
                    const subjectsData = await subjectsResponse.json();
                    setSubjects(subjectsData);
                } catch (error) {
                    console.error('Error fetching data:', error);
                    toast.error('Failed to fetch data');
                } finally {
                    setIsLoading(false);
                }
            };

            fetchSubjects();
        }
    }, [userRole, userId, selectedAcademicYearId]);

    const filteredSubjects = subjects.filter(subject => {
        // Apply search filter
        const matchesSearch = subject.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (subject.courseId && subject.courseId.class &&
                subject.courseId.class.classNumber.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
            (subject.sectionIds && subject.sectionIds[0] &&
                subject.sectionIds[0].section.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (subject.staffIds && subject.staffIds[0] &&
                subject.staffIds[0].firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                subject.staffIds[0].lastName.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
    });

    const handleDeleteClick = (subjectId: string) => {
        setSelectedSubjectId(subjectId);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedSubjectId) return;

        try {
            const response = await fetch(`/api/manage-subject?id=${selectedSubjectId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete course');

            // Remove deleted course from state
            setSubjects(prevSubjects => prevSubjects.filter(subject => subject._id !== selectedSubjectId));
            toast.success('Subject deleted successfully');
        } catch (error) {
            toast.error('Error deleting subject');
        }

        // Close modal after deleting
        setIsDeleteModalOpen(false);
        setSelectedSubjectId(null);
    };

    // Handle year change
    const handleYearChange = (yearId: ISession) => {
        setSelectedAcademicYearId(yearId);
    };

    // Mobile Card Component
    const SubjectCard = ({ subject }: { subject: Subject }) => (
        <div className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-300/50 hover:border-base-300 rounded-lg overflow-hidden">
            <div className="card-body p-4">
                {/* Header with name and actions */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="avatar placeholder">
                            <div className="bg-gradient-to-br from-primary to-primary-focus text-primary-content rounded-full w-10 h-10 shadow-sm">
                                <span className="text-sm font-semibold">
                                    {subject.subject.charAt(0)}{subject.subject.charAt(1) || ''}
                                </span>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base-content text-sm sm:text-base leading-tight">
                                {subject.subject}
                            </h3>
                        </div>
                    </div>
                    {userRole !== 'STUDENT' && (
                        <div className="flex gap-1">
                            <Link href={`/manage-subject/add?id=${subject._id}`}>
                                <button className="btn btn-ghost btn-xs sm:btn-sm hover:bg-info/10 transition-colors rounded-md">
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4 text-info" />
                                </button>
                            </Link>
                            <button 
                                className="btn btn-ghost btn-xs sm:btn-sm hover:bg-error/10 transition-colors rounded-md"
                                onClick={() => handleDeleteClick(subject._id)}
                            >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-error" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Subject details */}
                <div className="space-y-2.5">
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <GraduationCap className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80 font-medium">
                            Class {subject.courseId.class.classNumber} - {subject.sectionIds.map(section => section.section).join(', ')}
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <Users className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80 truncate">
                            Staff: {Array.isArray(subject.staffIds)
                                ? subject.staffIds.map((staff: { firstName: string; lastName: string }) =>
                                    `${staff.firstName} ${staff.lastName}`).join(', ')
                                : 'N/A'
                            }
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <Calendar className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80">
                            Created: <span className="font-medium">{formatDate(subject.createdAt)}</span>
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80">
                            Updated: <span className="font-medium">{formatDate(subject?.updatedAt) || 'N/A'}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col w-full h-[calc(100vh-64px)] p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100 overflow-hidden">
            {/* Mobile and Tablet: Centered container with max-width */}
            <div className="block xl:hidden h-full">
                <div className="card bg-base-300 border border-base-content/20 shadow-xl h-full w-full max-w-6xl mx-auto flex flex-col">
                    <div className="card-body p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 flex-shrink-0">
                            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content mb-4">
                                Manage Subjects
                            </h1>
                            
                            {/* Search and Add Button */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60 w-4 h-4 sm:w-5 sm:h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search subjects..."
                                        className="input input-bordered w-full pl-9 sm:pl-10 bg-base-100 text-base-content text-sm sm:text-base"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <AcademicYearDropdown
                                        academicYears={academicYears}
                                        selectedYearId={selectedAcademicYearId}
                                        onYearChange={handleYearChange}
                                        isLoading={isLoadingAcademicYears}
                                    />
                                    {userRole !== 'STUDENT' && (
                                        <Link href="/manage-subject/add">
                                            <Button variant="primary" outline className="w-full sm:w-auto">
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Subject
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            {!isLoadingAcademicYears && academicYears.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="text-4xl sm:text-6xl mb-4">⚙️</div>
                                    <h3 className="text-base sm:text-lg font-semibold text-base-content mb-2">Account Setup Required</h3>
                                    <p className="text-sm sm:text-base text-base-content/60 text-center max-w-md">
                                        Please set up this account first by creating academic years before managing subjects.
                                    </p>
                                </div>
                            ) : isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4" />
                                    <p className="text-base-content text-sm sm:text-base">Loading subjects...</p>
                                </div>
                            ) : filteredSubjects.length > 0 ? (
                                <>
                                    {/* Mobile Card Layout */}
                                    <div className="block md:hidden h-full">
                                        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                            <div className="space-y-3 sm:space-y-4 pb-4">
                                                {filteredSubjects.map((subject) => (
                                                    <SubjectCard key={subject._id} subject={subject} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tablet Table Layout */}
                                    <div className="hidden md:block h-full overflow-hidden">
                                        <div className="border border-base-300 rounded-lg bg-base-100 h-full flex flex-col">
                                            <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                                <table className="table w-full">
                                                    <thead className="bg-base-200 sticky top-0 z-0">
                                                        <tr>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[200px]">Subject Name</th>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[150px]">Class & Section</th>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[200px]">Staff</th>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[120px]">Created</th>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[120px]">Updated</th>
                                                            {userRole !== 'STUDENT' && (
                                                                <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[80px]">Actions</th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredSubjects.map((subject) => (
                                                            <tr key={subject._id} className="hover:bg-base-200 transition-colors">
                                                                <td className="text-base-content text-sm lg:text-base font-medium">{subject.subject}</td>
                                                                <td className="text-base-content text-sm lg:text-base">
                                                                    {subject.courseId.class.classNumber} - {subject.sectionIds.map(section => section.section).join(', ')}
                                                                </td>
                                                                <td className="text-base-content text-sm lg:text-base" title={Array.isArray(subject.staffIds) ? subject.staffIds.map((staff: { firstName: string; lastName: string }) => `${staff.firstName} ${staff.lastName}`).join(', ') : 'N/A'}>
                                                                    <div className="truncate max-w-[200px]">
                                                                        {Array.isArray(subject.staffIds)
                                                                            ? subject.staffIds.map((staff: { firstName: string; lastName: string }) =>
                                                                                `${staff.firstName} ${staff.lastName}`).join(', ')
                                                                            : 'N/A'
                                                                        }
                                                                    </div>
                                                                </td>
                                                                <td className="text-base-content text-sm lg:text-base">{formatDate(subject.createdAt)}</td>
                                                                <td className="text-base-content text-sm lg:text-base">{formatDate(subject?.updatedAt) || 'N/A'}</td>
                                                                {userRole !== 'STUDENT' && (
                                                                    <td>
                                                                        <div className="flex gap-1 justify-center">
                                                                            <Link href={`/manage-subject/add?id=${subject._id}`}>
                                                                                <Button className="btn btn-ghost btn-sm hover:bg-info/10" title="Edit Subject">
                                                                                    <Edit className="w-4 h-4 text-info" />
                                                                                </Button>
                                                                            </Link>
                                                                            <Button 
                                                                                className="btn btn-ghost btn-sm hover:bg-error/10"
                                                                                onClick={() => handleDeleteClick(subject._id)}
                                                                                title="Delete Subject"
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
                                    <div className="text-4xl sm:text-6xl mb-4">📚</div>
                                    <h3 className="text-base sm:text-lg font-semibold text-base-content mb-2">No subjects found</h3>
                                    <p className="text-sm sm:text-base text-base-content/60 text-center max-w-md">
                                        {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first subject'}
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
                            <h1 className="text-2xl xl:text-3xl font-bold text-base-content mb-6">
                                Manage Subjects
                            </h1>
                            
                            {/* Search and Add Button */}
                            <div className="flex gap-6 justify-between items-center">
                                <div className="relative flex-1 max-w-lg">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search subjects..."
                                        className="input input-bordered w-full pl-10 bg-base-100 text-base-content"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <AcademicYearDropdown
                                        academicYears={academicYears}
                                        selectedYearId={selectedAcademicYearId}
                                        onYearChange={handleYearChange}
                                        isLoading={isLoadingAcademicYears}
                                    />
                                    {userRole !== 'STUDENT' && (
                                        <Link href="/manage-subject/add">
                                            <Button variant="primary" outline className="px-6">
                                                <Plus className="w-5 h-5 mr-2" />
                                                Add Subject
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-6 pb-6 overflow-hidden">
                        {!isLoadingAcademicYears && academicYears.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="text-6xl mb-6">⚙️</div>
                                <h3 className="text-xl font-semibold text-base-content mb-3">Account Setup Required</h3>
                                <p className="text-base text-base-content/60 text-center max-w-lg">
                                    Please set up this account first by creating academic years before managing subjects.
                                </p>
                            </div>
                        ) : isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                <p className="text-base-content text-lg">Loading subjects...</p>
                            </div>
                        ) : filteredSubjects.length > 0 ? (
                            <div className="border border-base-300 rounded-lg bg-base-100 h-full flex flex-col overflow-hidden">
                                <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                    <table className="table w-full">
                                        <thead className="bg-base-200 sticky top-0 z-0">
                                            <tr>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[250px]">Subject Name</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[180px]">Class & Section</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[250px]">Staff</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[140px]">Created Date</th>
                                                {userRole !== 'STUDENT' && (
                                                    <th className="text-base-content font-semibold text-sm lg:text-base min-w-[100px] text-center">Actions</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSubjects.map((subject) => (
                                                <tr key={subject._id} className="hover:bg-base-200 transition-colors">
                                                    <td className="text-base-content font-medium py-4">{subject.subject}</td>
                                                    <td className="text-base-content py-4">
                                                        {subject.courseId.class.classNumber} - {subject.sectionIds.map(section => section.section).join(', ')}
                                                    </td>
                                                    <td className="text-base-content py-4" title={Array.isArray(subject.staffIds) ? subject.staffIds.map((staff: { firstName: string; lastName: string }) => `${staff.firstName} ${staff.lastName}`).join(', ') : 'N/A'}>
                                                        <div className="truncate max-w-[250px]">
                                                            {Array.isArray(subject.staffIds)
                                                                ? subject.staffIds.map((staff: { firstName: string; lastName: string }) =>
                                                                    `${staff.firstName} ${staff.lastName}`).join(', ')
                                                                : 'N/A'
                                                            }
                                                        </div>
                                                    </td>
                                                    <td className="text-base-content py-4">{formatDate(subject.createdAt)}</td>
                                                    {userRole !== 'STUDENT' && (
                                                        <td className="py-4">
                                                            <div className="flex gap-2 justify-center">
                                                                <Link href={`/manage-subject/add?id=${subject._id}`}>
                                                                    <Button className="btn btn-ghost btn-sm hover:bg-info/10 px-3" title="Edit Subject">
                                                                        <Edit className="w-4 h-4 text-info" />
                                                                    </Button>
                                                                </Link>
                                                                <Button 
                                                                    className="btn btn-ghost btn-sm hover:bg-error/10 px-3"
                                                                    onClick={() => handleDeleteClick(subject._id)}
                                                                    title="Delete Subject"
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
                                <div className="text-6xl mb-6">📚</div>
                                <h3 className="text-xl font-semibold text-base-content mb-3">No subjects found</h3>
                                <p className="text-base text-base-content/60 text-center max-w-lg">
                                    {searchTerm ? 'Try adjusting your search terms to find the subject you\'re looking for' : 'Get started by adding your first subject to the system'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ModalPopup
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                message="Are you sure you want to delete this subject? This action cannot be undone."
            />
        </div>
    );
}