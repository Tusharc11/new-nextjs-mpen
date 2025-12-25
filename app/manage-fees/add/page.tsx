'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, X, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import toast from 'react-hot-toast';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

// Define types for form options
interface IClass {
    _id: string;
    classNumber: number;
}

interface ISection {
    _id: string;
    section: string;
}

interface ISession {
    _id: string;
    startDate: string;
    endDate: string;
}

interface IFeesType {
    _id: string;
    name: string;
}

// Zod validation schemas
const feesStructureSchema = z.object({
    classId: z.string().nonempty("Class is required"),
    sectionIds: z.array(z.string()).min(1, "At least one section is required"),
    academicYearId: z.string().nonempty("Academic year is required"),
    installment: z.string().nonempty("Installment is required"),
    feesTypes: z.array(z.object({
        feesTypeId: z.string().min(1, "Fee type is required"),
        amount: z.number().min(0.01, "Amount must be greater than 0"),
    })).min(1, "At least one fee type is required"),
    dueDates: z.array(z.string().min(1, "Due date is required")).min(1, "At least one due date is required"),
});

const feesTypeSchema = z.object({
    name: z.string()
        .nonempty("Fee type name is required")
        .min(2, "Fee type name must be at least 2 characters long"),
});

const discountTypeSchema = z.object({
    type: z.string()
        .nonempty("Discount type is required")
        .min(2, "Discount type must be at least 2 characters long"),
    value: z.number().min(0.01, "Discount value must be greater than 0"),
});

const lateFeeSchema = z.object({
    classIds: z.array(z.string()).min(1, "At least one class is required"),
    academicYearId: z.string().nonempty("Academic year is required"),
    amount: z.coerce.number().min(0.01, "Amount is required and must be greater than 0")
});

// Form data types
type FeesStructureFormData = z.infer<typeof feesStructureSchema>;
type FeesTypeFormData = z.infer<typeof feesTypeSchema>;
type DiscountTypeFormData = z.infer<typeof discountTypeSchema>;
type LateFeeFormData = z.infer<typeof lateFeeSchema>;

function AddFeesForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const type = searchParams.get('type') || 'structure';
    const id = searchParams.get('id');
    const isEdit = !!id;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Dropdown data
    const [classes, setClasses] = useState<IClass[]>([]);
    const [sections, setSections] = useState<ISection[]>([]);
    const [sessions, setSessions] = useState<ISession[]>([]);
    const [feesTypes, setFeesTypes] = useState<IFeesType[]>([]);

    // Section selection state
    const [selectedSections, setSelectedSections] = useState<string[]>([]);
    const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);
    const sectionDropdownRef = useRef<HTMLDivElement>(null);

    // Class selection state for late fees
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [classDropdownOpen, setClassDropdownOpen] = useState(false);
    const classDropdownRef = useRef<HTMLDivElement>(null);

    // Fee types selection state
    const [selectedFeesTypes, setSelectedFeesTypes] = useState<Array<{ feesTypeId: string, amount: number }>>([{ feesTypeId: '', amount: 0 }]);

    // Due dates state
    const [dueDates, setDueDates] = useState<string[]>(['']);

    // Helper function to get required number of due dates based on installment
    const getRequiredDueDatesCount = (installment: string) => {
        switch (installment) {
            case '1': return 1;
            case '2': return 2;
            case '3': return 3;
            case '4': return 4;
            case '5': return 5;
            case '6': return 6;
            case '7': return 7;
            case '8': return 8;
            case '9': return 9;
            case '10': return 10;
            case '11': return 11;
            case '12': return 12;
            default: return 1;
        }
    };

    // Helper function to get installment description
    const getInstallmentDescription = (installment: string) => {
        switch (installment) {
            case '1': return '1 month (1 due dates)';
            case '2': return '2 months (2 due dates)';
            case '3': return '3 months (3 due dates)';
            case '4': return '4 months (4 due dates)';
            case '5': return '5 months (5 due dates)';
            case '6': return '6 months (6 due dates)';
            case '7': return '7 months (7 due dates)';
            case '8': return '8 months (8 due dates)';
            case '9': return '9 months (9 due dates)';
            case '10': return '10 months (10 due dates)';
            case '11': return '11 months (11 due dates)';
            case '12': return '12 months (12 due dates)';
            default: return 'Payment schedule';
        }
    };

    // Helper function to get grid columns based on number of due dates
    const getGridColumns = (count: number) => {
        switch (count) {
            case 1: return 'grid-cols-2'; // Half width for yearly - only first column will be used
            case 2: return 'grid-cols-2'; // Equal width for half-yearly
            case 3: return 'grid-cols-3'; // Equal width for 3 dates  
            case 4: return 'grid-cols-2 sm:grid-cols-4'; // Responsive for quarterly
            case 12: return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'; // Responsive for monthly
            default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
        }
    };

    // Helper function to get additional classes for individual due date items
    const getDueDateItemClasses = (count: number, index: number) => {
        if (count === 1) {
            return 'col-span-1'; // Takes only half width (1 out of 2 columns)
        }
        return '';
    };

    // Initialize form based on type
    const getDefaultValues = () => {
        switch (type) {
            case 'structure':
                return { sectionIds: [], installment: '1', feesTypes: [], dueDates: [''] };
            case 'feesType':
                return { name: '' };
            case 'discount':
                return { type: '', value: 0 };
            case 'lateFee':
                return { classIds: [], academicYearId: '', amount: '' };
            default:
                return {};
        }
    };

    const getSchema = () => {
        switch (type) {
            case 'structure':
                return feesStructureSchema;
            case 'feesType':
                return feesTypeSchema;
            case 'discount':
                return discountTypeSchema;
            case 'lateFee':
                return lateFeeSchema;
            default:
                return feesStructureSchema;
        }
    };

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<any>({
        resolver: zodResolver(getSchema()),
        defaultValues: getDefaultValues(),
        mode: 'onTouched', // Validates after first blur, then on every change
        reValidateMode: 'onChange', // Re-validates on every change after first validation
    });

    // Watch form values
    const watchedValues = watch();
    const selectedInstallment = watch('installment');

    useEffect(() => {
        fetchDropdownData();
        if (isEdit) {
            fetchEditData();
        } else {
            setIsLoading(false);
        }
    }, [isEdit, id, type]);

    // Update due dates when installment changes
    useEffect(() => {
        if (selectedInstallment && type === 'structure') {
            const requiredCount = getRequiredDueDatesCount(selectedInstallment);
            const newDueDates = Array(requiredCount).fill('');
            
            // Preserve existing dates if any
            for (let i = 0; i < Math.min(dueDates.length, requiredCount); i++) {
                if (dueDates[i]) {
                    newDueDates[i] = dueDates[i];
                }
            }
            
            setDueDates(newDueDates);
            setValue('dueDates', newDueDates);
        }
    }, [selectedInstallment, type]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: Event) {
            if (sectionDropdownOpen && sectionDropdownRef.current && !sectionDropdownRef.current.contains(event.target as Node)) {
                setSectionDropdownOpen(false);
            }
            if (classDropdownOpen && classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
                setClassDropdownOpen(false);
            }
        }

        if (sectionDropdownOpen || classDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [sectionDropdownOpen, classDropdownOpen]);

    const fetchDropdownData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            if (type === 'structure') {
                const [classesRes, sectionsRes, sessionsRes, feesTypesRes] = await Promise.all([
                    fetch('/api/classes', { headers }),
                    fetch('/api/sections', { headers }),
                    fetch('/api/session', { headers }),
                    fetch('/api/fees-type', { headers }),
                ]);

                if (classesRes.ok) setClasses(await classesRes.json());
                if (sectionsRes.ok) setSections(await sectionsRes.json());
                if (sessionsRes.ok) setSessions(await sessionsRes.json());
                if (feesTypesRes.ok) setFeesTypes(await feesTypesRes.json());
            } else if (type === 'lateFee') {
                const [classesRes, sessionsRes] = await Promise.all([
                    fetch('/api/classes', { headers }),
                    fetch('/api/session', { headers }),
                ]);

                if (classesRes.ok) setClasses(await classesRes.json());
                if (sessionsRes.ok) setSessions(await sessionsRes.json());
            }
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
            toast.error('Failed to fetch dropdown data');
        }
    };

    const fetchEditData = async () => {
        if (!id) return;

        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            let endpoint = '';
            if (type === 'structure') {
                endpoint = `/api/fees-structure?id=${id}`;
            } else if (type === 'feesType') {
                endpoint = `/api/fees-type?id=${id}`;
            } else if (type === 'discount') {
                endpoint = `/api/discount-type?id=${id}`;
            } else if (type === 'lateFee') {
                endpoint = `/api/late-fee?id=${id}`;
            }

            const response = await fetch(endpoint, { headers });
            if (!response.ok) throw new Error('Failed to fetch data');

            const data = await response.json();

            if (type === 'structure') {
                const sectionIds = data.sectionId?.map((s: any) => s._id || s) || [];
                setSelectedSections(sectionIds);
                setValue('classId', data.classId?._id || data.classId);
                setValue('sectionIds', sectionIds);
                setValue('academicYearId', data.academicYearId?._id || data.academicYearId);

                // Handle feesTypes array
                const feesTypesData = data.feesTypes?.map((ft: any) => ({
                    feesTypeId: ft.feesTypeId?._id || ft.feesTypeId,
                    amount: ft.amount
                })) || [{ feesTypeId: '', amount: 0 }];
                setSelectedFeesTypes(feesTypesData);
                setValue('feesTypes', feesTypesData);

                setValue('installment', data.installment);
                
                // Handle dueDates array
                const dueDatesData = data.dueDates?.map((date: string) => 
                    new Date(date).toISOString().split('T')[0]
                ) || [''];
                setDueDates(dueDatesData);
                setValue('dueDates', dueDatesData);
            } else if (type === 'feesType') {
                setValue('name', data.name);
            } else if (type === 'discount') {
                setValue('type', data.type);
                setValue('value', data.value);
            } else if (type === 'lateFee') {
                const classIds = data.classId?.map((c: any) => c._id || c) || [];
                setSelectedClasses(classIds);
                setValue('classIds', classIds);
                setValue('academicYearId', data.academicYearId?._id || data.academicYearId);
                setValue('amount', data.amount);
            }
        } catch (error) {
            console.error('Error fetching edit data:', error);
            toast.error('Failed to fetch data for editing');
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit: SubmitHandler<any> = async (data) => {
        setIsSaving(true);

        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            let endpoint = '';
            const method = isEdit ? 'PUT' : 'POST';
            let body = {};

            if (type === 'structure') {
                endpoint = isEdit ? `/api/fees-structure?id=${id}` : '/api/fees-structure';
                
                // Filter out invalid fee types
                const validFeesTypes = data.feesTypes?.filter((ft: any) => 
                    ft.feesTypeId && ft.feesTypeId.trim() !== '' && ft.amount > 0
                ) || [];

                if (validFeesTypes.length === 0) {
                    toast.error('Please add at least one valid fee type with amount');
                    setIsSaving(false);
                    return;
                }

                body = { 
                    ...data, 
                    sectionId: data.sectionIds,
                    feesTypes: validFeesTypes
                };
                delete (body as any).sectionIds; // Remove sectionIds as we're using sectionId
            } else if (type === 'feesType') {
                endpoint = isEdit ? `/api/fees-type?id=${id}` : '/api/fees-type';
                body = data;
            } else if (type === 'discount') {
                endpoint = isEdit ? `/api/discount-type?id=${id}` : '/api/discount-type';
                body = data;
            } else if (type === 'lateFee') {
                endpoint = isEdit ? `/api/late-fee?id=${id}` : '/api/late-fee';
                body = { 
                    ...data, 
                    classId: data.classIds // Convert classIds array to classId for backend
                };
                delete (body as any).classIds; // Remove classIds as we're using classId
            }

            const response = await fetch(endpoint, {
                method,
                headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save');
            }

            toast.success(isEdit ? 'Updated successfully!' : 'Created successfully!');
            
            // Map form type to tab name
            const getTabFromType = (formType: string) => {
                const typeToTabMap: { [key: string]: string } = {
                    'structure': 'structures',
                    'feesType': 'feesTypes',
                    'discount': 'discounts',
                    'lateFee': 'lateFees'
                };
                return typeToTabMap[formType] || 'structures';
            };
            
            const targetTab = getTabFromType(type);
            router.push(`/manage-fees?tab=${targetTab}`);
        } catch (error: any) {
            console.error('Error saving:', error);
            toast.error(error.message || 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSectionChange = (sectionId: string) => {
        setSelectedSections(prev => {
            const newSelection = prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId];

            setValue('sectionIds', newSelection);
            return newSelection;
        });
    };

    const handleClassChange = (classId: string) => {
        setSelectedClasses(prev => {
            const newSelection = prev.includes(classId)
                ? prev.filter(id => id !== classId)
                : [...prev, classId];

            setValue('classIds', newSelection);
            return newSelection;
        });
    };

    const handleSelectAllClasses = () => {
        const allSelected = selectedClasses.length === classes.length;
        const newSelection = allSelected ? [] : classes.map(cls => cls._id);
        
        setSelectedClasses(newSelection);
        setValue('classIds', newSelection);
    };

    const isAllClassesSelected = selectedClasses.length === classes.length && classes.length > 0;
    const isIndeterminateClasses = selectedClasses.length > 0 && selectedClasses.length < classes.length;

    const addFeesTypeRow = () => {
        const newRow = { feesTypeId: '', amount: 0 };
        const newSelection = [...selectedFeesTypes, newRow];
        setSelectedFeesTypes(newSelection);
        setValue('feesTypes', newSelection);
    };

    const removeFeesTypeRow = (index: number) => {
        if (selectedFeesTypes.length > 1) {
            const newSelection = selectedFeesTypes.filter((_, i) => i !== index);
            setSelectedFeesTypes(newSelection);
            setValue('feesTypes', newSelection);
        }
    };

    const updateFeesTypeRow = (index: number, field: 'feesTypeId' | 'amount', value: string | number) => {
        const newSelection = selectedFeesTypes.map((ft, i) =>
            i === index ? { ...ft, [field]: value } : ft
        );
        setSelectedFeesTypes(newSelection);
        setValue('feesTypes', newSelection);
    };

    const getAvailableFeesTypes = (currentIndex: number) => {
        const selectedIds = selectedFeesTypes
            .map((ft, index) => index !== currentIndex ? ft.feesTypeId : null)
            .filter(id => id && id !== '');

        return feesTypes.filter(feeType => !selectedIds.includes(feeType._id));
    };

    const handleDueDateChange = (index: number, value: string) => {
        const newDueDates = [...dueDates];
        newDueDates[index] = value;
        setDueDates(newDueDates);
        setValue('dueDates', newDueDates);
    };

    const getFormTitle = () => {
        const action = isEdit ? 'Edit' : 'Add';
        switch (type) {
            case 'structure':
                return `${action} Fee Structure`;
            case 'feesType':
                return `${action} Fee Type`;
            case 'discount':
                return `${action} Discount Type`;
            case 'lateFee':
                return `${action} Late Fee`;
            default:
                return `${action} Fee Item`;
        }
    };

    const getButtonDisplayName = () => {
        switch (type) {
            case 'structure':
                return 'Fee Structure';
            case 'feesType':
                return 'Fee Type';
            case 'discount':
                return 'Discount Type';
            case 'lateFee':
                return 'Late Fee';
            default:
                return 'Fee Item';
        }
    };

    const renderForm = () => {
        switch (type) {
            case 'structure':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Fee Types */}
                        <div className="lg:col-span-2">
                            <label className="label mb-3 sm:mb-4">
                                <span className="label-text text-base-content text-base sm:text-lg font-semibold">Fee Types & Amounts <span className="text-error">*</span></span>
                            </label>

                            <div className="space-y-3 sm:space-y-4">
                                {selectedFeesTypes.map((ft, index) => {
                                    const availableFeesTypes = getAvailableFeesTypes(index);
                                    return (
                                        <div key={index} className="flex flex-col sm:flex-row gap-3 p-3 sm:p-4 bg-base-200/50 rounded-lg border border-base-300/20">
                                            <div className="form-control flex-1">
                                                <label className="label pb-1 sm:pb-2">
                                                    <span className="label-text text-base-content text-sm sm:text-base">Fee Type</span>
                                                </label>
                                                <select
                                                    className={`select select-bordered bg-base-100 text-base-content h-10 sm:h-12 text-sm sm:text-base ${errors.feesTypes && !ft.feesTypeId ? 'select-error' : ''}`}
                                                    value={ft.feesTypeId}
                                                    onChange={(e) => updateFeesTypeRow(index, 'feesTypeId', e.target.value)}
                                                >
                                                    <option value="">Select Fee Type</option>
                                                    {/* Show current selection even if it would normally be filtered */}
                                                    {ft.feesTypeId && !availableFeesTypes.find(f => f._id === ft.feesTypeId) && (
                                                        <option key={ft.feesTypeId} value={ft.feesTypeId}>
                                                            {feesTypes.find(f => f._id === ft.feesTypeId)?.name}
                                                        </option>
                                                    )}
                                                    {availableFeesTypes.map((feeType) => (
                                                        <option key={feeType._id} value={feeType._id}>
                                                            {feeType.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.feesTypes && !ft.feesTypeId && (
                                                    <label className="label">
                                                        <span className="label-text-alt text-error text-xs">
                                                            Fee type is required
                                                        </span>
                                                    </label>
                                                )}
                                            </div>

                                            <div className="form-control flex-1">
                                                <label className="label pb-1 sm:pb-2">
                                                    <span className="label-text text-base-content text-sm sm:text-base">Amount (₹)</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className={`input input-bordered bg-base-100 text-base-content h-10 sm:h-12 text-sm sm:text-base ${errors.feesTypes && ft.amount <= 0 ? 'input-error' : ''}`}
                                                    placeholder="Enter amount"
                                                    value={ft.amount || ''}
                                                    min="0"
                                                    step="0.01"
                                                    onKeyDown={(e) => {
                                                        // Prevent minus key, 'e', 'E', '+', and other invalid characters
                                                        if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value === '') {
                                                            updateFeesTypeRow(index, 'amount', '');
                                                        } else {
                                                            const numValue = parseFloat(value);
                                                            // Only allow positive numbers and valid numbers
                                                            if (!isNaN(numValue) && numValue >= 0) {
                                                                updateFeesTypeRow(index, 'amount', numValue);
                                                            }
                                                        }
                                                    }}
                                                />
                                                {errors.feesTypes && ft.amount <= 0 && (
                                                    <label className="label">
                                                        <span className="label-text-alt text-error text-xs">
                                                            Amount must be greater than 0
                                                        </span>
                                                    </label>
                                                )}
                                            </div>

                                            <div className="flex sm:flex-col justify-end sm:justify-end sm:items-end">
                                                <button
                                                    type="button"
                                                    className="btn btn-error btn-outline h-10 sm:h-12 w-10 sm:w-12 min-h-10 sm:min-h-12 p-0 flex items-center justify-center"
                                                    onClick={() => removeFeesTypeRow(index)}
                                                    disabled={selectedFeesTypes.length === 1}
                                                    title="Remove fee type"
                                                >
                                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add Fee Type Button - Right aligned below the fields */}
                            <div className="mt-3 sm:mt-4 flex justify-center sm:justify-end">
                                <div className="text-center sm:text-right w-full sm:w-auto">
                                    <Button
                                        outline
                                        variant='primary'
                                        type="button"
                                        className="btn btn-sm sm:btn-md btn-primary btn-outline w-full sm:w-auto"
                                        onClick={addFeesTypeRow}
                                        disabled={selectedFeesTypes.length >= feesTypes.length}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Another Fee Type
                                    </Button>
                                    {selectedFeesTypes.length >= feesTypes.length && (
                                        <p className="text-xs sm:text-sm text-base-content/70 mt-2">
                                            All available fee types have been added
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Total Amount Display */}
                            <div className="mt-4 p-3 sm:p-4 bg-primary/10 rounded-lg border border-primary/20">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0">
                                    <span className="text-base sm:text-lg font-semibold text-base-content">Total Amount:</span>
                                    <span className="text-lg sm:text-xl font-bold text-primary">
                                        ₹{selectedFeesTypes.reduce((sum, ft) => sum + ft.amount, 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {errors.feesTypes && !Array.isArray(errors.feesTypes) && selectedFeesTypes.some(ft => !ft.feesTypeId || ft.amount <= 0) && (
                                <label className="label">
                                    <span className="label-text-alt text-error text-sm">
                                        {String(errors.feesTypes?.message)}
                                    </span>
                                </label>
                            )}
                        </div>

                        {/* Class */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content text-sm sm:text-base">Class <span className="text-error">*</span></span>
                            </label>
                            <select
                                {...register('classId')}
                                className={`select select-bordered w-full bg-base-100 text-base-content text-sm sm:text-base h-10 sm:h-12 ${errors.classId ? 'select-error' : ''}`}
                            >
                                <option value="">Select Class</option>
                                {classes.map((cls: IClass) => (
                                    <option key={cls._id} value={cls._id}>
                                        Class {cls.classNumber}
                                    </option>
                                ))}
                            </select>
                            {errors.classId && (
                                <label className="label">
                                    <span className="label-text-alt text-error text-sm">{String(errors.classId?.message)}</span>
                                </label>
                            )}
                        </div>

                        {/* Sections Multi-Select */}
                        <div className="form-control w-full relative" ref={sectionDropdownRef}>
                            <label className="label">
                                <span className="label-text text-base-content text-sm sm:text-base">Sections <span className="text-error">*</span></span>
                            </label>
                            <div
                                className={`select select-bordered w-full bg-base-100 text-base-content cursor-pointer min-h-[2.5rem] sm:min-h-[3rem] ${errors.sectionIds && selectedSections.length === 0 ? 'select-error' : ''}`}
                                onClick={() => setSectionDropdownOpen(!sectionDropdownOpen)}
                            >
                                <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 overflow-hidden">
                                    {selectedSections.length === 0 ? (
                                        <span className="text-base-content/50 text-sm sm:text-base">Select sections</span>
                                    ) : (
                                        <>
                                            {selectedSections.slice(0, 3).map(id => {
                                                const section = sections.find(s => s._id === id);
                                                return section ? (
                                                    <div key={id} className="badge badge-primary h-6 sm:h-7 px-2 sm:px-3 flex items-center gap-1 flex-shrink-0 text-xs sm:text-sm">
                                                        {section.section}
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-ghost btn-circle w-4 h-4 min-h-4"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSectionChange(id);
                                                            }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ) : null;
                                            })}
                                            {selectedSections.length > 3 && (
                                                <div className="badge badge-primary h-6 sm:h-7 px-2 sm:px-3 flex-shrink-0 text-xs sm:text-sm">
                                                    +{selectedSections.length - 3} more
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            {sectionDropdownOpen && (
                                <div className="bg-base-100 mt-1 border border-base-300 rounded-md max-h-48 sm:max-h-60 overflow-y-auto absolute z-50 w-full shadow-lg top-full left-0">
                                    {sections.length > 0 ? (
                                        sections.map((section) => (
                                            <div
                                                key={section._id}
                                                className="p-2 cursor-pointer hover:bg-base-300"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSectionChange(section._id);
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox checkbox-sm checkbox-primary"
                                                        checked={selectedSections.includes(section._id)}
                                                        onChange={() => { }}
                                                    />
                                                    <span className="text-base-content">{section.section}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-2 text-base-content/50">
                                            No sections available
                                        </div>
                                    )}
                                </div>
                            )}
                            {errors.sectionIds && selectedSections.length === 0 && (
                                <label className="label">
                                    <span className="label-text-alt text-error text-sm">{String(errors.sectionIds?.message)}</span>
                                </label>
                            )}
                        </div>

                        {/* Academic Year */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content text-sm sm:text-base">Academic Year <span className="text-error">*</span></span>
                            </label>
                            <select
                                {...register('academicYearId')}
                                className={`select select-bordered w-full bg-base-100 text-base-content text-sm sm:text-base h-10 sm:h-12 ${errors.academicYearId ? 'select-error' : ''}`}
                            >
                                <option value="">Select Academic Year</option>
                                {sessions.map((session: ISession) => (
                                    <option key={session._id} value={session._id}>
                                        {new Date(session.startDate).toLocaleString('default', { month: 'short' })} {new Date(session.startDate).getFullYear()} - {new Date(session.endDate).toLocaleString('default', { month: 'short' })} {new Date(session.endDate).getFullYear()}
                                    </option>
                                ))}
                            </select>
                            {errors.academicYearId && (
                                <label className="label">
                                    <span className="label-text-alt text-error text-sm">{String(errors.academicYearId?.message)}</span>
                                </label>
                            )}
                        </div>

                        {/* Installment */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content text-sm sm:text-base">Installment <span className="text-error">*</span></span>
                            </label>
                            <select
                                {...register('installment')}
                                className={`select select-bordered w-full bg-base-100 text-base-content text-sm sm:text-base h-10 sm:h-12 ${errors.installment ? 'select-error' : ''}`}
                            >
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                                <option value="5">5</option>
                                <option value="6">6</option>
                                <option value="7">7</option>
                                <option value="8">8</option>
                                <option value="9">9</option>
                                <option value="10">10</option>
                                <option value="11">11</option>
                                <option value="12">12</option>
                            </select>
                            {errors.installment && (
                                <label className="label">
                                    <span className="label-text-alt text-error text-sm">{String(errors.installment?.message)}</span>
                                </label>
                            )}
                        </div>

                        {/* Due Dates */}
                        <div className="form-control w-full lg:col-span-2">
                            <label className="label">
                                <span className="label-text text-base-content text-sm sm:text-base">Due Dates <span className="text-error">*</span></span>
                                <span className="label-text-alt text-base-content/70 text-xs sm:text-sm">
                                    {selectedInstallment ? getInstallmentDescription(selectedInstallment) : 'Select a installment first'}
                                </span>
                            </label>
                            
                            {selectedInstallment && (
                                <div className={`grid ${getGridColumns(dueDates.length)} gap-3 sm:gap-4`}>
                                    {dueDates.map((date, index) => (
                                        <div key={index} className={`form-control ${getDueDateItemClasses(dueDates.length, index)}`}>
                                            <label className="label pb-1">
                                                <span className="label-text text-base-content text-xs sm:text-sm">
                                                    {selectedInstallment === '1' && `Installment ${index + 1}`}
                                                    {selectedInstallment === '2' && `Installment ${index + 1}`}
                                                    {selectedInstallment === '3' && `Installment ${index + 1}`}
                                                    {selectedInstallment === '4' && `Installment ${index + 1}`}
                                                    {selectedInstallment === '5' && `Installment ${index + 1}`}
                                                    {selectedInstallment === '6' && `Installment ${index + 1}`}
                                                    {selectedInstallment === '7' && `Installment ${index + 1}`}
                                                    {selectedInstallment === '8' && `Installment ${index + 1}`}
                                                    {selectedInstallment === '9' && `Installment ${index + 1}`}
                                                    {selectedInstallment === '10' && `Installment ${index + 1}`}
                                                    {selectedInstallment === '11' && `Installment ${index + 1}`}
                                                    {selectedInstallment === '12' && `Installment ${index + 1}`}
                                                </span>
                                            </label>
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={(e) => handleDueDateChange(index, e.target.value)}
                                                className={`input input-bordered w-full bg-base-100 text-base-content text-xs sm:text-sm h-10 sm:h-12 ${(errors.dueDates && !date.trim()) || (errors.dueDates && !Array.isArray(errors.dueDates)) ? 'input-error' : ''}`}
                                            />
                                            {errors.dueDates && !date.trim() && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error text-xs">
                                                        Due date is required
                                                    </span>
                                                </label>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* General due dates validation error */}
                            {errors.dueDates && !Array.isArray(errors.dueDates) && (
                                <label className="label">
                                    <span className="label-text-alt text-error text-sm">{String(errors.dueDates?.message)}</span>
                                </label>
                            )}
                            
                            {!selectedInstallment && (
                                <div className="text-center p-6 text-base-content/50 bg-base-200/30 rounded-lg border border-base-300/20">
                                    <div className="text-2xl mb-2">📅</div>
                                    <p className="text-sm">Please select a payment installment to configure due dates</p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'feesType':
                return (
                    <div className="grid grid-cols-1 gap-6">
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content">Fee Type Name <span className="text-error">*</span></span>
                            </label>
                            <input
                                type="text"
                                {...register('name')}
                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.name ? 'input-error' : ''}`}
                                placeholder="Enter fee type name (e.g., Tuition Fee, Library Fee)"
                            />
                            {errors.name && (
                                <label className="label">
                                    <span className="label-text-alt text-error">{String(errors.name?.message)}</span>
                                </label>
                            )}
                        </div>
                    </div>
                );

            case 'discount':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content">Discount Type <span className="text-error">*</span></span>
                            </label>
                            <input
                                type="text"
                                {...register('type')}
                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.type ? 'input-error' : ''}`}
                                placeholder="Enter discount type (e.g., PERCENTAGE, FLAT)"  
                            />
                            {errors.type && (
                                <label className="label">
                                    <span className="label-text-alt text-error">{String(errors.type?.message)}</span>
                                </label>
                            )}
                        </div>

                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content">Discount Value <span className="text-error">*</span></span>
                            </label>
                            <input
                                type="number"
                                {...register('value', { valueAsNumber: true })}
                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.value ? 'input-error' : ''}`}
                                placeholder="Enter discount value"
                                min="0"
                                step="0.01"
                            />
                            {errors.value && (
                                <label className="label">
                                    <span className="label-text-alt text-error">{String(errors.value?.message)}</span>
                                </label>
                            )}
                        </div>
                    </div>
                );

            case 'lateFee':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                        {/* Classes Multi-Select */}
                        <div className="form-control w-full relative" ref={classDropdownRef}>
                            <label className="label">
                                <span className="label-text text-base-content text-sm sm:text-base">Classes <span className="text-error">*</span></span>
                            </label>
                            <div
                                className={`select select-bordered w-full bg-base-100 text-base-content cursor-pointer min-h-[2.5rem] sm:min-h-[3rem] ${errors.classIds && selectedClasses.length === 0 ? 'select-error' : ''}`}
                                onClick={() => setClassDropdownOpen(!classDropdownOpen)}
                            >
                                <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 overflow-hidden">
                                    {selectedClasses.length === 0 ? (
                                        <span className="text-base-content/50 text-sm sm:text-base">Select classes</span>
                                    ) : (
                                        <>
                                            {selectedClasses.slice(0, 3).map(id => {
                                                const cls = classes.find(c => c._id === id);
                                                return cls ? (
                                                    <div key={id} className="badge badge-primary h-6 sm:h-7 px-2 sm:px-3 flex items-center gap-1 flex-shrink-0 text-xs sm:text-sm">
                                                        Class {cls.classNumber}
                                                        <button
                                                            type="button"
                                                            className="btn btn-xs btn-ghost btn-circle w-4 h-4 min-h-4"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleClassChange(id);
                                                            }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ) : null;
                                            })}
                                            {selectedClasses.length > 3 && (
                                                <div className="badge badge-primary h-6 sm:h-7 px-2 sm:px-3 flex-shrink-0 text-xs sm:text-sm">
                                                    +{selectedClasses.length - 3} more
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            {classDropdownOpen && (
                                <div className="bg-base-100 mt-1 border border-base-300 rounded-md max-h-48 sm:max-h-60 overflow-y-auto absolute z-50 w-full shadow-lg top-full left-0">
                                    {classes.length > 0 ? (
                                        <>
                                            {/* Select All Option */}
                                            <div
                                                className="p-2 cursor-pointer hover:bg-base-200 border-b border-base-300/30 bg-base-50"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectAllClasses();
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox checkbox-sm checkbox-primary"
                                                        checked={isAllClassesSelected}
                                                        ref={(el) => {
                                                            if (el) {
                                                                el.indeterminate = isIndeterminateClasses;
                                                            }
                                                        }}
                                                        onChange={() => { }}
                                                    />
                                                    <span className="text-base-content font-medium">
                                                        Select All Classes ({classes.length})
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Individual Classes */}
                                            {classes.map((cls) => (
                                                <div
                                                    key={cls._id}
                                                    className="p-2 cursor-pointer hover:bg-base-300"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleClassChange(cls._id);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox checkbox-sm checkbox-primary"
                                                            checked={selectedClasses.includes(cls._id)}
                                                            onChange={() => { }}
                                                        />
                                                        <span className="text-base-content">Class {cls.classNumber}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <div className="p-2 text-base-content/50">
                                            No classes available
                                        </div>
                                    )}
                                </div>
                            )}
                            {errors.classIds && selectedClasses.length === 0 && (
                                <label className="label">
                                    <span className="label-text-alt text-error text-sm">{String(errors.classIds?.message)}</span>
                                </label>
                            )}
                        </div>

                        {/* Academic Year */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content text-sm sm:text-base">Academic Year <span className="text-error">*</span></span>
                            </label>
                            <select
                                {...register('academicYearId')}
                                className={`select select-bordered w-full bg-base-100 text-base-content text-sm sm:text-base h-10 sm:h-12 ${errors.academicYearId ? 'select-error' : ''}`}
                            >
                                <option value="">Select Academic Year</option>
                                {sessions.map((session: ISession) => (
                                    <option key={session._id} value={session._id}>
                                        {new Date(session.startDate).toLocaleString('default', { month: 'short' })} {new Date(session.startDate).getFullYear()} - {new Date(session.endDate).toLocaleString('default', { month: 'short' })} {new Date(session.endDate).getFullYear()}
                                    </option>
                                ))}
                            </select>
                            {errors.academicYearId && (
                                <label className="label">
                                    <span className="label-text-alt text-error text-sm">{String(errors.academicYearId?.message)}</span>
                                </label>
                            )}
                        </div>

                        {/* Late Fee Amount */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content text-sm sm:text-base">Late Fee Amount (₹) <span className="text-error">*</span></span>
                            </label>
                            <input
                                type="number"
                                {...register('amount')}
                                className={`input input-bordered w-full bg-base-100 text-base-content text-sm sm:text-base h-10 sm:h-12 ${errors.amount ? 'input-error' : ''}`}
                                placeholder="Enter late fee amount"
                                
                                min="0"
                                step="0.01"
                                onKeyDown={(e) => {
                                    // Prevent minus key, 'e', 'E', '+', and other invalid characters
                                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                        e.preventDefault();
                                    }
                                }}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '') {
                                        setValue('amount', '');
                                    } else {
                                        const numValue = parseFloat(value);
                                        // Only allow positive numbers and valid numbers
                                        if (!isNaN(numValue) && numValue >= 0) {
                                            setValue('amount', numValue);
                                        }
                                    }
                                }}
                            />
                            {errors.amount && (
                                <label className="label">
                                    <span className="label-text-alt text-error text-sm">{String(errors.amount?.message)}</span>
                                </label>
                            )}
                        </div>

                        {/* Information Card */}
                        <div className="md:col-span-2">
                            <div className="alert alert-info">
                                <div className="flex items-start gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <div>
                                        <h3 className="font-bold">Late Fee Information</h3>
                                        <div className="text-sm mt-1">
                                            <p>• The late fee amount is a fixed charge applied to overdue payments.</p>
                                            <p>• Both values can be applied based on your institution's policy.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return <div>Unknown form type</div>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-base-100">
                <div className="text-center">
                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-12 h-12 mx-auto" />
                    <p className="mt-4 text-base-content">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full p-2 sm:p-4 lg:p-6 bg-base-100 h-full overflow-y-auto">
            <div className="card bg-base-300 border border-base-content/20 shadow-xl max-w-7xl mx-auto w-full">
                <div className="card-body p-4 sm:p-6">
                    <h2 className="card-title text-xl sm:text-2xl lg:text-3xl font-bold text-base-content mb-4 sm:mb-6">
                        {getFormTitle()}
                    </h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6" noValidate>
                        {renderForm()}

                        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-base-content/10">
                            <Button
                                type="button"
                                variant="error"
                                outline
                                onClick={() => {
                                // Map form type to tab name for cancel button
                                const getTabFromType = (formType: string) => {
                                    const typeToTabMap: { [key: string]: string } = {
                                        'structure': 'structures',
                                        'feesType': 'feesTypes',
                                        'discount': 'discounts',
                                        'lateFee': 'lateFees'
                                    };
                                    return typeToTabMap[formType] || 'structures';
                                };
                                const targetTab = getTabFromType(type);
                                router.push(`/manage-fees?tab=${targetTab}`);
                            }}
                                disabled={isSaving}
                                className="w-full sm:w-auto order-2 sm:order-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                outline
                                disabled={isSaving}
                                className="w-full sm:w-auto order-1 sm:order-2"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        {isEdit ? 'Updating...' : 'Creating...'}
                                    </>
                                ) : (
                                    isEdit ? `Update ${getButtonDisplayName()}` : `Create ${getButtonDisplayName()}`
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function AddFeesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-base-100">
                <div className="text-center">
                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-12 h-12 mx-auto" />
                    <p className="mt-4 text-base-content">Loading Fees...</p>
                </div>
            </div>
        }>
            <AddFeesForm />
        </Suspense>
    );
}
