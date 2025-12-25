'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { Search, Plus, Edit, Trash2, Loader2, DollarSign, Users, Calendar, Settings, BadgeIndianRupee, BadgePercent, BookOpen, CreditCard, AlertCircle, CheckCircle, BellOff, X, ClockAlert, CirclePause, ReceiptIndianRupee, Blocks, History, Truck, BookOpenText, Printer } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { formatDate } from '@/utils/dateUtils';
import ModalPopup from '../components/ui/modalPopup';
import toast from 'react-hot-toast';
import { UserRole } from '@/lib/role';
import AcademicYearDropdown from '../components/ui/academicYearDropdown';
import { ISession } from '../api/models/session';
import { useSidebarStore } from '../components/store/useSidebarStore';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

interface FeesStructure {
    _id: string;
    classId: {
        _id: string;
        classNumber: number;
    };
    sectionId: Array<{
        _id: string;
        section: string;
    }>;
    academicYearId: {
        _id: string;
        startDate: string;
        endDate: string;
    };
    installment: string;
    feesTypes: Array<{
        feesTypeId: {
            _id: string;
            name: string;
        };
        amount: number;
    }>;
    totalAmount: number;
    dueDates: string[]; // Changed to array of dates
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface FeesType {
    _id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
}

interface DiscountType {
    _id: string;
    type: string;
    value: number;
    isActive: boolean;
    createdAt: string;
}

interface LateFee {
    _id: string;
    classId: [{
        _id: string;
        classNumber: number;
    }];
    academicYearId: {
        _id: string;
        startDate: string;
        endDate: string;
    };
    amount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface StudentFee {
    _id: string;
    student?: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    studentId?: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    feesStructure?: {
        _id: string;
        installment: string;
        totalAmount: number;
        dueDates: string[]; // Updated to array
        feesTypes: Array<{
            feesTypeId: {
                _id: string;
                name: string;
            };
            amount: number;
        }>;
        classId: {
            _id: string;
            classNumber: number;
        };
        sectionId: Array<{
            _id: string;
            section: string;
        }>;
        academicYearId: {
            _id: string;
            startDate: string;
            endDate: string;
        };
    };
    feesStructureId?: {
        _id: string;
        installment: string;
        totalAmount: number;
        dueDates: string[]; // Updated to array
        feesTypes: Array<{
            feesTypeId: {
                _id: string;
                name: string;
            };
            amount: number;
        }>;
        classId: {
            _id: string;
            classNumber: number;
        };
        sectionId: Array<{
            _id: string;
            section: string;
        }>;
        academicYearId: {
            _id: string;
            startDate: string;
            endDate: string;
        };
    };
    class?: {
        classNumber: number;
    };
    section?: {
        section: string;
    };
    discount?: Array<{
        type: string;
        value: number;
    }>;
    discountTypeId?: {
        type: string;
        value: number;
    };
    dueDate: string; // Individual due date for this fee entry
    status: 'not_started' | 'pending' | 'overdue' | 'paid'; // Payment status
    totalPaid: number;
    feeTotalAmount: number;
    remainingAmount: number;
    payments?: Array<any>;
    isBusTaken?: boolean; // Added bus taken flag
    isActive: boolean;
    createdAt: string;
}

// Payment Form Modal Component
interface PaymentFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedFee: any;
    selectedFeeLateFees: any[];
    paymentForm: any;
    onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onModeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFullPaymentChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: () => void;
    isFormValid: boolean;
    currentPaymentAmount: string;
    isExpanded: boolean;
    formatDate: (date: string) => string;
    editingPayment: any;
}

const PaymentFormModal = React.memo(({
    isOpen,
    onClose,
    selectedFee,
    selectedFeeLateFees,
    paymentForm,
    onAmountChange,
    onModeChange,
    onDateChange,
    onFullPaymentChange,
    onSubmit,
    isFormValid,
    currentPaymentAmount,
    isExpanded,
    formatDate,
    editingPayment
}: PaymentFormModalProps) => {
    if (!isOpen || !selectedFee) return null;

    const handleClose = () => {
        onClose();
    };

    return (
        <div
            className="fixed bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] animate-in fade-in duration-200"
            style={{
                top: '4rem',
                left: isExpanded ? '16rem' : '4rem',
                right: '0',
                bottom: '0'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div
                className="bg-base-100 rounded-lg shadow-2xl 
                         w-[calc(100%-1rem)] h-[calc(100%-2rem)] m-2
                         sm:w-[calc(100%-2rem)] sm:h-[calc(100%-3rem)] sm:rounded-xl sm:m-4 
                         md:w-[calc(100%-4rem)] md:h-[calc(100%-4rem)] md:rounded-2xl md:m-6
                         lg:w-[calc(100%-6rem)] lg:max-h-[calc(100vh-8rem)] lg:rounded-2xl lg:m-8
                         xl:max-w-5xl xl:max-h-[calc(100vh-6rem)] xl:rounded-3xl
                         2xl:max-w-6xl 2xl:max-h-[calc(100vh-4rem)]
                         overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="sticky top-0 bg-base-200 border-b border-base-300 border-base-content/30 z-10 px-4 py-3">
                        <div className="flex justify-between items-center gap-2 p-2">
                            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-base-content truncate pr-2">
                                {editingPayment ? 'Edit Payment' : 'Record Payment'}
                            </h3>
                            <Button
                                outline
                                variant='error'
                                onClick={handleClose}
                            >
                                <span className="text-lg font-bold">×</span>
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
                            {/* Two Column Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column - Editable Fields */}
                                <div className="space-y-4 order-2 lg:order-1">
                                    <div className="bg-base-50 border border-base-content/80 rounded-lg p-4">
                                        <h5 className="font-semibold text-lg text-base-content mb-4 flex items-center gap-2 justify-center">
                                            <ReceiptIndianRupee className="w-6 h-6 text-success" />
                                            Payment Details
                                        </h5>
                                        <div className="divider my-3"></div>

                                        {/* Amount Input - Always show for editing, only show for partial payment when creating new */}
                                        {(editingPayment || !paymentForm.isFullPayment) && (
                                            <div className="form-control mb-4">
                                                <label className="label">
                                                    <span className="label-text font-medium">
                                                        Payment Amount <span className="text-error">*</span>
                                                    </span>
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    max={editingPayment ? (() => {
                                                        const isBusFee = selectedFee.routeDestination !== undefined;
                                                        const otherPaymentsTotal = isBusFee ? (selectedFee.totalPaidFees || 0) - (editingPayment.amount || 0) : (selectedFee.totalPaid || 0) - (editingPayment.amount || 0);
                                                        const maxAllowed = isBusFee 
                                                            ? selectedFee.amount 
                                                            : selectedFee.feeTotalAmount + (selectedFee.totalLateFees || 0);
                                                        return maxAllowed - otherPaymentsTotal;
                                                    })() : (() => {
                                                        const isBusFee = selectedFee.routeDestination !== undefined;
                                                        if (isBusFee) {
                                                            const totalPaid = selectedFee.totalPaidFees || 0;
                                                            return Math.max(0, selectedFee.amount - totalPaid);
                                                        } else {
                                                            const feeTotalAmount = selectedFee.feeTotalAmount || 0;
                                                            const totalLateFees = selectedFeeLateFees?.filter((lf: any) => !lf.isWaived)
                                                                .reduce((sum: number, lf: any) => sum + (lf.lateFeeAmount || 0), 0) || 0;
                                                            const totalPaid = selectedFee.totalPaid || 0;
                                                            return Math.max(0, (feeTotalAmount + totalLateFees) - totalPaid);
                                                        }
                                                    })()}
                                                    className="input input-bordered w-full text-base-content"
                                                    placeholder="Enter payment amount"
                                                    value={paymentForm.amount}
                                                    onChange={(e) => {
                                                        const inputValue = e.target.value;

                                                        // Allow decimal numbers (including partial like "100." while typing)
                                                        if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                                                            onAmountChange(e);
                                                        }
                                                    }}
                                                    required
                                                />
                                                {!editingPayment ? (
                                                    <label className="label">
                                                        <span className="label-text-alt text-base-content/80">
                                                            Maximum: ₹{(() => {
                                                                const isBusFee = selectedFee.routeDestination !== undefined;
                                                                if (isBusFee) {
                                                                    const totalPaid = selectedFee.totalPaidFees || 0;
                                                                    const outstanding = Math.max(0, selectedFee.amount - totalPaid);
                                                                    return outstanding.toLocaleString();
                                                                } else {
                                                                    const feeTotalAmount = selectedFee.feeTotalAmount || 0;
                                                                    const totalLateFees = selectedFeeLateFees?.filter((lf: any) => !lf.isWaived)
                                                                        .reduce((sum: number, lf: any) => sum + (lf.lateFeeAmount || 0), 0) || 0;
                                                                    const totalPaid = selectedFee.totalPaid || 0;
                                                                    const outstanding = Math.max(0, (feeTotalAmount + totalLateFees) - totalPaid);
                                                                    return outstanding.toLocaleString();
                                                                }
                                                            })()}
                                                        </span>
                                                    </label>
                                                ) : (
                                                    <label className="label">
                                                        <span className="label-text-alt text-base-content/80">
                                                            Maximum: ₹{(() => {
                                                                const isBusFee = selectedFee.routeDestination !== undefined;
                                                                const otherPaymentsTotal = isBusFee ? (selectedFee.totalPaidFees || 0) - (editingPayment.amount || 0) : (selectedFee.totalPaid || 0) - (editingPayment.amount || 0);
                                                                const maxAllowed = isBusFee 
                                                                    ? selectedFee.amount 
                                                                    : selectedFee.feeTotalAmount + (selectedFee.totalLateFees || 0);
                                                                const maxForThisPayment = maxAllowed - otherPaymentsTotal;
                                                                return maxForThisPayment.toLocaleString();
                                                            })()}
                                                        </span>
                                                    </label>
                                                )}
                                            </div>
                                        )}

                                        {/* Payment Type Checkbox - only show when creating new payment */}
                                        {!editingPayment && (
                                            <div className="form-control mb-4">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox checkbox-primary"
                                                        checked={paymentForm.isFullPayment}
                                                        onChange={onFullPaymentChange}
                                                    />
                                                    <div className="flex-1">
                                                        <span className="label-text font-medium text-base-content">
                                                            Full Payment
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Full Payment Confirmation - only show when creating new payment */}
                                        {!editingPayment && paymentForm.isFullPayment && (
                                            <div className=" p-3 bg-success/10 border border-success/30 rounded-lg">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="font-bold text-base-content">Full Payment Selected</span>
                                                    <span className="text-lg font-bold text-base-content">
                                                        ₹{(() => {
                                                            const feeTotalAmount = selectedFee.feeTotalAmount || 0;
                                                            const totalLateFees = selectedFeeLateFees?.filter((lf: any) => !lf.isWaived)
                                                                .reduce((sum: number, lf: any) => sum + (lf.lateFeeAmount || 0), 0) || 0;
                                                            const totalPaid = selectedFee.totalPaid || 0;
                                                            const outstanding = Math.max(0, (feeTotalAmount + totalLateFees) - totalPaid);
                                                            return outstanding.toLocaleString();
                                                        })()}
                                                    </span>
                                                </div>
                                                {selectedFeeLateFees && selectedFeeLateFees.length > 0 && (
                                                    <div className="text-xs text-base-content/70 mt-2">
                                                        <span>Includes late fees: ₹{selectedFeeLateFees
                                                            .filter((lf: any) => !lf.isWaived)
                                                            .reduce((sum: number, lf: any) => sum + (lf.lateFeeAmount || 0), 0)
                                                            .toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>

                                        )}

                                        <div className="space-y-4">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-medium">
                                                        Payment Mode <span className="text-error">*</span>
                                                    </span>
                                                </label>
                                                <select
                                                    className="select select-bordered w-full text-base-content"
                                                    value={paymentForm.mode}
                                                    onChange={onModeChange}
                                                    required
                                                >
                                                    <option value="UPI">UPI</option>
                                                    <option value="Cash">Cash</option>
                                                    <option value="Cheque">Cheque</option>
                                                    <option value="Bank Transfer">Bank Transfer</option>
                                                    <option value="Card">Card</option>
                                                </select>
                                            </div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-medium">
                                                        Payment Date <span className="text-error">*</span>
                                                    </span>
                                                </label>
                                                <input
                                                    type="date"
                                                    className="input input-bordered w-full text-base-content"
                                                    value={paymentForm.paidOn}
                                                    onChange={onDateChange}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                        <Button
                                            outline
                                            variant='primary'
                                            type="submit"
                                            className="btn btn-primary flex-1"
                                            disabled={!isFormValid}
                                        >
                                            {editingPayment ? 'Update Payment' : 'Add Payment'}
                                        </Button>
                                        <Button
                                            outline
                                            variant='error'
                                            type="button"
                                            className="btn btn-outline btn-error flex-1"
                                            onClick={handleClose}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>

                                {/* Right Column - Receipt Information */}
                                <div className="order-1 lg:order-2">
                                    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-dashed border-primary/30 rounded-lg p-4 h-full">
                                        <div className="text-center mb-4">
                                            <h4 className="font-semibold text-xl text-base-content mb-2 flex items-center justify-center gap-2">
                                                <ReceiptIndianRupee className="w-6 h-6 text-success" />
                                                {editingPayment ? 'Payment Receipt' : 'Payment Receipt'}
                                            </h4>
                                            <div className="divider my-3"></div>
                                        </div>

                                        {/* Student Information */}
                                        <div className="bg-base-100 rounded-lg p-4 mb-4 border border-base-content/10">
                                            <div className="text-md text-base-content space-y-1">
                                                <p><span className="font-semibold">Student Name:</span> {selectedFee.student?.firstName} {selectedFee.student?.lastName}</p>
                                                <p><span className="font-semibold">Class:</span> {(() => {
                                                    // Handle both bus fees and regular fees
                                                    const isBusFee = selectedFee.routeDestination !== undefined;
                                                    if (isBusFee) {
                                                        // For bus fees, use classDetails and sectionDetails from aggregation
                                                        const className = selectedFee.classDetails?.classNumber || selectedFee.class?.classNumber || 'N/A';
                                                        const sectionName = selectedFee.sectionDetails?.section || selectedFee.section?.section || 'N/A';
                                                        return `${className} ${sectionName}`;
                                                    } else {
                                                        // For regular fees
                                                        return `${selectedFee.class?.classNumber || 'N/A'} ${selectedFee.section?.section || 'N/A'}`;
                                                    }
                                                })()}</p>
                                                {/* Show transport info for bus fees */}
                                                {selectedFee.routeDestination && (
                                                    <>
                                                        <p><span className="font-semibold">Destination:</span> {selectedFee.routeDestination}</p>
                                                        {selectedFee.studentBusDetails?.transportDetails && (
                                                            <p><span className="font-semibold">Bus:</span> {selectedFee.studentBusDetails.transportDetails.busNumber || 'N/A'}</p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Receipt Details */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2 border-b border-base-content/10">
                                                <span className="font-medium text-base-content">Due Date:</span>
                                                <span className="font-semibold text-base-content">
                                                    {formatDate(selectedFee.dueDate)}
                                                </span>
                                            </div>

                                                                        {/* Fee Structure Breakdown */}
                            {(() => {
                                const isBusFee = selectedFee.routeDestination !== undefined;
                                
                                if (isBusFee) {
                                    // Show bus fee information
                                    return (
                                        <div className="bg-base-50 rounded-lg p-3 border border-base-content/10">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-base-content/80">
                                                        Bus Fee ({selectedFee.routeDestination}):
                                                    </span>
                                                    <span className="font-medium text-base-content">
                                                        ₹{selectedFee.amount?.toLocaleString() || '0'}
                                                    </span>
                                                </div>
                                                <div className="pt-2 mt-2 border-t border-base-content/20">
                                                    <div className="flex justify-between items-center font-semibold">
                                                        <span className="text-base-content">Total Bus Fee:</span>
                                                        <span className="text-base-content">
                                                            ₹{selectedFee.amount?.toLocaleString() || '0'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                } else {
                                    // Show regular fee structure
                                    const feesStructure = selectedFee.feesStructure || selectedFee.feesStructureId;
                                    if (feesStructure && feesStructure.feesTypes && feesStructure.feesTypes.length > 0) {
                                        return (
                                            <div className="bg-base-50 rounded-lg p-3 border border-base-content/10">
                                                <div className="space-y-2">
                                                    {feesStructure.feesTypes.map((feeType: any, index: number) => (
                                                        <div key={index} className="flex justify-between items-center text-sm">
                                                            <span className="text-base-content/80">
                                                                {feeType.feesTypeId?.name || 'Fee Type'}:
                                                            </span>
                                                            <span className="font-medium text-base-content">
                                                                ₹{feeType.amount?.toLocaleString() || '0'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    <div className="pt-2 mt-2 border-t border-base-content/20">
                                                        <div className="flex justify-between items-center font-semibold">
                                                            <span className="text-base-content">Subtotal:</span>
                                                            <span className="text-base-content">
                                                                ₹{feesStructure.totalAmount?.toLocaleString() || selectedFee.feeTotalAmount?.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }
                            })()}

                                                                        {(() => {
                                const isBusFee = selectedFee.routeDestination !== undefined;
                                
                                if (isBusFee) {
                                    // Bus fee display
                                    const totalPaid = selectedFee.totalPaidFees || 0;
                                    const outstanding = Math.max(0, selectedFee.remainingAmountFees || 0);
                                    
                                    return (
                                        <>
                                            <div className="flex justify-between items-center py-2 border-b border-base-content/10">
                                                <span className="font-medium text-base-content">Bus Fee Amount:</span>
                                                <span className="font-bold text-base-content">
                                                    ₹{selectedFee.amount?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-base-content/10 bg-primary/5">
                                                <span className="font-semibold text-base-content">Total Amount Due:</span>
                                                <span className="font-bold text-primary">
                                                    ₹{selectedFee.amount?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-base-content/10">
                                                <span className="font-medium text-base-content">Already Paid:</span>
                                                <span className="font-bold text-success">
                                                    ₹{totalPaid.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className=" p-3 bg-error/10 border border-error/30 rounded-lg">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="font-bold text-base-content">Outstanding Amount:</span>
                                                    <span className="text-lg font-bold text-base-content">
                                                        ₹{outstanding.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    );
                                } else {
                                    // Regular fee display
                                    return (
                                        <>
                                            <div className="flex justify-between items-center py-2 border-b border-base-content/10">
                                                <span className="font-medium text-base-content">Total Fee Amount:</span>
                                                <span className="font-bold text-base-content">
                                                    ₹{selectedFee.feeTotalAmount?.toLocaleString()}
                                                </span>
                                            </div>
                                            {selectedFeeLateFees && selectedFeeLateFees.length > 0 && (
                                                <div className="flex justify-between items-center py-2 border-b border-base-content/10">
                                                    <span className="font-medium text-base-content">Late Fees:</span>
                                                    <span className="font-bold text-orange-600">
                                                        ₹{selectedFeeLateFees
                                                            .filter((lf: any) => !lf.isWaived)
                                                            .reduce((sum: number, lf: any) => sum + (lf.lateFeeAmount || 0), 0)
                                                            .toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center py-2 border-b border-base-content/10 bg-primary/5">
                                                <span className="font-semibold text-base-content">Total Amount Due:</span>
                                                <span className="font-bold text-primary">
                                                    ₹{((selectedFee.feeTotalAmount || 0) +
                                                        (selectedFeeLateFees?.filter((lf: any) => !lf.isWaived)
                                                            .reduce((sum: number, lf: any) => sum + (lf.lateFeeAmount || 0), 0) || 0)
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-base-content/10">
                                                <span className="font-medium text-base-content">Already Paid:</span>
                                                <span className="font-bold text-success">
                                                    ₹{selectedFee.totalPaid?.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className=" p-3 bg-error/10 border border-error/30 rounded-lg">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="font-bold text-base-content">Outstanding Amount:</span>
                                                    <span className="text-lg font-bold text-base-content">
                                                        ₹{(() => {
                                                            const feeTotalAmount = selectedFee.feeTotalAmount || 0;
                                                            const totalLateFees = selectedFeeLateFees?.filter((lf: any) => !lf.isWaived)
                                                                .reduce((sum: number, lf: any) => sum + (lf.lateFeeAmount || 0), 0) || 0;
                                                            const totalPaid = selectedFee.totalPaid || 0;
                                                            const outstanding = (feeTotalAmount + totalLateFees) - totalPaid;
                                                            return Math.max(0, outstanding).toLocaleString();
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    );
                                }
                            })()}

                                            {/* Late Fees Section */}
                                            {selectedFeeLateFees && selectedFeeLateFees.length > 0 && (
                                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                                    <h6 className="font-semibold text-base-content mb-2 flex items-center gap-2">
                                                        <span className="text-orange-600">⚠️</span>
                                                        Late Fees Applied
                                                    </h6>
                                                    <div className="space-y-2">
                                                        {selectedFeeLateFees.map((lateFee: any, index: number) => (
                                                            <div key={index} className="flex justify-between items-center text-sm">
                                                                <div className="flex-1">
                                                                    <span className="font-medium text-base-content">
                                                                        {lateFee.isWaived ? '(Waived)' : 'Late Fee'}
                                                                    </span>
                                                                </div>
                                                                <span className={`font-bold ${lateFee.isWaived ? 'text-green-600 line-through' : 'text-orange-600'}`}>
                                                                    ₹{lateFee.lateFeeAmount?.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        <div className="pt-2 mt-2 border-t border-orange-200">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-base-content">Total Late Fees:</span>
                                                                <span className="font-bold text-orange-600">
                                                                    ₹{selectedFeeLateFees
                                                                        .filter((lf: any) => !lf.isWaived)
                                                                        .reduce((sum: number, lf: any) => sum + (lf.lateFeeAmount || 0), 0)
                                                                        .toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Current Payment Summary */}
                                            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mt-4">
                                                <h6 className="font-semibold text-base-content mb-3">
                                                    {editingPayment ? 'Editing Payment' : 'Payment Details'}
                                                </h6>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium text-base-content">Amount:</span>
                                                        <span className="font-bold text-primary">
                                                            ₹{currentPaymentAmount}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium text-base-content">Mode:</span>
                                                        <span className="font-medium text-base-content">{paymentForm.mode}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium text-base-content">Date:</span>
                                                        <span className="font-medium text-base-content">{formatDate(paymentForm.paidOn)}</span>
                                                    </div>
                                                    {editingPayment && (
                                                        <div className="pt-2 mt-2 border-t border-primary/30">
                                                            <div className="text-sm text-base-content/70 mb-2">
                                                                Editing payment originally made on {formatDate(editingPayment.paidOn)}
                                                            </div>
                                                            <div className="text-xs text-warning bg-warning/10 p-2 rounded border border-warning/30">
                                                                <span className="font-medium">Note:</span> Maximum amount for this payment: ₹{(() => {
                                                                    const isBusFee = selectedFee.routeDestination !== undefined;
                                                                    const otherPaymentsTotal = isBusFee ? (selectedFee.totalPaidFees || 0) - (editingPayment.amount || 0) : (selectedFee.totalPaid || 0) - (editingPayment.amount || 0);
                                                                    const maxAllowed = isBusFee 
                                                                        ? selectedFee.amount 
                                                                        : selectedFee.feeTotalAmount + (selectedFee.totalLateFees || 0);
                                                                    const maxForThisPayment = maxAllowed - otherPaymentsTotal;
                                                                    return maxForThisPayment.toLocaleString();
                                                                })()}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
});

// Helper function to group student fees by student
const groupStudentFeesByStudent = (fees: StudentFee[], payments: any[], lateFees: any[]) => {
    const grouped = new Map();

    fees.forEach(fee => {
        const student = fee.student || fee.studentId;
        if (!student) return;

        const studentKey = student._id;
        if (!grouped.has(studentKey)) {
            grouped.set(studentKey, {
                student,
                fees: [],
                hasMultiple: false
            });
        }

        // Check if this fee has any payments
        const feePayments = payments.filter(payment =>
            payment.studentFeeId?._id === fee._id || payment.studentFeeId === fee._id
        );

        // Calculate late fees for this student fee
        const feeLateFees = lateFees.filter(lateFee =>
            lateFee.studentFeeId === fee._id ||
            (typeof lateFee.studentFeeId === 'object' && lateFee.studentFeeId._id === fee._id)
        );

        const computedTotalLateFees = feeLateFees
            .filter(lf => !lf.isWaived)
            .reduce((sum, lf) => sum + (lf.lateFeeAmount || 0), 0);
        const totalLateFees = (fee as any).totalLateFees != null ? (fee as any).totalLateFees : computedTotalLateFees;

        const computedTotalPaid = feePayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const totalPaid = fee.totalPaid != null ? fee.totalPaid : computedTotalPaid;
        const feeTotalAmount = fee.feeTotalAmount || fee.feesStructure?.totalAmount || fee.feesStructureId?.totalAmount || 0;
        const remainingAmount = feeTotalAmount - totalPaid + totalLateFees;
        const isPending = fee.status === 'pending' || fee.status === 'overdue';

        grouped.get(studentKey).fees.push({
            ...fee,
            // Ensure these fields are always present for UI consumption (student role safety)
            feeTotalAmount,
            totalPaid,
            remainingAmount,
            totalLateFees,
            isPending,
            payments: feePayments
        });
    });

    // Convert to array and mark entries with multiple fees
    const result = Array.from(grouped.values()).map(group => {
        group.hasMultiple = group.fees.length > 1;
        // Sort fees: by status priority, then by installment number
        group.fees.sort((a: any, b: any) => {
            // Status priority: overdue > pending > not_started > paid
            const statusPriority: { [key: string]: number } = { 'overdue': 0, 'pending': 1, 'not_started': 2, 'paid': 3 };
            const aPriority = statusPriority[a.status] ?? 4;
            const bPriority = statusPriority[b.status] ?? 4;

            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }

            // If same status, sort by due date
            const aDate = new Date(a.dueDate);
            const bDate = new Date(b.dueDate);
            return aDate.getTime() - bDate.getTime();
        });

        return group;
    });

    return result;
};

function ManageFeesForm() {
    const searchParams = useSearchParams();
    const getInitialTab = (): string => {
        const tabParam = searchParams.get('tab');
        const validTabs = ['studentFees', 'structures', 'feesTypes', 'discounts', 'lateFees'];
        return validTabs.includes(tabParam || '') ? (tabParam as string) : 'studentFees';
    };

    const { isExpanded } = useSidebarStore();
    const [activeTab, setActiveTab] = useState(getInitialTab());
    const [searchTerm, setSearchTerm] = useState('');
    const [feesStructures, setFeesStructures] = useState<FeesStructure[


    ]>([]);
    const [feesTypes, setFeesTypes] = useState<FeesType[]>([]);
    const [discountTypes, setDiscountTypes] = useState<DiscountType[]>([]);
    const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
    const [studentFeePayments, setStudentFeePayments] = useState<any[]>([]);
    const [studentLateFees, setStudentLateFees] = useState<any[]>([]);
    const [studentBusFees, setStudentBusFees] = useState<any[]>([]);
    const [studentBusFeePayments, setStudentBusFeePayments] = useState<any[]>([]);
    const [groupedStudentFees, setGroupedStudentFees] = useState<any[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [deleteType, setDeleteType] = useState<'structure' | 'feesType' | 'discount' | 'lateFee'>('structure');
    const [isMobile, setIsMobile] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [lateFees, setLateFees] = useState<LateFee[]>([]);

    // Student fee modal state
    const [isStudentFeeModalOpen, setIsStudentFeeModalOpen] = useState(false);
    const [selectedStudentFees, setSelectedStudentFees] = useState<StudentFee[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    // Payment form modal state
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<any>(null);
    const [editingPayment, setEditingPayment] = useState<any>(null);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        mode: 'UPI',
        paidOn: new Date().toISOString().split('T')[0],
        isFullPayment: false
    });

    // Student fee modal tabs state
    const [activeModalTab, setActiveModalTab] = useState<'tuition' | 'transport'>('tuition');

    // Memoized onChange handlers to prevent form fields from losing focus
    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setPaymentForm(prev => ({ ...prev, amount: e.target.value }));
    }, []);

    const handleModeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setPaymentForm(prev => ({ ...prev, mode: e.target.value }));
    }, []);

    const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setPaymentForm(prev => ({ ...prev, paidOn: e.target.value }));
    }, []);

    const handleFullPaymentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setPaymentForm(prev => ({
            ...prev,
            isFullPayment: e.target.checked,
            amount: e.target.checked ? (selectedFeeForPayment?.remainingAmount?.toString() || '') : ''
        }));
    }, [selectedFeeForPayment?.remainingAmount]);

    // Print payment receipt function
    const handlePrintPaymentReceipt = (fee: any, payment: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Please allow popups to enable printing');
            return;
        }

        // Determine if this is a bus fee or regular tuition fee
        const isBusFee = fee.routeName || fee.transportFee;
        const student = selectedStudent;
        // Get organization name from student data or use default
        const organizationName = student?.organization?.name || student?.organizationName || 'School Management System';

        // Build organization info HTML
        const organizationInfoHtml = organizationName ? `<div class="organization-info">${organizationName}</div>` : '';

        // Generate the print content
        const printContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <style>
                        @page {
                            size: A4;
                            margin: 15mm;
                        }

                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }

                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            font-size: 12px;
                            line-height: 1.4;
                            color: #333;
                            background: white;
                        }

                        .receipt-container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            border: 2px solid #333;
                            border-radius: 8px;
                        }

                        .receipt-header {
                            text-align: center;
                            margin-bottom: 30px;
                            border-bottom: 2px solid #333;
                            padding-bottom: 20px;
                        }

                        .receipt-title {
                            font-size: 24px;
                            font-weight: bold;
                            margin-bottom: 8px;
                            color: #1a1a1a;
                        }

                        .organization-info {
                            font-size: 14px;
                            color: #666;
                            margin-bottom: 4px;
                        }

                        .receipt-details {
                            margin-bottom: 30px;
                        }

                        .detail-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 8px;
                            padding: 4px 0;
                        }

                        .detail-label {
                            font-weight: bold;
                            min-width: 120px;
                        }

                        .detail-value {
                            text-align: right;
                        }

                        .payment-section {
                            margin-bottom: 30px;
                            border: 1px solid #ddd;
                            border-radius: 6px;
                            padding: 15px;
                            background: #f9f9f9;
                        }

                        .section-title {
                            font-size: 16px;
                            font-weight: bold;
                            margin-bottom: 15px;
                            color: #1a1a1a;
                            border-bottom: 1px solid #ccc;
                            padding-bottom: 5px;
                        }

                        .amount-highlight {
                            font-size: 18px;
                            font-weight: bold;
                            color: #2563eb;
                            text-align: center;
                            margin: 20px 0;
                            padding: 10px;
                            background: #eff6ff;
                            border-radius: 6px;
                            border: 2px solid #dbeafe;
                        }

                        .receipt-footer {
                            text-align: center;
                            margin-top: 40px;
                            padding-top: 20px;
                            border-top: 1px solid #ddd;
                            font-size: 11px;
                            color: #666;
                        }

                        .print-date {
                            text-align: right;
                            font-size: 11px;
                            color: #888;
                            margin-bottom: 10px;
                        }

                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .receipt-container { box-shadow: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-date">Printed on: ${new Date().toLocaleString()}</div>
                    <div class="receipt-container">
                        <div class="receipt-header">
                            <div class="receipt-title">PAYMENT RECEIPT</div>
                            ${organizationInfoHtml}
                            <div class="organization-info">${isBusFee ? 'Transport Fee Payment' : 'Tuition Fee Payment'}</div>
                        </div>

                        <div class="receipt-details">
                            <div class="detail-row">
                                <span class="detail-label">Student Name:</span>
                                <span class="detail-value">${student?.firstName || ''} ${student?.lastName || ''}</span>
                            </div>
                            ${student?.class?.classNumber ? `
                            <div class="detail-row">
                                <span class="detail-label">Class:</span>
                                <span class="detail-value">${student.class.classNumber}${student?.section?.section ? ` - ${student.section.section}` : ''}</span>
                            </div>
                            ` : ''}
                            <div class="detail-row">
                                <span class="detail-label">Payment Date:</span>
                                <span class="detail-value">${formatDate(payment.paidOn)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Payment Mode:</span>
                                <span class="detail-value">${payment.mode || 'N/A'}</span>
                            </div>
                            ${fee.dueDate ? `
                            <div class="detail-row">
                                <span class="detail-label">Due Date:</span>
                                <span class="detail-value">${formatDate(fee.dueDate)}</span>
                            </div>
                            ` : ''}
                        </div>

                        <div class="payment-section">
                            <div class="section-title">Payment Details</div>
                            ${isBusFee ? `
                                <div class="detail-row">
                                    <span class="detail-label">Fee Type:</span>
                                    <span class="detail-value">Transport Fee</span>
                                </div>
                                ${fee.routeName ? `
                                <div class="detail-row">
                                    <span class="detail-label">Route:</span>
                                    <span class="detail-value">${fee.routeName}</span>
                                </div>
                                ` : ''}
                            ` : `
                                <div class="detail-row">
                                    <span class="detail-label">Fee Type:</span>
                                    <span class="detail-value">Tuition Fee</span>
                                </div>
                                ${fee.feesStructure?.installment ? `
                                <div class="detail-row">
                                    <span class="detail-label">Installment:</span>
                                    <span class="detail-value">${fee.feesStructure.installment}</span>
                                </div>
                                ` : ''}
                            `}
                        </div>

                        <div class="amount-highlight">
                            Amount Paid: ₹${payment.amount?.toLocaleString() || '0'}
                        </div>

                        <div class="receipt-footer">
                            <div>This is a computer generated receipt and does not require signature.</div>
                            <div>Thank you for your payment!</div>
                        </div>
                    </div>
                </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };
    };

    // Memoized close handler for payment modal
    const handlePaymentModalClose = useCallback(() => {
        setIsPaymentModalOpen(false);
        setSelectedFeeForPayment(null);
        setEditingPayment(null);
        setPaymentForm({
            amount: '',
            mode: 'UPI',
            paidOn: new Date().toISOString().split('T')[0],
            isFullPayment: false
        });
    }, []);

    // Memoized calculated values to prevent re-renders
    const isFormValid = useMemo(() => {
        const hasAmount = editingPayment
            ? paymentForm.amount && parseFloat(paymentForm.amount) > 0  // For editing, just check positive amount
            : (paymentForm.isFullPayment || paymentForm.amount);        // For new payment, check full payment or amount
        return Boolean(hasAmount && paymentForm.mode && paymentForm.paidOn);
    }, [editingPayment, paymentForm.isFullPayment, paymentForm.amount, paymentForm.mode, paymentForm.paidOn]);

    const currentPaymentAmount = useMemo(() => {
        if (editingPayment) {
            // For editing, just show the amount entered
            return paymentForm.amount ? parseFloat(paymentForm.amount).toLocaleString() : '0';
        }
        if (paymentForm.isFullPayment && selectedFeeForPayment) {
            // Calculate actual outstanding amount
            const isBusFee = selectedFeeForPayment.routeDestination !== undefined;

            if (isBusFee) {
                const totalPaid = selectedFeeForPayment.totalPaidFees || 0;
                const outstanding = Math.max(0, selectedFeeForPayment.remainingAmountFees || 0);
                return outstanding.toLocaleString();
            } else {
                const feeTotalAmount = selectedFeeForPayment.feeTotalAmount || 0;
                const totalLateFees = selectedFeeForPayment.totalLateFees || 0;
                const totalPaid = selectedFeeForPayment.totalPaid || 0;
                const outstanding = Math.max(0, (feeTotalAmount + totalLateFees) - totalPaid);
                return outstanding.toLocaleString();
            }
        }
        return paymentForm.amount ? parseFloat(paymentForm.amount).toLocaleString() : '0';
    }, [editingPayment, paymentForm.isFullPayment, paymentForm.amount, selectedFeeForPayment]);

    // Academic year state
    const [academicYears, setAcademicYears] = useState<ISession[]>([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<ISession | null>(null);
    const [isLoadingAcademicYears, setIsLoadingAcademicYears] = useState(true);

    // Student fees screen state
    const [studentFeesScreen, setStudentFeesScreen] = useState<'classes' | 'students'>('classes');
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedSection, setSelectedSection] = useState<any>(null);
    const [classSections, setClassSections] = useState<any[]>([]);

    // Check if we're on mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (!token) return;
            const payload = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));
            setUserRole(decodedPayload.role);
        }
    }, []);

    // Watch for URL parameter changes and update active tab
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        const validTabs = ['studentFees', 'structures', 'feesTypes', 'discounts', 'lateFees'];
        if (tabParam && validTabs.includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    // Clear search text on tab change
    useEffect(() => {
        setSearchTerm('');
    }, [activeTab]);

    // Fetch academic years
    useEffect(() => {
        const fetchAcademicYears = async () => {
            try {
                // Check for authentication before making API call
                const token = localStorage.getItem('token');
                if (!token) {
                    console.log('No token found, skipping academic years fetch');
                    return;
                }

                setIsLoadingAcademicYears(true);
                const response = await fetch('/api/session');
                if (!response.ok) throw new Error('Failed to fetch academic years');

                const data = await response.json();
                setAcademicYears(data);

                if (data.length > 0) {
                    // Sort by startDate in descending order and select the most recent
                    const sortedYears = [...data].sort((a, b) =>
                        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                    );
                    setSelectedAcademicYear(sortedYears[0]);
                }
            } catch (error) {
                toast.error('Failed to load academic years');
            } finally {
                setIsLoadingAcademicYears(false);
            }
        };

        fetchAcademicYears();
    }, []);

    // Fetch data when academic year or tab changes
    useEffect(() => {
        if (selectedAcademicYear) {
            fetchData();
        }
    }, [activeTab, selectedAcademicYear]);

    // Reset student fees screen when tab changes
    useEffect(() => {
        if (activeTab === 'studentFees') {
            // Students see their fees directly, admins/staff see class-section navigation
            setStudentFeesScreen(userRole === 'STUDENT' ? 'students' : 'classes');
            setSelectedClass(null);
            setSelectedSection(null);
        }
    }, [activeTab, userRole]);

    const fetchData = async () => {
        if (!selectedAcademicYear) return;

        setIsLoading(true);
        try {

            if (activeTab === 'studentFees') {
                if (studentFeesScreen === 'classes') {
                    // Fetch class-section combinations
                    await fetchClassSections();
                } else {
                    // Fetch student fees
                    let url = `/api/student-fees?academicYearId=${selectedAcademicYear._id}`;

                    // For admin/staff viewing specific class/section
                    if (userRole !== 'STUDENT' && selectedClass && selectedSection) {
                        url += `&classId=${selectedClass._id}&sectionId=${selectedSection._id}`;
                    }

                    const [feesResponse, paymentsResponse, lateFeesResponse, busFeesResponse] = await Promise.all([
                        fetch(url),
                        fetch('/api/student-fee-payments'),
                        fetch('/api/student-late-fees'),
                        fetch(`/api/student-bus-fees?academicYearId=${selectedAcademicYear._id}&useStudentClassAggregation=true`),
                    ]);

                    if (!feesResponse.ok) throw new Error('Failed to fetch student fees');

                    const feesData = await feesResponse.json();
                    const paymentsData = paymentsResponse.ok ? await paymentsResponse.json() : [];
                    const lateFeesData = lateFeesResponse.ok ? await lateFeesResponse.json() : [];
                    const busFeesData = busFeesResponse.ok ? await busFeesResponse.json() : [];

                    setStudentFees(feesData);
                    setStudentFeePayments(paymentsData);
                    setStudentLateFees(lateFeesData);

                    // Process the aggregated bus fees data to flatten the structure
                    const processedBusFees = busFeesData.flatMap((studentRecord: any) => {
                        if (studentRecord.studentBusFeesDetails && studentRecord.studentBusFeesDetails.length > 0) {
                            return studentRecord.studentBusFeesDetails.map((busFee: any) => ({
                                ...busFee,
                                // Add student information for context
                                student: studentRecord.student || {
                                    _id: studentRecord.studentId,
                                    firstName: studentRecord.student?.firstName || 'Unknown',
                                    lastName: studentRecord.student?.lastName || 'Student'
                                },
                                // Add class and section info if available
                                classDetails: studentRecord.classDetails,
                                sectionDetails: studentRecord.sectionDetails,
                                transportDetails: studentRecord.transportDetails
                            }));
                        }
                        return [];
                    });

                    setStudentBusFees(processedBusFees);

                    // Group student fees by student
                    const grouped = groupStudentFeesByStudent(feesData, paymentsData, lateFeesData);
                    setGroupedStudentFees(grouped);
                }
            } else if (activeTab === 'structures') {
                const response = await fetch(`/api/fees-structure?academicYearId=${selectedAcademicYear._id}`);
                if (!response.ok) throw new Error('Failed to fetch fees structures');
                const data = await response.json();
                setFeesStructures(data);
            } else if (activeTab === 'feesTypes') {
                const response = await fetch('/api/fees-type');
                if (!response.ok) throw new Error('Failed to fetch fees types');
                const data = await response.json();
                setFeesTypes(data);
            } else if (activeTab === 'discounts') {
                const response = await fetch(`/api/discount-type?academicYearId=${selectedAcademicYear._id}`);
                if (!response.ok) throw new Error('Failed to fetch discount types');
                const data = await response.json();
                setDiscountTypes(data);
            } else if (activeTab === 'lateFees') {
                const response = await fetch(`/api/late-fee?academicYearId=${selectedAcademicYear._id}`);
                if (!response.ok) throw new Error('Failed to fetch late fees');
                const data = await response.json();
                setLateFees(data);
            }
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchClassSections = async () => {
        if (!selectedAcademicYear) return;

        try {

            const [classesResponse, sectionsResponse] = await Promise.all([
                fetch('/api/classes'),
                fetch(`/api/sections?academicYearId=${selectedAcademicYear._id}`)
            ]);

            if (!classesResponse.ok || !sectionsResponse.ok) {
                throw new Error('Failed to fetch classes and sections');
            }

            const classesData = await classesResponse.json();
            const sectionsData = await sectionsResponse.json();

            // Group by classes with their sections
            const groupedClasses: any[] = [];

            sectionsData.forEach((classItem: any) => {
                // Find the corresponding class data
                const classData = classesData.find((c: any) => c._id === classItem._id);
                if (classData && classItem.sectionList) {
                    groupedClasses.push({
                        class: classData,
                        sections: classItem.sectionList
                    });
                }
            });

            // Sort by class number
            groupedClasses.sort((a, b) => a.class.classNumber - b.class.classNumber);

            setClassSections(groupedClasses);
        } catch (error) {
            toast.error('Failed to fetch class sections');
        }
    };

    // Fetch data when student fees screen changes
    useEffect(() => {
        if (activeTab === 'studentFees' && selectedAcademicYear) {
            fetchData();
        }
    }, [studentFeesScreen, selectedClass, selectedSection, activeTab]);

    // Handle academic year change
    const handleYearChange = (year: ISession) => {
        setSelectedAcademicYear(year);
    };

    // Handle payment form submission
    const handlePaymentSubmit = async () => {
        if (!selectedFeeForPayment || !paymentForm.mode || !paymentForm.paidOn) {
            toast.error('Please fill all required fields');
            return;
        }

        // Determine if this is a bus fee or regular fee
        const isBusFee = selectedFeeForPayment.routeDestination !== undefined;

        // Validate amount based on payment type and mode
        let amount: number;
        if (editingPayment) {
            // For editing, validate positive amount and total doesn't exceed fee amount
            if (!paymentForm.amount) {
                toast.error('Please enter payment amount');
                return;
            }
            amount = parseFloat(paymentForm.amount);
            if (amount <= 0) {
                toast.error('Amount must be greater than 0');
                return;
            }

            // Check that total payments don't exceed total fee amount
            const otherPaymentsTotal = isBusFee ? (selectedFeeForPayment.totalPaidFees || 0) - (editingPayment.amount || 0) : (selectedFeeForPayment.totalPaid || 0) - (editingPayment.amount || 0);
            const newTotalPaid = otherPaymentsTotal + amount;
            const maxAllowed = isBusFee
                ? selectedFeeForPayment.amount
                : selectedFeeForPayment.feeTotalAmount + (selectedFeeForPayment.totalLateFees || 0);

            if (newTotalPaid > maxAllowed) {
                const maxForThisPayment = maxAllowed - otherPaymentsTotal;
                toast.error(`Payment amount cannot exceed ₹${maxForThisPayment.toLocaleString()}. Total payments would exceed the fee amount.`);
                return;
            }
        } else {
            // For new payment, validate amount based on payment type
            if (paymentForm.isFullPayment) {
                // Calculate actual outstanding amount
                if (isBusFee) {
                    const totalPaid = selectedFeeForPayment.totalPaid || 0;
                    amount = Math.max(0, selectedFeeForPayment.amount - totalPaid);
                } else {
                    const feeTotalAmount = selectedFeeForPayment.feeTotalAmount || 0;
                    const totalLateFees = selectedFeeForPayment.totalLateFees || 0;
                    const totalPaid = selectedFeeForPayment.totalPaid || 0;
                    amount = Math.max(0, (feeTotalAmount + totalLateFees) - totalPaid);
                }
            } else {
                if (!paymentForm.amount) {
                    toast.error('Please enter payment amount');
                    return;
                }
                amount = parseFloat(paymentForm.amount);

                // Calculate actual remaining amount
                let actualRemaining: number;
                if (isBusFee) {
                    const totalPaid = selectedFeeForPayment.totalPaid || 0;
                    actualRemaining = Math.max(0, selectedFeeForPayment.amount - totalPaid);
                } else {
                    const feeTotalAmount = selectedFeeForPayment.feeTotalAmount || 0;
                    const totalLateFees = selectedFeeForPayment.totalLateFees || 0;
                    const totalPaid = selectedFeeForPayment.totalPaid || 0;
                    actualRemaining = Math.max(0, (feeTotalAmount + totalLateFees) - totalPaid);
                }

                if (amount <= 0 || amount > actualRemaining) {
                    toast.error(`Payment amount cannot exceed remaining amount: ₹${actualRemaining.toLocaleString()}`);
                    return;
                }
            }
        }

        try {
            if (editingPayment) {
                // Update existing payment
                const apiUrl = isBusFee
                    ? `/api/student-bus-fee-payments?id=${editingPayment._id}`
                    : `/api/student-fee-payments?id=${editingPayment._id}`;

                const paymentResponse = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        amount: amount,
                        paidOn: paymentForm.paidOn,
                        mode: paymentForm.mode
                    })
                });

                if (!paymentResponse.ok) {
                    throw new Error('Failed to update payment');
                }

                // After updating payment, recalculate total paid and update fee status
                const feeId = selectedFeeForPayment._id;

                if (isBusFee) {
                    // For bus fees, fetch bus fee payments
                    const paymentsResponse = await fetch(`/api/student-bus-fee-payments?studentBusFeeId=${feeId}`);
                    if (paymentsResponse.ok) {
                        const payments = await paymentsResponse.json();
                        const newTotalPaid = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
                        const newRemainingAmount = selectedFeeForPayment.amount - newTotalPaid;
                        const newStatus = newRemainingAmount <= 0 ? 'paid' : 'pending';

                        // Update student bus fee status
                        const statusResponse = await fetch('/api/student-bus-fees', {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                studentBusFeeId: feeId,
                                status: newStatus
                            })
                        });

                        if (!statusResponse.ok) {
                            toast.error('Failed to update bus fee status after payment edit');
                            // Still refresh data since payment was updated successfully
                            fetchData();
                        } else {
                            // Refresh transport fee cards immediately after successful update
                            fetchData();
                        }
                    } else {
                        // Even if payments fetch fails, refresh data since payment was updated
                        fetchData();
                    }
                } else {
                    // For regular fees, fetch student fee payments
                    const paymentsResponse = await fetch(`/api/student-fee-payments?studentFeeId=${feeId}`);
                    if (paymentsResponse.ok) {
                        const payments = await paymentsResponse.json();
                        const newTotalPaid = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);

                        // Calculate new remaining amount including late fees
                        const feeTotalAmount = selectedFeeForPayment.feeTotalAmount;
                        const totalLateFees = selectedFeeForPayment.totalLateFees || 0;
                        const newRemainingAmount = feeTotalAmount - newTotalPaid + totalLateFees;

                        // Determine new status
                        const newStatus = newRemainingAmount <= 0 ? 'paid' : 'pending';

                        // Update student fee status
                        const statusResponse = await fetch('/api/student-fees', {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                studentFeeId: feeId,
                                status: newStatus
                            })
                        });

                        if (!statusResponse.ok) {
                            toast.error('Failed to update fee status after payment edit');
                            // Still refresh data since payment was updated successfully
                            fetchData();
                        } else {
                            // Refresh fee cards immediately after successful update
                            fetchData();
                        }
                    } else {
                        // Even if payments fetch fails, refresh data since payment was updated
                        fetchData();
                    }
                }

                toast.success('Payment updated successfully');
            } else {
                // Create new payment
                const apiUrl = isBusFee ? '/api/student-bus-fee-payments' : '/api/student-fee-payments';
                const paymentBody = isBusFee
                    ? {
                        studentBusFeeId: selectedFeeForPayment._id,
                        amount: amount,
                        paidOn: paymentForm.paidOn,
                        mode: paymentForm.mode
                    }
                    : {
                        studentFeeId: selectedFeeForPayment._id,
                        feesStructureId: selectedFeeForPayment.feesStructure?._id || selectedFeeForPayment.feesStructureId?._id,
                        amount: amount,
                        paidOn: paymentForm.paidOn,
                        mode: paymentForm.mode
                    };

                const paymentResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(paymentBody)
                });

                if (!paymentResponse.ok) {
                    throw new Error('Failed to create payment');
                }

                toast.success('Payment recorded successfully');
            }

            // For new payments, update fee status
            if (!editingPayment) {
                const newTotalPaid = selectedFeeForPayment.totalPaid + amount;
                let newRemainingAmount: number;
                let newStatus: string;

                if (isBusFee) {
                    newRemainingAmount = selectedFeeForPayment.amount - newTotalPaid;
                    newStatus = newRemainingAmount <= 0 ? 'paid' : 'pending';

                    const statusResponse = await fetch('/api/student-bus-fees', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            studentBusFeeId: selectedFeeForPayment._id,
                            status: newStatus
                        })
                    });

                    if (!statusResponse.ok) {
                        throw new Error('Failed to update bus fee status');
                    }
                } else {
                    newRemainingAmount = selectedFeeForPayment.feeTotalAmount - newTotalPaid + (selectedFeeForPayment.totalLateFees || 0);
                    newStatus = newRemainingAmount <= 0 ? 'paid' : 'pending';

                    const statusResponse = await fetch('/api/student-fees', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            studentFeeId: selectedFeeForPayment._id,
                            status: newStatus
                        })
                    });

                    if (!statusResponse.ok) {
                        throw new Error('Failed to update fee status');
                    }
                }
            }

            // Reset form and close modal
            setPaymentForm({
                amount: '',
                mode: 'UPI',
                paidOn: new Date().toISOString().split('T')[0],
                isFullPayment: false
            });
            setIsPaymentModalOpen(false);
            setSelectedFeeForPayment(null);
            setEditingPayment(null);

            // Refresh data
            fetchData();

        } catch (error) {
            console.error('Error with payment operation:', error);
            toast.error(editingPayment ? 'Failed to update payment' : 'Failed to record payment');
        }
    };

    // Handle fee deletion
    const handleFeeDelete = async (feeId: string) => {

        try {

            // Mark student fee as inactive
            const response = await fetch('/api/student-fees', {
                method: 'DELETE',
                body: JSON.stringify({
                    studentFeeId: feeId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to delete fee');
            }

            toast.success('Fee deleted successfully');

            // Refresh data
            fetchData();

        } catch (error) {
            console.error('Error deleting fee:', error);
            toast.error('Failed to delete fee');
        }
    };

    // Handle bus fee deletion
    const handleBusFeeDelete = async (busFeeId: string) => {
        try {
            const response = await fetch('/api/student-bus-fees', {
                method: 'DELETE',
                body: JSON.stringify({
                    studentBusFeeId: busFeeId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to delete bus fee');
            }

            toast.success('Bus fee deleted successfully');

            // Refresh data
            fetchData();

        } catch (error) {
            console.error('Error deleting bus fee:', error);
            toast.error('Failed to delete bus fee');
        }
    };

    // Get late fees for a specific student fee
    const getLateFeesByStudentFeeId = (studentFeeId: string) => {
        return studentLateFees.filter(lateFee =>
            lateFee.studentFeeId === studentFeeId ||
            (typeof lateFee.studentFeeId === 'object' && lateFee.studentFeeId._id === studentFeeId)
        );
    };

    // Get bus fee payments for a specific student bus fee
    // Note: This function is now deprecated since payments are included directly in bus fee records
    // But kept for backwards compatibility
    const getBusFeePaymentsByBusFeeId = (busFeeId: string) => {
        // Try to find the bus fee in our processed data first (includes payments from API)
        const busFee = studentBusFees.find(fee => fee._id === busFeeId);
        if (busFee && busFee.payments) {
            return busFee.payments;
        }
        
        // Fallback to old method if needed
        return studentBusFeePayments.filter(payment =>
            payment.studentBusFeeId === busFeeId ||
            (typeof payment.studentBusFeeId === 'object' && payment.studentBusFeeId._id === busFeeId)
        );
    };

    // Open payment modal
    const handleEditPayment = (fee: any) => {
        setSelectedFeeForPayment(fee);
        setPaymentForm({
            amount: '',
            mode: 'UPI',
            paidOn: new Date().toISOString().split('T')[0],
            isFullPayment: false
        });
        setIsPaymentModalOpen(true);

        // Close the student fee details modal when payment modal opens
        setIsStudentFeeModalOpen(false);
    };

    // Handle editing existing payment
    const handleEditExistingPayment = (fee: any, payment: any) => {
        setSelectedFeeForPayment(fee);
        setEditingPayment(payment);
        setPaymentForm({
            amount: payment.amount.toString(),
            mode: payment.mode,
            paidOn: new Date(payment.paidOn).toISOString().split('T')[0],
            isFullPayment: false
        });
        setIsPaymentModalOpen(true);

        // Close the student fee details modal when payment modal opens
        setIsStudentFeeModalOpen(false);
    };

    const handleDeleteClick = (itemId: string, type: 'structure' | 'feesType' | 'discount' | 'lateFee') => {
        setSelectedItemId(itemId);
        setDeleteType(type);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedItemId) return;

        try {

            let endpoint = '';
            if (deleteType === 'structure') {
                endpoint = `/api/fees-structure?id=${selectedItemId}`;
            } else if (deleteType === 'feesType') {
                endpoint = `/api/fees-type?id=${selectedItemId}`;
            } else if (deleteType === 'discount') {
                endpoint = `/api/discount-type?id=${selectedItemId}`;
            } else if (deleteType === 'lateFee') {
                endpoint = `/api/late-fee?id=${selectedItemId}`;
            }

            const response = await fetch(endpoint, {
                method: 'DELETE',

            });

            if (!response.ok) throw new Error('Failed to delete item');

            // Remove deleted item from state
            if (deleteType === 'structure') {
                setFeesStructures(prev => prev.filter(item => item._id !== selectedItemId));
            } else if (deleteType === 'feesType') {
                setFeesTypes(prev => prev.filter(item => item._id !== selectedItemId));
            } else if (deleteType === 'discount') {
                setDiscountTypes(prev => prev.filter(item => item._id !== selectedItemId));
            } else if (deleteType === 'lateFee') {
                setLateFees(prev => prev.filter(item => item._id !== selectedItemId));
            }

            toast.success('Item deleted successfully');
        } catch (error) {
            toast.error('Error deleting item');
        }

        setIsDeleteModalOpen(false);
        setSelectedItemId(null);
    };

    const filteredGroupedStudentFees = groupedStudentFees.filter(studentGroup => {
        const student = studentGroup.student;
        const studentName = student ? `${student.firstName} ${student.lastName}`.toLowerCase() : '';

        // Get student initials for fast searching
        const initials = student ?
            `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toLowerCase() : '';
        const initialsWithSpace = student ?
            `${student.firstName.charAt(0)} ${student.lastName.charAt(0)}`.toLowerCase() : '';

        const searchLower = searchTerm.toLowerCase();

        // Check for initials match first (fastest search)
        const matchesInitials = initials.includes(searchLower) ||
            initialsWithSpace.includes(searchLower) ||
            searchLower === initials ||
            searchLower === initialsWithSpace;

        // Then check full name
        const matchesName = studentName.includes(searchLower);

        // Also search in fee details
        const hasMatchingFee = studentGroup.fees.some((fee: any) => {
            const feesStructure = fee.feesStructure || fee.feesStructureId;
            const className = fee.class ? fee.class.classNumber.toString() : (feesStructure?.classId?.classNumber?.toString() || '');
            const sectionName = fee.section ? fee.section.section.toLowerCase() : '';
            const installment = feesStructure ? feesStructure.installment.toLowerCase() : '';

            return className.includes(searchLower) ||
                sectionName.includes(searchLower) ||
                installment.includes(searchLower);
        });

        return matchesInitials || matchesName || hasMatchingFee;
    });

    const filteredClassSections = classSections.filter(classData => {
        const className = classData.class.classNumber.toString();
        const classNameText = `Class ${classData.class.classNumber}`.toLowerCase();
        const sectionNames = classData.sections.map((section: any) => section.section.toLowerCase()).join(' ');

        return classNameText.includes(searchTerm.toLowerCase()) ||
            className.includes(searchTerm.toLowerCase()) ||
            sectionNames.includes(searchTerm.toLowerCase());
    });

    const filteredFeesStructures = feesStructures.filter(structure =>
        structure.feesTypes.some(ft => ft.feesTypeId.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        structure.classId.classNumber.toString().includes(searchTerm.toLowerCase()) ||
        structure.installment.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredFeesTypes = feesTypes.filter(type =>
        type.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredDiscountTypes = discountTypes.filter(discount =>
        discount.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        discount.value.toString().includes(searchTerm.toLowerCase())
    );

    const filteredLateFees = lateFees.filter(lateFee =>
        lateFee.classId?.some((classItem: any) =>
            classItem.classNumber?.toString().includes(searchTerm.toLowerCase())
        ) ||
        lateFee.academicYearId?.startDate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lateFee.academicYearId?.endDate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lateFee.amount?.toString().includes(searchTerm.toLowerCase())
    );

    const tabs = [
        { id: 'studentFees', label: 'Student Fees', icon: <ReceiptIndianRupee className="w-4 h-4" /> },
        { id: 'structures', label: 'Fee Structures', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'feesTypes', label: 'Fee Types', icon: <Settings className="w-4 h-4" /> },
        { id: 'discounts', label: 'Discounts', icon: <BadgePercent className="w-4 h-4" /> },
        { id: 'lateFees', label: 'Late Fees', icon: <History className="w-4 h-4" /> },
    ];

    const FeesStructureCard = ({ structure }: { structure: FeesStructure }) => (
        <div className="bg-base-100 border border-base-content/20 rounded-xl p-4 lg:p-6 hover:bg-base-50 hover:shadow-xl hover:border-blue-300 hover:-translate-y-2 transition-all duration-300 cursor-pointer group overflow-hidden h-full">
            <div className="flex flex-col gap-4 h-full">
                {/* Header */}
                <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="avatar placeholder flex-shrink-0">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl w-12 h-12 lg:w-14 lg:h-14 shadow-lg group-hover:shadow-2xl transition-all duration-300">
                                <span className="text-lg lg:text-xl font-bold">₹</span>
                            </div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base-content text-base lg:text-lg leading-tight group-hover:text-emerald-600 transition-colors duration-300 line-clamp-2">
                                Class {structure.classId.classNumber}
                            </h3>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="badge bg-emerald-100 text-emerald-800 border-emerald-200 text-base lg:text-lg font-bold px-3 py-2">
                            ₹{structure.totalAmount.toLocaleString()}
                        </div>
                        {userRole !== 'STUDENT' && (
                            <div className="flex gap-1">
                                <Link href={`/manage-fees/add?id=${structure._id}&type=structure`}>
                                    <button className="btn btn-ghost btn-xs hover:bg-info/10 transition-colors rounded-lg p-2">
                                        <Edit className="w-4 h-4 text-info" />
                                    </button>
                                </Link>
                                <button
                                    className="btn btn-ghost btn-xs hover:bg-error/10 transition-colors rounded-lg p-2"
                                    onClick={() => handleDeleteClick(structure._id, 'structure')}
                                >
                                    <Trash2 className="w-4 h-4 text-error" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-4 flex-1">
                    {/* Fee Types and Amounts */}
                    <div className="bg-base-50 p-3 lg:p-4 rounded-lg border border-base-content/10">
                        <h4 className="font-semibold text-sm lg:text-base text-base-content mb-3">Fee Types & Amounts</h4>
                        <div className="space-y-2">
                            {structure.feesTypes.map((ft, index) => (
                                <div key={index} className="flex justify-between items-center bg-base-100 rounded-lg px-3 py-2 border border-base-content/10">
                                    <span className="text-sm text-base-content font-medium">{ft.feesTypeId.name}</span>
                                    <span className="text-sm font-bold text-emerald-600">₹{ft.amount.toLocaleString()}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200 mt-3">
                                <span className="text-sm font-bold text-emerald-800">Total Amount:</span>
                                <span className="text-sm font-bold text-emerald-800">₹{structure.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Due Dates */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm lg:text-base text-base-content flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-rose-600" />
                            Due Dates ({structure.installment})
                        </h4>
                        <div className="space-y-2">
                            {structure.dueDates.map((date, index) => (
                                <div key={index} className="flex items-center text-base-content text-sm bg-base-50 rounded-lg px-3 py-2">
                                    <span className="font-medium">Payment {index + 1}:</span>
                                    <span className="ml-2">{formatDate(date)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm lg:text-base text-base-content">Sections</h4>
                        <div className="flex flex-wrap gap-2">
                            {structure.sectionId
                                .sort((a, b) => a.section.localeCompare(b.section))
                                .slice(0, 4)
                                .map((section, index) => (
                                    <span key={section._id} className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                                        {section.section}
                                    </span>
                                ))}
                            {structure.sectionId.length > 4 && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-base-content/10 text-base-content/60 text-sm font-medium">
                                    +{structure.sectionId.length - 4} more
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Academic Year */}
                    <div className="flex items-center justify-between p-3 bg-base-50 rounded-lg border border-base-content/10">
                        <span className="font-medium text-sm text-base-content">Academic Year:</span>
                        <span className="text-sm text-base-content/80">
                            {new Date(structure.academicYearId.startDate).getFullYear()}-{new Date(structure.academicYearId.endDate).getFullYear()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    const FeesTypeCard = ({ feesType }: { feesType: FeesType }) => (
        <div className="border border-base-300 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 hover:bg-base-100/80 hover:shadow-md sm:hover:shadow-xl hover:border-rose-300 hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 bg-base-100 cursor-pointer w-full max-w-full min-w-0 group overflow-hidden">
            <div className="flex flex-col gap-4 w-full">
                <div className="space-y-3">
                    <div className="flex justify-between items-start gap-3 w-full">
                        <div className="flex items-center space-x-3 min-w-0 flex-1 overflow-hidden">
                            <div className="avatar placeholder flex-shrink-0">
                                <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-xl w-10 h-10 sm:w-12 sm:h-12 shadow-lg group-hover:shadow-xl sm:group-hover:shadow-2xl transition-all duration-300">
                                    <span className="text-sm sm:text-sm font-bold">
                                        <Settings className="w-6 h-6" />
                                    </span>
                                </div>
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                                <h3 className="font-semibold text-base-content text-sm sm:text-base md:text-lg leading-tight break-words transition-colors duration-300 truncate">
                                    {feesType.name}
                                </h3>
                            </div>
                        </div>
                        {userRole === 'ADMIN' && (
                            <div className="flex gap-1 sm:gap-2">
                                <button
                                    className="btn btn-ghost btn-xs sm:btn-sm hover:bg-error/10 transition-colors rounded-lg p-2"
                                    onClick={() => handleDeleteClick(feesType._id, 'feesType')}
                                >
                                    <Trash2 className="w-4 h-4 sm:w-4 sm:h-4 text-error" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 rounded-md transition-colors gap-2">
                        <span className="font-medium text-sm sm:text-base text-base-content">Created Date:</span>
                        <div className="flex items-center text-base-content text-sm sm:text-sm">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 text-blue-600" />
                            <span>{formatDate(feesType.createdAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const DiscountTypeCard = ({ discount }: { discount: DiscountType }) => (
        <div className="border border-base-300 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 hover:bg-base-100/80 hover:shadow-md sm:hover:shadow-xl hover:border-rose-300 hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 bg-base-100 cursor-pointer w-full max-w-full min-w-0 group overflow-hidden">
            <div className="flex flex-col gap-4 w-full">
                <div className="space-y-3">
                    <div className="flex justify-between items-start gap-3 w-full">
                        <div className="flex items-center space-x-3 min-w-0 flex-1 overflow-hidden">
                            <div className="avatar placeholder flex-shrink-0">
                                <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-xl w-10 h-10 sm:w-12 sm:h-12 shadow-lg group-hover:shadow-xl sm:group-hover:shadow-2xl group-hover:scale-105 sm:group-hover:scale-110 transition-all duration-300">
                                    <span className="text-sm sm:text-sm font-bold">
                                        {discount.type === 'PERCENTAGE' ? '%' : '₹'}
                                    </span>
                                </div>
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                                <h3 className="font-semibold text-base-content text-sm sm:text-base md:text-lg leading-tight break-words group-hover:text-rose-600 transition-colors duration-300 truncate">
                                    {discount.type} - {discount.value}{discount.type === 'PERCENTAGE' ? '%' : ''}
                                </h3>
                            </div>
                        </div>
                        {userRole === 'ADMIN' && (
                            <div className="flex gap-1 sm:gap-2">
                                <button
                                    className="btn btn-ghost btn-xs sm:btn-sm hover:bg-error/10 transition-colors rounded-lg p-2"
                                    onClick={() => handleDeleteClick(discount._id, 'discount')}
                                >
                                    <Trash2 className="w-4 h-4 sm:w-4 sm:h-4 text-error" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center sm:justify-end">
                        <div className={`badge whitespace-nowrap text-base sm:text-lg font-bold px-4 py-2 ${discount.isActive
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                            }`}>
                            {discount.isActive ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-base-200/50 transition-colors gap-2">
                        <span className="font-medium text-sm sm:text-base text-base-content">Discount Value:</span>
                        <div className="flex items-center text-base-content text-sm sm:text-sm">
                            <BadgePercent className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 text-rose-600" />
                            <span>{discount.value}{discount.type === 'PERCENTAGE' ? '%' : ' ₹'} {discount.type.toLowerCase()}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-base-200/50 transition-colors gap-2">
                        <span className="font-medium text-sm sm:text-base text-base-content">Created Date:</span>
                        <div className="flex items-center text-base-content text-xs sm:text-sm">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 text-rose-600" />
                            <span>{formatDate(discount.createdAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );


    const LateFeeCard = ({ lateFee }: { lateFee: LateFee }) => (
        <div className="border border-base-300 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 hover:bg-base-100/80 hover:shadow-md sm:hover:shadow-xl hover:border-orange-300 hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 bg-base-100 cursor-pointer w-full max-w-full min-w-0 group overflow-hidden">
            <div className="flex flex-col gap-4 w-full">
                <div className="space-y-3">
                    <div className="flex justify-between items-start gap-3 w-full">
                        <div className="flex items-center space-x-3 min-w-0 flex-1 overflow-hidden">
                            <div className="avatar placeholder flex-shrink-0">
                                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl w-10 h-10 sm:w-12 sm:h-12 shadow-lg sm:group-hover:shadow-2xl transition-all duration-300">
                                    <span className="text-sm sm:text-sm font-bold">
                                        <History className="w-6 h-6" />
                                    </span>
                                </div>
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-semibold text-base-content text-sm sm:text-base md:text-lg leading-tight break-words transition-colors duration-300 truncate">
                                        Late Fee
                                    </h3>
                                    {userRole === 'ADMIN' && (
                                        <button
                                            className="btn btn-ghost btn-xs hover:bg-error/10 transition-colors rounded-lg p-2"
                                            onClick={() => handleDeleteClick(lateFee._id, 'lateFee')}
                                        >
                                            <Trash2 className="w-4 h-4 text-error" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Classes Display */}
                <div className="space-y-2">
                    <div className="py-2 px-3 rounded-md transition-colors gap-2">
                        <span className="font-medium text-sm sm:text-base text-base-content mb-2 block">Applied to Classes:</span>
                        <div className="flex flex-wrap gap-2">
                            {lateFee.classId && lateFee.classId.length > 0 && (
                                <>
                                    {lateFee.classId
                                        .sort((a: any, b: any) => a.classNumber - b.classNumber)
                                        .slice(0, 4)
                                        .map((cls: any, index: number) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
                                            >
                                                Class {cls.classNumber}
                                            </span>
                                        ))}

                                    {lateFee.classId.length > 4 && (
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Show remaining classes
                                                lateFee.classId
                                                    .sort((a: any, b: any) => a.classNumber - b.classNumber)
                                                    .slice(4)
                                                    .forEach((cls: any) => {
                                                        const span = document.createElement('span');
                                                        span.className = 'inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mr-2 mb-2';
                                                        span.textContent = `Class ${cls.classNumber}`;
                                                        e.currentTarget.parentElement?.insertBefore(span, e.currentTarget);
                                                    });
                                                e.currentTarget.remove();
                                            }}
                                            className="inline-flex items-center px-3 py-1 rounded-full bg-base-content/10 text-base-content/60 text-sm font-medium hover:bg-base-content/20 cursor-pointer"
                                        >
                                            +{lateFee.classId.length - 4} more
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-3 rounded-md transition-colors gap-2">
                        <span className="font-medium text-sm sm:text-base text-base-content">Created Date:</span>
                        <div className="flex items-center text-base-content text-sm sm:text-sm">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 text-primary" />
                            <span>{formatDate(lateFee.createdAt)}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between px-3 rounded-md transition-colors gap-2">
                        <span className="font-medium text-sm sm:text-base text-base-content">Late Fee Amount:</span>
                        <div className="flex items-center text-base-content text-sm sm:text-sm">
                            <span><span className="text-success">₹</span> {lateFee.amount}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const ClassCard = ({ classData }: { classData: any }) => {
        const handleSectionClick = (section: any) => {
            setSelectedClass(classData.class);
            setSelectedSection(section);
            setStudentFeesScreen('students');
            setSearchTerm(''); // Clear search when navigating to students
        };

        return (
            <div className="border border-base-300 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 hover:bg-base-100/80 hover:shadow-md sm:hover:shadow-xl hover:border-purple-300 hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 bg-base-100 cursor-pointer w-full max-w-full min-w-0 group overflow-hidden">
                <div className="flex flex-col gap-3 w-full">
                    {/* Header */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-start gap-3 w-full">
                            <div className="flex items-center space-x-3 min-w-0 flex-1 overflow-hidden">
                                <div className="avatar placeholder flex-shrink-0">
                                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl w-10 h-10 sm:w-12 sm:h-12 shadow-lg group-hover:shadow-xl sm:group-hover:shadow-2xl transition-all duration-300">
                                        <span className="text-sm sm:text-sm font-bold">
                                            {classData.class.classNumber}
                                        </span>
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                    <h3 className="font-semibold text-base-content text-sm sm:text-base md:text-lg leading-tight break-words group-hover:text-purple-600 transition-colors duration-300 truncate">
                                        Class {classData.class.classNumber}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2 w-full overflow-hidden">
                        <div className="py-2 px-3 rounded-md hover:bg-base-200/50 transition-colors w-full overflow-hidden">
                            <div className="flex flex-wrap gap-2 w-full">
                                {classData.sections
                                    .sort((a: any, b: any) => a.section.localeCompare(b.section))
                                    .map((section: any) => (
                                        <Button
                                            outline
                                            variant="neutral"
                                            key={section._id}
                                            onClick={() => handleSectionClick(section)}
                                            className="btn btn-sm btn-outline btn-primary hover:btn-primary transition-all duration-300 px-3 py-1 flex-shrink-0"
                                        >
                                            <span className="text-sm font-bold whitespace-nowrap">
                                                Section {section.section}
                                            </span>
                                        </Button>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const GroupedStudentFeeCard = ({ studentGroup }: { studentGroup: any }) => {
        const { student, fees, hasMultiple } = studentGroup;
        const primaryFee = fees[0]; // Show the first fee (pending priority)
        const feesStructure = primaryFee.feesStructure || primaryFee.feesStructureId;
        const isOverdue = primaryFee.status === 'overdue';
        const isPaid = primaryFee.status === 'paid';
        const isPending = primaryFee.status === 'pending';
        const isNotStarted = primaryFee.status === 'not_started';

        const handleCardClick = () => {
            setSelectedStudent({
                ...student,
                class: primaryFee.class,
                section: primaryFee.section
            });
            setSelectedStudentFees(fees);
            setIsStudentFeeModalOpen(true);
        };

        return (
            <div
                className="relative cursor-pointer group mx-4 xs:mt-3 sm:mt-4"
                onClick={handleCardClick}
            >
                {/* Book pages effect */}
                {hasMultiple && (
                    <>
                        {/* Page 4 (bottom page) */}
                        <div className="absolute inset-0 bg-amber-50 dark:bg-base-200 border border-gray-300 dark:border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl transform translate-x-2 xs:translate-x-3 sm:translate-x-4 md:translate-x-4 translate-y-2 xs:translate-y-3 sm:translate-y-4 md:translate-y-4 opacity-30 shadow-sm group-hover:translate-x-3 group-hover:translate-y-3 xs:group-hover:translate-x-4 xs:group-hover:translate-y-4 sm:group-hover:translate-x-5 sm:group-hover:translate-y-5 group-hover:opacity-20 transition-all duration-300"></div>

                        {/* Page 3 */}
                        <div className="absolute inset-0 bg-amber-50 dark:bg-base-200 border border-gray-300 dark:border-base-content/30 rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl transform translate-x-1.5 xs:translate-x-2 sm:translate-x-3 md:translate-x-3 translate-y-1.5 xs:translate-y-2 sm:translate-y-3 md:translate-y-3 opacity-50 shadow-sm group-hover:translate-x-2 group-hover:translate-y-2 xs:group-hover:translate-x-3 xs:group-hover:translate-y-3 sm:group-hover:translate-x-4 sm:group-hover:translate-y-4 group-hover:opacity-35 transition-all duration-300"></div>

                        {/* Page 2 */}
                        <div className="absolute inset-0 bg-amber-50 dark:bg-base-200 border border-gray-300 dark:border-base-content/40 rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl transform translate-x-1 xs:translate-x-1 sm:translate-x-2 md:translate-x-2 translate-y-1 xs:translate-y-1 sm:translate-y-2 md:translate-y-2 opacity-70 shadow-md group-hover:translate-x-1.5 group-hover:translate-y-1.5 xs:group-hover:translate-x-2 xs:group-hover:translate-y-2 sm:group-hover:translate-x-3 sm:group-hover:translate-y-3 group-hover:opacity-50 transition-all duration-300"></div>

                        {/* Page 1 (second from top) */}
                        <div className="absolute inset-0 bg-base-300 dark:bg-base-200 border border-base-content/20 dark:border-base-content/50 rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl transform translate-x-0.5 xs:translate-x-0.5 sm:translate-x-1 md:translate-x-1 translate-y-0.5 xs:translate-y-0.5 sm:translate-y-1 md:translate-y-1 opacity-100 shadow-md group-hover:translate-x-1 group-hover:translate-y-1 xs:group-hover:translate-x-1 xs:group-hover:translate-y-1 sm:group-hover:translate-x-2 sm:group-hover:translate-y-2 group-hover:opacity-75 transition-all duration-300"></div>
                    </>
                )}

                <div className="relative overflow-hidden rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl shadow-lg transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-2 bg-base-100 border border-base-content/20 w-full max-w-full min-w-0 z-50 group/card">
                    <div className="p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 w-full overflow-hidden">
                        {/* Fee Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 xs:gap-3 sm:gap-4 mb-3 xs:mb-4 sm:mb-5 w-full overflow-hidden">
                            <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 md:gap-5 min-w-0 flex-1 overflow-hidden">
                                <div className="avatar placeholder flex-shrink-0">
                                    <div className="bg-primary text-primary-content rounded-full w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 transition-all duration-300">
                                        <span className="text-xs xs:text-sm sm:text-base md:text-lg font-bold">
                                            {student ? student.firstName.charAt(0).toUpperCase() : 'S'} {student ? student.lastName.charAt(0).toUpperCase() : 'S'}
                                        </span>
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                    <h3 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-base-content leading-tight font-bold truncate transition-colors duration-300">
                                        {student ? `${student.firstName} ${student.lastName}` : 'Unknown Student'}
                                    </h3>
                                    {feesStructure && (
                                        <div className="flex items-center gap-1 xs:gap-2 mt-1 xs:mt-2 overflow-hidden">
                                            <span className="text-xs xs:text-xs sm:text-sm md:text-base text-base-content/70 truncate">
                                                Due Date: {formatDate(primaryFee.dueDate)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 xs:gap-2 flex-shrink-0 w-full sm:w-auto">
                                <div className={`badge badge-sm xs:badge-md sm:badge-lg font-bold px-2 xs:px-3 sm:px-4 py-1 xs:py-1 sm:py-2 text-xs xs:text-xs sm:text-sm md:text-base transition-all duration-300 ${isPaid
                                    ? 'bg-success/10 text-success border-success/50 group-hover/card:bg-success/20'
                                    : isOverdue
                                        ? 'bg-error/10 text-error border-error/50 group-hover/card:bg-error/20'
                                        : isNotStarted
                                            ? 'bg-primary/10 text-primary border-primary/50 group-hover/card:bg-primary/20'
                                            : isPending
                                                ? 'bg-yellow-600/20 border-yellow-600 group-hover/card:bg-yellow-600/30'
                                                : 'bg-base-content/10 text-base-content border-base-content/50 group-hover/card:bg-base-content/20'
                                    }`}>
                                    {isPending && (
                                        <ClockAlert className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-yellow-600 flex-shrink-0" />
                                    )}
                                    {isOverdue && (
                                        <ClockAlert className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-error flex-shrink-0" />
                                    )}
                                    {isPaid && (
                                        <CheckCircle className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-success flex-shrink-0" />
                                    )}
                                    {isNotStarted && (
                                        <CirclePause className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-primary flex-shrink-0" />
                                    )}
                                    <span className="text-base-content font-medium truncate">
                                        {isPaid ? 'Paid' : isOverdue ? 'Overdue' : isPending ? 'Pending' : 'Not Started'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Fee Amounts - Enhanced Design */}
                        <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 xs:gap-3 sm:gap-4 mb-3 xs:mb-4 sm:mb-5">
                            <div className="bg-primary/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-primary/50 text-center transition-all duration-300 group-hover/card:bg-primary/20 group-hover/card:shadow-md group-hover/card:border-primary">
                                <div className="text-xs xs:text-xs sm:text-sm text-base-content font-medium mb-1 truncate">Total Amount</div>
                                <div className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content truncate">
                                    ₹{primaryFee.feeTotalAmount?.toLocaleString() || '0'}
                                </div>
                            </div>
                            <div className="bg-success/20 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-success/50 text-center transition-all duration-300 group-hover/card:bg-success/30 group-hover/card:shadow-md group-hover/card:border-success">
                                <div className="text-xs xs:text-xs sm:text-sm text-base-content font-medium mb-1 truncate">Paid Amount</div>
                                <div className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content truncate">
                                    ₹{primaryFee.totalPaid?.toLocaleString() || '0'}
                                </div>
                            </div>
                            <div className={`rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border text-center transition-all duration-300 group-hover/card:shadow-md ${(() => {
                                // Calculate total outstanding for all fees of this student
                                const totalOutstanding = fees.reduce((sum: number, fee: any) => {
                                    const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                    const totalPaid = fee.totalPaid || 0;
                                    const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                    return sum + actualOutstanding;
                                }, 0);

                                return totalOutstanding > 0
                                    ? 'bg-error/20 border-error/50 group-hover/card:bg-error/30 group-hover/card:border-error'
                                    : 'bg-success/20 border-success/50 group-hover/card:bg-success/30 group-hover/card:border-success';
                            })()}`}>
                                <div className="text-base-content text-xs xs:text-xs sm:text-sm font-medium mb-1 truncate">
                                    Outstanding
                                </div>
                                <div className="text-base-content text-sm xs:text-base sm:text-lg md:text-xl font-bold truncate">
                                    {(() => {
                                        // Calculate total outstanding for all fees of this student
                                        const totalOutstanding = fees.reduce((sum: number, fee: any) => {
                                            const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                            const totalPaid = fee.totalPaid || 0;
                                            const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                            return sum + actualOutstanding;
                                        }, 0);

                                        return totalOutstanding > 0
                                            ? `₹${totalOutstanding.toLocaleString()}`
                                            : '₹0';
                                    })()}
                                </div>
                                {(() => {
                                    // Show late fees info only if there are outstanding amounts
                                    const totalOutstanding = fees.reduce((sum: number, fee: any) => {
                                        const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                        const totalPaid = fee.totalPaid || 0;
                                        const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                        return sum + actualOutstanding;
                                    }, 0);

                                    const totalLateFees = fees.reduce((sum: number, fee: any) => sum + (fee.totalLateFees || 0), 0);

                                    if (totalOutstanding > 0 && totalLateFees > 0) {
                                        return (
                                            <div className="text-xs text-base-content/60 mt-1">
                                                +₹{totalLateFees.toLocaleString()} late fees
                                            </div>
                                        );
                                    }

                                    if (totalOutstanding === 0 && totalLateFees > 0) {
                                        return (
                                            <div className="text-xs text-base-content/80 mt-1">
                                                All fees & late fees paid
                                            </div>
                                        );
                                    }

                                    if (totalOutstanding === 0) {
                                        return (
                                            <div className="text-xs text-success/80 mt-1">
                                                All payments completed
                                            </div>
                                        );
                                    }

                                    return null;
                                })()}
                            </div>
                        </div>

                        {/* Additional Details */}
                        {feesStructure && (
                            <div className="bg-base-100 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-base-content/30 transition-all duration-300 group-hover/card:bg-base-50 group-hover/card:shadow-md group-hover/card:border-base-content/40">
                                <div className="space-y-1 xs:space-y-2">
                                    {/* <div className="flex justify-between items-center gap-2 min-w-0">
                                        <span className="text-xs xs:text-xs sm:text-sm text-base-content font-medium truncate">Installment:</span>
                                        <span className="text-xs xs:text-xs sm:text-sm text-base-content/70 truncate flex-shrink-0">{feesStructure.installment}</span>
                                    </div> */}

                                    {/* Installment Payment Status */}
                                    {(() => {
                                        // Calculate installment payment status
                                        const totalFees = fees.length;
                                        const paidFees = fees.filter((fee: any) => fee.status === 'paid').length;
                                        const remainingFees = totalFees - paidFees;

                                        return (
                                            <div className="flex justify-between items-center gap-2 min-w-0 mt-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs xs:text-xs sm:text-sm text-success font-medium truncate">Paid Installment:</span>
                                                    <span className="text-xs xs:text-xs sm:text-sm text-success font-bold truncate flex-shrink-0">{paidFees}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs xs:text-xs sm:text-sm text-base-content/70 font-medium truncate">Remaining Installment:</span>
                                                    <span className="text-xs xs:text-xs sm:text-sm text-base-content/70 font-bold truncate flex-shrink-0">{remainingFees}</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const StudentFeeCard = ({ fee }: { fee: StudentFee }) => {
        const student = fee.student || fee.studentId;
        const feesStructure = fee.feesStructure || fee.feesStructureId;
        const isOverdue = fee.status === 'overdue';
        const isPaid = fee.status === 'paid';
        const isPending = fee.status === 'pending';
        const isNotStarted = fee.status === 'not_started';

        return (
            <div className="border border-base-300 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 hover:bg-base-100/80 hover:shadow-md sm:hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 bg-base-100 cursor-pointer w-full max-w-full min-w-0 group overflow-hidden">
                <div className="flex flex-col gap-3 w-full">
                    {/* Header */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-start gap-3 w-full">
                            <div className="flex items-center justify-between min-w-0 flex-1 overflow-hidden">
                                <div className="flex items-center space-x-3 min-w-0 flex-1 overflow-hidden">
                                    <div className="avatar placeholder flex-shrink-0">
                                        <div className={`bg-primary/70 text-white rounded-xl w-12 h-12 sm:w-12 sm:h-12 shadow-lg group-hover:shadow-xl sm:group-hover:shadow-2xl group-hover:scale-105 sm:group-hover:scale-110 transition-all duration-300`}>
                                            <span className="text-sm sm:text-sm font-bold">
                                                {student ? student.firstName.charAt(0).toUpperCase() : 'S'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <h3 className="font-semibold text-base-content text-sm sm:text-base md:text-lg leading-tight break-words group-hover:text-primary transition-colors duration-300 truncate">
                                            {student ? `${student.firstName} ${student.lastName}` : 'Unknown Student'}
                                        </h3>
                                    </div>
                                </div>
                                <div className={`badge whitespace-nowrap text-sm sm:text-base font-bold px-3 py-2.5 ${isPaid
                                    ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
                                    : isOverdue
                                        ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
                                        : isPending
                                            ? 'bg-yellow-100 text-yellow-800 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-600'
                                            : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700'
                                    }`}>
                                    {isPaid ? 'Paid' : isOverdue ? 'Overdue' : isPending ? 'Pending' : 'Not Started'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        {/* Fee Amounts */}
                        <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 xs:gap-3 p-2 xs:p-3 rounded-md xs:rounded-lg bg-base-100/30 dark:bg-base-300/20">
                            <div className="text-center xs:text-center">
                                <div className="text-xs text-base-content">Total</div>
                                <div className="text-sm xs:text-base font-semibold text-base-content">₹{fee.feeTotalAmount?.toLocaleString() || '0'}</div>
                            </div>
                            <div className="text-center xs:text-center">
                                <div className="text-xs text-base-content">Paid</div>
                                <div className="text-sm xs:text-base font-semibold text-green-600 dark:text-green-400">₹{fee.totalPaid?.toLocaleString() || '0'}</div>
                            </div>
                            <div className="text-center xs:text-center">
                                <div className="text-xs text-base-content">Remaining</div>
                                <div className={`text-sm xs:text-base font-semibold ${fee.remainingAmount > 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-green-600 dark:text-green-400'
                                    }`}>
                                    ₹{fee.remainingAmount?.toLocaleString() || '0'}
                                </div>
                            </div>
                        </div>

                        {userRole === 'ADMIN' || userRole === 'STAFF' ? (
                            <>
                            </>
                        ) : (
                            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-base-200/50 transition-colors gap-2">
                                <span className="font-medium text-sm sm:text-base text-base-content">Your Class:</span>
                                <span className="text-sm text-base-content/70">
                                    Class {feesStructure?.classId?.classNumber || fee.class?.classNumber}
                                </span>
                            </div>
                        )}

                        {fee.dueDate && (
                            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-base-200/50 transition-colors gap-2">
                                <span className="font-medium text-sm sm:text-base text-base-content">Due Date:</span>
                                <div className="flex items-center text-base-content text-sm sm:text-sm">
                                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 text-blue-600 dark:text-blue-400" />
                                    <span>{formatDate(fee.dueDate)}</span>
                                </div>
                            </div>
                        )}

                        {feesStructure?.installment && (
                            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-base-200/50 transition-colors gap-2">
                                <span className="font-medium text-sm sm:text-base text-base-content">Installment:</span>
                                <span className="text-sm text-base-content/70">
                                    {feesStructure.installment}
                                </span>
                            </div>
                        )}

                        {fee.discountTypeId && (
                            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-base-200/50 transition-colors gap-2">
                                <span className="font-medium text-sm sm:text-base text-base-content">Discount Applied:</span>
                                <div className="flex items-center text-base-content text-sm sm:text-sm">
                                    <BadgePercent className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 text-green-600 dark:text-green-400" />
                                    <span>{fee.discountTypeId.value}{fee.discountTypeId.type === 'PERCENTAGE' ? '%' : ' ₹'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };



    const getAddButtonLink = () => {
        switch (activeTab) {
            case 'studentFees':
                return '/manage-fees/add?type=studentFee';
            case 'structures':
                return '/manage-fees/add?type=structure';
            case 'feesTypes':
                return '/manage-fees/add?type=feesType';
            case 'discounts':
                return '/manage-fees/add?type=discount';
            case 'lateFees':
                return '/manage-fees/add?type=lateFee';
            default:
                return '/manage-fees/add';
        }
    };

    if (isLoadingAcademicYears) {
        return (
            <div className="flex flex-col w-full min-h-[calc(100vh-64px)] p-2 sm:p-3 lg:p-4 xl:p-6 bg-base-100">
                <div className="card bg-base-200 shadow-xl flex-1 w-full">
                    <div className="card-body flex items-center justify-center p-8 sm:p-12">
                        <div className="text-center">
                            <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                            <p className="text-sm sm:text-base text-base-content">Loading fee management...</p>
                            <p className="text-xs sm:text-sm text-base-content/60 mt-2">Please wait while we fetch your academic data</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isLoadingAcademicYears && academicYears.length === 0) {
        return (
            <div className="flex flex-col w-full min-h-[calc(100vh-64px)] p-2 sm:p-3 lg:p-4 xl:p-6 bg-base-100">
                <div className="card bg-base-200 shadow-xl flex-1 w-full">
                    <div className="card-body flex items-center justify-center p-8 sm:p-12">
                        <div className="text-center">
                            <div className="text-4xl sm:text-6xl mb-4">⚙️</div>
                            <h3 className="text-lg sm:text-xl font-semibold text-base-content mb-3">Account Setup Required</h3>
                            <p className="text-sm sm:text-base text-base-content/60 max-w-md mx-auto">
                                Please set up this account first by creating academic years before managing fees.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!selectedAcademicYear) {
        return (
            <div className="flex flex-col w-full min-h-[calc(100vh-64px)] p-2 sm:p-3 lg:p-4 xl:p-6 bg-base-100">
                <div className="card bg-base-200 shadow-xl flex-1 w-full">
                    <div className="card-body flex items-center justify-center p-8 sm:p-12">
                        <div className="text-center">
                            <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                            <p className="text-sm sm:text-base text-base-content">Loading fee management...</p>
                            <p className="text-xs sm:text-sm text-base-content/60 mt-2">Please wait while we fetch your academic data</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Student Fee Details Modal
    const StudentFeeDetailsModal = () => {
        if (!isStudentFeeModalOpen) return null;

        // Check if student has bus taken enabled
        const hasBusTransport = selectedStudentFees.some((fee: any) => fee.isBusTaken === true);

        return (
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
                        setIsStudentFeeModalOpen(false);
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
                                                      lg:w-16 lg:h-16 xl:w-18 xl:h-18 shadow-lg">
                                            <span className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold">
                                                {selectedStudent?.firstName?.charAt(0).toUpperCase() || 'S'} {selectedStudent?.lastName?.charAt(0).toUpperCase() || 'S'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <h2 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl 
                                                     font-bold text-base-content leading-tight break-words">
                                            {`${selectedStudent.firstName} ${selectedStudent.lastName}`}{userRole !== 'STUDENT' && ` - ${selectedStudent.class?.classNumber} ${selectedStudent.section?.section}`}
                                        </h2>
                                        <div className="flex flex-wrap gap-1 xs:gap-2 mt-1 xs:mt-2 overflow-hidden">
                                            <div className="badge badge-xs xs:badge-sm sm:badge-md md:badge-lg 
                                                          px-1 xs:px-2 sm:px-3 py-0.5 xs:py-1 
                                                          bg-primary/30 text-primary border-primary/80">
                                                <span className="text-base-content text-[10px] xs:text-xs sm:text-sm md:text-base">
                                                    {selectedStudentFees.filter((fee: any) => {
                                                        const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                                        const totalPaid = fee.totalPaid || 0;
                                                        const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                                        return actualOutstanding > 0;
                                                    }).length} fee remaining
                                                </span>
                                            </div>
                                            {(() => {
                                                const totalOutstanding = selectedStudentFees
                                                    .reduce((sum: number, fee: any) => {
                                                        const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                                        const totalPaid = fee.totalPaid || 0;
                                                        const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                                        return sum + actualOutstanding;
                                                    }, 0);
                                                if (totalOutstanding > 0) {
                                                    return (
                                                        <div className="badge badge-xs xs:badge-sm sm:badge-md md:badge-lg lg:badge-xl 
                                                                       bg-error/30 text-error border-error/80 
                                                                       px-1 xs:px-2 sm:px-3 md:px-4 py-0.5 xs:py-1 sm:py-2">
                                                            <span className="text-base-content text-[10px] xs:text-xs sm:text-sm md:text-base">
                                                                Outstanding: ₹{totalOutstanding.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="badge badge-success badge-xs xs:badge-sm sm:badge-md md:badge-lg 
                                                                   px-1 xs:px-2 sm:px-3 py-0.5 xs:py-1">
                                                        <span className="text-[10px] xs:text-xs sm:text-sm md:text-base">All fees paid</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    outline
                                    variant='error'
                                    onClick={() => setIsStudentFeeModalOpen(false)}
                                >
                                    <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold">×</span>
                                </Button>
                            </div>
                        </div>

                        {/* Scrollable Fee Entries Content */}
                        <div className="flex-1 overflow-y-auto w-full bg-base-100">
                            {hasBusTransport ? (
                                <div className="p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7">
                                    <Tabs value={activeModalTab} onValueChange={(value) => setActiveModalTab(value as 'tuition' | 'transport')} className="w-full">
                                        <TabsList className="relative grid w-full grid-cols-2 bg-base-300 backdrop-blur-sm max-w-md mx-auto mb-4 sm:mb-6 rounded-lg sm:rounded-xl p-1 shadow-md border border-base-content/30">
                                            {/* Sliding Background Indicator */}
                                            <div
                                                className={`absolute top-1 bottom-1 rounded-md sm:rounded-lg bg-base-100 shadow-md transition-all duration-300 ease-in-out ${activeModalTab === 'tuition'
                                                    ? 'left-1 w-1/2 mr-1'
                                                    : 'left-[calc(49%)] w-1/2 mr-1'
                                                    }`}
                                            />

                                            <TabsTrigger
                                                value="tuition"
                                                className={`relative flex items-center justify-center rounded-md sm:rounded-lg transition-all duration-300 ease-in-out px-2 sm:px-4 py-2 sm:py-3 min-w-0 z-10 ${activeModalTab === 'tuition'
                                                    ? 'text-success font-semibold'
                                                    : 'text-base-content/80 hover:text-base-content font-medium'
                                                    }`}
                                            >
                                                <BookOpenText className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                                <span className="text-xs sm:text-sm font-medium truncate">
                                                    Tuition Fees
                                                </span>
                                            </TabsTrigger>

                                            <TabsTrigger
                                                value="transport"
                                                className={`relative flex items-center justify-center rounded-md sm:rounded-lg transition-all duration-300 ease-in-out px-2 sm:px-4 py-2 sm:py-3 min-w-0 z-10 ${activeModalTab === 'transport'
                                                    ? 'text-warning font-semibold'
                                                    : 'text-base-content/80 hover:text-base-content font-medium'
                                                    }`}
                                            >
                                                <Truck className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                                <span className="text-xs sm:text-sm font-medium truncate">
                                                    Transport Fees
                                                </span>
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="tuition" className="mt-0 w-full overflow-hidden">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 
                                                          gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7 
                                                          w-full max-w-full items-start pt-4 sm:pt-6 md:pt-8 px-1 sm:px-2 md:px-4">

                                                {selectedStudentFees
                                                    .sort((a: any, b: any) => {
                                                        // Sort by actual outstanding amount (total required - total paid) priority, then by due date
                                                        const aRequired = (a.feeTotalAmount || 0) + (a.totalLateFees || 0);
                                                        const aPaid = a.totalPaid || 0;
                                                        const aOutstanding = Math.max(0, aRequired - aPaid);

                                                        const bRequired = (b.feeTotalAmount || 0) + (b.totalLateFees || 0);
                                                        const bPaid = b.totalPaid || 0;
                                                        const bOutstanding = Math.max(0, bRequired - bPaid);

                                                        // If one has outstanding and other doesn't, prioritize outstanding
                                                        if (aOutstanding > 0 && bOutstanding <= 0) return -1;
                                                        if (aOutstanding <= 0 && bOutstanding > 0) return 1;

                                                        // If both have same outstanding status, sort by due date
                                                        const aDate = new Date(a.dueDate);
                                                        const bDate = new Date(b.dueDate);
                                                        return aDate.getTime() - bDate.getTime();
                                                    })
                                                    .map((fee: any, index) => {
                                                        const feesStructure = fee.feesStructure || fee.feesStructureId;
                                                        const isOverdue = fee.status === 'overdue';
                                                        const isPaid = fee.status === 'paid';
                                                        const isPending = fee.status === 'pending';
                                                        const isNotStarted = fee.status === 'not_started';

                                                        return (
                                                            <div key={fee._id} className={`relative overflow-hidden rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 bg-base-100 hover:bg-base-100/80 border border-base-content/60 hover:border-base-content/80 w-full max-w-full min-w-0 group/modal-card`}>
                                                                {/* Status indicator bar */}
                                                                <div className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300 ${isPaid
                                                                    ? 'bg-success'
                                                                    : isOverdue
                                                                        ? 'bg-error'
                                                                        : isPending
                                                                            ? 'bg-yellow-600'
                                                                            : 'bg-primary'
                                                                    }`}></div>

                                                                <div className="p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 w-full overflow-hidden">
                                                                    {/* Fee Header */}
                                                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 xs:gap-3 sm:gap-4 mb-3 xs:mb-4 sm:mb-5 w-full overflow-hidden">
                                                                        <div className="min-w-0 flex-1 overflow-hidden">
                                                                            <div className="flex items-center gap-1 xs:gap-2 mb-1 xs:mb-2 overflow-hidden">
                                                                                <h3 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-base-content leading-tight font-bold transition-colors duration-300">
                                                                                    Due Date: {formatDate(fee.dueDate)}
                                                                                </h3>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col items-end gap-1 xs:gap-2 flex-shrink-0 w-full sm:w-auto">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={`badge badge-sm xs:badge-md sm:badge-lg font-bold px-2 xs:px-3 sm:px-4 py-1 xs:py-1 sm:py-2 text-xs xs:text-xs sm:text-sm md:text-base transition-all duration-300 ${isPaid
                                                                                    ? 'bg-success/10 text-success border-success/50 group-hover/modal-card:bg-success/20'
                                                                                    : isOverdue
                                                                                        ? 'bg-error/10 text-error border-error/50 group-hover/modal-card:bg-error/20'
                                                                                        : isNotStarted
                                                                                            ? 'bg-primary/10 text-primary border-primary/50 group-hover/modal-card:bg-primary/20'
                                                                                            : isPending
                                                                                                ? 'bg-yellow-600/20 border-yellow-600 group-hover/modal-card:bg-yellow-600/30'
                                                                                                : 'bg-base-content/10 text-base-content border-base-content/50 group-hover/modal-card:bg-base-content/20'

                                                                                    }`}>
                                                                                    {isPending && (
                                                                                        <ClockAlert className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-yellow-600 flex-shrink-0" />
                                                                                    )}
                                                                                    {isOverdue && (
                                                                                        <ClockAlert className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-error flex-shrink-0" />
                                                                                    )}
                                                                                    {isPaid && (
                                                                                        <CheckCircle className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-success flex-shrink-0" />
                                                                                    )}
                                                                                    {isNotStarted && (
                                                                                        <CirclePause className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-primary flex-shrink-0" />
                                                                                    )}

                                                                                    <span className="text-base-content font-medium">{isPaid ? 'Paid' : isOverdue ? 'Overdue' : isPending ? 'Pending' : 'Not Started'}</span>
                                                                                </div>

                                                                                {/* Action Buttons - Only show for admin/staff and non-paid fees */}
                                                                                {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                                                                                    <div className="flex gap-1">
                                                                                        {(() => {
                                                                                            const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                                                                            const totalPaid = fee.totalPaid || 0;
                                                                                            const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                                                                            return actualOutstanding > 0;
                                                                                        })() && (
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        handleEditPayment(fee);
                                                                                                    }}
                                                                                                    className="btn btn-xs btn-ghost hover:bg-primary/20 transition-colors rounded-lg px-2"
                                                                                                    title="Record Payment"
                                                                                                >
                                                                                                    <Edit className="w-5 h-5 text-primary" />
                                                                                                </button>
                                                                                            )}
                                                                                        <button
                                                                                            onClick={() => handleFeeDelete(fee._id)}
                                                                                            className="btn btn-xs btn-ghost hover:bg-error/20 transition-colors rounded-lg px-2"
                                                                                            title="Delete Fee"
                                                                                        >
                                                                                            <Trash2 className="w-5 h-5 text-error" />
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Fee Amounts - Enhanced Design */}
                                                                    <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 xs:gap-3 sm:gap-4 mb-3 xs:mb-4 sm:mb-5">
                                                                        <div className="bg-primary/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-primary/50 text-center transition-all duration-300 group-hover/modal-card:bg-primary/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-primary">
                                                                            <div className="text-xs xs:text-xs sm:text-sm text-base-content font-medium mb-1">Total Amount</div>
                                                                            <div className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content truncate">
                                                                                ₹{fee.feeTotalAmount?.toLocaleString() || '0'}
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-success/20 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-success/50 text-center transition-all duration-300 group-hover/modal-card:bg-success/30 group-hover/modal-card:shadow-md group-hover/modal-card:border-success">
                                                                            <div className="text-xs xs:text-xs sm:text-sm text-base-content font-medium mb-1">Paid Amount</div>
                                                                            <div className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content truncate">
                                                                                ₹{fee.totalPaid?.toLocaleString() || '0'}
                                                                            </div>
                                                                        </div>
                                                                        <div className={`rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border text-center transition-all duration-300 group-hover/modal-card:shadow-md ${(() => {
                                                                            const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                                                            const totalPaid = fee.totalPaid || 0;
                                                                            const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                                                            return actualOutstanding > 0
                                                                                ? 'bg-error/20 border-error/50 group-hover/modal-card:bg-error/30 group-hover/modal-card:border-error'
                                                                                : 'bg-success/20 border-success/50 group-hover/modal-card:bg-success/30 group-hover/modal-card:border-success';
                                                                        })()}`}>
                                                                            <div className="text-base-content text-xs xs:text-xs sm:text-sm font-medium mb-1">
                                                                                Outstanding
                                                                            </div>
                                                                            <div className="text-base-content text-sm xs:text-base sm:text-lg md:text-xl font-bold truncate">
                                                                                {(() => {
                                                                                    const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                                                                    const totalPaid = fee.totalPaid || 0;
                                                                                    const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                                                                    return actualOutstanding > 0 ? `₹${actualOutstanding.toLocaleString()}` : '₹0';
                                                                                })()}
                                                                            </div>
                                                                            {fee.totalLateFees > 0 && (
                                                                                <div className="text-xs text-base-content/80 mt-1">
                                                                                    {(() => {
                                                                                        const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                                                                        const totalPaid = fee.totalPaid || 0;
                                                                                        const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                                                                        if (actualOutstanding > 0) {
                                                                                            return `(₹${(fee.feeTotalAmount || 0).toLocaleString()} + ₹${fee.totalLateFees?.toLocaleString()} late fees - ₹${totalPaid.toLocaleString()} paid)`;
                                                                                        } else {
                                                                                            return `All fees and late fees paid`;
                                                                                        }
                                                                                    })()}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Payment History */}
                                                                    {fee.payments && fee.payments.length > 0 && (
                                                                        <div className="bg-base-100 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-base-content/30 transition-all duration-300 group-hover/modal-card:bg-base-50 group-hover/modal-card:shadow-md group-hover/modal-card:border-base-content/40">
                                                                            <h4 className="font-bold text-xs xs:text-sm sm:text-base md:text-lg text-base-content mb-2 xs:mb-3 flex items-center gap-2 truncate">
                                                                                <span className="truncate">Payment History</span>
                                                                            </h4>
                                                                            <div className="space-y-1 xs:space-y-2">
                                                                                {fee.payments.map((payment: any, paymentIndex: number) => (
                                                                                    <div key={paymentIndex} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 xs:gap-2 sm:gap-3 p-2 xs:p-3 bg-success/5 rounded-md xs:rounded-lg border border-success/20 transition-all duration-300 hover:bg-success/10 hover:border-success/20">
                                                                                        <div className="min-w-0 flex-1 overflow-hidden">
                                                                                            <div className="flex items-center gap-1 xs:gap-2 mb-1 overflow-hidden">
                                                                                                <span className="font-bold text-base-content text-sm xs:text-sm sm:text-base truncate">
                                                                                                    ₹{payment.amount?.toLocaleString()}
                                                                                                </span>
                                                                                                <span className="badge badge-primary badge-sm xs:badge-md text-base-100 flex-shrink-0">
                                                                                                    {payment.mode}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1 xs:gap-2 text-xs xs:text-sm text-base-content/70 flex-shrink-0">
                                                                                            <Calendar className="w-3 h-3 flex-shrink-0" />
                                                                                            <span className="text-base-content truncate">{formatDate(payment.paidOn)}</span>
                                                                                            {/* Edit button for payments - only show for admin/staff */}
                                                                                            {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        handleEditExistingPayment(fee, payment);
                                                                                                    }}
                                                                                                    className="btn btn-xs btn-ghost hover:bg-primary/20 transition-colors rounded-lg px-1 ml-1"
                                                                                                    title="Edit Payment"
                                                                                                >
                                                                                                    <Edit className="w-4 h-4 text-primary" />
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                {/* Empty state when no fees exist */}
                                                {selectedStudentFees.length === 0 && (
                                                    <div className="col-span-full flex flex-col items-center justify-center py-12 lg:py-16 text-base-content/70">
                                                        <div className="text-5xl lg:text-6xl mb-4">📋</div>
                                                        <p className="text-base lg:text-lg mb-2 font-medium text-center">
                                                            No fees found for this student.
                                                        </p>
                                                        <p className="text-sm lg:text-base text-base-content/50 text-center max-w-md">
                                                            Fees will appear here once they are assigned to this student.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="transport" className="mt-0 w-full overflow-hidden">
                                            <div className="flex flex-col items-center justify-center text-base-content/70 md:pt-8 px-1 sm:px-2 md:px-4">
                                                {(() => {
                                                    // Filter bus fees for the selected student only
                                                    const selectedStudentBusFees = studentBusFees.filter((busFee: any) =>
                                                        busFee.studentId === selectedStudent?._id ||
                                                        busFee.student?._id === selectedStudent?._id
                                                    );

                                                    return selectedStudentBusFees.length > 0 ? (
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 
                                                                      gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7 
                                                                      w-full max-w-full items-start">
                                                            {selectedStudentBusFees
                                                                .sort((a: any, b: any) => {
                                                                    // Sort by outstanding amount priority, then by due date
                                                                    const aOutstanding = Math.max(0, a.amount - (a.totalPaidFees || 0));
                                                                    const bOutstanding = Math.max(0, b.amount - (b.totalPaidFees || 0));

                                                                    // If one has outstanding and other doesn't, prioritize outstanding
                                                                    if (aOutstanding > 0 && bOutstanding <= 0) return -1;
                                                                    if (aOutstanding <= 0 && bOutstanding > 0) return 1;

                                                                    // If both have same outstanding status, sort by due date
                                                                    const aDate = new Date(a.dueDate);
                                                                    const bDate = new Date(b.dueDate);
                                                                    return aDate.getTime() - bDate.getTime();
                                                                })
                                                                .map((busFee: any, index) => {
                                                                    const isOverdue = busFee.status === 'overdue';
                                                                    const isPaid = busFee.status === 'paid';
                                                                    const isPending = busFee.status === 'pending';
                                                                    const isNotStarted = (busFee.status || 'not_started') === 'not_started';
                                                                    const totalPaid = busFee.totalPaidFees || 0;
                                                                    const remainingAmount = Math.max(0, busFee.remainingAmountFees || 0);
                                                                    const busPayments = busFee.payments || [];

                                                                    return (
                                                                        <div key={busFee._id} className={`relative overflow-hidden rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 bg-base-100 hover:bg-base-100/80 border border-base-content/60 hover:border-base-content/80 w-full max-w-full min-w-0 group/modal-card`}>
                                                                            {/* Status indicator bar */}
                                                                            <div className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300 ${isPaid
                                                                                ? 'bg-success'
                                                                                : isOverdue
                                                                                    ? 'bg-error'
                                                                                    : isPending
                                                                                        ? 'bg-yellow-600'
                                                                                        : 'bg-primary'
                                                                                }`}></div>

                                                                            <div className="p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 w-full overflow-hidden">
                                                                                {/* Fee Header */}
                                                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 xs:gap-3 sm:gap-4 mb-3 xs:mb-4 sm:mb-5 w-full overflow-hidden">
                                                                                    <div className="min-w-0 flex-1 overflow-hidden">
                                                                                        <div className="flex items-center gap-1 xs:gap-2 mb-1 xs:mb-2 overflow-hidden">
                                                                                            <h3 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-base-content leading-tight font-bold transition-colors duration-300">
                                                                                                Due Date : {formatDate(busFee.dueDate)}
                                                                                            </h3>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex flex-col items-end gap-1 xs:gap-2 flex-shrink-0 w-full sm:w-auto">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className={`badge badge-sm xs:badge-md sm:badge-lg font-bold px-2 xs:px-3 sm:px-4 py-1 xs:py-1 sm:py-2 text-xs xs:text-xs sm:text-sm md:text-base transition-all duration-300 ${isPaid
                                                                                                ? 'bg-success/10 text-success border-success/50 group-hover/modal-card:bg-success/20'
                                                                                                : isOverdue
                                                                                                    ? 'bg-error/10 text-error border-error/50 group-hover/modal-card:bg-error/20'
                                                                                                    : isNotStarted
                                                                                                        ? 'bg-primary/10 text-primary border-primary/50 group-hover/modal-card:bg-primary/20'
                                                                                                        : isPending
                                                                                                            ? 'bg-yellow-600/20 border-yellow-600 group-hover/modal-card:bg-yellow-600/30'
                                                                                                            : 'bg-base-content/10 text-base-content border-base-content/50 group-hover/modal-card:bg-base-content/20'
                                                                                                }`}>
                                                                                                {isPending && (
                                                                                                    <ClockAlert className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-yellow-600 flex-shrink-0" />
                                                                                                )}
                                                                                                {isOverdue && (
                                                                                                    <ClockAlert className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-error flex-shrink-0" />
                                                                                                )}
                                                                                                {isPaid && (
                                                                                                    <CheckCircle className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-success flex-shrink-0" />
                                                                                                )}
                                                                                                {isNotStarted && (
                                                                                                    <CirclePause className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-primary flex-shrink-0" />
                                                                                                )}
                                                                                                <span className="text-base-content font-medium">{isPaid ? 'Paid' : isOverdue ? 'Overdue' : isPending ? 'Pending' : 'Not Started'}</span>
                                                                                            </div>
                                                                                            {/* Action Buttons - Only show for admin/staff and non-paid fees */}
                                                                                            {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                                                                                                <div className="flex gap-1">
                                                                                                    {remainingAmount > 0 && (
                                                                                                        <button
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                setSelectedFeeForPayment(busFee);
                                                                                                                setPaymentForm({
                                                                                                                    amount: '',
                                                                                                                    mode: 'UPI',
                                                                                                                    paidOn: new Date().toISOString().split('T')[0],
                                                                                                                    isFullPayment: false
                                                                                                                });
                                                                                                                setEditingPayment(null);
                                                                                                                setIsPaymentModalOpen(true);
                                                                                                            }}
                                                                                                            className="btn btn-xs btn-ghost hover:bg-primary/20 transition-colors rounded-lg px-2"
                                                                                                            title="Record Payment"
                                                                                                        >
                                                                                                            <Edit className="w-5 h-5 text-primary" />
                                                                                                        </button>
                                                                                                    )}
                                                                                                    <button
                                                                                                        onClick={() => handleBusFeeDelete(busFee._id)}
                                                                                                        className="btn btn-xs btn-ghost hover:bg-error/20 transition-colors rounded-lg px-2"
                                                                                                        title="Delete Fee"
                                                                                                    >
                                                                                                        <Trash2 className="w-5 h-5 text-error" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Fee Amounts - Enhanced Design */}
                                                                                <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 xs:gap-3 sm:gap-4 mb-3 xs:mb-4 sm:mb-5">
                                                                                    <div className="bg-primary/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-primary/50 text-center transition-all duration-300 group-hover/modal-card:bg-primary/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-primary">
                                                                                        <div className="text-xs xs:text-xs sm:text-sm text-base-content font-medium mb-1">Total Amount</div>
                                                                                        <div className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content truncate">
                                                                                            ₹{busFee.amount?.toLocaleString() || '0'}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="bg-success/20 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-success/50 text-center transition-all duration-300 group-hover/modal-card:bg-success/30 group-hover/modal-card:shadow-md group-hover/modal-card:border-success">
                                                                                        <div className="text-xs xs:text-xs sm:text-sm text-base-content font-medium mb-1">Paid Amount</div>
                                                                                        <div className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content truncate">
                                                                                            ₹{totalPaid?.toLocaleString() || '0'}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className={`rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border text-center transition-all duration-300 group-hover/modal-card:shadow-md ${remainingAmount > 0
                                                                                        ? 'bg-error/20 border-error/50 group-hover/modal-card:bg-error/30 group-hover/modal-card:border-error'
                                                                                        : 'bg-success/20 border-success/50 group-hover/modal-card:bg-success/30 group-hover/modal-card:border-success'
                                                                                        }`}>
                                                                                        <div className="text-base-content text-xs xs:text-xs sm:text-sm font-medium mb-1">
                                                                                            Outstanding
                                                                                        </div>
                                                                                        <div className="text-base-content text-sm xs:text-base sm:text-lg md:text-xl font-bold truncate">
                                                                                            ₹{remainingAmount.toLocaleString()}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Payment History */}
                                                                                {busPayments && busPayments.length > 0 && (
                                                                                    <div className="bg-base-100 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-base-content/30 transition-all duration-300 group-hover/modal-card:bg-base-50 group-hover/modal-card:shadow-md group-hover/modal-card:border-base-content/40">
                                                                                        <h4 className="font-bold text-xs xs:text-sm sm:text-base md:text-lg text-base-content mb-2 xs:mb-3 flex items-center gap-2 truncate">
                                                                                            <span className="truncate">Payment History</span>
                                                                                        </h4>
                                                                                        <div className="space-y-1 xs:space-y-2">
                                                                                            {busPayments.map((payment: any, paymentIndex: number) => (
                                                                                                <div key={paymentIndex} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 xs:gap-2 sm:gap-3 p-2 xs:p-3 bg-success/5 rounded-md xs:rounded-lg border border-success/20 transition-all duration-300 hover:bg-success/10 hover:border-success/20">
                                                                                                    <div className="min-w-0 flex-1 overflow-hidden">
                                                                                                        <div className="flex items-center gap-1 xs:gap-2 mb-1 overflow-hidden">
                                                                                                            <span className="font-bold text-base-content text-sm xs:text-sm sm:text-base truncate">
                                                                                                                ₹{payment.amount?.toLocaleString()}
                                                                                                            </span>
                                                                                                            <span className="badge badge-primary badge-sm xs:badge-md text-base-100 flex-shrink-0">
                                                                                                                {payment.mode}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex items-center gap-1 xs:gap-2 text-xs xs:text-sm text-base-content/70 flex-shrink-0">
                                                                                                        <Calendar className="w-3 h-3 flex-shrink-0" />
                                                                                                        <span className="text-base-content truncate">{formatDate(payment.paidOn)}</span>
                                                                                                        {/* Action buttons for payments - only show for admin/staff */}
                                                                                                        {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                                                                                                            <div className="flex gap-1 ml-1">
                                                                                                                <button
                                                                                                                    onClick={(e) => {
                                                                                                                        e.stopPropagation();
                                                                                                                        handleEditExistingPayment(busFee, payment);
                                                                                                                    }}
                                                                                                                    className="btn btn-xs btn-ghost hover:bg-primary/20 transition-colors rounded-lg px-1"
                                                                                                                    title="Edit Payment"
                                                                                                                >
                                                                                                                    <Edit className="w-4 h-4 text-primary" />
                                                                                                                </button>
                                                                                                                <button
                                                                                                                    onClick={(e) => {
                                                                                                                        e.stopPropagation();
                                                                                                                        handlePrintPaymentReceipt(busFee, payment);
                                                                                                                    }}
                                                                                                                    className="btn btn-xs btn-ghost hover:bg-blue-500/20 transition-colors rounded-lg px-1"
                                                                                                                    title="Print Receipt"
                                                                                                                >
                                                                                                                    <Printer className="w-4 h-4 text-blue-500" />
                                                                                                                </button>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="text-5xl lg:text-6xl mb-4">🚌</div>
                                                            <p className="text-base lg:text-lg mb-2 font-medium text-center">
                                                                No transport fees found for this student
                                                            </p>
                                                            <p className="text-sm lg:text-base text-base-content/50 text-center max-w-md">
                                                                Transport fees will appear here when assigned to this student.
                                                            </p>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            ) : (
                                <div className="p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 
                                                  gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7 
                                                  w-full max-w-full items-start pt-4 sm:pt-6 md:pt-8 px-1 sm:px-2 md:px-4">

                                        {selectedStudentFees
                                            .sort((a: any, b: any) => {
                                                // Sort by actual outstanding amount (total required - total paid) priority, then by due date
                                                const aRequired = (a.feeTotalAmount || 0) + (a.totalLateFees || 0);
                                                const aPaid = a.totalPaid || 0;
                                                const aOutstanding = Math.max(0, aRequired - aPaid);

                                                const bRequired = (b.feeTotalAmount || 0) + (b.totalLateFees || 0);
                                                const bPaid = b.totalPaid || 0;
                                                const bOutstanding = Math.max(0, bRequired - bPaid);

                                                // If one has outstanding and other doesn't, prioritize outstanding
                                                if (aOutstanding > 0 && bOutstanding <= 0) return -1;
                                                if (aOutstanding <= 0 && bOutstanding > 0) return 1;

                                                // If both have same outstanding status, sort by due date
                                                const aDate = new Date(a.dueDate);
                                                const bDate = new Date(b.dueDate);
                                                return aDate.getTime() - bDate.getTime();
                                            })
                                            .map((fee: any, index) => {
                                                const feesStructure = fee.feesStructure || fee.feesStructureId;
                                                const isOverdue = fee.status === 'overdue';
                                                const isPaid = fee.status === 'paid';
                                                const isPending = fee.status === 'pending';
                                                const isNotStarted = fee.status === 'not_started';

                                                return (
                                                    <div key={fee._id} className={`relative overflow-hidden rounded-lg xs:rounded-xl sm:rounded-2xl md:rounded-3xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 bg-base-100 hover:bg-base-100/80 border border-base-content/60 hover:border-base-content/80 w-full max-w-full min-w-0 group/modal-card`}>
                                                        {/* Status indicator bar */}
                                                        <div className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300 ${isPaid
                                                            ? 'bg-success'
                                                            : isOverdue
                                                                ? 'bg-error'
                                                                : isPending
                                                                    ? 'bg-yellow-600'
                                                                    : 'bg-primary'
                                                            }`}></div>

                                                        <div className="p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 w-full overflow-hidden">
                                                            {/* Fee Header */}
                                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 xs:gap-3 sm:gap-4 mb-3 xs:mb-4 sm:mb-5 w-full overflow-hidden">
                                                                <div className="min-w-0 flex-1 overflow-hidden">
                                                                    <div className="flex items-center gap-1 xs:gap-2 mb-1 xs:mb-2 overflow-hidden">
                                                                        <h3 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-base-content leading-tight font-bold transition-colors duration-300">
                                                                            Due Date: {formatDate(fee.dueDate)}
                                                                        </h3>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1 xs:gap-2 flex-shrink-0 w-full sm:w-auto">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`badge badge-sm xs:badge-md sm:badge-lg font-bold px-2 xs:px-3 sm:px-4 py-1 xs:py-1 sm:py-2 text-xs xs:text-xs sm:text-sm md:text-base transition-all duration-300 ${isPaid
                                                                            ? 'bg-success/10 text-success border-success/50 group-hover/modal-card:bg-success/20'
                                                                            : isOverdue
                                                                                ? 'bg-error/10 text-error border-error/50 group-hover/modal-card:bg-error/20'
                                                                                : isNotStarted
                                                                                    ? 'bg-primary/10 text-primary border-primary/50 group-hover/modal-card:bg-primary/20'
                                                                                    : isPending
                                                                                        ? 'bg-yellow-600/20 border-yellow-600 group-hover/modal-card:bg-yellow-600/30'
                                                                                        : 'bg-base-content/10 text-base-content border-base-content/50 group-hover/modal-card:bg-base-content/20'

                                                                            }`}>
                                                                            {isPending && (
                                                                                <ClockAlert className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-yellow-600 flex-shrink-0" />
                                                                            )}
                                                                            {isOverdue && (
                                                                                <ClockAlert className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-error flex-shrink-0" />
                                                                            )}
                                                                            {isPaid && (
                                                                                <CheckCircle className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-success flex-shrink-0" />
                                                                            )}
                                                                            {isNotStarted && (
                                                                                <CirclePause className="w-3 h-3 xs:w-4 xs:h-4 mr-1 text-primary flex-shrink-0" />
                                                                            )}

                                                                            <span className="text-base-content font-medium">{isPaid ? 'Paid' : isOverdue ? 'Overdue' : isPending ? 'Pending' : 'Not Started'}</span>
                                                                        </div>

                                                                        {/* Action Buttons - Only show for admin/staff and non-paid fees */}
                                                                        {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                                                                            <div className="flex gap-1">
                                                                                {(() => {
                                                                                    const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                                                                    const totalPaid = fee.totalPaid || 0;
                                                                                    const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                                                                    return actualOutstanding > 0;
                                                                                })() && (
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleEditPayment(fee);
                                                                                            }}
                                                                                            className="btn btn-xs btn-ghost hover:bg-primary/20 transition-colors rounded-lg px-2"
                                                                                            title="Record Payment"
                                                                                        >
                                                                                            <Edit className="w-5 h-5 text-primary" />
                                                                                        </button>
                                                                                    )}
                                                                                <button
                                                                                    onClick={() => handleFeeDelete(fee._id)}
                                                                                    className="btn btn-xs btn-ghost hover:bg-error/20 transition-colors rounded-lg px-2"
                                                                                    title="Delete Fee"
                                                                                >
                                                                                    <Trash2 className="w-5 h-5 text-error" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Fee Amounts - Enhanced Design */}
                                                            <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 xs:gap-3 sm:gap-4 mb-3 xs:mb-4 sm:mb-5">
                                                                <div className="bg-primary/10 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-primary/50 text-center transition-all duration-300 group-hover/modal-card:bg-primary/20 group-hover/modal-card:shadow-md group-hover/modal-card:border-primary">
                                                                    <div className="text-xs xs:text-xs sm:text-sm text-base-content font-medium mb-1">Total Amount</div>
                                                                    <div className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content truncate">
                                                                        ₹{fee.feeTotalAmount?.toLocaleString() || '0'}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-success/20 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-success/50 text-center transition-all duration-300 group-hover/modal-card:bg-success/30 group-hover/modal-card:shadow-md group-hover/modal-card:border-success">
                                                                    <div className="text-xs xs:text-xs sm:text-sm text-base-content font-medium mb-1">Paid Amount</div>
                                                                    <div className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-base-content truncate">
                                                                        ₹{fee.totalPaid?.toLocaleString() || '0'}
                                                                    </div>
                                                                </div>
                                                                <div className={`rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border text-center transition-all duration-300 group-hover/modal-card:shadow-md ${(() => {
                                                                    const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                                                    const totalPaid = fee.totalPaid || 0;
                                                                    const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                                                    return actualOutstanding > 0
                                                                        ? 'bg-error/20 border-error/50 group-hover/modal-card:bg-error/30 group-hover/modal-card:border-error'
                                                                        : 'bg-success/20 border-success/50 group-hover/modal-card:bg-success/30 group-hover/modal-card:border-success';
                                                                })()}`}>
                                                                    <div className="text-base-content text-xs xs:text-xs sm:text-sm font-medium mb-1">
                                                                        Outstanding
                                                                    </div>
                                                                    <div className="text-base-content text-sm xs:text-base sm:text-lg md:text-xl font-bold truncate">
                                                                        {(() => {
                                                                            const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                                                            const totalPaid = fee.totalPaid || 0;
                                                                            const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                                                            return actualOutstanding > 0 ? `₹${actualOutstanding.toLocaleString()}` : '₹0';
                                                                        })()}
                                                                    </div>
                                                                    {fee.totalLateFees > 0 && (
                                                                        <div className="text-xs text-base-content/80 mt-1">
                                                                            {(() => {
                                                                                const totalRequired = (fee.feeTotalAmount || 0) + (fee.totalLateFees || 0);
                                                                                const totalPaid = fee.totalPaid || 0;
                                                                                const actualOutstanding = Math.max(0, totalRequired - totalPaid);
                                                                                if (actualOutstanding > 0) {
                                                                                    return `(₹${(fee.feeTotalAmount || 0).toLocaleString()} + ₹${fee.totalLateFees?.toLocaleString()} late fees - ₹${totalPaid.toLocaleString()} paid)`;
                                                                                } else {
                                                                                    return `All fees and late fees paid`;
                                                                                }
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Payment History */}
                                                            {fee.payments && fee.payments.length > 0 && (
                                                                <div className="bg-base-100 rounded-md xs:rounded-lg sm:rounded-xl p-2 xs:p-3 sm:p-4 shadow-sm border border-base-content/30 transition-all duration-300 group-hover/modal-card:bg-base-50 group-hover/modal-card:shadow-md group-hover/modal-card:border-base-content/40">
                                                                    <h4 className="font-bold text-xs xs:text-sm sm:text-base md:text-lg text-base-content mb-2 xs:mb-3 flex items-center gap-2 truncate">
                                                                        <span className="truncate">Payment History</span>
                                                                    </h4>
                                                                    <div className="space-y-1 xs:space-y-2">
                                                                        {fee.payments.map((payment: any, paymentIndex: number) => (
                                                                            <div key={paymentIndex} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 xs:gap-2 sm:gap-3 p-2 xs:p-3 bg-success/5 rounded-md xs:rounded-lg border border-success/20 transition-all duration-300 hover:bg-success/10 hover:border-success/20">
                                                                                <div className="min-w-0 flex-1 overflow-hidden">
                                                                                    <div className="flex items-center gap-1 xs:gap-2 mb-1 overflow-hidden">
                                                                                        <span className="font-bold text-base-content text-sm xs:text-sm sm:text-base truncate">
                                                                                            ₹{payment.amount?.toLocaleString()}
                                                                                        </span>
                                                                                        <span className="badge badge-primary badge-sm xs:badge-md text-base-100 flex-shrink-0">
                                                                                            {payment.mode}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-1 xs:gap-2 text-xs xs:text-sm text-base-content/70 flex-shrink-0">
                                                                                    <Calendar className="w-3 h-3 flex-shrink-0" />
                                                                                    <span className="text-base-content truncate">{formatDate(payment.paidOn)}</span>
                                                                                    {/* Action buttons for payments - only show for admin/staff */}
                                                                                    {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                                                                                        <div className="flex gap-1 ml-1">
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleEditExistingPayment(fee, payment);
                                                                                                }}
                                                                                                className="btn btn-xs btn-ghost hover:bg-primary/20 transition-colors rounded-lg px-1"
                                                                                                title="Edit Payment"
                                                                                            >
                                                                                                <Edit className="w-4 h-4 text-primary" />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handlePrintPaymentReceipt(fee, payment);
                                                                                                }}
                                                                                                className="btn btn-xs btn-ghost hover:bg-blue-500/20 transition-colors rounded-lg px-1"
                                                                                                title="Print Receipt"
                                                                                            >
                                                                                                <Printer className="w-4 h-4 text-blue-500" />
                                                                                            </button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                        {/* Empty state when no fees exist */}
                                        {selectedStudentFees.length === 0 && (
                                            <div className="col-span-full flex flex-col items-center justify-center py-12 lg:py-16 text-base-content/70">
                                                <div className="text-5xl lg:text-6xl mb-4">📋</div>
                                                <p className="text-base lg:text-lg mb-2 font-medium text-center">
                                                    No fees found for this student.
                                                </p>
                                                <p className="text-sm lg:text-base text-base-content/50 text-center max-w-md">
                                                    Fees will appear here once they are assigned to this student.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };



    return (
        <div className="flex flex-col w-full min-h-[calc(100vh-64px)] bg-base-100">
            <div className="container mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 max-w-full">
                <div className="bg-base-300 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm border border-base-content/10 overflow-hidden">
                    <div className="p-3 sm:p-4 lg:p-6 xl:p-8">
                        <div className="space-y-3 xs:space-y-4 sm:space-y-6 w-full">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-base-content tracking-tight truncate">
                                        Manage Fees
                                    </h1>
                                </div>
                                <div className="flex-shrink-0 w-full sm:w-auto">
                                    <AcademicYearDropdown
                                        academicYears={academicYears}
                                        selectedYearId={selectedAcademicYear}
                                        onYearChange={handleYearChange}
                                        isLoading={isLoadingAcademicYears}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tabs - Only show to admin users */}
                        {userRole === 'ADMIN' && (
                            <div className="w-full">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="relative grid w-full grid-cols-5 bg-base-300 backdrop-blur-sm max-w-2xl sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto mt-4 sm:mb-6 rounded-lg sm:rounded-xl p-1 shadow-md border border-base-content/30">
                                        {/* Sliding Background Indicator */}
                                        <div
                                            className={`absolute top-1 bottom-1 rounded-md sm:rounded-lg bg-base-100 shadow-md transition-all duration-300 ease-in-out ${activeTab === 'studentFees'
                                                ? 'left-1 w-1/5 mr-1'
                                                : activeTab === 'structures'
                                                    ? 'left-[calc(20%+0.25rem)] w-1/5'
                                                    : activeTab === 'feesTypes'
                                                        ? 'left-[calc(40%+0.25rem)] w-1/5'
                                                        : activeTab === 'discounts'
                                                            ? 'left-[calc(60%+0.25rem)] w-1/5'
                                                            : activeTab === 'lateFees'
                                                                ? 'left-[calc(80%)] w-1/5 mr-1'
                                                                : 'left-1/2 w-1/5'
                                                }`}
                                        />

                                        <TabsTrigger
                                            value="studentFees"
                                            className={`relative flex items-center justify-center rounded-md sm:rounded-lg transition-all duration-300 ease-in-out px-2 sm:px-4 py-2 sm:py-3 min-w-0 z-10 ${activeTab === 'studentFees'
                                                ? 'text-emerald-600 font-semibold'
                                                : 'text-base-content/80 hover:text-base-content font-medium'
                                                }`}
                                        >
                                            <ReceiptIndianRupee className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                            <span className="text-xs sm:text-sm font-medium truncate">
                                                <span className="hidden sm:inline">Student Fees</span>
                                                <span className="sm:hidden">Students</span>
                                            </span>
                                        </TabsTrigger>

                                        <TabsTrigger
                                            value="structures"
                                            className={`relative flex items-center justify-center rounded-md sm:rounded-lg transition-all duration-300 ease-in-out px-2 sm:px-4 py-2 sm:py-3 min-w-0 z-10 ${activeTab === 'structures'
                                                ? 'text-blue-600 font-semibold'
                                                : 'text-base-content/80 hover:text-base-content font-medium'
                                                }`}
                                        >
                                            <Blocks className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                            <span className="text-xs sm:text-sm font-medium truncate">
                                                <span className="hidden sm:inline">Fee Structures</span>
                                                <span className="sm:hidden">Structures</span>
                                            </span>
                                        </TabsTrigger>

                                        <TabsTrigger
                                            value="feesTypes"
                                            className={`relative flex items-center justify-center rounded-md sm:rounded-lg transition-all duration-300 ease-in-out px-2 sm:px-4 py-2 sm:py-3 min-w-0 z-10 ${activeTab === 'feesTypes'
                                                ? 'text-rose-600 font-semibold'
                                                : 'text-base-content/80 hover:text-base-content font-medium'
                                                }`}
                                        >
                                            <Settings className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                            <span className="text-xs sm:text-sm font-medium truncate">
                                                <span className="hidden sm:inline">Fee Types</span>
                                                <span className="sm:hidden">Types</span>
                                            </span>
                                        </TabsTrigger>

                                        <TabsTrigger
                                            value="discounts"
                                            className={`relative flex items-center justify-center rounded-md sm:rounded-lg transition-all duration-300 ease-in-out px-2 sm:px-4 py-2 sm:py-3 min-w-0 z-10 ${activeTab === 'discounts'
                                                ? 'text-purple-600 font-semibold'
                                                : 'text-base-content/80 hover:text-base-content font-medium'
                                                }`}
                                        >
                                            <BadgePercent className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                            <span className="text-xs sm:text-sm font-medium truncate">
                                                <span className="hidden sm:inline">Discounts</span>
                                                <span className="sm:hidden">Discount</span>
                                            </span>
                                        </TabsTrigger>

                                        <TabsTrigger
                                            value="lateFees"
                                            className={`relative flex items-center justify-center rounded-md sm:rounded-lg transition-all duration-300 ease-in-out px-2 sm:px-4 py-2 sm:py-3 min-w-0 z-10 ${activeTab === 'lateFees'
                                                ? 'text-orange-600 font-semibold'
                                                : 'text-base-content/80 hover:text-base-content font-medium'
                                                }`}
                                        >
                                            <History className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                                            <span className="text-xs sm:text-sm font-medium truncate">
                                                <span className="hidden sm:inline">Late Fees</span>
                                                <span className="sm:hidden">Late Fee</span>
                                            </span>
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        )}
                        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 lg:gap-6 mt-4">
                            {/* Back button for student fees screen */}
                            {activeTab === 'studentFees' && studentFeesScreen === 'students' && userRole !== 'STUDENT' && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                                    <Button
                                        outline
                                        variant='primary'
                                        onClick={() => {
                                            setStudentFeesScreen('classes');
                                            setSearchTerm(''); // Clear search when going back to classes
                                        }}
                                        className="btn btn-sm sm:btn-md flex items-center gap-2 text-primary hover:bg-primary/10 transition-all duration-200"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        <span className="text-sm">Back to Classes</span>
                                    </Button>
                                    <div className="text-sm text-base-content bg-base-100 px-3 py-4 rounded-lg">
                                        <span className="font-medium">Class {selectedClass?.classNumber} - Section {selectedSection?.section}</span>
                                    </div>
                                </div>
                            )}

                            {/* Search */}
                            {!(activeTab === 'studentFees' && studentFeesScreen === 'students' && userRole !== 'STUDENT') && (
                                <div className="relative flex-1 max-w-2xl">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-base-content/60 w-4 h-4 sm:w-5 sm:h-5" />
                                    <input
                                        type="text"
                                        placeholder={`Search ${activeTab === 'studentFees' ? (studentFeesScreen === 'classes' ? 'classes and sections' : userRole === 'STUDENT' ? 'your fees' : 'students (try initials like "JD")') : activeTab === 'structures' ? 'fee structures' : activeTab === 'feesTypes' ? 'fee types' : activeTab === 'discounts' ? 'discounts' : 'late fees'}...`}
                                        className="w-full text-base-content pl-11 sm:pl-12 pr-4 py-3 sm:py-4 text-sm sm:text-base bg-base-100 border border-base-content/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 placeholder:text-base-content/50"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            )}

                            {activeTab === 'studentFees' && studentFeesScreen === 'students' && userRole !== 'STUDENT' && (
                                <div className="relative flex-1 max-w-2xl">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-base-content/60 w-4 h-4 sm:w-5 sm:h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search students (try initials like 'JD')..."
                                        className="w-full text-base-content pl-11 sm:pl-12 pr-4 py-3 sm:py-4 text-sm sm:text-base bg-base-100 border border-base-content/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 placeholder:text-base-content/50"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            )}

                            {userRole !== 'STUDENT' && !(activeTab === 'studentFees' && studentFeesScreen === 'students' && userRole !== 'STUDENT') && (
                                <div className="flex-shrink-0">
                                    <Link href={getAddButtonLink()}>
                                        {activeTab !== 'studentFees' && (
                                            <Button
                                                outline
                                                variant='primary'
                                                className="btn btn-sm sm:btn-md px-4 sm:px-6 py-2 sm:py-3 font-medium text-sm sm:text-base flex items-center gap-2 transition-all duration-200 hover:scale-105">
                                                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                                <span>
                                                    <span className="hidden sm:inline">Add </span>{activeTab === 'structures' ? 'Fee Structure' : activeTab === 'feesTypes' ? 'Fee Type' : activeTab === 'discounts' ? 'Discount' : 'Late Fee'}
                                                </span>
                                            </Button>
                                        )}
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="w-full overflow-hidden">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <div className="overflow-x-hidden w-full">
                                    <TabsContent value="studentFees" className="mt-0 w-full overflow-hidden">
                                        {isLoading ? (
                                            <div className="flex flex-col justify-center items-center p-8">
                                                <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                                <p className="mt-2 text-base-content">
                                                    {studentFeesScreen === 'classes' ? 'Loading classes and sections...' : 'Loading student fees...'}
                                                </p>
                                            </div>
                                        ) : studentFeesScreen === 'classes' ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 py-6">
                                                {filteredClassSections.map((classData) => (
                                                    <div key={classData.class._id} className="group">
                                                        <ClassCard classData={classData} />
                                                    </div>
                                                ))}
                                                {filteredClassSections.length === 0 && (
                                                    <div className="col-span-full flex flex-col items-center justify-center py-12 lg:py-16 text-base-content/70">
                                                        <div className="text-5xl lg:text-6xl mb-4">🏫</div>
                                                        <p className="text-base lg:text-lg mb-2 font-medium">
                                                            {searchTerm ? 'No classes or sections found matching your search.' : 'No classes and sections found.'}
                                                        </p>
                                                        {!searchTerm && (
                                                            <p className="text-sm lg:text-base text-base-content/50 text-center max-w-md">
                                                                Classes and sections will appear here once they are created for the selected academic year.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 lg:gap-8 my-6">
                                                {filteredGroupedStudentFees
                                                    .sort((a, b) => {
                                                        const aName = `${a.student.firstName} ${a.student.lastName}`.toLowerCase();
                                                        const bName = `${b.student.firstName} ${b.student.lastName}`.toLowerCase();
                                                        return aName.localeCompare(bName);
                                                    })
                                                    .map((studentGroup) => (
                                                        <div key={studentGroup.student._id} className="group">
                                                            <GroupedStudentFeeCard studentGroup={studentGroup} />
                                                        </div>
                                                    ))}
                                                {filteredGroupedStudentFees.length === 0 && (
                                                    <div className="col-span-full flex flex-col items-center justify-center py-12 lg:py-16 text-base-content/70">
                                                        <div className="text-5xl lg:text-6xl mb-4">🎓</div>
                                                        <p className="text-base lg:text-lg mb-4 font-medium text-center">
                                                            {searchTerm ?
                                                                (userRole === 'STUDENT' ? 'No fees found matching your search.' : 'No students found matching your search.') :
                                                                (userRole === 'STUDENT' ? 'No fees found for you.' : `No student fees found for Class ${selectedClass?.classNumber} - ${selectedSection?.section}.`)
                                                            }
                                                        </p>
                                                        {(userRole === 'ADMIN' || userRole === 'STAFF') && !searchTerm && (
                                                            <Button
                                                                variant='primary'
                                                                outline
                                                                className="btn btn-md px-6 py-3 transition-all duration-200"
                                                                onClick={() => window.location.href = '/manage-fees/add?type=studentFee'}
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                <span>Assign Fee to Student</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="structures" className="mt-0 w-full overflow-hidden">
                                        {isLoading ? (
                                            <div className="flex flex-col justify-center items-center p-8">
                                                <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                                <p className="mt-2 text-base-content">Loading fee structures...</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 py-6">
                                                {filteredFeesStructures.map((structure) => (
                                                    <div key={structure._id} className="group">
                                                        <FeesStructureCard structure={structure} />
                                                    </div>
                                                ))}
                                                {filteredFeesStructures.length === 0 && (
                                                    <div className="col-span-full flex flex-col items-center justify-center py-12 lg:py-16 text-base-content/70">
                                                        <div className="text-5xl lg:text-6xl mb-4">💳</div>
                                                        <p className="text-base lg:text-lg mb-4 font-medium">No fee structures found.</p>
                                                        {userRole !== 'STUDENT' && !searchTerm && (
                                                            <Button
                                                                variant='primary'
                                                                outline
                                                                className="btn btn-md px-6 py-3 transition-all duration-200"
                                                                onClick={() => window.location.href = '/manage-fees/add?type=structure'}
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                <span>Create Fee Structure</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="feesTypes" className="mt-0 w-full overflow-hidden">
                                        {isLoading ? (
                                            <div className="flex flex-col justify-center items-center p-8">
                                                <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                                <p className="mt-2 text-base-content">Loading fee types...</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 py-6">
                                                {filteredFeesTypes.map((feesType) => (
                                                    <div key={feesType._id} className="group">
                                                        <FeesTypeCard feesType={feesType} />
                                                    </div>
                                                ))}
                                                {filteredFeesTypes.length === 0 && (
                                                    <div className="col-span-full flex flex-col items-center justify-center py-12 lg:py-16 text-base-content/70">
                                                        <div className="text-5xl lg:text-6xl mb-4">⚙️</div>
                                                        <p className="text-base lg:text-lg mb-4 font-medium">No fee types found.</p>
                                                        {userRole !== 'STUDENT' && !searchTerm && (
                                                            <Button
                                                                variant='primary'
                                                                outline
                                                                className="btn btn-md px-6 py-3 transition-all duration-200"
                                                                onClick={() => window.location.href = '/manage-fees/add?type=feesType'}
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                <span>Create Fee Type</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="discounts" className="mt-0 w-full overflow-hidden">
                                        {isLoading ? (
                                            <div className="flex flex-col justify-center items-center p-8">
                                                <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                                <p className="mt-2 text-base-content">Loading discount types...</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 py-6">
                                                {filteredDiscountTypes.map((discount) => (
                                                    <div key={discount._id} className="group">
                                                        <DiscountTypeCard discount={discount} />
                                                    </div>
                                                ))}
                                                {filteredDiscountTypes.length === 0 && (
                                                    <div className="col-span-full flex flex-col items-center justify-center py-12 lg:py-16 text-base-content/70">
                                                        <div className="mb-4">
                                                            <BadgePercent className="w-16 h-16 lg:w-20 lg:h-20" />
                                                        </div>
                                                        <p className="text-base lg:text-lg mb-4 font-medium">No discount types found.</p>
                                                        {userRole !== 'STUDENT' && !searchTerm && (
                                                            <Button
                                                                variant='primary'
                                                                outline
                                                                className="btn btn-md px-6 py-3 transition-all duration-200"
                                                                onClick={() => window.location.href = '/manage-fees/add?type=discount'}
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                <span>Create Discount</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="lateFees" className="mt-0 w-full overflow-hidden">
                                        {isLoading ? (
                                            <div className="flex flex-col justify-center items-center p-8">
                                                <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                                <p className="mt-2 text-base-content">Loading late fees...</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 py-6">
                                                {filteredLateFees.map((lateFee) => (
                                                    <div key={lateFee._id} className="group">
                                                        <LateFeeCard lateFee={lateFee} />
                                                    </div>
                                                ))}
                                                {filteredLateFees.length === 0 && (
                                                    <div className="col-span-full flex flex-col items-center justify-center py-12 lg:py-16 text-base-content/70">
                                                        <div className="text-5xl lg:text-6xl mb-4">🕒</div>
                                                        <p className="text-base lg:text-lg mb-4 font-medium">No late fees found.</p>
                                                        {userRole !== 'STUDENT' && !searchTerm && (
                                                            <Button
                                                                variant='primary'
                                                                outline
                                                                className="btn btn-md px-6 py-3 transition-all duration-200"
                                                                onClick={() => window.location.href = '/manage-fees/add?type=lateFee'}
                                                            >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                <span>Create Late Fee</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </div>
            {/* Delete Modal */}
            <ModalPopup
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                message="Are you sure you want to delete this item? This action cannot be undone."
                onConfirm={handleDeleteConfirm}
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
            />
            {/* Student Fee Details Modal */}
            <StudentFeeDetailsModal />
            {/* Payment Form Modal */}
            <PaymentFormModal
                isOpen={isPaymentModalOpen}
                onClose={handlePaymentModalClose}
                selectedFee={selectedFeeForPayment}
                selectedFeeLateFees={selectedFeeForPayment ? getLateFeesByStudentFeeId(selectedFeeForPayment._id) : []}
                paymentForm={paymentForm}
                onAmountChange={handleAmountChange}
                onModeChange={handleModeChange}
                onDateChange={handleDateChange}
                onFullPaymentChange={handleFullPaymentChange}
                onSubmit={handlePaymentSubmit}
                isFormValid={isFormValid}
                currentPaymentAmount={currentPaymentAmount}
                isExpanded={isExpanded}
                formatDate={formatDate}
                editingPayment={editingPayment}
            />
        </div>
    );
}

export default function ManageFeesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-base-100">
                <div className="text-center">
                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-12 h-12 mx-auto" />
                    <p className="mt-4 text-base-content">Loading...</p>
                </div>
            </div>
        }>
            <ManageFeesForm />
        </Suspense>
    );
}
