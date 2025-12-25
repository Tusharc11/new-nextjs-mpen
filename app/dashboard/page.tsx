'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, Users, TrendingUp, Calendar, PieChart, BarChart3, CreditCard, Clock, GraduationCap, X, IndianRupee, TrendingUpDown } from 'lucide-react';
import AcademicYearDropdown from '../components/ui/academicYearDropdown';
import { ISession } from '../api/models/session';
import toast from 'react-hot-toast';
import { useSidebarStore } from '../components/store/useSidebarStore';
import { Button } from '../components/ui/button';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';
import Image from 'next/image';
import DefaultersTable from '../components/dashboard/DefaultersTable';
import FeePaymentsTable from '../components/dashboard/FeePaymentsTable';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface FeeStats {
    totalCollected: number;
    totalDue: number;
    totalOutstanding: number;
    collectionPercentage: number;
    paymentModeBreakdown: { [key: string]: number };
    monthlyTrends: { month: string; amount: number }[];
}

interface OutstandingFeesData {
    totalOutstanding: number;
    classWiseOutstanding: {
        className: string;
        sectionName: string;
        outstandingAmount: number;
        studentsWithOutstanding: number;
        totalStudentsInClass: number;
        averageOutstanding: number;
    }[];
    statusBreakdown: {
        pending: number;
        overdue: number;
        partiallyPaid: number;
    };
    studentCount: {
        totalStudents: number;
        studentsWithOutstanding: number;
    };
    summary: {
        averageOutstandingPerStudent: number;
        highestOutstandingClass: any;
        totalClasses: number;
    };
}

export default function DashboardPage() {
    const { isExpanded } = useSidebarStore();
    const [academicYears, setAcademicYears] = useState<ISession[]>([]);
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<ISession | null>(null);
    const [isLoadingAcademicYears, setIsLoadingAcademicYears] = useState(true);
    const [studentStats, setStudentStats] = useState({
        totalStudents: 0,
        activeStudents: 0,
    });
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);
    const [feeStats, setFeeStats] = useState<FeeStats>({
        totalCollected: 0,
        totalDue: 0,
        totalOutstanding: 0,
        collectionPercentage: 0,
        paymentModeBreakdown: {},
        monthlyTrends: []
    });
    const [isLoadingFees, setIsLoadingFees] = useState(true);
    const [outstandingFeesData, setOutstandingFeesData] = useState<OutstandingFeesData>({
        totalOutstanding: 0,
        classWiseOutstanding: [],
        statusBreakdown: { pending: 0, overdue: 0, partiallyPaid: 0 },
        studentCount: { totalStudents: 0, studentsWithOutstanding: 0 },
        summary: { averageOutstandingPerStudent: 0, highestOutstandingClass: null, totalClasses: 0 }
    });
    const [isLoadingOutstanding, setIsLoadingOutstanding] = useState(true);

    // Outstanding fees modal state
    const [isOutstandingModalOpen, setIsOutstandingModalOpen] = useState(false);

    // Student Details Modal State
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [studentDetailsData, setStudentDetailsData] = useState<any>(null);
    const [isLoadingStudentDetails, setIsLoadingStudentDetails] = useState(false);

    // Fee Collection Details Modal State
    const [isFeeCollectionModalOpen, setIsFeeCollectionModalOpen] = useState(false);
    const [feeCollectionDetailsData, setFeeCollectionDetailsData] = useState<any>(null);
    const [isLoadingFeeCollectionDetails, setIsLoadingFeeCollectionDetails] = useState(false);

    // Collection Percentage Details Modal State
    const [isCollectionDetailsModalOpen, setIsCollectionDetailsModalOpen] = useState(false);
    const [collectionDetailsData, setCollectionDetailsData] = useState<any>(null);
    const [isLoadingCollectionDetails, setIsLoadingCollectionDetails] = useState(false);

    // Fetch academic years
    useEffect(() => {
        const fetchAcademicYears = async () => {
            try {
                setIsLoadingAcademicYears(true);
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
                    const sortedYears = [...data].sort((a: ISession, b: ISession) =>
                        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                    );
                    setSelectedAcademicYearId(sortedYears[0]);
                }
            } catch (error) {
                toast.error('Failed to load academic years');
            } finally {
                setIsLoadingAcademicYears(false);
            }
        };

        fetchAcademicYears();
    }, []);

    // Fetch student statistics based on selected academic year
    useEffect(() => {
        if (selectedAcademicYearId) {
            const fetchStudentStats = async () => {
                try {
                    setIsLoadingStudents(true);
                    const token = localStorage.getItem('token');
                    if (!token) return;

                    const response = await fetch(`/api/dashboard/student-stats?academicYearId=${selectedAcademicYearId._id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch student statistics');
                    }

                    const data = await response.json();

                    setStudentStats({
                        totalStudents: data.totalStudents,
                        activeStudents: data.activeStudents
                    });
                } catch (error) {
                    console.error('Error fetching student stats:', error);
                    toast.error('Failed to load student statistics');
                } finally {
                    setIsLoadingStudents(false);
                }
            };

            fetchStudentStats();
        }
    }, [selectedAcademicYearId]);

    // Fetch fee statistics based on selected academic year
    useEffect(() => {
        if (selectedAcademicYearId) {
            const fetchFeeStats = async () => {
                try {
                    setIsLoadingFees(true);
                    const token = localStorage.getItem('token');
                    if (!token) return;

                    const response = await fetch(`/api/dashboard/fee-stats?academicYearId=${selectedAcademicYearId._id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch fee statistics');
                    }

                    const data = await response.json();
                    setFeeStats(data);
                } catch (error) {
                    console.error('Error fetching fee stats:', error);
                    toast.error('Failed to load fee statistics');
                } finally {
                    setIsLoadingFees(false);
                }
            };

            fetchFeeStats();
        }
    }, [selectedAcademicYearId]);

    // Fetch detailed outstanding fees data
    useEffect(() => {
        if (selectedAcademicYearId) {
            const fetchOutstandingFeesData = async () => {
                try {
                    setIsLoadingOutstanding(true);
                    const token = localStorage.getItem('token');
                    if (!token) return;

                    const response = await fetch(`/api/dashboard/outstanding-fees?academicYearId=${selectedAcademicYearId._id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch outstanding fees data');
                    }

                    const data = await response.json();
                    setOutstandingFeesData(data);
                } catch (error) {
                    console.error('Error fetching outstanding fees data:', error);
                    toast.error('Failed to load outstanding fees details');
                } finally {
                    setIsLoadingOutstanding(false);
                }
            };

            fetchOutstandingFeesData();
        }
    }, [selectedAcademicYearId]);

    // Format academic year label
    const formatAcademicYearLabel = (year: ISession | null) => {
        if (!year) return 'Select Academic Year';
        const startDate = new Date(year.startDate);
        const endDate = new Date(year.endDate);
        return `${startDate.toLocaleString('default', { month: 'short' })} ${startDate.getFullYear()} - ${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`;
    };

    // Fetch student details data
    const fetchStudentDetails = async (academicYearId: string) => {
        try {
            setIsLoadingStudentDetails(true);
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`/api/dashboard/student-stats?academicYearId=${academicYearId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch student details');
            }

            const data = await response.json();
            setStudentDetailsData(data);
        } catch (error) {
            console.error('Error fetching student details:', error);
        } finally {
            setIsLoadingStudentDetails(false);
        }
    };

    // Handle student card click
    const handleStudentCardClick = () => {
        if (selectedAcademicYearId?._id) {
            setIsStudentModalOpen(true);
            fetchStudentDetails(selectedAcademicYearId._id);
        }
    };

    const handleCollectionDetailsCardClick = () => {
        if (selectedAcademicYearId?._id) {
            setIsCollectionDetailsModalOpen(true);
            fetchCollectionDetails(selectedAcademicYearId._id);
        }
    };

    // Fetch collection details data (payment modes & monthly trends)
    const fetchCollectionDetails = async (academicYearId: string) => {
        try {
            setIsLoadingCollectionDetails(true);
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`/api/dashboard/fee-stats?academicYearId=${academicYearId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch collection details');
            }

            const data = await response.json();
            setCollectionDetailsData(data);
        } catch (error) {
            console.error('Error fetching collection details:', error);
        } finally {
            setIsLoadingCollectionDetails(false);
        }
    };

    // Fetch fee collection details data
    const fetchFeeCollectionDetails = async (academicYearId: string) => {
        try {
            setIsLoadingFeeCollectionDetails(true);
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`/api/dashboard/fee-stats?academicYearId=${academicYearId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch fee collection details');
            }

            const data = await response.json();
            setFeeCollectionDetailsData(data);
        } catch (error) {
            console.error('Error fetching fee collection details:', error);
        } finally {
            setIsLoadingFeeCollectionDetails(false);
        }
    };

    // Handle fee collection card click
    const handleFeeCollectionCardClick = () => {
        if (selectedAcademicYearId?._id) {
            setIsFeeCollectionModalOpen(true);
            fetchFeeCollectionDetails(selectedAcademicYearId._id);
        }
    };

    return (
        <div className="min-h-screen bg-base-200 p-3 sm:p-4 md:p-6 lg:p-8 transition-colors duration-200">
            {/* Dashboard Header */}
            <div className="mb-6 md:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-base-content">Dashboard</h1>
                        <p className="text-sm sm:text-base text-base-content/70 mt-1">Financial overview and analytics</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <AcademicYearDropdown
                            academicYears={academicYears}
                            selectedYearId={selectedAcademicYearId}
                            onYearChange={setSelectedAcademicYearId}
                            isLoading={isLoadingAcademicYears}
                        />
                    </div>
                </div>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 md:mb-8">
                <div
                    className="bg-base-100 border border-base-300 rounded-lg sm:rounded-xl p-4 sm:p-6 hover:bg-base-100/80 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                    onClick={handleFeeCollectionCardClick}
                >
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-success/10 rounded-lg group-hover:bg-success/20 transition-colors">
                            <IndianRupee className="w-4 h-4 sm:w-6 sm:h-6 text-success" />
                        </div>
                        <div className="flex-1 ml-4">
                            <div className="text-xs sm:text-sm font-medium text-base-content/70 mb-2">Total Fees Collected</div>
                            {isLoadingFees ? (
                                <div className="flex items-center gap-2">
                                    <span className="loading loading-spinner loading-sm text-primary"></span>
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-base-content">Loading...</div>
                                </div>
                            ) : (
                                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content">
                                    ₹{feeStats.totalCollected.toLocaleString()}
                                </div>
                            )}
                            <div className="text-xs text-success flex items-center gap-1 mt-1">
                                <TrendingUp className="w-3 h-3" />
                                {isLoadingFees ? '...' : `${feeStats.collectionPercentage}% of total due`}
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="bg-base-100 border border-base-300 rounded-lg sm:rounded-xl p-4 sm:p-6 hover:bg-base-100/80 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                    onClick={() => setIsOutstandingModalOpen(true)}
                >
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-warning/10 rounded-lg group-hover:bg-warning/20 transition-colors">
                            <CreditCard className="w-4 h-4 sm:w-6 sm:h-6 text-warning" />
                        </div>
                        <div className="flex-1 ml-4">
                            <div className="text-xs sm:text-sm font-medium text-base-content/70 mb-2">Outstanding Fees</div>
                            {isLoadingOutstanding ? (
                                <div className="flex items-center gap-2">
                                    <span className="loading loading-spinner loading-sm text-primary"></span>
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-base-content">Loading...</div>
                                </div>
                            ) : (
                                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content">
                                    ₹{outstandingFeesData.totalOutstanding.toLocaleString()}
                                </div>
                            )}
                            <div className="text-xs text-warning flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                {isLoadingOutstanding ? '...' : `${outstandingFeesData.studentCount.studentsWithOutstanding} students pending`}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-base-100 border border-base-300 rounded-lg sm:rounded-xl p-4 sm:p-6 hover:bg-base-100/80 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 group cursor-pointer" onClick={handleCollectionDetailsCardClick}>
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                            <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="flex-1 ml-4">
                            <div className="text-xs sm:text-sm font-medium text-base-content/70 mb-2">Collection %</div>
                            {isLoadingFees ? (
                                <div className="flex items-center gap-2">
                                    <span className="loading loading-spinner loading-sm text-primary"></span>
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-base-content">Loading...</div>
                                </div>
                            ) : (
                                <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${feeStats.collectionPercentage >= 90 ? 'text-success' : feeStats.collectionPercentage >= 70 ? 'text-warning' : 'text-error'}`}>
                                    {feeStats.collectionPercentage}%
                                </div>
                            )}
                            <div className={`text-xs flex items-center gap-1 mt-1 ${feeStats.collectionPercentage >= 90 ? 'text-success' : feeStats.collectionPercentage >= 70 ? 'text-warning' : 'text-error'}`}>
                                <TrendingUp className="w-3 h-3" />
                                {isLoadingFees ? '...' : feeStats.collectionPercentage >= 90 ? 'Above target (90%)' : 'Below target (90%)'}
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="bg-base-100 border border-base-300 rounded-lg sm:rounded-xl p-4 sm:p-6 hover:bg-base-100/80 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                    onClick={handleStudentCardClick}
                >
                    <div className="flex items-center justify-between">
                        <div className="p-3 bg-info/10 rounded-lg group-hover:bg-info/20 transition-colors">
                            <GraduationCap className="w-4 h-4 sm:w-6 sm:h-6 text-info" />
                        </div>
                        <div className="flex-1 ml-4">
                            <div className="text-xs sm:text-sm font-medium text-base-content/70 mb-2">Number of Students</div>
                            {isLoadingStudents ? (
                                <div className="flex items-center gap-2">
                                    <span className="loading loading-spinner loading-sm text-primary"></span>
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-base-content">Loading...</div>
                                </div>
                            ) : (
                                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content">
                                    {studentStats.activeStudents}
                                </div>
                            )}
                            <div className="text-xs text-info flex items-center gap-1 mt-1">
                                <Users className="w-3 h-3" />
                                {isLoadingStudents ? '...' : `${studentStats.activeStudents} enrolled`}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
                {/* Left Column: Class-wise Analytics + Defaulter Table */}
                <div className="space-y-4 sm:space-y-6">
                    {/* Class-wise Analytics */}
                    <div className="bg-base-100 border border-base-300 rounded-lg sm:rounded-xl hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                        <div className="border-b border-base-300 p-4 sm:p-6">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                                <h3 className="text-lg sm:text-xl font-semibold text-base-content">Class-wise Analytics</h3>
                            </div>
                        </div>
                        <div className="p-4 sm:p-6">
                            {isLoadingOutstanding ? (
                                <div className="flex items-center justify-center py-8">
                                    <span className="loading loading-spinner text-primary loading-md"></span>
                                    <span className="ml-2 text-base-content/70">Loading class data...</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <thead>
                                            <tr className="bg-base-200/50 border-b-2 border-base-300">
                                                <th className="text-left py-4 px-3 text-xs sm:text-sm font-bold text-base-content uppercase tracking-wider">
                                                    Class & Section
                                                </th>
                                                <th className="text-center py-4 px-3 text-xs sm:text-sm font-bold text-base-content uppercase tracking-wider">
                                                    Total Students
                                                </th>
                                                <th className="text-center py-4 px-3 text-xs sm:text-sm font-bold text-base-content uppercase tracking-wider">
                                                    Pending Students
                                                </th>
                                                <th className="text-right py-4 px-3 text-xs sm:text-sm font-bold text-base-content uppercase tracking-wider">
                                                    Outstanding Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {outstandingFeesData.classWiseOutstanding.length > 0 ? (
                                                <>
                                                    {outstandingFeesData.classWiseOutstanding.map((classData, index) => {
                                                        const outstandingPercentage = classData.totalStudentsInClass > 0
                                                            ? ((classData.studentsWithOutstanding / classData.totalStudentsInClass) * 100).toFixed(1)
                                                            : '0';
                                                        const avgPerStudent = classData.studentsWithOutstanding > 0
                                                            ? (classData.outstandingAmount / classData.studentsWithOutstanding).toFixed(0)
                                                            : '0';
                                                        const statusColor = parseFloat(outstandingPercentage) >= 50
                                                            ? 'error'
                                                            : parseFloat(outstandingPercentage) >= 25
                                                                ? 'warning'
                                                                : 'success';
                                                        const statusText = parseFloat(outstandingPercentage) >= 50
                                                            ? 'High Risk'
                                                            : parseFloat(outstandingPercentage) >= 25
                                                                ? 'Medium Risk'
                                                                : 'Low Risk';

                                                        return (
                                                            <tr key={`${classData.className}-${classData.sectionName}`}
                                                                className="border-b border-base-300 hover:bg-base-100 transition-all duration-200 group">
                                                                <td className="py-4 px-3 text-sm font-semibold text-base-content">
                                                                    <div className="flex items-center gap-2">
                                                                        <div>
                                                                            <div className="font-semibold">Class {classData.className} {classData.sectionName}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 px-3 text-center">
                                                                    <div className="text-sm font-bold text-base-content">{classData.totalStudentsInClass}</div>
                                                                </td>
                                                                <td className="py-4 px-3 text-center">
                                                                    <div className="text-sm font-bold text-warning">{classData.studentsWithOutstanding}</div>
                                                                </td>
                                                                <td className="py-4 px-3 text-right">
                                                                    <div className="text-sm font-bold text-error/80">₹{classData.outstandingAmount.toLocaleString()}</div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {/* Summary Row */}
                                                    <tr className="bg-gradient-to-r from-base-200/50 to-base-300/30 border-t-2 border-base-300">
                                                        <td className="py-4 px-3 text-sm font-bold text-base-content">
                                                            <div className="flex items-center gap-2">
                                                                <div>
                                                                    <div className="font-bold">Total</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-3 text-center">
                                                            <div className="text-sm font-bold text-primary">{outstandingFeesData.studentCount.totalStudents}</div>
                                                        </td>
                                                        <td className="py-4 px-3 text-center">
                                                            <div className="text-sm font-bold text-warning">{outstandingFeesData.studentCount.studentsWithOutstanding}</div>
                                                        </td>
                                                        <td className="py-4 px-3 text-right">
                                                            <div className="text-sm font-bold text-error">₹{outstandingFeesData.totalOutstanding.toLocaleString()}</div>
                                                        </td>
                                                    </tr>
                                                </>
                                            ) : (
                                                <tr>
                                                    <td colSpan={7} className="py-12 text-center text-base-content/70">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="text-4xl">📊</div>
                                                            <div className="text-lg font-medium">
                                                                {outstandingFeesData.totalOutstanding === 0
                                                                    ? "🎉 Excellent! No outstanding fees!"
                                                                    : "No outstanding fees data available"
                                                                }
                                                            </div>
                                                            <div className="text-sm text-base-content/50">
                                                                {outstandingFeesData.totalOutstanding === 0
                                                                    ? "All students have completed their fee payments."
                                                                    : "Check back later for updated information."
                                                                }
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fee Defaulters - Below Class-wise Analytics */}
                    <div>
                        <DefaultersTable
                            academicYearId={selectedAcademicYearId?._id}
                            authToken={typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined}
                        />
                    </div>
                </div>

                {/* Fee Payments History - Right Column */}
                <div className="lg:col-span-1 bg-base-200 rounded-lg border border-base-300 hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                    <FeePaymentsTable
                        academicYearId={selectedAcademicYearId?._id}
                        authToken={typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined}
                    />
                </div>
            </div>



            {/* Outstanding Fees Modal */}
            {isOutstandingModalOpen && (
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
                            setIsOutstandingModalOpen(false);
                        }
                    }}
                >
                    <div
                        className="bg-base-100 rounded-lg shadow-2xl w-full h-full 
                     xs:w-[calc(100%-1rem)] xs:h-[calc(100%-1rem)] xs:rounded-lg xs:m-2
                     sm:w-[calc(100%-2rem)] sm:h-[calc(100%-2rem)] sm:rounded-xl sm:m-4 
                     md:w-[calc(100%-4rem)] md:h-[calc(100%-4rem)] md:rounded-2xl md:m-6
                     lg:w-[calc(100%-6rem)] lg:h-[calc(100%-4rem)] lg:rounded-2xl lg:m-8
                     xl:max-w-7xl xl:h-[calc(100%-4rem)] xl:rounded-3xl
                     2xl:max-w-[90rem]
                     max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col h-full">
                            {/* Header with close button */}
                            <div className="sticky top-0 bg-base-200 border-b border-base-300 border-base-content/60 z-10
                            p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center 
                              gap-2 xs:gap-3 sm:gap-4 md:gap-5 w-full overflow-hidden">
                                    <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 
                                min-w-0 flex-1 overflow-hidden">
                                        <div className="avatar placeholder flex-shrink-0">
                                            <div className="bg-gradient-to-br from-primary to-secondary text-primary-content 
                                    rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl lg:rounded-3xl
                                    w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 
                                    lg:w-16 lg:h-16 xl:w-18 xl:h-18">
                                                <CreditCard className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1 overflow-hidden">
                                            <h2 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl 
                                   font-bold text-base-content leading-tight break-words">
                                                Total Outstanding Fees Details: {formatAcademicYearLabel(selectedAcademicYearId)}
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <Button
                                            outline
                                            variant='error'
                                            onClick={() => setIsOutstandingModalOpen(false)}
                                        >
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold">×</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7">
                                {isLoadingOutstanding ? (
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-12 h-12" />
                                        <p className="mt-4 text-base-content">Loading outstanding fees data...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 xs:space-y-5 sm:space-y-6 md:space-y-7 lg:space-y-8">
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-5 md:gap-6">
                                            <div className="bg-error/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-error/50 text-center transition-all duration-300 group-hover/modal-card:bg-error/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-error">
                                                <div className="text-md xs:text-md sm:text-md text-base-content font-semibold mb-4">
                                                    Total Outstanding Fees
                                                </div>
                                                <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-base-content truncate">
                                                    ₹{outstandingFeesData.totalOutstanding.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="bg-warning/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-warning/50 text-center transition-all duration-300 group-hover/modal-card:bg-warning/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-warning">
                                                <div className="text-md xs:text-md sm:text-md text-base-content font-semibold mb-4">Total students with outstanding</div>
                                                <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-base-content truncate">
                                                    {outstandingFeesData.studentCount.studentsWithOutstanding}
                                                </div>
                                            </div>

                                            <div className="bg-primary/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-primary/50 text-center transition-all duration-300 group-hover/modal-card:bg-primary/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-primary">
                                                <div className="text-md xs:text-md sm:text-md text-base-content font-semibold mb-4">
                                                    Average per Student
                                                </div>
                                                <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-base-content">
                                                    ₹{outstandingFeesData.summary.averageOutstandingPerStudent.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="bg-success/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-success/50 text-center transition-all duration-300 group-hover/modal-card:bg-success/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-success">
                                                <div className="text-md xs:text-md sm:text-md text-base-content font-semibold mb-4">
                                                    Total Classes
                                                </div>
                                                <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-base-content">
                                                    {outstandingFeesData.summary.totalClasses}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Fee Status Details and Highest Outstanding Class - Side by Side */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xs:gap-5 sm:gap-6">
                                            {/* Status Breakdown */}
                                            <div className="bg-base-200 border border-base-300 rounded-lg sm:rounded-xl p-3 xs:p-4 sm:p-5 md:p-6">
                                                <h3 className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content mb-3 xs:mb-4">
                                                    Fee Status Details
                                                </h3>
                                                <div className="grid grid-cols-1 gap-3 xs:gap-4">
                                                    <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/50 shadow-sm text-base-content">
                                                        <span className="text-md font-semibold text-base-content">Pending</span>
                                                        <span className="text-lg font-bold text-base-content">{outstandingFeesData.statusBreakdown.pending}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-error/10 rounded-lg border border-error/30 shadow-sm text-base-content">
                                                        <span className="text-md font-semibold text-base-content">Overdue</span>
                                                        <span className="text-lg font-bold text-base-content">{outstandingFeesData.statusBreakdown.overdue}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/50 shadow-sm text-base-content">
                                                        <span className="text-md font-semibold text-base-content">Partially Paid</span>
                                                        <span className="text-lg font-bold text-base-content">{outstandingFeesData.statusBreakdown.partiallyPaid}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Highest Outstanding Class */}
                                            {outstandingFeesData.summary.highestOutstandingClass ? (
                                                <div className="bg-base-200 border border-base-300 rounded-lg sm:rounded-xl p-3 xs:p-4 sm:p-5 md:p-6">
                                                    <h3 className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content mb-3 xs:mb-4">
                                                        Highest Outstanding Class
                                                    </h3>
                                                    <div className="flex items-center gap-3 xs:gap-4 mb-4">
                                                        <div className="avatar placeholder">
                                                            <div className="bg-error text-error-content rounded-lg w-12 h-12 xs:w-14 xs:h-14">
                                                                <span className="text-sm xs:text-base font-bold">
                                                                    {outstandingFeesData.summary.highestOutstandingClass.className}
                                                                    {outstandingFeesData.summary.highestOutstandingClass.sectionName}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-base xs:text-lg font-bold text-base-content">
                                                                Class {outstandingFeesData.summary.highestOutstandingClass.className} {outstandingFeesData.summary.highestOutstandingClass.sectionName}
                                                            </h4>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center p-2 bg-error/10 rounded-lg border border-error/30 shadow-sm">
                                                            <span className="text-sm font-medium text-base-content">Outstanding Amount:</span>
                                                            <span className="text-base font-bold text-base-content">
                                                                ₹{outstandingFeesData.summary.highestOutstandingClass.outstandingAmount.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center p-2 bg-warning/10 rounded-lg border border-warning/30 shadow-sm">
                                                            <span className="text-sm font-medium text-base-content">Avg per student:</span>
                                                            <span className="text-base font-bold text-base-content">
                                                                ₹{Math.round(outstandingFeesData.summary.highestOutstandingClass.averageOutstanding).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-base-200/50 rounded-lg sm:rounded-xl p-3 xs:p-4 sm:p-5 md:p-6 flex items-center justify-center">
                                                    <p className="text-base-content/70 text-center">No outstanding fees data available</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Class-wise Outstanding */}
                                        <div className="bg-base-200 border border-base-300 rounded-lg sm:rounded-xl p-3 xs:p-4 sm:p-5 md:p-6">
                                            <h3 className="text-sm sm:text-lg md:text-xl font-bold text-base-content mb-3 xs:mb-4">
                                                All Class-wise Outstanding Details
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-5">
                                                {outstandingFeesData.classWiseOutstanding.map((classData, index) => (
                                                    <div
                                                        key={`${classData.className}-${classData.sectionName}`}
                                                        className="bg-base-100 border border-base-300 rounded-lg p-3 xs:p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                                                    >
                                                        <div className="flex items-center justify-between mb-2 xs:mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="avatar placeholder">
                                                                    <div className="bg-primary text-primary-content rounded-lg w-8 h-8 xs:w-10 xs:h-10">
                                                                        <span className="text-xs xs:text-sm font-bold">
                                                                            {classData.className}{classData.sectionName}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm xs:text-base font-bold text-base-content">
                                                                        Class {classData.className} {classData.sectionName}
                                                                    </h4>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs xs:text-sm font-medium text-base-content/70">
                                                                    {classData.studentsWithOutstanding}/{classData.totalStudentsInClass} students
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center bg-error/5 rounded-lg border border-error/30 shadow-sm p-2">
                                                                <span className="text-xs xs:text-sm text-base-content/80">Outstanding:</span>
                                                                <span className="text-sm xs:text-base font-bold text-base-content">
                                                                    ₹{classData.outstandingAmount.toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-warning/5 rounded-lg border border-warning/30 shadow-sm p-2">
                                                                <span className="text-xs xs:text-sm text-base-content/80">Avg per student:</span>
                                                                <span className="text-sm xs:text-base font-bold text-base-content">
                                                                    ₹{Math.round(classData.averageOutstanding).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Student Details Modal */}
            {isStudentModalOpen && (
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
                            setIsStudentModalOpen(false);
                        }
                    }}
                >
                    <div
                        className="bg-base-100 rounded-lg shadow-2xl w-full h-full 
                     xs:w-[calc(100%-1rem)] xs:h-[calc(100%-1rem)] xs:rounded-lg xs:m-2
                     sm:w-[calc(100%-2rem)] sm:h-[calc(100%-2rem)] sm:rounded-xl sm:m-4 
                     md:w-[calc(100%-4rem)] md:h-[calc(100%-4rem)] md:rounded-2xl md:m-6
                     lg:w-[calc(100%-6rem)] lg:h-[calc(100%-4rem)] lg:rounded-2xl lg:m-8
                     xl:max-w-7xl xl:h-[calc(100%-4rem)] xl:rounded-3xl
                     2xl:max-w-[90rem]
                     max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col h-full">
                            {/* Header with close button */}
                            <div className="sticky top-0 bg-base-200 border-b border-base-300 border-base-content/60 z-10
                            p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center 
                              gap-2 xs:gap-3 sm:gap-4 md:gap-5 w-full overflow-hidden">
                                    <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 
                                min-w-0 flex-1 overflow-hidden">
                                        <div className="avatar placeholder flex-shrink-0">
                                            <div className="bg-gradient-to-br from-primary to-secondary text-primary-content 
                                    rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl lg:rounded-3xl
                                    w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 
                                    lg:w-16 lg:h-16 xl:w-18 xl:h-18">
                                                <GraduationCap className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1 overflow-hidden">
                                            <h2 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl 
                                   font-bold text-base-content leading-tight break-words">
                                                Total Student Details: {selectedAcademicYearId ? formatAcademicYearLabel(selectedAcademicYearId) : 'Academic Year Overview'}
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <Button
                                            outline
                                            variant='error'
                                            onClick={() => setIsStudentModalOpen(false)}
                                        >
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold">×</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7">
                                {isLoadingStudentDetails ? (
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-12 h-12" />
                                        <p className="mt-4 text-base-content">Loading student details...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 xs:space-y-5 sm:space-y-6 md:space-y-7 lg:space-y-8">
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-5 md:gap-6">
                                            <div className="bg-primary/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-primary/50 text-center transition-all duration-300 group-hover/modal-card:bg-primary/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-primary">
                                                <div className="text-md xs:text-md sm:text-md text-base-content font-semibold mb-4">
                                                    Total Students
                                                </div>
                                                <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-base-content">
                                                    {studentDetailsData?.totalStudents || 0}
                                                </div>
                                            </div>
                                            <div className="bg-success/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-success/50 text-center transition-all duration-300 group-hover/modal-card:bg-success/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-success">
                                                <div className="text-md xs:text-md sm:text-md text-base-content font-semibold mb-4">
                                                    Active Students
                                                </div>
                                                <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-base-content">
                                                    {studentDetailsData?.activeStudents || 0}
                                                </div>
                                            </div>
                                            <div className="bg-error/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-error/50 text-center transition-all duration-300 group-hover/modal-card:bg-error/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-error">
                                                <div className="text-md xs:text-md sm:text-md text-base-content font-semibold mb-4">
                                                    Inactive Students
                                                </div>
                                                <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-base-content">
                                                    {studentDetailsData?.inactiveStudents || 0}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Student Status Details and Summary - Side by Side */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xs:gap-5 sm:gap-6">
                                            {/* Status Breakdown */}
                                            <div className="bg-base-200 border border-base-300 rounded-lg sm:rounded-xl p-3 xs:p-4 sm:p-5 md:p-6">
                                                <h3 className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content mb-3 xs:mb-4">
                                                    Student Status Summary
                                                </h3>
                                                <div className="grid grid-cols-1 gap-3 xs:gap-4">
                                                    <div className="flex items-center justify-between p-3 bg-success/5 rounded-lg border border-success/50 shadow-sm text-base-content">
                                                        <span className="text-md font-semibold text-base-content">Active Students</span>
                                                        <span className="text-lg font-bold text-base-content">{studentDetailsData?.activeStudents || 0}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-error/10 rounded-lg border border-error/50 shadow-sm text-base-content">
                                                        <span className="text-md font-semibold text-base-content">Inactive Students</span>
                                                        <span className="text-lg font-bold text-base-content">{studentDetailsData?.inactiveStudents || 0}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-info/10 rounded-lg border border-info/50 shadow-sm text-base-content">
                                                        <span className="text-md font-semibold text-base-content">Total Classes</span>
                                                        <span className="text-lg font-bold text-base-content">{studentDetailsData?.classWiseBreakdown?.length || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Largest Class */}
                                            {studentDetailsData?.classWiseBreakdown?.length > 0 ? (
                                                <div className="bg-base-200 border border-base-300 rounded-lg sm:rounded-xl p-3 xs:p-4 sm:p-5 md:p-6">
                                                    <h3 className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content mb-3 xs:mb-4">
                                                        Largest Class
                                                    </h3>
                                                    {(() => {
                                                        const largestClass = studentDetailsData.classWiseBreakdown.reduce((prev: any, current: any) =>
                                                            (current.totalStudents > prev.totalStudents) ? current : prev
                                                        );
                                                        return (
                                                            <>
                                                                <div className="flex items-center gap-3 xs:gap-4 mb-4">
                                                                    <div className="avatar placeholder">
                                                                        <div className="bg-info text-info-content rounded-lg w-12 h-12 xs:w-14 xs:h-14">
                                                                            <span className="text-sm xs:text-base font-bold">
                                                                                {largestClass.className}{largestClass.sectionName}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <h4 className="text-base xs:text-lg font-bold text-base-content">
                                                                            Class {largestClass.className} {largestClass.sectionName}
                                                                        </h4>
                                                                        <p className="text-sm text-base-content/70">
                                                                            {largestClass.totalStudents} students total
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between items-center p-2 bg-info/5 rounded-lg border border-info/30 shadow-sm">
                                                                        <span className="text-sm font-medium text-base-content">Total Students:</span>
                                                                        <span className="text-base font-bold text-base-content">
                                                                            {largestClass.totalStudents}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center p-2 bg-success/5 rounded-lg border border-success/30 shadow-sm">
                                                                        <span className="text-sm font-medium text-base-content">Active Students:</span>
                                                                        <span className="text-base font-bold text-base-content">
                                                                            {largestClass.activeStudents}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <div className="bg-base-200/50 rounded-lg sm:rounded-xl p-3 xs:p-4 sm:p-5 md:p-6 flex items-center justify-center">
                                                    <p className="text-base-content/70 text-center">No class data available</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Class-wise Student Distribution */}
                                        <div className="bg-base-200 border border-base-300 rounded-lg sm:rounded-xl p-3 xs:p-4 sm:p-5 md:p-6">
                                            <h3 className="text-sm sm:text-lg md:text-xl font-bold text-base-content mb-3 xs:mb-4">
                                                All Class-wise Student Details
                                            </h3>

                                            {studentDetailsData?.classWiseBreakdown?.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-5">
                                                    {studentDetailsData.classWiseBreakdown.map((classData: any, index: number) => (
                                                        <div
                                                            key={`${classData.className}-${classData.sectionName}`}
                                                            className="bg-base-100 border border-base-300 rounded-lg p-3 xs:p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                                                        >
                                                            <div className="flex items-center justify-between mb-2 xs:mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="avatar placeholder">
                                                                        <div className="bg-primary text-primary-content rounded-lg w-8 h-8 xs:w-10 xs:h-10">
                                                                            <span className="text-xs xs:text-sm font-bold">
                                                                                {classData.className}{classData.sectionName}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-sm xs:text-base font-bold text-base-content">
                                                                            Class {classData.className} {classData.sectionName}
                                                                        </h4>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xs xs:text-sm font-medium text-base-content/70">
                                                                        {classData.totalStudents} students
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between items-center bg-success/5 rounded-lg border border-success/30 shadow-sm p-2">
                                                                    <span className="text-xs xs:text-sm text-base-content/80">Active:</span>
                                                                    <span className="text-sm xs:text-base font-bold text-base-content">
                                                                        {classData.activeStudents}
                                                                    </span>
                                                                </div>
                                                                {classData.inactiveStudents > 0 && (
                                                                    <div className="flex justify-between items-center bg-error/5 rounded-lg border border-error/30 shadow-sm p-2">
                                                                        <span className="text-xs xs:text-sm text-base-content/80">Inactive:</span>
                                                                        <span className="text-sm xs:text-base font-bold text-base-content">
                                                                            {classData.inactiveStudents}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <p className="text-base-content/70">No class data available for this academic year.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fee Collection Details Modal */}
            {isFeeCollectionModalOpen && (
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
                            setIsFeeCollectionModalOpen(false);
                        }
                    }}
                >
                    <div
                        className="bg-base-100 rounded-lg shadow-2xl w-full h-full 
                     xs:w-[calc(100%-1rem)] xs:h-[calc(100%-1rem)] xs:rounded-lg xs:m-2
                     sm:w-[calc(100%-2rem)] sm:h-[calc(100%-2rem)] sm:rounded-xl sm:m-4 
                     md:w-[calc(100%-4rem)] md:h-[calc(100%-4rem)] md:rounded-2xl md:m-6
                     lg:w-[calc(100%-6rem)] lg:h-[calc(100%-4rem)] lg:rounded-2xl lg:m-8
                     xl:max-w-7xl xl:h-[calc(100%-4rem)] xl:rounded-3xl
                     2xl:max-w-[90rem]
                     max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col h-full">
                            {/* Header with close button */}
                            <div className="sticky top-0 bg-base-200 border-b border-base-300 border-base-content/60 z-10
                            p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center 
                              gap-2 xs:gap-3 sm:gap-4 md:gap-5 w-full overflow-hidden">
                                    <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 
                                min-w-0 flex-1 overflow-hidden">
                                        <div className="avatar placeholder flex-shrink-0">
                                            <div className="bg-gradient-to-br from-success to-primary text-success-content 
                                    rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl lg:rounded-3xl
                                    w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 
                                    lg:w-16 lg:h-16 xl:w-18 xl:h-18">
                                                <DollarSign className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1 overflow-hidden">
                                            <h2 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl 
                                   font-bold text-base-content leading-tight break-words">
                                                Fee Collection Details: {selectedAcademicYearId ? formatAcademicYearLabel(selectedAcademicYearId) : 'Academic Year Overview'}
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <Button
                                            outline
                                            variant='error'
                                            onClick={() => setIsFeeCollectionModalOpen(false)}
                                        >
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold">×</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7">
                                {isLoadingFeeCollectionDetails ? (
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-12 h-12" />
                                        <p className="mt-4 text-base-content">Loading fee collection details...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 xs:space-y-5 sm:space-y-6 md:space-y-7 lg:space-y-8">
                                        {/* Collection Rate Explanation */}
                                        <div className="bg-info/5 border border-info/30 rounded-lg p-3 xs:p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="avatar placeholder flex-shrink-0">
                                                    <div className="flex items-center justify-center w-6 h-6">
                                                        <span className="text-xs text-center font-bold">ℹ️</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-base-content mb-1">Collection Rate Explained</h4>
                                                    <p className="text-xs text-base-content/80 leading-relaxed mb-2">
                                                        <span className="font-medium">Collection Rate = (Fees Collected ÷ Total Due) × 100</span><br />
                                                        <span className="font-medium">Total Due = Base Fees + Late Fees</span> |
                                                        <span className="font-medium"> Outstanding = Total Due - To be Collected</span>
                                                    </p>
                                                    <p className="text-xs text-base-content/80 leading-relaxed">
                                                        This metric shows how efficient your fee recovery is.
                                                        <span className="text-success font-medium"> 90-100% = Excellent</span>,
                                                        <span className="text-warning font-medium"> 70-89% = Good</span>,
                                                        <span className="text-error font-medium"> &lt;70% = Needs Follow-up</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-5 md:gap-6">
                                            <div className="bg-success/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-success/50 text-center transition-all duration-300 group-hover/modal-card:bg-success/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-success">
                                                <div className="text-md xs:text-md sm:text-md text-base-content font-semibold mb-4">
                                                    Total Collected
                                                </div>
                                                <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-base-content">
                                                    ₹{feeCollectionDetailsData?.totalCollected?.toLocaleString() || 0}
                                                </div>
                                            </div>
                                            <div className="bg-primary/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-primary/50 text-center transition-all duration-300 group-hover/modal-card:bg-primary/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-primary">
                                                <div className="text-md xs:text-md sm:text-md text-base-content font-semibold mb-4">
                                                    Total Due
                                                </div>
                                                <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-base-content">
                                                    ₹{feeCollectionDetailsData?.totalDue?.toLocaleString() || 0}
                                                </div>
                                                <div className="text-xs text-base-content/70 mt-1">
                                                    Base Fees + Late Fees
                                                </div>
                                            </div>
                                            <div className="bg-error/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-error/50 text-center transition-all duration-300 group-hover/modal-card:bg-error/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-error">
                                                <div className="text-md xs:text-md sm:text-md text-base-content font-semibold mb-4">
                                                    Outstanding
                                                </div>
                                                <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-base-content">
                                                    ₹{feeCollectionDetailsData?.totalOutstanding?.toLocaleString() || 0}
                                                </div>
                                                <div className="text-xs text-base-content/70 mt-1">
                                                    Total Due - To be Collected
                                                </div>
                                            </div>
                                            <div className={`rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border text-center transition-all duration-300 ${(feeCollectionDetailsData?.collectionPercentage || 0) >= 90
                                                ? 'bg-success/10 border-success/50 group-hover/modal-card:bg-success/20 group-hover/modal-card:border-success'
                                                : (feeCollectionDetailsData?.collectionPercentage || 0) >= 70
                                                    ? 'bg-warning/10 border-warning/50 group-hover/modal-card:bg-warning/20 group-hover/modal-card:border-warning'
                                                    : 'bg-error/10 border-error/50 group-hover/modal-card:bg-error/20 group-hover/modal-card:border-error'
                                                } group-hover/modal-card:shadow-md`}>
                                                <div className="text-md xs:text-md sm:text-md text-base-content font-semibold mb-2">
                                                    Collection Rate
                                                </div>
                                                <div className={`text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold ${(feeCollectionDetailsData?.collectionPercentage || 0) >= 90
                                                    ? 'text-success'
                                                    : (feeCollectionDetailsData?.collectionPercentage || 0) >= 70
                                                        ? 'text-warning'
                                                        : 'text-error'
                                                    }`}>
                                                    {feeCollectionDetailsData?.collectionPercentage || 0}%
                                                </div>
                                                <div className={`text-xs mt-1 font-medium ${(feeCollectionDetailsData?.collectionPercentage || 0) >= 90
                                                    ? 'text-success'
                                                    : (feeCollectionDetailsData?.collectionPercentage || 0) >= 70
                                                        ? 'text-warning'
                                                        : 'text-error'
                                                    }`}>
                                                    {(feeCollectionDetailsData?.collectionPercentage || 0) >= 90
                                                        ? '🎉 Excellent Recovery'
                                                        : (feeCollectionDetailsData?.collectionPercentage || 0) >= 70
                                                            ? '👍 Good Recovery'
                                                            : '⚠️ Needs Follow-up'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Collection Details Modal (Payment Modes & Monthly Trends) */}
            {isCollectionDetailsModalOpen && (
                <div
                    className="fixed bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200"
                    style={{
                        top: '4rem',
                        left: isExpanded ? '16rem' : '4rem',
                        right: '0',
                        bottom: '0'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsCollectionDetailsModalOpen(false);
                        }
                    }}
                >
                    <div
                        className="bg-base-100 rounded-lg shadow-2xl w-full h-full 
                     xs:w-[calc(100%-1rem)] xs:h-[calc(100%-1rem)] xs:rounded-lg xs:m-2
                     sm:w-[calc(100%-2rem)] sm:h-[calc(100%-2rem)] sm:rounded-xl sm:m-4 
                     md:w-[calc(100%-4rem)] md:h-[calc(100%-4rem)] md:rounded-2xl md:m-6
                     lg:w-[calc(100%-6rem)] lg:h-[calc(100%-4rem)] lg:rounded-2xl lg:m-8
                     xl:max-w-7xl xl:h-[calc(100%-4rem)] xl:rounded-3xl
                     2xl:max-w-[90rem]
                     max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col h-full">
                            {/* Header with close button */}
                            <div className="sticky top-0 bg-base-200 border-b border-base-300 border-base-content/60 z-10
                            p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center 
                              gap-2 xs:gap-3 sm:gap-4 md:gap-5 w-full overflow-hidden">
                                    <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 
                                min-w-0 flex-1 overflow-hidden">
                                        <div className="avatar placeholder flex-shrink-0">
                                            <div className="bg-gradient-to-br from-primary to-secondary text-primary-content 
                                    rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl lg:rounded-3xl
                                    w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 
                                    lg:w-16 lg:h-16 xl:w-18 xl:h-18">
                                                <BarChart3 className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1 overflow-hidden">
                                            <h2 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl 
                                   font-bold text-base-content leading-tight break-words">
                                                Collection Analysis: {selectedAcademicYearId ? formatAcademicYearLabel(selectedAcademicYearId) : 'Academic Year Overview'}
                                            </h2>
                                        </div>
                                    </div>
                                    <Button
                                        outline
                                        variant='error'
                                        onClick={() => setIsCollectionDetailsModalOpen(false)}
                                    >
                                        <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold">×</span>
                                    </Button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-3 xs:p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8">
                                {isLoadingCollectionDetails ? (
                                    <div className="flex justify-center items-center h-full">
                                        <span className="loading loading-spinner loading-lg text-primary"></span>
                                    </div>
                                ) : (
                                    <div className="space-y-4 xs:space-y-5 sm:space-y-6 group/modal-card">
                                        {/* Collection Rate Summary */}
                                        <div className="bg-base-200 border border-base-300 rounded-lg sm:rounded-xl p-3 xs:p-4 sm:p-5 md:p-6">
                                            <h3 className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content mb-3 xs:mb-4">
                                                Collection Efficiency Overview
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xs:gap-4 sm:gap-5 md:gap-6">
                                                <div className={`rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border text-center transition-all duration-300 ${(collectionDetailsData?.collectionPercentage || 0) >= 90
                                                    ? 'bg-success/5 border-success/50 group-hover/modal-card:bg-success/10 group-hover/modal-card:border-success'
                                                    : (collectionDetailsData?.collectionPercentage || 0) >= 70
                                                        ? 'bg-warning/5 border-warning/50 group-hover/modal-card:bg-warning/10 group-hover/modal-card:border-warning'
                                                        : 'bg-error/5 border-error/50 group-hover/modal-card:bg-error/10 group-hover/modal-card:border-error'
                                                    } group-hover/modal-card:shadow-md`}>
                                                    <div className="text-lg xs:text-lg sm:text-lg text-base-content font-semibold mb-2">
                                                        Collection Rate
                                                    </div>
                                                    <div className={`text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold ${(collectionDetailsData?.collectionPercentage || 0) >= 90
                                                        ? 'text-success'
                                                        : (collectionDetailsData?.collectionPercentage || 0) >= 70
                                                            ? 'text-warning'
                                                            : 'text-error'
                                                        }`}>
                                                        {collectionDetailsData?.collectionPercentage || 0}%
                                                    </div>
                                                    <div className={`text-xs mt-1 font-medium ${(collectionDetailsData?.collectionPercentage || 0) >= 90
                                                        ? 'text-success'
                                                        : (collectionDetailsData?.collectionPercentage || 0) >= 70
                                                            ? 'text-warning'
                                                            : 'text-error'
                                                        }`}>
                                                        {(collectionDetailsData?.collectionPercentage || 0) >= 90
                                                            ? '🎉 Excellent Recovery'
                                                            : (collectionDetailsData?.collectionPercentage || 0) >= 70
                                                                ? '👍 Good Recovery'
                                                                : '⚠️ Needs Follow-up'}
                                                    </div>
                                                </div>
                                                <div className="bg-success/5 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-success/50 text-center transition-all duration-300 group-hover/modal-card:bg-success/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-success">
                                                    <div className="text-lg xs:text-lg sm:text-lg text-base-content font-semibold mb-4">
                                                        Total Collected
                                                    </div>
                                                    <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-base-content">
                                                        ₹{collectionDetailsData?.totalCollected?.toLocaleString() || 0}
                                                    </div>
                                                </div>
                                                <div className="bg-error/5 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-error/50 text-center transition-all duration-300 group-hover/modal-card:bg-error/10 group-hover/modal-card:shadow-md group-hover/modal-card:border-error">
                                                    <div className="text-lg xs:text-lg sm:text-lg text-base-content font-semibold mb-4">
                                                        Outstanding
                                                    </div>
                                                    <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-base-content">
                                                        ₹{collectionDetailsData?.totalOutstanding?.toLocaleString() || 0}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Modes and Monthly Trends - Side by Side */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 xs:gap-5 sm:gap-6">
                                            {/* Payment Modes Breakdown */}
                                            <div className="bg-base-200 border border-base-300 rounded-lg sm:rounded-xl p-3 xs:p-4 sm:p-5 md:p-6">
                                                <h3 className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content mb-3 xs:mb-4">
                                                    Payment Mode Breakdown
                                                </h3>
                                                {isLoadingCollectionDetails ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <span className="loading loading-spinner text-primary loading-md"></span>
                                                        <span className="ml-2 text-base-content/70">Loading payment data...</span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full">
                                                        {collectionDetailsData?.paymentModeBreakdown && Object.entries(collectionDetailsData.paymentModeBreakdown).length > 0 ? (
                                                            (() => {
                                                                const paymentData = Object.entries(collectionDetailsData.paymentModeBreakdown)
                                                                    .sort(([, a], [, b]) => (b as number) - (a as number));

                                                                const chartData = {
                                                                    labels: paymentData.map(([mode]) => mode),
                                                                    datasets: [
                                                                        {
                                                                            label: 'Payment Amount',
                                                                            data: paymentData.map(([, amount]) => amount as number),
                                                                            backgroundColor: [
                                                                                'rgba(59, 130, 246, 0.8)',   // Blue
                                                                                'rgba(34, 197, 94, 0.8)',    // Green  
                                                                                'rgba(168, 85, 247, 0.8)',   // Purple
                                                                                'rgba(251, 146, 60, 0.8)',   // Orange
                                                                                'rgba(236, 72, 153, 0.8)',   // Pink
                                                                            ],
                                                                            borderColor: [
                                                                                'rgba(59, 130, 246, 1)',
                                                                                'rgba(34, 197, 94, 1)',
                                                                                'rgba(168, 85, 247, 1)',
                                                                                'rgba(251, 146, 60, 1)',
                                                                                'rgba(236, 72, 153, 1)',
                                                                            ],
                                                                            borderWidth: 2,
                                                                            borderRadius: 6,
                                                                            borderSkipped: false,
                                                                        },
                                                                    ],
                                                                };

                                                                const options = {
                                                                    responsive: true,
                                                                    maintainAspectRatio: false,
                                                                    plugins: {
                                                                        legend: {
                                                                            display: false,
                                                                        },
                                                                        tooltip: {
                                                                            callbacks: {
                                                                                label: function (context: any) {
                                                                                    return `₹${context.parsed.y.toLocaleString()}`;
                                                                                }
                                                                            }
                                                                        },
                                                                    },
                                                                    scales: {
                                                                        y: {
                                                                            beginAtZero: true,
                                                                            ticks: {
                                                                                callback: function (value: any) {
                                                                                    return '₹' + (value / 100000).toFixed(1) + 'L';
                                                                                }
                                                                            },
                                                                            grid: {
                                                                                color: 'rgba(0, 0, 0, 0.1)',
                                                                            }
                                                                        },
                                                                        x: {
                                                                            grid: {
                                                                                display: false,
                                                                            }
                                                                        }
                                                                    },
                                                                    animation: {
                                                                        duration: 1000,
                                                                        easing: 'easeOutQuart' as const,
                                                                    }
                                                                };

                                                                const maxAmount = Math.max(...paymentData.map(([, amount]) => amount as number));

                                                                return (
                                                                    <div className="w-full">
                                                                        {/* Chart.js Bar Chart */}
                                                                        <div className="bg-base-100 rounded-lg p-4 border border-base-300 shadow-sm mb-4">
                                                                            <div className="h-64 w-full">
                                                                                <Bar data={chartData} options={options} />
                                                                            </div>
                                                                        </div>

                                                                        {/* Summary List */}
                                                                        <div className="space-y-2">
                                                                            {paymentData.map(([mode, amount], index) => {
                                                                                const amountNum = amount as number;
                                                                                const percentage = maxAmount > 0 ? ((amountNum / maxAmount) * 100).toFixed(1) : '0';
                                                                                const colors = [
                                                                                    'bg-blue-500',
                                                                                    'bg-green-500',
                                                                                    'bg-purple-500',
                                                                                    'bg-orange-500',
                                                                                    'bg-pink-500',
                                                                                ];

                                                                                return (
                                                                                    <div key={mode} className="flex items-center justify-between p-2 bg-base-100 rounded-lg border border-base-300 shadow-sm">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className={`w-4 h-4 ${colors[index % colors.length]} rounded`}></div>
                                                                                            <span className="text-sm font-medium text-base-content">{mode}</span>
                                                                                        </div>
                                                                                        <div className="text-right">
                                                                                            <div className="text-sm font-bold text-base-content">₹{amountNum.toLocaleString()}</div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()
                                                        ) : (
                                                            <div className="text-center py-8 text-base-content/70">
                                                                No payment mode data available
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Monthly Trends */}
                                            <div className="bg-base-200 border border-base-300 rounded-lg sm:rounded-xl p-3 xs:p-4 sm:p-5 md:p-6">
                                                <h3 className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content mb-3 xs:mb-4">
                                                    Monthly Collection Trends
                                                </h3>
                                                <div className="space-y-3">
                                                    {collectionDetailsData?.monthlyTrends && collectionDetailsData.monthlyTrends.length > 0 ? (
                                                        (() => {
                                                            const trends = collectionDetailsData.monthlyTrends;
                                                            const maxAmount = Math.max(...trends.map((trend: any) => trend.amount || 0));
                                                            const minAmount = Math.min(...trends.map((trend: any) => trend.amount || 0));

                                                            const chartData = {
                                                                labels: trends.map((trend: any) => trend.month),
                                                                datasets: [
                                                                    {
                                                                        label: 'Monthly Collection',
                                                                        data: trends.map((trend: any) => trend.amount || 0),
                                                                        backgroundColor: [
                                                                            'rgba(99, 102, 241, 0.8)',   // Indigo
                                                                            'rgba(6, 182, 212, 0.8)',    // Cyan
                                                                            'rgba(16, 185, 129, 0.8)',   // Emerald
                                                                            'rgba(245, 158, 11, 0.8)',   // Yellow
                                                                            'rgba(239, 68, 68, 0.8)',    // Red
                                                                            'rgba(139, 92, 246, 0.8)',   // Violet
                                                                        ],
                                                                        borderColor: [
                                                                            'rgba(99, 102, 241, 1)',
                                                                            'rgba(6, 182, 212, 1)',
                                                                            'rgba(16, 185, 129, 1)',
                                                                            'rgba(245, 158, 11, 1)',
                                                                            'rgba(239, 68, 68, 1)',
                                                                            'rgba(139, 92, 246, 1)',
                                                                        ],
                                                                        borderWidth: 2,
                                                                        borderRadius: 6,
                                                                        borderSkipped: false,
                                                                    },
                                                                ],
                                                            };

                                                            const options = {
                                                                responsive: true,
                                                                maintainAspectRatio: false,
                                                                plugins: {
                                                                    legend: {
                                                                        display: false,
                                                                    },
                                                                    tooltip: {
                                                                        callbacks: {
                                                                            label: function (context: any) {
                                                                                return `₹${context.parsed.y.toLocaleString()}`;
                                                                            }
                                                                        }
                                                                    },
                                                                },
                                                                scales: {
                                                                    y: {
                                                                        beginAtZero: true,
                                                                        ticks: {
                                                                            callback: function (value: any) {
                                                                                return '₹' + (value / 100000).toFixed(1) + 'L';
                                                                            }
                                                                        },
                                                                        grid: {
                                                                            color: 'rgba(0, 0, 0, 0.1)',
                                                                        }
                                                                    },
                                                                    x: {
                                                                        grid: {
                                                                            display: false,
                                                                        }
                                                                    }
                                                                },
                                                                animation: {
                                                                    duration: 1000,
                                                                    easing: 'easeOutQuart' as const,
                                                                }
                                                            };

                                                            return (
                                                                <div className="w-full mb-4">
                                                                    {/* Chart.js Bar Chart */}
                                                                    <div className="bg-base-100 rounded-lg p-4 border border-base-300 shadow-sm mb-4">
                                                                        <div className="h-64 w-full">
                                                                            <Bar data={chartData} options={options} />
                                                                        </div>
                                                                    </div>

                                                                    {/* Summary Stats */}
                                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                                        <div className="bg-base-100 rounded-lg p-3 border border-base-300 text-center">
                                                                            <div className="text-xs text-base-content/70 mb-1">Peak Month</div>
                                                                            <div className="text-sm font-bold text-success">
                                                                                {trends.find((t: any) => t.amount === maxAmount)?.month}
                                                                            </div>
                                                                            <div className="text-xs text-base-content/60">₹{(maxAmount / 100000).toFixed(1)}L</div>
                                                                        </div>
                                                                        <div className="bg-base-100 rounded-lg p-3 border border-base-300 text-center">
                                                                            <div className="text-xs text-base-content/70 mb-1">Low Month</div>
                                                                            <div className="text-sm font-bold text-error">
                                                                                {trends.find((t: any) => t.amount === minAmount)?.month}
                                                                            </div>
                                                                            <div className="text-xs text-base-content/60">₹{(minAmount / 100000).toFixed(1)}L</div>
                                                                        </div>
                                                                        <div className="bg-base-100 rounded-lg p-3 border border-base-300 text-center">
                                                                            <div className="text-xs text-base-content/70 mb-1">Average</div>
                                                                            <div className="text-sm font-bold text-primary">
                                                                                ₹{(trends.reduce((sum: number, t: any) => sum + t.amount, 0) / trends.length / 100000).toFixed(1)}L
                                                                            </div>
                                                                            <div className="text-xs text-base-content/60">per month</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (
                                                        <div className="text-center py-8 text-base-content/70">
                                                            No monthly trend data available
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
