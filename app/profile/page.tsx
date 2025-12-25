'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Mail, Phone, MapPin, Building, BookOpen, Users, Calendar, MessageCircle, Upload, ChevronDown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

interface UserProfile {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    role: string;
    joiningDate: string;
    subjects: string[];
    classInfo: {
        class: string;
        section: string;
    };
    designation: string;
    location: string;
    profileImage?: string;
    statusMessage?: string;
    aboutMe?: string;
}

interface Country {
    name: {
        common: string;
        official: string;
    };
    cca2: string;
    flag: string;
    flags: {
        png: string;
        svg: string;
    };
    idd: {
        root: string;
        suffixes: string[];
    };
}

const EditButton = ({ onClick }: { onClick: () => void }) => (
    <button
        onClick={onClick}
        className="btn btn-ghost btn-xs text-base-content/60 hover:text-base-content"
    >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
            <path d="m15 5 4 4"></path>
        </svg>
    </button>
);

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const statusInputRef = useRef<HTMLInputElement>(null);
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [countryCode, setCountryCode] = useState("+91");
    const phoneInputRef = useRef<HTMLInputElement>(null);
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [countrySearch, setCountrySearch] = useState("");
    const [countries, setCountries] = useState<{ code: string, flag: string, name: string }[]>([]);
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [address, setAddress] = useState("");
    const addressInputRef = useRef<HTMLTextAreaElement>(null);
    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [aboutText, setAboutText] = useState("");
    const aboutInputRef = useRef<HTMLTextAreaElement>(null);
    const [originalAboutText, setOriginalAboutText] = useState("");
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Get user info from token
                const token = localStorage.getItem('token');
                if (!token) {
                    console.log('No token found, skipping profile fetch');
                    return;
                }

                const payload = JSON.parse(atob(token.split('.')[1]));
                const userId = payload.id;

                // Fetch user profile
                const response = await fetch(`/api/manage-staff?id=${userId}`);
                if (!response.ok) {
                    // Don't show error toast if it's a 401 (likely due to logout)
                    if (response.status !== 401) {
                        throw new Error('Failed to fetch profile');
                    }
                    return;
                }

                const userData = await response.json();

                // If user is a student, fetch their class info
                if (payload.role === 'STUDENT') {
                    const classResponse = await fetch(`/api/student-class?studentId=${userId}`);
                    if (classResponse.ok) {
                        const classData = await classResponse.json();
                        userData.classInfo = {
                            class: classData.class.classNumber,
                            section: classData.section.section
                        };
                    }
                }

                // If user is a teacher, fetch their subjects
                if (payload.role === 'STAFF') {
                    const subjectsResponse = await fetch(`/api/manage-subject?staffId=${userId}`);
                    if (subjectsResponse.ok) {
                        const subjectsData = await subjectsResponse.json();
                        userData.subjects = subjectsData.map((subject: any) => subject.subject);
                    }
                }

                // Set initial status message from profile data
                if (userData.statusMessage) {
                    setStatusMessage(userData.statusMessage);
                } else {
                    setStatusMessage("Aspire to be a very good software engineer/build a facebook/see the world not from top but from the outer space");
                }

                if (userData.phone) {
                    // If phone number includes country code, split it
                    if (userData.phone.includes(" ")) {
                        const [code, number] = userData.phone.split(" ");
                        setCountryCode(code);
                        setPhoneNumber(number);
                    } else {
                        // Otherwise just set the number
                        setPhoneNumber(userData.phone);
                    }
                }

                if (userData.address) {
                    setAddress(userData.address);
                }

                if (userData.aboutMe) {
                    const aboutText = userData.aboutMe;
                    setAboutText(aboutText);
                    setOriginalAboutText(aboutText);
                } else {
                    // Set default value if no aboutMe data exists
                    const defaultText = userData.role === 'STUDENT'
                        ? 'I\'m currently studying. My design journey started in 2012, sitting across my brother in our home office on the island of Krk, Croatia.'
                        : 'I manage creative teams and set up processes that allow our collaborators and clients to achieve growth, scalability, and progress. My design journey started in 2012, sitting across my brother in our home office on the island of Krk, Croatia.';
                    setAboutText(defaultText);
                    setOriginalAboutText(defaultText);
                }

                setProfile(userData);
            } catch (error) {
                toast.error('Failed to load profile');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Please select a valid image file (JPEG, PNG, or WebP)');
            return;
        }

        // Validate file size (max 10MB before compression)
        const maxSizeBeforeCompression = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSizeBeforeCompression) {
            toast.error('Image file is too large. Please select an image smaller than 10MB.');
            return;
        }

        setIsUploadingImage(true);
        
        try {
            // Compress the image to optimum size for profile pictures
            const options = {
                maxSizeMB: 0.3,              // Reduce to 300KB max (much smaller)
                maxWidthOrHeight: 512,       // Reduce dimensions to 512px (sufficient for profile pics)
                useWebWorker: true,          // Use web worker for better performance
                initialQuality: 0.8,         // Start with 80% quality
                alwaysKeepResolution: false, // Allow resolution reduction for smaller files
                fileType: 'image/jpeg'       // Force JPEG format (usually smaller than PNG)
            };
            const compressedFile = await imageCompression(file, options);

            // Convert to base64
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;

                // Get user ID from token
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No token found');
                const payload = JSON.parse(atob(token.split('.')[1]));

                // Update profile image
                const response = await fetch(`/api/manage-staff?id=${payload.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        imageData: base64String
                    }),
                });

                if (response.ok) {
                    setProfile(prev => prev ? { ...prev, profileImage: base64String } : null);
                    
                    // Trigger custom event to notify sidebar of profile image update
                    window.dispatchEvent(new CustomEvent('profile-image-updated', {
                        detail: { profileImage: base64String }
                    }));
                    
                    toast.success('Profile picture added successfully');
                } else {
                    throw new Error('Failed to update profile image');
                }
                setIsUploadingImage(false);
            };
            reader.readAsDataURL(compressedFile);
        } catch (error) {
            toast.error('Failed to upload image');
            setIsUploadingImage(false);
        }
    };

    const handleStatusUpdate = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.id;

            const response = await fetch(`/api/manage-staff?id=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    statusMessage: statusMessage
                }),
            });

            if (response.ok) {
                const updatedProfile = await response.json();
                setProfile(updatedProfile);
                toast.success('Status updated successfully');
                setIsEditingStatus(false);
            } else {
                throw new Error('Failed to update status');
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const validatePhoneInput = (input: string) => {
        // Only allow digits
        return input.replace(/\D/g, '');
    };

    const handlePhoneUpdate = async () => {
        try {
            if (phoneNumber.length !== 10) {
                toast.error('Please enter a valid 10-digit phone number');
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) return;

            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.id;

            const fullPhoneNumber = `${countryCode} ${phoneNumber}`;

            const response = await fetch(`/api/manage-staff?id=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: fullPhoneNumber
                }),
            });

            if (response.ok) {
                const updatedProfile = await response.json();
                setProfile(updatedProfile);
                toast.success('Phone number updated successfully');
                setIsEditingPhone(false);
            } else {
                throw new Error('Failed to update phone number');
            }
        } catch (error) {
            toast.error('Failed to update phone number');
        }
    };

    const getFlagForCountryCode = (code: string) => {
        const country = countries.find(c => c.code === code);
        return country ? country.flag : '🇮🇳';
    };

    const handleAddressUpdate = async () => {
        try {
            if (address.length < 5) {
                toast.error('Address must be at least 5 characters long');
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) return;

            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.id;

            const response = await fetch(`/api/manage-staff?id=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: address
                }),
            });

            if (response.ok) {
                const updatedProfile = await response.json();
                setProfile(updatedProfile);
                toast.success('Address updated successfully');
                setIsEditingAddress(false);
            } else {
                throw new Error('Failed to update address');
            }
        } catch (error) {
            toast.error('Failed to update address');
        }
    };

    const handleAboutUpdate = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.id;

            const response = await fetch(`/api/manage-staff?id=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    aboutMe: aboutText
                }),
            });

            if (response.ok) {
                const updatedProfile = await response.json();
                setProfile(updatedProfile);
                setOriginalAboutText(aboutText);
                toast.success('About section updated successfully');
                setIsEditingAbout(false);
            } else {
                throw new Error('Failed to update About Me');
            }
        } catch (error) {
            toast.error('Failed to update About Me');
        }
    };

    // Add click outside handler for country dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showCountryDropdown) {
                setShowCountryDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showCountryDropdown]);

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

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full bg-base-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="loading loading-spinner loading-lg text-primary"></div>
                    <p className="text-base-content/70">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex justify-center items-center h-full bg-base-100">
                <div className="text-center">
                    <p className="text-error text-lg font-semibold">Failed to load profile</p>
                    <p className="text-base-content/70 mt-2">Please try refreshing the page</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100 overflow-hidden">
            {/* Mobile and Tablet: Centered container with max-width */}
            <div className="block xl:hidden h-full">
                <div className="h-full w-full max-w-6xl mx-auto flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                        <div className="p-3 sm:p-4 md:p-5 lg:p-6 space-y-4 sm:space-y-6">
                            {/* Profile Header Card */}
                            <div className="w-full overflow-hidden shadow-xl bg-base-200 rounded-lg">
                                <div className="relative">
                                    {/* Gradient Background */}
                                    <div className="h-28 sm:h-40 md:h-48 bg-gradient-to-r from-primary to-secondary"></div>

                                    {/* Profile Image Section */}
                                    <div className="px-4 sm:px-4 md:px-6 pb-8 sm:pb-6">
                                        <div className="flex justify-center -mt-12 sm:-mt-16">
                                            <div className="relative group">
                                                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-40 xl:h-40 rounded-full border-4 border-base-100 overflow-hidden bg-base-300 shadow-xl">
                                                    <img
                                                        src={profile?.profileImage || "/images/default-avatar.jpg"}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploadingImage}
                                                    className="absolute top-1 left-1 right-1 bottom-1 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70 disabled:cursor-not-allowed"
                                                >
                                                    {isUploadingImage ? (
                                                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-white animate-spin" />
                                                    ) : (
                                                        <Upload className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 xl:w-8 xl:h-8 text-white" />
                                                    )}
                                                </button>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleImageUpload}
                                                    disabled={isUploadingImage}
                                                />
                                            </div>
                                        </div>

                                        {/* Name and Status Section - Below Gradient */}
                                        <div className="text-center mt-4 sm:mt-4">
                                            <div className="mb-4 sm:mb-3">
                                                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-base-content leading-tight">
                                                    {profile.firstName} {profile.lastName}
                                                </h1>
                                            </div>
                                            <div className="relative text-base-content/70 px-4 sm:px-0">
                                                {isEditingStatus ? (
                                                    <div className="w-full max-w-md mx-auto">
                                                        <div className="flex items-center justify-center mb-2">
                                                            <MessageCircle className="w-4 h-4 text-primary mr-2" />
                                                            <span className="text-xs sm:text-sm font-medium text-base-content/60">Status</span>
                                                        </div>
                                                        <input
                                                            ref={statusInputRef}
                                                            type="text"
                                                            value={statusMessage}
                                                            onChange={(e) => {
                                                                if (e.target.value.length <= 150) {
                                                                    setStatusMessage(e.target.value);
                                                                }
                                                            }}
                                                            className="input input-bordered w-full text-sm bg-base-100 text-base-content"
                                                            autoFocus
                                                            maxLength={150}
                                                            onBlur={handleStatusUpdate}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleStatusUpdate()}
                                                            placeholder="What's on your mind?"
                                                        />
                                                        <div className="text-xs text-right mt-1 text-base-content/60">
                                                            {statusMessage.length}/150 characters
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-full max-w-md mx-auto">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center justify-center flex-1">
                                                                <MessageCircle className="w-4 h-4 text-primary mr-2" />
                                                                <span className="text-xs sm:text-sm font-medium text-base-content/60">Status</span>
                                                            </div>
                                                            <EditButton onClick={() => {
                                                                setIsEditingStatus(true);
                                                                setTimeout(() => statusInputRef.current?.focus(), 0);
                                                            }} />
                                                        </div>
                                                        <div className="bg-base-100/50 rounded-lg p-3 min-h-[2.5rem] flex items-center justify-center">
                                                            <p className="italic text-sm text-base-content/80 text-center leading-relaxed">
                                                                {profile.statusMessage || statusMessage || "What's on your mind?"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* About Section */}
                            <div className="shadow-xl bg-base-200 rounded-lg">
                                <div className="p-4 sm:p-5 md:p-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-base-content">About Me</h2>
                                    {isEditingAbout ? (
                                        <div id="about-input-area" className="space-y-3 sm:space-y-4">
                                            <textarea
                                                ref={aboutInputRef}
                                                value={aboutText}
                                                onChange={(e) => setAboutText(e.target.value)}
                                                className="textarea textarea-bordered w-full bg-base-100 text-base-content text-sm sm:text-base"
                                                rows={4}
                                                placeholder="Write something about yourself..."
                                                maxLength={500}
                                            />
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                                <div className="text-xs text-base-content/60">
                                                    {aboutText.length}/500 characters
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <button
                                                        className="btn btn-sm btn-outline btn-error flex-1 sm:flex-none"
                                                        onClick={() => {
                                                            setAboutText(originalAboutText);
                                                            setIsEditingAbout(false);
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline btn-primary flex-1 sm:flex-none"
                                                        onClick={handleAboutUpdate}
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="text-base-content/70 flex-1">
                                                <p className="whitespace-pre-wrap text-sm sm:text-base">{aboutText}</p>
                                            </div>
                                            <EditButton onClick={() => {
                                                setIsEditingAbout(true);
                                                setTimeout(() => aboutInputRef.current?.focus(), 0);
                                            }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="shadow-xl bg-base-200 rounded-lg">
                                <div className="p-4 sm:p-5 md:p-6">
                                    <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-base-content">Contact Information</h2>
                                    <div className="space-y-3 sm:space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                            <span className="text-base-content text-sm sm:text-base">{profile.email}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                            {isEditingPhone ? (
                                                <div className="flex-1">
                                                    <div id="phone-input-area" className="flex items-center w-full">
                                                        <div className="relative">
                                                            <button
                                                                id="country-dropdown-button"
                                                                type="button"
                                                                className="flex items-center gap-1 border rounded-l-md px-2 py-1 bg-base-200 text-base-content border-base-300"
                                                                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                                            >
                                                                <span>{getFlagForCountryCode(countryCode)}</span>
                                                                <span>{countryCode}</span>
                                                                <ChevronDown size={14} />
                                                            </button>

                                                            {showCountryDropdown && (
                                                                <div id="country-dropdown" className="absolute top-full left-0 mt-1 w-64 bg-base-100 shadow-lg rounded-md z-10 max-h-60 overflow-y-auto border border-base-300">
                                                                    <div className="p-2 sticky top-0 bg-base-100 border-b border-base-300">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Search countries..."
                                                                            className="input input-bordered input-sm w-full bg-base-100 text-base-content"
                                                                            value={countrySearch}
                                                                            onChange={(e) => setCountrySearch(e.target.value)}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </div>
                                                                    {countries
                                                                        .filter(country =>
                                                                            country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                                                            country.code.includes(countrySearch)
                                                                        )
                                                                        .map(country => (
                                                                            <button
                                                                                key={country.code + country.name}
                                                                                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-base-200 text-left text-base-content"
                                                                                onClick={() => {
                                                                                    setCountryCode(country.code);
                                                                                    setShowCountryDropdown(false);
                                                                                    setCountrySearch("");
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

                                                        <input
                                                            ref={phoneInputRef}
                                                            type="text"
                                                            value={phoneNumber}
                                                            onChange={(e) => setPhoneNumber(validatePhoneInput(e.target.value))}
                                                            className="input input-bordered input-sm flex-1 rounded-l-none bg-base-100 text-base-content border-base-300"
                                                            autoFocus
                                                            placeholder="10-digit number"
                                                            maxLength={10}
                                                            onBlur={() => {
                                                                if (phoneNumber.length === 10) {
                                                                    handlePhoneUpdate();
                                                                } else {
                                                                    setIsEditingPhone(false);
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && phoneNumber.length === 10) {
                                                                    handlePhoneUpdate();
                                                                } else if (e.key === 'Escape') {
                                                                    setIsEditingPhone(false);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    {phoneNumber.length > 0 && phoneNumber.length < 10 && (
                                                        <p className="text-xs text-error mt-1">Please enter a 10-digit number</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="text-base-content text-sm sm:text-base">
                                                        {profile.phone ? (
                                                            <span className="flex items-center gap-1">
                                                                {profile.phone.includes(" ") ? (
                                                                    <>
                                                                        <span>{getFlagForCountryCode(profile.phone.split(" ")[0])}</span>
                                                                        <span>{profile.phone}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>🇮🇳</span>
                                                                        <span>+91 {profile.phone}</span>
                                                                    </>
                                                                )}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-2">
                                                                <span className="text-warning">⚠️</span>
                                                                <span>Not provided</span>
                                                            </span>
                                                        )}
                                                    </span>
                                                    <EditButton onClick={() => {
                                                        setIsEditingPhone(true);
                                                        setTimeout(() => phoneInputRef.current?.focus(), 0);
                                                    }} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                            {isEditingAddress ? (
                                                <div className="flex-1" id="address-input-area">
                                                    <div className="w-full">
                                                        <textarea
                                                            ref={addressInputRef}
                                                            value={address}
                                                            onChange={(e) => {
                                                                if (e.target.value.length <= 200) {
                                                                    setAddress(e.target.value);
                                                                }
                                                            }}
                                                            className="textarea textarea-bordered w-full bg-base-100 text-base-content border-base-300"
                                                            autoFocus
                                                            maxLength={200}
                                                            rows={3}
                                                            onBlur={() => {
                                                                if (address.length >= 5) {
                                                                    handleAddressUpdate();
                                                                } else {
                                                                    setIsEditingAddress(false);
                                                                }
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey && address.length >= 5) {
                                                                    e.preventDefault();
                                                                    handleAddressUpdate();
                                                                } else if (e.key === 'Escape') {
                                                                    setIsEditingAddress(false);
                                                                }
                                                            }}
                                                            placeholder="Enter your address (5-200 characters)"
                                                        />
                                                        <div className="text-xs text-right mt-1 text-base-content/60">
                                                            {address.length}/200 characters
                                                        </div>
                                                    </div>
                                                    {address.length > 0 && address.length < 5 && (
                                                        <p className="text-xs text-error mt-1">Address must be at least 5 characters</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="text-base-content text-sm sm:text-base">{profile.address || "Not provided"}</span>
                                                    <EditButton onClick={() => {
                                                        setIsEditingAddress(true);
                                                        setTimeout(() => addressInputRef.current?.focus(), 0);
                                                    }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop and Large Screens: Full width layout */}
            <div className="hidden xl:block h-full">
                <div className="h-full w-full flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                        <div className="p-6 space-y-6">
                            {/* Profile Header Card */}
                            <div className="w-full overflow-hidden shadow-xl bg-base-200 rounded-lg">
                                <div className="relative">
                                    {/* Gradient Background */}
                                    <div className="h-48 bg-gradient-to-r from-primary to-secondary"></div>

                                    {/* Profile Image Section */}
                                    <div className="px-6 pb-6">
                                        <div className="flex justify-center -mt-16">
                                            <div className="relative group">
                                                <div className="w-32 h-32 rounded-full border-4 border-base-100 overflow-hidden bg-base-300 shadow-xl">
                                                    <img
                                                        src={profile?.profileImage || "/images/default-avatar.jpg"}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploadingImage}
                                                    className="absolute top-1 left-1 right-1 bottom-1 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-black/70 disabled:cursor-not-allowed"
                                                >
                                                    {isUploadingImage ? (
                                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                                    ) : (
                                                        <Upload className="w-8 h-8 text-white" />
                                                    )}
                                                </button>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleImageUpload}
                                                    disabled={isUploadingImage}
                                                />
                                            </div>
                                        </div>

                                        {/* Name and Status Section - Below Gradient */}
                                        <div className="text-center mt-6">
                                            <div className="mb-4">
                                                <h1 className="text-2xl font-bold text-base-content">
                                                    {profile.firstName} {profile.lastName}
                                                </h1>
                                            </div>
                                            <div className="relative text-base-content/70 max-w-3xl mx-auto">
                                                {isEditingStatus ? (
                                                    <div className="w-full">
                                                        <div className="flex items-center justify-center mb-3">
                                                            <MessageCircle className="w-5 h-5 text-primary mr-2" />
                                                            <span className="text-sm font-medium text-base-content/60">Status</span>
                                                        </div>
                                                        <input
                                                            ref={statusInputRef}
                                                            type="text"
                                                            value={statusMessage}
                                                            onChange={(e) => {
                                                                if (e.target.value.length <= 150) {
                                                                    setStatusMessage(e.target.value);
                                                                }
                                                            }}
                                                            className="input input-bordered w-full bg-base-100 text-base-content h-12"
                                                            autoFocus
                                                            maxLength={150}
                                                            onBlur={handleStatusUpdate}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleStatusUpdate()}
                                                            placeholder="What's on your mind?"
                                                        />
                                                        <div className="text-xs text-right mt-1 text-base-content/60">
                                                            {statusMessage.length}/150 characters
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-full">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center justify-center flex-1">
                                                                <MessageCircle className="w-5 h-5 text-primary mr-2" />
                                                                <span className="text-sm font-medium text-base-content/60">Status</span>
                                                            </div>
                                                            <EditButton onClick={() => {
                                                                setIsEditingStatus(true);
                                                                setTimeout(() => statusInputRef.current?.focus(), 0);
                                                            }} />
                                                        </div>
                                                        <div className="bg-base-100/30 rounded-lg p-4 min-h-[3rem] flex items-center justify-center">
                                                            <p className="italic text-base-content/80 text-center text-base leading-relaxed">
                                                                {profile.statusMessage || statusMessage || "What's on your mind?"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* About Section */}
                            <div className="shadow-xl bg-base-200 rounded-lg">
                                <div className="p-6">
                                    <h2 className="text-xl font-semibold mb-4 text-base-content">About Me</h2>
                                    {isEditingAbout ? (
                                        <div id="about-input-area" className="space-y-4">
                                            <textarea
                                                ref={aboutInputRef}
                                                value={aboutText}
                                                onChange={(e) => setAboutText(e.target.value)}
                                                className="textarea textarea-bordered w-full bg-base-100 text-base-content"
                                                rows={5}
                                                placeholder="Write something about yourself..."
                                                maxLength={500}
                                            />
                                            <div className="flex justify-between items-center">
                                                <div className="text-xs text-base-content/60">
                                                    {aboutText.length}/500 characters
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        className="btn btn-sm btn-outline btn-error"
                                                        onClick={() => {
                                                            setAboutText(originalAboutText);
                                                            setIsEditingAbout(false);
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline btn-primary"
                                                        onClick={handleAboutUpdate}
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between">
                                            <div className="text-base-content/70 flex-1">
                                                <p className="whitespace-pre-wrap">{aboutText}</p>
                                            </div>
                                            <EditButton onClick={() => {
                                                setIsEditingAbout(true);
                                                setTimeout(() => aboutInputRef.current?.focus(), 0);
                                            }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Contact Information */}
                                <div className="shadow-xl bg-base-200 rounded-lg">
                                    <div className="p-6">
                                        <h2 className="text-xl font-semibold mb-4 text-base-content">Contact Information</h2>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <Mail className="w-5 h-5 text-primary" />
                                                <span className="text-base-content">{profile.email}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Phone className="w-5 h-5 text-primary" />
                                                {isEditingPhone ? (
                                                    <div className="flex-1">
                                                        <div id="phone-input-area" className="flex items-center w-full">
                                                            <div className="relative">
                                                                <button
                                                                    id="country-dropdown-button"
                                                                    type="button"
                                                                    className="flex items-center gap-1 border rounded-l-md px-2 py-1 bg-base-200 text-base-content border-base-300"
                                                                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                                                >
                                                                    <span>{getFlagForCountryCode(countryCode)}</span>
                                                                    <span>{countryCode}</span>
                                                                    <ChevronDown size={14} />
                                                                </button>

                                                                {showCountryDropdown && (
                                                                    <div id="country-dropdown" className="absolute top-full left-0 mt-1 w-64 bg-base-100 shadow-lg rounded-md z-10 max-h-60 overflow-y-auto border border-base-300">
                                                                        <div className="p-2 sticky top-0 bg-base-100 border-b border-base-300">
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Search countries..."
                                                                                className="input input-bordered input-sm w-full bg-base-100 text-base-content"
                                                                                value={countrySearch}
                                                                                onChange={(e) => setCountrySearch(e.target.value)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            />
                                                                        </div>
                                                                        {countries
                                                                            .filter(country =>
                                                                                country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                                                                country.code.includes(countrySearch)
                                                                            )
                                                                            .map(country => (
                                                                                <button
                                                                                    key={country.code + country.name}
                                                                                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-base-200 text-left text-base-content"
                                                                                    onClick={() => {
                                                                                        setCountryCode(country.code);
                                                                                        setShowCountryDropdown(false);
                                                                                        setCountrySearch("");
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

                                                            <input
                                                                ref={phoneInputRef}
                                                                type="text"
                                                                value={phoneNumber}
                                                                onChange={(e) => setPhoneNumber(validatePhoneInput(e.target.value))}
                                                                className="input input-bordered input-sm flex-1 rounded-l-none bg-base-100 text-base-content border-base-300"
                                                                autoFocus
                                                                placeholder="10-digit number"
                                                                maxLength={10}
                                                                onBlur={() => {
                                                                    if (phoneNumber.length === 10) {
                                                                        handlePhoneUpdate();
                                                                    } else {
                                                                        setIsEditingPhone(false);
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && phoneNumber.length === 10) {
                                                                        handlePhoneUpdate();
                                                                    } else if (e.key === 'Escape') {
                                                                        setIsEditingPhone(false);
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        {phoneNumber.length > 0 && phoneNumber.length < 10 && (
                                                            <p className="text-xs text-error mt-1">Please enter a 10-digit number</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="text-base-content">
                                                            {profile.phone ? (
                                                                <span className="flex items-center gap-1">
                                                                    {profile.phone.includes(" ") ? (
                                                                        <>
                                                                            <span>{getFlagForCountryCode(profile.phone.split(" ")[0])}</span>
                                                                            <span>{profile.phone}</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span>🇮🇳</span>
                                                                            <span>+91 {profile.phone}</span>
                                                                        </>
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-2">
                                                                    <span className="text-warning">⚠️</span>
                                                                    <span>Not provided</span>
                                                                </span>
                                                            )}
                                                        </span>
                                                        <EditButton onClick={() => {
                                                            setIsEditingPhone(true);
                                                            setTimeout(() => phoneInputRef.current?.focus(), 0);
                                                        }} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <MapPin className="w-5 h-5 text-primary" />
                                                {isEditingAddress ? (
                                                    <div className="flex-1" id="address-input-area">
                                                        <div className="w-full">
                                                            <textarea
                                                                ref={addressInputRef}
                                                                value={address}
                                                                onChange={(e) => {
                                                                    if (e.target.value.length <= 200) {
                                                                        setAddress(e.target.value);
                                                                    }
                                                                }}
                                                                className="textarea textarea-bordered w-full bg-base-100 text-base-content border-base-300"
                                                                autoFocus
                                                                maxLength={200}
                                                                rows={3}
                                                                onBlur={() => {
                                                                    if (address.length >= 5) {
                                                                        handleAddressUpdate();
                                                                    } else {
                                                                        setIsEditingAddress(false);
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && !e.shiftKey && address.length >= 5) {
                                                                        e.preventDefault();
                                                                        handleAddressUpdate();
                                                                    } else if (e.key === 'Escape') {
                                                                        setIsEditingAddress(false);
                                                                    }
                                                                }}
                                                                placeholder="Enter your address (5-200 characters)"
                                                            />
                                                            <div className="text-xs text-right mt-1 text-base-content/60">
                                                                {address.length}/200 characters
                                                            </div>
                                                        </div>
                                                        {address.length > 0 && address.length < 5 && (
                                                            <p className="text-xs text-error mt-1">Address must be at least 5 characters</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="text-base-content">{profile.address || "Not provided"}</span>
                                                        <EditButton onClick={() => {
                                                            setIsEditingAddress(true);
                                                            setTimeout(() => addressInputRef.current?.focus(), 0);
                                                        }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 