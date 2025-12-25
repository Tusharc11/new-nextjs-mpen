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

interface MarksheetTemplate {
    _id: string;
    templateName: string;
    classIds: string[];
    reportCardDetails?: {
        heading: string;
        logoBase64: string;
    };
    studentDetailsConfig?: {
        fields: string[];
    };
    examConfigs: any[];
    marksheetCards: any[];
    createdAt: string;
    updatedAt: string;
}

interface Class {
    _id: string;
    classNumber: string;
}

export default function ManageMarksheetPage() {
    const router = useRouter();
    const pathname = usePathname();
    const [searchTerm, setSearchTerm] = useState('');
    const [templates, setTemplates] = useState<MarksheetTemplate[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [classes, setClasses] = useState<Class[]>([]);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<MarksheetTemplate | null>(null);

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
                const templatesResponse = await fetch('/api/manage-marksheet', { headers });
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
            const response = await fetch(`/api/manage-marksheet?templateId=${selectedTemplateId}`, {
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

    const handleTemplateClick = (template: MarksheetTemplate) => {
        setSelectedTemplate(template);
        setIsDetailsModalOpen(true);
    };

    const TemplateCard = ({ template }: { template: MarksheetTemplate }) => {
        return (
            <div
                className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-300/50 hover:border-base-300 rounded-lg overflow-hidden cursor-pointer"
                onClick={() => handleTemplateClick(template)}
            >
                <div className="card-body p-4">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                            <div className="avatar placeholder">
                                {template.reportCardDetails?.logoBase64 ? (
                                    <div className="bg-base-100 rounded-full w-10 h-10 shadow-sm border border-base-300 overflow-hidden">
                                        <img
                                            src={template.reportCardDetails.logoBase64.startsWith('data:')
                                                ? template.reportCardDetails.logoBase64
                                                : `data:image/png;base64,${template.reportCardDetails.logoBase64}`}
                                            alt="School Logo"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.innerHTML = `
                                                    <div class="bg-gradient-to-br from-primary to-primary-focus text-primary-content rounded-full w-10 h-10 shadow-sm flex items-center justify-center">
                                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                                        </svg>
                                                    </div>
                                                `;
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="bg-gradient-to-br from-primary to-primary-focus text-primary-content rounded-full w-10 h-10 shadow-sm">
                                        <span className="text-sm font-semibold">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-base-content text-sm sm:text-base leading-tight">
                                    {template.templateName}
                                </h3>
                                <p className="text-xs text-base-content/70">
                                    {getClassNames(template.classIds)}
                                </p>
                            </div>
                        </div>
                        {userRole === 'ADMIN' && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Link href={`/manage-marksheet/add?id=${template._id}`}>
                                    <button className="btn btn-ghost btn-xs sm:btn-sm hover:bg-info/10 transition-colors rounded-md">
                                        <Edit className="w-3 h-3 sm:w-4 sm:h-4 text-info" />
                                    </button>
                                </Link>
                                <button
                                    className="btn btn-ghost btn-xs sm:btn-sm hover:bg-error/10 transition-colors rounded-md"
                                    onClick={() => handleDeleteClick(template._id)}
                                >
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-error" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Template details */}
                    <div className="space-y-2.5">
                        <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                <BookOpen className="w-3.5 h-3.5 text-base-content/60" />
                            </div>
                            <span className="text-xs sm:text-sm text-base-content/80">
                                Cards: <span className="font-medium">{template.marksheetCards.length}</span>
                            </span>
                        </div>

                        <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                <FileText className="w-3.5 h-3.5 text-base-content/60" />
                            </div>
                            <span className="text-xs sm:text-sm text-base-content/80">
                                Exams: <span className="font-medium">{template.examConfigs.length}</span>
                            </span>
                        </div>

                        <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                <Calendar className="w-3.5 h-3.5 text-base-content/60" />
                            </div>
                            <span className="text-xs sm:text-sm text-base-content/80">
                                Updated: <span className="font-medium">{formatDate(template.updatedAt)}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const TemplateDetailsModal = () => {
        if (!selectedTemplate) return null;

        const { isExpanded } = useSidebarStore();

        // Sample student data for preview
        const sampleStudent = {
            fullName: 'Mayank Khurana',
            rollNumber: '001',
            studentId: 'ST2024001',
            dateOfBirth: '15/06/2008',
            fatherName: 'Rajesh Khurana',
            motherName: 'Manju Khurana',
            parentPhone: '+91 9876543210',
            address: '123 Main Street, City, State 12345',
            bloodGroup: 'O+',
            admissionDate: '01/04/2023',
            gender: 'Male',
            category: 'General'
        };

        // Sample academic data
        const sampleSubjects = [
            'Mathematics', 'English', 'Science', 'Social Studies', 'Hindi', 'Computer Science'
        ];

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
                                        <div className="bg-gradient-to-br from-primary to-secondary text-primary-content
                                                      rounded-md xs:rounded-lg sm:rounded-xl md:rounded-2xl lg:rounded-3xl
                                                      w-6 h-6 xs:w-8 xs:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12
                                                      lg:w-14 lg:h-14 xl:w-16 xl:h-16 shadow-lg">
                                            <FileText className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8" />
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <h2 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl
                                                     font-bold text-base-content leading-tight truncate">
                                            Report Card Preview
                                        </h2>
                                        <p className="text-xs xs:text-sm sm:text-base text-base-content/70 truncate">
                                            Template: {selectedTemplate.templateName}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1 xs:gap-1.5 sm:gap-2 flex-shrink-0">
                                    {userRole === 'ADMIN' && (
                                        <Link href={`/manage-marksheet/add?id=${selectedTemplate._id}`}>
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
                                {/* Report Card Preview */}
                                <div className="bg-base-100 border-2 border-base-300 rounded-lg overflow-hidden shadow-lg">
                                    <div className="bg-primary text-primary-content p-4">
                                        <h4 className="text-lg font-bold text-center">Report Card Preview</h4>
                                    </div>
                                    <div className="p-6">
                                        {/* Header Section */}
                                        <div className="text-center mb-6">
                                            {selectedTemplate.reportCardDetails?.logoBase64 && selectedTemplate.reportCardDetails.logoBase64.trim() ? (
                                                <div className="flex justify-center mb-4">
                                                    <img
                                                        src={selectedTemplate.reportCardDetails.logoBase64.startsWith('data:')
                                                            ? selectedTemplate.reportCardDetails.logoBase64
                                                            : `data:image/png;base64,${selectedTemplate.reportCardDetails.logoBase64}`}
                                                        alt="School Logo"
                                                        className="h-16 w-auto object-contain"
                                                        onError={(e) => {
                                                            console.error('Failed to load logo preview:', selectedTemplate.reportCardDetails?.logoBase64);
                                                            // Hide the broken image
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            ) : null}
                                            <h1 className="text-2xl font-bold text-base-content mb-2">
                                                {selectedTemplate.reportCardDetails?.heading || 'SCHOOL REPORT CARD'}
                                            </h1>
                                            <div className="border-b-2 border-primary w-32 mx-auto"></div>
                                        </div>

                                        {/* Student Information Card */}
                                        {selectedTemplate.studentDetailsConfig?.fields &&
                                            selectedTemplate.studentDetailsConfig.fields.length > 0 && (
                                                <div className="mb-6">
                                                    <h2 className="text-lg font-semibold text-base-content mb-3 border-b border-base-300 pb-1">
                                                        Student Information
                                                    </h2>
                                                    <div className="bg-base-200 rounded-lg p-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            <div className="text-sm">
                                                                <span className="font-medium text-base-content/70">Class:</span>
                                                                <span className="ml-2 text-base-content">10 A</span>
                                                            </div>
                                                            {selectedTemplate.studentDetailsConfig.fields
                                                                .map(fieldId => {
                                                                    const fieldLabels: { [key: string]: string } = {
                                                                        fullName: 'Full Name',
                                                                        dateOfBirth: 'Date of Birth',
                                                                        parentPhone: 'Parent Phone',
                                                                        address: 'Address',
                                                                        bloodGroup: 'Blood Group',
                                                                        gender: 'Gender',
                                                                        rollNumber: 'Roll Number',
                                                                        studentId: 'Student ID',
                                                                        fatherName: 'Father Name',
                                                                        motherName: 'Mother Name',
                                                                        admissionDate: 'Admission Date',
                                                                        category: 'Category'
                                                                    };
                                                                    const label = fieldLabels[fieldId] || fieldId;
                                                                    return (
                                                                        <div key={fieldId} className="text-sm">
                                                                            <span className="font-medium text-base-content/70">{label}:</span>
                                                                            <span className="ml-2 text-base-content">
                                                                                {sampleStudent[fieldId as keyof typeof sampleStudent] || 'Sample Data'}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        {/* Exam Results */}
                                        {selectedTemplate.examConfigs && selectedTemplate.examConfigs.length > 0 && (
                                            <div className="mb-6">
                                                <h2 className="text-lg font-semibold text-base-content mb-3 border-b border-base-300 pb-1">
                                                    Academic Performance
                                                </h2>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full bg-base-200 rounded-lg overflow-hidden">
                                                        <thead className="bg-base-300">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-medium text-base-content">Subject</th>
                                                                {selectedTemplate.examConfigs.map(config => (
                                                                    <th key={config.id} className="px-4 py-2 text-center text-sm font-medium text-base-content">
                                                                        {config.examTypeName}
                                                                        <br />
                                                                        <span className="text-xs opacity-70">({config.weightage}%)</span>
                                                                    </th>
                                                                ))}
                                                                <th className="px-4 py-2 text-center text-sm font-medium text-base-content">Total</th>
                                                                <th className="px-4 py-2 text-center text-sm font-medium text-base-content">Grade</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {sampleSubjects.map((subject, index) => (
                                                                <tr key={subject} className={index % 2 === 0 ? 'bg-base-100' : 'bg-base-200'}>
                                                                    <td className="px-4 py-2 text-sm font-medium text-base-content">{subject}</td>
                                                                    {selectedTemplate.examConfigs.map((config, configIndex) => {
                                                                        const marks = 85 + Math.floor(Math.random() * 10) - 5;
                                                                        return (
                                                                            <td key={config.id} className="px-4 py-2 text-center text-sm text-base-content">
                                                                                {Math.max(0, Math.min(100, marks))}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                    <td className="px-4 py-2 text-center text-sm font-medium text-base-content">
                                                                        {Math.floor(80 + Math.random() * 15)}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-center text-sm font-medium">
                                                                        <span className={`px-2 py-1 rounded text-xs ${Math.floor(80 + Math.random() * 15) >= 90 ? 'bg-success text-success-content' :
                                                                            Math.floor(80 + Math.random() * 15) >= 75 ? 'bg-warning text-warning-content' :
                                                                                'bg-error text-error-content'
                                                                            }`}>
                                                                            {Math.floor(80 + Math.random() * 15) >= 90 ? 'A' :
                                                                                Math.floor(80 + Math.random() * 15) >= 75 ? 'B' : 'C'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Custom Cards */}
                                        {selectedTemplate.marksheetCards && selectedTemplate.marksheetCards.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {selectedTemplate.marksheetCards.map((card, cardIndex) => (
                                                    <div key={card.id}>
                                                        <h2 className="text-lg font-semibold text-base-content mb-3 border-b border-base-300 pb-1">
                                                            {card.heading}
                                                        </h2>
                                                        {card.subHeading && (
                                                            <div className="mb-3">
                                                                <p className="text-base-content/70 text-sm">{card.subHeading}</p>
                                                            </div>
                                                        )}
                                                        <div className="bg-base-200 rounded-lg overflow-hidden border border-base-300">
                                                            <table className="w-full border-collapse">
                                                                <thead>
                                                                    <tr className="bg-base-300 border-b border-base-300">
                                                                        <th className="px-4 py-3 text-left text-sm font-medium text-base-content border-r border-base-300">Area</th>
                                                                        <th className="px-4 py-3 text-left text-sm font-medium text-base-content">Grade</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {card.fields.filter((f: string) => f.trim()).map((field: string, fieldIndex: number) => (
                                                                        <tr key={fieldIndex} className={`${fieldIndex % 2 === 0 ? 'bg-base-100' : 'bg-base-200'} border-b border-base-300`}>
                                                                            <td className="px-4 py-3 text-sm font-medium text-base-content/70 border-r border-base-300">
                                                                                {field}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-sm text-base-content">
                                                                                {field.toLowerCase().includes('remark') ? 'Excellent performance and consistent improvement' :
                                                                                    field.toLowerCase().includes('grade') ? 'A' :
                                                                                        field.toLowerCase().includes('rank') ? `${cardIndex * 3 + fieldIndex + 1}` :
                                                                                            field.toLowerCase().includes('attendance') ? '95%' :
                                                                                                field.toLowerCase().includes('conduct') ? 'Excellent' :
                                                                                                    field.toLowerCase().includes('participation') ? 'Very Active' :
                                                                                                        field.toLowerCase().includes('homework') ? 'Always Submitted' :
                                                                                                            'A+'}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Footer */}
                                        <div className="mt-8 pt-4 border-t border-base-300">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm text-base-content">
                                                <div>
                                                    <p className="font-medium">Principal's Signature</p>
                                                    <div className="mt-4 border-b border-base-400 w-32 mx-auto"></div>
                                                    <p className="mt-1">Mr. Aman Verma</p>
                                                </div>
                                                <div>
                                                    <p className="font-medium">Class Teacher's Signature</p>
                                                    <div className="mt-4 border-b border-base-400 w-32 mx-auto"></div>
                                                    <p className="mt-1">Ms. Priya Sharma</p>
                                                </div>
                                                <div>
                                                    <p className="font-medium">Date of Issue</p>
                                                    <p className="mt-4 font-medium text-base-content">{new Date().toLocaleDateString()}</p>
                                                </div>
                                            </div>
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
                                    Marksheet Template
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
                                        placeholder="Search marksheet templates"
                                        className="input input-bordered w-full pl-9 sm:pl-10 bg-base-100 text-base-content text-sm sm:text-base"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {userRole === 'ADMIN' && (
                                    <Link href="/manage-marksheet/add">
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
                                    <p className="text-base-content text-sm sm:text-base">Loading marksheet templates...</p>
                                </div>
                            ) : filteredTemplates.length > 0 ? (
                                <>
                                    {/* Mobile Card Layout */}
                                    <div className="block md:hidden h-full">
                                        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                            <div className="space-y-3 sm:space-y-4 pb-4">
                                                {filteredTemplates.map((template) => (
                                                    <TemplateCard key={template._id} template={template} />
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
                                                                            <Link href={`/manage-marksheet/add?id=${template._id}`}>
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
                                    Marksheet Template
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
                                        placeholder="Search marksheet templates"
                                        className="input input-bordered w-full pl-10 bg-base-100 text-base-content"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {userRole === 'ADMIN' && (
                                    <Link href="/manage-marksheet/add">
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
                                <p className="text-base-content text-lg">Loading marksheet templates...</p>
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
                                                                <Link href={`/manage-marksheet/add?id=${template._id}`}>
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
                                            ? 'Get started by adding your first marksheet template to the system'
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
            {isDetailsModalOpen && <TemplateDetailsModal />}
        </div>
    );
}