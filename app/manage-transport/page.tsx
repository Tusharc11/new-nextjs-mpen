'use client';

import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, Bus, Users, MapPin, Calendar, Hash, Shield, FileText, Fuel, Phone, MapPin as Location, X, Eye, CreditCard, Download, Image as ImageIcon, FileIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import { formatDate } from '@/utils/dateUtils';
import ModalPopup from '../components/ui/modalPopup';
import toast from 'react-hot-toast';
import Image from 'next/image';
import bookLoader1 from '@/public/book1.gif';
import { useSidebarStore } from '../components/store/useSidebarStore';

interface BusDetails {
    _id: string;
    number: number;
    modelName: string;
    vehicleNumber: string;
    capacity?: number;
    route: string;
    routeDetails?: {
        destination: string;
        amount: number;
    }[];
    averageFuelCostPerMonth?: number;
    installments: string;
    documents?: {
        filename: string;
        fileType: string;
        mimeType: string;
        size: number;
        compressedSize: number;
        data: string;
        uploadDate: string;
    }[];
    insuranceDetails?: {
        policyNumber?: string;
        provider?: string;
        expiryDate?: string;
        coverageAmount?: number;
        policyType?: string;
    };
    driver1Details: {
        name: string;
        licenseNumber: string;
        phoneNumber: string;
        address?: string;
        experience?: number;
        dateOfBirth?: string;
    };
    driver2Details?: {
        name: string;
        licenseNumber: string;
        phoneNumber: string;
        address?: string;
        experience?: number;
        dateOfBirth?: string;
    };
    conductorDetails?: {
        name?: string;
        phoneNumber?: string;
        address?: string;
        experience?: number;
        dateOfBirth?: string;
    };
    pucDetails?: {
        certificateNumber?: string;
        issueDate?: string;
        expiryDate?: string;
        issuingAuthority?: string;
    };
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
}

export default function ManageTransportPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [buses, setBuses] = useState<BusDetails[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedBusDetails, setSelectedBusDetails] = useState<BusDetails | null>(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<{filename: string, data: string, mimeType: string} | null>(null);
    const { isExpanded } = useSidebarStore();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (!token) return;
            const payload = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));
            const userRole = decodedPayload.role;
            setUserRole(userRole);
        }

        const fetchBuses = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/manage-transport', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) throw new Error('Failed to fetch buses');
                const data = await response.json();
                setBuses(data);
            } catch (error) {
                console.error('Error fetching buses:', error);
                toast.error('Failed to load buses');
            } finally {
                setIsLoading(false);
            }
        };
        fetchBuses();
    }, []);

    const filteredBuses = buses.filter(bus =>
        Object.values(bus).some(value => {
            if (typeof value === 'object' && value !== null) {
                // Handle nested objects like driver details, insurance details etc.
                return Object.values(value).some(nestedValue =>
                    nestedValue && nestedValue.toString().toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
    );

    const handleDeleteClick = (busId: string) => {
        setSelectedBusId(busId);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedBusId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/manage-transport?id=${selectedBusId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete bus');

            // Remove deleted bus from state
            setBuses(prevBuses => prevBuses.filter(bus => bus._id !== selectedBusId));
            toast.success('Bus deleted successfully');
        } catch (error) {
            toast.error('Error deleting bus');
        }

        setIsDeleteModalOpen(false);
        setSelectedBusId(null);
    };

    const handleDeleteCancel = () => {
        setIsDeleteModalOpen(false);
        setSelectedBusId(null);
    };

    const handleBusClick = (bus: BusDetails) => {
        setSelectedBusDetails(bus);
        setIsDetailsModalOpen(true);
    };

    const handleDetailsModalClose = () => {
        setIsDetailsModalOpen(false);
        setSelectedBusDetails(null);
    };

    const handleImageClick = (document: {filename: string, data: string, mimeType: string}) => {
        setSelectedImage(document);
        setIsImageModalOpen(true);
    };

    const handleImageModalClose = () => {
        setIsImageModalOpen(false);
        setSelectedImage(null);
    };



    const BusCard = ({ bus }: { bus: BusDetails }) => {
        return (
            <div
                className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-300/50 hover:border-base-300 rounded-lg overflow-hidden cursor-pointer"
                onClick={() => handleBusClick(bus)}
            >
                <div className="card-body p-4">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                            <div className="avatar placeholder">
                                <div className="bg-gradient-to-br from-primary to-primary-focus text-primary-content rounded-full w-10 h-10 shadow-sm">
                                    <span className="text-sm font-semibold">
                                        {bus.number}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-base-content text-sm sm:text-base leading-tight">
                                    #{bus.number} - {bus.vehicleNumber}
                                </h3>
                            </div>
                        </div>
                        {userRole === 'ADMIN' && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Link href={`/manage-transport/add?id=${bus._id}`}>
                                    <button className="btn btn-ghost btn-xs sm:btn-sm hover:bg-info/10 transition-colors rounded-md">
                                        <Edit className="w-3 h-3 sm:w-4 sm:h-4 text-info" />
                                    </button>
                                </Link>
                                <button
                                    className="btn btn-ghost btn-xs sm:btn-sm hover:bg-error/10 transition-colors rounded-md"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(bus._id);
                                    }}
                                >
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-error" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Bus details */}
                    <div className="space-y-2.5">
                        <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                <Hash className="w-3.5 h-3.5 text-base-content/60" />
                            </div>
                            <span className="text-xs sm:text-sm text-base-content/80 font-medium">
                                {bus.modelName}
                            </span>
                        </div>

                        <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                <MapPin className="w-3.5 h-3.5 text-base-content/60" />
                            </div>
                            <span className="text-xs sm:text-sm text-base-content/80 truncate" title={bus.route}>
                                {bus.route}
                            </span>
                        </div>

                        {bus.capacity && (
                            <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                    <Users className="w-3.5 h-3.5 text-base-content/60" />
                                </div>
                                <span className="text-xs sm:text-sm text-base-content/80">
                                    Capacity: <span className="font-medium">{bus.capacity} passengers</span>
                                </span>
                            </div>
                        )}

                        <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                <Users className="w-3.5 h-3.5 text-base-content/60" />
                            </div>
                            <span className="text-xs sm:text-sm text-base-content/80 truncate">
                                Driver: <span className="font-medium">{bus.driver1Details.name}</span>
                            </span>
                        </div>

                        {bus.driver2Details && (
                            <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                    <Users className="w-3.5 h-3.5 text-base-content/60" />
                                </div>
                                <span className="text-xs sm:text-sm text-base-content/80 truncate">
                                    Driver 2: <span className="font-medium">{bus.driver2Details.name}</span>
                                </span>
                            </div>
                        )}

                        {bus.conductorDetails?.name && (
                            <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                    <Users className="w-3.5 h-3.5 text-base-content/60" />
                                </div>
                                <span className="text-xs sm:text-sm text-base-content/80 truncate">
                                    Conductor: <span className="font-medium">{bus.conductorDetails.name}</span>
                                </span>
                            </div>
                        )}

                        <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                <Calendar className="w-3.5 h-3.5 text-base-content/60" />
                            </div>
                            <span className="text-xs sm:text-sm text-base-content/80">
                                Added: <span className="font-medium">{formatDate(bus.createdAt)}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const BusDetailsModal = () => {
        if (!selectedBusDetails) return null;

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
                        handleDetailsModalClose();
                    }
                }}
            >
                <div
                    className="bg-base-100 rounded-lg shadow-2xl w-full h-full 
                             xs:w-[calc(100%-0.5rem)] xs:h-[calc(100%-0.5rem)] xs:rounded-lg xs:m-1
                             sm:w-[calc(100%-1rem)] sm:h-[calc(100%-1rem)] sm:rounded-xl sm:m-2
                             md:w-[calc(100%-2rem)] md:h-[calc(100%-2rem)] md:rounded-2xl md:m-4
                             lg:w-[calc(100%-4rem)] lg:h-[calc(100%-3rem)] lg:rounded-2xl lg:m-6
                             xl:w-[calc(100%-6rem)] xl:h-[calc(100%-3rem)] xl:rounded-3xl xl:m-8
                             2xl:max-w-[95rem] 2xl:max-h-[90vh]
                             max-h-[98vh] overflow-hidden animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="sticky top-0 bg-base-200 border-b border-base-300 border-base-content/60 z-10
                                      p-1.5 xs:p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6">
                            <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center 
                                          gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 w-full overflow-hidden">
                                <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4 lg:gap-5 
                                              min-w-0 flex-1 overflow-hidden">
                                    <div className="avatar placeholder flex-shrink-0">
                                        <div className="bg-gradient-to-br from-primary to-secondary text-primary-content 
                                                      rounded-md xs:rounded-lg sm:rounded-xl md:rounded-2xl lg:rounded-3xl
                                                      w-6 h-6 xs:w-8 xs:h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 
                                                      lg:w-14 lg:h-14 xl:w-16 xl:h-16 shadow-lg">
                                            <span className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold">
                                                {selectedBusDetails.number}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <h2 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl 
                                                     font-bold text-base-content leading-tight truncate">
                                            Bus #{selectedBusDetails.number} - {selectedBusDetails.vehicleNumber}
                                        </h2>
                                        <p className="text-xs xs:text-sm sm:text-base text-base-content/70 truncate">
                                            {selectedBusDetails.modelName}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1 xs:gap-1.5 sm:gap-2 flex-shrink-0">
                                    {userRole === 'ADMIN' && (
                                        <Link href={`/manage-transport/add?id=${selectedBusDetails._id}`}>
                                            <Button
                                                outline
                                                variant='info'
                                                className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 text-xs xs:text-sm sm:text-base px-2 xs:px-3 sm:px-4 h-7 xs:h-8 sm:h-10 md:h-12"
                                            >
                                                <Edit className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5" />
                                                <span className="hidden sm:inline">Edit</span>
                                            </Button>
                                        </Link>
                                    )}
                                    <Button
                                        outline
                                        variant='error'
                                        onClick={handleDetailsModalClose}
                                        className="px-2 xs:px-3 sm:px-4 h-7 xs:h-8 sm:h-10 md:h-12"
                                    >
                                        <span className="text-sm xs:text-base sm:text-lg md:text-xl font-bold">×</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-1.5 xs:p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7">
                                {/* Basic Information */}
                                <div className="space-y-2 xs:space-y-3 sm:space-y-4 md:space-y-5">
                                    <div className="bg-base-50 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl 
                                                  p-2 xs:p-3 sm:p-4 md:p-5">
                                        <h3 className="font-semibold text-base-content mb-2 xs:mb-3 sm:mb-4 flex items-center gap-1.5 xs:gap-2 
                                                     text-sm xs:text-base sm:text-lg md:text-xl">
                                            <Bus className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                                            Bus Information
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Hash className="w-4 h-4 text-base-content/60 flex-shrink-0" />
                                                <div>
                                                    <span className="text-sm text-base-content/70">Model:</span>
                                                    <p className="font-medium text-base-content">{selectedBusDetails.modelName}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Users className="w-4 h-4 text-base-content/60 flex-shrink-0" />
                                                <div>
                                                    <span className="text-sm text-base-content/70">Capacity:</span>
                                                    <p className="font-medium text-base-content">
                                                        {selectedBusDetails.capacity ? `${selectedBusDetails.capacity} passengers` : 'Not specified'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <MapPin className="w-4 h-4 text-base-content/60 flex-shrink-0" />
                                                <div>
                                                    <span className="text-sm text-base-content/70">Route:</span>
                                                    <p className="font-medium text-base-content">{selectedBusDetails.route}</p>
                                                </div>
                                            </div>

                                            {selectedBusDetails.averageFuelCostPerMonth && (
                                                <div className="flex items-center gap-3">
                                                    <Fuel className="w-4 h-4 text-base-content/60 flex-shrink-0" />
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Average Fuel Cost/Month:</span>
                                                        <p className="font-medium text-base-content">₹{selectedBusDetails.averageFuelCostPerMonth.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Route & Fare Details */}
                                    {selectedBusDetails.routeDetails && selectedBusDetails.routeDetails.length > 0 && (
                                        <div className="bg-base-50 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl 
                                                  p-2 xs:p-3 sm:p-4 md:p-5">
                                            <div className="mb-2 xs:mb-3 sm:mb-4 flex items-center justify-between">
                                                <h3 className="font-semibold text-base-content flex items-center gap-1.5 xs:gap-2 
                                                             text-sm xs:text-base sm:text-lg md:text-xl">
                                                    <MapPin className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-secondary" />
                                                    Route & Fare Details
                                                </h3>
                                                <div className="badge badge-sm sm:badge-md bg-warning/20 text-warning border-warning/30 font-medium">
                                                    {selectedBusDetails.installments === 'monthly' && 'Monthly Installments'}
                                                    {selectedBusDetails.installments === '3months' && 'Quarterly Installments'}
                                                    {selectedBusDetails.installments === '4months' && '4 Months Installments'}
                                                    {selectedBusDetails.installments === '6months' && 'Half-Yearly Installments'}
                                                    {selectedBusDetails.installments === 'yearly' && 'One Time Installment'}
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                {selectedBusDetails.routeDetails.map((routePoint, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-base-200/50 border border-base-content/10">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">
                                                                {index + 1}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-base-content">
                                                                    {routePoint.destination}
                                                                </p>
                                                                <p className="text-xs text-base-content/60">
                                                                    {index === 0 ? 'Starting Point' :
                                                                        index === (selectedBusDetails.routeDetails?.length || 0) - 1 ? 'Final Destination' :
                                                                            `Stop ${index}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            {routePoint.amount > 0 ? (
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-lg font-bold text-success">₹{routePoint.amount}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm text-base-content/60">Starting Point</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Route Summary */}
                                                <div className="mt-4 p-3 rounded-lg bg-info/10 border border-info/30">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Location className="w-4 h-4 text-info" />
                                                            <span className="text-sm font-medium text-info">Total Routes:</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium text-info">
                                                                {selectedBusDetails.routeDetails?.length || 0} stops
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Driver 1 Details */}
                                    <div className="bg-base-50 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl 
                                                  p-2 xs:p-3 sm:p-4 md:p-5">
                                        <h3 className="font-semibold text-base-content mb-2 xs:mb-3 sm:mb-4 flex items-center gap-1.5 xs:gap-2 
                                                     text-sm xs:text-base sm:text-lg md:text-xl">
                                            <Users className="w-3.5 h-3.5 xs:w-4 xs:h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                                            Primary Driver
                                        </h3>
                                        <div className="space-y-3">
                                            <div>
                                                <span className="text-sm text-base-content/70">Name:</span>
                                                <p className="font-medium text-base-content">{selectedBusDetails.driver1Details.name}</p>
                                            </div>
                                            <div>
                                                <span className="text-sm text-base-content/70">License Number:</span>
                                                <p className="font-medium text-base-content">{selectedBusDetails.driver1Details.licenseNumber}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <span className="text-sm text-base-content/70">Phone:</span>
                                                    <p className="font-medium text-base-content">{selectedBusDetails.driver1Details.phoneNumber}</p>
                                                </div>
                                            </div>
                                            {selectedBusDetails.driver1Details.experience && (
                                                <div>
                                                    <span className="text-sm text-base-content/70">Experience:</span>
                                                    <p className="font-medium text-base-content">{selectedBusDetails.driver1Details.experience} years</p>
                                                </div>
                                            )}
                                            {selectedBusDetails.driver1Details.dateOfBirth && (
                                                <div>
                                                    <span className="text-sm text-base-content/70">Date of Birth:</span>
                                                    <p className="font-medium text-base-content">{formatDate(selectedBusDetails.driver1Details.dateOfBirth)}</p>
                                                </div>
                                            )}
                                            {selectedBusDetails.driver1Details.address && (
                                                <div>
                                                    <span className="text-sm text-base-content/70">Address:</span>
                                                    <p className="font-medium text-base-content">{selectedBusDetails.driver1Details.address}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Driver 2 Details */}
                                    {selectedBusDetails.driver2Details && (
                                        <div className="bg-base-50 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl 
                                                      p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6">
                                            <h3 className="font-semibold text-base-content mb-2 xs:mb-3 sm:mb-4 flex items-center gap-2 
                                                         text-sm xs:text-base sm:text-lg md:text-xl">
                                                <Users className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-secondary" />
                                                Secondary Driver
                                            </h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-sm text-base-content/70">Name:</span>
                                                    <p className="font-medium text-base-content">{selectedBusDetails.driver2Details.name}</p>
                                                </div>
                                                <div>
                                                    <span className="text-sm text-base-content/70">License Number:</span>
                                                    <p className="font-medium text-base-content">{selectedBusDetails.driver2Details.licenseNumber}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Phone:</span>
                                                        <p className="font-medium text-base-content">{selectedBusDetails.driver2Details.phoneNumber}</p>
                                                    </div>
                                                </div>
                                                {selectedBusDetails.driver2Details.experience && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Experience:</span>
                                                        <p className="font-medium text-base-content">{selectedBusDetails.driver2Details.experience} years</p>
                                                    </div>
                                                )}
                                                {selectedBusDetails.driver2Details.dateOfBirth && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Date of Birth:</span>
                                                        <p className="font-medium text-base-content">{formatDate(selectedBusDetails.driver2Details.dateOfBirth)}</p>
                                                    </div>
                                                )}
                                                {selectedBusDetails.driver2Details.address && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Address:</span>
                                                        <p className="font-medium text-base-content">{selectedBusDetails.driver2Details.address}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Additional Information */}
                                <div className="space-y-2 xs:space-y-3 sm:space-y-4 md:space-y-5">

                                    {/* Documents & Images */}
                                    <div className="bg-base-50 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl 
                                                  p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6">
                                        <h3 className="font-semibold text-base-content mb-2 xs:mb-3 sm:mb-4 flex items-center gap-2 
                                                     text-sm xs:text-base sm:text-lg md:text-xl">
                                            <FileIcon className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-primary" />
                                            Documents & Images
                                        </h3>
                                        {selectedBusDetails.documents && selectedBusDetails.documents.length > 0 ? (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {selectedBusDetails.documents.map((document, index) => (
                                                        <div key={index} className="border border-base-content/20 rounded-lg p-3 bg-base-100/50 hover:bg-base-100 transition-colors">
                                                            <div className="flex items-start gap-3">
                                                                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-md bg-base-100 text-primary shadow-md">
                                                                    {document.fileType === 'image' ? (
                                                                        <ImageIcon className="w-5 h-5" />
                                                                    ) : (
                                                                        <FileIcon className="w-5 h-5" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-base-content text-sm truncate" title={document.filename}>
                                                                        {document.filename}
                                                                    </p>
                                                                    <p className="text-xs text-base-content/50">
                                                                        Uploaded: {formatDate(document.uploadDate)}
                                                                    </p>
                                                                </div>
                                                                <div className="gap-1">
                                                                    {document.fileType === 'image' && (
                                                                        <button
                                                                            className="btn btn-ghost btn-md text-base-content hover:bg-base-100"
                                                                            onClick={() => handleImageClick({
                                                                                filename: document.filename,
                                                                                data: document.data,
                                                                                mimeType: document.mimeType
                                                                            })}
                                                                            title="View Image"
                                                                        >
                                                                            <Eye className="w-5 h-5" />
                                                                        </button>
                                                                    )}
                                                                    <a
                                                                        href={`data:${document.mimeType};base64,${document.data}`}
                                                                        download={document.filename}
                                                                        className="btn btn-ghost btn-md text-base-content hover:bg-base-100"
                                                                        title="Download"
                                                                    >
                                                                        <Download className="w-5 h-5" />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                {/* Documents Summary */}
                                                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <FileIcon className="w-4 h-4 text-primary" />
                                                            <span className="text-sm font-medium text-base-content">Total Documents:</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium text-base-content">
                                                                {selectedBusDetails.documents.length} file{selectedBusDetails.documents.length !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center py-6 border-2 border-dashed border-base-content/20 rounded-lg">
                                                <div className="text-center">
                                                    <FileIcon className="w-8 h-8 text-base-content/30 mx-auto mb-2" />
                                                    <p className="text-sm text-base-content/50 font-medium">No documents uploaded</p>
                                                    <p className="text-xs text-base-content/40 mt-1">No documents or images have been uploaded for this bus</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Conductor Details */}
                                    <div className="bg-base-50 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl 
                                                  p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6">
                                        <h3 className="font-semibold text-base-content mb-2 xs:mb-3 sm:mb-4 flex items-center gap-2 
                                                     text-sm xs:text-base sm:text-lg md:text-xl">
                                            <Users className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-accent" />
                                            Conductor
                                        </h3>
                                        {selectedBusDetails.conductorDetails?.name ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-sm text-base-content/70">Name:</span>
                                                    <p className="font-medium text-base-content">{selectedBusDetails.conductorDetails.name}</p>
                                                </div>
                                                {selectedBusDetails.conductorDetails.phoneNumber && (
                                                    <div className="flex items-center gap-2">
                                                        <div>
                                                            <span className="text-sm text-base-content/70">Phone:</span>
                                                            <p className="font-medium text-base-content">{selectedBusDetails.conductorDetails.phoneNumber}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedBusDetails.conductorDetails.experience && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Experience:</span>
                                                        <p className="font-medium text-base-content">{selectedBusDetails.conductorDetails.experience} years</p>
                                                    </div>
                                                )}
                                                {selectedBusDetails.conductorDetails.dateOfBirth && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Date of Birth:</span>
                                                        <p className="font-medium text-base-content">{formatDate(selectedBusDetails.conductorDetails.dateOfBirth)}</p>
                                                    </div>
                                                )}
                                                {selectedBusDetails.conductorDetails.address && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Address:</span>
                                                        <p className="font-medium text-base-content">{selectedBusDetails.conductorDetails.address}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center py-6 border-2 border-dashed border-base-content/20 rounded-lg">
                                                <div className="text-center">
                                                    <Users className="w-8 h-8 text-base-content/30 mx-auto mb-2" />
                                                    <p className="text-sm text-base-content/50 font-medium">No conductor details added</p>
                                                    <p className="text-xs text-base-content/40 mt-1">Conductor information not provided</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Insurance Details */}
                                    <div className="bg-base-50 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl 
                                                  p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6">
                                        <h3 className="font-semibold text-base-content mb-2 xs:mb-3 sm:mb-4 flex items-center gap-2 
                                                     text-sm xs:text-base sm:text-lg md:text-xl">
                                            <Shield className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-info" />
                                            Insurance Details
                                        </h3>
                                        {selectedBusDetails.insuranceDetails && (selectedBusDetails.insuranceDetails.policyNumber || selectedBusDetails.insuranceDetails.provider) ? (
                                            <div className="space-y-3">
                                                {selectedBusDetails.insuranceDetails.policyNumber && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Policy Number:</span>
                                                        <p className="font-medium text-base-content">{selectedBusDetails.insuranceDetails.policyNumber}</p>
                                                    </div>
                                                )}
                                                {selectedBusDetails.insuranceDetails.provider && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Provider:</span>
                                                        <p className="font-medium text-base-content">{selectedBusDetails.insuranceDetails.provider}</p>
                                                    </div>
                                                )}
                                                {selectedBusDetails.insuranceDetails.policyType && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Policy Type:</span>
                                                        <p className="font-medium text-base-content">{selectedBusDetails.insuranceDetails.policyType}</p>
                                                    </div>
                                                )}
                                                {selectedBusDetails.insuranceDetails.coverageAmount && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Coverage Amount:</span>
                                                        <p className="font-medium text-base-content">₹{selectedBusDetails.insuranceDetails.coverageAmount.toLocaleString()}</p>
                                                    </div>
                                                )}
                                                {selectedBusDetails.insuranceDetails.expiryDate && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Expiry Date:</span>
                                                        <p className="font-medium text-base-content">{formatDate(selectedBusDetails.insuranceDetails.expiryDate)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center py-6 border-2 border-dashed border-base-content/20 rounded-lg">
                                                <div className="text-center">
                                                    <Shield className="w-8 h-8 text-base-content/30 mx-auto mb-2" />
                                                    <p className="text-sm text-base-content/50 font-medium">No insurance details added</p>
                                                    <p className="text-xs text-base-content/40 mt-1">Insurance information not provided</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* PUC Details */}
                                    <div className="bg-base-50 border border-base-content/20 rounded-lg xs:rounded-xl sm:rounded-2xl 
                                                  p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6">
                                        <h3 className="font-semibold text-base-content mb-2 xs:mb-3 sm:mb-4 flex items-center gap-2 
                                                     text-sm xs:text-base sm:text-lg md:text-xl">
                                            <FileText className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-success" />
                                            PUC Certificate
                                        </h3>
                                        {selectedBusDetails.pucDetails && (selectedBusDetails.pucDetails.certificateNumber || selectedBusDetails.pucDetails.issuingAuthority) ? (
                                            <div className="space-y-3">
                                                {selectedBusDetails.pucDetails.certificateNumber && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Certificate Number:</span>
                                                        <p className="font-medium text-base-content">{selectedBusDetails.pucDetails.certificateNumber}</p>
                                                    </div>
                                                )}
                                                {selectedBusDetails.pucDetails.issuingAuthority && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Issuing Authority:</span>
                                                        <p className="font-medium text-base-content">{selectedBusDetails.pucDetails.issuingAuthority}</p>
                                                    </div>
                                                )}
                                                {selectedBusDetails.pucDetails.issueDate && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Issue Date:</span>
                                                        <p className="font-medium text-base-content">{formatDate(selectedBusDetails.pucDetails.issueDate)}</p>
                                                    </div>
                                                )}
                                                {selectedBusDetails.pucDetails.expiryDate && (
                                                    <div>
                                                        <span className="text-sm text-base-content/70">Expiry Date:</span>
                                                        <p className="font-medium text-base-content">{formatDate(selectedBusDetails.pucDetails.expiryDate)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center py-6 border-2 border-dashed border-base-content/20 rounded-lg">
                                                <div className="text-center">
                                                    <FileText className="w-8 h-8 text-base-content/30 mx-auto mb-2" />
                                                    <p className="text-sm text-base-content/50 font-medium">No PUC details added</p>
                                                    <p className="text-xs text-base-content/40 mt-1">PUC certificate information not provided</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>


                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const ImageModal = () => {
        if (!selectedImage) return null;

        // Handle Escape key to close modal
        useEffect(() => {
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    handleImageModalClose();
                }
            };

            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }, []);

        return (
            <div
                className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        handleImageModalClose();
                    }
                }}
            >
                <div className="relative w-full h-full flex items-center justify-center p-4 pt-20">
                    {/* Close button - Top Right */}
                    <button
                        className="absolute top-6 right-6 z-50 btn btn-circle btn-lg bg-base-100/30 hover:bg-base-100/50 border-2 border-white/20 hover:border-white/40 text-white shadow-lg backdrop-blur-sm transition-all duration-200"
                        onClick={handleImageModalClose}
                        title="Close Image"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    
                    
                    {/* Image title */}
                    <div className="absolute top-6 left-6 z-40">
                        <div className="bg-base-100/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
                            <p className="text-sm font-medium">{selectedImage?.filename}</p>
                        </div>
                    </div>
                    
                    {/* Download button */}
                    <a
                        href={`data:${selectedImage?.mimeType};base64,${selectedImage?.data}`}
                        download={selectedImage?.filename}
                        className="absolute bottom-4 right-4 z-40 btn btn-circle btn-lg bg-base-100/30 hover:bg-base-100/50 border-2 border-white/20 hover:border-white/40 text-white shadow-lg backdrop-blur-sm transition-all duration-200"
                        title="Download Image"
                    >
                        <Download className="w-5 h-5" />
                    </a>
                    
                    {/* Keyboard hint */}
                    <div className="absolute bottom-4 left-4 z-40">
                        <div className="bg-base-100/20 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs opacity-75">
                            <p>Press <kbd className="kbd kbd-xs bg-white/20 text-white">Esc</kbd> to close</p>
                        </div>
                    </div>
                    
                    {/* Main image */}
                    <div className="relative max-w-full max-h-full flex items-center justify-center">
                        <img
                            src={`data:${selectedImage?.mimeType};base64,${selectedImage?.data}`}
                            alt={selectedImage?.filename}
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col w-full h-[calc(100vh-64px)] p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100 overflow-hidden">
            {/* Mobile and Tablet: Centered container with max-width */}
            <div className="block xl:hidden h-full">
                <div className="card bg-base-300 border border-base-content/20 shadow-xl h-full w-full max-w-6xl mx-auto flex flex-col">
                    <div className="card-body p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 flex-shrink-0">
                            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content mb-4">
                                Manage Transport
                            </h1>

                            {/* Search and Add Button */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60 w-4 h-4 sm:w-5 sm:h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search buses..."
                                        className="input input-bordered w-full pl-9 sm:pl-10 bg-base-100 text-base-content text-sm sm:text-base"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {userRole === 'ADMIN' && (
                                    <Link href="/manage-transport/add">
                                        <Button variant="primary" outline className="w-full sm:w-auto">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add New Bus
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4" />
                                    <p className="text-base-content text-sm sm:text-base">Loading buses...</p>
                                </div>
                            ) : filteredBuses.length > 0 ? (
                                <>
                                    {/* Mobile Card Layout */}
                                    <div className="block md:hidden h-full">
                                        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                            <div className="space-y-3 sm:space-y-4 pb-4">
                                                {filteredBuses.map((bus) => (
                                                    <BusCard key={bus._id} bus={bus} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tablet Table Layout */}
                                    <div className="hidden md:block h-full overflow-hidden">
                                        <div className="border border-base-300 rounded-lg bg-base-100 h-full flex flex-col">
                                            <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                                <table className="table w-full">
                                                    <thead className="bg-base-200 sticky top-0 z-0">
                                                        <tr>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[150px]">Bus #</th>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[120px]">Model</th>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[200px]">Route</th>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[80px]">Capacity</th>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[150px]">Driver</th>
                                                            <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[120px]">Added</th>
                                                            {userRole === 'ADMIN' && (
                                                                <th className="text-base-content bg-base-300 text-sm lg:text-base min-w-[80px]">Actions</th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredBuses.map((bus) => (
                                                            <tr
                                                                key={bus._id}
                                                                className="hover:bg-base-200 transition-colors cursor-pointer"
                                                                onClick={() => handleBusClick(bus)}
                                                            >
                                                                <td className="text-base-content text-sm lg:text-base font-medium">#{bus.number} - {bus.vehicleNumber}</td>
                                                                <td className="text-base-content text-sm lg:text-base">{bus.modelName}</td>
                                                                <td className="text-base-content text-sm lg:text-base" title={bus.route}>
                                                                    <div className="truncate max-w-[200px]">{bus.route}</div>
                                                                </td>
                                                                <td className="text-base-content text-sm lg:text-base">{bus.capacity || 'N/A'}</td>
                                                                <td className="text-base-content text-sm lg:text-base">{bus.driver1Details.name}</td>
                                                                <td className="text-base-content text-sm lg:text-base">{formatDate(bus.createdAt)}</td>
                                                                {userRole === 'ADMIN' && (
                                                                    <td onClick={(e) => e.stopPropagation()}>
                                                                        <div className="flex gap-1 justify-center">
                                                                            <Link href={`/manage-transport/add?id=${bus._id}`}>
                                                                                <Button className="btn btn-ghost btn-sm hover:bg-info/10" title="Edit Bus">
                                                                                    <Edit className="w-4 h-4 text-info" />
                                                                                </Button>
                                                                            </Link>
                                                                            <Button
                                                                                className="btn btn-ghost btn-sm hover:bg-error/10"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteClick(bus._id);
                                                                                }}
                                                                                title="Delete Bus"
                                                                            >
                                                                                <Trash2 className="w-4 h-4 text-error" />
                                                                            </Button>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <Bus className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50 text-base-content/30" />
                                    <p className="text-base sm:text-lg font-medium mb-2 text-base-content/50">
                                        {searchTerm ? 'No buses found' : 'No buses available'}
                                    </p>
                                    <p className="text-xs sm:text-sm text-base-content/40 text-center px-4">
                                        {searchTerm
                                            ? 'Try adjusting your search terms'
                                            : userRole === 'ADMIN'
                                                ? 'Click "Add New Bus" to get started'
                                                : 'Buses will appear here once added'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Large Desktop: Full width layout */}
            <div className="hidden xl:block h-full">
                <div className="bg-base-300 border border-base-content/20 rounded-lg shadow-xl h-full w-full flex flex-col overflow-hidden">
                    <div className="p-6 xl:p-8 flex-shrink-0">
                        {/* Header */}
                        <div className="mb-6">
                            <h1 className="text-2xl xl:text-3xl font-bold text-base-content mb-6">
                                Manage Transport
                            </h1>

                            {/* Search and Add Button */}
                            <div className="flex gap-6 justify-between items-center">
                                <div className="relative flex-1 max-w-lg">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search buses..."
                                        className="input input-bordered w-full pl-10 bg-base-100 text-base-content"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {userRole === 'ADMIN' && (
                                    <Link href="/manage-transport/add">
                                        <Button variant="primary" outline className="px-6">
                                            <Plus className="w-5 h-5 mr-2" />
                                            Add New Bus
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-6 pb-6 overflow-hidden">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                                <p className="text-base-content text-lg">Loading buses...</p>
                            </div>
                        ) : filteredBuses.length > 0 ? (
                            <div className="border border-base-300 rounded-lg bg-base-100 h-full flex flex-col overflow-hidden">
                                <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                                    <table className="table w-full">
                                        <thead className="bg-base-200 sticky top-0 z-0">
                                            <tr>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[180px]">Bus Number</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[150px]">Model</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[250px]">Route</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[100px]">Capacity</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[180px]">Primary Driver</th>
                                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[140px]">Added Date</th>
                                                {userRole === 'ADMIN' && (
                                                    <th className="text-base-content font-semibold text-sm lg:text-base min-w-[100px] text-center">Actions</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredBuses.map((bus) => (
                                                <tr
                                                    key={bus._id}
                                                    className="hover:bg-base-200 transition-colors cursor-pointer"
                                                    onClick={() => handleBusClick(bus)}
                                                >
                                                    <td className="text-base-content font-medium py-4">#{bus.number} - {bus.vehicleNumber}</td>
                                                    <td className="text-base-content py-4">{bus.modelName}</td>
                                                    <td className="text-base-content py-4" title={bus.route}>
                                                        <div className="truncate max-w-[250px]">{bus.route}</div>
                                                    </td>
                                                    <td className="text-base-content py-4">{bus.capacity ? `${bus.capacity} seats` : 'N/A'}</td>
                                                    <td className="text-base-content py-4">{bus.driver1Details.name}</td>
                                                    <td className="text-base-content py-4">{formatDate(bus.createdAt)}</td>
                                                    {userRole === 'ADMIN' && (
                                                        <td className="py-4" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex gap-2 justify-center">
                                                                <Link href={`/manage-transport/add?id=${bus._id}`}>
                                                                    <Button className="btn btn-ghost btn-sm hover:bg-info/10 px-3" title="Edit Bus">
                                                                        <Edit className="w-4 h-4 text-info" />
                                                                    </Button>
                                                                </Link>
                                                                <Button
                                                                    className="btn btn-ghost btn-sm hover:bg-error/10 px-3"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteClick(bus._id);
                                                                    }}
                                                                    title="Delete Bus"
                                                                >
                                                                    <Trash2 className="w-4 h-4 text-error" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full">
                                <Bus className="w-20 h-20 mb-6 opacity-30 text-base-content/30" />
                                <h3 className="text-xl font-semibold text-base-content/50 mb-3">No buses found</h3>
                                <p className="text-base text-base-content/40 text-center max-w-lg">
                                    {searchTerm
                                        ? 'Try adjusting your search terms to find the bus you\'re looking for'
                                        : userRole === 'ADMIN'
                                            ? 'Get started by adding your first bus to the transport management system'
                                            : 'Buses will appear here once they are added to the system'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bus Details Modal */}
            {isDetailsModalOpen && <BusDetailsModal />}

            {/* Image Modal */}
            {isImageModalOpen && <ImageModal />}

            {/* Delete Confirmation Modal */}
            <ModalPopup
                isOpen={isDeleteModalOpen}
                onClose={handleDeleteCancel}
                message="Are you sure you want to delete this bus? This action cannot be undone."
                confirmButtonText="Delete"
                cancelButtonText="Cancel"
                onConfirm={handleDeleteConfirm}
                confirmButtonColor="bg-red-600"
            />
        </div>
    );
}
