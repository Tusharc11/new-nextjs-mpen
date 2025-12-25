'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Search, Plus, Edit, Trash2, User, Mail, MapPin, Calendar, Clock, Building2, Settings, ExternalLink, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ModalPopup from '@/app/components/ui/modalPopup';
import { formatDate } from '@/utils/dateUtils';
import { useSidebarStore } from '@/app/components/store/useSidebarStore';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

interface Admin {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  dateJoined: string;
  clientOrganizationId?: {
    clientId: {
      clientName: string;
      _id: string;
    };
    organizationId: {
      organizationName: string;
      _id: string;
    };
    _id: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BasicSetupStatus {
  setupNeeded: boolean;
  missingSetups: Array<{
    name: string;
    path: string;
  }>;
  counts: {
    classes: number;
    sections: number;
    rooms: number;
    sessions: number;
    examTypes: number;
  };
}

export default function ManageAdminPage() {
  const { isExpanded } = useSidebarStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [basicSetupStatus, setBasicSetupStatus] = useState<BasicSetupStatus | null>(null);
  const [isBasicSetupModalOpen, setIsBasicSetupModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepFormData, setStepFormData] = useState<{ [key: string]: any }>({
    classNumber: '',
    section: '',
    startDate: '',
    endDate: '',
    classId: '',
    roomName: '',
    capacity: '',
    roomType: '',
    examType: '',
    defaultBenchCapacity: '',
  });
  const [existingData, setExistingData] = useState<{ [key: string]: any[] }>({});
  const [existingDataLoading, setExistingDataLoading] = useState<{ [key: string]: boolean }>({});
  const [selectedAdminForSetup, setSelectedAdminForSetup] = useState<Admin | null>(null);
  const [clientsCount, setClientsCount] = useState(0);
  const [organizationsCount, setOrganizationsCount] = useState(0);

  const adminRole = "ADMIN";

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
    // Get user role from token
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      setUserRole(decodedPayload.role);
    }

    const fetchAdmins = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/manage-staff?role=${adminRole}`);
        if (!response.ok) throw new Error('Failed to fetch admins');
        const data = await response.json();
        setAdmins(data);
      } catch (error) {
        toast.error('Failed to fetch admins');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdmins();
  }, []);

  // Calculate unique clients and organizations counts
  useEffect(() => {
    const calculateCounts = () => {
      const uniqueClients = new Set();
      const uniqueOrganizations = new Set();

      admins.forEach(admin => {
        if (admin.clientOrganizationId?.clientId?._id) {
          uniqueClients.add(admin.clientOrganizationId.clientId._id);
        }
        if (admin.clientOrganizationId?.organizationId?._id) {
          uniqueOrganizations.add(admin.clientOrganizationId.organizationId._id);
        }
      });

      setClientsCount(uniqueClients.size);
      setOrganizationsCount(uniqueOrganizations.size);
    };

    calculateCounts();
  }, [admins]);

  // Fetch existing data for completed steps
  const fetchExistingData = async (stepKey: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      let clientOrganizationId = '';
      if (selectedAdminForSetup) {
        clientOrganizationId = selectedAdminForSetup.clientOrganizationId?._id || '';
      }

      let endpoint = '';
      switch (stepKey) {
        case 'classes':
          endpoint = `/api/classes?clientOrganizationId=${clientOrganizationId}`;
          break;
        case 'sections':
          endpoint = `/api/sections?clientOrganizationId=${clientOrganizationId}`;
          break;
        case 'sessions':
          endpoint = `/api/session?clientOrganizationId=${clientOrganizationId}`;
          break;
        case 'rooms':
          endpoint = `/api/rooms?clientOrganizationId=${clientOrganizationId}`;
          break;
        case 'examTypes':
          endpoint = `/api/examType?clientOrganizationId=${clientOrganizationId}`;
          break;
        default:
          return;
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExistingData(prev => ({
          ...prev,
          [stepKey]: Array.isArray(data) ? data : []
        }));
      }
    } catch (error) {
      toast.error(`Error fetching ${stepKey} data`);
    }
  };

  // Load existing data when modal opens or step changes
  useEffect(() => {
    if (isBasicSetupModalOpen && selectedAdminForSetup) {
      // Reset to first step when modal opens
      setCurrentStep(0);

      // Fetch basic setup status for the selected admin
      const fetchBasicSetupStatus = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;

          const clientOrganizationId = selectedAdminForSetup.clientOrganizationId?._id;
          if (!clientOrganizationId) return;

          const response = await fetch(`/api/basic-setup?clientOrganizationId=${clientOrganizationId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setBasicSetupStatus(data);
          }
        } catch (error) {
          toast.error('Error fetching basic setup status');
        }
      };

      // Fetch all form data when modal opens
      const fetchAllFormData = async () => {
        const clientOrganizationId = selectedAdminForSetup.clientOrganizationId?._id;
        if (!clientOrganizationId) return;

        // Set loading states for all data types
        setExistingDataLoading({
          classes: true,
          sections: true,
          sessions: true,
          rooms: true,
          examTypes: true,
          academicYears: true
        });

        try {
          const [
            classesRes, sectionsRes, sessionsRes,
            roomsRes, examTypesRes, academicYearsRes
          ] = await Promise.all([
            fetch(`/api/classes?clientOrganizationId=${clientOrganizationId}`),
            fetch(`/api/sections?clientOrganizationId=${clientOrganizationId}`),
            fetch(`/api/session?clientOrganizationId=${clientOrganizationId}`),
            fetch(`/api/rooms?clientOrganizationId=${clientOrganizationId}`),
            fetch(`/api/examType?clientOrganizationId=${clientOrganizationId}`),
            fetch(`/api/session?clientOrganizationId=${clientOrganizationId}`)
          ]);

          const [
            classes, sections, sessions,
            rooms, examTypes, academicYears
          ] = await Promise.all([
            classesRes.json(), sectionsRes.json(), sessionsRes.json(),
            roomsRes.json(),
            examTypesRes.json(), academicYearsRes.json()
          ]);

          setExistingData({
            classes, sections, sessions,
            rooms, examTypes, academicYears
          });
        } catch (error) {
          toast.error('Error fetching form data');
        } finally {
          // Clear loading states
          setExistingDataLoading({
            classes: false,
            sections: false,
            sessions: false,
            rooms: false,
            examTypes: false,
            academicYears: false
          });
        }
      };

      fetchBasicSetupStatus();
      fetchAllFormData();
    }
  }, [isBasicSetupModalOpen, selectedAdminForSetup]);

  const handleDeleteClick = (adminId: string) => {
    setSelectedAdminId(adminId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAdminId) return;

    try {
      const response = await fetch(`/api/manage-staff?id=${selectedAdminId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete admin');

      // Remove deleted admin from state
      setAdmins(prevAdmins => prevAdmins.filter(admin => admin._id !== selectedAdminId));
      toast.success('Admin deleted successfully');
    } catch (error) {
      toast.error('Error deleting admin');
    }

    // Close modal after deleting
    setIsDeleteModalOpen(false);
    setSelectedAdminId(null);
  };

  const filteredAdmins = admins.filter(admin => {
    const fullName = `${admin.firstName} ${admin.lastName}`.toLowerCase();
    const email = admin.email.toLowerCase();
    const clientName = admin.clientOrganizationId?.clientId?.clientName?.toLowerCase() || '';
    const orgName = admin.clientOrganizationId?.organizationId?.organizationName?.toLowerCase() || '';

    return fullName.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase()) ||
      clientName.includes(searchTerm.toLowerCase()) ||
      orgName.includes(searchTerm.toLowerCase());
  });

  const setupSteps = [
    { step: 1, name: 'Classes', key: 'classes', icon: '🏫' },
    { step: 2, name: 'Sections', key: 'sections', icon: '📋' },
    { step: 3, name: 'Sessions', key: 'sessions', icon: '📅' },
    { step: 4, name: 'Rooms', key: 'rooms', icon: '🏢' },
    { step: 5, name: 'Exam Types', key: 'examTypes', icon: '📝' }
  ];

  const getStepStatus = (stepIndex: number) => {
    if (!basicSetupStatus) return 'pending';
    const step = setupSteps[stepIndex];
    const isCompleted = basicSetupStatus.counts[step.key as keyof typeof basicSetupStatus.counts] > 0;
    const canProceed = stepIndex === 0 || basicSetupStatus.counts[
      setupSteps[stepIndex - 1].key as keyof typeof basicSetupStatus.counts
    ] > 0;

    if (isCompleted) return 'completed';
    if (canProceed) return 'active';
    return 'pending';
  };

  const handleSubmitStepForm = async (stepKey: string, formData: any) => {
    try {
      // Validate form data
      const isEmpty = Object.values(formData).every(value => !value || value === '');
      if (isEmpty) {
        toast.error('Please fill in all required fields');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Use the selected admin's clientOrganizationId
      const clientOrganizationId = selectedAdminForSetup?.clientOrganizationId?._id;

      if (!clientOrganizationId) {
        toast.error('Client organization not found for selected admin');
        return;
      }

      // Determine API endpoint and prepare data based on step type
      let endpoint = '';
      let requestData: any = {};

      switch (stepKey) {
        case 'classes':
          endpoint = '/api/classes';
          requestData = {
            classNumber: parseInt(formData.classNumber),
            clientOrganizationId: clientOrganizationId,
            isActive: true
          };
          break;

        case 'sections':
          endpoint = '/api/sections';
          requestData = {
            section: formData.section,
            clientOrganizationId: clientOrganizationId,
            isActive: true
          };
          break;

        case 'sessions':
          endpoint = '/api/session';
          requestData = {
            startDate: formData.startDate,
            endDate: formData.endDate,
            clientOrganizationId: clientOrganizationId,
            isActive: true
          };
          break;

        case 'rooms':
          endpoint = '/api/rooms';
          requestData = {
            room: formData.roomName,
            capacity: parseInt(formData.capacity),
            studentRoomType: formData.studentRoomType,
            entry: formData.entry,
            layout: formData.layout,
            clientOrganizationId: clientOrganizationId,
            isActive: true
          };
          break;

        case 'examTypes':
          endpoint = '/api/examType';
          requestData = {
            type: formData.examType,
            defaultBenchCapacity: parseInt(formData.defaultBenchCapacity),
            clientOrganizationId: clientOrganizationId,
            isActive: true
          };
          break;

        default:
          toast.error('Invalid step type');
          return;
      }

      // Make POST request to the appropriate API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Failed to add ${setupSteps.find(s => s.key === stepKey)?.name}`);
      }

      const result = await response.json();

      // Show success message
      toast.success(`${setupSteps.find(s => s.key === stepKey)?.name} added successfully!`);

      // Clear form data for this step
      setStepFormData({});

      // Update basicSetupStatus counts for the current step
      if (basicSetupStatus) {
        const updatedStatus = { ...basicSetupStatus };
        const stepKeyTyped = stepKey as keyof typeof basicSetupStatus.counts;
        updatedStatus.counts[stepKeyTyped] = (updatedStatus.counts[stepKeyTyped] || 0) + 1;
        setBasicSetupStatus(updatedStatus);
      }

      // Refresh existing data for this step by adding the new item to the existing list
      if (result && existingData[stepKey]) {
        setExistingData(prev => ({
          ...prev,
          [stepKey]: Array.isArray(prev[stepKey]) ? [...prev[stepKey], result] : [result]
        }));
      } else {
        // If existingData doesn't have this step yet, fetch it
        await fetchExistingData(stepKey);
      }

      // Don't need to refetch basic setup status since we updated it locally
      // The step will be marked as completed and user can proceed when ready

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save data');
    }
  };


  // Basic Setup Modal Component
  const BasicSetupModal = () => {
    if (!isBasicSetupModalOpen) return null;

    return (
      <div
        className="fixed bg-black/30 backdrop-blur-lg flex items-start justify-center z-[60] animate-in fade-in duration-300"
        style={{
          top: '0',
          left: isMobile ? '0' : isExpanded ? '16rem' : '4rem',
          right: '0',
          bottom: '0'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsBasicSetupModalOpen(false);
            setCurrentStep(0); // Reset to first step
          }
        }}
      >
        <div
          className="bg-base-100 rounded-lg shadow-2xl 
                     w-[calc(100%-1rem)] h-[calc(100%-2rem)] m-2
                     sm:w-[calc(100%-2rem)] sm:h-[calc(100%-3rem)] sm:rounded-xl sm:m-4 
                     md:w-[calc(100%-4rem)] md:h-[calc(100%-4rem)] md:rounded-2xl md:m-6
                     lg:w-[calc(100%-6rem)] lg:max-h-[calc(100vh-8rem)] lg:rounded-2xl lg:m-8
                     xl:max-w-7xl xl:max-h-[calc(100vh-6rem)] xl:rounded-3xl
                     2xl:max-w-[90rem] 2xl:max-h-[calc(100vh-4rem)]
                     overflow-hidden animate-in zoom-in-95 duration-300 border border-base-content/20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            {/* Header with close button */}
            <div className="sticky top-0 bg-gradient-to-r from-base-200 to-base-300 border-b border-base-content/20 z-10 px-4 py-3 shadow-sm">
              <div className="flex justify-between items-center gap-2 p-2">
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder flex-shrink-0">
                    <div className="bg-gradient-to-br from-primary to-secondary text-primary-content 
                                   rounded-xl w-10 h-10 sm:w-12 sm:h-12 shadow-lg">
                      <span className="text-lg sm:text-xl font-bold">
                        ⚙️
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-base-content">
                      System Setup
                    </h3>
                  </div>
                </div>
                <Button
                  outline
                  variant='error'
                  onClick={() => {
                    setIsBasicSetupModalOpen(false);
                    setCurrentStep(0); // Reset to first step
                  }}
                  className="btn-sm"
                >
                  <span className="text-lg font-bold">×</span>
                </Button>
              </div>

              {/* Progress Steps */}
              <div className="mt-2 p-4 bg-base-100/80 backdrop-blur-sm rounded-xl border border-base-content/10 shadow-sm">
                <div className="flex justify-center">
                  <ul className="steps steps-vertical sm:steps-horizontal w-full max-w-4xl">
                    {setupSteps.map((step, index) => {
                      const status = getStepStatus(index);
                      const isCompleted = status === 'completed';
                      const isActive = index === currentStep;

                      return (
                        <li
                          key={index}
                          className={`step text-xs sm:text-sm font-semibold ${isCompleted ? 'step-success' : isActive ? 'step-primary' : 'step-ghost'
                            }`}
                          title={`${step.name} ${isCompleted ? '(Completed)' : isActive ? '(Current)' : '(Pending)'}`}
                          data-content={isCompleted ? '✓' : (index + 1)}
                        >
                          <span className="flex items-center justify-center text-base-content">
                            {isCompleted ? (
                              <CheckCircle className="w-4 h-4 text-success mr-2" />
                            ) : (
                              <span className="mr-2">{index + 1}</span>
                            )}
                            {step.name}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-base-50/30">
              <div className="w-full max-w-full">
                {(() => {
                  const stepKey = setupSteps[currentStep]?.key;
                  switch (stepKey) {
                    case 'classes': return <ClassForm />;
                    case 'sections': return <SectionForm />;
                    case 'sessions': return <SessionForm />;
                    case 'rooms': return <RoomForm />;
                    case 'examTypes': return <ExamTypeForm />;
                    default: return null;
                  }
                })()}
              </div>
            </div>

            {/* Footer with navigation */}
            <div className="sticky bottom-0 bg-gradient-to-r from-base-200 to-base-300 border-t border-base-content/20 px-4 py-4 shadow-lg">
              <div className="flex justify-between items-center gap-4">
                <Button
                  outline
                  variant="primary"
                  onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  disabled={currentStep === 0}
                  className="px-6 py-2"
                >
                  <span className="text-md font-medium flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </span>
                </Button>
                <div className="text-center">
                  <span className="text-base-content/70 text-md font-medium">
                    Step {currentStep + 1} of {setupSteps.length}
                  </span>
                </div>
                <Button
                  outline
                  variant={currentStep === setupSteps.length - 1 ? 'success' : 'primary'}
                  onClick={() => {
                    if (currentStep === setupSteps.length - 1) {
                      setIsBasicSetupModalOpen(false);
                      setCurrentStep(0);
                      toast.success('Basic setup completed successfully!');
                    } else {
                      setCurrentStep((prev) => Math.min(setupSteps.length - 1, prev + 1));
                    }
                  }}
                  disabled={currentStep < setupSteps.length - 1 && getStepStatus(currentStep) !== 'completed'}
                  className="px-6 py-2"
                >
                  <span className="text-md font-medium flex items-center">
                    {currentStep === setupSteps.length - 1 ? 'Finish' : 'Next'}
                    {currentStep === setupSteps.length - 1 ? <Check className="w-4 h-4 ml-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Reference Data Forms - Enhanced with better styling
  const ClassForm = () => {
    const [classNumber, setClassNumber] = useState(stepFormData.classNumber || '');
    const classList = existingData.classes || [];
    const isLoadingClasses = existingDataLoading.classes;
    const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
    const [selectedClassToDelete, setSelectedClassToDelete] = useState<any>(null);
    const [isDeletingClass, setIsDeletingClass] = useState(false);

    const handleDeleteClass = async (classItem: any) => {
      if (!classItem._id) return;

      setIsDeletingClass(true);
      try {
        const response = await fetch(`/api/classes?id=${classItem._id}&clientOrganizationId=${selectedAdminForSetup?.clientOrganizationId?._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to delete class');
        }

        // Remove deleted class from state
        setExistingData(prev => ({
          ...prev,
          classes: prev.classes?.filter((c: any) => c._id !== classItem._id) || []
        }));

        // Update basicSetupStatus counts
        if (basicSetupStatus) {
          const updatedStatus = { ...basicSetupStatus };
          updatedStatus.counts.classes = Math.max(0, updatedStatus.counts.classes - 1);
          setBasicSetupStatus(updatedStatus);
        }

        toast.success('Class deleted successfully');
        
        // Close modal after successful deletion
        setIsDeleteClassModalOpen(false);
        setSelectedClassToDelete(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete class');
      } finally {
        setIsDeletingClass(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section - Left Side */}
          <div className="bg-base-100 border border-base-content/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <span className="text-2xl">🏫</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-base-content">Add New Class</h4>
              </div>
            </div>

            <div className="divider my-4"></div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleSubmitStepForm('classes', { classNumber });
                setClassNumber('');
              }}
              className="space-y-2"
            >
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-base-content">
                    Class Number <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full bg-base-100 text-base-content"
                  value={classNumber}
                  onChange={e => setClassNumber(e.target.value)}
                  required
                  min={1}
                  max={12}
                  placeholder="Enter class number (1-12)"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Enter class number
                  </span>
                </label>
              </div>

              <div className="flex justify-end">
                <Button
                  outline
                  type="submit"
                  variant="primary"
                  disabled={!classNumber}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Class
                </Button>
              </div>
            </form>
          </div>

          {/* Existing Classes List - Right Side */}
          <div className="bg-base-100 border border-base-content/20 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-base-content">Existing Classes</h4>
              {!isLoadingClasses && (
                <div className="badge badge-primary badge-md">
                  {classList.length} {classList.length === 1 ? 'class' : 'classes'}
                </div>
              )}
            </div>

            <div className="overflow-y-auto pr-2">
              {isLoadingClasses ? (
                <div className="flex flex-col justify-center items-center h-full">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                  <p className="mt-4 text-base-content/60 text-sm">Loading existing classes...</p>
                </div>
              ) : classList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {classList
                    .sort((a: any, b: any) => a.classNumber - b.classNumber)
                    .map((c: any) => (
                      <div key={c._id} className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-base-content text-sm">Class {c.classNumber}</h5>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedClassToDelete(c);
                              setIsDeleteClassModalOpen(true);
                            }}
                            className="btn btn-xs btn-ghost hover:bg-error/10"
                            title="Delete class"
                          >
                            <Trash2 className="w-4 h-4 text-error" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col justify-center items-center h-full text-base-content/60">
                  <div className="text-4xl mb-3">🏫</div>
                  <p className="text-sm text-center">No classes found.</p>
                  <p className="text-xs text-center mt-1">Add your first class using the form.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <ModalPopup
          isOpen={isDeleteClassModalOpen}
          onClose={() => {
            if (!isDeletingClass) {
              setIsDeleteClassModalOpen(false);
              setSelectedClassToDelete(null);
            }
          }}
          onConfirm={() => {
            if (selectedClassToDelete) {
              handleDeleteClass(selectedClassToDelete);
            }
          }}
          message={`Are you sure you want to delete Class ${selectedClassToDelete?.classNumber}? This action cannot be undone.`}
          isLoading={isDeletingClass}
        />
      </div>
    );
  };

  const SectionForm = () => {
    const [section, setSection] = useState(stepFormData.section || '');
    const sectionList = existingData.sections || [];
    const isLoadingSections = existingDataLoading.sections;
    const [isDeleteSectionModalOpen, setIsDeleteSectionModalOpen] = useState(false);
    const [selectedSectionToDelete, setSelectedSectionToDelete] = useState<any>(null);
    const [isDeletingSection, setIsDeletingSection] = useState(false);

    const handleDeleteSection = async (sectionItem: any) => {
      if (!sectionItem._id) return;

      setIsDeletingSection(true);
      try {
        const response = await fetch(`/api/sections?id=${sectionItem._id}&clientOrganizationId=${selectedAdminForSetup?.clientOrganizationId?._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to delete section');
        }

        // Remove from existing data
        setExistingData(prev => ({
          ...prev,
          sections: prev.sections?.filter((s: any) => s._id !== sectionItem._id) || []
        }));

        // Update basicSetupStatus counts
        if (basicSetupStatus) {
          const updatedStatus = { ...basicSetupStatus };
          updatedStatus.counts.sections = Math.max(0, updatedStatus.counts.sections - 1);
          setBasicSetupStatus(updatedStatus);
        }

        toast.success('Section deleted successfully!');
        
        // Close modal after successful deletion
        setIsDeleteSectionModalOpen(false);
        setSelectedSectionToDelete(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete section');
      } finally {
        setIsDeletingSection(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section - Left Side */}
          <div className="bg-base-100 border border-base-content/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-base-content">Add New Section</h4>
              </div>
            </div>

            <div className="divider my-4"></div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleSubmitStepForm('sections', { section });
                setSection('');
              }}
              className="space-y-2"
            >
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-base-content">
                    Section Name <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full bg-base-100 text-base-content"
                  value={section}
                  onChange={e => setSection(e.target.value.toUpperCase())}
                  required
                  maxLength={3}
                  placeholder="Enter section name (A, B, C, etc.)"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Enter section name
                  </span>
                </label>
              </div>
              <div className="flex justify-end">
                <Button
                  outline
                  type="submit"
                  variant="secondary"
                  disabled={!section}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </form>
          </div>

          {/* Existing Sections List */}
          <div className="bg-base-100 border border-base-content/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-base-content">Existing Sections</h4>
              {!isLoadingSections && (
                <div className="badge badge-primary badge-md">
                  {sectionList.length} {sectionList.length === 1 ? 'section' : 'sections'}
                </div>
              )}
            </div>

            {isLoadingSections ? (
              <div className="flex flex-col justify-center items-center h-40">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-base-content/60 text-sm">Loading existing sections...</p>
              </div>
            ) : sectionList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {sectionList
                  .sort((a: any, b: any) => a.section.localeCompare(b.section))
                  .map((s: any) => (
                    <div key={s._id} className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-base-content text-sm">Section {s.section}</h5>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedSectionToDelete(s);
                            setIsDeleteSectionModalOpen(true);
                          }}
                          className="btn btn-xs btn-ghost hover:bg-error/10"
                          title="Delete section"
                        >
                          <Trash2 className="w-4 h-4 text-error" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center h-40 text-base-content/60">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm text-center">No sections found.</p>
                <p className="text-xs text-center mt-1">Add your first section using the form.</p>
              </div>
            )}
          </div>
        </div>

        <ModalPopup
          isOpen={isDeleteSectionModalOpen}
          onClose={() => {
            if (!isDeletingSection) {
              setIsDeleteSectionModalOpen(false);
              setSelectedSectionToDelete(null);
            }
          }}
          onConfirm={() => {
            if (selectedSectionToDelete) {
              handleDeleteSection(selectedSectionToDelete);
            }
          }}
          message={`Are you sure you want to delete Section ${selectedSectionToDelete?.section}? This action cannot be undone.`}
          isLoading={isDeletingSection}
        />
      </div>
    );
  };

  const SessionForm = () => {
    const [startDate, setStartDate] = useState(stepFormData.startDate || '');
    const [endDate, setEndDate] = useState(stepFormData.endDate || '');
    const sessionList = existingData.sessions || [];
    const isLoadingSessions = existingDataLoading.sessions;
    const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false);
    const [selectedSessionToDelete, setSelectedSessionToDelete] = useState<any>(null);
    const [isDeletingSession, setIsDeletingSession] = useState(false);

    const handleDeleteSession = async (sessionItem: any) => {
      if (!sessionItem._id) return;

      setIsDeletingSession(true);
      try {
        const response = await fetch(`/api/session?id=${sessionItem._id}&clientOrganizationId=${selectedAdminForSetup?.clientOrganizationId?._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to delete session');
        }

        // Remove from existing data
        setExistingData(prev => ({
          ...prev,
          sessions: prev.sessions?.filter((s: any) => s._id !== sessionItem._id) || []
        }));

        // Update basicSetupStatus counts
        if (basicSetupStatus) {
          const updatedStatus = { ...basicSetupStatus };
          updatedStatus.counts.sessions = Math.max(0, updatedStatus.counts.sessions - 1);
          setBasicSetupStatus(updatedStatus);
        }

        toast.success('Academic session deleted successfully!');
        
        // Close modal after successful deletion
        setIsDeleteSessionModalOpen(false);
        setSelectedSessionToDelete(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete session');
      } finally {
        setIsDeletingSession(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="bg-base-100 border border-base-content/20 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-accent/10 rounded-lg">
                <span className="text-2xl">📅</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-base-content">Add Academic Session</h4>
                <p className="text-sm text-base-content/60">Set up academic years/sessions (e.g., 2024-25)</p>
              </div>
            </div>

            <div className="divider my-4"></div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleSubmitStepForm('sessions', { startDate, endDate });
                setStartDate('');
                setEndDate('');
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-base-content">
                      Start Date <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full bg-base-100 text-base-content focus:border-accent"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-base-content">
                      End Date <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full bg-base-100 text-base-content focus:border-accent"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    required
                    min={startDate}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  outline
                  type="submit"
                  variant="primary"
                  disabled={!startDate || !endDate}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Academic Session
                </Button>
              </div>
            </form>
          </div>

          {/* Existing Sessions List */}
          <div className="bg-base-100 border border-base-content/20 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-base-content">Academic Sessions</h4>
              {!isLoadingSessions && (
                <div className="badge badge-primary badge-md">
                  {sessionList.length} {sessionList.length === 1 ? 'session' : 'sessions'}
                </div>
              )}
            </div>

            {isLoadingSessions ? (
              <div className="flex flex-col justify-center items-center h-40">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-base-content/60 text-sm">Loading academic sessions...</p>
              </div>
            ) : sessionList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sessionList
                  .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                  .map((s: any) => (
                    <div key={s._id} className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-base-content text-sm mb-1">
                            Academic Year {new Date(s.startDate).getFullYear()}-{new Date(s.endDate).getFullYear()}
                          </h5>
                          <p className="text-xs text-base-content/70">
                            {new Date(s.startDate).toLocaleDateString('en-GB')} - {new Date(s.endDate).toLocaleDateString('en-GB')}
                          </p>
                          <p className="text-xs text-base-content/70">
                            Duration: {Math.ceil((new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedSessionToDelete(s);
                            setIsDeleteSessionModalOpen(true);
                          }}
                          className="btn btn-xs btn-ghost hover:bg-error/10"
                          title="Delete session"
                        >
                          <Trash2 className="w-4 h-4 text-error" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center h-40 text-base-content/60">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-sm text-center">No academic sessions found.</p>
                <p className="text-xs text-center mt-1">Add your first academic session using the form.</p>
              </div>
            )}
          </div>
        </div>

        <ModalPopup
          isOpen={isDeleteSessionModalOpen}
          onClose={() => {
            if (!isDeletingSession) {
              setIsDeleteSessionModalOpen(false);
              setSelectedSessionToDelete(null);
            }
          }}
          onConfirm={() => {
            if (selectedSessionToDelete) {
              handleDeleteSession(selectedSessionToDelete);
            }
          }}
          message={`Are you sure you want to delete this academic session? This action cannot be undone.`}
          isLoading={isDeletingSession}
        />
      </div>
    );
  };

  const RoomForm = () => {
    const [roomName, setRoomName] = useState(stepFormData.roomName || '');
    const [studentRoomType, setStudentRoomType] = useState(stepFormData.studentRoomType || '');
    const [entry, setEntry] = useState(stepFormData.entry || '');
    const [layout, setLayout] = useState([{ row: 1, benches: 1 }]);
    const roomList = existingData.rooms || [];
    const isLoadingRooms = existingDataLoading.rooms;
    const [isDeleteRoomModalOpen, setIsDeleteRoomModalOpen] = useState(false);
    const [selectedRoomToDelete, setSelectedRoomToDelete] = useState<any>(null);
    const [isDeletingRoom, setIsDeletingRoom] = useState(false);

    const handleDeleteRoom = async (roomItem: any) => {
      if (!roomItem._id) return;

      try {
        const response = await fetch(`/api/rooms?id=${roomItem._id}&clientOrganizationId=${selectedAdminForSetup?.clientOrganizationId?._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to delete room');
        }

        // Remove from existing data
        setExistingData(prev => ({
          ...prev,
          rooms: prev.rooms?.filter((r: any) => r._id !== roomItem._id) || []
        }));

        // Update basicSetupStatus counts
        if (basicSetupStatus) {
          const updatedStatus = { ...basicSetupStatus };
          updatedStatus.counts.rooms = Math.max(0, updatedStatus.counts.rooms - 1);
          setBasicSetupStatus(updatedStatus);
        }

        toast.success('Room deleted successfully!');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete room');
      }
      setIsDeleteRoomModalOpen(false);
    };

    const addRow = () => {
      const newRow = { row: layout.length + 1, benches: 1 };
      setLayout([...layout, newRow]);
    };

    const removeRow = (index: number) => {
      if (layout.length > 1) {
        const updatedLayout = layout.filter((_, i) => i !== index);
        // Renumber rows
        updatedLayout.forEach((row, i) => {
          row.row = i + 1;
        });
        setLayout(updatedLayout);
      }
    };

    const updateRow = (index: number, field: 'row' | 'benches', value: number) => {
      const updatedLayout = [...layout];
      updatedLayout[index][field] = value;
      setLayout(updatedLayout);
    };

    const calculateCapacity = () => {
      return layout.reduce((total, row) => total + (row.benches * 2), 0);
    };

    const resetForm = () => {
      setRoomName('');
      setStudentRoomType('');
      setEntry('TR');
      setLayout([{ row: 1, benches: 1 }]);
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="bg-base-100 border border-base-content/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-info/10 rounded-lg">
                <span className="text-2xl">🏢</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-base-content">Add Examination Room</h4>
                <p className="text-sm text-base-content/60">Add examination rooms and their seating capacity</p>
              </div>
            </div>

            <div className="divider my-4"></div>

            <form
              onSubmit={e => {
                e.preventDefault();
                const capacity = calculateCapacity();
                handleSubmitStepForm('rooms', { roomName, studentRoomType, entry, layout, capacity });
                resetForm();
              }}
              className="space-y-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-base-content">
                      Room Name <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full bg-base-100 text-base-content focus:border-primary"
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    required
                    placeholder="Enter room name"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-base-content">
                      Room Size <span className="text-error">*</span>
                    </span>
                  </label>
                  <select
                    className="select select-bordered w-full bg-base-100 text-base-content focus:border-primary"
                    value={studentRoomType}
                    onChange={e => setStudentRoomType(e.target.value)}
                    required
                  >
                    <option value="">Select room size</option>
                    <option value="XS">XS (class 1-2)</option>
                    <option value="S">S (class 3-4)</option>
                    <option value="M">M (class 5-6)</option>
                    <option value="L">L (class 7-8)</option>
                    <option value="XL">XL (class 9-10)</option>
                    <option value="XXL">XXL (class 11-12)</option>
                    <option value="ALL">Common/Multipurpose Room</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-base-content">
                      Entry Point <span className="text-error">*</span>
                    </span>
                  </label>
                  <select
                    className="select select-bordered w-full bg-base-100 text-base-content"
                    value={entry}
                    onChange={e => setEntry(e.target.value)}
                    required
                  >
                    <option value="">Select entry point</option>
                    <option value="TR">Top Right</option>
                    <option value="TL">Top Left</option>
                    <option value="BR">Back Right</option>
                    <option value="BL">Back Left</option>
                    <option value="L">Left Side</option>
                    <option value="R">Right Side</option>
                  </select>
                </div>
              </div>

              {/* Room Layout Designer */}
              <div className="bg-base-50 border border-primary/20 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="font-bold text-base-content flex items-center gap-2">
                    <span className="text-lg">🪑</span>
                    Room Seating Layout
                  </h5>
                  <div className="text-right">
                    <div className="text-sm font-medium text-base-content">
                      {layout.length} rows • {layout.reduce((sum, row) => sum + row.benches, 0)} benches
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {layout.map((row, index) => (
                    <div key={index} className="flex gap-3 items-end p-3 bg-base-100 rounded-lg border border-base-content/10">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="form-control">
                          <label className="label py-1">
                            <span className="label-text text-xs font-medium">Row {index + 1}</span>
                          </label>
                          <input
                            type="number"
                            className="input input-bordered bg-base-100 text-base-content"
                            value={row.row}
                            onChange={e => updateRow(index, 'row', parseInt(e.target.value) || 1)}
                            min={1}
                            required
                            readOnly
                          />
                        </div>
                        <div className="form-control">
                          <label className="label py-1">
                            <span className="label-text text-xs font-medium">Benches</span>
                          </label>
                          <input
                            type="number"
                            className="input input-bordered bg-base-100 text-base-content"
                            value={row.benches}
                            onChange={e => updateRow(index, 'benches', parseInt(e.target.value) || 1)}
                            min={1}
                            max={20}
                            required
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          outline
                          type="button"
                          variant="error"
                          onClick={() => removeRow(index)}
                          disabled={layout.length === 1}
                          title="Remove row"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-outline w-full text-primary border-primary hover:bg-primary"
                    onClick={addRow}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Row
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  outline
                  type="submit"
                  variant="primary"
                  disabled={!roomName || !studentRoomType}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Room
                </Button>
              </div>
            </form>
          </div>

          {/* Existing Rooms List */}
          <div className="bg-base-100 border border-base-content/20 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-base-content">Examination Rooms</h4>
              {!isLoadingRooms && (
                <div className="badge badge-info badge-md">
                  {roomList.length} {roomList.length === 1 ? 'room' : 'rooms'}
                </div>
              )}
            </div>

            {isLoadingRooms ? (
              <div className="flex flex-col justify-center items-center h-40">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-base-content/60 text-sm">Loading examination rooms...</p>
              </div>
            ) : roomList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {roomList
                  .sort((a: any, b: any) => a.room.localeCompare(b.room))
                  .map((r: any) => (
                    <div key={r._id} className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-base-content text-sm mb-1">{r.room}</h5>
                          <div className="grid grid-cols-2 gap-2 text-xs text-base-content/70">
                            <div>
                              <span className="font-medium">Capacity:</span> {r.capacity} students
                            </div>
                            <div>
                              <span className="font-medium">Size:</span> {r.studentRoomType}
                            </div>
                            <div>
                              <span className="font-medium">Entry:</span> {r.entry}
                            </div>
                            {r.layout && r.layout.length > 0 && (
                              <div className="col-span-2 mt-1">
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                  {r.layout.map((row: any, i: number) => (
                                    <div key={i} className="text-xs">
                                      Row {row.row}: {row.benches} benches
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedRoomToDelete(r);
                            setIsDeleteRoomModalOpen(true);
                          }}
                          className="btn btn-xs btn-ghost hover:bg-error/10"
                          title="Delete room"
                        >
                          <Trash2 className="w-4 h-4 text-error" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center h-40 text-base-content/60">
                <div className="text-4xl mb-3">🏢</div>
                <p className="text-sm text-center">No examination rooms found.</p>
                <p className="text-xs text-center mt-1">Add your first room using the form.</p>
              </div>
            )}
          </div>
        </div>

        <ModalPopup
          isOpen={isDeleteRoomModalOpen}
          onClose={() => {
            setIsDeleteRoomModalOpen(false);
            setSelectedRoomToDelete(null);
          }}
          onConfirm={() => {
            if (selectedRoomToDelete) {
              handleDeleteRoom(selectedRoomToDelete);
            }
          }}
          message={`Are you sure you want to delete room "${selectedRoomToDelete?.room}"? This action cannot be undone.`}
        />
      </div>
    );
  };

  const ExamTypeForm = () => {
    const [examType, setExamType] = useState(stepFormData.examType || '');
    const [defaultBenchCapacity, setDefaultBenchCapacity] = useState(stepFormData.defaultBenchCapacity || '2');
    const examTypeList = existingData.examTypes || [];
    const isLoadingExamTypes = existingDataLoading.examTypes;
    const [isDeleteExamTypeModalOpen, setIsDeleteExamTypeModalOpen] = useState(false);
    const [selectedExamTypeToDelete, setSelectedExamTypeToDelete] = useState<any>(null);


    const handleDeleteExamType = async (examTypeItem: any) => {
      if (!examTypeItem._id) return;

      try {
        const response = await fetch(`/api/examType?id=${examTypeItem._id}&clientOrganizationId=${selectedAdminForSetup?.clientOrganizationId?._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to delete exam type');
        }

        // Remove from existing data
        setExistingData(prev => ({
          ...prev,
          examTypes: prev.examTypes?.filter((e: any) => e._id !== examTypeItem._id) || []
        }));

        // Update basicSetupStatus counts
        if (basicSetupStatus) {
          const updatedStatus = { ...basicSetupStatus };
          updatedStatus.counts.examTypes = Math.max(0, updatedStatus.counts.examTypes - 1);
          setBasicSetupStatus(updatedStatus);
        }

        toast.success('Exam type deleted successfully!');
      } catch (error) {
        console.error('Error deleting exam type:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to delete exam type');
      }
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="bg-base-100 border border-base-content/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-warning/10 rounded-lg">
                <span className="text-2xl">📝</span>
              </div>
              <div>
                <h4 className="text-lg font-bold text-base-content">Add Examination Type</h4>
              </div>
            </div>

            <div className="divider my-4"></div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleSubmitStepForm('examTypes', { examType, defaultBenchCapacity });
                setExamType('');
                setDefaultBenchCapacity('2');
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-base-content">
                      Exam Type <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full bg-base-100 text-base-content"
                    value={examType}
                    onChange={e => setExamType(e.target.value)}
                    required
                    placeholder="Enter exam type"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium text-base-content">
                      Default Bench Capacity <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full bg-base-100 text-base-content"
                    value={defaultBenchCapacity}
                    onChange={e => setDefaultBenchCapacity(e.target.value)}
                    required
                    min={1}
                    max={4}
                    placeholder="Enter default bench capacity"
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      Recommended: 2 students per bench
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  outline
                  type="submit"
                  variant="primary"
                  disabled={!examType || !defaultBenchCapacity}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exam Type
                </Button>
              </div>
            </form>
          </div>

          {/* Existing Exam Types List */}
          <div className="bg-base-100 border border-base-content/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-base-content">Examination Types</h4>
              {!isLoadingExamTypes && (
                <div className="badge badge-primary badge-md">
                  {examTypeList.length} {examTypeList.length === 1 ? 'type' : 'types'}
                </div>
              )}
            </div>

            {isLoadingExamTypes ? (
              <div className="flex flex-col justify-center items-center h-40">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-base-content/60 text-sm">Loading examination types...</p>
              </div>
            ) : examTypeList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {examTypeList
                  .sort((a: any, b: any) => a.type.localeCompare(b.type))
                  .map((e: any) => (
                    <div key={e._id} className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-base-content text-sm">{e.type}</h5>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedExamTypeToDelete(e);
                            setIsDeleteExamTypeModalOpen(true);
                          }}
                          className="btn btn-xs btn-ghost hover:bg-error/10"
                          title="Delete exam type"
                        >
                          <Trash2 className="w-4 h-4 text-error" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center h-40 text-base-content/60">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-sm text-center">No examination types found.</p>
                <p className="text-xs text-center mt-1">Add your first exam type using the form.</p>
              </div>
            )}
          </div>
        </div>

        <ModalPopup
          isOpen={isDeleteExamTypeModalOpen}
          onClose={() => {
            setIsDeleteExamTypeModalOpen(false);
            setSelectedExamTypeToDelete(null);
          }}
          onConfirm={() => {
            if (selectedExamTypeToDelete) {
              handleDeleteExamType(selectedExamTypeToDelete);
            }
          }}
          message={`Are you sure you want to delete exam type "${selectedExamTypeToDelete?.type}"? This action cannot be undone.`}
        />
      </div>
    );
  };

  // Mobile Card Component
  const AdminCard = ({ admin }: { admin: Admin }) => (
    <div className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-base-300/50 hover:border-base-300 rounded-lg overflow-hidden">
      <div className="card-body p-4">
        {/* Header with name and actions */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div className="avatar placeholder">
              <div className="bg-gradient-to-br from-primary to-primary-focus text-primary-content rounded-full w-10 h-10 shadow-sm">
                <span className="text-sm font-semibold">
                  {admin.firstName.charAt(0)}{admin.lastName.charAt(0)}
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-base-content text-sm sm:text-base leading-tight">
                {admin.firstName} {admin.lastName}
              </h3>
              <div className="flex items-center mt-1">
                <span className={`badge badge-xs ${admin.isActive ? 'badge-success' : 'badge-error'}`}>
                  {admin.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          {userRole === 'ADMIN' && (
            <div className="flex gap-1">
              <button
                className="btn btn-ghost btn-xs sm:btn-sm hover:bg-warning/10 transition-colors rounded-md"
                onClick={() => {
                  setSelectedAdminForSetup(admin);
                  setIsBasicSetupModalOpen(true);
                }}
                title="Basic Setup"
              >
                <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-warning" />
              </button>
              <Link href={`/manage-admin/add?id=${admin._id}`}>
                <button className="btn btn-ghost btn-xs sm:btn-sm hover:bg-info/10 transition-colors rounded-md">
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4 text-info" />
                </button>
              </Link>
              <button
                className="btn btn-ghost btn-xs sm:btn-sm hover:bg-error/10 transition-colors rounded-md"
                onClick={() => handleDeleteClick(admin._id)}
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-error" />
              </button>
            </div>
          )}
        </div>

        {/* Admin details */}
        <div className="space-y-2.5">
          <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <Mail className="w-3.5 h-3.5 text-base-content/60" />
            </div>
            <span className="text-xs sm:text-sm text-base-content/80 truncate font-medium">
              {admin.email}
            </span>
          </div>
          <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-base-content/60" />
            </div>
            <span className="text-xs sm:text-sm text-base-content/80 truncate">
              {admin.clientOrganizationId?.clientId?.clientName || 'N/A'}
            </span>
          </div>
          <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-base-content/60" />
            </div>
            <span className="text-xs sm:text-sm text-base-content/80 truncate">
              {admin.clientOrganizationId?.organizationId?.organizationName || 'N/A'}
            </span>
          </div>
          <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-base-content/60" />
            </div>
            <span className="text-xs sm:text-sm text-base-content/80">
              Joined: <span className="font-medium">{formatDate(admin.dateJoined)}</span>
            </span>
          </div>
          <div className="flex items-center space-x-3 p-2 rounded-md bg-base-200/50 hover:bg-base-200/70 transition-colors">
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-base-content/60" />
            </div>
            <span className="text-xs sm:text-sm text-base-content/80">
              Created: <span className="font-medium">{formatDate(admin.createdAt)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col w-full h-[calc(100vh)] p-2 sm:p-3 md:p-4 lg:p-6 bg-base-100 overflow-hidden transition-all duration-100 ${isDeleteModalOpen ? 'blur-sm' : ''}`}>
      {/* Mobile and Tablet: Centered container with max-width */}
      <div className="block xl:hidden h-full">
        <div className="card bg-base-300 border border-base-content/20 shadow-xl h-full w-full max-w-6xl mx-auto flex flex-col">
          <div className="card-body p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="mb-4 sm:mb-6 flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-base-content">
                    Manage Admin
                  </h1>
                <div className="text-sm sm:text-base text-base-content/70 font-medium mt-1 sm:mt-0">
                  {searchTerm ? (
                    <span>
                      Showing {filteredAdmins.length} of {admins.length} admins
                    </span>
                  ) : (
                    <span>
                      {clientsCount} client{clientsCount !== 1 ? 's' : ''} • {organizationsCount} organization{organizationsCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Search and Add Button */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center">
                <div className="relative w-full max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-base-content w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Search admins..."
                    className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-sm sm:text-base bg-base-100/80 backdrop-blur-sm border border-base-content/20 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 placeholder:text-base-content/40 text-base-content/70"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {userRole === 'SUPER' && (
                  <Link href="/manage-admin/add">
                    <Button variant="primary" outline className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Admin
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
                  <p className="text-base-content text-sm sm:text-base">Loading admins...</p>
                </div>
              ) : filteredAdmins.length > 0 ? (
                <>
                  {/* Mobile Card Layout */}
                  <div className="block md:hidden h-full">
                    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                      <div className="space-y-3 sm:space-y-4 pb-4">
                      {filteredAdmins.map((admin) => (
                          <AdminCard key={admin._id} admin={admin} />
                      ))}
                      </div>
                    </div>
                  </div>

                  {/* Tablet Table Layout */}
                  <div className="hidden md:block h-full overflow-hidden">
                    <div className="border border-base-300 rounded-lg bg-base-100 h-full flex flex-col">
                      <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                        <table className="table w-full">
                          <thead className="bg-base-200 border-b-2 border-base-content/20 sticky top-0 z-0">
                            <tr>
                              <th className="text-base-content font-semibold text-sm lg:text-base min-w-[120px]">Full Name</th>
                              <th className="text-base-content font-semibold text-sm lg:text-base min-w-[180px]">Email</th>
                              <th className="text-base-content font-semibold text-sm lg:text-base min-w-[140px]">Client</th>
                              <th className="text-base-content font-semibold text-sm lg:text-base min-w-[160px]">Organization</th>
                              <th className="text-base-content font-semibold text-sm lg:text-base min-w-[120px]">Date Joined</th>
                              <th className="text-base-content font-semibold text-sm lg:text-base min-w-[80px]">Status</th>
                              {userRole === 'SUPER' && (
                                <th className="text-base-content font-semibold text-sm lg:text-base min-w-[100px] text-center">Actions</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAdmins.map((admin) => (
                              <tr key={admin._id} className="hover:bg-base-200 transition-colors">
                                <td className="text-base-content text-sm lg:text-base font-medium">{admin.firstName} {admin.lastName}</td>
                                <td className="text-base-content text-sm lg:text-base" title={admin.email}>
                                  <div className="truncate max-w-[180px]">{admin.email}</div>
                                </td>
                                <td className="text-base-content text-sm lg:text-base" title={admin.clientOrganizationId?.clientId?.clientName}>
                                  <div className="truncate max-w-[140px]">{admin.clientOrganizationId?.clientId?.clientName || 'N/A'}</div>
                                </td>
                                <td className="text-base-content text-sm lg:text-base" title={admin.clientOrganizationId?.organizationId?.organizationName}>
                                  <div className="truncate max-w-[160px]">{admin.clientOrganizationId?.organizationId?.organizationName || 'N/A'}</div>
                                </td>
                                <td className="text-base-content text-sm lg:text-base">{formatDate(admin.dateJoined)}</td>
                                <td className="text-base-content text-sm lg:text-base">
                                  <span className={`badge badge-xs ${admin.isActive ? 'badge-success' : 'badge-error'}`}>
                                    {admin.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                {userRole === 'SUPER' && (
                                  <td>
                                    <div className="flex gap-1 justify-center">
                                      <Button 
                                        className="btn btn-ghost btn-sm hover:bg-warning/10" 
                                        onClick={() => {
                                          setSelectedAdminForSetup(admin);
                                          setIsBasicSetupModalOpen(true);
                                        }}
                                        title="Basic Setup"
                                      >
                                        <Settings className="w-4 h-4 text-warning" />
                                      </Button>
                                      <Link href={`/manage-admin/add?id=${admin._id}`}>
                                        <Button className="btn btn-ghost btn-sm hover:bg-info/10" title="Edit Admin">
                                          <Edit className="w-4 h-4 text-info" />
                                        </Button>
                                      </Link>
                                      <Button
                                        className="btn btn-ghost btn-sm hover:bg-error/10"
                                        onClick={() => handleDeleteClick(admin._id)}
                                        title="Delete Admin"
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
                  <div className="text-4xl sm:text-6xl mb-4">👤</div>
                  <h3 className="text-base sm:text-lg font-semibold text-base-content mb-2">No admins found</h3>
                  <p className="text-sm sm:text-base text-base-content/60 text-center max-w-md">
                    {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first admin'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop and Large Screens: Full width layout */}
      <div className="hidden xl:block h-full">
        <div className="bg-base-300 border border-base-content/20 rounded-lg shadow-xl h-full w-full flex flex-col overflow-hidden">
          <div className="p-6 flex-shrink-0">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl xl:text-3xl font-bold text-base-content">
                  Manage Admin
                </h1>
                <div className="text-base text-base-content/70 font-medium">
                  {searchTerm ? (
                    <span>
                      Showing {filteredAdmins.length} of {admins.length} admins
                    </span>
                  ) : (
                    <span>
                      {clientsCount} client{clientsCount !== 1 ? 's' : ''} • {organizationsCount} organization{organizationsCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Search and Add Button */}
              <div className="flex gap-6 justify-between items-center">
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search admins..."
                    className="input input-bordered w-full pl-10 bg-base-100 text-base-content"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {userRole === 'SUPER' && (
                  <Link href="/manage-admin/add">
                    <Button variant="primary" outline className="px-6">
                      <Plus className="w-5 h-5 mr-2" />
                      Add Admin
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
                <p className="text-base-content text-lg">Loading admins...</p>
              </div>
            ) : filteredAdmins.length > 0 ? (
              <div className="border border-base-300 rounded-lg bg-base-100 h-full flex flex-col overflow-hidden">
                <div className="overflow-auto flex-1 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
                  <table className="table w-full">
                    <thead className="bg-base-200 border-b-2 border-base-content/20 sticky top-0 z-0">
                      <tr>
                        <th className="text-base-content font-semibold text-sm lg:text-base min-w-[150px]">Full Name</th>
                        <th className="text-base-content font-semibold text-sm lg:text-base min-w-[220px]">Email Address</th>
                              <th className="text-base-content font-semibold text-sm lg:text-base min-w-[180px]">Client</th>
                        <th className="text-base-content font-semibold text-sm lg:text-base min-w-[200px]">Organization</th>
                              <th className="text-base-content font-semibold text-sm lg:text-base min-w-[140px]">Date Joined</th>
                              <th className="text-base-content font-semibold text-sm lg:text-base min-w-[100px]">Status</th>
                        {userRole === 'SUPER' && (
                              <th className="text-base-content font-semibold text-sm lg:text-base min-w-[120px] text-center">Actions</th>
                        )}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAdmins.map((admin) => (
                              <tr key={admin._id} className="hover:bg-base-200 transition-colors">
                                <td className="text-base-content font-medium py-4">{admin.firstName} {admin.lastName}</td>
                                <td className="text-base-content py-4" title={admin.email}>
                                  <div className="truncate max-w-[220px]">{admin.email}</div>
                                </td>
                          <td className="text-base-content py-4" title={admin.clientOrganizationId?.clientId?.clientName}>
                            <div className="truncate max-w-[180px]">{admin.clientOrganizationId?.clientId?.clientName || 'N/A'}</div>
                                </td>
                          <td className="text-base-content py-4" title={admin.clientOrganizationId?.organizationId?.organizationName}>
                            <div className="truncate max-w-[200px]">{admin.clientOrganizationId?.organizationId?.organizationName || 'N/A'}</div>
                                </td>
                                <td className="text-base-content py-4">{formatDate(admin.dateJoined)}</td>
                                <td className="text-base-content py-4">
                                  <span className={`badge ${admin.isActive ? 'badge-success' : 'badge-error'}`}>
                                    {admin.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                          {userRole === 'SUPER' && (
                                <td className="py-4">
                                  <div className="flex gap-2 justify-center">
                                    <Button
                                      className="btn btn-ghost btn-sm hover:bg-warning/10 px-3"
                                      onClick={() => {
                                        setSelectedAdminForSetup(admin);
                                        setIsBasicSetupModalOpen(true);
                                      }}
                                      title="Basic Setup"
                                    >
                                      <Settings className="w-4 h-4 text-warning" />
                                    </Button>
                                    <Link href={`/manage-admin/add?id=${admin._id}`}>
                                      <Button className="btn btn-ghost btn-sm hover:bg-info/10 px-3" title="Edit Admin">
                                        <Edit className="w-4 h-4 text-info" />
                                      </Button>
                                    </Link>
                                    <Button
                                      className="btn btn-ghost btn-sm hover:bg-error/10 px-3"
                                      onClick={() => handleDeleteClick(admin._id)}
                                      title="Delete Admin"
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
                <div className="text-6xl mb-6">👤</div>
                <h3 className="text-xl font-semibold text-base-content mb-3">No admins found</h3>
                <p className="text-base text-base-content/60 text-center max-w-lg">
                  {searchTerm ? 'Try adjusting your search terms to find the admin you\'re looking for' : 'Get started by adding your first admin to the system'}
                </p>
                </div>
              )}
          </div>
        </div>
      </div>

      <BasicSetupModal />

      <ModalPopup
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        message="This will permanently delete this admin account."
      />
    </div>
  );
}
