'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, Users, IndianRupee, Clock, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { Button } from '../ui/button';

// Extend jsPDF with autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

interface DueDate {
    date: string;
    amount: number;
    overdueDays: number;
}

interface Defaulter {
    studentId: string;
    fullName: string;
    parentName: string;
    parentPhone: string;
    className: string;
    sectionName: string;
    classAndSection: string;
    dueDates: DueDate[];
    totalOutstandingAmount: number;
    overdueDays: number;
}

interface DefaultersData {
    defaulters: Defaulter[];
    totalDefaulters: number;
    totalOutstandingAmount: number;
    academicYearId: string;
}

interface DefaultersTableProps {
    academicYearId?: string;
    authToken?: string;
}

const DefaultersTable: React.FC<DefaultersTableProps> = ({
    academicYearId,
    authToken
}) => {
    const [defaultersData, setDefaultersData] = useState<DefaultersData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDefaulters = async () => {
            if (!academicYearId || !authToken) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const response = await fetch(
                    `/api/dashboard/defaulters?academicYearId=${academicYearId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch defaulters data');
                }

                const data = await response.json();
                setDefaultersData(data);
            } catch (err) {
                console.error('Error fetching defaulters:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch defaulters data');
            } finally {
                setLoading(false);
            }
        };

        fetchDefaulters();
    }, [academicYearId, authToken]);

    const formatCurrency = (amount: number) => {
        return `Rs. ${amount.toLocaleString('en-IN')}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getOverdueColor = (days: number) => {
        if (days <= 7) return 'text-warning';
        if (days <= 30) return 'text-error';
        return 'text-error font-bold';
    };

    const generatePDF = async () => {
        if (!defaultersData || defaultersData.defaulters.length === 0) {
            alert('No defaulters data to download');
            return;
        }

        try {
            // Dynamic import of autoTable
            const { default: autoTable } = await import('jspdf-autotable');

            const doc = new jsPDF();

            // Add title
            doc.setFontSize(20);
            doc.text('Fee Defaulters Report', 20, 20);

            // Add date
            doc.setFontSize(12);
            doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 20, 30);

            // Add summary
            doc.setFontSize(14);
            doc.text(`Total Defaulters: ${defaultersData.totalDefaulters}`, 20, 45);
            doc.text(`Total Outstanding Amount: ${formatCurrency(defaultersData.totalOutstandingAmount)}`, 20, 55);

            // Prepare table data
            const tableData = defaultersData.defaulters.map((defaulter, index) => [
                index + 1,
                defaulter.fullName,
                defaulter.parentPhone,
                defaulter.classAndSection,
                defaulter.dueDates.map(dd => formatDate(dd.date)).join(', '),
                `${defaulter.overdueDays} days`,
                formatCurrency(defaulter.totalOutstandingAmount)
            ]);

            // Add table using autoTable
            autoTable(doc, {
                head: [['#', 'Student Name', 'Parent Phone', 'Class', 'Due Dates', 'Overdue Days', 'Outstanding Amount']],
                body: tableData,
                startY: 65,
                styles: {
                    fontSize: 10,
                    cellPadding: 3,
                },
                headStyles: {
                    fillColor: [220, 53, 69], // Red color for header
                    textColor: 255,
                    fontStyle: 'bold',
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245],
                },
                columnStyles: {
                    0: { cellWidth: 15 }, // S.No
                    1: { cellWidth: 35 }, // Student Name
                    2: { cellWidth: 25 }, // Parent Phone
                    3: { cellWidth: 20 }, // Class
                    4: { cellWidth: 30 }, // Due Dates
                    5: { cellWidth: 25 }, // Overdue Days
                    6: { cellWidth: 30 }, // Outstanding Amount
                },
            });

            // Save the PDF
            doc.save(`Fee_Defaulters_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="bg-base-100 border border-base-300 rounded-lg sm:rounded-xl">
                <div className="border-b border-base-300 p-4 sm:p-6">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-error" />
                        <h3 className="text-lg sm:text-xl font-semibold text-base-content">Fee Defaulters</h3>
                    </div>
                </div>
                <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-center h-32">
                        <span className="loading loading-spinner text-primary loading-md"></span>
                        <span className="ml-2 text-base-content/70">Loading defaulters...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-base-100 border border-base-300 rounded-lg sm:rounded-xl">
                <div className="border-b border-base-300 p-4 sm:p-6">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-error" />
                        <h3 className="text-lg sm:text-xl font-semibold text-base-content">Fee Defaulters</h3>
                    </div>
                </div>
                <div className="p-4 sm:p-6">
                    <div className="text-center text-error">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!defaultersData || defaultersData.defaulters.length === 0) {
        return (
            <div className="bg-base-100 border border-base-300 rounded-lg sm:rounded-xl">
                <div className="border-b border-base-300 p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                            <h3 className="text-lg sm:text-xl font-semibold text-base-content">Fee Defaulters</h3>
                        </div>
                        <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full font-medium">
                            All Clear
                        </span>
                    </div>
                </div>
                <div className="p-4 sm:p-6">
                    <div className="text-center text-base-content/60">
                        <Users className="w-12 h-12 mx-auto mb-2 text-success" />
                        <p>No fee defaulters found. All students are up to date with their payments!</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-base-100 border border-base-300 rounded-lg sm:rounded-xl hover:shadow-lg hover:border-primary/50 transition-all duration-300">
            <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-error" />
                        <h3 className="text-lg sm:text-xl font-semibold text-base-content">Fee Defaulters</h3>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant='primary'
                            outline
                            onClick={generatePDF}
                        >
                            <Download className="w-5 h-5" />
                            <span className="text-sm font-medium">Download Report</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DefaultersTable;
