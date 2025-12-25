'use client';

import React, { useEffect, useState } from 'react';
import { StudentMemberDTO } from '../../api/dto/StudentMember';
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/button';
import AcademicYearDropdown from '@/app/components/ui/academicYearDropdown';
import { ISession } from '@/app/api/models/session';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, Eye } from 'lucide-react';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

export default function AttendanceAddPage() {
    const router = useRouter();
    const pathname = usePathname();

    // State for classes and sections combined
    const [classSections, setClassSections] = useState<{
        classId: string,
        sectionId: string,
        display: string,
    }[]>([]);

    // State for subjects 
    const [subjects, setSubjects] = useState<{
        _id: string,
        subject: string
    }[]>([]);

    const [staff, setStaff] = useState<StudentMemberDTO[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    const [selectedYear, setSelectedYear] = useState<ISession | null>(null);
    const [selectedClassSection, setSelectedClassSection] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedStaff, setSelectedStaff] = useState('');
    const [attendanceDate, setAttendanceDate] = useState('');
    const [attendanceData, setAttendanceData] = useState([]);

    const [academicYears, setAcademicYears] = useState<ISession[]>([]);

    const [dateFieldTouched, setDateFieldTouched] = useState(false);

    const [isLoadingStaff, setIsLoadingStaff] = useState(false);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
    const [isLoadingClassSections, setIsLoadingClassSections] = useState(false);
    const [isLoadingYears, setIsLoadingYears] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Fetch academic years on component mount
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

        const fetchData = async () => {
            try {
                if (userId && userRole != 'STUDENT') {
                    setIsLoadingStaff(true);
                    setIsLoadingClassSections(true);
                    setIsLoadingYears(true);
                    const [classesResponse, sectionsResponse, sessionResponse, staffResponse] = await Promise.all([
                        fetch(`/api/classes`),
                        fetch(`/api/sections`),
                        fetch('/api/session'),
                        fetch(`/api/manage-staff?role=STAFF`)
                    ]);

                    if (!classesResponse.ok || !sectionsResponse.ok || !sessionResponse.ok || !staffResponse.ok) {
                        throw new Error('Failed to fetch data');
                    }

                    const classesData = await classesResponse.json();
                    const sessionData = await sessionResponse.json();
                    const staffData = await staffResponse.json();
                    const sectionsData = await sectionsResponse.json();

                    setAcademicYears(sessionData);
                    setStaff(staffData);
                    setSelectedStaff(userId);

                    let allClassSections: { classId: string; sectionId: string; display: string; }[] = [];

                    for (const classItem of classesData) {

                        // Create combined class-section entries
                        const classSectionsForClass = sectionsData.map((section: any) => ({
                            classId: classItem._id,
                            sectionId: section._id,
                            display: `${classItem.classNumber} ${section.section}`
                        }));

                        allClassSections = [...allClassSections, ...classSectionsForClass];
                    }
                    setClassSections(allClassSections);

                    // Set default academic year
                    if (sessionData.length > 0) {
                        // Get current date
                        const currentDate = new Date();

                        // Find academic year containing current date
                        const currentAcademicYear = sessionData.find((year: any) => {
                            const startDate = new Date(year.startDate);
                            const endDate = new Date(year.endDate);
                            return currentDate >= startDate && currentDate <= endDate;
                        });

                        if (currentAcademicYear) {
                            // Set the academic year that contains the current date
                            setSelectedYear(currentAcademicYear);
                        } else {
                            // Fallback: Sort by startDate in descending order and use the most recent
                            const sortedYears = [...sessionData].sort((a, b) =>
                                new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                            );
                            setSelectedYear(sortedYears[0]);
                        }
                    }

                }
            } catch (error) {
                toast.error('Error fetching academic years');
            } finally {
                setIsLoadingYears(false);
                setIsLoadingClassSections(false);
                setIsLoadingStaff(false);
            }
        };

        fetchData();
    }, [userRole, userId]);

    // Fetch students when class and section are selected
    useEffect(() => {
        if (!selectedClassId || !selectedSectionId) {
            setStudents([]);
            setAttendanceData([]);
            return;
        }

        const fetchSubjects = async () => {
            try {
                setIsLoadingSubjects(true);
                const response = await fetch(`/api/manage-subject?classId=${selectedClassId}&sectionId=${selectedSectionId}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch subjects');
                }

                const data = await response.json();
                setSubjects(data);
            } catch (error) {
                toast.error('Error fetching subjects');
            } finally {
                setIsLoadingSubjects(false);
            }
        }

        const fetchStudents = async () => {
            try {
                setIsLoadingStudents(true);
                const response = await fetch(`/api/student-class?classId=${selectedClassId}&sectionId=${selectedSectionId}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch students');
                }

                const data = await response.json();
                setStudents(data);

                const initialAttendance = data.map((student: any) => ({
                    studentId: student.studentId._id,
                    name: student.studentId.firstName + " " + student.studentId.lastName,
                    present: true
                }));

                setAttendanceData(initialAttendance);
            } catch (error) {
                toast.error('Error fetching students');
                setStudents([]);
                setAttendanceData([]);
            } finally {
                setIsLoadingStudents(false);
            }
        };

        fetchStudents();
        fetchSubjects();
    }, [selectedClassId, selectedSectionId]);

    // Handle attendance toggle
    const handleAttendanceChange = (studentId: string) => {
        setAttendanceData((prev: any) =>
            prev.map((item: any) =>
                item.studentId === studentId
                    ? { ...item, present: !item.present }
                    : item
            )
        );
    };

    // Submit attendance
    const submitAttendance = async () => {
        if (!attendanceDate) {
            toast.error('Please select a date for attendance');
            return;
        }

        if (!selectedStaff || selectedStaff === '') {
            toast.error('Please select a staff member');
            return;
        }

        try {
            // Check if attendance already exists
            const checkResponse = await fetch(`/api/attendance?attendanceDate=${attendanceDate}&subjectId=${selectedSubject}&classId=${selectedClassId}&sectionId=${selectedSectionId}`);
            const checkData = await checkResponse.json();

            if (checkData.length > 0) {
                toast.error('Attendance already recorded. Please select a different date, subject, class or section.');
                return;
            }

            // Format student attendance data
            const formattedStudentAttendance = attendanceData.map((student: any) => ({
                studentId: student.studentId,
                status: student.present ? "P" : "A"
            }));

            // Create the payload
            const payload = {
                academicYearId: selectedYear?._id,
                subjectId: selectedSubject,
                staffId: selectedStaff,
                attendanceDate: attendanceDate,
                studentAttendance: formattedStudentAttendance,
                sectionId: selectedSectionId,
                classId: selectedClassId
            };

            // Submit attendance
            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                toast.success('Class ' + classSections.find((cs) => cs.classId === selectedClassId && cs.sectionId === selectedSectionId)?.display + ' attendance submitted successfully');
                // Reset form
                setSelectedSubject('');
                setSelectedStaff('');
                setAttendanceDate('');
                setAttendanceData([]);
                setStudents([]);
                setSelectedClassSection('');
            } else {
                const errorData = await response.json().catch(() => ({}));
                toast.error('Failed to submit attendance: ' + (errorData.message || 'Unknown error'));
            }
        } catch (error) {
            toast.error('Error submitting attendance');
            toast.error('Error submitting attendance');
        }
    };

    // Handle class-section selection change
    const handleClassSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setSelectedClassSection(value);

        // Parse the selected class-section to get classId and sectionId
        if (value) {
            const [classId, sectionId] = value.split('|');
            setSelectedClassId(classId);
            setSelectedSectionId(sectionId);
        } else {
            setSelectedClassId('');
            setSelectedSectionId('');
        }

        // Reset dependent fields
        setSelectedSubject('');
    };

    // Handle subject selection change
    const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedSubjectId = e.target.value;
        setSelectedSubject(selectedSubjectId);
        // Reset staff selection
    };

    // Handle staff selection change
    const handleStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStaff = e.target.value;
        setSelectedStaff(newStaff);
        // Only reset the date
    };

    const handleYearChange = (yearId: ISession): void => {
        setSelectedYear(yearId);
    }

    return (
        <div className="flex flex-col w-full min-h-[calc(100vh-64px)] p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100 overflow-hidden">
            <div className={`card bg-base-300 border border-base-content/20 shadow-xl ${students.length > 0 ? 'h-[calc(100vh-96px)] overflow-y-auto' : 'h-fit'}`}>
                <div className="card-body">
                    {/* Header */}
                    <div className="mb-4 sm:mb-6 flex-shrink-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content">
                                Take Attendance
                            </h1>
                            <AcademicYearDropdown
                                academicYears={academicYears}
                                selectedYearId={selectedYear}
                                onYearChange={handleYearChange}
                                isLoading={isLoadingYears}
                            />
                        </div>

                        {/* Navigation Tabs - Hidden for students */}
                        {userRole !== 'STUDENT' && (
                            <div className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-4 sm:mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
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

                        {/* Form Controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {/* Class-Section Selection */}
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text text-base-content">Class & Section</span>
                                </label>
                                <div className="relative">
                                    <select
                                        className="select select-bordered w-full bg-base-100 text-base-content"
                                        value={selectedClassSection}
                                        onChange={handleClassSectionChange}
                                        disabled={!selectedYear || isLoadingClassSections}
                                    >
                                        <option value="">Select Class & Section</option>
                                        {classSections.map((cs) => (
                                            <option
                                                key={`${cs.classId}-${cs.sectionId}`}
                                                value={`${cs.classId}|${cs.sectionId}`}
                                                className="text-base-content bg-base-100"
                                            >
                                                {cs.display}
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
                                        disabled={!selectedClassId || !selectedSectionId || isLoadingSubjects}
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map((subject) => (
                                            <option
                                                key={subject._id}
                                                value={subject._id}
                                                className="text-base-content bg-base-100"
                                            >
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

                            {/* Staff Selection */}
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text text-base-content">Staff</span>
                                </label>
                                <div className="relative">
                                    <select
                                        className="select select-bordered w-full bg-base-100 text-base-content"
                                        value={selectedStaff}
                                        onChange={handleStaffChange}
                                        disabled={isLoadingStaff}
                                    >
                                        <option value="">Select Staff</option>
                                        {staff.map((person: any) => (
                                            <option key={person._id} value={person._id} className="text-base-content bg-base-100">
                                                {person.firstName} {person.lastName}
                                            </option>
                                        ))}
                                    </select>
                                    {isLoadingStaff && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <span className="loading loading-spinner loading-sm text-primary"></span>
                                        </div>
                                    )}
                                </div>
                            </div>

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
                                    min={new Date(Date.now() - 86400000).toISOString().split('T')[0]}
                                    max={new Date().toISOString().split('T')[0]}
                                    disabled={!selectedYear || !selectedStaff}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden">
                        {/* Student Attendance List */}
                        {isLoadingStudents ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                <p className="text-base-content">Loading students...</p>
                            </div>
                        ) : (
                            students.length > 0 && (
                                <div className="flex flex-col">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-base-content flex-shrink-0">
                                        Student Attendance
                                    </h2>

                                    {/* Attendance Table */}
                                    <div className="flex-1 overflow-hidden">
                                        {/* Mobile Card Layout */}
                                        <div className="block md:hidden h-full">
                                            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                                <div className="space-y-3 sm:space-y-4 pb-4">
                                                    {attendanceData.length > 0 ? (
                                                        attendanceData.map((student: any) => (
                                                            <div key={student.studentId} className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-300/50 hover:border-base-300 rounded-lg overflow-hidden">
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
                                                                            <label className="cursor-pointer flex items-center justify-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="checkbox checkbox-primary"
                                                                                    checked={student.present}
                                                                                    onChange={() => handleAttendanceChange(student.studentId)}
                                                                                />
                                                                                <span className="ml-2 text-base-content text-sm sm:text-base">
                                                                                    {student.present ?
                                                                                        <span className="text-success font-medium">Present</span> :
                                                                                        <span className="text-error font-medium">Absent</span>
                                                                                    }
                                                                                </span>
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-12">
                                                            <div className="text-4xl sm:text-6xl mb-4">👨‍🎓</div>
                                                            <h3 className="text-base sm:text-lg font-semibold text-base-content mb-2">No students found</h3>
                                                            <p className="text-sm sm:text-base text-base-content/60 text-center max-w-md">
                                                                Please select a class and section to view students
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tablet and Desktop Table Layout */}
                                        <div className="hidden md:block h-full">
                                            <div className="border border-base-300 rounded-lg bg-base-100 h-full flex flex-col">
                                                <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                                    <table className="table w-full">
                                                        <thead className="bg-base-200 border-b-2 border-base-content/20 sticky top-0 z-0">
                                                            <tr>
                                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[250px]">Student Name</th>
                                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[200px] text-center">Attendance Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {attendanceData.length > 0 ? (
                                                                attendanceData.map((student: any) => (
                                                                    <tr key={student.studentId} className="hover:bg-base-200 transition-colors">
                                                                        <td className="text-base-content text-sm lg:text-base font-medium py-4">{student.name}</td>
                                                                        <td className="text-center py-4">
                                                                            <label className="cursor-pointer flex items-center justify-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="checkbox checkbox-primary"
                                                                                    checked={student.present}
                                                                                    onChange={() => handleAttendanceChange(student.studentId)}
                                                                                />
                                                                                <span className="ml-2 text-base-content">
                                                                                    {student.present ?
                                                                                        <span className="text-success font-medium">Present</span> :
                                                                                        <span className="text-error font-medium">Absent</span>
                                                                                    }
                                                                                </span>
                                                                            </label>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan={2} className="text-center py-12">
                                                                        <div className="flex flex-col items-center justify-center">
                                                                            <div className="text-4xl sm:text-6xl mb-4">👨‍🎓</div>
                                                                            <h3 className="text-base sm:text-lg font-semibold text-base-content mb-2">No students found</h3>
                                                                            <p className="text-sm sm:text-base text-base-content/60 text-center max-w-md">
                                                                                Please select a class and section to view students
                                                                            </p>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end mt-3 sm:mt-6 flex-shrink-0">
                                        <Button
                                            variant="primary"
                                            outline
                                            onClick={submitAttendance}
                                            disabled={
                                                !selectedYear ||
                                                !selectedClassId ||
                                                !selectedSectionId ||
                                                !selectedSubject ||
                                                !selectedStaff ||
                                                !attendanceDate ||
                                                students.length === 0
                                            }
                                            className="w-full sm:w-auto px-6"
                                        >
                                            Submit Attendance
                                        </Button>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}