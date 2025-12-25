'use client'
import React, { useState, useEffect } from 'react';
import { Plus, Upload, Trash2, CalendarRange, GraduationCap, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import AcademicYearDropdown from '../components/ui/academicYearDropdown';
import { ISession } from '../api/models/session';
import { useSidebarStore } from '../components/store/useSidebarStore';
import ModalPopup from '../components/ui/modalPopup';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';
import { UserRole } from '@/lib/role';

interface ITimetable {
  _id: string;
  title: string;
  fileName: string;
  academicYearId: ISession;
  uploadedBy: {
    firstName: string;
    lastName: string;
  };
  addedDate: string;
  modifiedDate: string;
  isStudentTimetable?: boolean;
  classId?: {
    _id: string;
    classNumber: string;
  };
  sectionId?: {
    _id: string;
    section: string;
  };
}

const ManageTimetablePage = () => {
  const { isExpanded } = useSidebarStore();
  const [academicYears, setAcademicYears] = useState<ISession[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<ISession | null>(null);
  const [isLoadingAcademicYears, setIsLoadingAcademicYears] = useState(true);
  const [timetables, setTimetables] = useState<ITimetable[]>([]);
  const [isLoadingTimetables, setIsLoadingTimetables] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');

  // Class and Section data
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);

  // Filter states for student timetable tab
  const [filterClassId, setFilterClassId] = useState<string>('');
  const [filterSectionId, setFilterSectionId] = useState<string>('');

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    file: null as File | null,
    isStudentTimetable: false,
    classId: '',
    sectionId: ''
  });
  const [isUploading, setIsUploading] = useState(false);

  // Fetch academic years
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        setIsLoadingAcademicYears(true);
        const token = localStorage.getItem('token');
        
        // Skip API call if no token (user logged out)
        if (!token) {
          return;
        }
        
        const response = await fetch('/api/session', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to fetch academic years');

        const data = await response.json();
        setAcademicYears(data);

        if (data.length > 0) {
          const sortedYears = [...data].sort((a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
          setSelectedAcademicYear(sortedYears[0]);
        }
      } catch (error) {
        console.error('Error fetching academic years:', error);
        toast.error('Failed to load academic years');
      } finally {
        setIsLoadingAcademicYears(false);
      }
    };

    fetchAcademicYears();
  }, []);

  // Fetch user role
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const decodedPayload = JSON.parse(atob(storedToken.split('.')[1]));
          setUserRole(decodedPayload.role);
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }
    }
  }, []);

  // Fetch timetables when academic year or tab changes
  useEffect(() => {
    if (selectedAcademicYear) {
      const isStudent = activeTab === 'student';
      if (isStudent) {
        // For student tab, check if logged-in user is a student
        if (userRole === UserRole.STUDENT) {
          // Auto-fetch for student users (API will handle class/section filtering)
          fetchTimetables(true);
        } else {
          // For admin/staff viewing student tab, don't auto-fetch - let user click fetch button
          setTimetables([]);
        }
      } else {
        // For teacher tab, auto-fetch without filters
        fetchTimetables(false);
      }
    }
  }, [selectedAcademicYear, activeTab, userRole]);

  // Fetch classes and sections when page loads
  useEffect(() => {
    fetchClasses();
    fetchSections();
  }, []);

  // Fetch classes and sections when modal opens (if not already loaded)
  useEffect(() => {
    if (isUploadModalOpen && classes.length === 0) {
      fetchClasses();
    }
    if (isUploadModalOpen && sections.length === 0) {
      fetchSections();
    }
  }, [isUploadModalOpen]);

  const fetchTimetables = async (isStudentTimetable?: boolean) => {
    if (!selectedAcademicYear) return;

    try {
      setIsLoadingTimetables(true);
      const token = localStorage.getItem('token');
      
      // Skip API call if no token (user logged out)
      if (!token) {
        return;
      }

      let url = `/api/timetable?academicYearId=${selectedAcademicYear._id}`;
      
      // If user is a student and requesting student timetables, add student parameters
      if (userRole === UserRole.STUDENT && isStudentTimetable) {
        try {
          const decodedPayload = JSON.parse(atob(token.split('.')[1]));
          url += `&role=${decodedPayload.role}`;
          url += `&studentId=${decodedPayload.id}`;
        } catch (error) {
        }
      } else {
        // Original logic for non-student users
        if (isStudentTimetable !== undefined) {
          url += `&isStudentTimetable=${isStudentTimetable}`;
        }
        
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch timetables');

      const data = await response.json();
      setTimetables(data);
    } catch (error) {
      console.error('Error fetching timetables:', error);
      toast.error('Failed to load timetables');
    } finally {
      setIsLoadingTimetables(false);
    }
  };

  const handleYearChange = (year: ISession) => {
    setSelectedAcademicYear(year);
  };

  // Fetch classes
  const fetchClasses = async () => {
    try {
      setIsLoadingClasses(true);
      const token = localStorage.getItem('token');
      
      // Skip API call if no token (user logged out)
      if (!token) {
        return;
      }
      
      const response = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch classes');

      const data = await response.json();
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setIsLoadingClasses(false);
    }
  };

  // Fetch sections
  const fetchSections = async () => {
    try {
      setIsLoadingSections(true);
      const token = localStorage.getItem('token');
      
      // Skip API call if no token (user logged out)
      if (!token) {
        return;
      }
      
      const response = await fetch('/api/sections', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch sections');

      const data = await response.json();
      setSections(data);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to load sections');
    } finally {
      setIsLoadingSections(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        e.target.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        e.target.value = '';
        return;
      }

      setUploadForm(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!uploadForm.file) {
      toast.error('Please select a PDF file');
      return;
    }

    if (!selectedAcademicYear) {
      toast.error('Please select an academic year');
      return;
    }

    if (uploadForm.isStudentTimetable && (!uploadForm.classId || !uploadForm.sectionId)) {
      toast.error('Please select class and section for student timetable');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('title', uploadForm.title.trim());
      formData.append('file', uploadForm.file);
      formData.append('academicYearId', selectedAcademicYear._id);
      formData.append('isStudentTimetable', uploadForm.isStudentTimetable.toString());

      if (uploadForm.isStudentTimetable) {
        formData.append('classId', uploadForm.classId);
        formData.append('sectionId', uploadForm.sectionId);
      }

      const token = localStorage.getItem('token');
      
      // Check if token exists
      if (!token) {
        return;
      }
      
      const response = await fetch('/api/timetable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload timetable');
      }

      toast.success('Timetable uploaded successfully');
      setIsUploadModalOpen(false);
      setUploadForm({ title: '', file: null, isStudentTimetable: false, classId: '', sectionId: '' });

      // Clear the file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Refresh the current tab's data
      if (activeTab === 'student') {
        fetchTimetables(true);
      } else {
        fetchTimetables(false);
      }
    } catch (error: any) {
      console.error('Error uploading timetable:', error);
      toast.error(error.message || 'Failed to upload timetable');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClick = (timetableId: string) => {
    setSelectedTimetableId(timetableId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTimetableId) return;
    await handleDeleteTimetable(selectedTimetableId, timetables.find(t => t._id === selectedTimetableId)?.title || '');
    setIsDeleteModalOpen(false);
  };

  const handleDeleteTimetable = async (timetableId: string, title: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // Check if token exists
      if (!token) {
        return;
      }
      
      const response = await fetch(`/api/timetable?id=${timetableId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete timetable');
      }

      toast.success('Timetable deleted successfully');
      if (activeTab === 'student') {
        fetchTimetables(true);
      } else {
        fetchTimetables(false);
      }
    } catch (error: any) {
      console.error('Error deleting timetable:', error);
      toast.error(error.message || 'Failed to delete timetable');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAcademicYearLabel = (year: ISession) => {
    const startDate = new Date(year.startDate);
    const endDate = new Date(year.endDate);
    return `${startDate.toLocaleString('default', { month: 'short' })} ${startDate.getFullYear()} - ${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`;
  };

  if (isLoadingAcademicYears) {
    return (
      <div className="flex flex-col w-full min-h-screen p-2 sm:p-3 lg:p-4 xl:p-6 bg-base-100">
        <div className="card bg-base-200 shadow-xl flex-1 w-full">
          <div className="card-body flex items-center justify-center p-8 sm:p-12">
            <div className="text-center">
              <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
              <p className="text-sm sm:text-base text-base-content">Loading timetables...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoadingAcademicYears && academicYears.length === 0) {
    return (
      <div className="flex flex-col w-full min-h-screen p-2 sm:p-3 lg:p-4 xl:p-6 bg-base-100">
        <div className="card bg-base-200 shadow-xl flex-1 w-full">
          <div className="card-body flex items-center justify-center p-8 sm:p-12">
            <div className="text-center">
              <div className="text-4xl sm:text-6xl mb-4">⚙️</div>
              <h3 className="text-lg sm:text-xl font-semibold text-base-content mb-3">Account Setup Required</h3>
              <p className="text-sm sm:text-base text-base-content/60 max-w-md mx-auto">
                Please set up this account first by creating academic years before managing timetables.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedAcademicYear) {
    return (
      <div className="flex flex-col w-full min-h-screen p-2 sm:p-3 lg:p-4 xl:p-6 bg-base-100">
        <div className="card bg-base-200 shadow-xl flex-1 w-full">
          <div className="card-body flex items-center justify-center p-8 sm:p-12">
            <div className="text-center">
              <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
              <p className="text-sm sm:text-base text-base-content">Loading timetables...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-64px)] p-2 sm:p-3 lg:p-4 xl:p-6 bg-base-100">
      <div className="card bg-base-300 border border-base-content/20 shadow-xl h-fit w-full">
        <div className="card-body p-3 sm:p-4 lg:p-5 xl:p-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="card-title text-base sm:text-lg md:text-xl lg:text-2xl text-base-content break-words">
                {userRole === 'ADMIN' || userRole === 'STAFF' ? 'Timetable Management' : 'Timetables'}
              </h2>

              <div className="w-full sm:w-auto min-w-0">
                <AcademicYearDropdown
                  academicYears={academicYears}
                  selectedYearId={selectedAcademicYear}
                  onYearChange={handleYearChange}
                  isLoading={isLoadingAcademicYears}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center mb-4 gap-3">
            {(userRole === 'ADMIN' || userRole === 'STAFF') && (
              <Button
                variant='primary'
                outline
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload Timetable
              </Button>
            )}
          </div>

          {/* Tabs styled like calendar page */}
          <Tabs defaultValue="student" className="w-full" onValueChange={(v) => setActiveTab(v as 'student' | 'teacher')}>
            <TabsList className="relative grid w-full grid-cols-2 bg-base-300 max-w-full sm:max-w-md mx-auto mb-4 sm:mb-6 rounded-xl p-1 shadow-lg border border-base-content/15">
              <div
                className={`absolute top-1 bottom-1 rounded-lg bg-base-100 shadow-sm transition-all duration-300 ease-in-out ${activeTab === 'student' ? 'left-1 right-1/2 mr-1.5' : 'left-1/2 right-1 ml-1.5'}`}
              />
              <TabsTrigger
                value="student"
                className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${activeTab === 'student' ? 'text-emerald-600' : 'text-base-content/80 hover:text-base-content'}`}
              >
                <GraduationCap className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">Student Timetable</span>
              </TabsTrigger>
              <TabsTrigger
                value="teacher"
                className={`relative flex items-center justify-center rounded-lg transition-all duration-300 ease-in-out sm:px-4 py-2.5 min-w-0 z-10 ${activeTab === 'teacher' ? 'text-blue-400' : 'text-base-content/80 hover:text-base-content'}`}
              >
                <User className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">Teacher Timetable</span>
              </TabsTrigger>
            </TabsList>

            <div className="overflow-x-auto">
              <TabsContent value="student" className="mt-0">
                {/* Filter Section for Student Timetables - Only for ADMIN/STAFF */}
                {userRole !== 'STUDENT' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {/* Class Selection */}
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text text-base-content">Select Class</span>
                    </label>
                    <div className="relative">
                      <select
                        className="select select-bordered w-full bg-base-100 text-base-content"
                        value={filterClassId}
                        onChange={(e) => setFilterClassId(e.target.value)}
                        disabled={isLoadingClasses}
                      >
                        <option value="">Select Class</option>
                        {classes.map((cls) => (
                          <option key={cls._id} value={cls._id} className="text-base-content bg-base-100">
                            {cls.classNumber}
                          </option>
                        ))}
                      </select>
                      {isLoadingClasses && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <span className="loading loading-spinner loading-sm text-primary"></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Selection */}
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text text-base-content">Select Section</span>
                    </label>
                    <div className="relative">
                      <select
                        className="select select-bordered w-full bg-base-100 text-base-content"
                        value={filterSectionId}
                        onChange={(e) => setFilterSectionId(e.target.value)}
                        disabled={isLoadingSections}
                      >
                        <option value="">Select Section</option>
                        {sections.map((section) => (
                          <option key={section._id} value={section._id} className="text-base-content bg-base-100">
                            {section.section}
                          </option>
                        ))}
                      </select>
                      {isLoadingSections && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <span className="loading loading-spinner loading-sm text-primary"></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fetch Button */}
                <div className="flex justify-end mb-6">
                  <Button
                    type="button"
                    variant="primary"
                    outline
                    onClick={() => {
                      if (!selectedAcademicYear) {
                        toast.error('Please select an academic year');
                        return;
                      }

                      const hasClass = filterClassId.trim() !== '';
                      const hasSection = filterSectionId.trim() !== '';

                      // For student timetables, require both class and section
                      if (!hasClass && !hasSection) {
                        toast.error('Please select class and section to view student timetables');
                        return;
                      }

                      if (!hasClass) {
                        toast.error('Please select a class');
                        return;
                      }

                      if (!hasSection) {
                        toast.error('Please select a section');
                        return;
                      }

                      // Both class and section are selected, proceed with fetch
                      fetchTimetables(true);
                    }}
                    disabled={isLoadingTimetables}
                    className="w-full sm:w-auto"
                  >
                    {isLoadingTimetables ? (
                      <>
                        <span className="loading loading-spinner loading-sm mr-2"></span>
                        Loading...
                      </>
                    ) : (
                      'Fetch Timetables'
                    )}
                  </Button>
                    </div>
                  </>
                )}

                {isLoadingTimetables ? (
                  <div className="flex flex-col justify-center items-center p-8">
                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                    <p className="mt-2 text-base-content">Loading timetables...</p>
                  </div>
                ) : (
                  timetables.length > 0 ? (
                    <div className="space-y-6">
                      {timetables.map(timetable => (
                        <div key={timetable._id} className="border border-base-300 rounded-lg bg-base-100 shadow-lg overflow-hidden">
                          <div className="p-4 bg-base-200 border-b border-base-300">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <CalendarRange className="w-6 h-6 text-red-600 flex-shrink-0" />
                                <div className="min-w-0 flex-1 flex items-center gap-4">
                                  <h4 className="font-semibold text-lg text-base-content break-words">{timetable.title}</h4>
                                  {timetable.classId && timetable.sectionId && (
                                    <span className="badge badge-xs xs:badge-sm sm:badge-md md:badge-lg lg:badge-xl 
                                                    bg-primary/30 border-primary/80 
                                                    px-1 xs:px-2 sm:px-3 md:px-4 py-0.5 xs:py-1 sm:py-2">
                                      Class {timetable.classId.classNumber} {timetable.sectionId.section}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                                <Button variant="error" outline className="btn-sm" onClick={() => handleDeleteClick(timetable._id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="p-2 sm:p-4">
                            <div className="w-full h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-[65vh] xl:h-[70vh] 2xl:h-[75vh] max-h-[800px] min-h-[280px] border border-base-300 rounded-lg overflow-hidden">
                              <iframe
                                src={`/api/timetable?id=${timetable._id}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=Fit&zoom=page-width`}
                                className="w-full h-full border-0"
                                title={`Timetable: ${timetable.title}`}
                                style={{ background: '#ffffff' }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12 text-base-content/70">
                      <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📅</div>
                      {userRole === 'STUDENT' ? (
                        <p className="text-sm sm:text-base mb-4">No timetable has been set for your class yet.</p>
                      ) : (
                        <>
                          <p className="text-sm sm:text-base mb-4">No student timetables available for this academic year.</p>
                          {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                            <Button variant='primary' outline className="btn-sm sm:btn-md" onClick={() => setIsUploadModalOpen(true)}>
                              <Plus className="w-4 h-4 mr-1" />
                              Upload first timetable
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )
                )}
              </TabsContent>

              <TabsContent value="teacher" className="mt-0">
                {isLoadingTimetables ? (
                  <div className="flex flex-col justify-center items-center p-8">
                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                    <p className="mt-2 text-base-content">Loading timetables...</p>
                  </div>
                ) : (
                  timetables.length > 0 ? (
                    <div className="space-y-6">
                      {timetables.map(timetable => (
                        <div key={timetable._id} className="border border-base-300 rounded-lg bg-base-100 shadow-lg overflow-hidden">
                          <div className="p-4 bg-base-200 border-b border-base-300">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <CalendarRange className="w-6 h-6 text-red-600 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold text-lg text-base-content break-words">{timetable.title}</h4>
                                  {timetable.classId && timetable.sectionId && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="badge badge-primary badge-sm">
                                        Class {timetable.classId.classNumber}
                                      </span>
                                      <span className="badge badge-secondary badge-sm">
                                        Section {timetable.sectionId.section}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                                <Button variant="error" outline className="btn-sm" onClick={() => handleDeleteClick(timetable._id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="p-2 sm:p-4">
                            <div className="w-full h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-[65vh] xl:h-[70vh] 2xl:h-[75vh] max-h-[800px] min-h-[280px] border border-base-300 rounded-lg overflow-hidden">
                              <iframe
                                src={`/api/timetable?id=${timetable._id}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=Fit&zoom=page-width`}
                                className="w-full h-full border-0"
                                title={`Timetable: ${timetable.title}`}
                                style={{ background: '#ffffff' }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12 text-base-content/70">
                      <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📅</div>
                      <p className="text-sm sm:text-base mb-4">No teacher timetables available for this academic year.</p>
                      {(userRole === 'ADMIN' || userRole === 'STAFF') && (
                        <Button variant='primary' outline className="btn-sm sm:btn-md" onClick={() => setIsUploadModalOpen(true)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Upload first timetable
                        </Button>
                      )}
                    </div>
                  )
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Upload Modal (Aligned with Manage-Staff modal UI/UX) */}
      {isUploadModalOpen && (
        <div
          className="fixed bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] animate-in fade-in duration-200"
          style={{
            top: '4rem',
            left: isExpanded ? '16rem' : '4rem',
            right: '0',
            bottom: '0'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsUploadModalOpen(false);
            }
          }}
        >
          <div
            className="bg-base-100 rounded-lg shadow-2xl 
                     w-[calc(100%-1rem)] h-auto max-h-[calc(100vh-2rem)] m-2
                     sm:w-[calc(100%-2rem)] sm:max-h-[calc(100vh-3rem)] sm:m-4 
                     md:w-[calc(100%-4rem)] md:max-h-[calc(100vh-4rem)] md:m-6
                     lg:w-[calc(100%-6rem)] lg:max-h-[calc(100vh-8rem)] lg:m-8
                     xl:max-w-2xl xl:max-h-[calc(100vh-6rem)]
                     2xl:max-w-2xl 2xl:max-h-[calc(100vh-4rem)]
                     overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col">
              {/* Header */}
              <div className="bg-base-200 border-b border-base-300 px-3 py-2 sm:px-5 sm:py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold text-base-content">Upload Timetable</h3>
                  <Button outline variant='error' onClick={() => setIsUploadModalOpen(false)}>
                    <span className="text-lg sm:text-xl font-bold">×</span>
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-base-content">Title<span className="text-xs text-error"> *</span></span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered text-base-content"
                      placeholder="Enter timetable title"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary"
                        checked={uploadForm.isStudentTimetable}
                        onChange={(e) => setUploadForm(prev => ({
                          ...prev,
                          isStudentTimetable: e.target.checked,
                          ...(e.target.checked ? {} : { classId: '', sectionId: '' })
                        }))}
                      />
                      <label className="label">
                        <span className="label-text text-base-content">Student Timetable<span className="text-xs text-error"> *</span></span>
                      </label>
                    </div>
                  </div>
                  {uploadForm.isStudentTimetable && (
                    <>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text text-base-content">Class<span className="text-xs text-error"> *</span></span>
                        </label>
                        <select
                          className="select select-bordered text-base-content"
                          value={uploadForm.classId}
                          onChange={(e) => setUploadForm(prev => ({ ...prev, classId: e.target.value }))}
                          disabled={isLoadingClasses}
                        >
                          <option value="">Select Class</option>
                          {classes.map((cls) => (
                            <option key={cls._id} value={cls._id}>
                              {cls.classNumber}
                            </option>
                          ))}
                        </select>
                        {isLoadingClasses && (
                          <span className="loading loading-spinner loading-xs mt-1"></span>
                        )}
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text text-base-content">Section<span className="text-xs text-error"> *</span></span>
                        </label>
                        <select
                          className="select select-bordered text-base-content"
                          value={uploadForm.sectionId}
                          onChange={(e) => setUploadForm(prev => ({ ...prev, sectionId: e.target.value }))}
                          disabled={isLoadingSections}
                        >
                          <option value="">Select Section</option>
                          {sections.map((section) => (
                            <option key={section._id} value={section._id}>
                              {section.section}
                            </option>
                          ))}
                        </select>
                        {isLoadingSections && (
                          <span className="loading loading-spinner loading-xs mt-1"></span>
                        )}
                      </div>
                    </>
                  )}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-base-content">PDF File<span className="text-xs text-error"> *</span></span>
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      className="file-input file-input-bordered text-base-content"
                      onChange={handleFileChange}
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt text-info">
                        Only single-page PDF files are allowed. Maximum size: 5MB
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-6">
                    <Button
                      variant="error"
                      outline
                      className="w-full sm:w-auto order-2 sm:order-1"
                      onClick={() => setIsUploadModalOpen(false)}
                      disabled={isUploading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      outline
                      disabled={isUploading}
                      className="w-full sm:w-auto order-1 sm:order-2"
                    >
                      {isUploading ? (
                        <>
                          <span className="loading loading-spinner loading-sm mr-2"></span>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ModalPopup
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        message="Are you sure you want to delete this timetable? This action cannot be undone."
      />
    </div>
  );
};

export default ManageTimetablePage;
