'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, ChevronLeft, Save, Loader2, Upload, Plus, X, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import toast from 'react-hot-toast';
import Image from 'next/image';
import bookLoader1 from '@/public/book1.gif';
import imageCompression from 'browser-image-compression';

interface Session {
    _id: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
}

interface Class {
    _id: string;
    classNumber: number;
}

interface AcademicSelection {
    templateName: string;
    classIds: string[];
}

interface ReportCardDetails {
    heading: string;
    logoBase64: string;
}

interface StudentField {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
}
interface StudentDetailsConfig {
    fields: StudentField[];
}
interface ExamType {
    _id: string;
    type: string;
    description?: string;
    isActive: boolean;
}
interface ExamConfig {
    id: string;
    examTypeId: string;
    examTypeName: string;
    occursIn: 'periodically' | 'yearly' | '';
    subjectWiseTestCount: number | '';
    weightage: number;
}


interface MarksheetCard {
    id: string;
    heading: string;
    subHeading: string;
    fields: string[];
}


function ManageMarksheetAddForm() {

    const [currentStep, setCurrentStep] = useState(1);

    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const templateId = searchParams.get('id');
    const isEditMode = !!templateId;
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [academicSelection, setAcademicSelection] = useState<AcademicSelection>({
        templateName: '',
        classIds: []
    });

    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [classesDropdownOpen, setClassesDropdownOpen] = useState(false);
    const [classesFieldTouched, setClassesFieldTouched] = useState(false);
    const classesDropdownRef = useRef<HTMLDivElement>(null);

    // Step 2 data - Report Card Details
    const [reportCardDetails, setReportCardDetails] = useState<ReportCardDetails>({
        heading: '',
        logoBase64: ''
    });
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Step 3 data - Student Details Configuration
    // Function to get student fields from database models
    const getStudentFieldsFromModels = (): StudentField[] => {
        // Fields from User model
        const userFields: StudentField[] = [
            { id: 'fullName', label: 'Full Name', description: 'Student\'s complete name (First + Last)', enabled: true },
            { id: 'dateOfBirth', label: 'Date of Birth', description: 'Student\'s birth date', enabled: false },
            { id: 'parentPhone', label: 'Parent Phone Number', description: 'Primary contact number', enabled: false },
            { id: 'address', label: 'Address', description: 'Student\'s residential address', enabled: false },
            { id: 'bloodGroup', label: 'Blood Group', description: 'Student\'s blood group', enabled: false },
            { id: 'gender', label: 'Gender', description: 'Student\'s gender', enabled: false }
        ];
        // Fields from StudentClass model
        const studentClassFields: StudentField[] = [
            { id: 'rollNumber', label: 'Roll Number', description: 'Student\'s class roll number', enabled: true },
            { id: 'studentId', label: 'Student ID', description: 'Unique student identification number', enabled: false }
        ];
        // Combine all fields from both models
        return [...userFields, ...studentClassFields];
    };
    const [studentDetailsConfig, setStudentDetailsConfig] = useState<StudentDetailsConfig>({
        fields: getStudentFieldsFromModels()
    });
    // Step 4 data - Exam Configuration
    const [examTypes, setExamTypes] = useState<ExamType[]>([]);
    const [examConfigs, setExamConfigs] = useState<ExamConfig[]>([]);


    // Step 5 data - Marksheet Card Configuration
    const [marksheetCards, setMarksheetCards] = useState<MarksheetCard[]>([]);

    // Fetch exam types on component mount
    useEffect(() => {
        fetchExamTypes();
    }, []);

    // Fetch classes when needed
    useEffect(() => {
        fetchClasses();
    }, []);

    // Fetch existing template data when in edit mode
    useEffect(() => {
        if (isEditMode && templateId) {
            fetchTemplateData(templateId);
        }
    }, [isEditMode, templateId]);

    // Ensure logo preview is set when reportCardDetails changes
    useEffect(() => {
        if (reportCardDetails.logoBase64 && !logoPreview) {
            const logoPreviewUrl = reportCardDetails.logoBase64.startsWith('data:')
                ? reportCardDetails.logoBase64
                : `data:image/png;base64,${reportCardDetails.logoBase64}`;
            setLogoPreview(logoPreviewUrl);
        }
    }, [reportCardDetails.logoBase64, logoPreview]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (classesDropdownRef.current && !classesDropdownRef.current.contains(event.target as Node)) {
                setClassesDropdownOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const fetchClasses = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Authentication required');
                return;
            }

            const response = await fetch('/api/classes', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setClasses(data);
            } else {
                toast.error('Failed to fetch classes');
            }
        } catch (error) {
            toast.error('Error fetching classes');
        }
    };

    // Handle class selection
    const handleClassChange = (classId: string) => {
        // Mark classes field as touched on first interaction
        const wasUntouched = !classesFieldTouched;
        if (wasUntouched) {
            setClassesFieldTouched(true);
        }

        setSelectedClasses(prev => {
            const newSelection = prev.includes(classId)
                ? prev.filter(id => id !== classId)
                : [...prev, classId];

            // Update academic selection
            setAcademicSelection(prev => ({
                ...prev,
                classIds: newSelection
            }));
            return newSelection;
        });
    };

    // Handle logo upload
    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Check file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }
        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size should be less than 5MB');
            return;
        }

        try {
            // Compress the image
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1024,
                useWebWorker: true
            };

            setUploadingLogo(true);
            const compressedFile = await imageCompression(file, options);

            // Create preview and store base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setLogoPreview(base64String);
                setReportCardDetails({
                    ...reportCardDetails,
                    logoBase64: base64String
                });
                setUploadingLogo(false);
            };

            reader.readAsDataURL(compressedFile);
        } catch (error) {
            toast.error('Failed to process logo');
            setUploadingLogo(false);
        }
    };

    const fetchExamTypes = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Authentication required');
                return;
            }

            const response = await fetch('/api/examType', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setExamTypes(data);
            } else {
                toast.error('Failed to fetch exam types');
            }
        } catch (error) {
            toast.error('Error fetching exam types');
        }
    };

    const fetchTemplateData = async (id: string) => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                toast.error('Authentication required');
                return;
            }

            const response = await fetch(`/api/manage-marksheet?templateId=${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.templates && data.templates.length > 0) {
                    const template = data.templates[0];
                    setEditingTemplate(template);

                    // Populate all form fields with existing data
                    const classIds = Array.isArray(template.classIds) ? template.classIds : [];
                    setAcademicSelection({
                        templateName: template.templateName || '',
                        classIds: classIds
                    });
                    setSelectedClasses(classIds);

                    if (template.reportCardDetails) {
                        const logoBase64 = template.reportCardDetails.logoBase64 || '';
                        setReportCardDetails({
                            heading: template.reportCardDetails.heading || '',
                            logoBase64: logoBase64
                        });
                        if (logoBase64) {
                            // Check if the base64 string already contains the data URL prefix
                            const logoPreviewUrl = logoBase64.startsWith('data:')
                                ? logoBase64
                                : `data:image/png;base64,${logoBase64}`;
                            setLogoPreview(logoPreviewUrl);
                        }
                    }

                    if (template.studentDetailsConfig?.fields) {
                        // Convert string array to StudentField objects
                        const studentFields = getStudentFieldsFromModels();
                        const enabledFieldIds = template.studentDetailsConfig.fields;
                        const updatedFields = studentFields.map(field => ({
                            ...field,
                            enabled: enabledFieldIds.includes(field.id)
                        }));
                        setStudentDetailsConfig({
                            fields: updatedFields
                        });
                    }

                    if (template.examConfigs) {
                        setExamConfigs(template.examConfigs.map((config: any) => ({
                            ...config,
                            occursIn: config.occursIn || '',
                            subjectWiseTestCount: config.subjectWiseTestCount || '',
                            weightage: config.weightage || 0
                        })));
                    }

                    if (template.marksheetCards) {
                        setMarksheetCards(template.marksheetCards);
                    }
                } else {
                    toast.error('Template not found');
                    router.push('/manage-marksheet');
                }
            } else {
                toast.error('Failed to fetch template data');
                router.push('/manage-marksheet');
            }
        } catch (error) {
            toast.error('Error fetching template data');
            router.push('/manage-marksheet');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle adding new exam config
    const addExamConfig = (examTypeId: string, examTypeName: string) => {
        const newId = `exam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newConfig: ExamConfig = {
            id: newId,
            examTypeId,
            examTypeName,
            occursIn: '',
            subjectWiseTestCount: '',
            weightage: 0
        };
        setExamConfigs([...examConfigs, newConfig]);
    };

    // Handle removing exam config
    const removeExamConfig = (id: string) => {
        setExamConfigs(examConfigs.filter(config => config.id !== id));
    };

    // Handle updating exam config
    const updateExamConfig = (id: string, updates: Partial<ExamConfig>) => {
        setExamConfigs(examConfigs.map(config =>
            config.id === id ? { ...config, ...updates } : config
        ));
    };

    // Handle adding new marksheet card
    const addMarksheetCard = () => {
        const newId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newCard: MarksheetCard = {
            id: newId,
            heading: '',
            subHeading: '',
            fields: ['']
        };
        setMarksheetCards([...marksheetCards, newCard]);
    };

    // Handle removing marksheet card
    const removeMarksheetCard = (id: string) => {
        setMarksheetCards(marksheetCards.filter(card => card.id !== id));
    };

    // Handle updating marksheet card
    const updateMarksheetCard = (id: string, updates: Partial<MarksheetCard>) => {
        setMarksheetCards(marksheetCards.map(card =>
            card.id === id ? { ...card, ...updates } : card
        ));
    };

    // Handle updating card fields
    const updateCardField = (cardId: string, fieldIndex: number, value: string) => {
        setMarksheetCards(marksheetCards.map(card => {
            if (card.id === cardId) {
                const newFields = [...card.fields];
                newFields[fieldIndex] = value;
                return { ...card, fields: newFields };
            }
            return card;
        }));
    };

    // Handle adding field to card
    const addCardField = (cardId: string) => {
        setMarksheetCards(marksheetCards.map(card => {
            if (card.id === cardId) {
                return { ...card, fields: [...card.fields, ''] };
            }
            return card;
        }));
    };

    // Handle removing field from card
    const removeCardField = (cardId: string, fieldIndex: number) => {
        setMarksheetCards(marksheetCards.map(card => {
            if (card.id === cardId) {
                const newFields = card.fields.filter((_, index) => index !== fieldIndex);
                return { ...card, fields: newFields.length === 0 ? [''] : newFields };
            }
            return card;
        }));
    };

    // Handle student field toggle
    const handleStudentFieldToggle = (fieldId: string) => {
        setStudentDetailsConfig(prev => ({
            ...prev,
            fields: prev.fields.map(field =>
                field.id === fieldId
                    ? { ...field, enabled: !field.enabled }
                    : field
            )
        }));
    };

    // Toggle all student fields
    const handleToggleAllFields = (enable: boolean) => {
        setStudentDetailsConfig(prev => ({
            ...prev,
            fields: prev.fields.map(field => ({ ...field, enabled: enable }))
        }));
    };

    const handleNextStep = () => {
        // Validate step 1 (Template Name & Class)
        if (currentStep === 1) {
            if (!academicSelection.templateName.trim() || academicSelection.classIds.length === 0) {
                toast.error('Please enter Template Name and select at least one Class');
                return;
            }
        }
        // Validate step 2 (Report Card Details)
        else if (currentStep === 2) {
            if (!reportCardDetails.heading.trim()) {
                toast.error('Please enter a report card heading');
                return;
            }
            if (!reportCardDetails.logoBase64) {
                toast.error('Please upload a logo image');
                return;
            }
        }

        // Validate step 3 (Student Details Configuration)
        else if (currentStep === 3) {
            const enabledFields = studentDetailsConfig.fields.filter(field => field.enabled);
            if (enabledFields.length === 0) {
                toast.error('Please select at least one student detail to display');
                return;
            }
        }

        // Validate step 4 (Exam Configuration)
        else if (currentStep === 4) {
            if (examConfigs.length === 0) {
                toast.error('Please add at least one exam configuration');
                return;
            }

            // Validate each exam config
            for (const config of examConfigs) {
                if (!config.occursIn) {
                    toast.error(`Please select frequency for ${config.examTypeName}`);
                    return;
                }
                if (!config.weightage || config.weightage === 0) {
                    toast.error(`Please enter weightage for ${config.examTypeName}`);
                    return;
                }
                if (typeof config.weightage === 'number' && config.weightage > 100) {
                    toast.error(`Weightage for ${config.examTypeName} cannot exceed 100%`);
                    return;
                }
                if (config.occursIn === 'periodically' && config.subjectWiseTestCount !== '' &&
                    typeof config.subjectWiseTestCount === 'number' && config.subjectWiseTestCount <= 0) {
                    toast.error(`Test count for ${config.examTypeName} must be greater than 0`);
                    return;
                }
            }

            // Check total weightage equals exactly 100%
            const totalWeightage = examConfigs.reduce((sum, config) => {
                return sum + (typeof config.weightage === 'number' ? config.weightage : 0);
            }, 0);

            if (totalWeightage !== 100) {
                toast.error(`Total weightage must be exactly 100%. Current total: ${totalWeightage}%`);
                return;
            }
        }

        // Validate step 5 (Marksheet Card Configuration)
        else if (currentStep === 5) {
            if (marksheetCards.length === 0) {
                toast.error('Please add at least one marksheet card');
                return;
            }

            // Validate each card
            for (const card of marksheetCards) {
                if (!card.heading.trim()) {
                    toast.error(`Please enter a heading for card ${marksheetCards.indexOf(card) + 1}`);
                    return;
                }

                // Check if all fields have values (at least one field must have content)
                const hasValidField = card.fields.some(field => field.trim());
                if (!hasValidField) {
                    toast.error(`Please enter at least one field name for card "${card.heading}"`);
                    return;
                }
            }
        }


        if (currentStep < 6) {

            setCurrentStep(currentStep + 1);

        }

    };



    const handlePrevStep = () => {

        if (currentStep > 1) {

            setCurrentStep(currentStep - 1);

        }

    };

    const handleSaveMarksheet = async () => {
        try {
            setIsLoading(true);

            // Validate required data
            if (!academicSelection.templateName.trim() || academicSelection.classIds.length === 0) {
                toast.error('Please enter Template Name and select at least one Class');
                return;
            }

            if (marksheetCards.length === 0) {
                toast.error('Please add at least one marksheet card');
                return;
            }

            // Validate marksheet cards
            for (const card of marksheetCards) {
                if (!card.heading.trim()) {
                    toast.error(`Please enter a heading for card ${marksheetCards.indexOf(card) + 1}`);
                    return;
                }
                const hasValidField = card.fields.some(field => field.trim());
                if (!hasValidField) {
                    toast.error(`Please enter at least one field name for card "${card.heading}"`);
                    return;
                }
            }

            // Prepare the data to send to API
            const marksheetData = {
                academicSelection,
                reportCardDetails,
                studentDetailsConfig: {
                    fields: studentDetailsConfig.fields
                        .filter(field => field.enabled)
                        .map(field => field.id)
                },
                examConfigs,
                marksheetCards,
                templateName: academicSelection.templateName.trim()
            };

            // Make API call to save/update the marksheet template
            const apiUrl = isEditMode ? `/api/manage-marksheet?templateId=${templateId}` : '/api/manage-marksheet';
            const requestBody = isEditMode ? { templateId, ...marksheetData } : marksheetData;

            const response = await fetch(apiUrl, {
                method: isEditMode ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success(isEditMode ? 'Marksheet template updated successfully!' : 'Marksheet template saved successfully!');
                router.push('/manage-marksheet');
            } else {
                throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'save'} marksheet template`);
            }

        } catch (error) {
            console.error('Error saving marksheet template:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save marksheet template');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col w-full p-6 bg-base-100 min-h-screen">
            <div className="container mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 max-w-full">
                <div className="bg-base-300 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-base-content/20">
                    <div className="p-3 sm:p-4 lg:p-6 xl:p-8">
                        <div className="flex-shrink-0">
                            <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold mb-2 text-base-content">
                                {isEditMode ? 'Edit Marksheet Template' : 'Create Marksheet'}
                            </h2>
                            <p className="text-sm sm:text-base text-base-content/70 mb-4 sm:mb-6">
                                Add marks for students in a structured way
                            </p>
                            {/* Stepper */}
                            <div className="w-full mb-6 sm:mb-8">
                                <div className="bg-base-100 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md border border-base-content/30">
                                    <ul className="steps w-full">
                                        <li className={`text-base-content step text-xs sm:text-sm ${currentStep >= 1 ? 'step-primary' : ''}`}>
                                            <span className="hidden sm:inline">Template Name & Class</span>
                                            <span className="sm:hidden">Template</span>
                                        </li>
                                        <li className={`text-base-content step text-xs sm:text-sm ${currentStep >= 2 ? 'step-primary' : ''}`}>
                                            <span className="hidden sm:inline">Heading and Logo</span>
                                            <span className="sm:hidden">Heading</span>
                                        </li>
                                        <li className={`text-base-content step text-xs sm:text-sm ${currentStep >= 3 ? 'step-primary' : ''}`}>
                                            <span className="hidden sm:inline">Student Details</span>
                                            <span className="sm:hidden">Details</span>
                                        </li>
                                        <li className={`text-base-content step text-xs sm:text-sm ${currentStep >= 4 ? 'step-primary' : ''}`}>
                                            <span className="hidden sm:inline">Exam Configuration</span>
                                            <span className="sm:hidden">Exam</span>
                                        </li>
                                        <li className={`text-base-content step text-xs sm:text-sm ${currentStep >= 5 ? 'step-primary' : ''}`}>
                                            <span className="hidden sm:inline">Marksheet Layout</span>
                                            <span className="sm:hidden">Layout</span>
                                        </li>
                                        <li className={`text-base-content step text-xs sm:text-sm ${currentStep >= 6 ? 'step-primary' : ''}`}>
                                            <span className="hidden sm:inline">Review & Submit</span>
                                            <span className="sm:hidden">Review</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            {/* Step Content */}
                            <div className="space-y-6">

                                {/* Step 1: Academic Year & Class Selection */}
                                {currentStep === 1 && (
                                    <div className="bg-base-100 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 shadow-sm">

                                        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-base-content flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center text-sm font-bold">1</div>
                                            Template Name & Class Selection
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                            {/* Template Name Input */}
                                            <div className="form-control w-full">
                                                <label className="label">
                                                    <span className="label-text text-sm sm:text-base font-medium text-base-content">
                                                        Template Name<span className="text-red-500">*</span>
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={academicSelection.templateName}
                                                        onChange={(e) => setAcademicSelection({ ...academicSelection, templateName: e.target.value })}
                                                        className="input input-bordered w-full bg-base-100 text-base-content focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                                                        placeholder="Enter template name"
                                                    />
                                                </div>
                                            </div>

                                            {/* Classes Multi-Select Dropdown */}
                                            <div className="form-control w-full relative" ref={classesDropdownRef}>
                                                <label className="label">
                                                    <span className="label-text text-sm sm:text-base font-medium text-base-content">
                                                        Classes<span className="text-red-500">*</span>
                                                    </span>
                                                </label>
                                                <div
                                                    className="select select-bordered w-full bg-base-100 text-base-content cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                                                    onClick={() => {
                                                        // Mark field as touched when dropdown is opened
                                                        const wasUntouched = !classesFieldTouched;
                                                        if (wasUntouched) {
                                                            setClassesFieldTouched(true);
                                                        }
                                                        setClassesDropdownOpen(!classesDropdownOpen);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 p-2 min-h-[2.5rem] overflow-hidden">
                                                        {selectedClasses.length === 0 ? (
                                                            <span className="text-base-content/50">
                                                                Select classes
                                                            </span>
                                                        ) : (
                                                            <>
                                                                {selectedClasses.slice(0, 3).map(id => {
                                                                    const classItem = classes.find(c => c._id === id);
                                                                    return classItem ? (
                                                                        <div key={id} className="badge badge-primary h-7 px-3 flex items-center gap-1 flex-shrink-0">
                                                                            Class {classItem.classNumber}
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-xs btn-ghost btn-circle"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleClassChange(id);
                                                                                }}
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div key={id} className="badge badge-warning h-7 px-3 flex items-center gap-1 flex-shrink-0">
                                                                            Unknown Class (ID: {id.substring(0, 8)}...)
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-xs btn-ghost btn-circle"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleClassChange(id);
                                                                                }}
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {selectedClasses.length > 3 && (
                                                                    <div className="badge badge-primary h-7 px-3 flex-shrink-0">
                                                                        +{selectedClasses.length - 3} more
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {classesDropdownOpen && (
                                                    <div className="bg-base-100 mt-1 border border-base-300 rounded-md max-h-60 overflow-y-auto absolute w-full shadow-xl top-full left-0 z-50">
                                                        {classes.length > 0 ? (
                                                            classes.map((classItem) => {
                                                                return (
                                                                    <div
                                                                        key={classItem._id}
                                                                        className="p-2 cursor-pointer hover:bg-base-300"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleClassChange(classItem._id);
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="checkbox checkbox-sm checkbox-primary"
                                                                                checked={selectedClasses.includes(classItem._id)}
                                                                                onChange={() => { }}
                                                                            />
                                                                            <span className="text-base-content">Class {classItem.classNumber}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="p-2 text-base-content/50">
                                                                No classes available
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Heading and Logo */}

                                {currentStep === 2 && (
                                    <div className="bg-base-100 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 shadow-sm">
                                        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-base-content flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">2</div>
                                            Report Card Heading & Logo
                                        </h3>
                                        <p className="text-base-content/70 mb-6">Set the heading and upload a logo for your report card.</p>
                                        <div className="space-y-6 mt-6">
                                            {/* Report Card Heading */}
                                            <div className="form-control w-full">
                                                <label className="label">
                                                    <span className="label-text text-sm sm:text-base font-medium text-base-content">
                                                        Report Card Heading<span className="text-red-500">*</span>
                                                    </span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={reportCardDetails.heading}
                                                    onChange={(e) => setReportCardDetails({
                                                        ...reportCardDetails,
                                                        heading: e.target.value
                                                    })}
                                                    className="input input-bordered w-full bg-base-100 text-base-content text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                                                    required
                                                />
                                                <p className="text-xs text-base-content/70 mt-1">This will appear as the main heading on the report card</p>
                                            </div>
                                            {/* Logo Upload */}
                                            <div className="form-control w-full">
                                                <label className="label">
                                                    <span className="label-text text-sm sm:text-base font-medium text-base-content">
                                                        School/Institution Logo<span className="text-red-500">*</span>
                                                    </span>
                                                </label>
                                                {/* File Upload Area */}
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    <div className="relative group">
                                                        <div
                                                            className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-base-200 border-base-300 hover:bg-base-300 transition-colors"
                                                            onClick={() => fileInputRef.current?.click()}
                                                        >
                                                            {uploadingLogo ? (
                                                                <div className="flex flex-col items-center">
                                                                    <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                                                                    <span className="text-sm text-base-content">Processing...</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center">
                                                                    <Upload className="w-6 h-6 text-base-content mb-2" />
                                                                    <span className="text-sm text-base-content font-medium">Upload Logo</span>
                                                                    <span className="text-xs text-base-content/70 mt-1">Click to browse</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={handleLogoChange}
                                                        />
                                                    </div>
                                                    {/* Logo Preview */}
                                                    {logoPreview && (
                                                        <div className="relative bg-base-200 rounded-lg overflow-hidden">
                                                            <div className="flex items-center justify-center h-32 p-4">
                                                                <img
                                                                    src={logoPreview}
                                                                    alt="Logo Preview"
                                                                    className="max-w-full max-h-full object-contain"
                                                                    onError={(e) => {
                                                                        console.error('Failed to load logo preview in upload section:', logoPreview);
                                                                        // Hide the broken image
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="absolute top-2 right-2">
                                                                <Button
                                                                    outline
                                                                    variant='error'
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setLogoPreview(null);
                                                                        setReportCardDetails({
                                                                            ...reportCardDetails,
                                                                            logoBase64: ''
                                                                        });
                                                                        if (fileInputRef.current) {
                                                                            fileInputRef.current.value = '';
                                                                        }
                                                                    }}
                                                                    className="btn btn-sm btn-error"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-xs text-base-content/70 mt-2 space-y-1">
                                                    <p>• Supported formats: JPG & PNG</p>
                                                    <p>• Maximum file size: 5MB</p>
                                                    <p>• Recommended size: 200x200 pixels or higher</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Step 3: Student Details Configuration */}
                                {currentStep === 3 && (
                                    <div className="bg-base-100 p-6 rounded-lg">
                                        <h3 className="text-lg font-semibold mb-4 text-base-content">Step 3: Student Details Configuration</h3>
                                        <p className="text-base-content/70">Select which student details you want to display on the marksheet.</p>
                                        <div className="space-y-6 mt-6">
                                            {/* Header with bulk actions */}
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-base-300 rounded-lg">
                                                <div>
                                                    <h4 className="font-medium text-base-content">Available Student Fields</h4>
                                                    <p className="text-sm text-base-content/70">
                                                        {studentDetailsConfig.fields.filter(f => f.enabled).length} of {studentDetailsConfig.fields.length} fields selected
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        outline
                                                        variant='primary'
                                                        type="button"
                                                        onClick={() => handleToggleAllFields(true)}
                                                        className="btn btn-primary btn-sm hover:scale-105 transition-all duration-200"
                                                    >
                                                        Select All
                                                    </Button>

                                                    <Button
                                                        outline
                                                        variant='error'
                                                        type="button"
                                                        onClick={() => handleToggleAllFields(false)}
                                                        className="btn btn-ghost btn-sm hover:bg-base-200 transition-all duration-200"
                                                    >
                                                        Clear All
                                                    </Button>
                                                </div>
                                            </div>
                                            {/* Student fields grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {studentDetailsConfig.fields.map((field) => (
                                                    <div
                                                        key={field.id}
                                                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${field.enabled
                                                            ? 'border-primary bg-primary/5 hover:bg-primary/10'
                                                            : 'border-base-300 bg-base-100 hover:bg-base-200'
                                                            }`}
                                                        onClick={() => handleStudentFieldToggle(field.id)}
                                                    >
                                                        <div className="flex items-start space-x-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={field.enabled}
                                                                onChange={() => handleStudentFieldToggle(field.id)}
                                                                className="checkbox checkbox-primary mt-0.5"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <h5 className="font-medium text-base-content truncate">
                                                                    {field.label}
                                                                </h5>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Selected Fields section */}
                                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                                <h4 className="font-medium text-base-content mb-3 flex items-center">
                                                    <CheckCircle className="w-5 h-5 mr-2 text-primary" />
                                                    Selected Fields
                                                </h4>
                                                <div className="flex flex-wrap gap-2 flex-col px-1 sm:flex-row">
                                                    {studentDetailsConfig.fields
                                                        .filter(field => field.enabled)
                                                        .map(field => (
                                                            <span
                                                                key={field.id}
                                                                className="badge badge-primary h-7 px-3 bg-neutral/70 flex-shrink-0 text-xs font-medium text-base-content"
                                                                title={field.description}
                                                            >
                                                                {field.label}
                                                            </span>
                                                        ))
                                                    }
                                                    {studentDetailsConfig.fields.filter(f => f.enabled).length === 0 && (
                                                        <span className="text-sm text-base-content/50 italic">
                                                            No fields selected
                                                        </span>
                                                    )}
                                                </div>
                                                {studentDetailsConfig.fields.filter(f => f.enabled).length > 0 && (
                                                    <p className="text-xs text-base-content/70 mt-2">
                                                        These fields will appear for each student on the marksheet
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Step 4: Exam Configuration */}
                                {currentStep === 4 && (
                                    <div className="bg-base-100 p-6 rounded-lg">
                                        <h3 className="text-lg font-semibold mb-4 text-base-content">Step 4: Marks weightage Configuration</h3>
                                        <p className="text-base-content/70">Select exam types and configure their frequency and weightage settings.</p>
                                        <div className="space-y-6 mt-6">
                                            {/* Available Exam Types */}
                                            {examTypes.length > 0 && examConfigs.length < examTypes.length && (
                                                <div className="space-y-4">
                                                    <h4 className="font-medium text-base-content">Available Exam Types</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                        {examTypes
                                                            .filter(examType => !examConfigs.some(config => config.examTypeId === examType._id))
                                                            .map((examType) => (
                                                                <div
                                                                    key={examType._id}
                                                                    className="p-4 border border-base-300 rounded-lg hover:border-primary cursor-pointer transition-colors"
                                                                    onClick={() => addExamConfig(examType._id, examType.type)}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center space-x-3">
                                                                            <FileText className="w-5 h-5 text-primary" />
                                                                            <div>
                                                                                <h5 className="font-medium text-base-content">{examType.type}</h5>
                                                                                {examType.description && (
                                                                                    <p className="text-xs text-base-content/70">{examType.description}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <Plus className="w-5 h-5 text-primary" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Selected Exam Configurations */}
                                            {examConfigs.length > 0 && (
                                                <div className="space-y-4">
                                                    {examConfigs.map((config) => (
                                                        <div key={config.id} className="card bg-base-100 shadow-lg border">
                                                            <div className="card-body p-4">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <FileText className="w-5 h-5 text-primary" />
                                                                        <h5 className="text-lg font-semibold text-base-content">{config.examTypeName}</h5>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="error"
                                                                        outline
                                                                        onClick={() => removeExamConfig(config.id)}
                                                                        title={`Remove ${config.examTypeName}`}
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="space-y-4">
                                                                    {/* Frequency Selection */}
                                                                    <div className="form-control w-full">
                                                                        <label className="label">
                                                                            <span className="label-text text-sm font-medium text-base-content">
                                                                                Exam Frequency<span className="text-red-500">*</span>
                                                                            </span>
                                                                        </label>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                            <label className="label cursor-pointer justify-start bg-base-200 rounded-lg p-3 hover:bg-base-300 transition-colors">
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`occursIn_${config.id}`}
                                                                                    value="yearly"
                                                                                    checked={config.occursIn === 'yearly'}
                                                                                    onChange={(e) => updateExamConfig(config.id, {
                                                                                        occursIn: e.target.value as 'yearly',
                                                                                        subjectWiseTestCount: ''
                                                                                    })}
                                                                                    className="radio radio-primary mr-2"
                                                                                />
                                                                                <div>
                                                                                    <span className="label-text font-medium">Yearly</span>
                                                                                    <p className="text-xs text-base-content/70">Once per year</p>
                                                                                </div>
                                                                            </label>
                                                                            <label className="label cursor-pointer justify-start bg-base-200 rounded-lg p-3 hover:bg-base-300 transition-colors">
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`occursIn_${config.id}`}
                                                                                    value="periodically"
                                                                                    checked={config.occursIn === 'periodically'}
                                                                                    onChange={(e) => updateExamConfig(config.id, {
                                                                                        occursIn: e.target.value as 'periodically',
                                                                                        subjectWiseTestCount: ''
                                                                                    })}
                                                                                    className="radio radio-primary mr-2"
                                                                                />
                                                                                <div>
                                                                                    <span className="label-text font-medium">Periodically</span>
                                                                                    <p className="text-xs text-base-content/70">Multiple times</p>
                                                                                </div>
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                    {/* Conditional Test Count */}
                                                                    {config.occursIn === 'periodically' && (
                                                                        <div className="form-control w-full p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                                                            <label className="label">
                                                                                <span className="label-text text-sm font-medium text-base-content">
                                                                                    Subject-wise Test Count (Optional)
                                                                                </span>
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                value={config.subjectWiseTestCount}
                                                                                onChange={(e) => updateExamConfig(config.id, {
                                                                                    subjectWiseTestCount: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                                                                                })}
                                                                                className="input input-bordered w-full bg-base-100 text-base-content text-sm"
                                                                                placeholder="e.g., 2"
                                                                                min="1"
                                                                            />
                                                                            <p className="text-xs text-base-content/70 mt-1">
                                                                                How many best tests to consider. Leave blank for all tests.
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    {/* Weightage */}
                                                                    <div className="form-control w-full">
                                                                        <label className="label">
                                                                            <span className="label-text text-sm font-medium text-base-content">
                                                                                Weightage (%)<span className="text-red-500">*</span>
                                                                            </span>
                                                                        </label>
                                                                        <div className="relative">
                                                                            <input
                                                                                type="number"
                                                                                value={config.weightage}
                                                                                onChange={(e) => {
                                                                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                                                                    if (typeof value === 'number' && value <= 100) {
                                                                                        updateExamConfig(config.id, { weightage: value });
                                                                                    }
                                                                                }}
                                                                                className="input input-bordered w-full bg-base-100 text-base-content text-sm pr-12"
                                                                                placeholder="e.g., 40"
                                                                                min="1"
                                                                                max="100"
                                                                                required
                                                                            />
                                                                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/70">%</span>
                                                                        </div>
                                                                        {typeof config.weightage === 'number' && config.weightage > 100 && (
                                                                            <p className="text-xs text-error mt-1">Weightage cannot exceed 100%</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Summary */}
                                            {examConfigs.length > 0 && (() => {
                                                const totalWeightage = examConfigs.reduce((sum, config) =>
                                                    sum + (typeof config.weightage === 'number' ? config.weightage : 0)
                                                    , 0);
                                                const isValidWeightage = totalWeightage === 100;

                                                return (
                                                    <div className={`p-4 rounded-lg ${isValidWeightage ? 'bg-success/5 border border-success/20' : 'bg-warning/5 border border-warning/20'}`}>
                                                        <h4 className="font-medium text-base-content mb-3 flex items-center">
                                                            <svg className={`w-5 h-5 mr-2 ${isValidWeightage ? 'text-success' : 'text-warning'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            Marks Weightage Summary
                                                        </h4>
                                                        <div className="space-y-2 text-sm">
                                                            <p className="text-base-content"><strong>Total Exams Type:</strong> {examConfigs.length}</p>
                                                            <div className="flex items-center gap-2 text-base-content">
                                                                <strong>Total Weightage:</strong>
                                                                <span className={`font-semibold ${isValidWeightage ? 'text-base-content' : 'text-error'}`}>
                                                                    {totalWeightage}% / 100%
                                                                </span>
                                                                {isValidWeightage ? (
                                                                    <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            {!isValidWeightage && (
                                                                <p className="text-xs text-error">
                                                                    {totalWeightage > 100 ? 'Total weightage exceeds 100%' : 'Total weightage is less than 100%'} - Please adjust the values to equal exactly 100%
                                                                </p>
                                                            )}
                                                            <div className="flex flex-wrap gap-1 mt-2 flex-col sm:flex-row">
                                                                {examConfigs.map(config => (
                                                                    <span
                                                                        key={config.id}
                                                                        className={`badge h-7 px-3 flex-shrink-0 text-sm font-medium ${isValidWeightage ? 'badge-success bg-success/20 text-base-content' : 'badge-warning bg-warning/20 text-base-content'
                                                                            }`}
                                                                    >
                                                                        {config.examTypeName} - {config.weightage || 0}%
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                            {/* Help Text */}
                                            {examConfigs.length === 0 && (
                                                <div className="text-center py-8">
                                                    <FileText className="w-12 h-12 mx-auto text-base-content/30 mb-3" />
                                                    <p className="text-base-content/70">Select exam types above to configure them</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {/* Step 5: Marksheet Layout */}
                                {currentStep === 5 && (

                                    <div className="bg-base-100 p-6 rounded-lg">

                                        <h3 className="text-lg font-semibold mb-4 text-base-content">Step 5: Marksheet Layout</h3>
                                        <p className="text-base-content/70">Design the layout of your marksheet by creating cards with headings and custom fields.</p>

                                        <div className="space-y-6 mt-6">
                                            {/* Add Card Button */}
                                            <div className="flex justify-center">
                                                <Button
                                                    type="button"
                                                    variant="primary"
                                                    onClick={addMarksheetCard}
                                                    className="w-full sm:w-auto"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add Curricular or Co-Curricular Card
                                                </Button>
                                            </div>

                                            {/* Marksheet Cards */}
                                            {marksheetCards.length > 0 && (
                                                <div className="space-y-4">
                                                    <h4 className="font-medium text-base-content">Curricular/Co-Curricular/Grades Cards</h4>

                                                    {marksheetCards.map((card, cardIndex) => (
                                                        <div key={card.id} className="card bg-base-100 shadow-lg border">
                                                            <div className="card-body p-4">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <FileText className="w-5 h-5 text-primary" />
                                                                        <h5 className="text-lg font-semibold text-base-content">
                                                                            Card {cardIndex + 1}
                                                                        </h5>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="error"
                                                                        outline
                                                                        size="sm"
                                                                        onClick={() => removeMarksheetCard(card.id)}
                                                                        className="btn-circle"
                                                                        title="Remove Card"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </Button>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    {/* Card Heading */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div className="form-control w-full">
                                                                            <label className="label">
                                                                                <span className="label-text text-sm font-medium text-base-content">
                                                                                    Card Heading<span className="text-red-500">*</span>
                                                                                </span>
                                                                            </label>

                                                                            <input
                                                                                type="text"
                                                                                value={card.heading}
                                                                                onChange={(e) => updateMarksheetCard(card.id, { heading: e.target.value })}
                                                                                className="input input-bordered w-full bg-base-100 text-base-content text-sm"
                                                                                required
                                                                            />
                                                                            <p className="text-xs text-base-content/70 mt-1">
                                                                                Main heading for this section of the marksheet
                                                                            </p>
                                                                        </div>

                                                                        {/* Card Sub-heading (Optional) */}
                                                                        <div className="form-control w-full">
                                                                            <label className="label">
                                                                                <span className="label-text text-sm font-medium text-base-content">
                                                                                    Sub-heading (Optional)
                                                                                </span>
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={card.subHeading}
                                                                                onChange={(e) => updateMarksheetCard(card.id, { subHeading: e.target.value })}
                                                                                className="input input-bordered w-full bg-base-100 text-base-content text-sm"
                                                                            />
                                                                            <p className="text-xs text-base-content/70 mt-1">
                                                                                Optional subtitle for additional context
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    {/* Fields Configuration */}
                                                                    <div className="form-control w-full">
                                                                        <label className="label">
                                                                            <span className="label-text text-sm font-medium text-base-content">
                                                                                Fields to Display<span className="text-red-500">*</span>
                                                                            </span>
                                                                        </label>
                                                                        <div>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 mb-4 flex-wrap">
                                                                                {card.fields.map((field, fieldIndex) => (
                                                                                    <div key={fieldIndex} className="flex items-center gap-2">
                                                                                        <input
                                                                                            value={field}
                                                                                            onChange={(e) => updateCardField(card.id, fieldIndex, e.target.value)}
                                                                                            className="input input-bordered flex-1 bg-base-100 text-base-content text-sm"
                                                                                        // rows={1}
                                                                                        />
                                                                                        {card.fields.length > 1 && (
                                                                                            <Button
                                                                                                type="button"
                                                                                                variant="error"
                                                                                                outline
                                                                                                // size="sm"
                                                                                                onClick={() => removeCardField(card.id, fieldIndex)}
                                                                                                // className="btn-circle shrink-0"
                                                                                                title="Remove Field"
                                                                                            >
                                                                                                <X className="w-4 h-4" />
                                                                                            </Button>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            <p className="text-xs text-base-content/70 my-5 text-center">
                                                                                Enter the names of fields you want to display in this card. Each line will be a separate field.
                                                                            </p>

                                                                            <div className="flex justify-center">
                                                                                <Button
                                                                                    outline
                                                                                    variant='primary'
                                                                                    type="button"
                                                                                    onClick={() => addCardField(card.id)}
                                                                                    className="w-full sm:w-auto"
                                                                                >
                                                                                    <Plus className="w-4 h-4 mr-1" />
                                                                                    Add Another Field
                                                                                </Button>
                                                                            </div>
                                                                        </div>

                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Help Text */}
                                            {marksheetCards.length === 0 && (
                                                <div className="text-center py-8">
                                                    <FileText className="w-12 h-12 mx-auto text-base-content/30 mb-3" />
                                                    <p className="text-base-content/70">Click "Add Marksheet Card" to start designing your marksheet layout</p>
                                                </div>

                                            )}
                                        </div>

                                    </div>

                                )}

                                {/* Step 6: Review & Submit */}
                                {currentStep === 6 && (
                                    <div className="bg-base-100 p-6 rounded-lg">

                                        <div className="space-y-6 mt-6">
                                            {/* Report Card Preview */}
                                            <div className="bg-base-100 border-2 border-base-300 rounded-lg overflow-hidden">
                                                <div className="bg-primary text-primary-content p-4">
                                                    <h4 className="text-lg font-bold text-center">Report Card Preview</h4>
                                                </div>
                                                <div className="p-6">
                                                    {/* Header Section */}
                                                    <div className="text-center mb-6">
                                                        {logoPreview && (
                                                            <div className="flex justify-center mb-4">
                                                                <img
                                                                    src={logoPreview}
                                                                    alt="School Logo"
                                                                    className="h-16 w-auto object-contain"
                                                                    onError={(e) => {
                                                                        console.error('Failed to load logo preview:', logoPreview);
                                                                        // Hide the broken image
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                        <h1 className="text-2xl font-bold text-base-content mb-2">
                                                            {reportCardDetails.heading || 'SCHOOL REPORT CARD'}
                                                        </h1>
                                                        <div className="border-b-2 border-primary w-32 mx-auto"></div>
                                                    </div>

                                                    {/* Student Information Card */}
                                                    {studentDetailsConfig.fields.filter(f => f.enabled).length > 0 && (
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
                                                                    {studentDetailsConfig.fields.filter(f => f.enabled).map(field => (
                                                                        <div key={field.id} className="text-sm">
                                                                            <span className="font-medium text-base-content/70">{field.label}:</span>
                                                                            <span className="ml-2 text-base-content">
                                                                                {field.id === 'fullName' ? 'Mayank Khurana' :
                                                                                    field.id === 'rollNumber' ? '001' :
                                                                                        field.id === 'studentId' ? 'ST2024001' :
                                                                                            field.id === 'dateOfBirth' ? '15/06/2008' :
                                                                                                field.id === 'fatherName' ? 'Rajesh Khurana' :
                                                                                                    field.id === 'motherName' ? 'Manju Khurana' :
                                                                                                        field.id === 'parentPhone' ? '+91 9876543210' :
                                                                                                            field.id === 'address' ? '123 Main Street, City, State 12345' :
                                                                                                                field.id === 'bloodGroup' ? 'O+' :
                                                                                                                    field.id === 'admissionDate' ? '01/04/2023' :
                                                                                                                        field.id === 'gender' ? 'Male' :
                                                                                                                            field.id === 'category' ? 'General' :
                                                                                                                                'A+'}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>

                                                    )}

                                                    {/* Exam Results */}
                                                    {examConfigs.length > 0 && (
                                                        <div className="mb-6">
                                                            <h2 className="text-lg font-semibold text-base-content mb-3 border-b border-base-300 pb-1">
                                                                Academic Performance
                                                            </h2>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full bg-base-200 rounded-lg overflow-hidden">
                                                                    <thead className="bg-base-300">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left text-sm font-medium text-base-content">Subject</th>
                                                                            {examConfigs.map(config => (
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
                                                                        {['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi', 'Computer Science'].map((subject, index) => (
                                                                            <tr key={subject} className={index % 2 === 0 ? 'bg-base-100' : 'bg-base-200'}>
                                                                                <td className="px-4 py-2 text-sm font-medium text-base-content">{subject}</td>
                                                                                {examConfigs.map((config, configIndex) => {
                                                                                    const marks = [85, 78, 92, 88, 76, 90][index] + Math.floor(Math.random() * 10) - 5;
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
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {marksheetCards.map((card, cardIndex) => (
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
                                                                            {card.fields.filter(f => f.trim()).map((field, fieldIndex) => (
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
                                )}
                            </div>
                            {/* Navigation Buttons */}
                            <div className="flex justify-between pt-6 mt-6 border-t">
                                <div className="flex gap-3">
                                    {currentStep > 1 && (
                                        <Button
                                            type="button"
                                            outline
                                            variant="ghost"
                                            onClick={handlePrevStep}
                                            className="px-6"
                                        >
                                            <ChevronLeft className="w-4 h-4 mr-2" />
                                            Back
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="error"
                                        outline
                                        onClick={() => router.push('/manage-marksheet')}
                                        className="px-6"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                                <div>
                                    {currentStep === 6 ? (
                                        <Button
                                            outline
                                            type="button"
                                            variant="primary"
                                            onClick={async () => {
                                                await handleSaveMarksheet();
                                            }}
                                            disabled={isLoading}
                                            className="px-6"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4 mr-2" />
                                            )}
                                            {isLoading ? 'Saving...' : (isEditMode ? 'Update Template' : 'Submit Marksheet')}
                                        </Button>
                                    ) : (
                                        <Button
                                            outline
                                            type="button"
                                            variant="primary"
                                            onClick={handleNextStep}
                                            className="px-6"
                                        >
                                            Next
                                            <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}

export default function ManageMarksheetAddPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-base-100">
                <div className="text-center">
                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-12 h-12 mx-auto" />
                    <p className="mt-4 text-base-content">Loading...</p>
                </div>
            </div>
        }>
            <ManageMarksheetAddForm />
        </Suspense>
    );
}