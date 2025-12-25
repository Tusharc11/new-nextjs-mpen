'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';

interface FeePayment {
    _id: string;
    amount: number;
    paidOn: string;
    mode: string;
    studentName: string;
    className: string;
    sectionName: string;
    feeStructureName: string;
    feeType: string;
    rollNumber: string;
}

interface FeePaymentsData {
    payments: FeePayment[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalRecords: number;
        hasMore: boolean;
    };
    summary: {
        totalAmount: number;
        totalPayments: number;
        averagePayment: number;
    };
}

interface FeePaymentsTableProps {
    academicYearId?: string;
    authToken?: string;
}

export default function FeePaymentsTable({ academicYearId, authToken }: FeePaymentsTableProps) {
    const [paymentsData, setPaymentsData] = useState<FeePaymentsData>({
        payments: [],
        pagination: { currentPage: 1, totalPages: 0, totalRecords: 0, hasMore: false },
        summary: { totalAmount: 0, totalPayments: 0, averagePayment: 0 }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        period: '',
        class: '',
        section: '',
        startDate: '',
        endDate: '',
        mode: '',
        page: 1
    });

    // Available classes and sections (you might want to fetch these from an API)
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [availableSections, setAvailableSections] = useState<string[]>([]);

    // Available payment modes
    const paymentModes = ['UPI', 'Cash', 'Cheque', 'Bank Transfer', 'Card'];

    const periodOptions = [
        { value: '', label: 'All Time' },
        { value: 'day', label: 'Today' },
        { value: 'month', label: 'This Month' },
        { value: 'quarterly', label: 'This Quarter' },
        { value: 'half-yearly', label: 'This Half Year' },
        { value: 'yearly', label: 'This Year' }
    ];

    const fetchPayments = async () => {
        if (!academicYearId || !authToken) return;

        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('academicYearId', academicYearId);

            Object.entries(filters).forEach(([key, value]) => {
                if (value) {
                    queryParams.append(key, value.toString());
                }
            });

            const response = await fetch(`/api/dashboard/fee-payments?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setPaymentsData(data);
            } else {
                console.error('Failed to fetch fee payments');
            }
        } catch (error) {
            console.error('Error fetching fee payments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchClassesAndSections = async () => {
        if (!academicYearId || !authToken) return;

        try {
            // You might want to create a separate API for this or modify existing ones
            // For now, I'll use some dummy data
            setAvailableClasses(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
            setAvailableSections(['A', 'B', 'C', 'D']);
        } catch (error) {
            console.error('Error fetching classes and sections:', error);
        }
    };

    useEffect(() => {
        fetchClassesAndSections();
    }, [academicYearId, authToken]);

    useEffect(() => {
        fetchPayments();
    }, [academicYearId, authToken, filters]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1 // Reset to first page when filter changes
        }));
    };

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({
            ...prev,
            page: newPage
        }));
    };

    const clearFilters = () => {
        setFilters({
            period: '',
            class: '',
            section: '',
            startDate: '',
            endDate: '',
            mode: '',
            page: 1
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString()}`;
    };

    return (
        <div className="space-y-6 bg-base-100 p-4 rounded-lg">
            {/* Filters Card */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-base-content">Fee Payments History</h3>
                                                 {(filters.period || filters.class || filters.section || filters.startDate || filters.endDate || filters.mode) && (
                             <div className="badge badge-primary badge-md">
                                 Filtered
                             </div>
                         )}
                    </div>
                    <button
                        onClick={clearFilters}
                        className="btn btn-sm btn-outline"
                        disabled={!filters.period && !filters.class && !filters.section && !filters.startDate && !filters.endDate && !filters.mode}
                    >
                        Clear Filters
                    </button>
                </div>

                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                    {/* Period Filter */}
                    <div>
                        <label className="label">
                            <span className="label-text">Period</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={filters.period}
                            onChange={(e) => handleFilterChange('period', e.target.value)}
                        >
                            {periodOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Class Filter */}
                    <div>
                        <label className="label">
                            <span className="label-text">Class</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={filters.class}
                            onChange={(e) => handleFilterChange('class', e.target.value)}
                        >
                            <option value="">All Classes</option>
                            {availableClasses.map(cls => (
                                <option key={cls} value={cls}>Class {cls}</option>
                            ))}
                        </select>
                    </div>

                                         {/* Section Filter */}
                     <div>
                         <label className="label">
                             <span className="label-text">Section</span>
                         </label>
                         <select
                             className="select select-bordered w-full"
                             value={filters.section}
                             onChange={(e) => handleFilterChange('section', e.target.value)}
                         >
                             <option value="">All Sections</option>
                             {availableSections.map(section => (
                                 <option key={section} value={section}>Section {section}</option>
                             ))}
                         </select>
                     </div>

                     {/* Payment Mode Filter */}
                     <div>
                         <label className="label">
                             <span className="label-text">Payment Mode</span>
                         </label>
                         <select
                             className="select select-bordered w-full"
                             value={filters.mode}
                             onChange={(e) => handleFilterChange('mode', e.target.value)}
                         >
                             <option value="">All Modes</option>
                             {paymentModes.map(mode => (
                                 <option key={mode} value={mode}>{mode}</option>
                             ))}
                         </select>
                     </div>

                    {/* Start Date Filter */}
                    <div>
                        <label className="label">
                            <span className="label-text">Start Date</span>
                        </label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        />
                    </div>

                    {/* End Date Filter */}
                    <div>
                        <label className="label">
                            <span className="label-text">End Date</span>
                        </label>
                        <input
                            type="date"
                            className="input input-bordered w-full"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        />
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 bg-base-200 rounded-lg">
                    <div className="text-center">
                        <div className={`text-2xl font-bold text-success transition-all duration-300 ${isLoading ? 'opacity-50' : ''}`}>
                            {isLoading ? (
                                <span className="loading loading-spinner loading-sm mr-2"></span>
                            ) : null}
                            {formatCurrency(paymentsData.summary.totalAmount)}
                        </div>
                        <div className="text-sm text-base-content/70">Total Amount</div>
                    </div>
                    <div className="text-center">
                        <div className={`text-2xl font-bold text-info transition-all duration-300 ${isLoading ? 'opacity-50' : ''}`}>
                            {isLoading ? (
                                <span className="loading loading-spinner loading-sm mr-2"></span>
                            ) : null}
                            {paymentsData.summary.totalPayments}
                        </div>
                        <div className="text-sm text-base-content/70">Total Payments</div>
                    </div>
                </div>
            </Card>

            {/* Payments Table */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h4 className="text-md font-semibold text-base-content">
                            Payment Records
                        </h4>
                        <div className="text-sm text-base-content/70">
                            {isLoading ? (
                                <span className="loading loading-spinner loading-xs mr-1"></span>
                            ) : null}
                                                         ({paymentsData.pagination.totalRecords}
                             {(filters.period || filters.class || filters.section || filters.startDate || filters.endDate || filters.mode)
                                 ? ' filtered'
                                 : ' total'}
                             )
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="table table-zebra w-full">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Student</th>
                                        <th>Class</th>
                                        <th>Amount</th>
                                        <th>Mode</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentsData.payments.length > 0 ? (
                                        paymentsData.payments.map((payment) => (
                                            <tr key={payment._id}>
                                                <td>
                                                    <div className="font-medium">{formatDate(payment.paidOn)}</div>
                                                </td>
                                                <td>
                                                    <div>
                                                        <div className="font-medium">{payment.studentName}</div>
                                                        {payment.rollNumber && (
                                                            <div className="text-sm text-base-content/70">Roll: {payment.rollNumber}</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="font-medium">
                                                        {payment.className && payment.sectionName
                                                            ? `${payment.className} ${payment.sectionName}`
                                                            : 'N/A'
                                                        }
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="font-bold text-success">{formatCurrency(payment.amount)}</div>
                                                </td>
                                                <td>
                                                    <div className="badge badge-outline whitespace-nowrap text-ellipsis overflow-hidden max-w-[120px]">{payment.mode}</div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-base-content/70">
                                                No payment records found for the selected filters
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {paymentsData.pagination.totalPages > 1 && (
                            <div className="flex justify-center items-center mt-6 space-x-2">
                                <button
                                    className="btn btn-sm btn-outline"
                                    disabled={filters.page <= 1}
                                    onClick={() => handlePageChange(filters.page - 1)}
                                >
                                    Previous
                                </button>

                                <span className="text-sm text-base-content/70">
                                    Page {filters.page} of {paymentsData.pagination.totalPages}
                                </span>

                                <button
                                    className="btn btn-sm btn-outline"
                                    disabled={!paymentsData.pagination.hasMore}
                                    onClick={() => handlePageChange(filters.page + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
}
