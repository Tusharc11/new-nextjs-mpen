'use client';

import React, { useEffect, useState } from 'react';
import { StudentMemberDTO } from '../api/dto/StudentMember';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { UserRole } from '@/lib/role';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, Eye } from 'lucide-react';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

export default function ViewAttendancePage() {
    const router = useRouter();
    const pathname = usePathname();

    const [subjects, setSubjects] = useState<{ _id: string, subject: string, class: string, section: string, courseId: { class: string, section: string } }[]>([]);
    const [students, setStudents] = useState<{ _id: string, name: string, status: string }[]>([]);
    const [selectedClassSection, setSelectedClassSection] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [attendanceDate, setAttendanceDate] = useState('');
    const [dateFieldTouched, setDateFieldTouched] = useState(false);
    const [classSections, setClassSections] = useState<{ id: string, label: string, classId: string, sectionId: string }[]>([]);
    const [isLoadingClassSections, setIsLoadingClassSections] = useState(false);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
    const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [staffInfo, setStaffInfo] = useState<{ firstName?: string, lastName?: string } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedStudents, setEditedStudents] = useState<{ _id: string, name: string, status: string }[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Fetch classes and sections and combine them
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
        }


        const fetchClassesAndSections = async () => {
            try {

                setIsLoadingClassSections(true);

                const [classesResponse, sectionsResponse] = await Promise.all([
                    fetch('/api/classes'),
                    fetch('/api/sections')
                ]);

                if (!classesResponse.ok || !sectionsResponse.ok) {
                    throw new Error('Failed to fetch data');
                }

                const classesData = await classesResponse.json();
                const sectionsData = await sectionsResponse.json();

                // Create combined class-section options
                const combinedOptions: { id: string, label: string, classId: string, sectionId: string }[] = [];

                classesData.forEach((cls: any) => {
                    sectionsData.forEach((section: any) => {
                        combinedOptions.push({
                            id: `${cls._id}-${section._id}`,
                            label: `${cls.classNumber} ${section.section}`,
                            classId: cls._id,
                            sectionId: section._id
                        });
                    });
                });

                setClassSections(combinedOptions);

                // Only fetch student details if the user is a student
                if (userId && userRole === 'STUDENT') {
                    await fetchStudentDetails(userId, combinedOptions);
                }
            } catch (error) {
                setClassSections([]);
            } finally {
                setIsLoadingClassSections(false);
            }
        };

        // Function to fetch student details and set class/section
        const fetchStudentDetails = async (studentId: string, options: any[]) => {
            try {
                // Get the student's class and section from student-class API
                const studentClassResponse = await fetch(`/api/student-class?studentId=${studentId}`);

                if (!studentClassResponse.ok) {
                    throw new Error('Failed to fetch student class information');
                }

                const studentClassData = await studentClassResponse.json();

                if (studentClassData && studentClassData.class && studentClassData.section) {
                    // Find matching class-section in our options
                    const matchingOption = options.find(
                        option => option.classId === studentClassData.class._id &&
                            option.sectionId === studentClassData.section._id
                    );

                    if (matchingOption) {
                        setSelectedClassSection(matchingOption.id);
                    }
                } else {
                    toast.error('No class/section found for this student');
                }
            } catch (error) {
                toast.error('Failed to load student details');
            }
        };

        fetchClassesAndSections();
    }, [userRole, userId]);

    // Fetch subjects when class-section is selected
    useEffect(() => {
        if (!selectedClassSection) {
            setSubjects([]);
            return;
        }


        const [classId, sectionId] = selectedClassSection.split('-');

        const fetchSubjects = async () => {
            try {
                setIsLoadingSubjects(true);
                const response = await fetch(`/api/manage-subject?classId=${classId}&sectionId=${sectionId}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch subjects');
                }

                const subjectsData = await response.json();
                setSubjects(subjectsData);
            } catch (error) {
                setSubjects([]);
                toast.error('Failed to fetch subjects');
            } finally {
                setIsLoadingSubjects(false);
            }
        };

        fetchSubjects();
    }, [selectedClassSection]);

    // Handle class-section selection change
    const handleClassSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newClassSection = e.target.value;
        setSelectedClassSection(newClassSection);
        // Reset dependent fields
        setSelectedSubject('');
        setAttendanceRecords([]);
        setHasSearched(false);
    };

    // Handle subject selection change
    const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSubject = e.target.value;
        setSelectedSubject(newSubject);
        setAttendanceRecords([]);
        setHasSearched(false);
    };

    // Fetch attendance records
    const fetchAttendance = async () => {
        if (!selectedClassSection || !selectedSubject || !attendanceDate) {
            toast.error('Please select all required fields');
            return;
        }

        try {
            setIsLoadingAttendance(true);
            setHasSearched(true);

            const [classId, sectionId] = selectedClassSection.split('-');

            const response = await fetch(`/api/attendance?classId=${classId}&sectionId=${sectionId}&subjectId=${selectedSubject}&attendanceDate=${attendanceDate}`);

            if (!response.ok) {
                throw new Error('Failed to fetch attendance records');
            }

            const data = await response.json();

            if (data && data.length > 0) {
                // Process attendance data
                setAttendanceRecords(data);

                // Get student details for the attendance records
                const studentIds = data.flatMap((record: any) =>
                    record.studentAttendance.map((student: any) => student.studentId)
                );

                if (studentIds.length > 0) {
                    const studentsResponse = await fetch(`/api/manage-staff?role=STUDENT`);
                    if (!studentsResponse.ok) {
                        throw new Error('Failed to fetch student details');
                    }

                    const studentsData = await studentsResponse.json();

                    // Map student IDs to names and attendance status
                    const studentAttendance = data[0].studentAttendance.map((attendance: any) => {
                        const student = studentsData.find((s: any) => s._id === attendance.studentId);
                        return {
                            _id: attendance.studentId,
                            name: student ? `${student.firstName} ${student.lastName}` : '',
                            status: attendance.status
                        };
                    });

                    setStudents(studentAttendance);

                    // Fetch staff information if available
                    if (data[0].staffId) {
                        try {
                            const staffResponse = await fetch(`/api/manage-staff?id=${data[0].staffId}`);
                            if (staffResponse.ok) {
                                const staffData = await staffResponse.json();
                                setStaffInfo(staffData);
                            }
                        } catch (error) {
                            setStaffInfo(null);
                        }
                    } else {
                        setStaffInfo(null);
                    }
                } else {
                    setStudents([]);
                    setStaffInfo(null);
                }
            } else {
                setAttendanceRecords([]);
                setStudents([]);
                setStaffInfo(null);
                toast.error('No attendance records found!');
            }
        } catch (error) {
            toast.error('Error fetching attendance records');
            setAttendanceRecords([]);
            setStudents([]);
            setStaffInfo(null);
        } finally {
            setIsLoadingAttendance(false);
        }
    };

    // Handle status change when editing
    const handleStatusChange = (studentId: string, newStatus: string) => {
        setEditedStudents(prev =>
            prev.map(student =>
                student._id === studentId ? { ...student, status: newStatus } : student
            )
        );
        setHasChanges(true);
    };

    // Save updated attendance
    const saveAttendance = async () => {
        if (!selectedClassSection || !selectedSubject || !attendanceDate) {
            toast.error('Missing required information');
            return;
        }

        try {
            const attendanceRecord = attendanceRecords[0];

            // Create a complete updated attendance object
            const updatedAttendance = {
                ...attendanceRecord,
                studentAttendance: editedStudents.map(student => ({
                    studentId: student._id,
                    status: student.status
                }))
            };

            const response = await fetch(`/api/attendance?id=${attendanceRecord._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedAttendance),
            });

            if (!response.ok) {
                throw new Error('Failed to update attendance');
            }

            toast.success('Attendance updated successfully');
            setIsEditing(false);
            setStudents(editedStudents);
        } catch (error) {
            toast.error('Failed to update attendance');
        }
    };

    // Toggle edit mode
    const toggleEditMode = () => {
        if (!isEditing) {
            // When entering edit mode, initialize editedStudents with current data
            setEditedStudents([...students]);
            setHasChanges(false);
        }
        setIsEditing(!isEditing);
    };

    return (
        <div className="flex flex-col w-full min-h-[calc(100vh-64px)] p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100 overflow-hidden">
            <div className={`card bg-base-300 border border-base-content/20 shadow-xl ${students.length > 0 ? 'h-[calc(100vh-96px)] overflow-y-auto' : 'h-fit'}`}>
                <div className="card-body">
                    <h2 className="card-title text-2xl font-bold text-base-content mb-6">View Attendance Records</h2>

                    {/* Navigation Tabs - Hidden for students */}
                    {userRole !== 'STUDENT' && (
                        <div className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
                            {/* Sliding Background Indicator */}
                            <div
                                className={`absolute top-1 bottom-1 rounded-lg bg-base-100 shadow-sm transition-all duration-300 ease-in-out ${pathname === '/attendance/add'
                                    ? 'left-1 right-1/2 mr-1.5'
                                    : 'left-1/2 right-1 ml-1.5'
                                    }`}
                            />

                            <button
                                onClick={() => router.push('/attendance/add')}
                                className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/attendance/add'
                                    ? 'text-emerald-600'
                                    : 'text-base-content/80 hover:text-base-content'
                                    }`}
                            >
                                <Plus className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium truncate">Add Attendance</span>
                            </button>
                            <button
                                onClick={() => router.push('/attendance')}
                                className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${pathname === '/attendance'
                                    ? 'text-blue-400'
                                    : 'text-base-content/80 hover:text-base-content'
                                    }`}
                            >
                                <Eye className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium truncate">View Attendance</span>
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Date Selection */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content">Attendance Date</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered w-full bg-base-100 text-base-content"
                                value={attendanceDate}
                                onChange={(e) => {
                                    setAttendanceDate(e.target.value);
                                    setDateFieldTouched(true);
                                }}
                                onFocus={() => setDateFieldTouched(true)}
                            />
                            {!attendanceDate && dateFieldTouched && (
                                <label className="label">
                                    <span className="label-text-alt text-warning">Please select a date</span>
                                </label>
                            )}
                        </div>

                        {/* Class-Section Selection - Only show if not student */}
                        {userRole !== 'STUDENT' && (
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text text-base-content">Class & Section</span>
                                </label>
                                <div className="relative">
                                    <select
                                        className="select select-bordered w-full bg-base-100 text-base-content"
                                        value={selectedClassSection}
                                        onChange={handleClassSectionChange}
                                        disabled={isLoadingClassSections}
                                    >
                                        <option value="">Select Class & Section</option>
                                        {classSections.map((cs) => (
                                            <option key={cs.id} value={cs.id} className="text-base-content bg-base-100">
                                                {cs.label}
                                            </option>
                                        ))}
                                    </select>
                                    {isLoadingClassSections && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <span className="loading loading-spinner loading-sm text-primary"></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Subject Selection */}
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text text-base-content">Subject</span>
                            </label>
                            <div className="relative">
                                <select
                                    className="select select-bordered w-full bg-base-100 text-base-content"
                                    value={selectedSubject || ''}
                                    onChange={handleSubjectChange}
                                    disabled={!selectedClassSection || isLoadingSubjects}
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map((subject) => (
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
                    </div>

                    <div className="flex justify-end mt-6">
                        <Button
                            type="button"
                            variant="primary"
                            outline
                            onClick={fetchAttendance}
                            disabled={!selectedClassSection || !selectedSubject || !attendanceDate}
                        >
                            Fetch Attendance
                        </Button>
                    </div>

                    {/* Attendance Records Display */}
                    {isLoadingAttendance ? (
                        <div className="text-center mt-6 py-12">
                            <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                            <span className="text-base-content">Loading attendance records...</span>
                        </div>
                    ) : (
                        hasSearched && (
                            <div className="mt-6">
                                <h2 className="text-xl font-semibold mb-4 text-base-content">
                                    {students.length > 0 && `Attendance Records - ${new Date(attendanceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`}
                                </h2>

                                {students.length > 0 && (
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex flex-wrap gap-2 items-center">
                                                {staffInfo && (
                                                    <p className="badge badge-primary badge-lg text-white">
                                                        <span className="font-semibold">Recorded by:</span> {staffInfo.firstName} {staffInfo.lastName}
                                                    </p>
                                                )}
                                                {students.length > 0 && (
                                                    <>
                                                        <div className="text-base-content">
                                                            <span className="font-semibold">Present:</span>
                                                            <span className="ml-1">{students.filter(student => student.status === 'P').length} |</span>
                                                        </div>
                                                        <div className="text-base-content">
                                                            <span className="font-semibold">Absent:</span>
                                                            <span className="ml-1">{students.filter(student => student.status === 'A').length} |</span>
                                                        </div>
                                                        <div className="text-base-content">
                                                            <span className="font-semibold">Total:</span>
                                                            <span className="ml-1">{students.length}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            {userRole != UserRole.STUDENT && attendanceRecords.length > 0 && attendanceRecords[0].staffId === userId && (
                                                isEditing ? (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="success"
                                                            outline
                                                            onClick={saveAttendance}
                                                            disabled={!hasChanges}
                                                        >
                                                            Save Changes
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="error"
                                                            outline
                                                            onClick={() => setIsEditing(false)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="primary"
                                                        outline
                                                        onClick={toggleEditMode}
                                                    >
                                                        Edit Attendance
                                                    </Button>
                                                )
                                            )}
                                        </div>

                                        {/* Mobile Card Layout */}
                                        <div className="block md:hidden">
                                            <div className="space-y-3 sm:space-y-4">
                                                {(isEditing ? editedStudents : students).map((student) => (
                                                    <div key={student._id} className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-300/50 hover:border-base-300 rounded-lg overflow-hidden">
                                                        <div className="card-body p-4">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="avatar placeholder">
                                                                        <div className="bg-gradient-to-br from-primary to-primary-focus text-primary-content rounded-full w-10 h-10 shadow-sm">
                                                                            <span className="text-sm font-semibold">
                                                                                {student.name.split(' ').map((n: string) => n.charAt(0)).join('')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <h3 className="font-semibold text-base-content text-sm sm:text-base leading-tight">
                                                                            {student.name}
                                                                        </h3>
                                                                    </div>
                                                                </div>
                                                                <div className="text-center">
                                                                    {isEditing ? (
                                                                        <label className="cursor-pointer flex items-center justify-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="checkbox checkbox-primary"
                                                                                checked={student.status === 'P'}
                                                                                onChange={() => handleStatusChange(student._id, student.status === 'P' ? 'A' : 'P')}
                                                                            />
                                                                            <span className="ml-2 text-base-content">
                                                                                {student.status === 'P' ?
                                                                                    <span className="text-success font-medium">Present</span> :
                                                                                    <span className="text-error font-medium">Absent</span>
                                                                                }
                                                                            </span>
                                                                        </label>
                                                                    ) : (
                                                                        student.status === 'P' ? (
                                                                            <span className="badge badge-success text-white font-medium">Present</span>
                                                                        ) : (
                                                                            <span className="badge badge-error text-white font-medium">Absent</span>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Tablet and Desktop Table Layout */}
                                        <div className="hidden md:block">
                                            <div className="border border-base-300 rounded-lg bg-base-100 h-full flex flex-col">
                                                <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                                    <table className="table w-full">
                                                        <thead className="bg-base-200 border-b-2 border-base-content/20 sticky top-0 z-0">
                                                            <tr>
                                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[200px]">Student Name</th>
                                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[150px] text-center">Attendance Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(isEditing ? editedStudents : students).map((student) => (
                                                                <tr key={student._id} className="hover:bg-base-200 transition-colors">
                                                                    <td className="text-base-content text-sm lg:text-base font-medium py-4">{student.name}</td>
                                                                    <td className="text-center py-4">
                                                                        {isEditing ? (
                                                                            <label className="cursor-pointer flex items-center justify-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="checkbox checkbox-primary"
                                                                                    checked={student.status === 'P'}
                                                                                    onChange={() => handleStatusChange(student._id, student.status === 'P' ? 'A' : 'P')}
                                                                                />
                                                                                <span className="ml-2 text-base-content">
                                                                                    {student.status === 'P' ?
                                                                                        <span className="text-success font-medium">Present</span> :
                                                                                        <span className="text-error font-medium">Absent</span>
                                                                                    }
                                                                                </span>
                                                                            </label>
                                                                        ) : (
                                                                            student.status === 'P' ? (
                                                                                <span className="badge badge-success text-white font-medium">Present</span>
                                                                            ) : (
                                                                                <span className="badge badge-error text-white font-medium">Absent</span>
                                                                            )
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Empty State */}
                                {students.length === 0 && hasSearched && (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <div className="text-4xl sm:text-6xl mb-4">📝</div>
                                        <h3 className="text-base sm:text-lg font-semibold text-base-content mb-2">No attendance records found</h3>
                                        <p className="text-sm sm:text-base text-base-content/60 text-center max-w-md">
                                            No attendance records were found for the selected criteria. Please check your date, class, and subject selections.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}