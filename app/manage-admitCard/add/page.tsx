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

interface AdmitCardDetails {
    logoBase64: string;
}

interface StudentField {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    isCustom?: boolean;
}
interface StudentDetailsConfig {
    fields: StudentField[];
}

interface AdmitCard {
    _id?: string; // MongoDB ObjectId as string
    heading: string;
    subHeading: string;
    fields: string[];
}


function ManageAdmitCardAddForm() {

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

    // Logo data
    const [admitCardDetails, setAdmitCardDetails] = useState<AdmitCardDetails>({
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
            { id: 'fullName', label: 'Full Name', description: 'Student\'s complete name (First + Last)', enabled: true, isCustom: false },
            { id: 'dateOfBirth', label: 'Date of Birth', description: 'Student\'s birth date', enabled: false, isCustom: false },
            { id: 'parentPhone', label: 'Parent Phone Number', description: 'Primary contact number', enabled: false, isCustom: false },
            { id: 'address', label: 'Address', description: 'Student\'s residential address', enabled: false, isCustom: false },
            { id: 'gender', label: 'Gender', description: 'Student\'s gender', enabled: false, isCustom: false }
        ];
        // Fields from StudentClass model
        const studentClassFields: StudentField[] = [
            { id: 'rollNumber', label: 'Roll Number', description: 'Student\'s class roll number', enabled: true, isCustom: false },
            { id: 'studentId', label: 'Student ID', description: 'Unique student identification number', enabled: false, isCustom: false }
        ];
        // Combine all fields from both models
        return [...userFields, ...studentClassFields];
    };
    const [studentDetailsConfig, setStudentDetailsConfig] = useState<StudentDetailsConfig>({
        fields: getStudentFieldsFromModels()
    });

    // Step 5 data - Admit Card Card Configuration
    const [admitCardCards, setAdmitCardCards] = useState<AdmitCard[]>([]);

    // Custom field modal state
    const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
    const [customFieldLabel, setCustomFieldLabel] = useState('');
    const [customFieldDescription, setCustomFieldDescription] = useState('');

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
        if (admitCardDetails.logoBase64 && !logoPreview) {
            const logoPreviewUrl = admitCardDetails.logoBase64.startsWith('data:')
                ? admitCardDetails.logoBase64
                : `data:image/png;base64,${admitCardDetails.logoBase64}`;
            setLogoPreview(logoPreviewUrl);
        }
    }, [admitCardDetails.logoBase64, logoPreview]);

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
                setAdmitCardDetails({
                    ...admitCardDetails,
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

    const fetchTemplateData = async (id: string) => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                toast.error('Authentication required');
                return;
            }

            const response = await fetch(`/api/manage-admitCard?templateId=${id}`, {
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

                    if (template.admitCardDetails) {
                        const logoBase64 = template.admitCardDetails.logoBase64 || '';
                        setAdmitCardDetails({
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
                        const templateFields = template.studentDetailsConfig.fields;

                        // Check if fields are already objects (new format) or strings (old format)
                        if (templateFields.length > 0 && typeof templateFields[0] === 'object') {
                            // New format: fields are already objects
                        const studentFields = getStudentFieldsFromModels();
                            const enabledFieldsMap = new Map(templateFields.map((f: any) => [f.id, f.enabled]));

                        const updatedFields = studentFields.map(field => ({
                            ...field,
                                enabled: Boolean(enabledFieldsMap.get(field.id) ?? false)
                            }));

                            // Add any custom fields from template that aren't in the default fields
                            templateFields.forEach((templateField: any) => {
                                if (templateField.isCustom && !studentFields.find(f => f.id === templateField.id)) {
                                    updatedFields.push({
                                        id: templateField.id,
                                        label: templateField.label,
                                        description: templateField.description || '',
                                        enabled: Boolean(templateField.enabled),
                                        isCustom: true
                                    });
                                }
                            });

                            setStudentDetailsConfig({ fields: updatedFields });
                        } else {
                            // Old format: fields are string IDs
                            const studentFields = getStudentFieldsFromModels();
                            const enabledFieldIds = templateFields as string[];
                            const updatedFields = studentFields.map(field => ({
                                ...field,
                                enabled: enabledFieldIds.includes(field.id)
                            }));
                            setStudentDetailsConfig({ fields: updatedFields });
                        }
                    }

                    // Handle admit cards/instructions
                    if (template.admitCards && template.admitCards.length > 0) {
                        // Check if we have the new instructions format
                        const instructionsCard = template.admitCards.find((card: any) => card.heading === 'Instructions');
                        if (instructionsCard) {
                            setAdmitCardCards([instructionsCard]);
                        } else {
                            // Convert old format to instructions format
                            const allFields = template.admitCards.flatMap((card: any) => card.fields || []);
                            const instructionsCard: AdmitCard = {
                                _id: template.admitCards[0]?._id,
                                heading: 'Instructions',
                                subHeading: '',
                                fields: allFields.filter((field: any) => field && field.trim())
                            };
                            setAdmitCardCards([instructionsCard]);
                        }
                    } else if (template.admitCardDetails?.instructions && template.admitCardDetails.instructions.length > 0) {
                        // Handle very old format where instructions were in admitCardDetails
                        const instructionsCard: AdmitCard = {
                            heading: 'Instructions',
                            subHeading: '',
                            fields: template.admitCardDetails.instructions.filter((instruction: any) => instruction && instruction.trim())
                            };
                            setAdmitCardCards([instructionsCard]);
                        } else {
                        // No instructions found, start with empty instructions card
                        setAdmitCardCards([
                            {
                                heading: 'Instructions',
                                subHeading: '',
                                fields: ['']
                            }
                        ]);
                    }
                } else {
                    toast.error('Template not found');
                    router.push('/manage-admitCard');
                }
            } else {
                toast.error('Failed to fetch template data');
                router.push('/manage-admitCard');
            }
        } catch (error) {
            toast.error('Error fetching template data');
            router.push('/manage-admitCard');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle adding new admit card card
    const addAdmitCardCard = () => {
        const newCard: AdmitCard = {
            heading: '',
            subHeading: '',
            fields: ['']
        };
        setAdmitCardCards([...admitCardCards, newCard]);
    };

    // Handle removing admit card card
    const removeAdmitCardCard = (index: number) => {
        setAdmitCardCards(admitCardCards.filter((_, i) => i !== index));
    };

    // Handle updating admit card card
    const updateAdmitCardCard = (index: number, updates: Partial<AdmitCard>) => {
        setAdmitCardCards(admitCardCards.map((card, i) =>
            i === index ? { ...card, ...updates } : card
        ));
    };

    // Handle updating card fields
    const updateCardField = (cardIndex: number, fieldIndex: number, value: string) => {
        setAdmitCardCards(admitCardCards.map((card, i) => {
            if (i === cardIndex) {
                const newFields = [...card.fields];
                newFields[fieldIndex] = value;
                return { ...card, fields: newFields };
            }
            return card;
        }));
    };

    // Handle adding field to card
    const addCardField = (cardIndex: number) => {
        setAdmitCardCards(admitCardCards.map((card, i) => {
            if (i === cardIndex) {
                return { ...card, fields: [...card.fields, ''] };
            }
            return card;
        }));
    };

    // Handle removing field from card
    const removeCardField = (cardIndex: number, fieldIndex: number) => {
        setAdmitCardCards(admitCardCards.map((card, i) => {
            if (i === cardIndex) {
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

    // Handle adding custom field
    const handleAddCustomField = () => {
        if (!customFieldLabel.trim()) {
            toast.error('Please enter a field label');
            return;
        }

        const newField: StudentField = {
            id: `custom-${Date.now()}`,
            label: customFieldLabel.trim(),
            description: customFieldDescription.trim() || `${customFieldLabel} field`,
            enabled: true,
            isCustom: true
        };

        setStudentDetailsConfig(prev => ({
            ...prev,
            fields: [...prev.fields, newField]
        }));

        // Reset form and close modal
        setCustomFieldLabel('');
        setCustomFieldDescription('');
        setShowCustomFieldModal(false);

        toast.success('Custom field added successfully');
    };

    const handleNextStep = () => {
        // Validate step 1 (Template Name & Class)
        if (currentStep === 1) {
            if (!academicSelection.templateName.trim() || academicSelection.classIds.length === 0) {
                toast.error('Please enter Template Name and select at least one Class');
                return;
            }
        }
        // Validate step 2 (Student Details & Logo)
        else if (currentStep === 2) {
            const enabledFields = studentDetailsConfig.fields.filter(field => field.enabled);
            if (enabledFields.length === 0) {
                toast.error('Please select at least one student detail to display');
                return;
            }
            if (!admitCardDetails.logoBase64) {
                toast.error('Please upload a logo image');
                return;
            }
        }

        // Validate step 3 (Instructions)
        else if (currentStep === 3) {
            if (admitCardCards.length === 0 || admitCardCards[0].fields.length === 0) {
                toast.error('Please add at least one instruction');
                return;
            }

            // Check if all instructions have content
            const hasValidInstruction = admitCardCards[0].fields.some(instruction => instruction.trim());
            if (!hasValidInstruction) {
                toast.error('Please enter at least one instruction');
                    return;
            }
        }

        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSaveAdmitCard = async () => {
        try {
            setIsLoading(true);

            // Validate required data
            if (!academicSelection.templateName.trim() || academicSelection.classIds.length === 0) {
                toast.error('Please enter Template Name and select at least one Class');
                return;
            }

            if (admitCardCards.length === 0) {
                toast.error('Please add at least one admit card card');
                return;
            }

            // Validate instructions
            if (admitCardCards.length === 0 || admitCardCards[0].fields.length === 0) {
                toast.error('Please add at least one instruction');
                    return;
                }

            const hasValidInstruction = admitCardCards[0].fields.some(instruction => instruction.trim());
            if (!hasValidInstruction) {
                toast.error('Please enter at least one instruction');
                    return;
            }

            // Prepare the data to send to API
            const admitCardData = {
                academicSelection,
                admitCardDetails,
                studentDetailsConfig: {
                    fields: studentDetailsConfig.fields.filter(field => field.enabled)
                },
                admitCards: admitCardCards.map(card => ({
                    ...card,
                    fields: card.fields.filter(field => field && field.trim())
                })),
                templateName: academicSelection.templateName.trim()
            };

            // Make API call to save/update the admit card template
            const apiUrl = isEditMode ? `/api/manage-admitCard?templateId=${templateId}` : '/api/manage-admitCard';
            const requestBody = isEditMode ? { templateId, ...admitCardData } : admitCardData;

            const response = await fetch(apiUrl, {
                method: isEditMode ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success(isEditMode ? 'Admit card template updated successfully!' : 'Admit card template saved successfully!');
                router.push('/manage-admitCard');
            } else {
                throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'save'} admit card template`);
            }

        } catch (error) {
            console.error('Error saving admit card template:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save admit card template');
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
                                {isEditMode ? 'Edit Admit Card Template' : 'Create Admit Card'}
                            </h2>
                            <p className="text-sm sm:text-base text-base-content/70 mb-4 sm:mb-6">
                                Add admit card for students in a structured way
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
                                            <span className="hidden sm:inline">Student Details & Logo</span>
                                            <span className="sm:hidden">Details</span>
                                        </li>
                                        <li className={`text-base-content step text-xs sm:text-sm ${currentStep >= 3 ? 'step-primary' : ''}`}>
                                            <span className="hidden sm:inline">Instructions Details</span>
                                            <span className="sm:hidden">Instructions</span>
                                        </li>
                                        <li className={`text-base-content step text-xs sm:text-sm ${currentStep >= 4 ? 'step-primary' : ''}`}>
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
                                {/* Step 2: Student Details Configuration & Logo */}
                                {currentStep === 2 && (
                                    <div className="bg-base-100 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 shadow-sm">
                                        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-base-content flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center text-sm font-bold">2</div>
                                            Student Details & Logo Upload
                                        </h3>
                                        <p className="text-base-content/70 mb-6">Select which student details you want to display on the admit card and upload your institution logo.</p>
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
                                                        variant='success'
                                                        type="button"
                                                        onClick={() => setShowCustomFieldModal(true)}
                                                        className="btn btn-success btn-sm hover:scale-105 transition-all duration-200"
                                                    >
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        Add Custom Field
                                                    </Button>

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
                                            
                                            {/* Logo Upload Section */}
                                            <div className="p-4 bg-base-200 border border-base-300 rounded-lg">
                                                <h4 className="font-medium text-base-content mb-4 flex items-center gap-2">
                                                    <Upload className="w-5 h-5 text-primary" />
                                                    Institution Logo Upload
                                                </h4>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    <div className="relative group">
                                                        <div
                                                            className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-base-100 border-base-300 hover:bg-base-300 transition-colors"
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
                                                        <div className="relative bg-base-100 rounded-lg overflow-hidden border border-base-300">
                                                            <div className="flex items-center justify-center h-32 p-4">
                                                                <img
                                                                    src={logoPreview}
                                                                    alt="Logo Preview"
                                                                    className="max-w-full max-h-full object-contain"
                                                                    onError={(e) => {
                                                                        console.error('Failed to load logo preview:', logoPreview);
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
                                                                        setAdmitCardDetails({
                                                                            ...admitCardDetails,
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
                                                </div>
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
                                                                className="badge badge-primary h-7 px-3 bg-primary/10 flex-shrink-0 text-xs font-medium text-base-content"
                                                                 title={field.description || field.label}
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
                                                        These fields will appear for each student on the admit card
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Step 3: Instructions */}
                                {currentStep === 3 && (
                                    <div className="bg-base-100 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 shadow-sm">
                                        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-base-content flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center text-sm font-bold">3</div>
                                            Instructions for Admit Card
                                        </h3>
                                        <p className="text-base-content/70">Add instructions for the admit card one by one.</p>

                                        <div className="space-y-6 mt-6">
                                            {/* Instructions List */}
                                                <div className="space-y-4">
                                                <h4 className="font-medium text-base-content">Instructions</h4>

                                                {admitCardCards.length === 0 || admitCardCards[0].fields.length === 0 ? (
                                                    <div className="text-center py-8">
                                                        <FileText className="w-12 h-12 mx-auto text-base-content/30 mb-3" />
                                                        <p className="text-base-content/70">No instructions added yet</p>
                                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {admitCardCards[0].fields.map((instruction, index) => (
                                                            <div key={index} className="flex items-center gap-3 p-4 bg-base-200 rounded-lg">
                                                                <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-content rounded-full text-sm font-bold">
                                                                    {index + 1}
                                                                </div>
                                                                            <input
                                                                                type="text"
                                                                    value={instruction}
                                                                    onChange={(e) => updateCardField(0, index, e.target.value)}
                                                                    placeholder="Enter instruction"
                                                                                            className="input input-bordered flex-1 bg-base-100 text-base-content text-sm"
                                                                                        />
                                                                                            <Button
                                                                    // type="button"
                                                                                                variant="error"
                                                                                                outline
                                                                                                // size="sm"
                                                                    onClick={() => removeCardField(0, index)}
                                                                    title="Remove Instruction"
                                                                                            >
                                                                                                <X className="w-4 h-4" />
                                                                                            </Button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                )}

                                                {/* Add Instruction Button */}
                                                                            <div className="flex justify-center">
                                                                                <Button
                                                                                    outline
                                                                                    variant='primary'
                                                                                    type="button"
                                                        onClick={() => {
                                                            // If no cards exist, create one first
                                                            if (admitCardCards.length === 0) {
                                                                const newCard: AdmitCard = {
                                                                    heading: 'Instructions',
                                                                    subHeading: '',
                                                                    fields: ['']
                                                                };
                                                                setAdmitCardCards([newCard]);
                                                            } else {
                                                                addCardField(0);
                                                            }
                                                        }}
                                                                                    className="w-full sm:w-auto"
                                                                                >
                                                                                    <Plus className="w-4 h-4 mr-1" />
                                                        Add Instruction
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                        </div>

                                    </div>

                                )}

                                {/* Step 4: Review & Submit */}
                                {currentStep === 4 && (
                                    <div className="bg-base-100 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-7 shadow-sm">
                                        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-base-content flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center text-sm font-bold">4</div>
                                            Review & Submit
                                        </h3>
                                        <p className="text-base-content/70 mb-6">Review your admit card template before submitting.</p>

                                        <div className="space-y-6 mt-6">
                                            {/* Admit Card Preview */}
                                            <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
                                                <div className="bg-red-600 text-white p-4">
                                                    <h4 className="text-lg font-bold text-center">Admit Card Preview</h4>
                                                    <p className="text-center text-sm opacity-90 mt-1">
                                                        Template: {academicSelection.templateName || 'Sample Template'}
                                                    </p>
                                                </div>
                                                <div className="p-8 bg-white">
                                                    {/* School Header */}
                                                    <div className="text-center mb-8">
                                                        {logoPreview && (
                                                            <div className="flex justify-center mb-4">
                                                                <img
                                                                    src={logoPreview}
                                                                    alt="School Logo"
                                                                    className="h-16 w-auto object-contain"
                                                                    onError={(e) => {
                                                                        console.error('Failed to load logo preview:', logoPreview);
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
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
                                                                                            {selectedClasses.length > 0
                                                                                                ? classes.find(c => selectedClasses.includes(c._id))?.classNumber + ' A' || '9 A'
                                                                                                : '9 A'
                                                                                            }
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                                
                                                                                {/* Dynamically show selected student fields */}
                                                                                {studentDetailsConfig.fields
                                                                                    .filter(field => field.enabled)
                                                                                    .map((field, index) => {
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
                                                    {admitCardCards.length > 0 && admitCardCards[0].fields.some(instruction => instruction.trim()) && (
                                                        <div className="mb-8">
                                                            <h3 className="text-lg font-semibold bg-gray-50 text-red-600 mb-4 text-center border-2 border-red-600 p-2">INSTRUCTIONS TO THE CANDIDATE</h3>
                                                            <div className="p-4">
                                                                <ul className="list-disc list-inside space-y-2">
                                                                    {admitCardCards[0].fields.filter(instruction => instruction.trim()).map((instruction, index) => (
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
                                        onClick={() => router.push('/manage-admitCard')}
                                        className="px-6"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                                <div>
                                    {currentStep === 4 ? (
                                        <Button
                                            outline
                                            type="button"
                                            variant="primary"
                                            onClick={async () => {
                                                await handleSaveAdmitCard();
                                            }}
                                            disabled={isLoading}
                                            className="px-6"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4 mr-2" />
                                            )}
                                            {isLoading ? 'Saving...' : (isEditMode ? 'Update Template' : 'Submit Admit Card')}
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

            {/* Custom Field Modal */}
            {showCustomFieldModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-base-100 rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-base-content">Add Custom Field</h3>
                            <Button
                                variant="error"
                                outline
                                onClick={() => setShowCustomFieldModal(false)}
                                className="btn btn-ghost btn-sm"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-base-content mb-2">
                                    Field Label<span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={customFieldLabel}
                                    onChange={(e) => setCustomFieldLabel(e.target.value)}
                                    placeholder="Enter field name"
                                    className="input input-bordered w-full text-base-content"
                                    maxLength={50}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-base-content mb-2">
                                    Field Description
                                </label>
                                <input
                                    type="text"
                                    value={customFieldDescription}
                                    onChange={(e) => setCustomFieldDescription(e.target.value)}
                                    placeholder="Enter field description (optional)"
                                    className="input input-bordered w-full text-base-content"
                                    maxLength={100}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <Button
                                variant="error"
                                outline
                                onClick={() => {
                                    setShowCustomFieldModal(false);
                                    setCustomFieldLabel('');
                                    setCustomFieldDescription('');
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                outline
                                onClick={handleAddCustomField}
                                className="flex-1"
                            >
                                {/* <Plus className="w-4 h-4 mr-2" /> */}
                                Add New Field
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

export default function ManageAdmitCardAddPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-base-100">
                <div className="text-center">
                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-12 h-12 mx-auto" />
                    <p className="mt-4 text-base-content">Loading...</p>
                </div>
            </div>
        }>
            <ManageAdmitCardAddForm />
        </Suspense>
    );
}