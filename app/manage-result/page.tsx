'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/button';
import { Loader2, Edit, Plus, Eye, ChevronDown, ChevronRight, Calendar, GraduationCap, Users, BookOpen, Trophy, Hash } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

interface Class {
    _id: string;
    classNumber: string;
}

interface Section {
    _id: string;
    section: string;
}

interface Student {
    _id: string;
    firstName: string;
    lastName: string;
}

interface Teacher {
    _id: string;
    firstName: string;
    lastName: string;
}

interface Subject {
    _id: string;
    subject: string;
}

interface Result {
    _id: string;
    examDate: string;
    examType?: {
        _id: string;
        type: string;
    };
    subjectId: string;
    totalMarks: number;
    passingMarks: number;
    studentMarks: number | null;
    percentage: number | null;
    grade: string | null;
    present: boolean;
    staffId: string;
    parentId: string;
    remark: string;
}

interface AcademicYear {
    _id: string;
    startDate: string;
    endDate: string;
}

const ViewResults = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [userType, setUserType] = useState<'student' | 'teacher' | ''>('');
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [isLoading, setIsLoading] = useState(false); // For loading results
    const [isLoadingStudents, setIsLoadingStudents] = useState(false); // For loading students
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
    const [hasFetchedResults, setHasFetchedResults] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [allStudentResults, setAllStudentResults] = useState<any[]>([]);
    const [isLoadingAcademicYears, setIsLoadingAcademicYears] = useState(true);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingResult, setEditingResult] = useState<Result | null>(null);
    const [updatedAttendance, setUpdatedAttendance] = useState(false);
    const [updatedMarks, setUpdatedMarks] = useState<number | null>(null);
    const [updatedRemark, setUpdatedRemark] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [expandedExamTypes, setExpandedExamTypes] = useState<Set<string>>(new Set());
    const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

    // Check if we're on mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Fetch classes on component mount
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const token = localStorage.getItem('token');

                if (!token) {
                  return;
                }
                const response = await fetch('/api/classes');
                if (!response.ok) {
                    throw new Error('Failed to fetch classes');
                }
                const data = await response.json();
                setClasses(data);
            } catch (error) {
                toast.error('Failed to load classes');
            }
        };

        fetchClasses();
    }, []);

    // Fetch sections on component mount
    useEffect(() => {
        const fetchSections = async () => {
            try {
                const token = localStorage.getItem('token');

                if (!token) {
                  return;
                }
                const response = await fetch('/api/sections');
                if (!response.ok) {
                    throw new Error('Failed to fetch sections');
                }
                const data = await response.json();
                setSections(data);
            } catch (error) {
                toast.error('Failed to load sections');
            }
        };

        fetchSections();
    }, []);

    // Fetch students or teachers based on selection
    useEffect(() => {
        if (!selectedClassId || !selectedSectionId || !userType) return;

        const fetchUsers = async () => {
            setIsLoadingStudents(true);
            try {
                if (userType) {
                    // Fetch students with their class and section information
                    const response = await fetch(`/api/manage-staff?role=STUDENT`);
                    const studentClassResponse = await fetch(`/api/student-class`);

                    if (!response.ok || !studentClassResponse.ok) {
                        throw new Error('Failed to fetch students');
                    }

                    const data = await response.json();
                    const studentClassData = await studentClassResponse.json();

                    // Filter students by the selected class and section
                    const filteredStudents = data.filter((student: any) => {
                        const matchingClass = studentClassData.find((cls: any) =>
                            cls.studentId === student._id &&
                            cls.class._id === selectedClassId &&
                            cls.section._id === selectedSectionId
                        );
                        return !!matchingClass;
                    });

                    setStudents(filteredStudents);
                }
            } catch (error) {
                toast.error(`Failed to load ${userType}s`);
            } finally {
                setIsLoadingStudents(false);
            }
        };

        fetchUsers();
    }, [selectedClassId, selectedSectionId, userType]);

    // Remove the automatic fetch from useEffect
    useEffect(() => {
        if (!selectedStudentId) {
            setResults([]);
        }
    }, [selectedStudentId, userType, selectedClassId, selectedSectionId]);

    // Modify this function to just return the data, not set state
    const getUserInfoFromToken = () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;
            const payload = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));
            return {
                role: decodedPayload.role,
                id: decodedPayload.id
            };
        } catch (error) {
            return null;
        }
    };

    // Update the useEffect for user role detection
    useEffect(() => {
        try {
            // Get user info from token and set states
            const userInfo = getUserInfoFromToken();
            if (userInfo) {
                setUserRole(userInfo.role);
                setUserId(userInfo.id);
            } else {
                toast.error('Not authenticated');
                router.push('/login');
            }
        } catch (error) {
            toast.error('Failed to get user information');
            router.push('/login');
        }
    }, [router]);

    // Add a separate useEffect that responds to userRole changes
    useEffect(() => {
        if (userRole) {
            if (userRole === 'ADMIN' || userRole === 'STAFF') {
                setUserType('teacher');
            } else if (userRole === 'STUDENT') {
                setUserType('student');

                if (userId) {
                    // For students, automatically fetch their class and section
                    fetchStudentDetails(userId);
                }
            }
        }
    }, [userRole, userId]);

    // Modify the academic year useEffect
    useEffect(() => {
        const fetchAcademicYears = async () => {
            setIsLoadingAcademicYears(true);
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
                    // Get current date
                    const currentDate = new Date();

                    // Find academic year containing current date
                    const currentAcademicYear = data.find((year: any) => {
                        const startDate = new Date(year.startDate);
                        const endDate = new Date(year.endDate);
                        return currentDate >= startDate && currentDate <= endDate;
                    });

                    if (currentAcademicYear) {
                        // Set the academic year that contains the current date
                        setSelectedAcademicYearId(currentAcademicYear._id);
                    } else {
                        // Fallback: Sort by startDate in descending order and use the most recent
                        const sortedYears = [...data].sort((a, b) =>
                            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                        );
                        setSelectedAcademicYearId(sortedYears[0]._id);
                    }
                }
            } catch (error) {
                toast.error('Failed to load academic years');
            } finally {
                setIsLoadingAcademicYears(false);
            }
        };

        fetchAcademicYears();
    }, []);

    // Modify the function to fetch subjects based on selected class and section
    const fetchSubjects = async () => {
        try {
            // Only fetch subjects if both class and section are selected
            if (!selectedClassId || !selectedSectionId) {
                return;
            }

            setIsLoadingSubjects(true);
            const params = new URLSearchParams({
                classId: selectedClassId,
                sectionId: selectedSectionId
            });

            const response = await fetch(`/api/manage-subject/?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch subjects');
            }
            const data = await response.json();
            setSubjects(data);

            // Reset selected subject when subjects change
            setSelectedSubjectId('');
        } catch (error) {
            toast.error('Failed to load subjects');
        } finally {
            setIsLoadingSubjects(false);
        }
    };

    // Add a useEffect to fetch subjects when class or section changes
    useEffect(() => {
        if (selectedClassId && selectedSectionId) {
            fetchSubjects();
        } else {
            // Clear subjects when class or section is not selected
            setSubjects([]);
            setSelectedSubjectId('');
        }
    }, [selectedClassId, selectedSectionId]);

    // Add function to fetch teachers
    const fetchTeachers = async () => {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
              return;
            }
            const response = await fetch('/api/manage-staff?role=STAFF');
            if (!response.ok) {
                throw new Error('Failed to fetch teachers');
            }
            const data = await response.json();
            setTeachers(data);
        } catch (error) {
            toast.error('Error fetching teachers');
        }
    };

    // Fetch subjects and teachers on component mount
    useEffect(() => {
        fetchSubjects();
        fetchTeachers();
    }, []);

    const handleUserTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value as 'student' | 'teacher' | '';
        setUserType(value);
        setSelectedStudentId('');
        setResults([]);
    };

    const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedClassId(e.target.value);
        setSelectedSectionId('');
        setSelectedStudentId('');
        setSelectedSubjectId('');
        setResults([]);
    };

    const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSectionId(e.target.value);
        setSelectedStudentId('');
        setSelectedSubjectId('');
        setResults([]);
    };

    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedStudentId(e.target.value);
        setResults([]);
        setHasFetchedResults(false);
    };

    // Modify the fetchResults function to handle both student and teacher cases
    const fetchResults = async () => {
        if (userType === 'student') {
            if (!selectedStudentId || !selectedClassId || !selectedSectionId) {
                toast.error('Please select class, section, and student first');
                return;
            }
        } else if (userType === 'teacher') {
            if (!selectedClassId || !selectedSectionId || !selectedSubjectId) {
                toast.error('Please select class, section, and subject first');
                return;
            }
        } else {
            toast.error('Please select user type first');
            return;
        }

        setIsLoading(true);
        setHasFetchedResults(true);

        try {
            if (userType === 'student') {
                // Fetch results for a specific student
                const params = new URLSearchParams({
                    studentId: selectedStudentId,
                    classId: selectedClassId,
                    sectionId: selectedSectionId
                });

                const response = await fetch(`/api/manage-result/?${params}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch results');
                }

                const data = await response.json();

                setResults(data);
            } else {
                // Fetch results for all students for a specific subject
                const params = new URLSearchParams({
                    classId: selectedClassId,
                    sectionId: selectedSectionId,
                    subjectId: selectedSubjectId
                });

                const response = await fetch(`/api/manage-result/?${params}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch results');
                }

                const data = await response.json();
                setAllStudentResults(data);
                // Clear single student results
                setResults([]);
            }

            // Ensure we have the latest subjects and teachers
            if (subjects.length === 0) {
                await fetchSubjects();
            }
            if (teachers.length === 0) {
                await fetchTeachers();
            }
        } catch (error) {
            toast.error('Failed to load results');
        } finally {
            setIsLoading(false);
        }
    };

    // Add helper functions to get names from IDs
    const getSubjectName = (subjectId: string) => {
        const subject = subjects.find(s => s._id === subjectId);
        return subject ? subject.subject : subjectId;
    };

    const getTeacherName = (teacherId: string) => {
        const teacher = teachers.find(t => t._id === teacherId);
        return teacher ? teacher.firstName + " " + teacher.lastName : teacherId;
    };

    // Add this function to fetch student details
    const fetchStudentDetails = async (studentId: string) => {
        try {
            // First get the student's class and section from student-class API
            const studentClassResponse = await fetch(`/api/student-class?studentId=${studentId}`);

            if (!studentClassResponse.ok) {
                throw new Error('Failed to fetch student class information');
            }

            const studentClassData = await studentClassResponse.json();
            if (studentClassData) {
                // Set class and section from the student's data
                setSelectedClassId(studentClassData.class._id);
                setSelectedSectionId(studentClassData.section._id);
                setSelectedStudentId(studentId);
            } else {
                toast.error('No class/section found for this student');
            }
        } catch (error) {
            toast.error('Failed to load student details');
        }
    };

    // Add this grade conversion function after the fetchStudentDetails function
    const calculateGrade = (marks: number, totalMarks: number): string => {
        const percentage = (marks / totalMarks) * 100;

        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B+';
        if (percentage >= 60) return 'B';
        if (percentage >= 50) return 'C+';
        if (percentage >= 40) return 'C';
        if (percentage >= 33) return 'D';
        return 'F';
    };

    // Update the groupResultsByExamType function to sort results
    const groupResultsByExamType = (results: Result[]) => {
        const grouped: { [key: string]: Result[] } = {};

        results.forEach(result => {
            const examType = result.examType?.type;
            if (examType) {
                if (!grouped[examType]) {
                    grouped[examType] = [];
                }
                grouped[examType].push(result);
            }
        });

        // Sort each group's results by exam date (newest first)
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
        });

        return grouped;
    };

    // Update the groupResultsByStudent function to sort results
    const groupResultsByStudent = (results: any[]) => {
        const grouped: { [key: string]: { studentName: string, results: any[] } } = {};

        results.flatMap(resultSet =>
            resultSet.results.forEach((studentResult: any) => {
                const studentId = studentResult.studentId._id;
                const studentName = `${studentResult.studentId.firstName} ${studentResult.studentId.lastName}`;

                if (!grouped[studentId]) {
                    grouped[studentId] = {
                        studentName,
                        results: []
                    };
                }

                grouped[studentId].results.push({
                    ...studentResult,
                    examDate: resultSet.examDate,
                    subjectId: resultSet.subjectId,
                    totalMarks: resultSet.totalMarks,
                    passingMarks: resultSet.passingMarks,
                    examType: resultSet.examType,
                    staffId: resultSet.staffId,
                    remark: studentResult.remark,
                    parentId: resultSet._id  // Include the parent document ID
                });
            })
        );

        // Sort each student's results by exam date (newest first)
        Object.keys(grouped).forEach(key => {
            grouped[key].results.sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
        });

        return grouped;
    };

    // Add this helper function near the top of your file
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }); // Formats as dd/mm/yyyy
    };

    const handleUpdateResult = async () => {
        if (!editingResult) {
            toast.error('No result selected');
            return;
        }

        // Only validate marks if student is present
        if (updatedAttendance && (updatedMarks === null || updatedMarks === undefined)) {
            toast.error('Please enter marks for present student');
            return;
        }

        // Set marks to null if student is absent, otherwise use the entered marks
        const marksToSubmit = updatedAttendance ? updatedMarks : null;
        const remarkToSubmit = updatedRemark || '';
        setIsUpdating(true);
        try {
            const response = await fetch(`/api/manage-result?updateOne=true`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    parentId: editingResult.parentId,  // Parent document ID
                    resultId: editingResult._id,           // Specific result ID
                    present: updatedAttendance,
                    marks: marksToSubmit,
                    remark: remarkToSubmit
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update result');
            }

            // Close modal first to prevent UI flicker
            setIsEditModalOpen(false);

            // Refresh data to see the changes
            if (userType === 'student') {
                // For student view
                await fetchResults();
            } else {
                // For teacher view
                // Clear previous results and re-fetch to get updated data
                setAllStudentResults([]);
                await fetchResults();
            }

            toast.success((editingResult as any).studentId.firstName + ' ' + (editingResult as any).studentId.lastName + ' result updated successfully');
        } catch (error) {
            toast.error('Failed to update result');
        } finally {
            setIsUpdating(false);
        }
    };

    // Add this function to handle editing
    const handleEditClick = (result: any) => {
        setEditingResult(result);
        // Correctly set initial marks based on the result structure
        // For student view results, marks is in 'studentMarks'
        // For teacher view, it's in 'marks'
        const currentMarks = result.studentMarks !== undefined ? result.studentMarks : result.marks;
        // Default to 0 if marks are null or undefined
        setUpdatedMarks(currentMarks !== null && currentMarks !== undefined ? currentMarks : 0);
        setUpdatedAttendance(result.present);
        setUpdatedRemark(result.remark || '');
        setIsEditModalOpen(true);
    };

    // Clear expanded states when results change
    useEffect(() => {
        if (userType === 'teacher' && allStudentResults.length > 0) {
            // Keep accordion sections collapsed by default
            setExpandedStudents(new Set());
        }
    }, [allStudentResults, userType]);

    // Clear expanded states when results change for student view
    useEffect(() => {
        if (userType === 'student' && results.length > 0) {
            // Keep accordion sections collapsed by default
            setExpandedExamTypes(new Set());
        }
    }, [results, userType]);

    // Toggle exam type expansion (for student view)
    const toggleExamType = (examType: string) => {
        const newExpanded = new Set(expandedExamTypes);
        if (newExpanded.has(examType)) {
            newExpanded.delete(examType);
        } else {
            newExpanded.add(examType);
        }
        setExpandedExamTypes(newExpanded);
    };

    // Toggle student expansion (for teacher view)
    const toggleStudent = (studentId: string) => {
        const newExpanded = new Set(expandedStudents);
        if (newExpanded.has(studentId)) {
            newExpanded.delete(studentId);
        } else {
            newExpanded.add(studentId);
        }
        setExpandedStudents(newExpanded);
    };

    // Mobile Result Card Component for Student View
    const StudentResultCard = ({ result }: { result: Result }) => (
        <div className="card bg-base-300 shadow-sm hover:shadow-md transition-all duration-200 border border-base-content/20 hover:border-base-content/30 rounded-lg overflow-hidden">
            <div className="card-body p-4">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="avatar placeholder">
                            <div className="bg-gradient-to-br from-primary to-primary-focus text-primary-content rounded-full w-10 h-10 shadow-sm">
                                <BookOpen className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base-content text-sm sm:text-base leading-tight">
                                {getSubjectName(result.subjectId)}
                            </h3>
                            <div className="flex items-center text-base-content/70 text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(result.examDate)}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`badge ${result.present ? 'badge-success' : 'badge-error'} text-xs`}>
                            {result.present ? 'Present' : 'Absent'}
                        </div>
                    </div>
                </div>

                {/* Result details */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Teacher:</span>
                        <span className="text-xs sm:text-sm text-base-content font-medium">
                            {getTeacherName(result.staffId)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Total Marks:</span>
                        <span className="text-xs sm:text-sm text-base-content font-medium">{result.totalMarks}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Passing Marks:</span>
                        <span className="text-xs sm:text-sm text-base-content font-medium">{result.passingMarks}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Marks Obtained:</span>
                        <span className="text-xs sm:text-sm text-base-content font-medium">
                            {result.present ? result.studentMarks : 'N/A'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Result:</span>
                        <span className={`badge ${result.present && result.studentMarks !== null && result.studentMarks >= result.passingMarks ? 'badge-success' : 'badge-error'} text-xs`}>
                            {result.present ? (
                                result.studentMarks !== null && result.studentMarks >= result.passingMarks ? 'Pass' : 'Fail'
                            ) : 'N/A'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Grade:</span>
                        <span className="text-xs sm:text-sm text-base-content font-medium">
                            {result.present ? (result.grade || calculateGrade(result.studentMarks || 0, result.totalMarks)) : 'N/A'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Remark:</span>
                        <span className="text-xs sm:text-sm text-base-content font-medium">
                            {result.remark ? result.remark : 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    // Mobile Result Card Component for Teacher View
    const TeacherResultCard = ({ result }: { result: any }) => (
        <div className="card bg-base-300 shadow-sm hover:shadow-md transition-all duration-200 border border-base-content/20 hover:border-base-content/30 rounded-lg overflow-hidden">
            <div className="card-body p-4">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="avatar placeholder">
                            <div className="bg-gradient-to-br from-secondary to-secondary-focus text-secondary-content rounded-full w-10 h-10 shadow-sm">
                                <Trophy className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-base-content text-sm sm:text-base leading-tight">
                                {result.examType.type}
                            </h3>
                            <div className="flex items-center text-base-content/70 text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(result.examDate)}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`badge ${result.present ? 'badge-success' : 'badge-error'} text-xs`}>
                            {result.present ? 'Present' : 'Absent'}
                        </div>
                        {result.staffId === userId && (
                            <Edit
                                className="h-5 w-5 cursor-pointer text-primary"
                                onClick={() => handleEditClick(result)}
                            />
                        )}
                    </div>
                </div>

                {/* Result details */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Subject:</span>
                        <span className="text-xs sm:text-sm text-base-content font-medium">
                            {getSubjectName(result.subjectId)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Total Marks:</span>
                        <span className="text-xs sm:text-sm text-base-content font-medium">{result.totalMarks}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Marks Obtained:</span>
                        <span className="text-xs sm:text-sm text-base-content font-medium">
                            {result.present ? result.marks : 'N/A'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Result:</span>
                        <span className={`badge ${result.present && result.marks >= result.passingMarks ? 'badge-success' : 'badge-error'} text-xs`}>
                            {result.present ? (
                                result.marks >= result.passingMarks ? 'Pass' : 'Fail'
                            ) : 'N/A'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Grade:</span>
                        <span className="text-xs sm:text-sm text-base-content font-medium">
                            {result.present ? (result.grade || calculateGrade(result.marks || 0, result.totalMarks)) : 'N/A'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md bg-base-200/50">
                        <span className="text-xs sm:text-sm text-base-content/80">Remark:</span>
                        <span className="text-xs sm:text-sm text-base-content font-medium">
                            {result.remark ? result.remark : 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    // Student Results Accordion Content
    const StudentResultsAccordion = () => (
        <div className="space-y-4">
            {Object.entries(groupResultsByExamType(results)).map(([examType, examResults], index) => {
                const isExamTypeExpanded = expandedExamTypes.has(examType);
                    
                return (
                    <div key={index} className="border border-base-300 rounded-lg bg-base-100 overflow-hidden shadow-sm">
                        {/* Exam Type Header */}
                        <div 
                            className="flex items-center justify-between p-4 bg-primary/10 hover:bg-primary/15 cursor-pointer transition-colors border-b border-base-300"
                            onClick={() => toggleExamType(examType)}
                        >
                            <div className="flex items-center space-x-3">
                                {isExamTypeExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-base-content/60" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-base-content/60" />
                                )}
                                <Trophy className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-base-content">
                                    {examType}
                                </h3>
                            </div>
                            <div className="flex items-center space-x-2">
                                <BookOpen className="w-4 h-4 text-base-content/60" />
                                <span className="text-sm text-base-content/60 font-medium">
                                    {examResults.length === 1 ? '1 subject' : `${examResults.length} subjects`}
                                </span>
                            </div>
                        </div>

                        {/* Exam Type Content */}
                        {isExamTypeExpanded && (
                            <div className="bg-base-50 border-t border-base-content">
                                {isMobile ? (
                                    <div className="space-y-3 p-4">
                                        {examResults.map((result, resultIndex) => (
                                            <StudentResultCard key={resultIndex} result={result} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="max-h-80 overflow-auto">
                                        <table className="table table-zebra w-full">
                                            <thead className="bg-base-200 border-b-2 border-base-content/20 sticky top-0 z-0">
                                                <tr className="bg-base-200">
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Exam Date</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Subject</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Teacher</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Total Marks</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Passing Marks</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Status</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Marks Obtained</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Result</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Grade</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Remark</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {examResults.map((result, resultIndex) => (
                                                    <tr key={resultIndex} className="text-base-content hover:bg-base-100 transition-colors">
                                                        <td>{formatDate(result.examDate)}</td>
                                                        <td>{getSubjectName(result.subjectId)}</td>
                                                        <td>{getTeacherName(result.staffId)}</td>
                                                        <td>{result.totalMarks}</td>
                                                        <td>{result.passingMarks}</td>
                                                        <td>
                                                            {result.present ? (
                                                                <span className="badge badge-success text-base-100">Present</span>
                                                            ) : (
                                                                <span className="badge badge-error text-base-100">Absent</span>
                                                            )}
                                                        </td>
                                                        <td>{result.present ? result.studentMarks : 'N/A'}</td>
                                                        <td>
                                                            {result.present ? (
                                                                result.studentMarks !== null && result.studentMarks >= result.passingMarks ? (
                                                                    <span className="badge badge-success text-base-100">Pass</span>
                                                                ) : (
                                                                    <span className="badge badge-error text-base-100">Fail</span>
                                                                )
                                                            ) : (
                                                                'N/A'
                                                            )}
                                                        </td>
                                                        <td>{result.present ? (result.grade || calculateGrade(result.studentMarks || 0, result.totalMarks)) : 'N/A'}</td>
                                                        <td>{result.remark ? result.remark : 'N/A'}</td>
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
    );

    // Teacher Results Accordion Content
    const TeacherResultsAccordion = () => (
        <div className="space-y-4">
            {Object.entries(groupResultsByStudent(allStudentResults)).map(([studentId, data], index) => {
                const isStudentExpanded = expandedStudents.has(studentId);

                return (
                    <div key={studentId} className="border border-base-300 rounded-lg bg-base-100 overflow-hidden shadow-sm">
                        {/* Student Header */}
                        <div 
                            className="flex items-center justify-between p-4 bg-primary/10 hover:bg-primary/15 cursor-pointer transition-colors border-b border-base-300"
                            onClick={() => toggleStudent(studentId)}
                        >
                            <div className="flex items-center space-x-3">
                                {isStudentExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-base-content/60" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-base-content/60" />
                                )}
                                <GraduationCap className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-semibold text-base-content">
                                    {data.studentName}
                                </h3>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Trophy className="w-4 h-4 text-base-content/60" />
                                <span className="text-sm text-base-content/60 font-medium">
                                    {data.results.length === 1 ? '1 result' : `${data.results.length} results`}
                                </span>
                            </div>
                        </div>

                        {/* Student Content */}
                        {isStudentExpanded && (
                            <div className="bg-base-50 border-t border-base-content">
                                {isMobile ? (
                                    <div className="space-y-3 p-4">
                                        {data.results.map((result: any, resultIndex: number) => (
                                            <TeacherResultCard key={resultIndex} result={result} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="max-h-80 overflow-auto">
                                        <table className="table table-zebra w-full">
                                            <thead className="bg-base-200 border-b-2 border-base-content/20 sticky top-0 z-0">
                                                <tr className="bg-base-200">
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Exam Type</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Exam Date</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Subject</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Total Marks</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Status</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Marks Obtained</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Result</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Grade</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Remark</th>
                                                    <th className="text-base-content text-sm lg:text-base min-w-[120px]">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.results.map((result: any, resultIndex: number) => (
                                                    <tr key={resultIndex} className="text-base-content hover:bg-base-100 transition-colors">
                                                        <td>{result.examType.type}</td>
                                                        <td>{formatDate(result.examDate)}</td>
                                                        <td>{getSubjectName(result.subjectId)}</td>
                                                        <td>{result.totalMarks}</td>
                                                        <td>
                                                            {result.present ? (
                                                                <span className="badge badge-success text-base-100">Present</span>
                                                            ) : (
                                                                <span className="badge badge-error text-base-100">Absent</span>
                                                            )}
                                                        </td>
                                                        <td>{result.present ? result.marks : 'N/A'}</td>
                                                        <td>
                                                            {result.present ? (
                                                                result.marks >= result.passingMarks ? (
                                                                    <span className="badge badge-success text-base-100">Pass</span>
                                                                ) : (
                                                                    <span className="badge badge-error text-base-100">Fail</span>
                                                                )
                                                            ) : (
                                                                'N/A'
                                                            )}
                                                        </td>
                                                        <td>{result.present ? (result.grade || calculateGrade(result.marks || 0, result.totalMarks)) : 'N/A'}</td>
                                                        <td>{result.remark ? result.remark : 'N/A'}</td>
                                                        <td>
                                                            <div className="flex gap-1 justify-center">
                                                                {result.staffId === userId && (
                                                                    <Button className="btn btn-ghost btn-xs hover:bg-info/10" title="Edit Result">
                                                                        <Edit
                                                                            className="w-4 h-4 text-info cursor-pointer"
                                                                            onClick={() => handleEditClick(result)}
                                                                        />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
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
    );

    return (
        <div className="flex flex-col w-full min-h-[calc(100vh-64px)] p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100">
            {/* Mobile and Tablet: Centered container with max-width */}
            <div className="block xl:hidden">
                <div className={`card bg-base-200 shadow-xl w-full max-w-6xl mx-auto flex flex-col ${(userType === 'student' && results.length > 0) || (userType === 'teacher' && allStudentResults.length > 0) ? 'h-[calc(100vh-96px)] overflow-y-auto' : 'h-fit'}`}>
                    <div className="card-body p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 flex-shrink-0">
                            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content mb-4">View Results</h2>

                            {/* Navigation Tabs - Hidden for students */}
                            {userRole !== 'STUDENT' && (
                                <div className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
                                    {/* Sliding Background Indicator */}
                                    <div 
                                        className={`absolute top-1 bottom-1 rounded-lg bg-base-100 shadow-sm transition-all duration-300 ease-in-out ${
                                            pathname === '/manage-result/add' 
                                                ? 'left-1 right-1/2 mr-1.5' 
                                                : 'left-1/2 right-1 ml-1.5'
                                        }`}
                                    />
                                    
                                    <button
                                        onClick={() => router.push('/manage-result/add')}
                                        className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${
                                            pathname === '/manage-result/add' 
                                                ? 'text-emerald-600' 
                                                : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                    >
                                        <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-medium truncate">Add Result</span>
                                    </button>
                                    <button
                                        onClick={() => router.push('/manage-result')}
                                        className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${
                                            pathname === '/manage-result' 
                                                ? 'text-blue-400' 
                                                : 'text-base-content/80 hover:text-base-content'
                                        }`}
                                    >
                                        <Eye className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                        <span className="text-xs sm:text-sm font-medium truncate">View Result</span>
                                    </button>
                                </div>
                            )}

                            {/* Form Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {/* Academic Year Selection */}
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Academic Year</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="select select-bordered w-full bg-base-100 text-base-content"
                                            value={selectedAcademicYearId}
                                            onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                                        >
                                            <option value="">Select Academic Year</option>
                                            {academicYears.map(year => {
                                                const startDate = new Date(year.startDate);
                                                const endDate = new Date(year.endDate);
                                                const label = `${startDate.toLocaleString('default', { month: 'short' })} ${startDate.getFullYear()} - ${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`;

                                                return (
                                                    <option key={year._id} value={year._id} className="text-base-content bg-base-100">
                                                        {label}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {isLoadingAcademicYears && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <span className="loading loading-spinner loading-sm text-primary"></span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Class Selection - Only shown for teachers */}
                                {userType !== 'student' && (
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Select Class</span>
                                        </label>
                                        <select
                                            className="select select-bordered w-full bg-base-100 text-base-content"
                                            value={selectedClassId}
                                            onChange={handleClassChange}
                                            disabled={!userType}
                                        >
                                            <option value="">Select Class</option>
                                            {classes.map(cls => (
                                                <option key={cls._id} value={cls._id} className="text-base-content bg-base-100">
                                                    {cls.classNumber}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Section Selection - Only shown for teachers */}
                                {userType !== 'student' && (
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Select Section</span>
                                        </label>
                                        <select
                                            className="select select-bordered w-full bg-base-100 text-base-content"
                                            value={selectedSectionId}
                                            onChange={handleSectionChange}
                                            disabled={!userType}
                                        >
                                            <option value="">Select Section</option>
                                            {sections.map(section => (
                                                <option key={section._id} value={section._id} className="text-base-content bg-base-100">
                                                    {section.section}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Subject/Student Selection */}
                                {userType === 'teacher' ? (
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Select Subject</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                className="select select-bordered w-full bg-base-100 text-base-content"
                                                value={selectedSubjectId}
                                                onChange={(e) => {
                                                    setSelectedSubjectId(e.target.value);
                                                    setAllStudentResults([]);
                                                    setHasFetchedResults(false);
                                                }}
                                                disabled={!selectedSectionId}
                                            >
                                                <option value="" disabled>Select Subject</option>
                                                {subjects.map(subject => (
                                                    <option key={subject._id} value={subject._id} className="text-base-content bg-base-100">
                                                        {subject.subject}
                                                    </option>
                                                ))}
                                            </select>
                                            {isLoadingSubjects && (
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                    <span className="loading loading-spinner loading-sm text-primary"></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : userType !== 'student' && (
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Select Student</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                className="select select-bordered w-full bg-base-100 text-base-content"
                                                value={selectedStudentId}
                                                onChange={handleUserChange}
                                                disabled={!selectedSectionId}
                                            >
                                                <option value="">Select Student</option>
                                                {students.map(student => (
                                                    <option key={student._id} value={student._id} className="text-base-content bg-base-100">
                                                        {student.firstName} {student.lastName}
                                                    </option>
                                                ))}
                                            </select>
                                            {isLoading && !selectedStudentId && (
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                    <span className="loading loading-spinner loading-sm text-primary"></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Fetch Results Button */}
                            <div className="flex justify-end mb-4">
                                <Button
                                    type="button"
                                    variant="primary"
                                    outline
                                    onClick={fetchResults}
                                    disabled={(userType === 'student' && !selectedStudentId) ||
                                        (userType === 'teacher' && !selectedSubjectId) ||
                                        isLoading}
                                    className="w-full sm:w-auto"
                                >
                                    Fetch Results
                                </Button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4" />
                                    <p className="text-base-content text-sm sm:text-base">Loading Results...</p>
                                </div>
                            ) : userType === 'student' && results.length > 0 ? (
                                <StudentResultsAccordion />
                            ) : userType === 'teacher' && allStudentResults.length > 0 ? (
                                <TeacherResultsAccordion />
                            ) : selectedStudentId && hasFetchedResults ||
                                (userType === 'teacher' && selectedSubjectId && hasFetchedResults) ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="text-4xl sm:text-6xl mb-4">📊</div>
                                    <h3 className="text-base sm:text-lg font-semibold text-base-content mb-2">No results found</h3>
                                    <p className="text-sm sm:text-base text-base-content/60 text-center max-w-md">
                                        No results found for the selected criteria
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop and Large Screens: Full width layout */}
            <div className="hidden xl:block">
                <div className={`bg-base-300 border border-base-content/20 rounded-lg shadow-xl w-full flex flex-col ${(userType === 'student' && results.length > 0) || (userType === 'teacher' && allStudentResults.length > 0) ? 'h-[calc(100vh-96px)] overflow-y-auto' : 'h-fit'}`}>
                    <div className="p-6 flex-shrink-0">
                        <h2 className="text-2xl xl:text-3xl font-bold text-base-content mb-6">View Results</h2>

                        {/* Navigation Tabs - Hidden for students */}
                        {userRole !== 'STUDENT' && (
                            <div className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
                                {/* Sliding Background Indicator */}
                                <div 
                                    className={`absolute top-1 bottom-1 rounded-lg bg-base-100 shadow-sm transition-all duration-300 ease-in-out ${
                                        pathname === '/manage-result/add' 
                                            ? 'left-1 right-1/2 mr-1.5' 
                                            : 'left-1/2 right-1 ml-1.5'
                                    }`}
                                />
                                
                                <button
                                    onClick={() => router.push('/manage-result/add')}
                                    className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${
                                        pathname === '/manage-result/add' 
                                            ? 'text-emerald-600' 
                                            : 'text-base-content/80 hover:text-base-content'
                                    }`}
                                >
                                    <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium truncate">Add Result</span>
                                </button>
                                <button
                                    onClick={() => router.push('/manage-result')}
                                    className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${
                                        pathname === '/manage-result' 
                                            ? 'text-blue-400' 
                                            : 'text-base-content/80 hover:text-base-content'
                                    }`}
                                >
                                    <Eye className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm font-medium truncate">View Result</span>
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {/* Academic Year Selection (First Field) */}
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text text-base-content">Academic Year</span>
                                </label>
                                <div className="relative">
                                    <select
                                        className="select select-bordered w-full bg-base-100 text-base-content"
                                        value={selectedAcademicYearId}
                                        onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                                    >
                                        <option value="">Select Academic Year</option>
                                        {academicYears.map(year => {
                                            const startDate = new Date(year.startDate);
                                            const endDate = new Date(year.endDate);
                                            const label = `${startDate.toLocaleString('default', { month: 'short' })} ${startDate.getFullYear()} - ${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`;

                                            return (
                                                <option key={year._id} value={year._id} className="text-base-content bg-base-100">
                                                    {label}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {isLoadingAcademicYears && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <span className="loading loading-spinner loading-sm text-primary"></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Class Selection - Only shown for teachers */}
                            {userType !== 'student' && (
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Select Class</span>
                                    </label>
                                    <select
                                        className="select select-bordered w-full bg-base-100 text-base-content"
                                        value={selectedClassId}
                                        onChange={handleClassChange}
                                        disabled={!userType}
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(cls => (
                                            <option key={cls._id} value={cls._id} className="text-base-content bg-base-100">
                                                {cls.classNumber}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Section Selection - Only shown for teachers */}
                            {userType !== 'student' && (
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Select Section</span>
                                    </label>
                                    <select
                                        className="select select-bordered w-full bg-base-100 text-base-content"
                                        value={selectedSectionId}
                                        onChange={handleSectionChange}
                                        disabled={!userType}
                                    >
                                        <option value="">Select Section</option>
                                        {sections.map(section => (
                                            <option key={section._id} value={section._id} className="text-base-content bg-base-100">
                                                {section.section}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Conditional: Show either Subject or Student dropdown based on userType */}
                            {userType === 'teacher' ? (
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Select Subject</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="select select-bordered w-full bg-base-100 text-base-content"
                                            value={selectedSubjectId}
                                            onChange={(e) => {
                                                setSelectedSubjectId(e.target.value);
                                                setAllStudentResults([]);
                                                setHasFetchedResults(false);
                                            }}
                                            disabled={!selectedSectionId}
                                        >
                                            <option value="" disabled>Select Subject</option>
                                            {subjects.map(subject => (
                                                <option key={subject._id} value={subject._id} className="text-base-content bg-base-100">
                                                    {subject.subject}
                                                </option>
                                            ))}
                                        </select>
                                        {isLoadingSubjects && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <span className="loading loading-spinner loading-sm text-primary"></span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : userType === 'student' ? (
                                // For students, don't show any additional selection field
                                null
                            ) : (
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-base-content">Select Student</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="select select-bordered w-full bg-base-100 text-base-content"
                                            value={selectedStudentId}
                                            onChange={handleUserChange}
                                            disabled={!selectedSectionId}
                                        >
                                            <option value="">Select Student</option>
                                            {students.map(student => (
                                                <option key={student._id} value={student._id} className="text-base-content bg-base-100">
                                                    {student.firstName} {student.lastName}
                                                </option>
                                            ))}
                                        </select>
                                        {isLoading && !selectedStudentId && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <span className="loading loading-spinner loading-sm text-primary"></span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Move the fetch results button here, right after the selection fields */}
                        <div className="flex justify-end mb-6">
                            <Button
                                type="button"
                                variant="primary"
                                outline
                                onClick={fetchResults}
                                disabled={(userType === 'student' && !selectedStudentId) ||
                                    (userType === 'teacher' && !selectedSubjectId) ||
                                    isLoading}
                            >
                                Fetch Results
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-6 pb-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                <p className="text-base-content text-lg">Loading Results...</p>
                            </div>
                        ) : userType === 'student' && results.length > 0 ? (
                            <StudentResultsAccordion />
                        ) : userType === 'teacher' && allStudentResults.length > 0 ? (
                            <TeacherResultsAccordion />
                        ) : selectedStudentId && hasFetchedResults ||
                            (userType === 'teacher' && selectedSubjectId && hasFetchedResults) ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <div className="text-6xl mb-6">📊</div>
                                <h3 className="text-xl font-semibold text-base-content mb-3">No results found</h3>
                                <p className="text-base text-base-content/60 text-center max-w-lg">
                                    No results found for the selected criteria
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Edit Modal - Keep unchanged */}
            {isEditModalOpen && editingResult && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-base-100 p-6 rounded-lg shadow-lg w-96">
                        <h3 className="text-lg font-bold mb-4 text-base-content">Update Result</h3>

                        <div className="mb-4">
                            <p className="text-sm text-base-content mb-1">Exam: {editingResult.examType?.type}</p>
                            <p className="text-sm text-base-content mb-1">Date: {formatDate(editingResult.examDate)}</p>
                            <p className="text-sm text-base-content mb-3">Total Marks: {editingResult.totalMarks}</p>
                            <p className="text-sm text-base-content mb-3">Remark: {editingResult.remark}</p>

                            {/* Attendance toggle */}
                            <label className="label cursor-pointer justify-start gap-2 mb-4">
                                <span className="label-text text-base-content">Attendance Status:</span>
                                <div className="flex items-center">
                                    <span className={`mr-2 text-base-content ${!updatedAttendance ? 'font-bold' : ''}`}>Absent</span>
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-success"
                                        checked={updatedAttendance}
                                        onChange={(e) => setUpdatedAttendance(e.target.checked)}
                                    />
                                    <span className={`ml-2 text-base-content ${updatedAttendance ? 'font-bold' : ''}`}>Present</span>
                                </div>
                            </label>

                            {/* Only render marks input when attendance is present */}
                            {updatedAttendance && (
                                <div className="mt-2">
                                    <label className="label pt-0">
                                        <span className="label-text text-base-content">Marks (0 - {editingResult.totalMarks})</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="input input-bordered w-full bg-base-200 text-base-content"
                                        min="0"
                                        max={editingResult.totalMarks}
                                        step="0.01"
                                        placeholder="Enter marks (default: 0)"
                                        value={updatedMarks === null ? 0 : updatedMarks}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '') {
                                                setUpdatedMarks(0);
                                            } else {
                                                const numValue = parseFloat(value);
                                                if (!isNaN(numValue) && isFinite(numValue)) {
                                                    if (numValue < 0) {
                                                        setUpdatedMarks(0);
                                                        toast.error('Marks cannot be negative. Set to 0.');
                                                    } else if (numValue > editingResult.totalMarks) {
                                                        setUpdatedMarks(editingResult.totalMarks);
                                                        toast.error(`Marks cannot exceed total marks (${editingResult.totalMarks}). Set to maximum.`);
                                                    } else {
                                                        setUpdatedMarks(Math.round(numValue * 100) / 100); // Round to 2 decimal places
                                                    }
                                                } else {
                                                    setUpdatedMarks(0);
                                                }
                                            }
                                        }}
                                        onWheel={(e) => e.currentTarget.blur()}
                                    />
                                </div>
                            )}
                            <div className="mt-2">
                                <label className="label pt-0">
                                    <span className="label-text text-base-content">Remark</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full bg-base-200 text-base-content"
                                    placeholder="Enter remark"
                                    value={updatedRemark || ''}
                                    onChange={(e) => setUpdatedRemark(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="error"
                                outline
                                onClick={() => setIsEditModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                outline
                                onClick={handleUpdateResult}
                                disabled={isUpdating}
                            >
                                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewResults;
