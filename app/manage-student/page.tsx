'use client';

import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, Loader2, User, Mail, MapPin, Calendar, Clock, Hash, GraduationCap, ChevronDown, ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import { formatDate } from '@/utils/dateUtils';
import ModalPopup from '../components/ui/modalPopup';
import ProfileModal from '../components/ui/ProfileModal';
import toast from 'react-hot-toast';
import { ISession } from '../api/models/session';
import AcademicYearDropdown from '../components/ui/academicYearDropdown';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

interface StudentMember {
    _id: string;
    rollNumber: number;
    studentId: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        address: string;
        lastLogin: string;
        dateJoined: string;
    };
    class: {
        classNumber: string;
    };
    section: {
        section: string;
    };
}

interface GroupedStudents {
    [className: string]: {
        [sectionName: string]: StudentMember[];
    };
}

export default function ManageStudentPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [studentMembers, setStudent] = useState<StudentMember[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<string | null>(null);
    const [selectedStudentClassInfo, setSelectedStudentClassInfo] = useState<{ class: string; section: string } | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const studentRole = "STUDENT";
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const [academicYears, setAcademicYears] = useState<ISession[]>([]);
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<ISession | null>(null);
    const [isLoadingAcademicYears, setIsLoadingAcademicYears] = useState(true);
    const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

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
            const fetchStudent = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch(`/api/manage-staff?role=${studentRole}&id=${userId}&academicYearId=${selectedAcademicYearId._id}`);
                    const studentClassData = await response.json();
                    
                    // Ensure we always set an array
                    if (Array.isArray(studentClassData)) {
                        setStudent(studentClassData);
                    } else if (studentClassData && !studentClassData.error) {
                        // If it's a single object (not an error), wrap it in an array
                        setStudent([studentClassData]);
                    } else {
                        // If it's an error or invalid data, set empty array
                        setStudent([]);
                        if (studentClassData?.error) {
                            toast.error(studentClassData.error);
                        }
                    }
                } catch (error) {
                    toast.error('Error fetching student');
                    setStudent([]); // Ensure array on error
                } finally {
                    setIsLoading(false);
                }
            };
            fetchStudent();
        }
    }, [userId, selectedAcademicYearId, studentRole]);

    const filteredStudents = (Array.isArray(studentMembers) ? studentMembers : []).filter(student =>
        student.studentId.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNumber.toString().includes(searchTerm) ||
        student.studentId.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group students by class and section
    const groupStudentsByClassAndSection = (students: StudentMember[]): GroupedStudents => {
        return students.reduce((acc, student) => {
            const className = student.class.classNumber;
            const sectionName = student.section.section;

            if (!acc[className]) {
                acc[className] = {};
            }
            if (!acc[className][sectionName]) {
                acc[className][sectionName] = [];
            }

            acc[className][sectionName].push(student);
            return acc;
        }, {} as GroupedStudents);
    };

    const groupedStudents = groupStudentsByClassAndSection(filteredStudents);

    // Auto-expand accordion when searching (for admin/staff roles)
    useEffect(() => {
        if (searchTerm && searchTerm.trim() !== '' && userRole !== 'STUDENT') {
            // Auto-expand classes that have filtered students
            const classesToExpand = new Set(expandedClasses); // Keep existing manual expansions
            const sectionsToExpand = new Set(expandedSections); // Keep existing manual expansions

            Object.keys(groupedStudents).forEach(className => {
                const classSections = groupedStudents[className];
                let hasStudents = false;

                Object.keys(classSections).forEach(sectionName => {
                    const students = classSections[sectionName];
                    if (students.length > 0) {
                        hasStudents = true;
                        sectionsToExpand.add(`${className}-${sectionName}`);
                    }
                });

                if (hasStudents) {
                    classesToExpand.add(className);
                }
            });

            setExpandedClasses(classesToExpand);
            setExpandedSections(sectionsToExpand);
        } else if (!searchTerm && userRole !== 'STUDENT') {
            // When search is cleared, collapse all
            setExpandedClasses(new Set());
            setExpandedSections(new Set());
        }
    }, [searchTerm, userRole]);

    // Toggle class expansion
    const toggleClass = (className: string) => {
        const newExpanded = new Set(expandedClasses);
        if (newExpanded.has(className)) {
            newExpanded.delete(className);
            // Also collapse all sections in this class
            const newExpandedSections = new Set(expandedSections);
            Object.keys(groupedStudents[className] || {}).forEach(section => {
                newExpandedSections.delete(`${className}-${section}`);
            });
            setExpandedSections(newExpandedSections);
        } else {
            newExpanded.add(className);
        }
        setExpandedClasses(newExpanded);
    };

    // Toggle section expansion
    const toggleSection = (className: string, sectionName: string) => {
        const sectionKey = `${className}-${sectionName}`;
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionKey)) {
            newExpanded.delete(sectionKey);
        } else {
            newExpanded.add(sectionKey);
        }
        setExpandedSections(newExpanded);
    };

    const handleDeleteClick = (studentId: string) => {
        setSelectedStudentId(studentId);
        setIsDeleteModalOpen(true);
    };

    const handleStudentNameClick = (studentId: string, classInfo: { class: string; section: string }) => {
        setSelectedStudentProfileId(studentId);
        setSelectedStudentClassInfo(classInfo);
        setIsProfileModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedStudentId) return;

        try {
            const response = await fetch(`/api/student-class?id=${selectedStudentId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete Student');
            // Remove deleted student from state - filter by studentId._id since selectedStudentId is the actual student ID
            setStudent(prevStudent => prevStudent.filter(student => student.studentId._id !== selectedStudentId));
            toast.success('Student deleted successfully');
        } catch (error) {
            toast.error('Error deleting student');
        }

        // Close modal after deleting
        setIsDeleteModalOpen(false);
        setSelectedStudentId(null);
    };

    // Handle year change
    const handleYearChange = (yearId: ISession) => {
        setSelectedAcademicYearId(yearId);
    };

    // Mobile Card Component
    const StudentCard = ({ student }: { student: StudentMember }) => (
        <div className="card bg-base-300 shadow-sm hover:shadow-md transition-all duration-200 border border-base-content/20 hover:border-base-content/30 rounded-lg overflow-hidden">
            <div className="card-body p-4">
                {/* Header with name and actions */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="avatar placeholder">
                            <div className="bg-gradient-to-br from-primary to-primary-focus text-primary-content rounded-full w-10 h-10 shadow-sm">
                                <span className="text-sm font-semibold">
                                    {student.studentId.firstName.charAt(0)}{student.studentId.lastName.charAt(0)}
                                </span>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base-content text-sm sm:text-base leading-tight">
                                {student.studentId.firstName} {student.studentId.lastName}
                            </h3>
                            <div className="flex items-center text-base-content/70 text-xs">
                                <Hash className="w-3 h-3 mr-1" />
                                Roll No: {student.rollNumber}
                            </div>
                        </div>
                    </div>
                    {userRole !== 'STUDENT' && (
                        <div className="flex gap-1">
                            <Link href={`/manage-student/add?id=${student.studentId._id}`}>
                                <button className="btn btn-ghost btn-xs sm:btn-sm hover:bg-info/10 transition-colors rounded-md">
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4 text-info" />
                                </button>
                            </Link>
                            <button
                                className="btn btn-ghost btn-xs sm:btn-sm hover:bg-error/10 transition-colors rounded-md"
                                onClick={() => handleDeleteClick(student.studentId._id)}
                            >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-error z-10" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Student details */}
                <div className="space-y-2.5">
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <Mail className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80 truncate font-medium">
                            {student.studentId.email}
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <MapPin className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80 truncate">
                            {student.studentId.address}
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80">
                            Last login: <span className="font-medium">{student.studentId?.lastLogin || 'N/A'}</span>
                        </span>
                    </div>
                    <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            <Calendar className="w-3.5 h-3.5 text-base-content/60" />
                        </div>
                        <span className="text-xs sm:text-sm text-base-content/80">
                            Joined: <span className="font-medium">{formatDate(student.studentId?.dateJoined || '')}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    // Simple List Component for Students
    const SimpleStudentList = () => (
        <div className="h-full flex flex-col">
            {isMobile ? (
                <div className="h-full overflow-y-auto space-y-3 p-2">
                    {filteredStudents.map((student) => (
                        <StudentCard key={student._id} student={student} />
                    ))}
                </div>
            ) : (
                <div className="border border-base-300 rounded-lg bg-base-100 h-full overflow-auto">
                    <table className="table w-full">
                        <thead className="bg-base-200 sticky top-0 z-0">
                            <tr>
                                <th className="text-base-content text-sm font-semibold py-3">Roll No</th>
                                <th className="text-base-content text-sm font-semibold py-3">First Name</th>
                                <th className="text-base-content text-sm font-semibold py-3">Last Name</th>
                                <th className="text-base-content text-sm font-semibold py-3">Class</th>
                                <th className="text-base-content text-sm font-semibold py-3">Email</th>
                                <th className="text-base-content text-sm font-semibold py-3">Address</th>
                                <th className="text-base-content text-sm font-semibold py-3">Date Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student) => (
                                <tr key={student._id} className="hover:bg-base-200 transition-colors">
                                    <td className="text-base-content text-sm font-medium">
                                        <button 
                                            onClick={() => handleStudentNameClick(student.studentId._id, {
                                                class: student.class.classNumber,
                                                section: student.section.section
                                            })}
                                            className=" hover:text-primary cursor-pointer"
                                        >
                                            {student.rollNumber}
                                        </button>
                                    </td>
                                    <td className="text-base-content text-sm font-medium">
                                        <button 
                                            onClick={() => handleStudentNameClick(student.studentId._id, {
                                                class: student.class.classNumber,
                                                section: student.section.section
                                            })}
                                            className=" hover:text-primary cursor-pointer"
                                        >
                                            {student.studentId.firstName}
                                        </button>
                                    </td>
                                    <td className="text-base-content text-sm font-medium">
                                        <button 
                                            onClick={() => handleStudentNameClick(student.studentId._id, {
                                                class: student.class.classNumber,
                                                section: student.section.section
                                            })}
                                            className=" hover:text-primary cursor-pointer"
                                        >
                                            {student.studentId.lastName}
                                        </button>
                                    </td>
                                    <td className="text-base-content text-sm">{student.class.classNumber} {student.section.section}</td>
                                    <td className="text-base-content text-sm" title={student.studentId.email}>
                                        <div className="truncate max-w-[180px]">{student.studentId.email}</div>
                                    </td>
                                    <td className="text-base-content text-sm" title={student.studentId.address}>
                                        <div className="truncate max-w-[200px]">{student.studentId.address}</div>
                                    </td>
                                    <td className="text-base-content text-sm">{formatDate(student.studentId?.dateJoined || '')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    // Accordion Content Component
    const AccordionContent = () => (
        <div className="space-y-4">
            {Object.keys(groupedStudents)
                .sort((a, b) => {
                    // Sort classes numerically
                    const aNum = parseInt(a.replace(/\D/g, ''));
                    const bNum = parseInt(b.replace(/\D/g, ''));
                    return aNum - bNum;
                })
                .map((className) => {
                    const classSections = groupedStudents[className];
                    const totalStudentsInClass = Object.values(classSections).reduce((sum, students) => sum + students.length, 0);
                    const isClassExpanded = expandedClasses.has(className);

                    return (
                        <div key={className} className="border border-base-300 rounded-lg bg-base-100 overflow-hidden shadow-sm">
                            {/* Class Header */}
                            <div 
                                className="flex items-center justify-between p-4 bg-primary/10 hover:bg-primary/15 cursor-pointer transition-colors border-b border-base-300"
                                onClick={() => toggleClass(className)}
                            >
                                <div className="flex items-center space-x-3">
                                    {isClassExpanded ? (
                                        <ChevronDown className="w-5 h-5 text-base-content" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-base-content" />
                                    )}
                                    <GraduationCap className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold text-base-content">
                                        Class {className}
                                    </h3>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Users className="w-4 h-4 text-base-content" />
                                    <span className="text-sm text-base-content font-medium">
                                        {totalStudentsInClass} student{totalStudentsInClass !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Class Content */}
                            {isClassExpanded && (
                                <div className="border-t border-base-300 p-3">
                                    {Object.keys(classSections)
                                        .sort()
                                        .map((sectionName) => {
                                            const students = classSections[sectionName];
                                            const sectionKey = `${className}-${sectionName}`;
                                            const isSectionExpanded = expandedSections.has(sectionKey);

                                            return (
                                                <div key={sectionKey} className="border border-base-300 rounded-md mb-2 last:mb-0 bg-primary/5 shadow-sm">
                                                    {/* Section Header */}
                                                    <div 
                                                        className="flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/8 cursor-pointer transition-colors rounded-t-md border-b border-base-300"
                                                        onClick={() => toggleSection(className, sectionName)}
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            {isSectionExpanded ? (
                                                                <ChevronDown className="w-4 h-4 text-base-content" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4 text-base-content" />
                                                            )}
                                                            <span className="font-medium text-base-content">
                                                                Section {sectionName}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm text-base-content">
                                                            {students.length} student{students.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>

                                                    {/* Students List */}
                                                    {isSectionExpanded && (
                                                        <div className="bg-base-50 border-t border-base-content rounded-b-md">
                                                            {isMobile ? (
                                                                <div className="space-y-3 p-4">
                                                                    {students.map((student) => (
                                                                        <StudentCard key={student._id} student={student} />
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="max-h-80 overflow-auto">
                                                                    <table className="table w-full">
                                                                        <thead className="sticky top-0 bg-base-300 border-b-2 border-base-content/20 z-10">
                                                                            <tr>
                                                                                <th className="text-base-content text-sm font-semibold py-3">Roll No</th>
                                                                                <th className="text-base-content text-sm font-semibold py-3">First Name</th>
                                                                                <th className="text-base-content text-sm font-semibold py-3">Last Name</th>
                                                                                <th className="text-base-content text-sm font-semibold py-3">Email</th>
                                                                                <th className="text-base-content text-sm font-semibold py-3">Address</th>
                                                                                <th className="text-base-content text-sm font-semibold py-3">Date Joined</th>
                                                                                {userRole !== 'STUDENT' && (
                                                                                    <th className="text-base-content text-sm font-semibold text-center py-3">Actions</th>
                                                                                )}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {students.map((student) => (
                                                                                <tr key={student._id} className="hover:bg-base-100 bg transition-colors">
                                                                                    <td className="text-base-content text-sm font-medium">
                                                                                        <button 
                                                                                            onClick={() => handleStudentNameClick(student.studentId._id, {
                                                                                                class: student.class.classNumber,
                                                                                                section: student.section.section
                                                                                            })}
                                                                                            className=" hover:text-primary cursor-pointer"
                                                                                        >
                                                                                            {student.rollNumber}
                                                                                        </button>
                                                                                    </td>
                                                                                    <td className="text-base-content text-sm font-medium">
                                                                                        <button 
                                                                                            onClick={() => handleStudentNameClick(student.studentId._id, {
                                                                                                class: student.class.classNumber,
                                                                                                section: student.section.section
                                                                                            })}
                                                                                            className=" hover:text-primary cursor-pointer"
                                                                                        >
                                                                                            {student.studentId.firstName}
                                                                                        </button>
                                                                                    </td>
                                                                                    <td className="text-base-content text-sm font-medium">
                                                                                        <button 
                                                                                            onClick={() => handleStudentNameClick(student.studentId._id, {
                                                                                                class: student.class.classNumber,
                                                                                                section: student.section.section
                                                                                            })}
                                                                                            className=" hover:text-primary cursor-pointer"
                                                                                        >
                                                                                            {student.studentId.lastName}
                                                                                        </button>
                                                                                    </td>
                                                                                    <td className="text-base-content text-sm" title={student.studentId.email}>
                                                                                        <div className="truncate max-w-[180px]">
                                                                                            <button 
                                                                                                onClick={() => handleStudentNameClick(student.studentId._id, {
                                                                                                    class: student.class.classNumber,
                                                                                                    section: student.section.section
                                                                                                })}
                                                                                                className=" hover:text-primary cursor-pointer"
                                                                                            >
                                                                                                {student.studentId.email}
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="text-base-content text-sm" title={student.studentId.address}>
                                                                                        <div className="truncate max-w-[200px]">{student.studentId.address}</div>
                                                                                    </td>
                                                                                    <td className="text-base-content text-sm">{formatDate(student.studentId?.dateJoined || '')}</td>
                                                                                    {userRole !== 'STUDENT' && (
                                                                                        <td>
                                                                                            <div className="flex gap-1 justify-center">
                                                                                                <Link href={`/manage-student/add?id=${student.studentId._id}`}>
                                                                                                    <Button className="btn btn-ghost btn-xs hover:bg-info/10" title="Edit Student">
                                                                                                        <Edit className="w-4 h-4 text-info" />
                                                                                                    </Button>
                                                                                                </Link>
                                                                                                <Button 
                                                                                                    className="btn btn-ghost btn-xs hover:bg-error/10"
                                                                                                    onClick={() => handleDeleteClick(student.studentId._id)}
                                                                                                    title="Delete Student"
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
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    );
                })}
        </div>
    );

    return (
        <div className="flex flex-col w-full h-[calc(100vh-64px)] p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100 overflow-hidden">
            {/* Mobile and Tablet: Centered container with max-width */}
            <div className="block xl:hidden h-full">
                <div className="card bg-base-200 shadow-xl h-full w-full max-w-6xl mx-auto flex flex-col">
                    <div className="card-body p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 flex-shrink-0">
                            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content mb-4">
                                Manage Students
                            </h1>

                            {/* Search and Add Button */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60 w-4 h-4 sm:w-5 sm:h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search students..."
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
                                        <Link href="/manage-student/add">
                                            <Button variant="primary" outline className="w-full sm:w-auto">
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add Student
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
                                    <p className="text-sm sm:text-base text-base-content text-center max-w-md">
                                        Please set up this account first by creating academic years before managing students.
                                    </p>
                                </div>
                            ) : isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4" />
                                    <p className="text-base-content text-sm sm:text-base">Loading students...</p>
                                </div>
                            ) : filteredStudents.length > 0 ? (
                                userRole === 'STUDENT' ? (
                                    <div className="h-full overflow-hidden">
                                        <SimpleStudentList />
                                    </div>
                                ) : (
                                    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                        <AccordionContent />
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="text-4xl sm:text-6xl mb-4">🎓</div>
                                    <h3 className="text-base sm:text-lg font-semibold text-base-content mb-2">No students found</h3>
                                    <p className="text-sm sm:text-base text-base-content text-center max-w-md">
                                        {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first student'}
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
                                Manage Students
                            </h1>

                            {/* Search and Add Button */}
                            <div className="flex gap-6 justify-between items-center">
                                <div className="relative flex-1 max-w-lg">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search students..."
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
                                        <Link href="/manage-student/add">
                                            <Button variant="primary" outline className="px-6">
                                                <Plus className="w-5 h-5 mr-2" />
                                                Add Student
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
                                <p className="text-base text-base-content text-center max-w-lg">
                                    Please set up this account first by creating academic years before managing students.
                                </p>
                            </div>
                        ) : isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                <p className="text-base-content text-lg">Loading students...</p>
                            </div>
                        ) : filteredStudents.length > 0 ? (
                            userRole === 'STUDENT' ? (
                                <div className="h-full overflow-hidden">
                                    <SimpleStudentList />
                                </div>
                            ) : (
                                <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                    <AccordionContent />
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="text-6xl mb-6">🎓</div>
                                <h3 className="text-xl font-semibold text-base-content mb-3">No students found</h3>
                                <p className="text-base text-base-content text-center max-w-lg">
                                    {searchTerm ? 'Try adjusting your search terms to find the student you\'re looking for' : 'Get started by adding your first student to the system'}
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
                message="This will permanently delete this student."
            />

            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                classInfo={selectedStudentClassInfo || undefined}
                userId={selectedStudentProfileId || ''}
                showClassInfo={true}
                academicYearId={selectedAcademicYearId?._id}
                academicYearData={selectedAcademicYearId ? {
                    startDate: new Date(selectedAcademicYearId.startDate).toISOString(),
                    endDate: new Date(selectedAcademicYearId.endDate).toISOString()
                } : undefined}
                isStudentModal={true}
                userRole={userRole || undefined}
            />
        </div>
    );
}