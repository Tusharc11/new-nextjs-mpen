'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Upload, ChevronRight, ChevronLeft, ArrowLeft, Link } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useSidebarStore } from '@/app/components/store/useSidebarStore';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

interface Client {
    _id: string;
    clientName: string;
    clientLogo: string;
    clientWebsite?: string;
    clientDescription?: string;
    isActive: boolean;
}

interface Organization {
    _id: string;
    orgName: string;
    orgLogo: string;
    orgWebsite?: string;
    orgDescription?: string;
}

interface UserData {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    dateJoined: string;
    role: string;
    clientOrganizationId: string;
    password?: string;
}

function ManageAdminAddForm() {
    // Sidebar state
    const { isExpanded } = useSidebarStore();
    
    // Screen size state
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    
    // Form data
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [address, setAddress] = useState('');
    const [dateJoined, setDateJoined] = useState('');

    // Client and organization data
    const [clientId, setClientId] = useState('');
    const [organizationId, setOrganizationId] = useState('');
    const [clients, setClients] = useState<Client[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [clientOrgId, setClientOrgId] = useState('');

    // UI state
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [showClientForm, setShowClientForm] = useState(false);
    const [showOrgForm, setShowOrgForm] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [adminId, setAdminId] = useState('');

    // New client/org data
    const [newClient, setNewClient] = useState({
        clientName: '',
        clientLogo: '',
        clientWebsite: '',
        clientDescription: ''
    });
    const [newOrg, setNewOrg] = useState({
        orgName: '',
        orgLogo: '',
        orgWebsite: '',
        orgDescription: ''
    });

    // Image upload state
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Image upload state for organization logo
    const [orgLogoPreview, setOrgLogoPreview] = useState<string | null>(null);
    const [orgLogoBase64, setOrgLogoBase64] = useState<string | null>(null);
    const [uploadingOrgLogo, setUploadingOrgLogo] = useState(false);
    const orgFileInputRef = useRef<HTMLInputElement>(null);
    const adminRole = "ADMIN";

    const router = useRouter();
    const searchParams = useSearchParams();

    // Track screen size for responsive modal behavior
    useEffect(() => {
        const checkScreenSize = () => {
            setIsSmallScreen(window.innerWidth < 640);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Check if we're in edit mode
    useEffect(() => {
        const id = searchParams.get('id');
        if (id) {
            setIsEditMode(true);
            setAdminId(id);
            fetchAdminData(id);
        }
    }, [searchParams]);

    // Fetch admin data for editing
    const fetchAdminData = async (id: string) => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/manage-staff?id=${id}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch admin data');
            }
            
            const adminData = await response.json();
            
            // Populate form fields with admin data
            setFirstName(adminData.firstName || '');
            setLastName(adminData.lastName || '');
            setEmail(adminData.email || '');
            setAddress(adminData.address || '');
            setDateJoined(adminData.dateJoined ? new Date(adminData.dateJoined).toISOString().split('T')[0] : '');
            
            // If admin has client and organization, set those too
            if (adminData.clientOrganizationId) {
                setClientOrgId(adminData.clientOrganizationId._id);
                
                if (adminData.clientOrganizationId.clientId) {
                    setClientId(adminData.clientOrganizationId.clientId._id);
                    // Fetch organizations for this client
                    await fetchOrganizationsForClient(adminData.clientOrganizationId.clientId._id);
                }
                
                if (adminData.clientOrganizationId.organizationId) {
                    setOrganizationId(adminData.clientOrganizationId.organizationId._id);
                }
            }
            
        } catch (error) {
            toast.error('Failed to load admin data');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch clients for dropdown
    const fetchClients = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/clients');
            if (response.ok) {
                const data = await response.json();
                setClients(data);
            } else {
                toast.error('Failed to fetch clients');
            }
        } catch (error) {
            toast.error('An error occurred while fetching clients');
        } finally {
            setIsLoading(false);
        }
    };

    // Initial data fetch
    useEffect(() => {
        fetchClients();
    }, []);

    // Fetch organizations for a specific client
    const fetchOrganizationsForClient = async (selectedClientId: string) => {
        if (!selectedClientId) {
            setOrganizations([]);
            return;
        }

        try {
            // Include a parameter to fetch default org if no mappings exist
            const response = await fetch(`/api/organizations?clientId=${selectedClientId}&includeDefault=true`);
            if (response.ok) {
                const data = await response.json();
                setOrganizations(data);
            } else {
                setOrganizations([]);
                toast.error('Failed to fetch organizations');
            }
        } catch (error) {
            setOrganizations([]);
            toast.error('An error occurred while fetching organizations');
        }
    };

    // Handle client selection change
    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedClientId = e.target.value;
        setClientId(selectedClientId);
        setOrganizationId(''); // Reset organization when client changes

        if (selectedClientId) {
            fetchOrganizationsForClient(selectedClientId);
        } else {
            setOrganizations([]);
        }
    };

    // Handle next step
    const handleNextStep = async () => {
        if (currentStep === 1) {
            // Validate first step
            if (!clientId) {
                toast.error('Please select a client');
                return;
            }

            if (!organizationId) {
                toast.error('Please select an organization');
                return;
            }

            setIsLoading(true);

            try {
                // Check if client-org combination exists, if not create it
                const response = await fetch('/api/client-organization', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        clientId,
                        organizationId
                    }),
                });

                const data = await response.json();

                if (response.ok) {
                    setClientOrgId(data._id);
                    setCurrentStep(2);
                } else {
                    toast.error(data.error || 'Failed to validate client-organization relationship');
                }
            } catch (error) {
                toast.error('An error occurred while processing your request');
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Handle previous step
    const handlePrevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!firstName || !lastName || !email || (!isEditMode && !password)) {
            toast.error('Please fill in all required fields');
            return;
        }
        
        try {
            setIsLoading(true);
            
            const userData: UserData = {
                firstName,
                lastName,
                email,
                address,
                dateJoined: dateJoined || new Date().toISOString().split('T')[0],
                role: 'ADMIN',
                clientOrganizationId: clientOrgId,
            };
            
            // Only include password for new admins
            if (!isEditMode && password) {
                userData.password = password;
            }
            
            const url = isEditMode 
                ? `/api/auth/signup?id=${adminId}` 
                : '/api/auth/signup';
                
            const method = isEditMode ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save admin');
            }
            
            toast.success(isEditMode ? 'Admin updated successfully' : 'Admin created successfully');
            router.push('/manage-admin');
            
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save admin';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size should be less than 5MB');
            return;
        }

        try {
            // Compress the image
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1024,
                useWebWorker: true
            };

            setUploadingLogo(true);
            const compressedFile = await imageCompression(file, options);

            // Create preview and store base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setLogoPreview(base64String);
                setLogoBase64(base64String);
                setUploadingLogo(false);
            };

            reader.readAsDataURL(compressedFile);
        } catch (error) {
            toast.error('Failed to process logo');
            setUploadingLogo(false);
        }
    };

    // Handle client creation success
    const handleClientCreationSuccess = (newClient: Client) => {
        // Add the new client to the list
        setClients((prevClients: Client[]) => [...prevClients, newClient]);

        // Select the newly created client
        setClientId(newClient._id);

        // Reset the organization selection
        setOrganizationId('');
        setOrganizations([]);

        // Close the form
        setShowClientForm(false);

        // Reset the form data
        setNewClient({
            clientName: '',
            clientLogo: '',
            clientWebsite: '',
            clientDescription: ''
        });
        setLogoPreview(null);
        setLogoBase64(null);

        // Show success message
        toast.success('Client created successfully');
    };

    const handleAddClient = async () => {
        if (!newClient.clientName) {
            toast.error('Client name is required');
            return;
        }

        if (!logoBase64) {
            toast.error('Logo is required');
            return;
        }

        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientName: newClient.clientName,
                    clientLogo: logoBase64,
                    clientWebsite: newClient.clientWebsite || '',
                    clientDescription: newClient.clientDescription || '',
                    isActive: true
                }),
            });

            if (response.ok) {
                const data = await response.json();
                handleClientCreationSuccess(data);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to create client');
            }
        } catch (error) {
            toast.error('An error occurred while creating client');
        }
    };

    const handleOrgLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size should be less than 5MB');
            return;
        }

        try {
            // Compress the image
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1024,
                useWebWorker: true
            };

            setUploadingOrgLogo(true);
            const compressedFile = await imageCompression(file, options);

            // Create preview and store base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setOrgLogoPreview(base64String);
                setOrgLogoBase64(base64String);
                setUploadingOrgLogo(false);
            };

            reader.readAsDataURL(compressedFile);
        } catch (error) {
            toast.error('Failed to process logo');
            setUploadingOrgLogo(false);
        }
    };

    const handleAddOrganization = async () => {
        if (!newOrg.orgName) {
            toast.error('Organization name is required');
            return;
        }

        if (!clientId) {
            toast.error('Please select a client first');
            return;
        }

        try {
            // First create the organization
            const response = await fetch('/api/organizations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    organizationName: newOrg.orgName,
                    organizationLogo: orgLogoBase64 || '',
                    organizationWebsite: newOrg.orgWebsite || '',
                    organizationDescription: newOrg.orgDescription || '',
                    isActive: true
                }),
            });

            if (response.ok) {
                const orgData = await response.json();

                // Then create the client-organization mapping
                const mappingResponse = await fetch('/api/client-organization', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        clientId,
                        organizationId: orgData._id
                    }),
                });

                if (mappingResponse.ok) {
                    // Refresh the organizations list for this client
                    fetchOrganizationsForClient(clientId);

                    // Reset form
                    setNewOrg({
                        orgName: '',
                        orgLogo: '',
                        orgWebsite: '',
                        orgDescription: ''
                    });
                    setOrgLogoPreview(null);
                    setOrgLogoBase64(null);
                    setShowOrgForm(false);

                    toast.success('Organization created successfully');

                    // Set the newly created organization as the selected organization
                    setOrganizationId(orgData._id);
                } else {
                    const errorData = await mappingResponse.json();
                    toast.error(errorData.error || 'Failed to map organization to client');
                }
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to create organization');
            }
        } catch (error) {
            toast.error('An error occurred while creating organization');
        }
    };

    if (isLoading && !clients.length) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-base-100">
                <div className="text-center">
                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-12 h-12 mx-auto" />
                    <p className="mt-4 text-base-content">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-screen p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100 overflow-hidden">
            <div className="max-w-4xl mx-auto w-full bg-base-200 rounded-lg shadow-sm overflow-hidden h-full flex flex-col">
                <div className="p-4 sm:p-6 md:p-8 flex-1 overflow-y-auto">
                    <h1 className="text-xl sm:text-2xl font-bold mb-2 text-base-content">
                        {isEditMode ? 'Edit Admin Account' : 'Create Admin Account'}
                    </h1>
                    <p className="text-sm sm:text-base text-base-content/70 mb-4 sm:mb-6">
                        {isEditMode ? 'Update administrator details' : 'Add a new administrator to the system'}
                    </p>

                    <div className="w-full mb-6 sm:mb-8">
                        <ul className="steps w-full">
                            <li className={`text-base-content step text-xs sm:text-sm ${currentStep >= 1 ? 'step-primary' : ''}`}>
                                <span className="hidden sm:inline">Client & Organization</span>
                                <span className="sm:hidden">Client</span>
                            </li>
                            <li className={`text-base-content step text-xs sm:text-sm ${currentStep >= 2 ? 'step-primary' : ''}`}>
                                <span className="hidden sm:inline">Admin Details</span>
                                <span className="sm:hidden">Details</span>
                            </li>
                        </ul>
                    </div>

                    {currentStep === 1 && (
                        <form className="space-y-4 sm:space-y-6">
                            <div className="grid grid-cols-1 gap-4 sm:gap-6">
                                {/* Client Selection */}
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-sm sm:text-base font-medium text-base-content">Client<span className="text-red-500">*</span></span>
                                    </label>
                                    <div className="flex gap-2 sm:gap-3">
                                        <select
                                            value={clientId}
                                            onChange={handleClientChange}
                                            className="select select-bordered flex-1 bg-base-100 text-base-content text-sm sm:text-base"
                                            required
                                            disabled={isLoading}
                                        >
                                            <option value="">Select Client</option>
                                            {clients.length > 0 ? (
                                                clients.map((client: any) => (
                                                    <option key={client._id} value={client._id}>
                                                        {client.clientName}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="" disabled>No clients available</option>
                                            )}
                                        </select>
                                        {!isEditMode && (
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-square text-sm sm:text-base"
                                                onClick={() => setShowClientForm(true)}
                                                disabled={isLoading}
                                            >
                                                +
                                            </button>
                                        )}
                                    </div>
                                    {clients.length === 0 && !isLoading && (
                                        <p className="text-xs sm:text-sm text-base-content/70 mt-1">No clients found. Please add a client first.</p>
                                    )}
                                </div>

                                {/* Organization Selection */}
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-sm sm:text-base font-medium text-base-content">Organization<span className="text-red-500">*</span></span>
                                    </label>
                                    <div className="flex gap-2 sm:gap-3">
                                        <select
                                            value={organizationId}
                                            onChange={(e) => setOrganizationId(e.target.value)}
                                            className="select select-bordered flex-1 bg-base-100 text-base-content text-sm sm:text-base"
                                            required
                                            disabled={!clientId}
                                        >
                                            <option value="">Select Organization</option>
                                            {organizations.length > 0 ? (
                                                organizations.map((org: any) => (
                                                    <option key={org._id} value={org._id}>
                                                        {org.organizationName}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="" disabled>No organizations available</option>
                                            )}
                                        </select>
                                        {!isEditMode && (
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-square text-sm sm:text-base"
                                                onClick={() => setShowOrgForm(true)}
                                                disabled={!clientId}
                                            >
                                                +
                                            </button>
                                        )}
                                    </div>
                                    {!clientId ? (
                                        <p className="text-xs sm:text-sm text-base-content/70 mt-1">Please select a client first</p>
                                    ) : organizations.length === 0 ? (
                                        <p className="text-xs sm:text-sm text-base-content/70 mt-1">No organizations found for this client. Please add one.</p>
                                    ) : null}
                                </div>

                                <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
                                    <Button
                                        type="button"
                                        variant="error"
                                        outline
                                        onClick={() => router.push('/manage-admin')}
                                        disabled={isLoading}
                                        className="px-4 sm:px-6 w-full sm:w-auto order-2 sm:order-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        outline
                                        onClick={handleNextStep}
                                        disabled={isLoading}
                                        className="px-4 sm:px-6 w-full sm:w-auto order-1 sm:order-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Next
                                                <ChevronRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    )}

                    {currentStep === 2 && (
                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                            {/* Row 1: First Name and Last Name */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {/* First Name */}
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-sm sm:text-base font-medium text-base-content">First Name<span className="text-red-500">*</span></span>
                                    </label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="input input-bordered w-full bg-base-100 text-base-content text-sm sm:text-base"
                                        placeholder="Enter First Name"
                                        required
                                    />
                                </div>

                                {/* Last Name */}
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-sm sm:text-base font-medium text-base-content">Last Name<span className="text-red-500">*</span></span>
                                    </label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="input input-bordered w-full bg-base-100 text-base-content text-sm sm:text-base"
                                        placeholder="Enter Last Name"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Row 2: Email and Password */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {/* Email */}
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-sm sm:text-base font-medium text-base-content">Email<span className="text-red-500">*</span></span>
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input input-bordered w-full bg-base-100 text-base-content text-sm sm:text-base"
                                        placeholder="Enter Email"
                                        required
                                    />
                                </div>

                                {/* Password */}
                                {!isEditMode && (
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-sm sm:text-base font-medium text-base-content">Password<span className="text-red-500">*</span></span>
                                        </label>
                                        <input
                                            type="text"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input input-bordered w-full bg-base-100 text-base-content text-sm sm:text-base"
                                            placeholder="Enter Password"
                                            required={!isEditMode}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Row 3: Date Joined */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {/* Date Joined */}
                                <div className="form-control w-full">
                                    <label className="label">
                                        <span className="label-text text-sm sm:text-base font-medium text-base-content">Date Joined</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={dateJoined}
                                        onChange={(e) => setDateJoined(e.target.value)}
                                        className="input input-bordered w-full bg-base-100 text-base-content text-sm sm:text-base"
                                    />
                                    <p className="text-xs sm:text-sm text-base-content/70 mt-1">If not specified, current date will be used</p>
                                </div>
                            </div>

                            {/* Row 4: Address */}
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text text-sm sm:text-base font-medium text-base-content">Address<span className="text-red-500">*</span></span>
                                </label>
                                <textarea
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="textarea textarea-bordered w-full bg-base-100 text-base-content text-sm sm:text-base"
                                    placeholder="Enter Address"
                                    rows={2}
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4 sm:pt-6">
                                <Button
                                    type="button"
                                    outline
                                    variant="ghost"
                                    onClick={handlePrevStep}
                                    className="px-4 sm:px-6 w-full sm:w-auto order-2 sm:order-1"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    outline
                                    disabled={isLoading}
                                    className="px-4 sm:px-6 w-full sm:w-auto order-1 sm:order-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            {isEditMode ? 'Updating...' : 'Creating...'}
                                        </>
                                    ) : (
                                        isEditMode ? 'Update Admin' : 'Create Admin'
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Modal for adding new client */}
            {showClientForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
                    <div 
                        className="bg-base-100 p-4 sm:p-6 md:p-8 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto"
                        style={{
                            maxWidth: isSmallScreen ? '90vw' : `min(calc(100vw - ${isExpanded ? '20rem' : '8rem'}), 32rem)`,
                            marginLeft: isSmallScreen ? '0' : (isExpanded ? '8rem' : '2rem')
                        }}
                    >
                        <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-base-content">Add New Client</h3>

                        <div className="grid grid-cols-1 gap-4 sm:gap-5">
                            {/* Row 1: Name and Logo */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {/* Client Name */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium text-base-content">Client Name*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered bg-base-100 text-base-content"
                                        value={newClient.clientName}
                                        onChange={(e) => setNewClient({ ...newClient, clientName: e.target.value })}
                                        placeholder="Enter Client Name"
                                        required
                                    />
                                </div>

                                {/* Logo Upload */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium text-base-content">Logo*</span>
                                    </label>

                                    {/* File Input */}
                                    <div className="relative group h-[42px]">
                                        <div
                                            className="flex items-center justify-center w-full h-full border rounded-lg cursor-pointer bg-base-200 border-base-300 hover:bg-base-300"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="w-4 h-4 mr-2 text-base-content" />
                                            <span className="text-sm text-base-content">Upload</span>
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                        />
                                        {uploadingLogo && (
                                            <div className="absolute inset-0 bg-base-300/50 flex items-center justify-center">
                                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Logo Preview */}
                            {logoPreview && (
                                <div className="relative w-full h-32 bg-base-300 rounded-lg overflow-hidden flex items-center justify-center">
                                    <img
                                        src={logoPreview}
                                        alt="Logo Preview"
                                        className="max-w-full max-h-full object-contain p-2"
                                    />
                                </div>
                            )}

                            {/* Row 2: Website */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium text-base-content">Website</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered bg-base-100 text-base-content"
                                    value={newClient.clientWebsite}
                                    onChange={(e) => setNewClient({ ...newClient, clientWebsite: e.target.value })}
                                    placeholder="Enter Website URL"
                                />
                            </div>

                            {/* Description */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium text-base-content">Description</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered bg-base-100 text-base-content"
                                    value={newClient.clientDescription}
                                    onChange={(e) => setNewClient({ ...newClient, clientDescription: e.target.value })}
                                    placeholder="Enter Description"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-4 sm:mt-6">
                            <Button
                                type="button"
                                variant="error"
                                outline
                                onClick={() => {
                                    setShowClientForm(false);
                                    setLogoPreview(null);
                                    setLogoBase64(null);
                                    setNewClient({
                                        clientName: '',
                                        clientLogo: '',
                                        clientWebsite: '',
                                        clientDescription: ''
                                    });
                                }}
                                className="px-4 w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                outline
                                onClick={handleAddClient}
                                disabled={uploadingLogo}
                                className="px-4 w-full sm:w-auto"
                            >
                                {uploadingLogo ? 'Uploading...' : 'Add Client'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for adding new organization */}
            {showOrgForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
                    <div 
                        className="bg-base-100 p-4 sm:p-6 md:p-8 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto"
                        style={{
                            maxWidth: isSmallScreen ? '90vw' : `min(calc(100vw - ${isExpanded ? '20rem' : '8rem'}), 32rem)`,
                            marginLeft: isSmallScreen ? '0' : (isExpanded ? '8rem' : '2rem')
                        }}
                    >
                        <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-base-content">Add New Organization</h3>

                        <div className="grid grid-cols-1 gap-4 sm:gap-5">
                            {/* Row 1: Name and Logo */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {/* Organization Name */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium text-base-content">Organization Name*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered bg-base-100 text-base-content"
                                        value={newOrg.orgName}
                                        onChange={(e) => setNewOrg({ ...newOrg, orgName: e.target.value })}
                                        placeholder="Enter Organization Name"
                                        required
                                    />
                                </div>

                                {/* Logo Upload - now optional */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium text-base-content">Logo</span>
                                    </label>

                                    {/* File Input */}
                                    <div className="relative group h-[42px]">
                                        <div
                                            className="flex items-center justify-center w-full h-full border rounded-lg cursor-pointer bg-base-200 border-base-300 hover:bg-base-300"
                                            onClick={() => orgFileInputRef.current?.click()}
                                        >
                                            <Upload className="w-4 h-4 mr-2 text-base-content" />
                                            <span className="text-sm text-base-content">Upload</span>
                                        </div>
                                        <input
                                            ref={orgFileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleOrgLogoChange}
                                        />
                                        {uploadingOrgLogo && (
                                            <div className="absolute inset-0 bg-base-300/50 flex items-center justify-center">
                                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Logo Preview */}
                            {orgLogoPreview && (
                                <div className="relative w-full h-32 bg-base-300 rounded-lg overflow-hidden flex items-center justify-center">
                                    <img
                                        src={orgLogoPreview}
                                        alt="Logo Preview"
                                        className="max-w-full max-h-full object-contain p-2"
                                    />
                                </div>
                            )}

                            {/* Row 2: Website */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium text-base-content">Website</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered bg-base-100 text-base-content"
                                    value={newOrg.orgWebsite}
                                    onChange={(e) => setNewOrg({ ...newOrg, orgWebsite: e.target.value })}
                                    placeholder="Enter Website URL"
                                />
                            </div>

                            {/* Description */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium text-base-content">Description</span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered bg-base-100 text-base-content"
                                    value={newOrg.orgDescription}
                                    onChange={(e) => setNewOrg({ ...newOrg, orgDescription: e.target.value })}
                                    placeholder="Enter Description"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-4 sm:mt-6">
                            <Button
                                type="button"
                                variant="error"
                                outline
                                onClick={() => {
                                    setShowOrgForm(false);
                                    setOrgLogoPreview(null);
                                    setOrgLogoBase64(null);
                                    setNewOrg({
                                        orgName: '',
                                        orgLogo: '',
                                        orgWebsite: '',
                                        orgDescription: ''
                                    });
                                }}
                                className="px-4 w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                outline
                                onClick={handleAddOrganization}
                                disabled={uploadingOrgLogo}
                                className="px-4 w-full sm:w-auto"
                            >
                                {uploadingOrgLogo ? 'Uploading...' : 'Add Organization'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ManageAdminAddPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-base-100">
                <div className="text-center">
                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-12 h-12 mx-auto" />
                    <p className="mt-4 text-base-content">Loading...</p>
                </div>
            </div>
        }>
            <ManageAdminAddForm />
        </Suspense>
    );
}