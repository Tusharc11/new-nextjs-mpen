'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/app/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { set } from 'lodash';
import { ChevronDown, Loader2 } from 'lucide-react';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';
import TransportChangeConsentModal from '@/app/components/ui/TransportChangeConsentModal';


interface Class {
  _id: string;
  classNumber: number;
}

interface Section {
  _id: string;
  section: string;
}

interface AcademicYear {
  _id: string;
  startDate: string;
  endDate: string;
}

interface Subject {
  _id: string;
  subject: string;
  courseId: {
    _id: string;
    name: string;
    class: string | {
      _id: string;
      classNumber: number;
    };
  };
  sectionIds: Array<{
    _id: string;
    section: string;
  }>;
  staffIds: Array<{
    _id: string;
    firstName: string;
    lastName: string;
  }>;
  academicYearId: {
    _id: string;
    startDate: string;
    endDate: string;
  };
}

interface Bus {
  _id: string;
  number: number;
  modelName: string;
  vehicleNumber: string;
  route: string;
  routeDetails?: Array<{
    id: string; // ObjectId as string in frontend
    destination: string;
    amount: number;
  }>;
  installments: string;
}

interface RouteDetail {
  id: string; // ObjectId as string in frontend
  destination: string;
  amount: number;
}

const formSchema = (isUpdate: boolean) => z.object({
  firstName: z.string()
    .transform(val => val.trim())
    .transform(val => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase())
    .refine(val => val.length > 0, "First name is required")
    .refine(val => val.length >= 2, "First name must be at least 2 characters long"),
  lastName: z.string()
    .transform(val => val.trim())
    .transform(val => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase())
    .refine(val => val.length > 0, "Last name is required")
    .refine(val => val.length >= 2, "Last name must be at least 2 characters long"),
  email: z.string()
    .transform(val => val.trim().toLowerCase())
    .refine(val => val.length > 0, "Email is required")
    .refine(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email address"),
  password: isUpdate ? z.string().optional() : z.string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Password is required")
    .refine(val => val.length >= 6, "Password must be at least 6 characters long"),
  dateOfBirth: z.string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Date of birth is required"),
  bloodGroup: z.string().optional(),
  gender: z.string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Gender is required"),
  parentPhoneNumber: z.string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Parent phone number is required")
    .refine(val => /^\+\d{1,4}\s\d{10}$/.test(val), "Parent phone number must be in format: +countrycode phonenumber"),
  phoneNumber: z.string().optional()
    .refine(val => !val || val === "" || /^\+\d{1,4}\s\d{10}$/.test(val), "Phone number must be in format: +countrycode phonenumber"),
  address: z.string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Address is required")
    .refine(val => val.length >= 5, "Address must be at least 5 characters long"),
  dateJoined: z.string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Date joined is required"),
  classId: z.string()
    .refine(val => val.length > 0, "Class is required"),
  sectionId: z.string()
    .refine(val => val.length > 0, "Section is required"),
  subjectIds: z.array(z.string())
    .min(3, "Please select at least 3 subjects"),
  isBusTaken: z.boolean().optional(),
  busId: z.string().optional(),
  routeId: z.string().optional(),
});


type FormData = z.infer<ReturnType<typeof formSchema>>;

interface Country {
  code: string;
  flag: string;
  name: string;
  cca2: string;
}

const validatePhoneInput = (input: string) => {
  // Only allow digits
  return input.replace(/\D/g, '');
};

const getFlagForCountryCode = (code: string, countries: Country[]) => {
  const country = countries.find(c => c.code === code);
  return country ? country.flag : '🇮🇳';
};

function AddStudentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const studentRole = "STUDENT";
  const isUpdate = !!id; // If `id` exists, it's an update, otherwise it's a new user
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectsDropdownOpen, setSubjectsDropdownOpen] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [pendingSelectedSubjects, setPendingSelectedSubjects] = useState<string[]>([]);
  const subjectsDropdownRef = useRef<HTMLDivElement>(null);
  // State to track previous dropdown state
  const [previousDropdownState, setPreviousDropdownState] = useState(false);
  // State to track if we're currently loading user data for edit mode
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjectsFieldTouched, setSubjectsFieldTouched] = useState(false);

  // Transport related state
  const [isBusTaken, setIsBusTaken] = useState(false);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<RouteDetail[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteDetail | null>(null);
  const [isLoadingBuses, setIsLoadingBuses] = useState(false);

  // Phone number state management
  const [parentCountryCode, setParentCountryCode] = useState("+91");
  const [parentPhoneNumber, setParentPhoneNumber] = useState("");
  const [showParentCountryDropdown, setShowParentCountryDropdown] = useState(false);
  const [parentCountrySearch, setParentCountrySearch] = useState("");
  const parentPhoneInputRef = useRef<HTMLInputElement>(null);

  const [personalCountryCode, setPersonalCountryCode] = useState("+91");
  const [personalPhoneNumber, setPersonalPhoneNumber] = useState("");
  const [showPersonalCountryDropdown, setShowPersonalCountryDropdown] = useState(false);
  const [personalCountrySearch, setPersonalCountrySearch] = useState("");
  const personalPhoneInputRef = useRef<HTMLInputElement>(null);

  const [countries, setCountries] = useState<Country[]>([]);

  // Transport change consent modal state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [transportChangeDetails, setTransportChangeDetails] = useState<any>(null);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  const { register, handleSubmit, formState: { errors, touchedFields }, setValue, watch, getValues, trigger } = useForm<FormData>({
    resolver: zodResolver(formSchema(isUpdate)),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      subjectIds: []
    }
  });

  // Watch for changes in class and section to fetch subjects
  const watchedClassId = watch("classId");
  const watchedSectionId = watch("sectionId");

  // Function to fetch buses
  const fetchBuses = async () => {
    setIsLoadingBuses(true);
    try {
      const response = await fetch('/api/manage-transport');
      if (!response.ok) {
        throw new Error('Failed to fetch buses');
      }
      const busesData = await response.json();
      setBuses(busesData);
    } catch (error) {
      toast.error('Failed to load buses');
      setBuses([]);
    } finally {
      setIsLoadingBuses(false);
    }
  };

  // Handle bus selection
  const handleBusChange = (busId: string) => {
    const bus = buses.find(b => b._id === busId);
    setSelectedBus(bus || null);
    setSelectedRoute(null);
    setValue("busId", busId);
    setValue("routeId", "");
    
    if (bus && bus.routeDetails) {
      setAvailableRoutes(bus.routeDetails);
    } else {
      setAvailableRoutes([]);
    }
  };

  // Handle route selection
  const handleRouteChange = (routeId: string) => {
    const route = availableRoutes.find(r => r.id === routeId);
    setSelectedRoute(route || null);
    setValue("routeId", routeId);
  };

  // Handle transport toggle
  const handleTransportToggle = (enabled: boolean) => {
    setIsBusTaken(enabled);
    setValue("isBusTaken", enabled);
    
    if (enabled) {
      // Fetch buses when transport is enabled
      fetchBuses();
    } else {
      // Clear transport related data when disabled
      setSelectedBus(null);
      setSelectedRoute(null);
      setAvailableRoutes([]);
      setValue("busId", "");
      setValue("routeId", "");
    }
  };

  // Function to fetch subjects based on class and section
  const fetchSubjects = async (classId: string, sectionId: string) => {
    if (!classId || !sectionId) {
      setSubjects([]);
      setIsLoadingSubjects(false);
      return;
    }

    setIsLoadingSubjects(true);
    try {
      const response = await fetch(`/api/manage-subject?classId=${classId}&sectionId=${sectionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch subjects');
      }
      const subjectsData = await response.json();
      setSubjects(subjectsData);
    } catch (error) {
      toast.error('Failed to load subjects');
      setSubjects([]);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  // Watch for class and section changes to fetch subjects
  useEffect(() => {
    if (watchedClassId && watchedSectionId) {
      // Don't fetch subjects if we're currently loading user data for edit mode
      // to avoid race conditions with the direct fetch in fetchUserData
      if (!isLoadingUserData) {
        fetchSubjects(watchedClassId, watchedSectionId);
      }
      // Trigger validation for class and section fields to clear errors
      trigger(["classId", "sectionId"]);
    } else {
      setSubjects([]);
      // Only clear selected subjects if we're not in update mode or if we're explicitly changing the selection
      if (!isUpdate) {
        setSelectedSubjects([]);
        setValue("subjectIds", []);
        // Only trigger validation if the field has been touched
        if (subjectsFieldTouched) {
          trigger("subjectIds");
        }
      }
    }
  }, [watchedClassId, watchedSectionId, isUpdate, isLoadingUserData, trigger, setValue]);

  // Handle subject selection
  const handleSubjectChange = (subjectId: string) => {
    // Mark subjects field as touched on first interaction
    const wasUntouched = !subjectsFieldTouched;
    if (wasUntouched) {
      setSubjectsFieldTouched(true);
    }

    setSelectedSubjects(prev => {
      const newSelection = prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId];

      setValue("subjectIds", newSelection);
      // Trigger validation if the field was already touched, or if it just became touched
      if (subjectsFieldTouched || wasUntouched) {
        trigger("subjectIds");
      }
      return newSelection;
    });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (subjectsDropdownRef.current && !subjectsDropdownRef.current.contains(event.target as Node)) {
        // Store current state before closing
        setPreviousDropdownState(subjectsDropdownOpen);
        setSubjectsDropdownOpen(false);
      }
      // Close phone country dropdowns
      if (showParentCountryDropdown) {
        setShowParentCountryDropdown(false);
      }
      if (showPersonalCountryDropdown) {
        setShowPersonalCountryDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [subjectsDropdownOpen, showParentCountryDropdown, showPersonalCountryDropdown]);

  // Handle parent phone number change
  const handleParentPhoneChange = (value: string) => {
    const cleanedValue = validatePhoneInput(value);
    setParentPhoneNumber(cleanedValue);

    if (cleanedValue.length === 10) {
      const fullPhoneNumber = `${parentCountryCode} ${cleanedValue}`;
      setValue("parentPhoneNumber", fullPhoneNumber);
    } else {
      setValue("parentPhoneNumber", "");
    }
  };

  // Handle personal phone number change
  const handlePersonalPhoneChange = (value: string) => {
    const cleanedValue = validatePhoneInput(value);
    setPersonalPhoneNumber(cleanedValue);

    if (cleanedValue.length === 10) {
      const fullPhoneNumber = `${personalCountryCode} ${cleanedValue}`;
      setValue("phoneNumber", fullPhoneNumber);
    } else if (cleanedValue.length === 0) {
      setValue("phoneNumber", "");
    }
  };

  // Function to restore previous dropdown state
  const restoreDropdownState = () => {
    if (previousDropdownState) {
      setSubjectsDropdownOpen(true);
      setPreviousDropdownState(false);
    }
  };

  // Set selected subjects when subjects are loaded and there are pending selected subjects
  useEffect(() => {
    if (subjects.length > 0 && pendingSelectedSubjects.length > 0 && !isLoadingUserData) {
      setSelectedSubjects(pendingSelectedSubjects);
      setValue("subjectIds", pendingSelectedSubjects);
      // Only trigger validation if the field has been touched (for edit mode, mark as touched)
      if (isUpdate) {
        setSubjectsFieldTouched(true);
        trigger("subjectIds");
      }
      setPendingSelectedSubjects([]); // Clear pending subjects
    }
  }, [subjects, pendingSelectedSubjects, setValue, trigger, isLoadingUserData, isUpdate]);

  // Handle setting selected bus and route when buses are loaded in edit mode
  useEffect(() => {
    if (buses.length > 0 && isUpdate && !isLoadingUserData) {
      const busId = getValues("busId");
      const routeId = getValues("routeId");
      
      if (busId) {
        const bus = buses.find(b => b._id === busId);
        if (bus) {
          setSelectedBus(bus);
          if (bus.routeDetails) {
            setAvailableRoutes(bus.routeDetails);
            if (routeId) {
              const route = bus.routeDetails.find(r => r.id === routeId);
              setSelectedRoute(route || null);
            }
          }
        }
      }
    }
  }, [buses, isUpdate, isLoadingUserData, getValues]);

  // Handle completion of user data loading for edit mode
  useEffect(() => {
    if (!isLoadingUserData && isUpdate && watchedClassId && watchedSectionId && pendingSelectedSubjects.length > 0) {
      // Ensure subjects are fetched if they haven't been already
      if (subjects.length === 0) {
        fetchSubjects(watchedClassId, watchedSectionId);
      }
    }
  }, [isLoadingUserData, isUpdate, watchedClassId, watchedSectionId, pendingSelectedSubjects.length, subjects.length]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }
        const [classesResponse, sectionsResponse] = await Promise.all([
          fetch('/api/classes'),
          fetch('/api/sections')
        ]);

        if (!classesResponse.ok || !sectionsResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const classesData = await classesResponse.json();
        const sectionsData = await sectionsResponse.json();

        setClasses(classesData);
        setSections(sectionsData);

        // After classes and sections are loaded, fetch course data if editing
        if (id) {
          fetchUserData(classesData, sectionsData);
        }

        setIsLoading(false);
      } catch (error) {
        toast.error('Failed to load classes and sections');
        setIsLoading(false);
      }
    };

    const fetchUserData = async (classesData: Class[], sectionsData: Section[]) => {
      try {
        setIsLoadingUserData(true);

        // First fetch the user data
        const response = await fetch(`/api/manage-staff?id=${id}`);
        if (!response.ok) throw new Error('Failed to fetch user data');
        const data = await response.json();

        setValue("firstName", data.firstName || '');
        setValue("lastName", data.lastName || '');
        setValue("email", data.email || '');
        setValue("dateOfBirth", data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '');
        setValue("bloodGroup", data.bloodGroup || '');
        setValue("gender", data.gender || '');

        // Handle parent phone number with country code
        if (data.parentPhoneNumber) {
          if (data.parentPhoneNumber.includes(" ")) {
            const [code, number] = data.parentPhoneNumber.split(" ");
            setParentCountryCode(code);
            setParentPhoneNumber(number);
            setValue("parentPhoneNumber", data.parentPhoneNumber);
          } else {
            // Legacy format without country code, assume India
            setParentPhoneNumber(data.parentPhoneNumber);
            setValue("parentPhoneNumber", `+91 ${data.parentPhoneNumber}`);
          }
        }

        // Handle personal phone number with country code
        if (data.phoneNumber) {
          if (data.phoneNumber.includes(" ")) {
            const [code, number] = data.phoneNumber.split(" ");
            setPersonalCountryCode(code);
            setPersonalPhoneNumber(number);
            setValue("phoneNumber", data.phoneNumber);
          } else {
            // Legacy format without country code, assume India
            setPersonalPhoneNumber(data.phoneNumber);
            setValue("phoneNumber", `+91 ${data.phoneNumber}`);
          }
        }
        setValue("address", data.address || '');
        setValue("dateJoined", new Date(data.dateJoined).toISOString().split('T')[0]);
        setValue("classId", data?.class._id || '');
        setValue("sectionId", data?.section._id || '');
        setValue("subjectIds", []); // Initialize empty, will be set later when subjects are loaded

        // Fetch student class data to get subjects and transport info
        if (data?.class._id && data?.section._id) {
          try {
            const studentClassResponse = await fetch(`/api/student-class?studentId=${id}`);
            if (studentClassResponse.ok) {
              const studentClassData = await studentClassResponse.json();

              // Extract subject IDs and store them as pending
              if (studentClassData?.subjects && Array.isArray(studentClassData.subjects)) {
                const subjectIds = studentClassData.subjects.map((subject: any) => {
                  const subjectId = typeof subject === 'string' ? subject : subject._id;
                  return subjectId;
                });
                setPendingSelectedSubjects(subjectIds);
              }

              // Handle transport data from StudentBus table
              if (studentClassData?.isBusTaken && studentClassData?.studentBus) {
                setIsBusTaken(true);
                setValue("isBusTaken", true);
                
                // Fetch buses first
                await fetchBuses();
                
                // Set bus and route data from StudentBus table
                if (studentClassData.busId) {
                  setValue("busId", studentClassData.busId);
                }
                
                if (studentClassData.routeId) {
                  setValue("routeId", studentClassData.routeId);
                }

                // Set transport details for UI display
                if (studentClassData.transport) {
                  // Transport details are already fetched from the API
                  console.log('Transport details loaded from StudentBus table:', {
                    transport: studentClassData.transport,
                    selectedRoute: studentClassData.selectedRoute
                  });
                }
              } else {
                setIsBusTaken(false);
                setValue("isBusTaken", false);
              }

              // Load subjects for this class and section
              await fetchSubjects(data.class._id, data.section._id);
            } else {
              toast.error('Failed to fetch student class data');
            }
          } catch (error) {
            toast.error('Error fetching student class data');
          }
        }
      } catch (error) {
        toast.error('Error fetching student data');
      } finally {
        setIsLoadingUserData(false);
      }
    };

    const fetchAcademicYears = async () => {
      try {
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
          const sortedYears = [...data].sort((a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );

          setSelectedAcademicYearId(sortedYears[0]._id);
        }
      } catch (error) {
        toast.error('Failed to load academic years');
      }
    };

    // Call fetchData to start the data loading process
    fetchData();
    fetchAcademicYears();
  }, [id, setValue]);

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

  const submitWithConsent = async (data: FormData, consentProvided = false) => {
    setIsSubmitting(true);

    try {
      // Get the most up-to-date subject data from both state and form
      const formSubjectIds = getValues("subjectIds") || [];
      const finalSubjectIds = selectedSubjects.length > 0 ? selectedSubjects : formSubjectIds;

      const method = id ? 'PUT' : 'POST';
      const userData = id ? { 
        ...data, 
        id, 
        subjectIds: finalSubjectIds,
        isBusTaken: isBusTaken,
        busId: isBusTaken ? data.busId : undefined,
        routeId: isBusTaken ? data.routeId : undefined,
        consentProvided: consentProvided
      } : {
        ...data,
        role: studentRole,
        classId: data.classId,
        sectionId: data.sectionId,
        academicYearId: selectedAcademicYearId,
        subjectIds: finalSubjectIds,
        isBusTaken: isBusTaken,
        busId: isBusTaken ? data.busId : undefined,
        routeId: isBusTaken ? data.routeId : undefined,
        consentProvided: consentProvided
      };
      
      const studentClassResponse = await fetch(`/api/student-class${id ? `?studentId=${id}` : ''}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const studentClassResponseData = await studentClassResponse.json();

      if (!studentClassResponse.ok) {
        toast.error(studentClassResponseData.error || 'An error occurred');
      } else if (studentClassResponseData.requiresConsent && !consentProvided) {
        // Transport changes detected, show consent modal
        setTransportChangeDetails(studentClassResponseData.changeDetails);
        setPendingFormData(data);
        setShowConsentModal(true);
        toast('Transport changes detected. Please review and confirm.', { 
          icon: 'ℹ️',
          duration: 4000 
        });
      } else {
        // Success
        toast.success(id ? 'Student member updated successfully!' : 'Student member created successfully!');
        router.push('/manage-student');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Main onSubmit handler that conforms to SubmitHandler type
  const onSubmit: SubmitHandler<FormData> = async (data) => {
    await submitWithConsent(data, false);
  };

  // Handle transport change consent
  const handleTransportChangeConsent = async () => {
    if (pendingFormData) {
      setShowConsentModal(false);
      await submitWithConsent(pendingFormData, true); // Resubmit with consent
    }
  };

  // Handle consent modal close
  const handleConsentModalClose = () => {
    setShowConsentModal(false);
    setTransportChangeDetails(null);
    setPendingFormData(null);
  };

  return (
    <div className="flex flex-col w-full p-6 bg-base-100 min-h-screen">
      <div className="card bg-base-300 border border-base-content/20 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-base-content mb-6">{id ? 'Update Student' : 'Add New Student'}</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">First Name <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  {...register("firstName")}
                  className={`input input-bordered w-full bg-base-100 text-base-content ${errors.firstName ? 'input-error' : ''}`}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.firstName.message}</span>
                  </label>
                )}
              </div>

              {/* Last Name */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Last Name <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  {...register("lastName")}
                  className={`input input-bordered w-full bg-base-100 text-base-content ${errors.lastName ? 'input-error' : ''}`}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.lastName.message}</span>
                  </label>
                )}
              </div>

              {/* Email */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Email <span className="text-error">*</span></span>
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  {...register("email")}
                  required
                  className={`input input-bordered w-full bg-base-100 text-base-content ${id ? 'cursor-not-allowed' : ''} ${errors.email ? 'input-error' : ''}`}
                  disabled={!!id}
                />
                {errors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.email.message}</span>
                  </label>
                )}
              </div>

              {/* Password */}
              {!id && (
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-base-content">Password <span className="text-error">*</span></span>
                  </label>
                  <input
                    type={id ? "password" : "text"}
                    {...register("password")}
                    className={`input input-bordered w-full bg-base-100 text-base-content ${errors.password ? 'input-error' : ''}`}
                    placeholder="Enter password"
                  />
                  {errors.password && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.password.message}</span>
                    </label>
                  )}
                </div>
              )}
              {/* Class Dropdown */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Class <span className="text-error">*</span></span>
                </label>
                <select
                  {...register("classId")}
                  className={`select select-bordered w-full bg-base-100 text-base-content ${errors.classId ? 'select-error' : ''}`}
                >
                  <option value="">Select a class</option>
                  {classes.map((classItem) => (
                    <option key={classItem._id} value={classItem._id} className="text-base-content bg-base-100">
                      {classItem.classNumber}
                    </option>
                  ))}
                </select>
                {errors.classId && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.classId.message}</span>
                  </label>
                )}
              </div>

              {/* Section Dropdown */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Section <span className="text-error">*</span></span>
                </label>
                <select
                  {...register("sectionId")}
                  className={`select select-bordered w-full bg-base-100 text-base-content ${errors.sectionId ? 'select-error' : ''}`}
                >
                  <option value="">Select a section</option>
                  {sections.map((section) => (
                    <option key={section._id} value={section._id} className="text-base-content bg-base-100">
                      {section.section}
                    </option>
                  ))}
                </select>
                {errors.sectionId && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.sectionId.message}</span>
                  </label>
                )}
              </div>

              {/* Subjects Multi-Select Dropdown */}
              <div className="form-control w-full relative" ref={subjectsDropdownRef}>
                <label className="label">
                  <span className="label-text text-base-content">Subjects <span className="text-error">*</span></span>
                </label>
                <div
                  className={`select select-bordered w-full bg-base-100 text-base-content cursor-pointer`}
                  onClick={() => {
                    // Mark field as touched when dropdown is opened
                    const wasUntouched = !subjectsFieldTouched;
                    if (wasUntouched) {
                      setSubjectsFieldTouched(true);
                      // Trigger validation immediately after marking as touched if there are selected subjects
                      setTimeout(() => trigger("subjectIds"), 0);
                    }
                    setSubjectsDropdownOpen(!subjectsDropdownOpen);
                  }}
                >
                  <div className="flex items-center gap-2 p-2 min-h-[2.5rem] overflow-hidden">
                    {isLoadingSubjects ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-base-content/70">Loading subjects...</span>
                      </div>
                    ) : selectedSubjects.length === 0 ? (
                      <span className="text-base-content/50">
                        {subjects.length === 0
                          ? (watchedClassId && watchedSectionId ? 'No subjects available' : 'Select class and section first')
                          : 'Select subjects'
                        }
                      </span>
                    ) : (
                      <>
                        {selectedSubjects.slice(0, 3).map(id => {
                          const subject = subjects.find(s => s._id === id);
                          return subject ? (
                            <div key={id} className="badge badge-primary h-7 px-3 flex items-center gap-1 flex-shrink-0">
                              {subject.subject}
                              <button
                                type="button"
                                className="btn btn-xs btn-ghost btn-circle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubjectChange(id);
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div key={id} className="badge badge-warning h-7 px-3 flex items-center gap-1 flex-shrink-0">
                              Unknown Subject (ID: {id.substring(0, 8)}...)
                              <button
                                type="button"
                                className="btn btn-xs btn-ghost btn-circle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubjectChange(id);
                                }}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                        {selectedSubjects.length > 3 && (
                          <div className="badge badge-primary h-7 px-3 flex-shrink-0">
                            +{selectedSubjects.length - 3} more
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {subjectsDropdownOpen && (
                  <div className="bg-base-100 mt-1 border border-base-300 rounded-md max-h-60 overflow-y-auto absolute z-50 w-full shadow-lg top-full left-0">
                    {isLoadingSubjects ? (
                      <div className="p-4 flex items-center justify-center">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-base-content/70">Loading subjects...</span>
                        </div>
                      </div>
                    ) : subjects.length > 0 ? (
                      subjects.map((subject) => {
                        return (
                          <div
                            key={subject._id}
                            className="p-2 cursor-pointer hover:bg-base-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubjectChange(subject._id);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm checkbox-primary"
                                checked={selectedSubjects.includes(subject._id)}
                                onChange={() => { }}
                              />
                              <span className="text-base-content">{subject.subject}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-2 text-base-content/50">
                        {watchedClassId && watchedSectionId
                          ? 'No subjects available for this class and section'
                          : 'Please select class and section first'
                        }
                      </div>
                    )}
                  </div>
                )}
                {errors.subjectIds && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.subjectIds.message}</span>
                  </label>
                )}
              </div>

              {/* Transport Service Toggle */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Transport Service</span>
                </label>
                <div className="flex items-center gap-4">
                  <label className="label cursor-pointer">
                    <input
                      type="radio"
                      name="transport"
                      className="radio radio-primary"
                      checked={!isBusTaken}
                      onChange={() => handleTransportToggle(false)}
                    />
                    <span className="label-text ml-2 text-base-content">No</span>
                  </label>
                  <label className="label cursor-pointer">
                    <input
                      type="radio"
                      name="transport"
                      className="radio radio-primary"
                      checked={isBusTaken}
                      onChange={() => handleTransportToggle(true)}
                    />
                    <span className="label-text ml-2 text-base-content">Yes</span>
                  </label>
                </div>
              </div>

              {/* Bus Selection Dropdown - Only show if transport is selected */}
              {isBusTaken && (
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-base-content">Select Bus <span className="text-error">*</span></span>
                  </label>
                  <select
                    {...register("busId")}
                    value={getValues("busId") || ""}
                    onChange={(e) => handleBusChange(e.target.value)}
                    className="select select-bordered w-full bg-base-100 text-base-content"
                    disabled={isLoadingBuses}
                  >
                    <option value="">
                      {isLoadingBuses ? 'Loading buses...' : 'Select a bus'}
                    </option>
                    {buses.map((bus) => (
                      <option key={bus._id} value={bus._id} className="text-base-content bg-base-100">
                        Bus #{bus.number} - {bus.vehicleNumber} ({bus.modelName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              
              {/* Route Selection Dropdown - Only show if bus is selected */}
              {isBusTaken && selectedBus && availableRoutes.length > 0 && (
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-base-content">Select Route <span className="text-error">*</span></span>
                  </label>
                  <select
                    {...register("routeId")}
                    value={getValues("routeId") || ""}
                    onChange={(e) => handleRouteChange(e.target.value)}
                    className="select select-bordered w-full bg-base-100 text-base-content"
                  >
                    <option value="">Select a route</option>
                    {availableRoutes.slice(1).map((route, index) => (
                      <option 
                        key={`route-${index}-${route.id}`} 
                        value={route.id} 
                        className="text-base-content bg-base-100"
                      >
                        {route.destination} - ₹{route.amount}/month
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Joined */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Date Joined <span className="text-error">*</span></span>
                </label>
                <input
                  type="date"
                  {...register("dateJoined")}
                  className={`input input-bordered w-full bg-base-100 text-base-content ${errors.dateJoined ? 'input-error' : ''}`}
                  placeholder="Enter date joined"
                />
                {errors.dateJoined && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.dateJoined.message}</span>
                  </label>
                )}
              </div>

              {/* Date of Birth */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Date of Birth <span className="text-error">*</span></span>
                </label>
                <input
                  type="date"
                  {...register("dateOfBirth")}
                  className={`input input-bordered w-full bg-base-100 text-base-content ${errors.dateOfBirth ? 'input-error' : ''}`}
                />
                {errors.dateOfBirth && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.dateOfBirth.message}</span>
                  </label>
                )}
              </div>

              {/* Blood Group */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Blood Group</span>
                </label>
                <select
                  {...register("bloodGroup")}
                  className={`select select-bordered w-full bg-base-100 text-base-content ${errors.bloodGroup ? 'select-error' : ''}`}
                >
                  <option value="default">Select blood group(Optional)</option>
                  <option value="A+" className="text-base-content bg-base-100">A+</option>
                  <option value="A-" className="text-base-content bg-base-100">A-</option>
                  <option value="B+" className="text-base-content bg-base-100">B+</option>
                  <option value="B-" className="text-base-content bg-base-100">B-</option>
                  <option value="AB+" className="text-base-content bg-base-100">AB+</option>
                  <option value="AB-" className="text-base-content bg-base-100">AB-</option>
                  <option value="O+" className="text-base-content bg-base-100">O+</option>
                  <option value="O-" className="text-base-content bg-base-100">O-</option>
                </select>
                {errors.bloodGroup && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.bloodGroup.message}</span>
                  </label>
                )}
              </div>

              {/* Gender */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Gender <span className="text-error">*</span></span>
                </label>
                <select
                  {...register("gender")}
                  className={`select select-bordered w-full bg-base-100 text-base-content ${errors.gender ? 'select-error' : ''}`}
                >
                  <option value="">Select gender</option>
                  <option value="Male" className="text-base-content bg-base-100">Male</option>
                  <option value="Female" className="text-base-content bg-base-100">Female</option>
                  <option value="Other" className="text-base-content bg-base-100">Other</option>
                </select>
                {errors.gender && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.gender.message}</span>
                  </label>
                )}
              </div>

              {/* Parent Phone Number */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Parent Phone Number <span className="text-error">*</span></span>
                </label>
                <div className="flex items-center w-full">
                  <div className="relative">
                    <button
                      type="button"
                      className="flex items-center gap-1 border rounded-l-md px-3 py-3 bg-base-100 text-base-content border-base-300 h-12"
                      onClick={() => setShowParentCountryDropdown(!showParentCountryDropdown)}
                    >
                      <span>{getFlagForCountryCode(parentCountryCode, countries)}</span>
                      <span>{parentCountryCode}</span>
                      <ChevronDown size={16} />
                    </button>

                    {showParentCountryDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-72 bg-base-100 shadow-lg rounded-md z-50 max-h-60 overflow-y-auto border border-base-300">
                        <div className="p-2 sticky top-0 bg-base-100 border-b border-base-300">
                          <input
                            type="text"
                            placeholder="Search countries..."
                            className="input input-bordered input-sm w-full bg-base-100 text-base-content"
                            value={parentCountrySearch}
                            onChange={(e) => setParentCountrySearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {countries
                          .filter(country =>
                            country.name.toLowerCase().includes(parentCountrySearch.toLowerCase()) ||
                            country.code.includes(parentCountrySearch)
                          )
                          .map(country => (
                            <button
                              key={country.code + country.name}
                              type="button"
                              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-base-200 text-left text-base-content"
                              onClick={() => {
                                setParentCountryCode(country.code);
                                setShowParentCountryDropdown(false);
                                setParentCountrySearch("");
                                // Update phone number with new country code
                                if (parentPhoneNumber.length === 10) {
                                  setValue("parentPhoneNumber", `${country.code} ${parentPhoneNumber}`);
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

                  <input
                    ref={parentPhoneInputRef}
                    type="text"
                    value={parentPhoneNumber}
                    onChange={(e) => handleParentPhoneChange(e.target.value)}
                    className={`input input-bordered flex-1 rounded-l-none bg-base-100 text-base-content border-base-300 ${errors.parentPhoneNumber ? 'input-error' : ''}`}
                    placeholder="10-digit phone number"
                    maxLength={10}
                  />
                </div>
                {parentPhoneNumber.length > 0 && parentPhoneNumber.length < 10 && (
                  <label className="label">
                    <span className="label-text-alt text-error">Please enter a valid 10-digit phone number</span>
                  </label>
                )}
                {errors.parentPhoneNumber && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.parentPhoneNumber.message}</span>
                  </label>
                )}
              </div>

              {/* Personal Phone Number */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Personal Phone Number(Optional)</span>
                </label>
                <div className="flex items-center w-full">
                  <div className="relative">
                    <button
                      type="button"
                      className="flex items-center gap-1 border rounded-l-md px-3 py-3 bg-base-100 text-base-content border-base-300 h-12"
                      onClick={() => setShowPersonalCountryDropdown(!showPersonalCountryDropdown)}
                    >
                      <span>{getFlagForCountryCode(personalCountryCode, countries)}</span>
                      <span>{personalCountryCode}</span>
                      <ChevronDown size={16} />
                    </button>

                    {showPersonalCountryDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-72 bg-base-100 shadow-lg rounded-md z-50 max-h-60 overflow-y-auto border border-base-300">
                        <div className="p-2 sticky top-0 bg-base-100 border-b border-base-300">
                          <input
                            type="text"
                            placeholder="Search countries..."
                            className="input input-bordered input-sm w-full bg-base-100 text-base-content"
                            value={personalCountrySearch}
                            onChange={(e) => setPersonalCountrySearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {countries
                          .filter(country =>
                            country.name.toLowerCase().includes(personalCountrySearch.toLowerCase()) ||
                            country.code.includes(personalCountrySearch)
                          )
                          .map(country => (
                            <button
                              key={country.code + country.name}
                              type="button"
                              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-base-200 text-left text-base-content"
                              onClick={() => {
                                setPersonalCountryCode(country.code);
                                setShowPersonalCountryDropdown(false);
                                setPersonalCountrySearch("");
                                // Update phone number with new country code
                                if (personalPhoneNumber.length === 10) {
                                  setValue("phoneNumber", `${country.code} ${personalPhoneNumber}`);
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

                  <input
                    ref={personalPhoneInputRef}
                    type="text"
                    value={personalPhoneNumber}
                    onChange={(e) => handlePersonalPhoneChange(e.target.value)}
                    className={`input input-bordered flex-1 rounded-l-none bg-base-100 text-base-content border-base-300 ${errors.phoneNumber ? 'input-error' : ''}`}
                    placeholder="10-digit phone number"
                    maxLength={10}
                  />
                </div>
                {personalPhoneNumber.length > 0 && personalPhoneNumber.length < 10 && (
                  <label className="label">
                    <span className="label-text-alt text-error">Please enter a valid 10-digit phone number</span>
                  </label>
                )}
                {errors.phoneNumber && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.phoneNumber.message}</span>
                  </label>
                )}
              </div>

              {/* Address */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Address <span className="text-error">*</span></span>
                </label>
                <textarea
                  {...register("address")}
                  className={`textarea textarea-bordered w-full bg-base-100 text-base-content h-24 ${errors.address ? 'textarea-error' : ''}`}
                  placeholder="Enter address"
                />
                {errors.address && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.address.message}</span>
                  </label>
                )}
              </div>

            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="error"
                outline
                onClick={() => router.push('/manage-student')}
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
                    {id ? 'Updating...' : 'Adding...'}
                  </div>
                ) : (
                  id ? 'Update Student' : 'Add Student'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Transport Change Consent Modal */}
      <TransportChangeConsentModal
        isOpen={showConsentModal}
        onClose={handleConsentModalClose}
        onConfirm={handleTransportChangeConsent}
        changeDetails={transportChangeDetails}
        isLoading={isSubmitting}
      />
    </div>
  );
}

export default function AddStudentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-base-100">
        <div className="text-center">
          <img src="/loader/book1.gif" alt="Loading" className="w-12 h-12 mx-auto" />
          <p className="mt-4 text-base-content">Loading Students...</p>
        </div>
      </div>
    }>
      <AddStudentForm />
    </Suspense>
  );
}