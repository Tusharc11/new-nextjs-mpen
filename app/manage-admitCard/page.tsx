'use client';

import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, FileText, BookOpen, Calendar, Hash, Shield, Users, GraduationCap, Clock, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import { formatDate } from '@/utils/dateUtils';
import ModalPopup from '../components/ui/modalPopup';
import toast from 'react-hot-toast';
import Image from 'next/image';
import bookLoader1 from '@/public/book1.gif';
import { useSidebarStore } from '../components/store/useSidebarStore';
import { useRouter, usePathname } from 'next/navigation';

interface StudentField {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    isCustom?: boolean;
}

interface AdmitCardTemplate {
    _id: string;
    templateName: string;
    classIds: string[];
    admitCardDetails?: {
        logoBase64: string;
    };
    studentDetailsConfig?: {
        fields: StudentField[];
    };
    admitCards?: {
        _id?: string;
        heading: string;
        subHeading: string;
        fields: string[];
    }[];
    createdAt: string;
    updatedAt: string;
}

interface Class {
    _id: string;
    classNumber: string;
}

export default function ManageAdmitCardPage() {
    const router = useRouter();
    const pathname = usePathname();
    const [searchTerm, setSearchTerm] = useState('');
    const [templates, setTemplates] = useState<AdmitCardTemplate[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [classes, setClasses] = useState<Class[]>([]);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<AdmitCardTemplate | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (!token) return;
            const payload = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));
            setUserRole(decodedPayload.role);
        }

        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };

                // Fetch templates
                const templatesResponse = await fetch('/api/manage-admitCard', { headers });
                if (!templatesResponse.ok) throw new Error('Failed to fetch templates');
                const templatesData = await templatesResponse.json();

                // Fetch classes
                const classesResponse = await fetch('/api/classes', { headers });
                if (classesResponse.ok) {
                    const classesData = await classesResponse.json();
                    setClasses(classesData);
                }

                setTemplates(templatesData.templates || []);
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const getClassNames = (classIds: string[]) => {
        const classNames = classIds.map(classId => {
            const classData = classes.find(c => c._id === classId);
            return classData ? `${classData.classNumber}` : classId;
        });
        return classNames.join(', ');
    };

    const getClassName = (classId: string) => {
        const classData = classes.find(c => c._id === classId);
        return classData ? `Class ${classData.classNumber}` : classId;
    };

    const filteredTemplates = templates.filter(template =>
        template.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getClassNames(template.classIds).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeleteClick = (templateId: string) => {
        setSelectedTemplateId(templateId);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedTemplateId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/manage-admitCard?templateId=${selectedTemplateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete template');

            // Remove deleted template from state
            setTemplates(prevTemplates => prevTemplates.filter(template => template._id !== selectedTemplateId));
            toast.success('Template deleted successfully');
        } catch (error) {
            toast.error('Error deleting template');
        }

        setIsDeleteModalOpen(false);
        setSelectedTemplateId(null);
    };

    const handleDeleteCancel = () => {
        setIsDeleteModalOpen(false);
        setSelectedTemplateId(null);
    };

    const handleDetailsModalClose = () => {
        setIsDetailsModalOpen(false);
        setSelectedTemplate(null);
    };

    const handleTemplateClick = (template: AdmitCardTemplate) => {
        setSelectedTemplate(template);
        setIsDetailsModalOpen(true);
    };

    const AdmitCardCard = ({ template }: { template: AdmitCardTemplate }) => {
        return (
            <div className="card bg-base-300 border border-base-content/20 shadow-xl h-full w-full max-w-6xl mx-auto flex flex-col">
                <div className="card-body p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col h-full overflow-hidden">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content mb-6">{template.templateName}</h2>
                    <p className="text-base-content text-sm sm:text-base">{getClassNames(template.classIds)}</p>
                    <p className="text-base-content text-sm sm:text-base">{formatDate(template.updatedAt)}</p>
                </div>
            </div>
        );
    };

    const AdmitCardDetailsModal = () => {
        if (!selectedTemplate) return null;

        const { isExpanded } = useSidebarStore();

        // Sample student data for preview
        const sampleStudent = {
            fullName: 'PRACHI SHARMA',
            rollNumber: '15',
            studentId: '052/2014-15',
            dateOfBirth: '15/03/2008',
            parentPhone: '+91 9876543210',
            address: '123 Main Street, City',
            gender: 'Female'
        };

        return (
            <div
                className="fixed bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200"
                style={{
                    top: '4rem', // Account for navbar height (64px)
                    left: isExpanded ? '16rem' : '4rem', // Account for sidebar width
                    right: '0',
                    bottom: '0'
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        handleDetailsModalClose();
                    }
                }}
            >
                <div
                    className="bg-base-100 rounded-lg shadow-2xl w-full h-full
                             xs:w-[calc(100%-0.5rem)] xs:h-[calc(100%-0.5rem)] xs:rounded-lg xs:m-1
                             sm:w-[calc(100%-1rem)] sm:h-[calc(100%-1rem)] sm:rounded-xl sm:m-2
                             md:w-[calc(100%-2rem)] md:h-[calc(100%-2rem)] md:rounded-2xl md:m-4
                             lg:w-[calc(100%-4rem)] lg:h-[calc(100%-3rem)] lg:rounded-2xl lg:m-6
                             xl:w-[calc(100%-6rem)] xl:h-[calc(100%-3rem)] xl:rounded-3xl xl:m-8
                             2xl:max-w-[95rem] 2xl:max-h-[90vh]
                             max-h-[98vh] overflow-hidden animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="sticky top-0 bg-base-200 border-b border-base-300 border-base-content/60 z-10
                                      p-1.5 xs:p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6">
                            <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center
                                          gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 w-full overflow-hidden">
                                <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 lg:gap-5
                                              min-w-0 flex-1 overflow-hidden">
                                    <div className="avatar placeholder flex-shrink-0">
                                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white
                                                      rounded-md xs:rounded-lg sm:rounded-xl md:rounded-2xl lg:rounded-3xl
                                                      w-6 h-6 xs:w-8 xs:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12
                                                      lg:w-14 lg:h-14 xl:w-16 xl:h-16 shadow-lg">
                                            <FileText className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8" />
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <h2 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl
                                                     font-bold text-base-content leading-tight truncate">
                                            Admit Card Preview
                                        </h2>
                                    </div>
                                </div>
                                <div className="flex gap-1 xs:gap-1.5 sm:gap-2 flex-shrink-0">
                                    {userRole === 'ADMIN' && (
                                        <Link href={`/manage-admitCard/add?id=${selectedTemplate._id}`}>
                                            <Button
                                                outline
                                                variant='info'
                                            >
                                                <Edit className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5" />
                                                <span className="hidden sm:inline">Edit</span>
                                            </Button>
                                        </Link>
                                    )}
                                    <Button
                                        outline
                                        variant='error'
                                        onClick={handleDetailsModalClose}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4 lg:p-6 xl:p-8">
                                {/* Admit Card Preview */}
                                <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
                                    <div className="bg-red-600 text-white p-4">
                                        <h4 className="text-lg font-bold text-center">Admit Card Preview</h4>
                                        <p className="text-center text-sm opacity-90 mt-1">
                                            Template: {selectedTemplate.templateName}
                                        </p>
                                    </div>
                                    <div className="p-8 bg-white">
                                        {/* School Header */}
                                        <div className="text-center mb-8">
                                            {selectedTemplate.admitCardDetails?.logoBase64 && selectedTemplate.admitCardDetails.logoBase64.trim() ? (
                                                <div className="flex justify-center mb-4">
                                                    <img
                                                        src={selectedTemplate.admitCardDetails.logoBase64.startsWith('data:')
                                                            ? selectedTemplate.admitCardDetails.logoBase64
                                                            : `data:image/png;base64,${selectedTemplate.admitCardDetails.logoBase64}`}
                                                        alt="School Logo"
                                                        className="h-16 w-auto object-contain"
                                                        onError={(e) => {
                                                            console.error('Failed to load logo preview:', selectedTemplate.admitCardDetails?.logoBase64);
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            ) : null}
                                            <h1 className="text-2xl font-bold text-gray-800 mb-2">
                                                MOUNT SION SCHOOL
                                            </h1>
                                            
                                            <div className="bg-gray-800 text-white py-2 px-6 inline-block text-lg font-bold">
                                                ADMIT CARD - TERM-2
                                            </div>
                                        </div>

                                        {/* Main Content Layout - 3 Column Grid */}
                                        <div className="mb-8">
                                            <table className="w-full border-collapse border border-gray-300">
                                                <tbody>
                                                    <tr>
                                                        {/* Column 1: Student Photo */}
                                                        <td className="border border-gray-300 p-2 w-1/4 align-top">
                                                            <div className="flex items-center justify-center min-h-[160px]">
                                                                <div className="border-2 border-gray-400 p-2 text-center bg-gray-50">
                                                                    <div className="w-24 h-32 bg-gray-200 border border-gray-300 flex items-center justify-center">
                                                                        <span className="text-gray-600 text-xs font-medium">Student Photo</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        
                                                        {/* Column 2: Student Details Table */}
                                                        <td className="border border-gray-300 p-4 w-3/8 align-top">
                                                            <table className="w-full border-collapse">
                                                                <tbody>
                                                                    {/* Always show class */}
                                                                    <tr>
                                                                        <td className="border-b border-gray-300 py-2 pr-4">
                                                                            <span className="font-medium text-gray-700">Class:</span>
                                                                        </td>
                                                                        <td className="border-b border-gray-300 py-2">
                                                                            <span className="text-gray-900 font-semibold">
                                                                                8 A
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                    
                                                                    {/* Dynamically show selected student fields */}
                                                                    {selectedTemplate.studentDetailsConfig?.fields &&
                                                                        selectedTemplate.studentDetailsConfig.fields
                                                                            .filter(field => field.enabled)
                                                                            .map((field) => {
                                                                                // Get sample data for each field
                                                                                const getSampleData = (fieldId: string) => {
                                                                                    switch (fieldId) {
                                                                                        case 'fullName': return 'PRACHI SHARMA';
                                                                                        case 'rollNumber': return '15';
                                                                                        case 'studentId': return '052/2014-15';
                                                                                        case 'dateOfBirth': return '15/03/2008';
                                                                                        case 'parentPhone': return '+91 9876543210';
                                                                                        case 'address': return '123 Main Street, City';
                                                                                        case 'gender': return 'Female';
                                                                                        default: return 'Sample Data';
                                                                                    }
                                                                                };

                                                                                return (
                                                                                    <tr key={field.id}>
                                                                                        <td className="border-b border-gray-300 py-2 pr-4">
                                                                                            <span className="font-medium text-gray-700">{field.label}:</span>
                                                                                        </td>
                                                                                        <td className="border-b border-gray-300 py-2">
                                                                                            <span className="text-gray-900 font-semibold">
                                                                                                {getSampleData(field.id)}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                </tbody>
                                                            </table>
                                                        </td>

                                                        {/* Column 3: Exam Details Table */}
                                                        <td className="border border-gray-300 p-4 w-3/8 align-top">
                                                            <table className="w-full border-collapse">
                                                                <tbody>
                                                                    <tr>
                                                                        <td className="border-b border-gray-300 py-2 pr-4">
                                                                            <span className="font-medium text-gray-700">Examination:</span>
                                                                        </td>
                                                                        <td className="border-b border-gray-300 py-2">
                                                                            <span className="text-gray-900 font-semibold">TERM-2</span>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="border-b border-gray-300 py-2 pr-4">
                                                                            <span className="font-medium text-gray-700">Exam Centre:</span>
                                                                        </td>
                                                                        <td className="border-b border-gray-300 py-2">
                                                                            <span className="text-gray-900 font-semibold">MOUNT SION SCHOOL</span>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="border-b border-gray-300 py-2 pr-4">
                                                                            <span className="font-medium text-gray-700">Start Time:</span>
                                                                        </td>
                                                                        <td className="border-b border-gray-300 py-2">
                                                                            <span className="text-gray-900 font-semibold">10:00 AM</span>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="border-b border-gray-300 py-2 pr-4">
                                                                            <span className="font-medium text-gray-700">Duration:</span>
                                                                        </td>
                                                                        <td className="border-b border-gray-300 py-2">
                                                                            <span className="text-gray-900 font-semibold">1:30 Hrs</span>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Subject Schedule Table */}
                                        <div className="mb-8">
                                            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">EXAMINATION SCHEDULE</h3>
                                            <div className="border border-gray-300">
                                                <table className="w-full border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-100">
                                                            <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">SUBJECT NAME</th>
                                                            <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">DATE</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td className="border border-gray-300 px-4 py-3 text-gray-800">SOCIAL SCIENCE</td>
                                                            <td className="border border-gray-300 px-4 py-3 text-gray-800">{new Date().toLocaleDateString('en-GB')}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="border border-gray-300 px-4 py-3 text-gray-800">MATHS</td>
                                                            <td className="border border-gray-300 px-4 py-3 text-gray-800">{new Date(new Date().setDate(new Date().getDate() + 2)).toLocaleDateString('en-GB')}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="border border-gray-300 px-4 py-3 text-gray-800">SCIENCE</td>
                                                            <td className="border border-gray-300 px-4 py-3 text-gray-800">{new Date(new Date().setDate(new Date().getDate() + 4)).toLocaleDateString('en-GB')}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="border border-gray-300 px-4 py-3 text-gray-800">ENGLISH</td>
                                                            <td className="border border-gray-300 px-4 py-3 text-gray-800">{new Date(new Date().setDate(new Date().getDate() + 6)).toLocaleDateString('en-GB')}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="border border-gray-300 px-4 py-3 text-gray-800">HINDI</td>
                                                            <td className="border border-gray-300 px-4 py-3 text-gray-800">{new Date(new Date().setDate(new Date().getDate() + 8)).toLocaleDateString('en-GB')}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Instructions Section */}
                                        {selectedTemplate.admitCards && selectedTemplate.admitCards.length > 0 && selectedTemplate.admitCards[0].fields.some(instruction => instruction.trim()) && (
                                            <div className="mb-8">
                                                <h3 className="text-lg font-semibold bg-gray-50 text-red-600 mb-4 text-center border-2 border-red-600 p-2">INSTRUCTIONS TO THE CANDIDATE</h3>
                                                <div className="p-4">
                                                    <ul className="list-disc list-inside space-y-2">
                                                        {selectedTemplate.admitCards[0].fields.filter(instruction => instruction.trim()).map((instruction, index) => (
                                                            <li key={index} className="text-gray-800 text-sm leading-relaxed">
                                                                {instruction}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}

                                        {/* Footer Signatures - Tabular Grid */}
                                        <div className="mt-12 pt-6 border-t border-gray-300">
                                            <table className="w-full ">
                                                <tbody>
                                                    <tr>
                                                        <td className="p-6 text-center">
                                                            <p className="font-semibold text-gray-800 mb-2">Principal</p>
                                                            <p className="text-sm text-gray-600 mb-4">(Signature & Stamp of the Principal)</p>
                                                            <div className="border-b-2 border-gray-400 w-32 mx-auto"></div>
                                                        </td>
                                                        <td className="p-6 text-center">
                                                            <p className="font-semibold text-gray-800 mb-2">Signature of Accountant</p>
                                                            <div className="border-b-2 border-gray-400 w-32 mx-auto mt-6"></div>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col w-full h-[calc(100vh-64px)] p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100 overflow-hidden">
            {/* Mobile and Tablet: Centered container with max-width */}
            <div className="block xl:hidden h-full">
                <div className="card bg-base-300 border border-base-content/20 shadow-xl h-full w-full max-w-6xl mx-auto flex flex-col">
                    <div className="card-body p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 flex-shrink-0">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content mb-6">
                                    Admit Card Template
                                </h1>
                            </div>

                            {/* Navigation Tabs */}
                            <div className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-4 sm:mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
                                {/* Sliding Background Indicator */}
                                <div
                                    className={`absolute top-1 bottom-1 rounded-lg bg-base-100 shadow-sm transition-all duration-300 ease-in-out ${pathname === '/manage-admitCard'
                                        ? 'left-1 right-1/2 mr-1.5'
                                        : 'left-1/2 right-1 ml-1.5'
                                        }`}
                                />

                                <button
                                    onClick={() => router.push('/manage-admitCard')}
                                    className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/manage-admitCard'
                                        ? 'text-emerald-600'
                                        : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                >
                                    <FileText className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium truncate">Admit Cards</span>
                                </button>
                                <button
                                    onClick={() => router.push('/manage-marksheet')}
                                    className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/manage-marksheet'
                                        ? 'text-rose-700'
                                        : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                >
                                    <BookOpen className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium truncate">Marksheets</span>
                                </button>
                            </div>

                            {/* Search and Add Button */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60 w-4 h-4 sm:w-5 sm:h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search admit card templates"
                                        className="input input-bordered w-full pl-9 sm:pl-10 bg-base-100 text-base-content text-sm sm:text-base"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {userRole === 'ADMIN' && (
                                    <Link href="/manage-admitCard/add">
                                        <Button variant="primary" outline className="w-full sm:w-auto">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add New Template
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
                                    <p className="text-base-content text-sm sm:text-base">Loading admit card templates...</p>
                                </div>
                            ) : filteredTemplates.length > 0 ? (
                                <>
                                    {/* Mobile Card Layout */}
                                    <div className="block md:hidden h-full">
                                        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                            <div className="space-y-3 sm:space-y-4 pb-4">
                                                {filteredTemplates.map((template) => (
                                                    // <TemplateCard key={template._id} template={template} />
                                                    <AdmitCardCard key={template._id} template={template} />
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
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[200px]">Template Name</th>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[200px]">Classes</th>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[120px]">Updated</th>
                                                            {userRole === 'ADMIN' && (
                                                                <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[80px]">Actions</th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredTemplates.map((template) => (
                                                            <tr
                                                                key={template._id}
                                                                className="hover:bg-base-200 transition-colors cursor-pointer"
                                                                onClick={() => handleTemplateClick(template)}
                                                            >
                                                                <td className="text-base-content text-sm lg:text-base font-medium">{template.templateName}</td>
                                                                <td className="text-base-content text-sm lg:text-base">{getClassNames(template.classIds)}</td>
                                                                <td className="text-base-content text-sm lg:text-base">{formatDate(template.updatedAt)}</td>
                                                                {userRole === 'ADMIN' && (
                                                                    <td onClick={(e) => e.stopPropagation()}>
                                                                        <div className="flex gap-1 justify-center">
                                                                            <Link href={`/manage-admitCard/add?id=${template._id}`}>
                                                                                <Button className="btn btn-ghost btn-sm hover:bg-info/10" title="Edit Template">
                                                                                    <Edit className="w-4 h-4 text-info" />
                                                                                </Button>
                                                                            </Link>
                                                                            <Button
                                                                                className="btn btn-ghost btn-sm hover:bg-error/10"
                                                                                onClick={(e) => handleDeleteClick(template._id)}
                                                                                title="Delete Template"
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
                                    <FileText className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50 text-base-content/30" />
                                    <p className="text-base sm:text-lg font-medium mb-2 text-base-content/50">
                                        {searchTerm ? 'No templates found' : 'No templates available'}
                                    </p>
                                    <p className="text-xs sm:text-sm text-base-content/40 text-center px-4">
                                        {searchTerm
                                            ? 'Try adjusting your search terms'
                                            : userRole === 'ADMIN'
                                                ? 'Click "Add New Template" to get started'
                                                : 'Templates will appear here once added'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Large Desktop: Full width layout */}
            <div className="hidden xl:block h-full">
                <div className="bg-base-300 border border-base-content/20 rounded-lg shadow-xl h-full w-full flex flex-col overflow-hidden">
                    <div className="p-6 xl:p-8 flex-shrink-0">
                        {/* Header */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center">
                                <h1 className="text-2xl xl:text-3xl font-bold text-base-content mb-6">
                                    Admit Card Template
                                </h1>
                            </div>

                            {/* Navigation Tabs */}
                            <div className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
                                {/* Sliding Background Indicator */}
                                <div
                                    className={`absolute top-1 bottom-1 rounded-lg bg-base-100 shadow-sm transition-all duration-300 ease-in-out ${pathname === '/manage-admitCard'
                                        ? 'left-1 right-1/2 mr-1.5'
                                        : 'left-1/2 right-1 ml-1.5'
                                        }`}
                                />

                                <button
                                    onClick={() => router.push('/manage-admitCard')}
                                    className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/manage-admitCard'
                                        ? 'text-emerald-600'
                                        : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                >
                                    <FileText className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium truncate">Admit Cards</span>
                                </button>
                                <button
                                    onClick={() => router.push('/manage-marksheet')}
                                    className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/manage-marksheet'
                                        ? 'text-rose-700'
                                        : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                >
                                    <BookOpen className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium truncate">Marksheets</span>
                                </button>
                            </div>

                            {/* Search and Add Button */}
                            <div className="flex gap-6 justify-between items-center">
                                <div className="relative flex-1 max-w-lg">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search admit card templates"
                                        className="input input-bordered w-full pl-10 bg-base-100 text-base-content"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {userRole === 'ADMIN' && (
                                    <Link href="/manage-admitCard/add">
                                        <Button variant="primary" outline className="px-6">
                                            <Plus className="w-5 h-5 mr-2" />
                                            Add New Template
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
                                <p className="text-base-content text-lg">Loading admit card templates...</p>
                            </div>
                        ) : filteredTemplates.length > 0 ? (
                            <div className="border border-base-300 rounded-lg bg-base-100 h-full flex flex-col overflow-hidden">
                                <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                    <table className="table w-full">
                                        <thead className="bg-base-200 sticky top-0 z-0">
                                            <tr>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[250px]">Template Name</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[250px]">Classes</th>
                                                {userRole === 'ADMIN' && (
                                                    <th className="text-base-content font-semibold text-sm lg:text-base min-w-[100px] text-center">Actions</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTemplates.map((template) => (
                                                <tr
                                                    key={template._id}
                                                    className="hover:bg-base-200 transition-colors cursor-pointer"
                                                    onClick={() => handleTemplateClick(template)}
                                                >
                                                    <td className="text-base-content font-medium py-4">{template.templateName}</td>
                                                    <td className="text-base-content py-4">Class {getClassNames(template.classIds)}</td>
                                                    {userRole === 'ADMIN' && (
                                                        <td className="py-4" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex gap-2 justify-center">
                                                                <Link href={`/manage-admitCard/add?id=${template._id}`}>
                                                                    <Button className="btn btn-ghost btn-sm hover:bg-info/10 px-3" title="Edit Template">
                                                                        <Edit className="w-4 h-4 text-info" />
                                                                    </Button>
                                                                </Link>
                                                                <Button
                                                                    className="btn btn-ghost btn-sm hover:bg-error/10 px-3"
                                                                    onClick={(e) => handleDeleteClick(template._id)}
                                                                    title="Delete Template"
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
                                <FileText className="w-20 h-20 mb-6 opacity-30 text-base-content/30" />
                                <h3 className="text-xl font-semibold text-base-content/50 mb-3">No templates found</h3>
                                <p className="text-base text-base-content/40 text-center max-w-lg">
                                    {searchTerm
                                        ? 'Try adjusting your search terms to find the template you\'re looking for'
                                        : userRole === 'ADMIN'
                                            ? 'Get started by adding your first admit card template to the system'
                                            : 'Templates will appear here once they are added to the system'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ModalPopup
                isOpen={isDeleteModalOpen}
                onClose={handleDeleteCancel}
                message="Are you sure you want to delete this template? This action cannot be undone."
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
                onConfirm={handleDeleteConfirm}
                confirmButtonColor="bg-red-600"
            />

            {/* Template Details Modal */}
            {isDetailsModalOpen && <AdmitCardDetailsModal />}
        </div>
    );
}