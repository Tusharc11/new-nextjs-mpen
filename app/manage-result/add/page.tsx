'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/app/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, Eye, Hash } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

// Add this interface at the top with your other interfaces
interface AcademicYear {
    _id: string;
    startDate: string;
    endDate: string;
}

export default function AddResultPage() {
    const router = useRouter();
    const pathname = usePathname();

    const [examDate, setExamDate] = useState('');
    const [examType, setExamType] = useState('');
    const [isOtherExamType, setIsOtherExamType] = useState(false);
    const [otherExamType, setOtherExamType] = useState('');
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [subjectOptions, setSubjectOptions] = useState<{ _id: string, subject: string }[]>([]);
    const [staffs, setStaffs] = useState<{ _id: string, firstName: string, lastName: string }[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [totalMarks, setTotalMarks] = useState<number | null>(null);
    const [passingMarks, setPassingMarks] = useState<number | null>(null);
    const [students, setStudents] = useState<{ id: string, name: string }[]>([]);
    const [results, setResults] = useState<{ studentId: string, marks: number | null, present: boolean, remark: string | null }[]>([]);
    const [classOptions, setClassOptions] = useState<{ _id: string, classNumber: number }[]>([]);
    const [sectionOptions, setSectionOptions] = useState<{ _id: string, section: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
    const [academicYearStart, setAcademicYearStart] = useState<string>('');
    const [academicYearEnd, setAcademicYearEnd] = useState<string>('');
    const [examTypes, setExamTypes] = useState<{ _id: string, type: string }[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isStudentsLoading, setIsStudentsLoading] = useState(false);
    const [isValidExamDetails, setIsValidExamDetails] = useState(false);

    // Define Zod schema for form validation with conditional validation
    const resultFormSchema = z.object({
        examDate: z.string().nonempty("Exam date is required"),
        examType: z.string().nonempty("Exam type is required"),
        classId: z.string().nonempty("Class is required"),
        sectionId: z.string().nonempty("Section is required"),
        subjectId: z.string().nonempty("Subject is required"),
        selectedStaffId: z.string().nonempty("Teacher is required"),
        totalMarks: z.string().nonempty("Total marks is required").transform(val => parseInt(val)),
        passingMarks: z.string().nonempty("Passing marks is required").transform(val => parseInt(val)),
        remark: z.string().optional()
    });

    type FormData = z.infer<typeof resultFormSchema>;

    const { register, handleSubmit, formState: { errors: formErrors, touchedFields }, setValue, trigger, reset } = useForm<FormData>({
        resolver: zodResolver(resultFormSchema),
        mode: "onTouched"
    });

    useEffect(() => {
        const fetchClassData = async () => {
            try {
                const token = localStorage.getItem('token');

                if (!token) {
                  return;
                }
                setIsLoading(true);
                const response = await fetch('/api/classes');
                if (!response.ok) {
                    throw new Error('Failed to fetch class data');
                }
                const classesData = await response.json();
                setClassOptions(classesData);
            } catch (error) {
                toast.error('Failed to load class data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchClassData();
    }, []);

    // Get user role from token
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const payload = token.split('.')[1];
                    const decodedPayload = JSON.parse(atob(payload));
                    setUserRole(decodedPayload.role);
                } catch (error) {
                    toast.error('Error decoding token');
                }
            }
        }
    }, []);

    useEffect(() => {
        const fetchSectionData = async () => {
            try {
                const token = localStorage.getItem('token');

                if (!token) {
                  return;
                }
                setIsLoading(true);
                const response = await fetch('/api/sections');
                if (!response.ok) {
                    throw new Error('Failed to fetch section data');
                }
                const sectionsData = await response.json();
                setSectionOptions(sectionsData);
            } catch (error) {
                toast.error('Failed to load section data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSectionData();
    }, []);

    useEffect(() => {
        if (classId && sectionId && subjectId) {
            setValue("classId", classId);
            setValue("sectionId", sectionId);
            setValue("subjectId", subjectId);
        } else if (classId && sectionId) {
            fetchSubjects();
            setValue("classId", classId);
            setValue("sectionId", sectionId);
            setSubjectId('');
        } else {
            setSubjectOptions([]);
            setSubjectId('');
            setValue("subjectId", "");
            setSelectedStaffId('');
            setValue("selectedStaffId", "");
            setStaffs([]);
            setStudents([]);
            setResults([]);
        }
    }, [classId, sectionId, subjectId, setValue]);

    const fetchSubjects = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/manage-subject?classId=${classId}&sectionId=${sectionId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch subjects');
            }
            const data = await response.json();
            setSubjectOptions(data);
        } catch (error) {
            toast.error('Failed to load subjects');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (subjectId) {
            fetchStaffs();
            setValue("subjectId", subjectId);
        } else {
            setStaffs([]);
            setSelectedStaffId('');
            setValue("selectedStaffId", "");
        }
    }, [subjectId, setValue]);

    const fetchStaffs = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/manage-subject?id=${subjectId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch teachers');
            }
            const data = await response.json();

            // Extract staff information from the staffIds array
            if (data && data.staffIds && Array.isArray(data.staffIds)) {
                setStaffs(data.staffIds);
            } else {
                setStaffs([]);
            }
        } catch (error) {
            toast.error('Failed to load teacher information');
            setStaffs([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Add this function to check and clear field errors
    const clearFieldError = (field: string, value: any) => {
        if (formErrors[field as keyof typeof formErrors] && value) {
            // Clear the error for this field
            const updatedErrors = { ...formErrors };
            delete updatedErrors[field as keyof typeof formErrors];
            // This is a workaround since we can't directly modify formErrors
            // We're updating the form state to trigger a re-render
            setValue(field as any, value, {
                shouldValidate: true,
                shouldDirty: true
            });
        }
    };

    const handleMarksChange = (studentId: string, marks: number | null) => {
        // Validate that marks is a valid number
        if (marks !== null && (isNaN(marks) || !isFinite(marks))) {
            toast.error('Please enter a valid number');
            return;
        }

        // Validate that marks are not negative
        if (marks !== null && marks < 0) {
            toast.error('Marks cannot be negative');
            return;
        }

        // Validate that marks don't exceed total marks
        if (marks !== null && totalMarks !== null && marks > totalMarks) {
            toast.error(`Marks cannot exceed total marks (${totalMarks})`);
            return;
        }

        // Round to 2 decimal places to ensure valid decimal numbers
        if (marks !== null) {
            marks = Math.round(marks * 100) / 100;
        }

        // Clear error for this student when valid marks are added
        if (marks !== null || errors[studentId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[studentId];
                return newErrors;
            });
        }

        setResults((prevResults) => {
            const existingResult = prevResults.find(result => result.studentId === studentId);
            if (existingResult) {
                return prevResults.map(result =>
                    result.studentId === studentId ? { ...result, marks } : result
                );
            } else {
                return [...prevResults, { studentId, marks, present: true, remark: '' }];
            }
        });
    };

    const handleRemarkChange = (studentId: string, remark: string) => {
        setResults(prevResults => {
            return prevResults.map(result =>
                result.studentId === studentId ? { ...result, remark } : result
            );
        });
    };

    const handleAttendanceChange = (studentId: string, present: boolean) => {
        // Clear error for this student when attendance is marked
        if (errors[studentId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[studentId];
                return newErrors;
            });
        }

        setResults((prevResults) => {
            const existingResult = prevResults.find(result => result.studentId === studentId);
            if (existingResult) {
                // If marking as absent, clear the marks but preserve the remark
                const marks = present ? existingResult.marks : null;
                return prevResults.map(result =>
                    result.studentId === studentId ? { ...result, present, marks } : result
                );
            } else {
                return [...prevResults, { studentId, marks: null, present, remark: '' }];
            }
        });
    };

    const handleTotalMarksChange = (value: string) => {
        let newTotalMarks = value ? parseInt(value) : null;

        // Validate for integers only
        if (newTotalMarks !== null) {
            if (isNaN(newTotalMarks) || !isFinite(newTotalMarks) || newTotalMarks < 1) {
                toast.error('Please enter a valid total marks (positive whole number)');
                return;
            }
        }

        setTotalMarks(newTotalMarks);
        setValue("totalMarks", value as unknown as number);
        clearFieldError("totalMarks", value);

        // Reset passing marks if it's greater than the new total marks or if total marks is cleared
        if (passingMarks !== null && (newTotalMarks === null || newTotalMarks < passingMarks)) {
            setPassingMarks(null);
            setValue("passingMarks", "" as unknown as number);
            toast('Passing marks reset as it exceeded new total marks');
        }
    };

    useEffect(() => {
        if (examType === 'other') {
            setIsOtherExamType(true);
            setValue("examType", otherExamType || "");
        } else {
            setIsOtherExamType(false);
        }
    }, [examType, otherExamType, setValue]);

    useEffect(() => {
        const fetchExamTypes = async () => {
            try {
                const token = localStorage.getItem('token');

                if (!token) {
                  return;
                }
                const response = await fetch('/api/examType');
                if (!response.ok) {
                    throw new Error('Failed to fetch exam types');
                }
                const data = await response.json();
                setExamTypes(data);
            } catch (error) {
                toast.error('Failed to load exam types');
            }
        };

        fetchExamTypes();
    }, []);

    const checkExistingExam = async (date: string, type: string, classId: string, subjectId: string, sectionId: string) => {
        try {
            toast.dismiss();
            // Find the exam type object to get the type name
            const examTypeObj = examTypes.find(et => et._id === type);
            if (!examTypeObj) {
                return;
            }
            const classObj = classOptions.find(c => c._id === classId);
            const subjectObj = subjectOptions.find(s => s._id === subjectId);

            let query = '';
            if (date && type && classId && subjectId) {
                setIsStudentsLoading(true);
                query = `examType=${type}&examDate=${date}&classId=${classId}&subjectId=${subjectId}`;
            } else if (date && type && classId) {
                query = `examType=${type}&examDate=${date}&classId=${classId}`;
            } else if (date && type) {
                query = `examType=${type}&examDate=${date}`;
            }

            const response = await fetch(`/api/exam?result=true&${query}`);
            if (!response.ok) {
                throw new Error('Failed to check existing exams');
            }

            const existingExams = await response.json();

            if (existingExams.length == 0) {
                let message = '';
                if (type && date && classId && subjectId) {
                    setIsValidExamDetails(false);
                    message = `${examTypeObj.type} was not conducted on ${formatDate(date)} for Class ${classObj?.classNumber} and ${subjectObj?.subject} subject.`;
                } else if (type && date && classId) {
                    message = `${examTypeObj.type} was not conducted on ${formatDate(date)} for Class ${classObj?.classNumber}.`;
                } else if (type && date) {
                    message = `${examTypeObj.type} was not conducted on ${formatDate(date)} .`;
                }
                toast.error((t: any) => (
                    <span>
                        {message} Please check in Exam Calendar{' '}
                        <button
                            onClick={() => {
                                window.location.href = '/calendar';
                                toast.dismiss(t.id);
                            }}
                            className="text-blue-500 hover:text-blue-700 underline"
                        >
                            Check Now
                        </button>
                    </span>
                ));
            } else {
                if (classId && sectionId && subjectId) {
                    const fetchStudents = async () => {
                        try {
                            setIsLoading(true);
                            const response = await fetch(`/api/student-class?classId=${classId}&sectionId=${sectionId}&subjectId=${subjectId}`);
                            if (!response.ok) {
                                throw new Error('Failed to fetch students');
                            }
                            const data = await response.json();

                            if (data.length == 0) {
                                setIsValidExamDetails(true);
                            }

                            // Transform the data to match the expected format
                            const formattedStudents = data.map((item: { studentId: { _id: string; firstName: string; lastName: string } }) => ({
                                id: item.studentId._id,
                                name: `${item.studentId.firstName} ${item.studentId.lastName}`
                            }));
                            setStudents(formattedStudents);
                        } catch (error) {
                            toast.error('Failed to fetch students');
                        } finally {
                            setIsLoading(false);
                        }
                    };
                    fetchStudents();
                }
            }
            setIsStudentsLoading(false);
        } catch (error) {
            toast.error('Error checking existing exams');
        }
    };

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        // Custom validation for student records
        const newErrors: { [key: string]: string } = {};
        let hasErrors = false;

        // Only validate student records if they are visible
        if (students.length > 0 && !isLoading && classId && sectionId) {
            students.forEach(student => {
                const result = results.find(r => r.studentId === student.id);
                if (!result) {
                    newErrors[student.id] = "Please mark absent attendance or enter marks";
                    hasErrors = true;
                } else if (result.present && result.marks === null) {
                    // Only require marks for present students
                    newErrors[student.id] = "Please enter marks";
                    hasErrors = true;
                } else if (result.present && result.marks !== null && data.totalMarks && result.marks > data.totalMarks) {
                    // Validate marks don't exceed total marks
                    newErrors[student.id] = `Marks cannot exceed total marks (${data.totalMarks})`;
                    hasErrors = true;
                }
            });
        }

        setErrors(newErrors);

        if (hasErrors) {
            toast.error("Please add attendance and marks for all students");
            return;
        }

        // Skip validation for fields that should be disabled based on conditions
        if (!subjectId) {
            // Don't validate teacher selection if no subject is selected
            delete formErrors.selectedStaffId;
        }

        if (!totalMarks) {
            // Don't validate passing marks if no total marks are selected
            delete formErrors.passingMarks;
        }

        // Check if there are any remaining form errors
        if (Object.keys(formErrors).length > 0) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            const response = await fetch('/api/manage-result', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    examDate: data.examDate,
                    examType: isOtherExamType ? otherExamType : data.examType,
                    classId: data.classId,
                    sectionId: data.sectionId,
                    subjectId: data.subjectId,
                    staffId: data.selectedStaffId,
                    totalMarks: data.totalMarks,
                    passingMarks: data.passingMarks,
                    results,
                    remark: data.remark || '',
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                if (response.status === 409) {
                    // Handle the duplicate entry error
                    toast.error(responseData.error || 'A result for this combination already exists');
                } else {
                    throw new Error(responseData.error || 'Failed to add results');
                }
                return;
            }

            toast.success('Results added successfully');

            // Reset form after successful submission
            setExamDate('');
            setExamType('');
            setIsOtherExamType(false);
            setOtherExamType('');
            setClassId('');
            setSectionId('');
            setSubjectId('');
            setSubjectOptions([]);
            setStaffs([]);
            setSelectedStaffId('');
            setTotalMarks(null);
            setPassingMarks(null);
            setStudents([]);
            setResults([]);

            // Reset form fields using react-hook-form reset
            reset({
                examDate: '',
                examType: '',
                classId: '',
                sectionId: '',
                subjectId: '',
                selectedStaffId: '',
                totalMarks: '' as unknown as number,
                passingMarks: '' as unknown as number,
                remark: ''
            });

        } catch (error) {
            toast.error('Failed to add results');
        }
    };

    useEffect(() => {
        const fetchAcademicYears = async () => {
            try {
                const token = localStorage.getItem('token');

                if (!token) {
                  return;
                }
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

                    const latestYear = sortedYears[0];
                    setSelectedAcademicYearId(latestYear._id);

                    const startDate = new Date(latestYear.startDate);
                    const endDate = new Date(latestYear.endDate);

                    const formattedStartDate = startDate.toISOString().split('T')[0];
                    const formattedEndDate = endDate.toISOString().split('T')[0];

                    setAcademicYearStart(formattedStartDate);
                    setAcademicYearEnd(formattedEndDate);
                }
            } catch (error) {
                toast.error('Failed to load academic years');
            }
        };

        fetchAcademicYears();
    }, []);

    return (
        <div className="flex flex-col w-full min-h-[calc(100vh-64px)] p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100">
            {/* Mobile and Tablet: Centered container with max-width */}
            <div className="block xl:hidden">
                <div className={`card bg-base-200 shadow-xl w-full max-w-6xl mx-auto flex flex-col ${students.length > 0 ? 'h-[calc(100vh-96px)] overflow-y-auto' : 'h-fit'}`}>
                    <div className="card-body p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col">
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content mb-4 sm:mb-6">Add Results</h2>

                        {/* Navigation Tabs - Hidden for students */}
                        {userRole !== 'STUDENT' && (
                            <div className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
                                {/* Sliding Background Indicator */}
                                <div
                                    className={`absolute top-1 bottom-1 rounded-lg bg-base-100 shadow-sm transition-all duration-300 ease-in-out ${pathname === '/manage-result/add'
                                        ? 'left-1 right-1/2 mr-1.5'
                                        : 'left-1/2 right-1 ml-1.5'
                                        }`}
                                />

                                <button
                                    onClick={() => router.push('/manage-result/add')}
                                    className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/manage-result/add'
                                        ? 'text-emerald-600'
                                        : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                >
                                    <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium truncate">Add Result</span>
                                </button>
                                <button
                                    onClick={() => router.push('/manage-result')}
                                    className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/manage-result'
                                        ? 'text-rose-700'
                                        : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                >
                                    <Eye className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium truncate">View Result</span>
                                </button>
                            </div>
                        )}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Exam Date</span>
                                    </label>
                                    <input
                                        type="date"
                                        min={academicYearStart}
                                        max={new Date(Date.now()).toISOString().split('T')[0]}
                                        className={`input input-bordered w-full bg-base-100 text-base-content ${formErrors.examDate ? 'input-error' : ''}`}
                                        {...register("examDate")}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setExamDate(value);
                                            setValue("examDate", value);
                                            clearFieldError("examDate", value);

                                            // Check for existing exam if both date and type are selected
                                            if (value && examType) {
                                                checkExistingExam(value, examType, classId, subjectId, sectionId);
                                            }
                                        }}
                                    />
                                    {formErrors.examDate && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.examDate.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Exam Type</span>
                                    </label>
                                    {isOtherExamType ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${formErrors.examType ? 'input-error' : ''}`}
                                                placeholder="Specify exam type"
                                                value={otherExamType}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const value = e.target.value;
                                                    setOtherExamType(value);
                                                    setValue("examType", value);
                                                    clearFieldError("examType", value);

                                                    // Check for existing exam if both date and type are selected
                                                    if (value && examDate) {
                                                        checkExistingExam(examDate, value, classId, subjectId, sectionId);
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="px-2"
                                                onClick={() => {
                                                    setExamType('');
                                                    setIsOtherExamType(false);
                                                    setOtherExamType('');
                                                    setValue("examType", "");
                                                }}
                                            >
                                                ↩
                                            </Button>
                                        </div>
                                    ) : (
                                        <select
                                            className={`select select-bordered w-full bg-base-100 text-base-content ${formErrors.examType ? 'select-error' : ''}`}
                                            {...register("examType")}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setExamType(value);
                                                setValue("examType", value);
                                                clearFieldError("examType", value);

                                                // Check for existing exam if both date and type are selected
                                                if (value && examDate) {
                                                    checkExistingExam(examDate, value, classId, subjectId, sectionId);
                                                }
                                            }}
                                        >
                                            <option value="">Select Exam Type</option>
                                            {examTypes.map((type) => (
                                                <option key={type._id} value={type._id}>
                                                    {type.type}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {formErrors.examType && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.examType.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Class</span>
                                    </label>
                                    <select
                                        className={`select select-bordered w-full bg-base-100 text-base-content ${formErrors.classId ? 'select-error' : ''}`}
                                        {...register("classId")}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Reset dependent fields when class changes
                                            setSubjectId('');
                                            setValue("subjectId", "");
                                            setSelectedStaffId('');
                                            setValue("selectedStaffId", "");
                                            setStudents([]);
                                            setResults([]);
                                            setClassId(value);
                                            setValue("classId", value);
                                            clearFieldError("classId", value);
                                            checkExistingExam(examDate, examType, value, subjectId, sectionId);
                                        }}
                                        disabled={isLoading}
                                    >
                                        <option value="">Select Class</option>
                                        {classOptions.map((option) => (
                                            <option key={option._id} value={option._id}>
                                                {option.classNumber}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.classId && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.classId.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Section</span>
                                    </label>
                                    <select
                                        className={`select select-bordered w-full bg-base-100 text-base-content ${formErrors.sectionId ? 'select-error' : ''}`}
                                        {...register("sectionId")}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Reset dependent fields when section changes
                                            setSubjectId('');
                                            setValue("subjectId", "");
                                            setSelectedStaffId('');
                                            setValue("selectedStaffId", "");
                                            setStudents([]);
                                            setResults([]);
                                            setSectionId(value);
                                            setValue("sectionId", value);
                                            clearFieldError("sectionId", value);
                                            checkExistingExam(examDate, examType, classId, subjectId, value);
                                        }}
                                        disabled={isLoading}
                                    >
                                        <option value="">Select Section</option>
                                        {sectionOptions.map((option) => (
                                            <option key={option._id} value={option._id}>
                                                {option.section}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.sectionId && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.sectionId.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Subject</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            className={`select select-bordered w-full bg-base-100 text-base-content ${formErrors.subjectId ? 'select-error' : ''}`}
                                            {...register("subjectId")}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // Clear dependent fields when subject changes
                                                setSelectedStaffId('');
                                                setValue("selectedStaffId", "");
                                                setStaffs([]);
                                                setStudents([]);
                                                setResults([]);
                                                setSubjectId(value);
                                                setValue("subjectId", value);
                                                clearFieldError("subjectId", value);
                                                checkExistingExam(examDate, examType, classId, value, sectionId);
                                            }}
                                            disabled={!classId || !sectionId}
                                        >
                                            <option value="">Select Subject</option>
                                            {subjectOptions.map((option) => (
                                                <option key={option._id} value={option._id}>
                                                    {option.subject}
                                                </option>
                                            ))}
                                        </select>
                                        {isLoading && classId && sectionId && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <span className="loading loading-spinner loading-sm text-primary"></span>
                                            </div>
                                        )}
                                    </div>
                                    {formErrors.subjectId && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.subjectId.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Teachers</span>
                                    </label>
                                    <select
                                        className={`select select-bordered w-full bg-base-100 text-base-content ${formErrors.selectedStaffId ? 'select-error' : ''}`}
                                        {...register("selectedStaffId")}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setSelectedStaffId(value);
                                            setValue("selectedStaffId", value);
                                            clearFieldError("selectedStaffId", value);
                                        }}
                                        disabled={staffs.length === 0}
                                    >
                                        <option value="">Select Teacher</option>
                                        {staffs.map((staff) => (
                                            <option key={staff._id} value={staff._id}>
                                                {staff.firstName} {staff.lastName}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.selectedStaffId && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.selectedStaffId.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Total Marks</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        className={`input input-bordered w-full bg-base-100 text-base-content ${formErrors.totalMarks ? 'input-error' : ''}`}
                                        placeholder="Enter total marks"
                                        {...register("totalMarks")}
                                        value={totalMarks?.toString() || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '') {
                                                handleTotalMarksChange('');
                                            } else {
                                                const numValue = parseInt(value);
                                                if (!isNaN(numValue) && isFinite(numValue) && numValue >= 1) {
                                                    handleTotalMarksChange(value);
                                                }
                                            }
                                            clearFieldError("totalMarks", value);
                                        }}
                                    />
                                    {formErrors.totalMarks && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.totalMarks.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Passing Marks</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={totalMarks || undefined}
                                        step="1"
                                        className={`input input-bordered w-full bg-base-100 text-base-content ${formErrors.passingMarks ? 'input-error' : ''}`}
                                        placeholder="Enter passing marks"
                                        {...register("passingMarks")}
                                        value={passingMarks?.toString() || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '') {
                                                setPassingMarks(null);
                                                setValue("passingMarks", "" as unknown as number);
                                            } else {
                                                const numValue = parseInt(value);
                                                if (!isNaN(numValue) && isFinite(numValue) && numValue >= 0) {
                                                    if (totalMarks === null || numValue <= totalMarks) {
                                                        setPassingMarks(numValue);
                                                        setValue("passingMarks", numValue as unknown as number);
                                                    } else {
                                                        toast.error(`Passing marks cannot exceed total marks (${totalMarks})`);
                                                        return;
                                                    }
                                                }
                                            }
                                            clearFieldError("passingMarks", value);
                                        }}
                                        disabled={totalMarks === null}
                                    />
                                    {formErrors.passingMarks && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.passingMarks.message}</span>
                                        </label>
                                    )}
                                </div>
                            </div>
                            {classId && sectionId && !isLoading && students.length > 0 ? (
                                <div className="mt-6">
                                    <h2 className="text-lg sm:text-xl font-bold mb-4 text-base-content">Total Students List ({students.length})</h2>

                                    {/* Mobile Cards */}
                                    <div className="block md:hidden space-y-3">
                                        {students.map(student => {
                                            const studentResult = results.find(r => r.studentId === student.id);
                                            const isPresent = studentResult?.present;
                                            const marks = studentResult?.marks;

                                            return (
                                                <div key={student.id} className="card bg-base-300 shadow-sm hover:shadow-md transition-all duration-200 border border-base-content/20 hover:border-base-content/30 rounded-lg overflow-hidden">
                                                    <div className="card-body p-4">
                                                        {/* Header */}
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="avatar placeholder">
                                                                    <div className="bg-gradient-to-br from-primary to-primary-focus text-primary-content rounded-full w-10 h-10 shadow-sm">
                                                                        <span className="text-sm font-semibold">
                                                                            {student.name.split(' ').map(n => n.charAt(0)).join('')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-semibold text-base-content text-sm sm:text-base leading-tight">
                                                                        {student.name}
                                                                    </h3>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className={`badge ${isPresent === true ? 'badge-success' : isPresent === false ? 'badge-error' : 'badge-warning'} text-xs`}>
                                                                    {isPresent === true ? 'Present' : isPresent === false ? 'Absent' : 'Not Set'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Attendance Selection */}
                                                        <div className="mb-3">
                                                            <span className="text-sm font-medium text-base-content mb-2 block">Attendance:</span>
                                                            <div className="flex gap-4">
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        name={`attendance-${student.id}`}
                                                                        className="radio radio-sm radio-success"
                                                                        checked={isPresent === true}
                                                                        onChange={() => handleAttendanceChange(student.id, true)}
                                                                    />
                                                                    <span className="text-sm text-base-content">Present</span>
                                                                </label>
                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        name={`attendance-${student.id}`}
                                                                        className="radio radio-sm radio-error"
                                                                        checked={isPresent === false}
                                                                        onChange={() => handleAttendanceChange(student.id, false)}
                                                                    />
                                                                    <span className="text-sm text-base-content">Absent</span>
                                                                </label>
                                                            </div>
                                                        </div>

                                                        {/* Marks Input */}
                                                        <div>
                                                            <label className="text-sm font-medium text-base-content mb-2 block">
                                                                Marks {totalMarks && `(out of ${totalMarks})`}:
                                                            </label>
                                                            <div className="flex flex-col">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    max={totalMarks || undefined}
                                                                    className={`input input-bordered w-full bg-base-100 text-base-content ${errors[student.id] ? 'input-error' : ''}`}
                                                                    placeholder={isPresent === false ? 'N/A (Absent)' : 'Enter marks'}
                                                                    value={marks ?? ''}
                                                                    disabled={isPresent === false}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        if (value === '') {
                                                                            handleMarksChange(student.id, null);
                                                                        } else {
                                                                            const numValue = parseFloat(value);
                                                                            if (!isNaN(numValue) && isFinite(numValue)) {
                                                                                handleMarksChange(student.id, numValue);
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                {errors[student.id] && (
                                                                    <span className="text-error text-sm mt-1">{errors[student.id]}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Desktop Table */}
                                    <div className="hidden md:block">
                                        <div className="overflow-x-auto border border-base-300 rounded-lg bg-base-100">
                                            <table className="table w-full">
                                                <thead className="sticky top-0 bg-base-300 border-b-2 border-base-content/20 z-10">
                                                    <tr>
                                                        <th className="text-base-content text-sm font-semibold py-3">Student Name</th>
                                                        <th className="text-base-content text-sm font-semibold py-3">Attendance</th>
                                                        <th className="text-base-content text-sm font-semibold py-3">Marks {totalMarks && `(/${totalMarks})`}</th>
                                                        <th className="text-base-content text-sm font-semibold py-3">Remark</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {students.map(student => {
                                                        const studentResult = results.find(r => r.studentId === student.id);
                                                        const isPresent = studentResult?.present;
                                                        const marks = studentResult?.marks;

                                                        return (
                                                            <tr key={student.id} className="hover:bg-base-200 transition-colors">
                                                                <td className="text-base-content text-sm font-medium">{student.name}</td>
                                                                <td>
                                                                    <div className="flex items-center gap-4">
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <input
                                                                                type="radio"
                                                                                name={`attendance-${student.id}`}
                                                                                className="radio radio-sm radio-success"
                                                                                checked={isPresent === true}
                                                                                onChange={() => handleAttendanceChange(student.id, true)}
                                                                            />
                                                                            <span className="text-sm text-base-content">Present</span>
                                                                        </label>
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <input
                                                                                type="radio"
                                                                                name={`attendance-${student.id}`}
                                                                                className="radio radio-sm radio-error"
                                                                                checked={isPresent === false}
                                                                                onChange={() => handleAttendanceChange(student.id, false)}
                                                                            />
                                                                            <span className="text-sm text-base-content">Absent</span>
                                                                        </label>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="flex flex-col">
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            max={totalMarks || undefined}
                                                                            className={`input input-bordered w-24 bg-base-100 text-base-content input-sm ${errors[student.id] ? 'input-error' : ''}`}
                                                                            placeholder={isPresent === false ? 'N/A' : 'Marks'}
                                                                            value={marks ?? ''}
                                                                            disabled={isPresent === false}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                if (value === '') {
                                                                                    handleMarksChange(student.id, null);
                                                                                } else {
                                                                                    const numValue = parseFloat(value);
                                                                                    if (!isNaN(numValue) && isFinite(numValue)) {
                                                                                        handleMarksChange(student.id, numValue);
                                                                                    }
                                                                                }
                                                                            }}
                                                                        />
                                                                        {errors[student.id] && (
                                                                            <span className="text-error text-xs mt-1">{errors[student.id]}</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        className="input input-bordered w-full bg-base-100 text-base-content"
                                                                        placeholder="Enter remark"
                                                                        value={studentResult?.remark || ''}
                                                                        onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : classId && sectionId && subjectId && !isStudentsLoading && isValidExamDetails ? (
                                <div className="mt-6">
                                    <h3 className="text-xl font-bold mb-4 text-base-content">Students</h3>
                                    <div className="flex justify-center items-center py-8">
                                        <p className="text-lg font-medium text-base-content">No students found for the selected class and section.</p>
                                    </div>
                                </div>
                            ) : isStudentsLoading && classId && sectionId && subjectId ? (
                                <div className="mt-6">
                                    <h3 className="text-xl font-bold mb-4 text-base-content">Students</h3>
                                    <div className="flex justify-center items-center py-8">
                                        <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                        <span className="ml-3 text-base-content">Loading students...</span>
                                    </div>
                                </div>
                            ) : null}
                            <div className="flex justify-end gap-4 mt-6">
                                <Button
                                    type="button"
                                    variant="error"
                                    outline
                                    onClick={() => router.push('/manage-result')}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    outline
                                    className="w-full sm:w-auto"
                                >
                                    Add Results
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Desktop and Large Screens: Full width layout */}
            <div className="hidden xl:block">
                <div className={`bg-base-300 border border-base-content/20 rounded-lg shadow-xl w-full flex flex-col ${students.length > 0 ? 'h-[calc(100vh-96px)] overflow-y-auto' : 'h-fit'}`}>
                    <div className="p-6 flex-shrink-0">
                        <h2 className="text-2xl xl:text-3xl font-bold text-base-content mb-6">Add Results</h2>

                        {/* Navigation Tabs - Hidden for students */}
                        {userRole !== 'STUDENT' && (
                            <div className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
                                {/* Sliding Background Indicator */}
                                <div
                                    className={`absolute top-1 bottom-1 rounded-lg bg-base-100 shadow-sm transition-all duration-300 ease-in-out ${pathname === '/manage-result/add'
                                        ? 'left-1 right-1/2 mr-1.5'
                                        : 'left-1/2 right-1 ml-1.5'
                                        }`}
                                />

                                <button
                                    onClick={() => router.push('/manage-result/add')}
                                    className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/manage-result/add'
                                        ? 'text-emerald-600'
                                        : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                >
                                    <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium truncate">Add Result</span>
                                </button>
                                <button
                                    onClick={() => router.push('/manage-result')}
                                    className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/manage-result'
                                        ? 'text-blue-400'
                                        : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                >
                                    <Eye className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium truncate">View Result</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-6 pb-6">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Exam Date</span>
                                    </label>
                                    <input
                                        type="date"
                                        min={academicYearStart}
                                        max={new Date().toISOString().split('T')[0]}
                                        className={`input input-bordered w-full bg-base-100 text-base-content ${formErrors.examDate ? 'input-error' : ''}`}
                                        {...register("examDate")}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setExamDate(value);
                                            setValue("examDate", value);
                                            clearFieldError("examDate", value);

                                            // Check for existing exam if both date and type are selected
                                            if (value && examType) {
                                                checkExistingExam(value, examType, classId, subjectId, sectionId);
                                            }
                                        }}
                                    />
                                    {formErrors.examDate && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.examDate.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Exam Type</span>
                                    </label>
                                    {isOtherExamType ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${formErrors.examType ? 'input-error' : ''}`}
                                                placeholder="Specify exam type"
                                                value={otherExamType}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setOtherExamType(value);
                                                    setValue("examType", value);
                                                    clearFieldError("examType", value);

                                                    // Check for existing exam if both date and type are selected
                                                    if (value && examDate) {
                                                        checkExistingExam(examDate, value, classId, subjectId, sectionId);
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="px-2"
                                                onClick={() => {
                                                    setExamType('');
                                                    setIsOtherExamType(false);
                                                    setOtherExamType('');
                                                    setValue("examType", "");
                                                }}
                                            >
                                                ↩
                                            </Button>
                                        </div>
                                    ) : (
                                        <select
                                            className={`select select-bordered w-full bg-base-100 text-base-content ${formErrors.examType ? 'select-error' : ''}`}
                                            {...register("examType")}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setExamType(value);
                                                setValue("examType", value);
                                                clearFieldError("examType", value);

                                                // Check for existing exam if both date and type are selected
                                                if (value && examDate) {
                                                    checkExistingExam(examDate, value, classId, subjectId, sectionId);
                                                }
                                            }}
                                        >
                                            <option value="">Select Exam Type</option>
                                            {examTypes.map((type) => (
                                                <option key={type._id} value={type._id}>
                                                    {type.type}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {formErrors.examType && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.examType.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Class</span>
                                    </label>
                                    <select
                                        className={`select select-bordered w-full bg-base-100 text-base-content ${formErrors.classId ? 'select-error' : ''}`}
                                        {...register("classId")}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Reset dependent fields when class changes
                                            setSubjectId('');
                                            setValue("subjectId", "");
                                            setSelectedStaffId('');
                                            setValue("selectedStaffId", "");
                                            setStudents([]);
                                            setResults([]);
                                            setClassId(value);
                                            setValue("classId", value);
                                            clearFieldError("classId", value);
                                            checkExistingExam(examDate, examType, value, subjectId, sectionId);
                                        }}
                                        disabled={isLoading}
                                    >
                                        <option value="">Select Class</option>
                                        {classOptions.map((option) => (
                                            <option key={option._id} value={option._id}>
                                                {option.classNumber}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.classId && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.classId.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Section</span>
                                    </label>
                                    <select
                                        className={`select select-bordered w-full bg-base-100 text-base-content ${formErrors.sectionId ? 'select-error' : ''}`}
                                        {...register("sectionId")}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Reset dependent fields when section changes
                                            setSubjectId('');
                                            setValue("subjectId", "");
                                            setSelectedStaffId('');
                                            setValue("selectedStaffId", "");
                                            setStudents([]);
                                            setResults([]);
                                            setSectionId(value);
                                            setValue("sectionId", value);
                                            clearFieldError("sectionId", value);
                                            checkExistingExam(examDate, examType, classId, subjectId, value);
                                        }}
                                        disabled={isLoading}
                                    >
                                        <option value="">Select Section</option>
                                        {sectionOptions.map((option) => (
                                            <option key={option._id} value={option._id}>
                                                {option.section}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.sectionId && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.sectionId.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Subject</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            className={`select select-bordered w-full bg-base-100 text-base-content ${formErrors.subjectId ? 'select-error' : ''}`}
                                            {...register("subjectId")}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // Clear dependent fields when subject changes
                                                setSelectedStaffId('');
                                                setValue("selectedStaffId", "");
                                                setStaffs([]);
                                                setStudents([]);
                                                setResults([]);
                                                setSubjectId(value);
                                                setValue("subjectId", value);
                                                clearFieldError("subjectId", value);
                                                checkExistingExam(examDate, examType, classId, value, sectionId);
                                            }}
                                            disabled={!classId || !sectionId}
                                        >
                                            <option value="">Select Subject</option>
                                            {subjectOptions.map((option) => (
                                                <option key={option._id} value={option._id}>
                                                    {option.subject}
                                                </option>
                                            ))}
                                        </select>
                                        {isLoading && classId && sectionId && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <span className="loading loading-spinner loading-sm text-primary"></span>
                                            </div>
                                        )}
                                    </div>
                                    {formErrors.subjectId && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.subjectId.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Teachers</span>
                                    </label>
                                    <select
                                        className={`select select-bordered w-full bg-base-100 text-base-content ${formErrors.selectedStaffId ? 'select-error' : ''}`}
                                        {...register("selectedStaffId")}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setSelectedStaffId(value);
                                            setValue("selectedStaffId", value);
                                            clearFieldError("selectedStaffId", value);
                                        }}
                                        disabled={staffs.length === 0}
                                    >
                                        <option value="">Select Teacher</option>
                                        {staffs.map((staff) => (
                                            <option key={staff._id} value={staff._id}>
                                                {staff.firstName} {staff.lastName}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.selectedStaffId && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.selectedStaffId.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Total Marks</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        className={`input input-bordered w-full bg-base-100 text-base-content ${formErrors.totalMarks ? 'input-error' : ''}`}
                                        placeholder="Enter total marks"
                                        {...register("totalMarks")}
                                        value={totalMarks?.toString() || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '') {
                                                handleTotalMarksChange('');
                                            } else {
                                                const numValue = parseInt(value);
                                                if (!isNaN(numValue) && isFinite(numValue) && numValue >= 1) {
                                                    handleTotalMarksChange(value);
                                                }
                                            }
                                            clearFieldError("totalMarks", value);
                                        }}
                                    />
                                    {formErrors.totalMarks && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.totalMarks.message}</span>
                                        </label>
                                    )}
                                </div>
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Passing Marks</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={totalMarks || undefined}
                                        step="1"
                                        className={`input input-bordered w-full bg-base-100 text-base-content ${formErrors.passingMarks ? 'input-error' : ''}`}
                                        placeholder="Enter passing marks"
                                        {...register("passingMarks")}
                                        value={passingMarks?.toString() || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '') {
                                                setPassingMarks(null);
                                                setValue("passingMarks", "" as unknown as number);
                                            } else {
                                                const numValue = parseInt(value);
                                                if (!isNaN(numValue) && isFinite(numValue) && numValue >= 0) {
                                                    if (totalMarks === null || numValue <= totalMarks) {
                                                        setPassingMarks(numValue);
                                                        setValue("passingMarks", numValue as unknown as number);
                                                    } else {
                                                        toast.error(`Passing marks cannot exceed total marks (${totalMarks})`);
                                                        return;
                                                    }
                                                }
                                            }
                                            clearFieldError("passingMarks", value);
                                        }}
                                        disabled={totalMarks === null}
                                    />
                                    {formErrors.passingMarks && (
                                        <label className="label">
                                            <span className="label-text-alt text-error">{formErrors.passingMarks.message}</span>
                                        </label>
                                    )}
                                </div>
                            </div>
                            {classId && sectionId && !isLoading && students.length > 0 ? (
                                <div className="mt-6">
                                    <h2 className="text-xl font-bold mb-4 text-base-content">Total Students List ({students.length})</h2>
                                    <div className="overflow-x-auto border border-base-300 rounded-lg bg-base-100">
                                        <table className="table w-full">
                                            <thead className="sticky top-0 bg-base-300 border-b-2 border-base-content/20 z-10">
                                                <tr>
                                                    <th className="text-base-content text-sm font-semibold py-3">Student Name</th>
                                                    <th className="text-base-content text-sm font-semibold py-3">Attendance</th>
                                                    <th className="text-base-content text-sm font-semibold py-3">Marks {totalMarks && `(/${totalMarks})`}</th>
                                                    <th className="text-base-content text-sm font-semibold py-3">Remark</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students.map(student => {
                                                    const studentResult = results.find(r => r.studentId === student.id);
                                                    const isPresent = studentResult?.present;
                                                    const marks = studentResult?.marks;

                                                    return (
                                                        <tr key={student.id} className="hover:bg-base-200 transition-colors">
                                                            <td className="text-base-content text-sm font-medium">{student.name}</td>
                                                            <td>
                                                                <div className="flex items-center gap-4">
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`attendance-${student.id}`}
                                                                            className="radio radio-sm radio-success"
                                                                            checked={isPresent === true}
                                                                            onChange={() => handleAttendanceChange(student.id, true)}
                                                                        />
                                                                        <span className="text-sm text-base-content">Present</span>
                                                                    </label>
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`attendance-${student.id}`}
                                                                            className="radio radio-sm radio-error"
                                                                            checked={isPresent === false}
                                                                            onChange={() => handleAttendanceChange(student.id, false)}
                                                                        />
                                                                        <span className="text-sm text-base-content">Absent</span>
                                                                    </label>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="flex flex-col">
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        max={totalMarks || undefined}
                                                                        className={`input input-bordered w-24 bg-base-100 text-base-content input-sm ${errors[student.id] ? 'input-error' : ''}`}
                                                                        placeholder={isPresent === false ? 'N/A' : 'Marks'}
                                                                        value={marks ?? ''}
                                                                        disabled={isPresent === false}
                                                                        onChange={(e) => {
                                                                            const value = e.target.value;
                                                                            if (value === '') {
                                                                                handleMarksChange(student.id, null);
                                                                            } else {
                                                                                const numValue = parseFloat(value);
                                                                                if (!isNaN(numValue) && isFinite(numValue)) {
                                                                                    handleMarksChange(student.id, numValue);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                    {errors[student.id] && (
                                                                        <span className="text-error text-xs mt-1">{errors[student.id]}</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    className="input input-bordered w-full bg-base-100 text-base-content"
                                                                    placeholder="Enter remark"
                                                                    value={studentResult?.remark || ''}
                                                                    onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : classId && sectionId && subjectId && !isStudentsLoading && isValidExamDetails ? (
                                <div className="mt-6">
                                    <h3 className="text-xl font-bold mb-4 text-base-content">Students</h3>
                                    <div className="flex justify-center items-center py-8">
                                        <p className="text-lg font-medium text-base-content">No students found for the selected class and section.</p>
                                    </div>
                                </div>
                            ) : isStudentsLoading && classId && sectionId && subjectId ? (
                                <div className="mt-6">
                                    <h3 className="text-xl font-bold mb-4 text-base-content">Students</h3>
                                    <div className="flex justify-center items-center py-8">
                                        <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                        <span className="ml-3 text-base-content">Loading students...</span>
                                    </div>
                                </div>
                            ) : null}
                            <div className="flex justify-end gap-4 mt-6">
                                <Button
                                    type="button"
                                    variant="error"
                                    outline
                                    onClick={() => router.push('/manage-result')}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    outline
                                >
                                    Add Results
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}