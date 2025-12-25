'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Droplets, GraduationCap, Clock, Loader2, Shield, BookOpen, Printer } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import toast from 'react-hot-toast';
import { Button } from './button';
import { useSidebarStore } from '../store/useSidebarStore';

interface UserProfile {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNumber: string;
    parentPhoneNumber: string;
    address: string;
    role: string;
    dateJoined: string;
    dateOfBirth: string;
    bloodGroup: string;
    gender: string;
    profileImage?: string;
    subjects?: string[];
    classInfo?: {
        class: string;
        section: string;
    };
}

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    showClassInfo?: boolean;
    classInfo?: {
        class: string;
        section: string;
    };
    academicYearId?: string;
    academicYearData?: {
        startDate: string;
        endDate: string;
        sessionName?: string;
    };
    isStudentModal?: boolean;
    userRole?: string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
    isOpen,
    onClose,
    userId,
    showClassInfo = false,
    classInfo,
    academicYearId,
    academicYearData,
    isStudentModal = false,
    userRole
}) => {
    const { isExpanded, organizationName } = useSidebarStore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            fetchUserDetails();
        }
    }, [isOpen, userId]);

    const fetchUserDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/manage-staff?id=${userId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch user details');
            }

            const data = await response.json();

            // If user is a teacher, fetch their subjects
            if (data.role === 'STAFF') {
                const subjectsResponse = await fetch(`/api/manage-subject?staffId=${userId}`);
                if (subjectsResponse.ok) {
                    const subjectsData = await subjectsResponse.json();

                    // Group subjects by subject name and collect class/section info
                    const subjectGroups: { [key: string]: string[] } = {};

                    subjectsData.forEach((subject: any) => {
                        const subjectName = subject.subject;
                        const className = subject.courseId?.class?.classNumber || 'Unknown';
                        const sections = subject.sectionIds?.map((section: any) => section.section).join(', ') || '';

                        const classSection = sections ? `${className} ${sections}` : className;

                        if (!subjectGroups[subjectName]) {
                            subjectGroups[subjectName] = [];
                        }
                        subjectGroups[subjectName].push(classSection);
                    });

                    // Format as "Subject - Class Section | Class Section"
                    data.subjects = Object.entries(subjectGroups).map(([subjectName, classSections]) => {
                        return `${subjectName} - ${classSections.join(' | ')}`;
                    });
                }
            }

            // Add class info from props if available
            const userData = {
                ...data,
                classInfo: classInfo || data.classInfo
            };
            setProfile(userData);
        } catch (error) {
            console.error('Error fetching user details:', error);
            setError('Failed to load user details');
            toast.error('Failed to load user details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setProfile(null);
        setError(null);
        onClose();
    };

    const handlePrintIDCard = () => {
        if (!profile) {
            toast.error('No profile data available');
            return;
        }

        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=600');

        if (!printWindow) {
            toast.error('Unable to open print window. Please allow popups for this site.');
            return;
        }

        // Generate single ID card HTML template
        const idCardHTML = generateSingleIDCardHTML(profile, organizationName);

        printWindow.document.write(idCardHTML);
        printWindow.document.close();
    };

    const generateSingleIDCardHTML = (student: any, organizationName: string) => {
        const profileImage = student.profileImage || '';
        const initials = `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`.toUpperCase();

        // Find class info from student data
        let classInfo = '';
        if (student.classInfo) {
            classInfo = `${student.classInfo.class || ''} ${student.classInfo.section || ''}`.trim();
        } else if (student.class && student.section) {
            classInfo = `${student.class.classNumber || ''} ${student.section.section || ''}`.trim();
        }

        // Format academic year dates
        let academicYearText = '';
        if (academicYearData?.startDate && academicYearData?.endDate) {
            const startDate = new Date(academicYearData.startDate);
            const endDate = new Date(academicYearData.endDate);
            const startYear = startDate.getFullYear();
            const endYear = endDate.getFullYear();
            academicYearText = `${startYear}-${endYear}`;
        }

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>ID Card - ${student.firstName} ${student.lastName}</title>
                <style>
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Arial', sans-serif;
                        background: white;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    .id-card {
                        width: 86mm;
                        height: 65mm;
                        border: 2px solid #2563eb;
                        border-radius: 8px;
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                        display: flex;
                        flex-direction: column;
                        padding: 4mm;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                        position: relative;
                        overflow: hidden;
                    }
                    .card-header {
                        text-align: center;
                        margin-bottom: 3mm;
                        position: relative;
                    }
                    .school-name {
                        font-size: 10pt;
                        font-weight: bold;
                        color: #1e40af;
                        margin-bottom: 1mm;
                    }
                    .academic-year {
                        font-size: 7pt;
                        font-weight: 600;
                        color: #059669;
                        margin-bottom: 1mm;
                        background: rgba(5, 150, 105, 0.1);
                        padding: 1mm 2mm;
                        border-radius: 2mm;
                        display: inline-block;
                    }
                    .card-title {
                        font-size: 8pt;
                        font-weight: bold;
                        color: #374151;
                    }
                    .card-content {
                        display: flex;
                        flex: 1;
                        gap: 4mm;
                        align-items: center;
                    }
                    .photo-section {
                        flex-shrink: 0;
                    }
                    .student-photo {
                        width: 22mm;
                        height: 26mm;
                        border-radius: 4px;
                        object-fit: cover;
                        border: 1px solid #d1d5db;
                    }
                    .photo-placeholder {
                        width: 22mm;
                        height: 26mm;
                        border-radius: 4px;
                        background: #e5e7eb;
                        border: 1px solid #d1d5db;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 11pt;
                        font-weight: bold;
                        color: #6b7280;
                    }
                    .info-section {
                        flex: 1;
                        font-size: 5.5pt;
                        color: #374151;
                    }
                    .student-details {
                        font-size: 7pt;
                        margin-bottom: 1.5mm;
                        color: #111827;
                        line-height: 1.2;
                    }
                    .card-footer {
                        text-align: center;
                        margin-top: 3mm;
                        border-top: 1px solid #d1d5db;
                        padding-top: 1mm;
                    }
                    .validity {
                        font-size: 5pt;
                        color: #6b7280;
                    }
                    .print-button {
                        background: #2563eb;
                        color: white;
                        border: none;
                        padding: 2mm 4mm;
                        border-radius: 2mm;
                        font-size: 6pt;
                        font-weight: bold;
                        cursor: pointer;
                        margin-top: 2mm;
                        transition: background-color 0.2s;
                    }
                    .print-button:hover {
                        background: #1d4ed8;
                    }
                    @media print {
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .id-card {
                            break-inside: avoid;
                        }
                        .print-button {
                            display: none !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="id-card">
                    <div class="card-header">
                        <div class="school-name">${organizationName}</div>
                        ${academicYearText ? `<div class="academic-year">Academic Year: ${academicYearText}</div>` : ''}
                        <div class="card-title">STUDENT ID CARD</div>
                    </div>
                    <div class="card-content">
                        <div class="photo-section">
                            ${profileImage ?
                `<img src="${profileImage}" alt="Student Photo" class="student-photo" />` :
                `<div class="photo-placeholder">${initials}</div>`
            }
                        </div>
                        <div class="info-section">
                            <div class="student-details"><strong>Student name:</strong> ${student.firstName || ''} ${student.lastName || ''}</div>
                            <div class="student-details"><strong>Class & Section:</strong> ${classInfo || 'Not Assigned'}</div>
                            <div class="student-details"><strong>Parent ph. no.:</strong> ${student.parentPhoneNumber || ''}</div>
                            <div class="student-details"><strong>Address:</strong> ${student.address || ''}</div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="validity">Valid: ${new Date().getFullYear()}</div>
                    </div>
                </div>

                <span style="text-align: center; margin-left: 10px;">
                    <button class="print-button" onclick="window.print()">Print ID Card</button>
                    <button class="print-button" style="background: #dc2626;" onclick="window.close()">Close</button>
                </span>
            </body>
            </html>
        `;
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] animate-in fade-in duration-200"
            style={{
                top: '4rem',
                left: isExpanded ? '16rem' : '4rem',
                right: '0',
                bottom: '0'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div
                className="bg-base-100 rounded-lg shadow-2xl 
                         w-[calc(100%-1rem)] h-[calc(100%-2rem)] m-2
                         sm:w-[calc(100%-2rem)] sm:h-[calc(100%-3rem)] sm:rounded-xl sm:m-4 
                         md:w-[calc(100%-4rem)] md:h-[calc(100%-4rem)] md:rounded-2xl md:m-6
                         lg:w-[calc(100%-6rem)] lg:max-h-[calc(100vh-8rem)] lg:rounded-2xl lg:m-8
                         xl:max-w-4xl xl:max-h-[calc(100vh-6rem)] xl:rounded-3xl
                         2xl:max-w-5xl 2xl:max-h-[calc(100vh-4rem)]
                         overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="sticky top-0 bg-base-200 border-b border-base-300 border-base-content/60 z-10 
                                  px-3 py-2 xs:px-4 xs:py-3 sm:px-5 sm:py-6 md:px-6 md:py-5 lg:px-6 lg:py-4 xl:px-7 xl:py-5">
                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-center 
                                      gap-4 xs:gap-5 sm:gap-6 md:gap-7 w-full">
                            <div className="flex items-center gap-4 xs:gap-5 sm:gap-6 md:gap-7 lg:gap-8
                                          min-w-0 flex-1">
                                <div className="flex-shrink-0 p-1">
                                    {profile?.profileImage ? (
                                        <div className="relative">
                                            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-20 lg:h-20 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                                                <img
                                                    src={profile?.profileImage}
                                                    alt={`${profile.firstName} ${profile.lastName}`}
                                                    className="w-full h-full rounded-full object-cover"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        const fallback = target.parentElement?.nextElementSibling as HTMLElement;
                                                        if (fallback) fallback.style.display = 'flex';
                                                    }}
                                                />
                                            </div>
                                            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-20 lg:h-20 rounded-full bg-base-300 items-center justify-center ring ring-primary ring-offset-base-100 ring-offset-2 absolute top-0 left-0" style={{ display: 'none' }}>
                                                <User className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-10 lg:h-10 text-base-content/50" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-20 lg:h-20 rounded-full bg-base-300 flex items-center justify-center ring ring-primary ring-offset-base-100 ring-offset-2">
                                            <User className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-10 lg:h-10 text-base-content/50" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                    <h2 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl
                                                 font-bold text-base-content leading-tight break-words">
                                        {profile ? `${profile.firstName} ${profile.lastName}` : 'User Profile'}
                                    </h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Print ID Card button for current profile - only show for manage-student modal and non-student users */}
                                {isStudentModal && userRole !== 'STUDENT' && (
                                    <>
                                        <Button
                                            outline
                                            variant='primary'
                                            onClick={handlePrintIDCard}
                                            title="Print ID Card"
                                        >
                                            <Printer className="w-4 h-4" />
                                            <span className="hidden md:inline ml-2">Print ID Card</span>
                                        </Button>
                                    </>
                                )}
                                <Button
                                    outline
                                    variant='error'
                                    onClick={handleClose}
                                >
                                    <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold">×</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto w-full
                                  p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 bg-base-100">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <span className="ml-2 text-base-content">Loading user details...</span>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <div className="text-error mb-2">{error}</div>
                                <Button
                                    onClick={fetchUserDetails}
                                    className="btn btn-primary"
                                >
                                    Try Again
                                </Button>
                            </div>
                        ) : profile ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xs:gap-5 sm:gap-6 md:gap-7 lg:gap-8 xl:gap-9">
                                {/* Personal Information */}
                                <div className="card bg-base-200 shadow-sm">
                                    <div className="card-body p-4 sm:p-6">
                                        <h4 className="card-title text-base sm:text-lg md:text-xl text-base-content mb-4">
                                            Personal Information
                                        </h4>
                                        <div className="space-y-3 sm:space-y-4">
                                            {showClassInfo && profile.classInfo && (
                                                <div className="flex items-center space-x-3">
                                                    <div className="avatar placeholder">
                                                        <div className="bg-primary/20 text-primary rounded-full w-8 h-8 sm:w-10 sm:h-10">
                                                            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs sm:text-sm text-base-content/60">Class</p>
                                                        <p className="font-medium text-sm sm:text-base text-base-content">{profile.classInfo?.class} {profile.classInfo?.section}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {profile.role === 'STAFF' && profile.subjects && profile.subjects.length > 0 && (
                                                <div className="flex items-start space-x-3">
                                                    <div className="avatar placeholder">
                                                        <div className="bg-success/20 text-success rounded-full w-8 h-8 sm:w-10 sm:h-10">
                                                            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs sm:text-sm text-base-content/60">Subjects</p>
                                                        <div className="space-y-1">
                                                            {profile.subjects.map((subject: string, index: number) => (
                                                                <p key={index} className="font-medium text-sm sm:text-base text-base-content">
                                                                    {subject}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center space-x-3">
                                                <div className="avatar placeholder">
                                                    <div className="bg-primary/20 text-primary rounded-full w-8 h-8 sm:w-10 sm:h-10">
                                                        <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs sm:text-sm text-base-content/60">Gender</p>
                                                    <p className="font-medium text-sm sm:text-base text-base-content">{profile.gender || 'Not specified'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <div className="avatar placeholder">
                                                    <div className="bg-secondary/20 text-secondary rounded-full w-8 h-8 sm:w-10 sm:h-10">
                                                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs sm:text-sm text-base-content/60">Date of Birth</p>
                                                    <p className="font-medium text-sm sm:text-base text-base-content">
                                                        {profile.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Not specified'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <div className="avatar placeholder">
                                                    <div className="bg-error/20 text-error rounded-full w-8 h-8 sm:w-10 sm:h-10">
                                                        <Droplets className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs sm:text-sm text-base-content/60">Blood Group</p>
                                                    <p className="font-medium text-sm sm:text-base text-base-content">{profile.bloodGroup || 'Not specified'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <div className="avatar placeholder">
                                                    <div className="bg-info/20 text-info rounded-full w-8 h-8 sm:w-10 sm:h-10">
                                                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs sm:text-sm text-base-content/60">Date Joined</p>
                                                    <p className="font-medium text-sm sm:text-base text-base-content">
                                                        {profile.dateJoined ? formatDate(profile.dateJoined) : 'Not specified'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="card bg-base-200 shadow-sm">
                                    <div className="card-body p-4 sm:p-6">
                                        <h4 className="card-title text-base sm:text-lg md:text-xl text-base-content mb-4">
                                            Contact Information
                                        </h4>
                                        <div className="space-y-3 sm:space-y-4">
                                            <div className="flex items-start space-x-3">
                                                <div className="avatar placeholder">
                                                    <div className="bg-primary/20 text-primary rounded-full w-8 h-8 sm:w-10 sm:h-10">
                                                        <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs sm:text-sm text-base-content/60">Email</p>
                                                    <p className="font-medium text-sm sm:text-base text-base-content break-all">{profile.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start space-x-3">
                                                <div className="avatar placeholder">
                                                    <div className="bg-secondary/20 text-secondary rounded-full w-8 h-8 sm:w-10 sm:h-10">
                                                        <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs sm:text-sm text-base-content/60">Phone Number</p>
                                                    <p className="font-medium text-sm sm:text-base text-base-content">
                                                        {profile.phoneNumber || profile.phone || 'Not specified'}
                                                    </p>
                                                </div>
                                            </div>

                                            {profile.role === 'STUDENT' && (
                                                <div className="flex items-start space-x-3">
                                                    <div className="avatar placeholder">
                                                        <div className="bg-accent/20 text-accent rounded-full w-8 h-8 sm:w-10 sm:h-10">
                                                            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs sm:text-sm text-base-content/60">Parent Phone Number</p>
                                                        <p className="font-medium text-sm sm:text-base text-base-content">
                                                            {profile.parentPhoneNumber || 'Not specified'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-start space-x-3">
                                                <div className="avatar placeholder">
                                                    <div className="bg-info/20 text-info rounded-full w-8 h-8 sm:w-10 sm:h-10">
                                                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs sm:text-sm text-base-content/60">Address</p>
                                                    <p className="font-medium text-sm sm:text-base text-base-content">{profile.address || 'Not specified'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;