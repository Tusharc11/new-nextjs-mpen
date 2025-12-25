'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/app/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, ChevronDown, Bus, Users, Shield, FileText, Fuel, Car, Plus, X } from 'lucide-react';

const formSchema = (isUpdate: boolean) => z.object({
    modelName: z.string()
        .transform(val => val.trim())
        .refine(val => val.length > 0, "Model name is required")
        .refine(val => val.length >= 2, "Model name must be at least 2 characters long"),

    vehicleNumber: z.string()
        .transform(val => val.trim().toUpperCase())
        .refine(val => val.length > 0, "Vehicle number is required")
        .refine(val => {
            // Remove spaces and hyphens for pattern matching
            const cleanedVal = val.replace(/[\s-]/g, '');
            // Indian vehicle registration pattern: 2 letters + 2 digits + 1-3 letters + 1-4 digits
            // Examples: TN01AB1234, KA05MN6789, DL8CAF1234, etc.
            const vehiclePattern = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$/;
            return vehiclePattern.test(cleanedVal);
        }, "Vehicle number must follow the format: XX##YYY#### (e.g., TN01AB1234)")
        .refine(val => /^[A-Z0-9\s-]+$/.test(val), "Vehicle number must contain only letters, numbers, spaces, and hyphens"),

    capacity: z.string()
        .transform(val => val.trim())
        .refine(val => !val || val === "" || /^\d+$/.test(val), "Capacity must be a number"),

    route: z.string()
        .transform(val => val.trim())
        .refine(val => val.length > 0, "At least starting point and one destination are required")
        .refine(val => val.split(' → ').filter(dest => dest.trim()).length >= 2, "At least starting point and one destination are required"),

    averageFuelCostPerMonth: z.string()
        .transform(val => val.trim())
        .refine(val => !val || val === "" || /^\d+(\.\d{1,2})?$/.test(val), "Must be a valid amount (e.g., 15000.50)"),

    installments: z.string()
        .transform(val => val.trim())
        .refine(val => val.length > 0, "Installment type is required"),

    // Insurance Details (Optional)
    insurancePolicyNumber: z.string()
        .transform(val => val.trim())
        .optional(),

    insuranceProvider: z.string()
        .transform(val => val.trim())
        .optional(),

    insuranceExpiryDate: z.string()
        .transform(val => val.trim())
        .optional(),

    insuranceCoverageAmount: z.string()
        .transform(val => val.trim())
        .refine(val => !val || val === "" || /^\d+(\.\d{1,2})?$/.test(val), "Must be a valid amount")
        .optional(),

    insurancePolicyType: z.string()
        .transform(val => val.trim())
        .optional(),

    // Driver 1 Details (Required)
    driver1Name: z.string()
        .transform(val => val.trim())
        .refine(val => val.length > 0, "Driver 1 name is required")
        .refine(val => val.length >= 2, "Driver 1 name must be at least 2 characters long"),

    driver1LicenseNumber: z.string()
        .transform(val => val.trim())
        .refine(val => val.length > 0, "Driver 1 license number is required"),

    driver1PhoneNumber: z.string()
        .transform(val => val.trim())
        .refine(val => val.length > 0, "Driver 1 phone number is required")
        .refine(val => /^\+\d{1,4}\s\d{10}$/.test(val), "Driver 1 phone number must be in format: +countrycode phonenumber"),

    driver1Address: z.string()
        .transform(val => val.trim()),

    driver1Experience: z.string()
        .transform(val => val.trim())
        .refine(val => !val || val === "" || /^\d+$/.test(val), "Experience must be a number"),

    driver1DateOfBirth: z.string()
        .transform(val => val.trim()),

    // Driver 2 Details (Optional)
    driver2Name: z.string().optional(),
    driver2LicenseNumber: z.string().optional(),
    driver2PhoneNumber: z.string().optional()
        .refine(val => !val || val === "" || /^\+\d{1,4}\s\d{10}$/.test(val), "Driver 2 phone number must be in format: +countrycode phonenumber"),
    driver2Address: z.string().optional(),
    driver2Experience: z.string().optional()
        .refine(val => !val || val === "" || /^\d+$/.test(val), "Experience must be a number"),
    driver2DateOfBirth: z.string().optional(),

    // Conductor Details (Optional)
    conductorName: z.string().optional(),
    conductorPhoneNumber: z.string().optional()
        .refine(val => !val || val === "" || /^\+\d{1,4}\s\d{10}$/.test(val), "Conductor phone number must be in format: +countrycode phonenumber"),
    conductorAddress: z.string().optional(),
    conductorExperience: z.string().optional()
        .refine(val => !val || val === "" || /^\d+$/.test(val), "Experience must be a number"),
    conductorDateOfBirth: z.string().optional(),

    // PUC Details (Optional)
    pucCertificateNumber: z.string()
        .transform(val => val.trim())
        .optional(),

    pucIssueDate: z.string()
        .transform(val => val.trim())
        .optional(),

    pucExpiryDate: z.string()
        .transform(val => val.trim())
        .optional(),

    pucIssuingAuthority: z.string()
        .transform(val => val.trim())
        .optional(),
});

type FormData = z.infer<ReturnType<typeof formSchema>>;

interface Country {
    code: string;
    flag: string;
    name: string;
    cca2: string;
}

const validatePhoneInput = (input: string) => {
    return input.replace(/\D/g, '');
};

const getFlagForCountryCode = (code: string, countries: Country[]) => {
    const country = countries.find(c => c.code === code);
    return country ? country.flag : '🇮🇳';
};

function AddBusForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const isUpdate = !!id;

    // Country and phone state
    const [countries, setCountries] = useState<Country[]>([]);

    // Driver 1 phone state
    const [driver1CountryCode, setDriver1CountryCode] = useState("+91");
    const [driver1PhoneNumber, setDriver1PhoneNumber] = useState("");
    const [showDriver1CountryDropdown, setShowDriver1CountryDropdown] = useState(false);

    // Driver 2 phone state
    const [driver2CountryCode, setDriver2CountryCode] = useState("+91");
    const [driver2PhoneNumber, setDriver2PhoneNumber] = useState("");
    const [showDriver2CountryDropdown, setShowDriver2CountryDropdown] = useState(false);

    // Conductor phone state
    const [conductorCountryCode, setConductorCountryCode] = useState("+91");
    const [conductorPhoneNumber, setConductorPhoneNumber] = useState("");
    const [showConductorCountryDropdown, setShowConductorCountryDropdown] = useState(false);

    // Driver 2 visibility state
    const [showDriver2Form, setShowDriver2Form] = useState(false);

    // Insurance form visibility state
    const [showInsuranceForm, setShowInsuranceForm] = useState(false);

    // Conductor form visibility state
    const [showConductorForm, setShowConductorForm] = useState(false);

    // PUC form visibility state
    const [showPucForm, setShowPucForm] = useState(false);

    // Document upload state
    const [documents, setDocuments] = useState<any[]>([]);
    const [documentUploadError, setDocumentUploadError] = useState<string>('');
    const [isUploadingDocument, setIsUploadingDocument] = useState(false);

    // Route destinations state
    interface RouteDestination {
        destination: string;
        amount: string;
    }
    const [routeDestinations, setRouteDestinations] = useState<RouteDestination[]>([
        { destination: '', amount: '0' }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculate date limits
    const today = new Date();
    const maxBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const minBirthDate = new Date(today.getFullYear() - 70, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const minInsuranceDate = today.toISOString().split('T')[0];
    const minPucDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];

    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
        resolver: zodResolver(formSchema(isUpdate)),
    });

    // Watch route value for form validation
    const routeValue = watch('route');

    // Fetch countries for phone number dropdown
    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const response = await fetch('https://restcountries.com/v3.1/all?fields=name,flags,idd,cca2');
                if (!response.ok) {
                    throw new Error('Failed to fetch countries');
                }

                const data: any[] = await response.json();

                const formattedCountries = data
                    .filter(country => country.idd.root)
                    .map(country => {
                        const suffix = country.idd.suffixes && country.idd.suffixes.length > 0 ? country.idd.suffixes[0] : '';
                        const code = `${country.idd.root}${suffix}`;

                        return {
                            code,
                            flag: country.flag,
                            name: country.name.common,
                            cca2: country.cca2
                        };
                    })
                    .sort((a, b) => a.name.localeCompare(b.name));

                setCountries(formattedCountries);
            } catch (error) {
                toast.error('Error fetching countries');
            }
        };

        fetchCountries();
    }, []);

    // Fetch bus data for editing
    useEffect(() => {
        if (isUpdate && id) {
            const fetchBusData = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`/api/manage-transport?id=${id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch bus data');
                    }

                    const busData = await response.json();

                    // Populate form with existing data
                    setValue('modelName', busData.modelName || '');
                    setValue('vehicleNumber', busData.vehicleNumber || '');
                    setValue('capacity', busData.capacity?.toString() || '');
                    setValue('averageFuelCostPerMonth', busData.averageFuelCostPerMonth?.toString() || '');
                    setValue('installments', busData.installments || '');

                    // Load documents if they exist
                    if (busData.documents && Array.isArray(busData.documents) && busData.documents.length > 0) {
                        setDocuments(busData.documents);
                    }

                    // Route data
                    if (busData.routeDetails && Array.isArray(busData.routeDetails) && busData.routeDetails.length > 0) {
                        const routeDestinations = busData.routeDetails.map((route: any) => ({
                            destination: route.destination || '',
                            amount: route.amount?.toString() || '0'
                        }));
                        setRouteDestinations(routeDestinations);
                        setValue('route', routeDestinations.map((dest: any) => dest.destination).join(' → '));
                    } else {
                        setValue('route', busData.route || '');
                    }

                    // Driver 1 details
                    if (busData.driver1Details) {
                        setValue('driver1Name', busData.driver1Details.name || '');
                        setValue('driver1LicenseNumber', busData.driver1Details.licenseNumber || '');
                        setValue('driver1Address', busData.driver1Details.address || '');
                        setValue('driver1Experience', busData.driver1Details.experience?.toString() || '');
                        setValue('driver1DateOfBirth', busData.driver1Details.dateOfBirth ? new Date(busData.driver1Details.dateOfBirth).toISOString().split('T')[0] : '');

                        if (busData.driver1Details.phoneNumber) {
                            const phoneMatch = busData.driver1Details.phoneNumber.match(/^(\+\d+)\s*(.*)$/);
                            if (phoneMatch) {
                                setDriver1CountryCode(phoneMatch[1]);
                                setDriver1PhoneNumber(phoneMatch[2]);
                                setValue('driver1PhoneNumber', busData.driver1Details.phoneNumber);
                            }
                        }
                    }

                    // Driver 2 details
                    if (busData.driver2Details) {
                        setShowDriver2Form(true);
                        setValue('driver2Name', busData.driver2Details.name || '');
                        setValue('driver2LicenseNumber', busData.driver2Details.licenseNumber || '');
                        setValue('driver2Address', busData.driver2Details.address || '');
                        setValue('driver2Experience', busData.driver2Details.experience?.toString() || '');
                        setValue('driver2DateOfBirth', busData.driver2Details.dateOfBirth ? new Date(busData.driver2Details.dateOfBirth).toISOString().split('T')[0] : '');

                        if (busData.driver2Details.phoneNumber) {
                            const phoneMatch = busData.driver2Details.phoneNumber.match(/^(\+\d+)\s*(.*)$/);
                            if (phoneMatch) {
                                setDriver2CountryCode(phoneMatch[1]);
                                setDriver2PhoneNumber(phoneMatch[2]);
                                setValue('driver2PhoneNumber', busData.driver2Details.phoneNumber);
                            }
                        }
                    }

                    // Conductor details
                    if (busData.conductorDetails && busData.conductorDetails.name) {
                        setShowConductorForm(true);
                        setValue('conductorName', busData.conductorDetails.name || '');
                        setValue('conductorAddress', busData.conductorDetails.address || '');
                        setValue('conductorExperience', busData.conductorDetails.experience?.toString() || '');
                        setValue('conductorDateOfBirth', busData.conductorDetails.dateOfBirth ? new Date(busData.conductorDetails.dateOfBirth).toISOString().split('T')[0] : '');

                        if (busData.conductorDetails.phoneNumber) {
                            const phoneMatch = busData.conductorDetails.phoneNumber.match(/^(\+\d+)\s*(.*)$/);
                            if (phoneMatch) {
                                setConductorCountryCode(phoneMatch[1]);
                                setConductorPhoneNumber(phoneMatch[2]);
                                setValue('conductorPhoneNumber', busData.conductorDetails.phoneNumber);
                            }
                        }
                    }

                    // Insurance details
                    if (busData.insuranceDetails && (busData.insuranceDetails.policyNumber || busData.insuranceDetails.provider)) {
                        setShowInsuranceForm(true);
                        setValue('insurancePolicyNumber', busData.insuranceDetails.policyNumber || '');
                        setValue('insuranceProvider', busData.insuranceDetails.provider || '');
                        setValue('insurancePolicyType', busData.insuranceDetails.policyType || '');
                        setValue('insuranceCoverageAmount', busData.insuranceDetails.coverageAmount?.toString() || '');
                        setValue('insuranceExpiryDate', busData.insuranceDetails.expiryDate ? new Date(busData.insuranceDetails.expiryDate).toISOString().split('T')[0] : '');
                    }

                    // PUC details
                    if (busData.pucDetails && (busData.pucDetails.certificateNumber || busData.pucDetails.issuingAuthority)) {
                        setShowPucForm(true);
                        setValue('pucCertificateNumber', busData.pucDetails.certificateNumber || '');
                        setValue('pucIssuingAuthority', busData.pucDetails.issuingAuthority || '');
                        setValue('pucIssueDate', busData.pucDetails.issueDate ? new Date(busData.pucDetails.issueDate).toISOString().split('T')[0] : '');
                        setValue('pucExpiryDate', busData.pucDetails.expiryDate ? new Date(busData.pucDetails.expiryDate).toISOString().split('T')[0] : '');
                    }

                } catch (error) {
                    console.error('Error fetching bus data:', error);
                    toast.error('Failed to load bus data for editing');
                }
            };

            fetchBusData();
        }
    }, [isUpdate, id, setValue]);

    // Phone number handlers
    const handleDriver1PhoneChange = (value: string) => {
        const cleanedValue = validatePhoneInput(value);
        setDriver1PhoneNumber(cleanedValue);

        if (cleanedValue.length === 10) {
            const fullPhoneNumber = `${driver1CountryCode} ${cleanedValue}`;
            setValue("driver1PhoneNumber", fullPhoneNumber);
        } else {
            setValue("driver1PhoneNumber", "");
        }
    };

    const handleDriver2PhoneChange = (value: string) => {
        const cleanedValue = validatePhoneInput(value);
        setDriver2PhoneNumber(cleanedValue);

        if (cleanedValue.length === 10) {
            const fullPhoneNumber = `${driver2CountryCode} ${cleanedValue}`;
            setValue("driver2PhoneNumber", fullPhoneNumber);
        } else if (cleanedValue.length === 0) {
            setValue("driver2PhoneNumber", "");
        }
    };

    const handleConductorPhoneChange = (value: string) => {
        const cleanedValue = validatePhoneInput(value);
        setConductorPhoneNumber(cleanedValue);

        if (cleanedValue.length === 10) {
            const fullPhoneNumber = `${conductorCountryCode} ${cleanedValue}`;
            setValue("conductorPhoneNumber", fullPhoneNumber);
        } else if (cleanedValue.length === 0) {
            setValue("conductorPhoneNumber", "");
        }
    };

    // Driver 2 form handlers
    const addDriver2Form = () => {
        setShowDriver2Form(true);
    };

    const removeDriver2Form = () => {
        setShowDriver2Form(false);
        // Clear driver 2 form fields
        setValue("driver2Name", "");
        setValue("driver2LicenseNumber", "");
        setValue("driver2PhoneNumber", "");
        setValue("driver2Address", "");
        setValue("driver2Experience", "");
        setValue("driver2DateOfBirth", "");
        setDriver2PhoneNumber("");
    };

    // Insurance form handlers
    const addInsuranceForm = () => {
        setShowInsuranceForm(true);
    };

    const removeInsuranceForm = () => {
        setShowInsuranceForm(false);
        // Clear insurance form fields
        setValue("insurancePolicyNumber", "");
        setValue("insuranceProvider", "");
        setValue("insuranceExpiryDate", "");
        setValue("insuranceCoverageAmount", "");
        setValue("insurancePolicyType", "");
    };

    // Conductor form handlers
    const addConductorForm = () => {
        setShowConductorForm(true);
    };

    const removeConductorForm = () => {
        setShowConductorForm(false);
        // Clear conductor form fields
        setValue("conductorName", "");
        setValue("conductorPhoneNumber", "");
        setValue("conductorAddress", "");
        setValue("conductorExperience", "");
        setValue("conductorDateOfBirth", "");
        setConductorPhoneNumber("");
    };

    // PUC form handlers
    const addPucForm = () => {
        setShowPucForm(true);
    };

    const removePucForm = () => {
        setShowPucForm(false);
        // Clear PUC form fields
        setValue("pucCertificateNumber", "");
        setValue("pucIssuingAuthority", "");
        setValue("pucIssueDate", "");
        setValue("pucExpiryDate", "");
    };

    // Document upload handlers
    const compressImage = async (file: File, maxSizeKB: number = 500): Promise<string> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions to maintain aspect ratio
                let { width, height } = img;
                const maxDimension = 1200; // Max width or height
                
                if (width > height && width > maxDimension) {
                    height = (height * maxDimension) / width;
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width = (width * maxDimension) / height;
                    height = maxDimension;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                // Start with high quality and reduce if needed
                let quality = 0.9;
                let compressedData = canvas.toDataURL('image/jpeg', quality);
                
                // Reduce quality until under size limit
                while (compressedData.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) { // 1.37 accounts for base64 overhead
                    quality -= 0.1;
                    compressedData = canvas.toDataURL('image/jpeg', quality);
                }
                
                resolve(compressedData);
            };
            
            img.src = URL.createObjectURL(file);
        });
    };

    const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploadingDocument(true);
        setDocumentUploadError('');

        try {
            const newDocuments: any[] = [];
            
            for (const file of Array.from(files)) {
                // Validate file type
                const isImage = file.type.startsWith('image/');
                const isPDF = file.type === 'application/pdf';
                
                if (!isImage && !isPDF) {
                    setDocumentUploadError('Only image files (JPEG, PNG, GIF, WebP) and PDF files are allowed');
                    setIsUploadingDocument(false);
                    return;
                }

                // Validate file size (individual file max 2MB)
                if (file.size > 2 * 1024 * 1024) {
                    setDocumentUploadError(`File "${file.name}" is too large. Maximum size per file is 2MB`);
                    setIsUploadingDocument(false);
                    return;
                }

                let processedData: string;
                let compressedSize: number;

                if (isImage) {
                    // Compress image
                    processedData = await compressImage(file, 500); // Max 500KB per compressed image
                    compressedSize = Math.round(processedData.length * 0.75); // Estimate compressed size
                } else {
                    // For PDF, convert to base64 without compression
                    processedData = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.readAsDataURL(file);
                    });
                    compressedSize = file.size;
                }

                newDocuments.push({
                    filename: file.name,
                    fileType: isImage ? 'image' : 'pdf',
                    mimeType: file.type,
                    size: file.size,
                    compressedSize,
                    data: processedData.split(',')[1], // Remove data:type;base64, prefix
                    uploadDate: new Date()
                });
            }

            // Check total size limit (6MB)
            const currentTotalSize = documents.reduce((sum, doc) => sum + doc.compressedSize, 0);
            const newTotalSize = newDocuments.reduce((sum, doc) => sum + doc.compressedSize, 0);
            
            if (currentTotalSize + newTotalSize > 6 * 1024 * 1024) {
                setDocumentUploadError('Total document size cannot exceed 6MB. Please remove some documents or compress them further.');
                setIsUploadingDocument(false);
                return;
            }

            setDocuments([...documents, ...newDocuments]);
            
        } catch (error) {
            console.error('Error processing documents:', error);
            setDocumentUploadError('Failed to process documents. Please try again.');
        } finally {
            setIsUploadingDocument(false);
            // Clear the input
            event.target.value = '';
        }
    };

    const removeDocument = (index: number) => {
        const newDocuments = documents.filter((_, i) => i !== index);
        setDocuments(newDocuments);
        setDocumentUploadError('');
    };

    const getTotalDocumentSize = () => {
        return documents.reduce((sum, doc) => sum + doc.compressedSize, 0);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Route destinations handlers
    const addRouteDestination = () => {
        const newDestinations = [...routeDestinations, { destination: '', amount: '0' }];
        setRouteDestinations(newDestinations);
        setValue('route', newDestinations.filter(dest => dest.destination.trim() !== '').map(dest => dest.destination).join(' → '));
    };

    const removeRouteDestination = (index: number) => {
        if (routeDestinations.length > 1) {
            const newDestinations = routeDestinations.filter((_, i) => i !== index);
            setRouteDestinations(newDestinations);
            setValue('route', newDestinations.filter(dest => dest.destination.trim() !== '').map(dest => dest.destination).join(' → '));
        }
    };

    const updateRouteDestination = (index: number, field: 'destination' | 'amount', value: string) => {
        const newDestinations = routeDestinations.map((dest, i) =>
            i === index ? { ...dest, [field]: value } : dest
        );
        setRouteDestinations(newDestinations);
        setValue('route', newDestinations.filter(dest => dest.destination.trim() !== '').map(dest => dest.destination).join(' → '));
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showDriver1CountryDropdown) {
                setShowDriver1CountryDropdown(false);
            }
            if (showDriver2CountryDropdown) {
                setShowDriver2CountryDropdown(false);
            }
            if (showConductorCountryDropdown) {
                setShowConductorCountryDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDriver1CountryDropdown, showDriver2CountryDropdown, showConductorCountryDropdown]);

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        setIsSubmitting(true);

        try {
            // Ensure route is properly constructed from destinations
            const finalRoute = routeDestinations.filter(dest => dest.destination.trim() !== '').map(dest => dest.destination).join(' → ');

            const busData = {
                modelName: data.modelName,
                vehicleNumber: data.vehicleNumber,
                capacity: data.capacity && data.capacity.trim() ? parseInt(data.capacity) : undefined,
                route: finalRoute,
                routeDetails: routeDestinations
                    .filter(dest => dest.destination.trim() !== '')
                    .map((dest, idx) => ({
                        destination: dest.destination.trim(),
                        amount: idx === 0 ? 0 : (parseFloat(dest.amount) || 0) // Starting point has no fare
                    })),
                averageFuelCostPerMonth: data.averageFuelCostPerMonth && data.averageFuelCostPerMonth.trim() ? parseFloat(data.averageFuelCostPerMonth) : undefined,
                installments: data.installments,
                insuranceDetails: (showInsuranceForm && data.insurancePolicyNumber && data.insuranceProvider && data.insuranceExpiryDate && data.insuranceCoverageAmount && data.insurancePolicyType) ? {
                    policyNumber: data.insurancePolicyNumber,
                    provider: data.insuranceProvider,
                    expiryDate: data.insuranceExpiryDate,
                    coverageAmount: data.insuranceCoverageAmount && data.insuranceCoverageAmount.trim() ? parseFloat(data.insuranceCoverageAmount) : 0,
                    policyType: data.insurancePolicyType
                } : undefined,
                driver1Details: {
                    name: data.driver1Name,
                    licenseNumber: data.driver1LicenseNumber,
                    phoneNumber: data.driver1PhoneNumber,
                    address: data.driver1Address,
                    experience: data.driver1Experience && data.driver1Experience.trim() ? parseInt(data.driver1Experience) : undefined,
                    dateOfBirth: data.driver1DateOfBirth || undefined
                },
                driver2Details: (showDriver2Form && data.driver2Name && data.driver2LicenseNumber && data.driver2PhoneNumber && data.driver2Address && data.driver2Experience && data.driver2DateOfBirth) ? {
                    name: data.driver2Name,
                    licenseNumber: data.driver2LicenseNumber,
                    phoneNumber: data.driver2PhoneNumber,
                    address: data.driver2Address,
                    experience: data.driver2Experience && data.driver2Experience.trim() ? parseInt(data.driver2Experience) : undefined,
                    dateOfBirth: data.driver2DateOfBirth
                } : undefined,
                conductorDetails: (showConductorForm && data.conductorName && data.conductorPhoneNumber && data.conductorAddress && data.conductorExperience && data.conductorDateOfBirth) ? {
                    name: data.conductorName,
                    phoneNumber: data.conductorPhoneNumber,
                    address: data.conductorAddress,
                    experience: data.conductorExperience && data.conductorExperience.trim() ? parseInt(data.conductorExperience) : undefined,
                    dateOfBirth: data.conductorDateOfBirth
                } : undefined,
                pucDetails: (showPucForm && data.pucCertificateNumber && data.pucIssuingAuthority && data.pucIssueDate && data.pucExpiryDate) ? {
                    certificateNumber: data.pucCertificateNumber,
                    issueDate: data.pucIssueDate,
                    expiryDate: data.pucExpiryDate,
                    issuingAuthority: data.pucIssuingAuthority
                } : undefined,
                documents: documents.length > 0 ? documents : undefined
            };

            const token = localStorage.getItem('token');
            const url = isUpdate ? `/api/manage-transport?id=${id}` : '/api/manage-transport';
            const method = isUpdate ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(busData),
            });

            const responseData = await response.json();

            if (!response.ok) {
                toast.error(responseData.error || 'An error occurred');
            } else {
                toast.success(isUpdate ? 'Bus record updated successfully!' : 'Bus record added successfully!');
                router.push('/manage-transport');
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const CountryDropdown = ({
        countries,
        countryCode,
        setCountryCode,
        showDropdown,
        setShowDropdown,
        phoneNumber,
        setValue,
        fieldName
    }: {
        countries: Country[],
        countryCode: string,
        setCountryCode: (code: string) => void,
        showDropdown: boolean,
        setShowDropdown: (show: boolean) => void,
        phoneNumber: string,
        setValue: any,
        fieldName: string
    }) => (
        <div className="relative">
            <button
                type="button"
                className="flex items-center gap-1 border border-base-content/20 rounded-l-md px-3 py-3 bg-base-100 text-base-content h-12"
                onClick={() => setShowDropdown(!showDropdown)}
            >
                <span>{getFlagForCountryCode(countryCode, countries)}</span>
                <span>{countryCode}</span>
                <ChevronDown size={16} />
            </button>

            {showDropdown && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-base-100 shadow-lg rounded-md z-50 max-h-60 overflow-y-auto border border-base-300">
                    {countries.map(country => (
                        <button
                            key={country.code + country.name}
                            type="button"
                            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-base-200 text-left text-base-content"
                            onClick={() => {
                                setCountryCode(country.code);
                                setShowDropdown(false);
                                if (phoneNumber.length === 10) {
                                    setValue(fieldName, `${country.code} ${phoneNumber}`);
                                }
                            }}
                        >
                            <span>{country.flag}</span>
                            <span className="flex-1 truncate">{country.name}</span>
                            <span className="text-base-content/60 text-sm">{country.code}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col w-full p-6 bg-base-100 h-full overflow-y-auto">
            <div className="card bg-base-300 border border-base-content/20 shadow-xl">
                <div className="card-body">
                    <div className="flex items-center gap-3 mb-6">
                        <Bus className="w-8 h-8 text-primary" />
                        <h2 className="card-title text-2xl font-bold text-base-content">
                            {isUpdate ? 'Update Bus Record' : 'Add New Bus Record'}
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
                        {/* Basic Bus Information */}
                        <div className="card bg-base-100 shadow-lg">
                            <div className="card-body">
                                <div className="flex items-center gap-2 mb-4">
                                    <Car className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold text-base-content">Basic Information</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* Model Name */}
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Model Name <span className="text-error">*</span></span>
                                        </label>
                                        <input
                                            type="text"
                                            {...register("modelName")}
                                            className={`input input-bordered w-full bg-base-100 text-base-content ${errors.modelName ? 'input-error' : ''}`}
                                        />
                                        {!errors.modelName && (
                                            <label className="label">
                                                <span className="label-text-alt text-base-content/60 text-xs">
                                                    e.g. Tata Starbus Ultra
                                                </span>
                                            </label>
                                        )}
                                        {errors.modelName && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">{errors.modelName.message}</span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Bus Number */}
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Vehicle Number <span className="text-error">*</span></span>
                                        </label>
                                        <input
                                            type="text"
                                            {...register("vehicleNumber")}
                                            className={`input input-bordered w-full bg-base-100 text-base-content ${errors.vehicleNumber ? 'input-error' : ''}`}
                                            maxLength={15}
                                            style={{ textTransform: 'uppercase' }}
                                            onInput={(e) => {
                                                // Auto-uppercase as user types
                                                const target = e.target as HTMLInputElement;
                                                target.value = target.value.toUpperCase();
                                            }}
                                        />
                                        {!errors.vehicleNumber && (
                                            <label className="label">
                                                <span className="label-text-alt text-base-content/60 text-xs">
                                                    e.g. MP66CA1234
                                                </span>
                                            </label>
                                        )}
                                        {errors.vehicleNumber && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">{errors.vehicleNumber.message}</span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Capacity */}
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Capacity (Passengers)</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            {...register("capacity")}
                                            className={`input input-bordered w-full bg-base-100 text-base-content ${errors.capacity ? 'input-error' : ''}`}
                                        />
                                        {!errors.capacity && (
                                            <label className="label">
                                                <span className="label-text-alt text-base-content/60 text-xs">
                                                    e.g. 45 seats
                                                </span>
                                            </label>
                                        )}
                                        {errors.capacity && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">{errors.capacity.message}</span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Average Fuel Cost */}
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Average Fuel Cost/Month</span>
                                        </label>
                                        <div className="relative">
                                            <Fuel className="absolute left-3 top-3 w-5 h-5 text-base-content/50" />
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                {...register("averageFuelCostPerMonth")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content pl-10 ${errors.averageFuelCostPerMonth ? 'input-error' : ''}`}
                                            />
                                            {!errors.averageFuelCostPerMonth && (
                                                <label className="label">
                                                    <span className="label-text-alt text-base-content/60 text-xs">
                                                        e.g. ₹ 15000.00
                                                    </span>
                                                </label>
                                            )}
                                        </div>
                                        {errors.averageFuelCostPerMonth && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">{errors.averageFuelCostPerMonth.message}</span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Installment type */}
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Installment Type <span className="text-error">*</span></span>
                                        </label>
                                        <select
                                            {...register("installments")}
                                            className={`select select-bordered w-full bg-base-100 text-base-content ${errors.installments ? 'select-error' : ''}`}
                                        >
                                            <option value="">Select installment type</option>
                                            <option value="monthly">Every Month</option>
                                            <option value="3months">Every 3 Months</option>
                                            <option value="4months">Every 4 Months</option>
                                            <option value="6months">Every 6 Months</option>
                                            <option value="yearly">Yearly</option>
                                        </select>
                                        {!errors.installments && (
                                            <label className="label">
                                                <span className="label-text-alt text-base-content/60 text-xs">
                                                    Route destination amounts will be charged based on this installment type
                                                </span>
                                            </label>
                                        )}
                                        {errors.installments && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">{errors.installments.message}</span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Route Destinations */}
                                    <div className="form-control w-full md:col-span-2">
                                        <label className="label mb-3 sm:mb-4">
                                            <span className="label-text text-base-content text-base sm:text-lg font-semibold">Route Destinations <span className="text-error">*</span></span>
                                        </label>

                                        <div className="space-y-3 sm:space-y-4">
                                            {routeDestinations.map((routeItem, index) => {
                                                const hasError = errors.route && routeDestinations.filter(dest => dest.destination.trim()).length < 2;
                                                const showIndividualError = hasError && !routeItem.destination.trim() && index < 2; // Only show error for first 2 fields if empty

                                                return (
                                                    <div key={index} className="p-3 sm:p-4 bg-base-200/50 rounded-lg border border-base-300/20">
                                                        {/* Label Row */}
                                                        <div className="mb-2">
                                                            {index === 0 ? (
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="label pb-1 sm:pb-2">
                                                                            <span className="label-text text-base-content text-sm sm:text-base">
                                                                                Starting Point
                                                                            </span>
                                                                        </label>
                                                                    </div>
                                                                    <div>
                                                                        {/* Empty space to align with fare column */}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="label pb-1 sm:pb-2">
                                                                            <span className="label-text text-base-content text-sm sm:text-base">
                                                                                {index === routeDestinations.length - 1 ? 'Final Destination' : `Stop ${index}`}
                                                                            </span>
                                                                        </label>
                                                                    </div>
                                                                    <div>
                                                                        <label className="label pb-1 sm:pb-2">
                                                                            <span className="label-text text-base-content text-sm sm:text-base">
                                                                                Fare (₹)
                                                                            </span>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Input and Button Row - Parallel Alignment */}
                                                        <div className="flex items-center gap-3">
                                                            {index === 0 ? (
                                                                <div className="grid grid-cols-2 gap-3 flex-1">
                                                                    <input
                                                                        type="text"
                                                                        className={`input input-bordered bg-base-100 text-base-content h-10 sm:h-12 text-sm sm:text-base ${showIndividualError ? 'input-error' : ''}`}
                                                                        placeholder="e.g.: School Main Gate"
                                                                        value={routeItem.destination}
                                                                        onChange={(e) => updateRouteDestination(index, 'destination', e.target.value)}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-2 gap-3 flex-1">
                                                                    <input
                                                                        type="text"
                                                                        className={`input input-bordered bg-base-100 text-base-content h-10 sm:h-12 text-sm sm:text-base ${showIndividualError ? 'input-error' : ''}`}
                                                                        placeholder={index === routeDestinations.length - 1 ? "e.g., City Center" : "e.g., Main Street Junction"}
                                                                        value={routeItem.destination}
                                                                        onChange={(e) => updateRouteDestination(index, 'destination', e.target.value)}
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        className="input input-bordered bg-base-100 text-base-content h-10 sm:h-12 text-sm sm:text-base"
                                                                        value={routeItem.amount}
                                                                        onChange={(e) => updateRouteDestination(index, 'amount', e.target.value)}
                                                                    />
                                                                </div>
                                                            )}

                                                            <Button
                                                                outline
                                                                variant='error'
                                                                type="button"
                                                                onClick={() => removeRouteDestination(index)}
                                                                disabled={routeDestinations.length === 1}
                                                                title="Remove destination"
                                                                className="h-10 sm:h-12 w-10 sm:w-12 flex-shrink-0" // Match input height and prevent shrinking
                                                            >
                                                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            </Button>
                                                        </div>

                                                        {/* Error message container with fixed height */}
                                                        <div className="min-h-[1.25rem] mt-1"> {/* Reserve space for error message */}
                                                            {showIndividualError && (
                                                                <label className="label py-0">
                                                                    <span className="label-text-alt text-error text-xs">
                                                                        {index === 0 ? 'Starting point is required' : 'At least one destination is required'}
                                                                    </span>
                                                                </label>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Add Destination Button */}
                                        <div className="mt-3 sm:mt-4 flex justify-center sm:justify-end">
                                            <div className="text-center sm:text-right w-full sm:w-auto">
                                                <Button
                                                    outline
                                                    variant='primary'
                                                    type="button"
                                                    className="btn btn-sm sm:btn-md btn-primary btn-outline w-full sm:w-auto"
                                                    onClick={addRouteDestination}
                                                    disabled={routeDestinations.length >= 10}
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add More Destination
                                                </Button>
                                                {routeDestinations.length >= 10 && (
                                                    <p className="text-xs sm:text-sm text-base-content/70 mt-2">
                                                        Maximum 10 destinations allowed
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Route Preview */}
                                        {routeDestinations.some(dest => dest.destination.trim() !== '') && (
                                            <div className="mt-4 p-3 sm:p-4 bg-primary/10 rounded-lg border border-primary/20">
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-base sm:text-lg font-semibold text-base-content">Route Preview:</span>
                                                    <div className="text-sm sm:text-base text-primary font-medium">
                                                        {routeDestinations
                                                            .filter(dest => dest.destination.trim() !== '')
                                                            .map((dest, idx) => {
                                                                // Starting point (first destination) has no fare
                                                                if (idx === 0) {
                                                                    return dest.destination;
                                                                }
                                                                // Other destinations show fare
                                                                return `${dest.destination} (₹${dest.amount || '0'})`;
                                                            })
                                                            .join(' → ')
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {errors.route && routeDestinations.filter(dest => dest.destination.trim()).length < 2 && (
                                            <label className="label">
                                                <span className="label-text-alt text-error text-sm">
                                                    {errors.route.message}
                                                </span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Driver 1 Information */}
                        <div className="card bg-base-100 shadow-lg">
                            <div className="card-body">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold text-base-content">Driver Details <span className="text-error">*</span></h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Driver 1 Name */}
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Full Name <span className="text-error">*</span></span>
                                        </label>
                                        <input
                                            type="text"
                                            {...register("driver1Name")}
                                            className={`input input-bordered w-full bg-base-100 text-base-content ${errors.driver1Name ? 'input-error' : ''}`}
                                        />
                                        {errors.driver1Name && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">{errors.driver1Name.message}</span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Driver 1 License Number */}
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Driver License Number <span className="text-error">*</span></span>
                                        </label>
                                        <input
                                            type="text"
                                            {...register("driver1LicenseNumber")}
                                            className={`input input-bordered w-full bg-base-100 text-base-content ${errors.driver1LicenseNumber ? 'input-error' : ''}`}
                                        />
                                        {!errors.driver1LicenseNumber && (
                                            <label className="label">
                                                <span className="label-text-alt text-base-content/60 text-xs">
                                                    e.g. DL-123456789
                                                </span>
                                            </label>
                                        )}
                                        {errors.driver1LicenseNumber && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">{errors.driver1LicenseNumber.message}</span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Driver 1 Phone */}
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Phone Number <span className="text-error">*</span></span>
                                        </label>
                                        <div className="flex items-center w-full">
                                            <CountryDropdown
                                                countries={countries}
                                                countryCode={driver1CountryCode}
                                                setCountryCode={setDriver1CountryCode}
                                                showDropdown={showDriver1CountryDropdown}
                                                setShowDropdown={setShowDriver1CountryDropdown}
                                                phoneNumber={driver1PhoneNumber}
                                                setValue={setValue}
                                                fieldName="driver1PhoneNumber"
                                            />
                                            <input
                                                type="text"
                                                value={driver1PhoneNumber}
                                                onChange={(e) => handleDriver1PhoneChange(e.target.value)}
                                                className={`input input-bordered flex-1 rounded-l-none bg-base-100 text-base-content ${errors.driver1PhoneNumber ? 'input-error' : ''}`}
                                                placeholder="10-digit phone number"
                                                maxLength={10}
                                            />
                                        </div>
                                        {driver1PhoneNumber.length > 0 && driver1PhoneNumber.length < 10 && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">Please enter a valid 10-digit phone number</span>
                                            </label>
                                        )}
                                        {errors.driver1PhoneNumber && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">{errors.driver1PhoneNumber.message}</span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Driver 1 Experience */}
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Experience (Years)</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="50"
                                            {...register("driver1Experience")}
                                            className={`input input-bordered w-full bg-base-100 text-base-content ${errors.driver1Experience ? 'input-error' : ''}`}
                                        />
                                        {errors.driver1Experience && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">{errors.driver1Experience.message}</span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Driver 1 Date of Birth */}
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Date of Birth</span>
                                        </label>
                                        <input
                                            type="date"
                                            min={minBirthDate}
                                            max={maxBirthDate}
                                            {...register("driver1DateOfBirth")}
                                            className={`input input-bordered w-full bg-base-100 text-base-content ${errors.driver1DateOfBirth ? 'input-error' : ''}`}
                                        />
                                        {errors.driver1DateOfBirth && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">{errors.driver1DateOfBirth.message}</span>
                                            </label>
                                        )}
                                    </div>

                                    {/* Driver 1 Address */}
                                    <div className="form-control w-full">
                                        <label className="label">
                                            <span className="label-text text-base-content">Address</span>
                                        </label>
                                        <textarea
                                            {...register("driver1Address")}
                                            className={`textarea textarea-bordered w-full bg-base-100 text-base-content h-24 ${errors.driver1Address ? 'textarea-error' : ''}`}
                                            placeholder="Enter driver address"
                                        />
                                        {errors.driver1Address && (
                                            <label className="label">
                                                <span className="label-text-alt text-error">{errors.driver1Address.message}</span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Add Driver 2 Button */}
                            {!showDriver2Form && (
                                <div className="mb-4 flex justify-center">
                                    <Button
                                        type="button"
                                        variant="primary"
                                        outline
                                        onClick={addDriver2Form}
                                        className="w-full sm:w-auto"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Another Driver
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Driver 2 Information (Optional) */}
                        {showDriver2Form && (
                            <div className="card bg-base-100 shadow-lg">
                                <div className="card-body">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-5 h-5 text-secondary" />
                                            <h3 className="text-lg font-semibold text-base-content">Driver 2 Details</h3>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="error"
                                            outline
                                            size="sm"
                                            onClick={removeDriver2Form}
                                            className="btn-circle"
                                            title="Remove Driver 2"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Driver 2 Name */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Full Name</span>
                                            </label>
                                            <input
                                                type="text"
                                                {...register("driver2Name")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.driver2Name ? 'input-error' : ''}`}
                                            />
                                            {errors.driver2Name && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.driver2Name.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Driver 2 License Number */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Driver License Number</span>
                                            </label>
                                            <input
                                                type="text"
                                                {...register("driver2LicenseNumber")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.driver2LicenseNumber ? 'input-error' : ''}`}
                                            />
                                            {!errors.driver2LicenseNumber && (
                                                <label className="label">
                                                    <span className="label-text-alt text-base-content/60 text-xs">
                                                        e.g. DL-987654321
                                                    </span>
                                                </label>
                                            )}
                                            {errors.driver2LicenseNumber && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.driver2LicenseNumber.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Driver 2 Phone */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Phone Number</span>
                                            </label>
                                            <div className="flex items-center w-full">
                                                <CountryDropdown
                                                    countries={countries}
                                                    countryCode={driver2CountryCode}
                                                    setCountryCode={setDriver2CountryCode}
                                                    showDropdown={showDriver2CountryDropdown}
                                                    setShowDropdown={setShowDriver2CountryDropdown}
                                                    phoneNumber={driver2PhoneNumber}
                                                    setValue={setValue}
                                                    fieldName="driver2PhoneNumber"
                                                />
                                                <input
                                                    type="text"
                                                    value={driver2PhoneNumber}
                                                    onChange={(e) => handleDriver2PhoneChange(e.target.value)}
                                                    className={`input input-bordered flex-1 rounded-l-none bg-base-100 text-base-content ${errors.driver2PhoneNumber ? 'input-error' : ''}`}
                                                    placeholder="10-digit phone number"
                                                    maxLength={10}
                                                />
                                            </div>
                                            {driver2PhoneNumber.length > 0 && driver2PhoneNumber.length < 10 && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">Please enter a valid 10-digit phone number</span>
                                                </label>
                                            )}
                                            {errors.driver2PhoneNumber && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.driver2PhoneNumber.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Driver 2 Experience */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Experience (Years)</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="50"
                                                {...register("driver2Experience")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.driver2Experience ? 'input-error' : ''}`}
                                            />
                                            {errors.driver2Experience && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.driver2Experience.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Driver 2 Date of Birth */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Date of Birth</span>
                                            </label>
                                            <input
                                                type="date"
                                                min={minBirthDate}
                                                max={maxBirthDate}
                                                {...register("driver2DateOfBirth")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.driver2DateOfBirth ? 'input-error' : ''}`}
                                            />
                                            {errors.driver2DateOfBirth && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.driver2DateOfBirth.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Driver 2 Address */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Address</span>
                                            </label>
                                            <textarea
                                                {...register("driver2Address")}
                                                className={`textarea textarea-bordered w-full bg-base-100 text-base-content h-24 ${errors.driver2Address ? 'textarea-error' : ''}`}
                                                placeholder="Enter driver address"
                                            />
                                            {errors.driver2Address && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.driver2Address.message}</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Add Conductor Details Button */}
                        {!showConductorForm && (
                            <div className="card bg-base-100 shadow-lg border-2 border-dashed border-base-300 hover:border-primary transition-colors">
                                <div className="card-body">
                                    <div className="flex items-center justify-center py-8">
                                        <Button
                                            type="button"
                                            variant="primary"
                                            outline
                                            onClick={addConductorForm}
                                            className="w-full sm:w-auto"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Conductor Details
                                        </Button>
                                    </div>
                                    <p className="text-center text-sm text-base-content/60">
                                        Optional: Click to add conductor information
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Conductor Information (Optional) */}
                        {showConductorForm && (
                            <div className="card bg-base-100 shadow-lg">
                                <div className="card-body">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-5 h-5 text-primary" />
                                            <h3 className="text-lg font-semibold text-base-content">Conductor Details</h3>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="error"
                                            outline
                                            size="sm"
                                            onClick={removeConductorForm}
                                            title="Remove conductor details"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Conductor Name */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Full Name</span>
                                            </label>
                                            <input
                                                type="text"
                                                {...register("conductorName")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.conductorName ? 'input-error' : ''}`}
                                            />
                                            {errors.conductorName && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.conductorName.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Conductor Phone */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Phone Number</span>
                                            </label>
                                            <div className="flex items-center w-full">
                                                <CountryDropdown
                                                    countries={countries}
                                                    countryCode={conductorCountryCode}
                                                    setCountryCode={setConductorCountryCode}
                                                    showDropdown={showConductorCountryDropdown}
                                                    setShowDropdown={setShowConductorCountryDropdown}
                                                    phoneNumber={conductorPhoneNumber}
                                                    setValue={setValue}
                                                    fieldName="conductorPhoneNumber"
                                                />
                                                <input
                                                    type="text"
                                                    value={conductorPhoneNumber}
                                                    onChange={(e) => handleConductorPhoneChange(e.target.value)}
                                                    className={`input input-bordered flex-1 rounded-l-none bg-base-100 text-base-content ${errors.conductorPhoneNumber ? 'input-error' : ''}`}
                                                    placeholder="10-digit phone number"
                                                    maxLength={10}
                                                />
                                            </div>
                                            {conductorPhoneNumber.length > 0 && conductorPhoneNumber.length < 10 && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">Please enter a valid 10-digit phone number</span>
                                                </label>
                                            )}
                                            {errors.conductorPhoneNumber && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.conductorPhoneNumber.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Conductor Experience */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Experience (Years)</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="50"
                                                {...register("conductorExperience")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.conductorExperience ? 'input-error' : ''}`}
                                            />
                                            {errors.conductorExperience && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.conductorExperience.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Conductor Date of Birth */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Date of Birth</span>
                                            </label>
                                            <input
                                                type="date"
                                                min={minBirthDate}
                                                max={maxBirthDate}
                                                {...register("conductorDateOfBirth")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.conductorDateOfBirth ? 'input-error' : ''}`}
                                            />
                                            {errors.conductorDateOfBirth && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.conductorDateOfBirth.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Conductor Address */}
                                        <div className="form-control w-full md:col-span-2">
                                            <label className="label">
                                                <span className="label-text text-base-content">Address</span>
                                            </label>
                                            <textarea
                                                {...register("conductorAddress")}
                                                className={`textarea textarea-bordered w-full bg-base-100 text-base-content h-24 ${errors.conductorAddress ? 'textarea-error' : ''}`}
                                                placeholder="Enter conductor address"
                                            />
                                            {errors.conductorAddress && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.conductorAddress.message}</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Add Insurance Details Button */}
                        {!showInsuranceForm && (
                            <div className="card bg-base-100 shadow-lg border-2 border-dashed border-base-300 hover:border-primary transition-colors">
                                <div className="card-body">
                                    <div className="flex items-center justify-center py-8">
                                        <Button
                                            type="button"
                                            variant="primary"
                                            outline
                                            onClick={addInsuranceForm}
                                            className="w-full sm:w-auto"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Insurance Details
                                        </Button>
                                    </div>
                                    <p className="text-center text-sm text-base-content/60">
                                        Optional: Click to add vehicle insurance information
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Insurance Information (Optional) */}
                        {showInsuranceForm && (
                            <div className="card bg-base-100 shadow-lg">
                                <div className="card-body">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-primary" />
                                            <h3 className="text-lg font-semibold text-base-content">Insurance Details</h3>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="error"
                                            outline
                                            size="sm"
                                            onClick={removeInsuranceForm}
                                            title="Remove insurance details"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Policy Number */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Insurance Policy Number</span>
                                            </label>
                                            <input
                                                type="text"
                                                {...register("insurancePolicyNumber")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.insurancePolicyNumber ? 'input-error' : ''}`}
                                            />
                                            {!errors.insurancePolicyNumber && (
                                                <label className="label">
                                                    <span className="label-text-alt text-base-content/60 text-xs">
                                                        e.g. INS-2024-001
                                                    </span>
                                                </label>
                                            )}
                                            {errors.insurancePolicyNumber && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.insurancePolicyNumber.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Provider */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Insurance Provider Name</span>
                                            </label>
                                            <input
                                                type="text"
                                                {...register("insuranceProvider")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.insuranceProvider ? 'input-error' : ''}`}
                                            />
                                            {!errors.insuranceProvider && (
                                                <label className="label">
                                                    <span className="label-text-alt text-base-content/60 text-xs">
                                                        e.g. ABC Insurance Co.
                                                    </span>
                                                </label>
                                            )}
                                            {errors.insuranceProvider && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.insuranceProvider.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Expiry Date */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Expiry Date</span>
                                            </label>
                                            <input
                                                type="date"
                                                min={minInsuranceDate}
                                                {...register("insuranceExpiryDate")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.insuranceExpiryDate ? 'input-error' : ''}`}
                                            />
                                            {errors.insuranceExpiryDate && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.insuranceExpiryDate.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Coverage Amount */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Coverage Amount</span>
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                {...register("insuranceCoverageAmount")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.insuranceCoverageAmount ? 'input-error' : ''}`}
                                            />
                                            {errors.insuranceCoverageAmount && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.insuranceCoverageAmount.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* Policy Type */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Policy Type</span>
                                            </label>
                                            <select
                                                {...register("insurancePolicyType")}
                                                className={`select select-bordered w-full bg-base-100 text-base-content ${errors.insurancePolicyType ? 'select-error' : ''}`}
                                            >
                                                <option value="">Select policy type</option>
                                                <option value="Comprehensive">Comprehensive</option>
                                                <option value="Third Party">Third Party</option>
                                                <option value="Third Party Fire & Theft">Third Party Fire & Theft</option>
                                            </select>
                                            {errors.insurancePolicyType && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.insurancePolicyType.message}</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Add PUC Certificate Button */}
                        {!showPucForm && (
                            <div className="card bg-base-100 shadow-lg border-2 border-dashed border-base-300 hover:border-primary transition-colors">
                                <div className="card-body">
                                    <div className="flex items-center justify-center py-8">
                                        <Button
                                            type="button"
                                            variant="primary"
                                            outline
                                            onClick={addPucForm}
                                            className="w-full sm:w-auto"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add PUC Certificate Details
                                        </Button>
                                    </div>
                                    <p className="text-center text-sm text-base-content/60">
                                        Optional: Click to add Pollution Under Control certificate information
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* PUC Information (Optional) */}
                        {showPucForm && (
                            <div className="card bg-base-100 shadow-lg">
                                <div className="card-body">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-primary" />
                                            <h3 className="text-lg font-semibold text-base-content">PUC Certificate Details</h3>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="error"
                                            outline
                                            size="sm"
                                            onClick={removePucForm}
                                            title="Remove PUC details"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* PUC Certificate Number */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">PUC Certificate Number</span>
                                            </label>
                                            <input
                                                type="text"
                                                {...register("pucCertificateNumber")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.pucCertificateNumber ? 'input-error' : ''}`}
                                            />
                                            {!errors.pucCertificateNumber && (
                                                <label className="label">
                                                    <span className="label-text-alt text-base-content/60 text-xs">
                                                        e.g. PUC-2024-001
                                                    </span>
                                                </label>
                                            )}
                                            {errors.pucCertificateNumber && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.pucCertificateNumber.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* PUC Issuing Authority */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Issuing Authority Name</span>
                                            </label>
                                            <input
                                                type="text"
                                                {...register("pucIssuingAuthority")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.pucIssuingAuthority ? 'input-error' : ''}`}
                                            />
                                            {errors.pucIssuingAuthority && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.pucIssuingAuthority.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* PUC Issue Date */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Issue Date</span>
                                            </label>
                                            <input
                                                type="date"
                                                min={minPucDate}
                                                max={today.toISOString().split('T')[0]}
                                                {...register("pucIssueDate")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.pucIssueDate ? 'input-error' : ''}`}
                                            />
                                            {errors.pucIssueDate && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.pucIssueDate.message}</span>
                                                </label>
                                            )}
                                        </div>

                                        {/* PUC Expiry Date */}
                                        <div className="form-control w-full">
                                            <label className="label">
                                                <span className="label-text text-base-content">Expiry Date</span>
                                            </label>
                                            <input
                                                type="date"
                                                min={today.toISOString().split('T')[0]}
                                                {...register("pucExpiryDate")}
                                                className={`input input-bordered w-full bg-base-100 text-base-content ${errors.pucExpiryDate ? 'input-error' : ''}`}
                                            />
                                            {errors.pucExpiryDate && (
                                                <label className="label">
                                                    <span className="label-text-alt text-error">{errors.pucExpiryDate.message}</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Document Upload */}
                        <div className="card bg-base-100 shadow-lg">
                            <div className="card-body">
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold text-base-content">Document Upload</h3>
                                </div>

                                <div className="space-y-4">
                                    {/* Upload Area */}
                                    <div className="border-2 border-dashed border-base-300 rounded-lg p-6 hover:border-primary transition-colors">
                                        <div className="text-center">
                                            <div className="mb-4">
                                                <FileText className="w-12 h-12 text-base-content/40 mx-auto" />
                                            </div>
                                            <h4 className="text-base font-medium text-base-content mb-2">
                                                Upload Documents
                                            </h4>
                                            <p className="text-sm text-base-content/60 mb-4">
                                                Upload images (JPEG, PNG, GIF, WebP) or PDF files. Maximum total size: 6MB
                                            </p>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*,.pdf"
                                                onChange={handleDocumentUpload}
                                                className="hidden"
                                                id="document-upload"
                                                disabled={isUploadingDocument}
                                            />
                                            <label
                                                htmlFor="document-upload"
                                                className={`btn btn-primary btn-outline ${isUploadingDocument ? 'loading' : ''}`}
                                            >
                                                {isUploadingDocument ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Choose Files
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    {/* Upload Error */}
                                    {documentUploadError && (
                                        <div className="alert alert-error">
                                            <span>{documentUploadError}</span>
                                        </div>
                                    )}

                                    {/* Document List */}
                                    {documents.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <h5 className="font-medium text-base-content">
                                                    Uploaded Documents ({documents.length})
                                                </h5>
                                                <span className="text-sm text-base-content/60">
                                                    Total: {formatFileSize(getTotalDocumentSize())} / 6MB
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {documents.map((doc, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
                                                                {doc.fileType === 'image' ? (
                                                                    <span className="text-xs font-bold text-primary">IMG</span>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-primary">PDF</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-base-content truncate max-w-xs">
                                                                    {doc.filename}
                                                                </p>
                                                                <p className="text-xs text-base-content/60">
                                                                    {formatFileSize(doc.size)} → {formatFileSize(doc.compressedSize)} 
                                                                    {doc.fileType === 'image' && doc.size !== doc.compressedSize && (
                                                                        <span className="text-success ml-1">(compressed)</span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDocument(index)}
                                                            className="btn btn-error btn-outline btn-sm"
                                                            title="Remove document"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Size Progress Bar */}
                                            <div className="space-y-1">
                                                <div className="w-full bg-base-300 rounded-full h-2">
                                                    <div 
                                                        className={`h-2 rounded-full transition-all ${
                                                            getTotalDocumentSize() > 5 * 1024 * 1024 ? 'bg-warning' : 
                                                            getTotalDocumentSize() > 4 * 1024 * 1024 ? 'bg-info' : 'bg-success'
                                                        }`}
                                                        style={{
                                                            width: `${Math.min((getTotalDocumentSize() / (6 * 1024 * 1024)) * 100, 100)}%`
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-base-content/60 text-center">
                                                    {((getTotalDocumentSize() / (6 * 1024 * 1024)) * 100).toFixed(1)}% of 6MB used
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Helper Text */}
                                    <div className="text-xs text-base-content/60 space-y-1">
                                        <p>• Supported formats: JPEG, PNG, PDF</p>
                                        <p>• Maximum file size: 2MB per file</p>
                                        <p>• Maximum total size: 6MB for all documents</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hidden route field for form submission */}
                        <input type="hidden" {...register("route")} />

                        {/* Submit Buttons */}
                        <div className="flex justify-end gap-4">
                            <Button
                                type="button"
                                variant="error"
                                outline
                                onClick={() => router.push('/manage-transport')}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                outline
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {isUpdate ? 'Updating...' : 'Adding...'}
                                    </div>
                                ) : (
                                    <>
                                        {isUpdate ? 'Update Bus' : 'Add New Bus'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function AddBusPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-base-100">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-base-content">Loading Bus Form...</p>
                </div>
            </div>
        }>
            <AddBusForm />
        </Suspense>
    );
}
