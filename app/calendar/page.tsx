'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { GraduationCap, Palmtree, ChevronDown, Plus, Calendar, Sparkles, Check, Eye, Printer, CalendarFold, PenIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import AcademicYearDropdown from '../components/ui/academicYearDropdown';
import { ISession } from '../api/models/session';
import { IClass } from '../api/models/class';
import { IRoom } from '../api/models/rooms';
import { ISection } from '../api/models/section';
import { ISeatingArrangement } from '../api/models/seatingArrangement';
import { SeatingArrangementModal } from '../components/ui/seatingArrangement';
import { IExamType } from '../api/models/examType';
import { useSidebarStore } from '../components/store/useSidebarStore';
import Image from 'next/image';
import bookLoader from '@/public/book.gif';
import bookLoader1 from '@/public/book1.gif';

interface AcademicYear {
  _id: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface Subject {
  id: string;
  subjectId: string;
  class: {
    _id: string;
    classNumber: number;
  };
  name: string;
  date: string;
  seatingArrangement: ISeatingArrangement[];
  benchCapacity: number;
  hasRoomSeatingPlan?: boolean;
}

interface Exam {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string;
  subjects?: Subject[];
  class: string;
}

const CalendarPage = () => {
  const { isExpanded } = useSidebarStore();
  const [academicYears, setAcademicYears] = useState<ISession[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<ISession | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingAcademicYears, setIsLoadingAcademicYears] = useState(true);
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);
  const [examTypes, setExamTypes] = useState<IExamType[]>([]);
  const [isLoadingExamTypes, setIsLoadingExamTypes] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [examFormData, setExamFormData] = useState({
    examType: '',
    subjectId: '',
    examDate: '',
    classId: '',
    isBenchCapacityCapture: false,
    benchCapacity: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [benchCapacityError, setBenchCapacityError] = useState('');
  const [classes, setClasses] = useState<IClass[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [examsByType, setExamsByType] = useState<{ [key: string]: any[] }>({});
  const [activeTab, setActiveTab] = useState('events');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [studentSectionId, setStudentSectionId] = useState<string | null>(null);
  const [isSeatingModalOpen, setIsSeatingModalOpen] = useState(false);
  const [seatingFormData, setSeatingFormData] = useState({
    examTypeId: '',
    classNumber: '',
    sectionId: '',
    examId: '',
    subjectId: '',
    venueDetails: [{ roomId: '', startRollNo: '', endRollNo: '', rollNumbers: [] as number[] }],
    benchCapacity: 1,
    rooms: [] as IRoom[],
    examDate: '',
    subjectName: ''
  });
  const [sections, setSections] = useState<{ _id: string; sectionList: ISection[] }[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [subjectSections, setSubjectSections] = useState<ISection[]>([]);
  const [isLoadingSubjectSections, setIsLoadingSubjectSections] = useState(false);
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const studentRole = 'STUDENT';
  const [showSeatingModal, setShowSeatingModal] = useState(false);
  const [seatingArrangementData, setSeatingArrangementData] = useState<any>(null);
  const [showRoomListModal, setShowRoomListModal] = useState(false);
  const [roomSeatingData, setRoomSeatingData] = useState<any>(null);
  const [selectedRoomData, setSelectedRoomData] = useState<any>(null);
  const [classSectionCount, setClassSectionCount] = useState<any>(null);
  const [isLoadingSeatingModal, setIsLoadingSeatingModal] = useState(false);
  const [isLoadingClassSectionStudents, setIsLoadingClassSectionStudents] = useState(false);
  const [subjectSectionCounts, setSubjectSectionCounts] = useState<{ [subjectId: string]: number }>({});

  // Event creation modal state
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    id: '',
    name: '',
    summary: '',
    details: '',
    photo1: '',
    photo2: '',
    photo3: '',
    startDate: '',
    endDate: ''
  });
  const [eventFormErrors, setEventFormErrors] = useState<any>({});
  const [apiEvents, setApiEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photosInputRef = useRef<HTMLInputElement>(null);

  // Edit mode photo upload state
  const [uploadingEditPhotos, setUploadingEditPhotos] = useState(false);
  const editPhotosInputRef = useRef<HTMLInputElement>(null);

  // Event view modal state
  const [isEventViewModalOpen, setIsEventViewModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editEventFormData, setEditEventFormData] = useState<any>({
    id: '',
    name: '',
    summary: '',
    details: '',
    photo1: '',
    photo2: '',
    photo3: '',
    startDate: '',
    endDate: ''
  });
  const [editEventFormErrors, setEditEventFormErrors] = useState<any>({});
  const [editPhotoPreviews, setEditPhotoPreviews] = useState<string[]>([]);
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);

  // Sample data
  const holidays = [
    { id: 1, name: 'New Year\'s Day', date: '2024-01-01', description: 'Public Holiday' },
    { id: 2, name: 'Republic Day', date: '2024-01-26', description: 'National Holiday' },
    { id: 3, name: 'Holi', date: '2024-03-25', description: 'Festival Holiday' },
    { id: 4, name: 'Independence Day', date: '2024-08-15', description: 'National Holiday' },
    { id: 5, name: 'Diwali', date: '2024-10-31', description: 'Festival Holiday' },
    { id: 6, name: 'Christmas', date: '2024-12-25', description: 'Public Holiday' },
  ];

  // Fetch academic years from API
  useEffect(() => {
    fetchClasses();

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
          // Sort by startDate in descending order
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

  // Fetch user data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const decodedPayload = JSON.parse(atob(storedToken.split('.')[1]));
          setUserRole(decodedPayload.role);
          setUserId(decodedPayload.id);
          // If user is a student, fetch their class ID
          if (decodedPayload.role === 'STUDENT') {
            fetchStudentClassId(decodedPayload.id);
          }
        } catch (error) {
          toast.error('Error retrieving user data');
        }
      }
    }
  }, []);

  const fetchSections = async (academicYearId: string) => {
    try {
      setIsLoadingSections(true);
      const token = localStorage.getItem('token');

      // Skip API call if no token (user logged out)
      if (!token) {
        return;
      }

      const response = await fetch(`/api/sections?academicYearId=${academicYearId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch sections');

      const data = await response.json();
      setSections(data); // Store the full response with class groupings
    } catch (error) {
      toast.error('Failed to load sections');
    } finally {
      setIsLoadingSections(false);
    }
  };

  // Helper function to get sections for a specific class
  const getSectionsForClass = (classNumber: string): ISection[] => {
    if (!sections || sections.length === 0) return [];

    // Find the class ID for the given class number
    const classObj = classes.find(c => c.classNumber === Number(classNumber));
    if (!classObj) return [];

    // Find the sections for this class ID and sort them
    const classSections = sections.find((item) => item._id === classObj._id);
    return [...(classSections?.sectionList || [])].sort((a, b) =>
      a.section.localeCompare(b.section)
    );
  };

  // New function to get sections that have students enrolled in a specific subject for a specific class
  const getSectionsWithSubjectForClass = async (classNumber: string, subjectId: string): Promise<ISection[]> => {
    try {
      // Find the class ID for the given class number
      const classObj = classes.find(c => c.classNumber === Number(classNumber));
      if (!classObj) return [];

      const token = localStorage.getItem('token');

      // Skip API call if no token (user logged out)
      if (!token) {
        return [];
      }

      const response = await fetch(`/api/student-class?getSectionsWithSubject=true&classId=${classObj._id}&subjectId=${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.sections || [];
    } catch (error) {
      return [];
    }
  };


  // Fetch student's class ID
  const fetchStudentClassId = async (studentId: string) => {
    try {
      const token = localStorage.getItem('token');

      // Skip API call if no token (user logged out)
      if (!token) {
        return;
      }

      const response = await fetch(`/api/manage-staff?id=${studentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch student data');

      const studentData = await response.json();
      if (studentData && studentData.class._id) {
        setStudentClassId(studentData.class._id);
        setStudentSectionId(studentData.section._id);
      }
    } catch (error) {
    }
  };

  // Fetch exam types
  const fetchExamTypes = async () => {
    try {
      setIsLoadingExamTypes(true);
      const token = localStorage.getItem('token');

      // Skip API call if no token (user logged out)
      if (!token) {
        return;
      }

      const response = await fetch('/api/examType', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch exam types');
      const data = await response.json();
      setExamTypes(data);
    } catch (error) {
      toast.error('Failed to load exam types');
    } finally {
      setIsLoadingExamTypes(false);
    }
  };

  // Fetch subjects based on selected class and filter out already scheduled subjects
  const fetchSubjectsByClass = async (classId: string) => {
    if (!classId || !examFormData.examType || !selectedAcademicYear) return;

    try {
      setIsLoadingSubjects(true);
      // Fetch all subjects for the class
      const token = localStorage.getItem('token');

      // Skip API call if no token (user logged out)
      if (!token) {
        return;
      }

      const response = await fetch(`/api/manage-subject?classId=${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch subjects for this class');
      const allSubjects = await response.json();

      setSubjects(allSubjects);
    } catch (error) {
      toast.error('Failed to load subjects for this class');
    } finally {
      setIsLoadingSubjects(false);
    }
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
      toast.error('Failed to load classes');
    } finally {
      setIsLoadingClasses(false);
    }
  };

  // Fetch exams from API
  const fetchExams = async () => {
    if (!selectedAcademicYear) return;

    try {
      setIsLoadingExams(true);
      const token = localStorage.getItem('token');

      // Skip API call if no token (user logged out)
      if (!token) {
        return;
      }

      let apiUrl = `/api/manage-exam?academicYearId=${selectedAcademicYear._id}`;

      // If user is a student, add class ID filter
      if (userRole === 'STUDENT' && studentClassId && studentSectionId) {
        apiUrl += `&classId=${studentClassId}&sectionId=${studentSectionId}`;
      }

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch exams');

      const data = await response.json();

      if (data.length != 0) {
        fetchClassSectionCount(selectedAcademicYear._id);
      }
      // Group exams by their examination type (e.g., Mid-Term, Final)
      const examGroups: { [key: string]: any[] } = {};

      // First pass: group all exams by their type ID
      data.forEach((exam: any) => {
        const typeId = exam.examType._id;

        if (!examGroups[typeId]) {
          examGroups[typeId] = [];
        }
        examGroups[typeId].push(exam);
      });

      // Second pass: format each exam group into a display-friendly object
      const formattedExams = [];

      for (const [typeId, exams] of Object.entries(examGroups)) {
        // Get sample exam to extract common details
        const sampleExam = exams[0];
        const examTypeName = sampleExam.examType.type;

        // Find the earliest and latest exam dates in this group
        let earliestDate = new Date(exams[0].examDate);
        let latestDate = new Date(exams[0].examDate);

        for (const exam of exams) {
          const currentDate = new Date(exam.examDate);
          if (currentDate < earliestDate) earliestDate = currentDate;
          if (currentDate > latestDate) latestDate = currentDate;
        }

        // Format the subjects list for this exam group
        const subjectsList = await Promise.all(exams.map(async exam => {
          // Check if room seating plans exist for this exam
          let hasRoomSeatingPlan = false;
          try {
            const token = localStorage.getItem('token');
            if (!token) {
              hasRoomSeatingPlan = false;
            } else {
              const roomSeatingResponse = await fetch(`/api/roomSeatingPlan?examDate=${new Date(exam.examDate).toISOString().split('T')[0]}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              if (roomSeatingResponse.ok) {
                const roomSeatingData = await roomSeatingResponse.json();
                // Check if any room seating plan contains this exam's seating arrangement
                if (roomSeatingData.seatingPlans && roomSeatingData.seatingPlans.length > 0) {
                  hasRoomSeatingPlan = roomSeatingData.seatingPlans.some((plan: any) =>
                    plan.seatingArrangementId.some((arrId: any) =>
                      exam.seatingArrangement && exam.seatingArrangement.some((arr: any) =>
                        arr._id === arrId.toString() || arr._id === arrId._id
                      )
                    )
                  );
                }
              }
            }
          } catch (error) {
            toast.error('Error checking room seating plan');
          }

          // Fetch sections that have students enrolled in this subject for this class
          const classNumber = exam.classId.classNumber.toString();
          const subjectId = exam.subjectId._id;
          try {
            const sectionsWithSubject = await getSectionsWithSubjectForClass(classNumber, subjectId);
            // Store the count for this subject
            setSubjectSectionCounts(prev => ({
              ...prev,
              [subjectId]: sectionsWithSubject.length
            }));
          } catch (error) {
            toast.error('Error fetching sections with subject');
          }

          return {
            id: exam._id,
            name: exam.subjectId.subject,
            subjectId: exam.subjectId._id,
            class: exam.classId,
            benchCapacity: exam.benchCapacity,
            seatingArrangement: exam.seatingArrangement,
            date: new Date(exam.examDate).toISOString().split('T')[0],
            hasRoomSeatingPlan
          };
        }));

        // Create the formatted exam group object
        formattedExams.push({
          id: typeId,
          name: `${examTypeName} Examinations`,
          startDate: earliestDate.toISOString().split('T')[0],
          endDate: latestDate.toISOString().split('T')[0],
          description: userRole === 'STUDENT' ? `` : `All classes`,
          examTypeId: sampleExam.examType,
          examTypeName: examTypeName,
          subjects: subjectsList
        });

      }

      // Update state with the formatted exams
      setExams(formattedExams);

      // Group exams by type name for display
      const groupedExams = formattedExams.reduce((acc: { [key: string]: any[] }, exam) => {
        const typeName = exam.examTypeName;
        if (!acc[typeName]) {
          acc[typeName] = [];
        }
        acc[typeName].push(exam);
        return acc;
      }, {});

      setExamsByType(groupedExams);

    } catch (error) {
      toast.error('Failed to load exams');
    } finally {
      setIsLoadingExams(false);
    }
  };

  const fetchClassSectionCount = async (academicYearId: string) => {
    const token = localStorage.getItem('token');

    // Skip API call if no token (user logged out)
    if (!token) {
      return;
    }

    const sectionCountResponse = await fetch(`/api/sections?academicYearId=${academicYearId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!sectionCountResponse.ok) return;
    const sectionCountData = await sectionCountResponse.json();
    setClassSectionCount(sectionCountData);
  }

  // Event API functions
  const fetchEvents = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      return;
    }

    setIsLoadingEvents(true);
    try {
      const response = await fetch('/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApiEvents(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const createEvent = async (eventData: any) => {
    const token = localStorage.getItem('token');

    if (!token) {
      toast.error('Please login to create events');
      return false;
    }

    setIsCreatingEvent(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Event created successfully!');
        setIsAddEventModalOpen(false);
        resetEventForm();
        await fetchEvents(); // Refresh the events list
        return true;
      } else {
        toast.error(result.error || 'Failed to create event');
        return false;
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
      return false;
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const resetEventForm = () => {
    setEventFormData({
      id: '',
      name: '',
      summary: '',
      details: '',
      photo1: '',
      photo2: '',
      photo3: '',
      startDate: '',
      endDate: ''
    });
    setEventFormErrors({});
    setPhotoPreviews([]);
    // Reset file input refs
    if (photosInputRef.current) photosInputRef.current.value = '';
  };

  const cancelEventCreation = () => {
    setIsAddEventModalOpen(false);
    resetEventForm();
  };

  const validateEventForm = () => {
    const errors: any = {};

    if (!eventFormData.name.trim()) {
      errors.name = 'Event name is required';
    }

    if (!eventFormData.summary.trim()) {
      errors.summary = 'Event summary is required';
    }

    if (!eventFormData.startDate) {
      errors.startDate = 'Start date is required';
    } else {
      const startDate = new Date(eventFormData.startDate);
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

      if (startDate < currentDate) {
        errors.startDate = 'Start date must be in the future';
      }
    }

    if (eventFormData.endDate && eventFormData.startDate) {
      const startDate = new Date(eventFormData.startDate);
      const endDate = new Date(eventFormData.endDate);
      if (endDate < startDate) {
        errors.endDate = 'End date cannot be before start date';
      }
    }

    setEventFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEventForm()) {
      return;
    }

    const success = await createEvent(eventFormData);
  };

  const updateEvent = async (eventData: any) => {
    const token = localStorage.getItem('token');

    if (!token) {
      toast.error('Please login to update events');
      return false;
    }

    setIsUpdatingEvent(true);
    try {
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Event updated successfully!');
        setIsEditMode(false);
        await fetchEvents(); // Refresh the events list
        // Update the selected event with the new data
        if (selectedEvent && selectedEvent._id === eventData.id) {
          setSelectedEvent(result.data);
        }
        return true;
      } else {
        toast.error(result.error || 'Failed to update event');
        return false;
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
      return false;
    } finally {
      setIsUpdatingEvent(false);
    }
  };

  // Multiple photos upload functions
  const handlePhotosUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const currentPhotoCount = photoPreviews.length;
    const remainingSlots = 3 - currentPhotoCount;

    // Don't allow any uploads if already at maximum
    if (remainingSlots === 0) {
      return;
    }

    // We'll validate the actual count after filtering duplicates
    // This allows the user to select files and let the system filter them intelligently

    // Validate each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${i + 1}: Please select only image files`);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${i + 1}: Image size should be less than 5MB`);
        return;
      }
    }

    setUploadingPhotos(true);
    const photoPromises: Promise<string>[] = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          const base64String = e.target?.result as string;
          resolve(base64String);
        };

        reader.onerror = () => {
          reject(new Error(`Error reading file ${i + 1}`));
        };

        reader.readAsDataURL(file);
      });

      photoPromises.push(promise);
    }

    // Wait for all files to be processed
    Promise.all(photoPromises)
      .then((base64Images) => {
        // Filter out duplicate images
        const newUniqueImages = base64Images.filter(newImage =>
          !photoPreviews.some(existingImage => existingImage === newImage)
        );

        if (newUniqueImages.length === 0) {
          toast.error('This photo is already added. Please select different photo.');
          setUploadingPhotos(false);
          if (photosInputRef.current) {
            photosInputRef.current.value = '';
          }
          return;
        }

        // Limit to remaining slots (in case user selected more than available slots)
        const remainingSlots = 3 - photoPreviews.length;
        const imagesToAdd = newUniqueImages.slice(0, remainingSlots);
        const skippedByLimit = newUniqueImages.length - imagesToAdd.length;

        // Prepare informational message about skipped items
        let infoMessage = '';
        if (newUniqueImages.length < base64Images.length) {
          const duplicateCount = base64Images.length - newUniqueImages.length;
          infoMessage += ` (${duplicateCount} duplicate(s) skipped)`;
        }
        if (skippedByLimit > 0) {
          infoMessage += ` (${skippedByLimit} exceeded limit)`;
        }

        // Append new unique photos to existing ones
        const updatedPreviews = [...photoPreviews, ...imagesToAdd];
        setPhotoPreviews(updatedPreviews);

        // Update form data with individual photo fields
        setEventFormData(prev => ({
          ...prev,
          photo1: updatedPreviews[0] || '',
          photo2: updatedPreviews[1] || '',
          photo3: updatedPreviews[2] || ''
        }));

        setUploadingPhotos(false);
        toast.success(`${imagesToAdd.length} photo(s) added successfully! Total: ${updatedPreviews.length}/3${infoMessage}`);

        // Reset file input to allow selecting the same files again
        if (photosInputRef.current) {
          photosInputRef.current.value = '';
        }
      })
      .catch((error) => {
        console.error('Error processing photos:', error);
        toast.error('Error processing one or more photos');
        setUploadingPhotos(false);

        // Reset file input even on error
        if (photosInputRef.current) {
          photosInputRef.current.value = '';
        }
      });
  };

  const removePhoto = (index: number) => {
    const newPreviews = [...photoPreviews];
    newPreviews.splice(index, 1);
    setPhotoPreviews(newPreviews);

    // Update form data
    setEventFormData(prev => ({
      ...prev,
      photo1: newPreviews[0] || '',
      photo2: newPreviews[1] || '',
      photo3: newPreviews[2] || ''
    }));

    // Reset file input to allow selecting new files
    if (photosInputRef.current) {
      photosInputRef.current.value = '';
    }

    toast.success(`Photo ${index + 1} removed. ${newPreviews.length}/3 photos remaining.`);
  };

  const removeAllPhotos = () => {
    const photoCount = photoPreviews.length;
    setPhotoPreviews([]);
    setEventFormData(prev => ({
      ...prev,
      photo1: '',
      photo2: '',
      photo3: ''
    }));

    if (photosInputRef.current) {
      photosInputRef.current.value = '';
    }

    toast.success(`All ${photoCount} photo(s) removed. You can now add up to 3 new photos.`);
  };

  // Helper function to check if event date is in the past
  const isEventInPast = (event: any) => {
    if (!event || !event.startDate) return false;
    const eventDate = new Date(event.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    return eventDate < today;
  };

  // Event view modal functions
  const handleEventCardClick = (event: any) => {
    setSelectedEvent(event);
    setIsEventViewModalOpen(true);
  };

  const closeEventViewModal = () => {
    setIsEventViewModalOpen(false);
    setSelectedEvent(null);
    setIsEditMode(false); // Reset edit mode when closing
    resetEditEventForm();
  };

  const startEditMode = (event: any) => {
    if (isEventInPast(event)) {
      toast.error('Past events cannot be edited');
      return;
    }

    setEditEventFormData({
      id: event._id,
      name: event.name || '',
      summary: event.summary || '',
      details: event.details || '',
      photo1: event.photo1 || '',
      photo2: event.photo2 || '',
      photo3: event.photo3 || '',
      startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
      endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : ''
    });

    // Set up photo previews
    const photos = [event.photo1, event.photo2, event.photo3].filter(Boolean);
    setEditPhotoPreviews(photos);

    setEditEventFormErrors({});
    setIsEditMode(true);
  };

  const cancelEditMode = () => {
    setIsEditMode(false);
    resetEditEventForm();
  };

  const resetEditEventForm = () => {
    setEditEventFormData({
      id: '',
      name: '',
      summary: '',
      details: '',
      photo1: '',
      photo2: '',
      photo3: '',
      startDate: '',
      endDate: ''
    });
    setEditEventFormErrors({});
    setEditPhotoPreviews([]);
    // Reset file input ref
    if (editPhotosInputRef.current) editPhotosInputRef.current.value = '';
  };

  const validateEditEventForm = () => {
    const errors: any = {};

    if (!editEventFormData.name.trim()) {
      errors.name = 'Event name is required';
    }

    if (!editEventFormData.summary.trim()) {
      errors.summary = 'Event summary is required';
    }

    if (!editEventFormData.startDate) {
      errors.startDate = 'Start date is required';
    } else {
      const startDate = new Date(editEventFormData.startDate);
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

      if (startDate < currentDate) {
        errors.startDate = 'Start date must be in the future';
      }
    }

    if (editEventFormData.endDate && editEventFormData.startDate) {
      const startDate = new Date(editEventFormData.startDate);
      const endDate = new Date(editEventFormData.endDate);
      if (endDate < startDate) {
        errors.endDate = 'End date cannot be before start date';
      }
    }

    setEditEventFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEditEventForm()) {
      return;
    }

    const success = await updateEvent(editEventFormData);
  };

  // Edit mode photo upload functions
  const handleEditPhotosUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const currentPhotoCount = editPhotoPreviews.length;
    const remainingSlots = 3 - currentPhotoCount;

    // Don't allow any uploads if already at maximum
    if (remainingSlots === 0) {
      return;
    }

    // Validate each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${i + 1}: Please select only image files`);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${i + 1}: Image size should be less than 5MB`);
        return;
      }
    }

    setUploadingEditPhotos(true);
    const photoPromises: Promise<string>[] = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          const base64String = e.target?.result as string;
          resolve(base64String);
        };

        reader.onerror = () => {
          reject(new Error(`Error reading file ${i + 1}`));
        };

        reader.readAsDataURL(file);
      });

      photoPromises.push(promise);
    }

    // Wait for all files to be processed
    Promise.all(photoPromises)
      .then((base64Images) => {
        // Filter out duplicate images
        const newUniqueImages = base64Images.filter(newImage =>
          !editPhotoPreviews.some(existingImage => existingImage === newImage)
        );

        if (newUniqueImages.length === 0) {
          toast.error('This photo is already added. Please select different photo.');
          setUploadingEditPhotos(false);
          if (editPhotosInputRef.current) {
            editPhotosInputRef.current.value = '';
          }
          return;
        }

        // Limit to remaining slots
        const remainingSlots = 3 - editPhotoPreviews.length;
        const imagesToAdd = newUniqueImages.slice(0, remainingSlots);
        const skippedByLimit = newUniqueImages.length - imagesToAdd.length;

        // Prepare informational message about skipped items
        let infoMessage = '';
        if (newUniqueImages.length < base64Images.length) {
          const duplicateCount = base64Images.length - newUniqueImages.length;
          infoMessage += ` (${duplicateCount} duplicate(s) skipped)`;
        }
        if (skippedByLimit > 0) {
          infoMessage += ` (${skippedByLimit} exceeded limit)`;
        }

        // Append new unique photos to existing ones
        const updatedPreviews = [...editPhotoPreviews, ...imagesToAdd];
        setEditPhotoPreviews(updatedPreviews);

        // Update form data with individual photo fields
        setEditEventFormData((prev: any) => ({
          ...prev,
          photo1: updatedPreviews[0] || '',
          photo2: updatedPreviews[1] || '',
          photo3: updatedPreviews[2] || ''
        }));

        setUploadingEditPhotos(false);
        toast.success(`${imagesToAdd.length} photo(s) added successfully! Total: ${updatedPreviews.length}/3${infoMessage}`);

        // Reset file input
        if (editPhotosInputRef.current) {
          editPhotosInputRef.current.value = '';
        }
      })
      .catch((error) => {
        console.error('Error processing photos:', error);
        toast.error('Error processing one or more photos');
        setUploadingEditPhotos(false);

        // Reset file input even on error
        if (editPhotosInputRef.current) {
          editPhotosInputRef.current.value = '';
        }
      });
  };

  const removeEditPhoto = (index: number) => {
    const newPreviews = [...editPhotoPreviews];
    newPreviews.splice(index, 1);
    setEditPhotoPreviews(newPreviews);

    // Update form data
    setEditEventFormData((prev: any) => ({
      ...prev,
      photo1: newPreviews[0] || '',
      photo2: newPreviews[1] || '',
      photo3: newPreviews[2] || ''
    }));

    // Reset file input
    if (editPhotosInputRef.current) {
      editPhotosInputRef.current.value = '';
    }

    toast.success(`Photo ${index + 1} removed. ${newPreviews.length}/3 photos remaining.`);
  };

  const removeAllEditPhotos = () => {
    const photoCount = editPhotoPreviews.length;
    setEditPhotoPreviews([]);
    setEditEventFormData((prev: any) => ({
      ...prev,
      photo1: '',
      photo2: '',
      photo3: ''
    }));

    if (editPhotosInputRef.current) {
      editPhotosInputRef.current.value = '';
    }

    toast.success(`All ${photoCount} photo(s) removed. You can now add up to 3 new photos.`);
  };

  // Keep only this useEffect to fetch exams when switching to the exams tab
  useEffect(() => {
    if (activeTab === 'exams' && selectedAcademicYear) {
      if (userRole !== 'STUDENT' || (userRole === 'STUDENT' && studentClassId)) {
        fetchSections(selectedAcademicYear._id);
        fetchExams();
      }
    }
  }, [activeTab, selectedAcademicYear, userRole, studentClassId]);

  // Fetch events when switching to the events tab
  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
    }
  }, [activeTab]);

  // Function to format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Function for responsive date display
  const responsiveDate = (dateString: string) => {
    // For small screens, use shorter format
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    }
    return formatDate(dateString);
  };

  // Format academic year label
  const formatAcademicYearLabel = (year: ISession) => {
    const startDate = new Date(year.startDate);
    const endDate = new Date(year.endDate);
    return `${startDate.toLocaleString('default', { month: 'short' })} ${startDate.getFullYear()} - ${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.academic-year-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle form input changes with special handling for classId and examType
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setExamFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'examType') {
      const selectedExamType = examTypes.find((type: IExamType) => type._id === value);
      if (selectedExamType) {
        setExamFormData(prev => ({
          ...prev,
          benchCapacity: selectedExamType.defaultBenchCapacity || 1,
          isBenchCapacityCapture: selectedExamType.isBenchCapacityCapture
        }));

        // Clear bench capacity error when exam type changes
        setBenchCapacityError('');
      }
    }
    if (name === 'benchCapacity') {
      const numValue = parseInt(value);

      // Validate bench capacity
      if (isNaN(numValue) || numValue < 1) {
        setBenchCapacityError('Bench capacity must be at least 1');
      } else if (numValue > 3) {
        setBenchCapacityError('Bench capacity cannot exceed 3 students per bench');
      } else {
        setBenchCapacityError(''); // Clear error if valid
      }

      setExamFormData(prev => ({
        ...prev,
        benchCapacity: numValue
      }));
    }

    // If class is selected or exam type changes, fetch subjects for that class
    if (name === 'classId' && value) {
      // Reset subject selection when class changes
      setExamFormData(prev => ({
        ...prev,
        subjectId: ''
      }));

      if (examFormData.examType) {
        fetchSubjectsByClass(value);
      }
    } else if (name === 'examType' && value && examFormData.classId) {
      // Reset subject selection when exam type changes
      setExamFormData(prev => ({
        ...prev,
        subjectId: ''
      }));

      fetchSubjectsByClass(examFormData.classId);
    }
  };

  // Handle form submission
  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAcademicYear) {
      toast.error('No academic year selected');
      return;
    }

    // Enhanced form validation
    if (!examFormData.examType) {
      toast.error('Please select an exam type');
      return;
    }

    if (!examFormData.classId) {
      toast.error('Please select a class');
      return;
    }

    if (!examFormData.subjectId) {
      toast.error('Please select a subject');
      return;
    }

    if (!examFormData.examDate) {
      toast.error('Please select an exam date');
      return;
    }

    // Validate that exam date is within the academic year
    const examDate = new Date(examFormData.examDate);
    const academicYearStart = new Date(selectedAcademicYear.startDate);
    const academicYearEnd = new Date(selectedAcademicYear.endDate);

    if (examDate < academicYearStart || examDate > academicYearEnd) {
      toast.error(`Exam date must be within the selected academic year: ${formatAcademicYearLabel(selectedAcademicYear)}`);
      return;
    }

    // Check if exam date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (examDate < today) {
      toast.error('Exam date cannot be in the past');
      return;
    }

    // Check if exam date falls on a weekend (optional validation)
    const dayOfWeek = examDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const confirmWeekend = window.confirm('The selected date falls on a weekend. Do you want to continue?');
      if (!confirmWeekend) {
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Validate bench capacity if it's being captured
      if (examFormData.isBenchCapacityCapture) {
        if (isNaN(examFormData.benchCapacity) || examFormData.benchCapacity < 1) {
          toast.error('Bench capacity must be at least 1');
          return;
        }
        if (examFormData.benchCapacity > 3) {
          toast.error('Bench capacity cannot exceed 3 students per bench');
          return;
        }
      }

      const examData = {
        examType: examFormData.examType,
        academicYearId: selectedAcademicYear._id,
        examDate: examFormData.examDate,
        classId: examFormData.classId,
        subjectId: examFormData.subjectId,
        benchCapacity: examFormData.benchCapacity
      };

      const token = localStorage.getItem('token');

      // Check if token exists
      if (!token) {
        return;
      }

      const response = await fetch('/api/manage-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(examData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to add exam');
        return;
      }

      toast.success('Exam added successfully');
      setIsAddExamModalOpen(false);

      // Reset form data
      setExamFormData({
        examType: '',
        subjectId: '',
        examDate: '',
        classId: '',
        isBenchCapacityCapture: false,
        benchCapacity: 1
      });

      // Clear validation errors
      setBenchCapacityError('');

      // Refresh exams list
      fetchExams();

    } catch (error) {
      toast.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };


  // Open modal and load exam types and classes (but not subjects yet)
  const handleAddExamClick = () => {
    fetchExamTypes();
    // Reset form data when opening modal
    setExamFormData({
      examType: '',
      subjectId: '',
      examDate: '',
      classId: '',
      isBenchCapacityCapture: false,
      benchCapacity: 1
    });
    // Clear validation errors
    setBenchCapacityError('');
    // Clear subjects list
    setSubjects([]);
    setIsAddExamModalOpen(true);
  };

  // Add ExamCard component right inside your calendar page file
  const ExamCard = ({
    exam,
    isExpanded,
    onToggle
  }: {
    exam: Exam;
    isExpanded: boolean;
    onToggle: () => void;
  }) => {

    // Group subjects by class
    const getSubjectsByClass = (subjects: Subject[]) => {
      const groupedSubjects: { [key: string]: Subject[] } = {};

      subjects.forEach(subject => {
        if (!groupedSubjects[subject.class.classNumber]) {
          groupedSubjects[subject.class.classNumber] = [];
        }
        groupedSubjects[subject.class.classNumber].push(subject);
      });

      const sortedClasses = Object.keys(groupedSubjects).sort((a, b) =>
        parseInt(a) - parseInt(b)
      );

      return { groupedSubjects, sortedClasses };
    };

    return (
      <div
        className={`
          border border-base-300 rounded-lg p-3 sm:p-4 
          hover:bg-base-100/80 hover:shadow-md transition-all duration-200 
          bg-base-100 cursor-pointer min-w-0
          ${exam.subjects && exam.subjects.length > 0 ? 'relative' : ''}
          ${isExpanded ? 'shadow-md bg-base-100' : ''}
        `}
        onClick={() => onToggle()}
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base md:text-lg text-base-content break-words">{exam.name}</h3>
                {exam.subjects && exam.subjects.length > 0 && (
                  <div className={`
                    text-xs py-0.5 px-2.5 rounded-full
                    bg-primary/30 text-base-content
                    backdrop-blur-sm
                    border border-primary/10
                    shadow-sm
                    transition-all duration-200
                    self-start sm:self-auto
                    ${isExpanded ? 'opacity-0 translate-y-1' : 'opacity-90 translate-y-0'}
                  `}>
                    {exam.subjects.length === 1 ? '1 subject' : `${exam.subjects.length} subjects`}
                  </div>
                )}
              </div>
              <p className="text-xs sm:text-sm text-base-content/70 mt-1 break-words">{exam.description}</p>
            </div>
            <div className="badge bg-rose-100 text-black border-rose-200 self-start whitespace-normal text-center text-xs">
              {exam.startDate === exam.endDate
                ? responsiveDate(exam.startDate)
                : `${responsiveDate(exam.startDate)} - ${responsiveDate(exam.endDate)}`
              }
            </div>
          </div>
        </div>

        {/* Expandable indicator at the bottom edge */}
        {exam.subjects && exam.subjects.length > 0 && !isExpanded && (
          <div className="absolute bottom-0 left-0 w-full flex justify-center">
            <div className="h-1 w-8 bg-primary/30 rounded-t-full"></div>
          </div>
        )}

        {/* Expandable section for subjects */}
        {isExpanded && exam.subjects && exam.subjects.length > 0 && (
          <div className="mt-3 pt-3 border-t border-base-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-base-content/70">Subject Schedule:</p>
            </div>
            <div className="space-y-2">
              {(() => {
                const { groupedSubjects, sortedClasses } = getSubjectsByClass(exam.subjects);

                return sortedClasses.map((classNumber, classIndex) => (
                  <div key={classNumber} className="mb-4">
                    {/* Class header with distinct styling from buttons */}
                    {userRole !== 'STUDENT' && (
                      <div className="flex items-center mb-2">
                        <div className="px-3 py-1 rounded-full badge badge-lg bg-primary/30 text-base-content border-primary/10 text-base lg:text-sm font-medium">
                          Class {classNumber}
                        </div>
                        <div className="ml-2 flex-grow border-t border-dashed border-slate-600/30"></div>
                      </div>
                    )}

                    {/* Subjects for this class */}
                    {groupedSubjects[classNumber].map((subject, subjectIndex) => (
                      <div
                        key={subject.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 px-3 rounded-md hover:bg-base-300/50 transition-colors gap-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center w-full gap-2">
                          <span className="font-medium text-sm sm:text-base text-base-content break-words">{subject.name}</span>

                          {/* For non-students: Show view buttons for existing arrangements and conditionally show add button */}
                          {userRole !== 'STUDENT' && (
                            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                              {/* View buttons for existing seating arrangements */}
                              {subject.seatingArrangement && Array.isArray(subject.seatingArrangement) && subject.seatingArrangement.map((arrangement, idx) => (
                                <Button
                                  key={arrangement.sectionId._id || idx}
                                  className="btn btn-sm flex items-center text-success bg-success/5 hover:bg-success/10 border border-success/20 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <Check className="w-4 h-4 text-success" />
                                  <span className="text-xs font-medium text-success/80">{classNumber} {arrangement.sectionId.section}</span>
                                </Button>
                              ))}

                              {/* Only show "Add Seating" button if there are sections left without a seating arrangement */}
                              {(subject?.seatingArrangement && (subject?.seatingArrangement.length < (subjectSectionCounts[subject.subjectId] || 0))) && (
                                <Button
                                  variant='primary'
                                  outline
                                  className="btn btn-sm btn-outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddSeatingArrangement(exam.id, classNumber, subject.id, subject.subjectId, subject.benchCapacity, subject.date, subject.name);
                                  }}
                                >
                                  <Plus className="w-4 h-4" />
                                  <span className="text-xs font-medium">Add Seating</span>
                                </Button>
                              )}

                              {/* Show buttons based on room seating plan existence */}
                              {(subject?.seatingArrangement && (subjectSectionCounts[subject.subjectId] || 0) > 0 && subject?.seatingArrangement.length === (subjectSectionCounts[subject.subjectId] || 0)) && (
                                <>
                                  {/* Show "View Seating" button when room seating plans exist */}
                                  {subject?.hasRoomSeatingPlan ? (
                                    <Button
                                      variant='success'
                                      outline
                                      className="btn btn-sm btn-outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewRoomSeatingPlan(subject.date, classNumber, subject.name);
                                      }}
                                    >
                                      <Eye className="w-4 h-4" />
                                      <span className="text-xs font-medium">View Seating</span>
                                    </Button>
                                  ) : (
                                    /* Show "Create Plan" button when room seating plans don't exist */
                                    <Button
                                      variant='secondary'
                                      outline
                                      className="btn btn-sm btn-outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCreateSeatingPlan(subject.benchCapacity, subject.id, classNumber, subject.date);
                                      }}
                                    >
                                      <Plus className="w-4 h-4" />
                                      <span className="text-xs font-medium">Create Plan</span>
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* For students: show "View Seating" button when room seating plans exist */}
                          {userRole === 'STUDENT' && subject?.hasRoomSeatingPlan && (
                            <Button
                              variant='success'
                              outline
                              className="btn btn-sm btn-outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewRoomSeatingPlan(subject.date, classNumber, subject.name);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              <span className="text-xs font-medium">View Seating</span>
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center text-base-content/70 text-xs sm:text-sm whitespace-nowrap">
                          <Calendar className="h-4 w-4 mr-1.5 text-primary" />
                          <span>{responsiveDate(subject.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Event View Modal */}
        {isEventViewModalOpen && selectedEvent && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeEventViewModal();
              }
            }}
          >
            <div className="bg-base-100 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-base-content mb-2">
                    {selectedEvent.name}
                  </h2>
                  <div className="badge bg-blue-100 text-blue-800 border-blue-200 text-sm">
                    {responsiveDate(selectedEvent.date || selectedEvent.startDate)}
                    {selectedEvent.endDate && ` - ${responsiveDate(selectedEvent.endDate)}`}
                  </div>
                </div>

                {/* Event Photos - Circular Stacked */}
                {(selectedEvent.photo1 || selectedEvent.photo2 || selectedEvent.photo3) && (
                  <div className="flex-shrink-0 ml-4">
                    <div className="relative">
                      {/* Display photos in reverse order for proper stacking */}
                      {selectedEvent.photo3 && (
                        <div className="w-16 h-16 absolute -top-1 -right-1 z-10">
                          <img
                            src={selectedEvent.photo3}
                            alt={`${selectedEvent.name} photo 3`}
                            className="w-full h-full object-cover rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75';
                              modal.innerHTML = `
                              <div class="relative max-w-4xl max-h-4xl p-4">
                                <img src="${selectedEvent.photo3}" class="max-w-full max-h-full object-contain rounded-lg" />
                                <button class="absolute top-2 right-2 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold hover:bg-gray-200" onclick="this.parentElement.parentElement.remove()">×</button>
                              </div>
                            `;
                              modal.addEventListener('click', (e) => {
                                if (e.target === modal) modal.remove();
                              });
                              document.body.appendChild(modal);
                            }}
                          />
                        </div>
                      )}
                      {selectedEvent.photo2 && (
                        <div className="w-16 h-16 absolute top-1 right-1 z-20">
                          <img
                            src={selectedEvent.photo2}
                            alt={`${selectedEvent.name} photo 2`}
                            className="w-full h-full object-cover rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75';
                              modal.innerHTML = `
                              <div class="relative max-w-4xl max-h-4xl p-4">
                                <img src="${selectedEvent.photo2}" class="max-w-full max-h-full object-contain rounded-lg" />
                                <button class="absolute top-2 right-2 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold hover:bg-gray-200" onclick="this.parentElement.parentElement.remove()">×</button>
                              </div>
                            `;
                              modal.addEventListener('click', (e) => {
                                if (e.target === modal) modal.remove();
                              });
                              document.body.appendChild(modal);
                            }}
                          />
                        </div>
                      )}
                      {selectedEvent.photo1 && (
                        <div className="w-16 h-16 relative z-30">
                          <img
                            src={selectedEvent.photo1}
                            alt={`${selectedEvent.name} photo 1`}
                            className="w-full h-full object-cover rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75';
                              modal.innerHTML = `
                              <div class="relative max-w-4xl max-h-4xl p-4">
                                <img src="${selectedEvent.photo1}" class="max-w-full max-h-full object-contain rounded-lg" />
                                <button class="absolute top-2 right-2 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold hover:bg-gray-200" onclick="this.parentElement.parentElement.remove()">×</button>
                              </div>
                            `;
                              modal.addEventListener('click', (e) => {
                                if (e.target === modal) modal.remove();
                              });
                              document.body.appendChild(modal);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={closeEventViewModal}
                  className="ml-4 p-2 hover:bg-base-200 rounded-full transition-colors"
                >
                  <span className="text-xl font-bold text-base-content">×</span>
                </button>
              </div>

              {/* Modal Content */}
              <div className="space-y-4">
                {/* Event Summary */}
                <div>
                  <h3 className="font-semibold text-base-content mb-2">Summary</h3>
                  <p className="text-base-content/80">{selectedEvent.summary}</p>
                </div>

                {/* Event Details */}
                {selectedEvent.details && (
                  <div>
                    <h3 className="font-semibold text-base-content mb-2">Details</h3>
                    <p className="text-base-content/80 whitespace-pre-wrap">{selectedEvent.details}</p>
                  </div>
                )}

                {/* Event Dates */}
                <div>
                  <h3 className="font-semibold text-base-content mb-2">Date & Time</h3>
                  <div className="text-base-content/80">
                    <p><strong>Start:</strong> {new Date(selectedEvent.startDate).toLocaleString()}</p>
                    {selectedEvent.endDate && (
                      <p><strong>End:</strong> {new Date(selectedEvent.endDate).toLocaleString()}</p>
                    )}
                  </div>
                </div>

                {/* Created By */}
                {selectedEvent.createdBy && (
                  <div>
                    <h3 className="font-semibold text-base-content mb-2">Created By</h3>
                    <p className="text-base-content/80">
                      {selectedEvent.createdBy.firstName} {selectedEvent.createdBy.lastName}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Event View Modal */}
        {isEventViewModalOpen && selectedEvent && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeEventViewModal();
              }
            }}
          >
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">

              {/* Hero Section with Photos */}
              {(selectedEvent.photo1 || selectedEvent.photo2 || selectedEvent.photo3) ? (
                <div className="relative h-64 bg-gradient-to-r from-blue-600 to-purple-600 overflow-hidden">
                  {/* Background Photos Collage */}
                  <div className="absolute inset-0 flex">
                    {selectedEvent.photo1 && (
                      <div className="flex-1 relative">
                        <img
                          src={selectedEvent.photo1}
                          alt={`${selectedEvent.name} photo 1`}
                          className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            const modal = document.createElement('div');
                            modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md';
                            modal.innerHTML = `
                            <div class="relative max-w-6xl max-h-[90vh] p-4">
                              <img src="${selectedEvent.photo1}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                              <button class="absolute top-2 right-2 w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-white/30 transition-colors" onclick="this.parentElement.parentElement.remove()">×</button>
                            </div>
                          `;
                            modal.addEventListener('click', (e) => {
                              if (e.target === modal) modal.remove();
                            });
                            document.body.appendChild(modal);
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20"></div>
                      </div>
                    )}
                    {selectedEvent.photo2 && (
                      <div className="flex-1 relative">
                        <img
                          src={selectedEvent.photo2}
                          alt={`${selectedEvent.name} photo 2`}
                          className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            const modal = document.createElement('div');
                            modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md';
                            modal.innerHTML = `
                            <div class="relative max-w-6xl max-h-[90vh] p-4">
                              <img src="${selectedEvent.photo2}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                              <button class="absolute top-2 right-2 w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-white/30 transition-colors" onclick="this.parentElement.parentElement.remove()">×</button>
                            </div>
                          `;
                            modal.addEventListener('click', (e) => {
                              if (e.target === modal) modal.remove();
                            });
                            document.body.appendChild(modal);
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-black/20"></div>
                      </div>
                    )}
                    {selectedEvent.photo3 && (
                      <div className="flex-1 relative">
                        <img
                          src={selectedEvent.photo3}
                          alt={`${selectedEvent.name} photo 3`}
                          className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            const modal = document.createElement('div');
                            modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md';
                            modal.innerHTML = `
                            <div class="relative max-w-6xl max-h-[90vh] p-4">
                              <img src="${selectedEvent.photo3}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                              <button class="absolute top-2 right-2 w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-white/30 transition-colors" onclick="this.parentElement.parentElement.remove()">×</button>
                            </div>
                          `;
                            modal.addEventListener('click', (e) => {
                              if (e.target === modal) modal.remove();
                            });
                            document.body.appendChild(modal);
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/20"></div>
                      </div>
                    )}
                  </div>

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                  {/* Close Button */}
                  <button
                    onClick={closeEventViewModal}
                    className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors z-10"
                  >
                    <span className="text-lg font-bold">×</span>
                  </button>

                  {/* Title Overlay */}
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">
                      {selectedEvent.name}
                    </h2>
                    <div className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      {responsiveDate(selectedEvent.date || selectedEvent.startDate)}
                      {selectedEvent.endDate && ` - ${responsiveDate(selectedEvent.endDate)}`}
                    </div>
                  </div>
                </div>
              ) : (
                /* Header without photos */
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
                  <button
                    onClick={closeEventViewModal}
                    className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <span className="text-lg font-bold">×</span>
                  </button>

                  <h2 className="text-3xl font-bold text-white mb-2 pr-12">
                    {selectedEvent.name}
                  </h2>
                  <div className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {responsiveDate(selectedEvent.date || selectedEvent.startDate)}
                    {selectedEvent.endDate && ` - ${responsiveDate(selectedEvent.endDate)}`}
                  </div>
                </div>
              )}

              {/* Content Area */}
              <div className="p-6 overflow-y-auto max-h-[50vh] space-y-6">

                {/* Event Summary */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Event Summary</h3>
                  </div>
                  <p className="text-blue-800 dark:text-blue-200 leading-relaxed">{selectedEvent.summary}</p>
                </div>

                {/* Event Details */}
                {selectedEvent.details && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Details</h3>
                    </div>
                    <p className="text-purple-800 dark:text-purple-200 leading-relaxed whitespace-pre-wrap">{selectedEvent.details}</p>
                  </div>
                )}

                {/* Date & Time Info */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Date & Time</h3>
                  </div>
                  <div className="text-green-800 dark:text-green-200 space-y-2">
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Start:</span>
                      <span>{new Date(selectedEvent.startDate).toLocaleString()}</span>
                    </div>
                    {selectedEvent.endDate && (
                      <div className="flex items-center">
                        <span className="font-medium mr-2">End:</span>
                        <span>{new Date(selectedEvent.endDate).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Created By */}
                {selectedEvent.createdBy && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Created By</h3>
                    </div>
                    <p className="text-orange-800 dark:text-orange-200 font-medium">
                      {selectedEvent.createdBy.firstName} {selectedEvent.createdBy.lastName}
                    </p>
                  </div>
                )}

                {/* Photo Gallery Section (if photos exist) */}
                {(selectedEvent.photo1 || selectedEvent.photo2 || selectedEvent.photo3) && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Photo Gallery</h3>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {selectedEvent.photo1 && (
                        <div className="flex-shrink-0">
                          <img
                            src={selectedEvent.photo1}
                            alt={`${selectedEvent.name} photo 1`}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md';
                              modal.innerHTML = `
                              <div class="relative max-w-6xl max-h-[90vh] p-4">
                                <img src="${selectedEvent.photo1}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                                <button class="absolute top-2 right-2 w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-white/30 transition-colors" onclick="this.parentElement.parentElement.remove()">×</button>
                              </div>
                            `;
                              modal.addEventListener('click', (e) => {
                                if (e.target === modal) modal.remove();
                              });
                              document.body.appendChild(modal);
                            }}
                          />
                        </div>
                      )}
                      {selectedEvent.photo2 && (
                        <div className="flex-shrink-0">
                          <img
                            src={selectedEvent.photo2}
                            alt={`${selectedEvent.name} photo 2`}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md';
                              modal.innerHTML = `
                              <div class="relative max-w-6xl max-h-[90vh] p-4">
                                <img src="${selectedEvent.photo2}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                                <button class="absolute top-2 right-2 w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-white/30 transition-colors" onclick="this.parentElement.parentElement.remove()">×</button>
                              </div>
                            `;
                              modal.addEventListener('click', (e) => {
                                if (e.target === modal) modal.remove();
                              });
                              document.body.appendChild(modal);
                            }}
                          />
                        </div>
                      )}
                      {selectedEvent.photo3 && (
                        <div className="flex-shrink-0">
                          <img
                            src={selectedEvent.photo3}
                            alt={`${selectedEvent.name} photo 3`}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform"
                            onClick={(e) => {
                              e.stopPropagation();
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md';
                              modal.innerHTML = `
                              <div class="relative max-w-6xl max-h-[90vh] p-4">
                                <img src="${selectedEvent.photo3}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                                <button class="absolute top-2 right-2 w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-white/30 transition-colors" onclick="this.parentElement.parentElement.remove()">×</button>
                              </div>
                            `;
                              modal.addEventListener('click', (e) => {
                                if (e.target === modal) modal.remove();
                              });
                              document.body.appendChild(modal);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Add ManageExam component right after ExamCard
  const ManageExam = ({ exams = [] }: { exams: Exam[] }) => {
    // Track which exam card is currently expanded (if any)
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    // Toggle function to handle card expansion
    const toggleCard = (cardId: string) => {
      // If this card is already expanded, close it; otherwise, open this one and close any others
      setExpandedCardId(prevId => prevId === cardId ? null : cardId);
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-3 sm:gap-4">
        {exams.map((exam, index) => {
          // Create a unique ID for each card
          const cardId = `${exam.id}-${index}`;

          return (
            <div key={cardId} className="w-full">
              <ExamCard
                exam={exam}
                isExpanded={expandedCardId === cardId}
                onToggle={() => toggleCard(cardId)}
              />
            </div>
          );
        })}
      </div>
    );
  };

  // Function to fetch rooms
  const fetchRooms = async (classNumber: number) => {
    try {
      setIsLoadingRooms(true);
      const studentRoomTypes = assignRoomToClass(classNumber);
      if (!studentRoomTypes) {
        throw new Error('Failed to assign room types');
      }
      const token = localStorage.getItem('token');

      // Skip API call if no token (user logged out)
      if (!token) {
        return;
      }

      const response = await fetch(`/api/rooms?studentRoomType=${studentRoomTypes.join(',')}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      const data = await response.json();
      setRooms(data);
      return data;
    } catch (error) {
      toast.error('Failed to load rooms');
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const findRoomName = (roomId: string) => {
    const room = rooms.find(r => r._id === roomId);
    return room?.room;
  }

  // Handle opening the seating arrangement modal
  const handleAddSeatingArrangement = async (examTypeId: string, classNumber: string, examId: string, subjectId: string, benchCapacity: number, examDate: string, subjectName: string) => {
    setIsLoadingSeatingModal(true);
    // Get recommended room types for this class
    const recommendedRoomTypes = assignRoomToClass(parseInt(classNumber));

    let fetchedRooms: IRoom[] = [];

    if (recommendedRoomTypes) {
      try {
        fetchedRooms = await fetchRooms(parseInt(classNumber)) || [];
      } catch (error) {
        toast.error('Failed to load rooms for this class');
        fetchedRooms = [];
      }
    }

    // Fetch sections that have students enrolled in this subject
    try {
      setIsLoadingSubjectSections(true);
      const sectionsWithSubject = await getSectionsWithSubjectForClass(classNumber, subjectId);
      setSubjectSections(sectionsWithSubject);
    } catch (error) {
      toast.error('Failed to load sections for this subject');
      setSubjectSections([]);
    } finally {
      setIsLoadingSubjectSections(false);
    }

    // Reset form data with properly fetched rooms
    setSeatingFormData({
      examTypeId: examTypeId,
      classNumber: classNumber,
      sectionId: '',
      examId: examId,
      subjectId: subjectId,
      venueDetails: [{ roomId: '', startRollNo: '', endRollNo: '', rollNumbers: [] }],
      benchCapacity: benchCapacity,
      rooms: fetchedRooms,
      examDate: examDate,
      subjectName: subjectName
    });

    // Open the modal after everything is set up
    setIsSeatingModalOpen(true);
    setIsLoadingSeatingModal(false);
  };

  // Handle creating seating plan for all sections
  const handleCreateSeatingPlan = async (benchCapacity: number, examId: string, classNumber: string, examDate: string) => {
    try {
      // Show loading state
      toast.loading('Creating seating plans for all sections...', { id: 'seating-plan' });

      const token = localStorage.getItem('token');

      // Check if token exists
      if (!token) {
        return;
      }

      const response = await fetch('/api/roomSeatingPlan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          benchCapacity: benchCapacity,
          examId: examId,
          classNumber: parseInt(classNumber),
          examDate: examDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create seating plan', { id: 'seating-plan' });
        return;
      }

      const result = await response.json();
      toast.success(`Seating plans created successfully for ${result.totalRooms} rooms`, { id: 'seating-plan' });

      // Refresh the exam data to show updated information
      fetchExams();
    } catch (error) {
      toast.error('An error occurred while creating seating plans', { id: 'seating-plan' });
    }
  };

  // Handle viewing room seating plan
  const handleViewRoomSeatingPlan = async (examDate: string, classNumber: string, subjectName: string) => {
    try {
      // Show loading state
      toast.loading('Just a moment...', { id: 'view-seating-plan' });

      const token = localStorage.getItem('token');

      // Check if token exists
      if (!token) {
        return;
      }

      const response = await fetch(`/api/roomSeatingPlan?examDate=${examDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to load seating plans', { id: 'view-seating-plan' });
        return;
      }

      const result = await response.json();

      toast.success(`Found ${result.totalRooms} seating plans`, { id: 'view-seating-plan' });

      // Set room seating data and open room list modal
      result.className = classNumber;
      result.subjectName = subjectName;
      setRoomSeatingData(result);
      setShowRoomListModal(true);

    } catch (error) {
      toast.error('An error occurred while loading seating plans', { id: 'view-seating-plan' });
    }
  };

  // Handle room selection from room list modal
  const handleRoomSelection = (roomPlan: any) => {
    // Prepare data for seating arrangement modal in the new format
    const formattedRoomData = {
      seatingPlans: [roomPlan],
      totalRooms: 1,
      className: roomPlan.seatingPlan[0]?.classNumber || ''
    };

    setSeatingArrangementData(formattedRoomData);
    setSelectedRoomData(roomPlan);
    setShowRoomListModal(false);
    setShowSeatingModal(true);
  };

  // Print function for room seating arrangement modal
  const handlePrintRoomSeating = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to enable printing');
      return;
    }

    // Get the current room seating data
    const currentData = roomSeatingData;
    if (!currentData) {
      toast.error('No data available to print');
      return;
    }

    // Build the classes string for the title
    const classes = Array.from(new Set(currentData.seatingPlans.flatMap((room: any) =>
      room.seatingPlan.map((seat: any) => seat.classNumber)
    ))).sort();
    const titleClasses = classes.length > 1
      ? `Classes ${classes.join(', ')}`
      : `Class ${classes[0]}`;

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
            
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            
            .print-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
              color: #1a1a1a;
            }
            
            .print-subtitle {
              font-size: 14px;
              color: #666;
              margin-bottom: 5px;
            }
            
            .print-date {
              font-size: 11px;
              color: #888;
            }
            
            .rooms-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin-top: 20px;
            }
            
            .room-card {
              border: 1px solid #ddd;
              border-radius: 6px;
              padding: 15px;
              background: #f9f9f9;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            .room-header {
              display: flex;
              justify-content: between;
              align-items: center;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #ccc;
            }
            
            .room-title {
              font-size: 14px;
              font-weight: bold;
              color: #1a1a1a;
            }
            
            .student-count {
              font-size: 11px;
              background: #e0e0e0;
              padding: 2px 6px;
              border-radius: 3px;
              margin-left: auto;
            }
            
            .class-section-label {
              font-size: 11px;
              font-weight: 600;
              color: #555;
              margin-bottom: 8px;
            }
            
            .class-section-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 6px 8px;
              margin-bottom: 4px;
              background: white;
              border: 1px solid #e0e0e0;
              border-radius: 4px;
              font-size: 11px;
            }
            
            .class-badge {
              font-weight: 600;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 10px;
            }
            
            .roll-range {
              font-weight: 600;
              color: #333;
            }
            
            /* Color classes for different class-section combinations */
            .color-0 { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
            .color-1 { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
            .color-2 { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
            .color-3 { background: #fef3c7; color: #92400e; border-color: #fde68a; }
            .color-4 { background: #e9d5ff; color: #7c2d12; border-color: #c4b5fd; }
            .color-5 { background: #fce7f3; color: #be185d; border-color: #f9a8d4; }
            .color-6 { background: #e0e7ff; color: #3730a3; border-color: #c7d2fe; }
            .color-7 { background: #fed7aa; color: #c2410c; border-color: #fdba74; }
            .color-8 { background: #cffafe; color: #155e75; border-color: #a5f3fc; }
            .color-9 { background: #ccfbf1; color: #134e4a; border-color: #99f6e4; }
            .color-10 { background: #ffe4e6; color: #be123c; border-color: #fda4af; }
            .color-11 { background: #d1fae5; color: #047857; border-color: #a7f3d0; }
            
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .room-card { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
                     <div class="print-header">
             <div class="print-title">${currentData.subjectName} : ${titleClasses} Seating Arrangement</div>
             ${currentData.seatingPlans.length > 0 && currentData.seatingPlans[0].examDate ?
        `<div class="print-date">Exam Date: ${new Date(currentData.seatingPlans[0].examDate).toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</div>` : ''
      }
           </div>
          
          <div class="rooms-grid">
            ${currentData.seatingPlans.map((roomPlan: any, roomIndex: number) => {
        // Process seating plan to get class-section summaries
        const classSectionSummary: {
          [key: string]: {
            classNumber: string;
            section: string;
            rollNumbers: number[];
            minRoll?: number;
            maxRoll?: number;
            totalStudents?: number;
          }
        } = {};

        roomPlan.seatingPlan.forEach((seat: any) => {
          const key = `${seat.classNumber}-${seat.section}`;
          if (!classSectionSummary[key]) {
            classSectionSummary[key] = {
              classNumber: seat.classNumber,
              section: seat.section,
              rollNumbers: []
            };
          }
          classSectionSummary[key].rollNumbers.push(seat.rollNumber);
        });

        // Sort and get min/max for each class-section
        Object.keys(classSectionSummary).forEach(key => {
          classSectionSummary[key].rollNumbers.sort((a: number, b: number) => a - b);
          classSectionSummary[key].minRoll = Math.min(...classSectionSummary[key].rollNumbers);
          classSectionSummary[key].maxRoll = Math.max(...classSectionSummary[key].rollNumbers);
          classSectionSummary[key].totalStudents = classSectionSummary[key].rollNumbers.length;
        });

        return `
                <div class="room-card">
                  <div class="room-header">
                    <div class="room-title">Classroom ${roomPlan.roomId.room}</div>
                    <div class="student-count">${roomPlan.seatingPlan.length} total</div>
                  </div>
                  <div class="class-section-label">Class & Section Seating:</div>
                  ${Object.values(classSectionSummary).map((summary: any, idx: number) => {
          // Generate color index for consistent coloring
          const getBetterHash = (str: string) => {
            if (/^\\d+$/.test(str)) {
              return parseInt(str) * 7 + 3;
            }
            let hash = 5381;
            for (let i = 0; i < str.length; i++) {
              hash = ((hash << 5) + hash) + str.charCodeAt(i);
            }
            return Math.abs(hash);
          };

          const classHash = getBetterHash(summary.classNumber);
          const colorIndex = classHash % 12;

          return `
                      <div class="class-section-item">
                        <div class="class-badge color-${colorIndex}">
                          Class ${summary.classNumber} - ${summary.section}
                        </div>
                        <div class="roll-range">
                          Roll No. ${summary.minRoll} - ${summary.maxRoll}
                        </div>
                      </div>
                    `;
        }).join('')}
                </div>
              `;
      }).join('')}
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

    toast.success('Print dialog opened');
  };

  // Fetch sections for a class

  // Function to fetch student count and roll numbers
  const fetchStudentsForSection = async (classNumber: string, sectionId: string, examId: string) => {
    try {
      setIsLoadingStudents(true);

      // Get the selected academic year ID
      const academicYearId = selectedAcademicYear?._id;
      if (!academicYearId) {
        toast.error('No academic year selected');
        return;
      }

      const classId = classes.find(c => c.classNumber === Number(classNumber))?._id;

      const token = localStorage.getItem('token');

      // Skip API call if no token (user logged out)
      if (!token) {
        return;
      }

      const response = await fetch(`/api/manage-staff/?role=${studentRole}&classId=${classId}&sectionId=${sectionId}&academicYearId=${academicYearId}&examId=${examId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch student data');
      }

      const data = await response.json();
      setStudentData(data);

      // Optionally pre-fill the roll number range based on min/max
      // and populate rollNumbers with actual student roll numbers
      if (data && data.studentIds && Array.isArray(data.studentIds)) {
        const updatedVenueDetails = [...seatingFormData.venueDetails];

        updatedVenueDetails[0] = {
          ...updatedVenueDetails[0],
          startRollNo: data.minRoll ? data.minRoll.toString() : '', // Keep as string for form field
          endRollNo: data.maxRoll ? data.maxRoll.toString() : '',   // Keep as string for form field
          rollNumbers: []
        };

        setSeatingFormData(prev => ({
          ...prev,
          venueDetails: updatedVenueDetails
        }));
      }

    } catch (error) {
      toast.error('Failed to load student information');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Update handleSeatingInputChange to completely reset venue details
  const handleSeatingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // When section is changed, completely reset venue details
    if (name === 'sectionId') {
      // Create a completely new state object with reset venue details
      const resetFormData = {
        ...seatingFormData,
        sectionId: value,
        // Reset to exactly one empty venue detail
        venueDetails: [{ roomId: '', startRollNo: '', endRollNo: '', rollNumbers: [] as number[] }]
      };

      // Set the state with the new object
      setSeatingFormData(resetFormData);

      // Fetch student data for the new section
      if (value) {
        fetchStudentsForSection(seatingFormData.classNumber, value, seatingFormData.examId);
      }
    } else {
      // For other form fields, just update normally
      setSeatingFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Update handleSubmitSeatingArrangement function to include better debugging
  const handleSubmitSeatingArrangement = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1. Check if section is selected
      if (!seatingFormData.sectionId) {
        toast.error('Please select a section');
        return;
      }

      // 2. Check if exam date is valid and not in the past
      if (!seatingFormData.examDate) {
        toast.error('Exam date is missing');
        return;
      }

      const examDate = new Date(seatingFormData.examDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

      if (examDate < today) {
        toast.error('Cannot create seating arrangement for past exam dates');
        return;
      }

      // 3. Check if student data exists and has studentIds
      if (!studentData || !studentData.studentIds || studentData.studentIds.length === 0) {
        toast.error('Student information is not loaded or no students in this section.');
        return;
      }
      const actualStudentRollNumbers = studentData.studentIds.map((s: any) => s.rollNumber).sort((a: number, b: number) => a - b);

      // 4. Check for empty venues
      if (seatingFormData.venueDetails.length === 0) {
        toast.error('Please add at least one venue');
        return;
      }

      const allAssignedRollNumbers: number[] = [];
      const usedRooms = new Set<string>();
      const rollNumberToRoomMap = new Map<number, string>(); // Track which room each roll number is assigned to

      // 5. Validate each venue
      for (let i = 0; i < seatingFormData.venueDetails.length; i++) {
        const venue = seatingFormData.venueDetails[i];
        const venueIdentifier = venue.roomId ? `Room ${findRoomName(venue.roomId)}` : `Venue ${i + 1}`;

        // Check if room is selected
        if (!venue.roomId) {
          toast.error(`Please select a room for ${venueIdentifier}`);
          return;
        }

        // Check for duplicate room assignments
        if (usedRooms.has(venue.roomId)) {
          toast.error(`Room ${findRoomName(venue.roomId)} is assigned to multiple venues. Each room can only be used once per exam.`);
          return;
        }
        usedRooms.add(venue.roomId);

        // Check if roll numbers are provided in the venue object
        if (!venue.startRollNo || !venue.endRollNo) {
          toast.error(`Please provide start and end roll numbers for ${venueIdentifier}`);
          return;
        }

        const startRoll = parseInt(venue.startRollNo);
        const endRoll = parseInt(venue.endRollNo);

        // Check if roll numbers are valid
        if (isNaN(startRoll) || isNaN(endRoll)) {
          toast.error(`Roll numbers must be valid numbers for ${venueIdentifier}`);
          return;
        }

        // Check if roll numbers are positive
        if (startRoll <= 0 || endRoll <= 0) {
          toast.error(`Roll numbers must be positive for ${venueIdentifier}`);
          return;
        }

        // Check if end roll is greater than or equal to start roll
        if (endRoll < startRoll) {
          toast.error(`End roll number must be greater than or equal to start roll number for ${venueIdentifier}`);
          return;
        }

        // Check if venue.rollNumbers is defined and is an array
        if (!venue.rollNumbers || !Array.isArray(venue.rollNumbers)) {
          toast.error(`Internal error: Roll number list missing for ${venueIdentifier}. Please try auto-assigning again.`);
          return;
        }

        // Check if venue has students assigned
        if (venue.rollNumbers.length === 0) {
          toast.error(`No students assigned to ${venueIdentifier}. Please assign students or remove this venue.`);
          return;
        }

        // Enhanced room capacity validation
        const room = rooms.find(r => r._id === venue.roomId);
        if (!room) {
          toast.error(`Room information not found for ${venueIdentifier}`);
          return;
        }

        // Check if room has valid layout
        if (!room.layout || !Array.isArray(room.layout) || room.layout.length === 0) {
          toast.error(`${venueIdentifier} has invalid layout configuration. Please contact administrator.`);
          return;
        }

        // Calculate room capacity using layout (benches)
        const totalBenches = room.layout.reduce((sum, row) => {
          if (!row.benches || isNaN(row.benches) || row.benches < 0) {
            toast.error(`${venueIdentifier} has invalid bench configuration in layout. Please contact administrator.`);
            return sum;
          }
          return sum + row.benches;
        }, 0);

        if (totalBenches === 0) {
          toast.error(`${venueIdentifier} has no benches available. Please contact administrator.`);
          return;
        }

        const studentsInVenue = venue.rollNumbers.length;
        const benchCapacity = seatingFormData.benchCapacity;

        // VALIDATION 1: Check that students in room don't exceed bench capacity
        const maxRoomCapacity = totalBenches * benchCapacity;
        if (studentsInVenue > maxRoomCapacity) {
          toast.error(`${venueIdentifier} has ${studentsInVenue} students assigned but can only accommodate ${maxRoomCapacity} students (${totalBenches} benches × ${benchCapacity} students per bench).`);
          return;
        }

        // ENHANCED VALIDATION: Check for overlapping roll number ranges between venues
        // Get only ACTUAL student roll numbers that fall within this venue's start-end range
        const venueRollNumberRange = actualStudentRollNumbers.filter(
          (rollNum: number) => rollNum >= startRoll && rollNum <= endRoll
        );

        // Check if venue.rollNumbers are within the venue's startRoll and endRoll
        for (const roll of venue.rollNumbers) {
          if (roll < startRoll || roll > endRoll) {
            toast.error(`Use maximum seating capacity for this room. Write end roll number ${roll} in ${venueIdentifier}).`);
            return;
          }
          // Check if this roll number is an actual student roll number
          if (!actualStudentRollNumbers.includes(roll)) {
            toast.error(`Roll number ${roll} in ${venueIdentifier} is not a valid student roll number for this section.`);
            return;
          }
        }

        // VALIDATION 3: Check each ACTUAL student roll number in the range
        for (const roll of venueRollNumberRange) {
          // CRITICAL VALIDATION: Check if roll number is already assigned to another room
          if (rollNumberToRoomMap.has(roll)) {
            const previousRoom = rollNumberToRoomMap.get(roll);
            const previousRoomName = findRoomName(previousRoom || '');
            const currentRoomName = findRoomName(venue.roomId);
            toast.error(`Roll number ${roll} appears in both ${previousRoomName} and ${currentRoomName}. Each student can only be assigned to one room. Please check your roll number ranges.`);
            return;
          }

          // Record this roll number assignment for actual students in range
          rollNumberToRoomMap.set(roll, venue.roomId);
        }

        // Add actual roll numbers from this venue to the overall list
        allAssignedRollNumbers.push(...venueRollNumberRange);
      }

      // 6. Check for duplicate assignments across all venues
      const uniqueAssignedRollNumbers = new Set(allAssignedRollNumbers);
      if (uniqueAssignedRollNumbers.size !== allAssignedRollNumbers.length) {
        toast.error('Duplicate roll numbers found across different venues. Each student can only be assigned to one seat.');
        return;
      }

      // 7. Check if all students are assigned
      if (uniqueAssignedRollNumbers.size !== actualStudentRollNumbers.length) {
        const unassignedStudents = actualStudentRollNumbers.filter((roll: number) => !uniqueAssignedRollNumbers.has(roll));
        toast.error(`Not all students are assigned. Missing: ${unassignedStudents.join(', ')}. Expected ${actualStudentRollNumbers.length}, found ${uniqueAssignedRollNumbers.size}.`);
        return;
      }

      // Ensure all actual student roll numbers are covered by the assigned ones
      for (const actualRoll of actualStudentRollNumbers) {
        if (!uniqueAssignedRollNumbers.has(actualRoll)) {
          toast.error(`Student with roll number ${actualRoll} has not been assigned to any venue.`);
          return;
        }
      }


      // 9. If all validations pass, submit the form
      const token = localStorage.getItem('token');

      // Check if token exists
      if (!token) {
        return;
      }

      const response = await fetch('/api/seating-arrangement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          examId: seatingFormData.examId,
          sectionId: seatingFormData.sectionId,
          venueDetails: seatingFormData.venueDetails,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to add seating arrangement');
        return;
      }

      toast.success('Seating arrangement added successfully');
      setIsSeatingModalOpen(false);
      fetchExams();
    } catch (error) {
      toast.error('An error occurred. Please check console for details.');
    }
  };

  // Handle year change from dropdown
  const handleYearChange = (yearId: ISession) => {
    setSelectedAcademicYear(yearId);
  };

  // Function to handle viewing seating arrangement  
  const handleViewSeatingArrangement = (e: React.MouseEvent<HTMLButtonElement>, subject: Subject, arrangement: ISeatingArrangement, classNumber: string) => {
    e.stopPropagation();
    e.preventDefault();

    setShowSeatingModal(true);
  };

  // Add these functions for managing venue details
  const handleVenueDetailChange = (index: number, field: string, value: string) => {
    const updatedVenueDetails = [...seatingFormData.venueDetails];
    updatedVenueDetails[index] = {
      ...updatedVenueDetails[index],
      [field]: value
    };

    // Validation for roll number fields
    if (field === 'startRollNo' || field === 'endRollNo') {
      const numValue = parseInt(value);

      // Check if it's a valid positive number
      if (value !== '' && (isNaN(numValue) || numValue <= 0)) {
        toast.error('Roll numbers must be positive integers');
        return;
      }

      // If we have student data, validate roll number ranges
      if (studentData && studentData.studentIds && value !== '') {
        const actualRollNumbers = studentData.studentIds.map((s: any) => s.rollNumber);
        const minRoll = Math.min(...actualRollNumbers);
        const maxRoll = Math.max(...actualRollNumbers);

        if (numValue < minRoll || numValue > maxRoll) {
          toast.error(`Roll number must be between ${minRoll} and ${maxRoll} for this section`);
          return;
        }
      }

      // Validate start <= end when both are provided
      if (field === 'endRollNo' && updatedVenueDetails[index].startRollNo) {
        const startRoll = parseInt(updatedVenueDetails[index].startRollNo);
        if (!isNaN(startRoll) && !isNaN(numValue) && numValue < startRoll) {
          toast.error('End roll number must be greater than or equal to start roll number');
          return;
        }
      }

      if (field === 'startRollNo' && updatedVenueDetails[index].endRollNo) {
        const endRoll = parseInt(updatedVenueDetails[index].endRollNo);
        if (!isNaN(endRoll) && !isNaN(numValue) && numValue > endRoll) {
          toast.error('Start roll number must be less than or equal to end roll number');
          return;
        }
      }
    }

    // Auto-populate roll numbers when room is selected
    if (field === 'roomId' && value && studentData) {
      const selectedRoom = rooms.find(room => room._id === value);
      if (selectedRoom) {
        // Validate room layout exists
        if (!selectedRoom.layout || !Array.isArray(selectedRoom.layout) || selectedRoom.layout.length === 0) {
          toast.error('Selected room has invalid layout configuration');
          return;
        }

        // Calculate room capacity using layout (benches) and bench capacity
        const totalBenches = selectedRoom.layout.reduce((sum, row) => {
          if (!row.benches || isNaN(row.benches) || row.benches < 0) {
            return sum;
          }
          return sum + row.benches;
        }, 0);

        if (totalBenches === 0) {
          toast.error('Selected room has no available benches');
          return;
        }

        const roomCapacity = totalBenches * seatingFormData.benchCapacity; // Use bench-based capacity with bench capacity multiplier

        // Check if this room is already used in another venue
        const isRoomAlreadyUsed = seatingFormData.venueDetails.some((venue, venueIndex) =>
          venueIndex !== index && venue.roomId === value
        );

        if (isRoomAlreadyUsed) {
          toast.error('This room is already assigned to another venue');
          return;
        }

        // For first venue, start from minimum roll number
        if (index === 0) {
          const startRoll = studentData.minRoll || 1;
          const endRoll = Math.min(startRoll + roomCapacity - 1, studentData.maxRoll || studentData.totalCount || 0);

          updatedVenueDetails[index] = {
            ...updatedVenueDetails[index],
            startRollNo: startRoll.toString(),
            endRollNo: endRoll.toString(),
            rollNumbers: []
          };
        }
        // For subsequent venues, continue from where previous venue ended
        else if (index > 0 && updatedVenueDetails[index - 1].endRollNo) {
          const prevEndRoll = parseInt(updatedVenueDetails[index - 1].endRollNo);
          const startRoll = prevEndRoll + 1;
          const endRoll = Math.min(startRoll + roomCapacity - 1, studentData.maxRoll || studentData.totalCount || 0);

          // Validate the calculated range
          if (startRoll > (studentData.maxRoll || studentData.totalCount || 0)) {
            toast.error('No more students available for assignment');
            return;
          }

          updatedVenueDetails[index] = {
            ...updatedVenueDetails[index],
            startRollNo: startRoll.toString(),
            endRollNo: endRoll.toString(),
            rollNumbers: []
          };
        }
      }
    }

    setSeatingFormData({
      ...seatingFormData,
      venueDetails: updatedVenueDetails
    });
  };

  const addVenueDetail = () => {
    setSeatingFormData({
      ...seatingFormData,
      venueDetails: [
        ...seatingFormData.venueDetails,
        { roomId: '', startRollNo: '', endRollNo: '', rollNumbers: [] as number[] }
      ]
    });
  };

  const removeVenueDetail = (index: number) => {
    const updatedVenueDetails = seatingFormData.venueDetails.filter((_, i) => i !== index);
    setSeatingFormData({
      ...seatingFormData,
      venueDetails: updatedVenueDetails
    });
  };

  // Add this function near your other utility functions
  // this can be in mongo db and configurable based om exam type
  // should be static
  // const assignRoomToClass = (classNumber: number) => {
  //   if (classNumber >= 1 && classNumber <= 2) {
  //     return [`${classNumber}`, `${classNumber + 1}`]; // Room 1, 2, or 3
  //   } else if (classNumber >= 3 && classNumber <= 4) {
  //     return [`${classNumber}`, `${classNumber + 1}`];
  //   } else if (classNumber >= 5 && classNumber <= 6) {
  //     return [`${classNumber}`, `${classNumber + 1}`];
  //   } else if (classNumber >= 7 && classNumber <= 8) {
  //     return [`${classNumber}`, `${classNumber + 1}`];
  //   } else if (classNumber >= 9 && classNumber <= 10) {
  //     return [`${classNumber}`, `${classNumber + 1}`, 'Seminar Hall'];
  //   } else if (classNumber >= 11 && classNumber <= 12) {
  //     return [`${classNumber}`, `${classNumber + 1}`, 'Seminar Hall'];
  //   }
  // };

  const assignRoomToClass = (classNumber: number) => {
    if (classNumber >= 1 && classNumber <= 2) {
      return ["XS"];
    } else if (classNumber >= 3 && classNumber <= 4) {
      return ["S"];
    } else if (classNumber >= 5 && classNumber <= 6) {
      return ["M"];
    } else if (classNumber >= 7 && classNumber <= 8) {
      return ["L"];
    } else if (classNumber >= 9 && classNumber <= 10) {
      return ["XL", "ALL"];
    } else if (classNumber >= 11 && classNumber <= 12) {
      return ["XXL", "ALL"];
    }
  };

  // Function to fetch room availability based on existing seating arrangements
  const fetchRoomAvailability = async (examDate: string, rooms: IRoom[], examId: string, sectionId: string, benchCapacity: number, currentClass: number) => {
    try {
      // Fetch all seating arrangements for this exam
      const roomIdsString = rooms.map((room: IRoom) => room._id).join(',');
      const token = localStorage.getItem('token');

      // Skip API call if no token (user logged out)
      if (!token) {
        return;
      }

      const response = await fetch(`/api/seating-arrangement?examDate=${examDate}&roomIds=${roomIdsString}&examId=${examId}&sectionId=${sectionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to fetch existing seating arrangements');
        return;
      }

      const seatingArrangements = await response.json();

      // Create detailed room occupancy tracking with class information
      const roomOccupancy: {
        [roomId: string]: {
          classes: { classNumber: number, section: string, occupiedCount: number }[],
          totalOccupied: number,
          occupiedClasses: Set<number>,
          benchCapacity: number
        }
      } = {};

      // Iterate through each seating arrangement to calculate detailed occupancy
      seatingArrangements.forEach((arrangement: any) => {
        // Check if the arrangement has valid venue details
        if (arrangement.venueDetails && Array.isArray(arrangement.venueDetails)) {
          // For each venue in the arrangement, calculate and add its occupancy
          arrangement.venueDetails.forEach((venue: any) => {
            const roomId = venue.roomId;

            // Get count of students from roll numbers array, default to 0 if none
            const className = arrangement.examId?.classId?.classNumber;
            const sectionName = arrangement.sectionId?.section;

            let occupiedCount = 0;
            if (currentClass === className) {
              occupiedCount = venue.rollNumbers.length;
            }

            // Get class and section information from the arrangement

            // Initialize room entry if it doesn't exist
            if (!roomOccupancy[roomId]) {
              roomOccupancy[roomId] = {
                classes: [],
                totalOccupied: 0,
                occupiedClasses: new Set<number>(),
                benchCapacity: benchCapacity
              };
            }

            // Add class information and update total
            roomOccupancy[roomId].classes.push({
              classNumber: className,
              section: sectionName,
              occupiedCount: occupiedCount
            });

            roomOccupancy[roomId].totalOccupied += occupiedCount;
            roomOccupancy[roomId].occupiedClasses.add(className);
          });
        }
      });

      return roomOccupancy;
    } catch (error) {
      console.error('Error fetching room availability:', error);
      return {};
    }
  };

  // Add this function to auto-populate venue details
  const autoAssignRooms = async () => {
    try {
      setIsLoadingRooms(true);

      // Enhanced validation for auto-assign
      if (!seatingFormData.classNumber) {
        toast.error('Please select a class first');
        return;
      }

      if (!seatingFormData.examId) {
        toast.error('Exam information is missing');
        return;
      }

      if (!seatingFormData.sectionId) {
        toast.error('Please select a section first');
        return;
      }

      if (!seatingFormData.examDate) {
        toast.error('Exam date is missing');
        return;
      }

      // Check if exam date is not in the past
      const examDate = new Date(seatingFormData.examDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (examDate < today) {
        toast.error('Cannot auto-assign rooms for past exam dates');
        return;
      }

      // Validate student data exists
      if (!studentData || !studentData.studentIds || studentData.studentIds.length === 0) {
        toast.error('No student data available. Please select a section with students.');
        return;
      }

      // Validate rooms are available
      if (!seatingFormData.rooms || seatingFormData.rooms.length === 0) {
        toast.error('No rooms available for this class. Please contact administrator.');
        return;
      }

      const classNumber = parseInt(seatingFormData.classNumber);

      // Fetch existing room occupancy
      const roomOccupancy = await fetchRoomAvailability(seatingFormData.examDate, seatingFormData.rooms, seatingFormData.examId, seatingFormData.sectionId, seatingFormData.benchCapacity, classNumber);


      // Validate class number
      if (isNaN(classNumber) || classNumber <= 0) {
        toast.error('Invalid class number');
        return;
      }

      // Calculate availability for each room with enhanced validation and class compatibility
      const roomsWithAvailability = seatingFormData.rooms.map(recommendedRoom => {
        // Validate room layout exists
        if (!recommendedRoom.layout || !Array.isArray(recommendedRoom.layout) || recommendedRoom.layout.length === 0) {
          console.warn(`Room ${recommendedRoom.room} has invalid layout`);
          return {
            ...recommendedRoom,
            totalCapacity: 0,
            occupiedCapacity: 0,
            availableCapacity: 0
          };
        }

        // Calculate capacity using layout (benches)
        const totalBenches = recommendedRoom.layout.reduce((sum, row) => {
          if (!row.benches || isNaN(row.benches) || row.benches < 0) {
            console.warn(`Room ${recommendedRoom.room} has invalid bench configuration`);
            return sum;
          }
          return sum + row.benches;
        }, 0);

        // Calculate available capacity based on class compatibility and bench capacity
        let availableCapacity = 0;
        const roomOccupancyData = roomOccupancy?.[recommendedRoom._id];

        // Check if this room ID exists in the roomOccupancy object
        if (roomOccupancy && recommendedRoom._id in roomOccupancy && roomOccupancyData) {
          // Room has occupancy data - calculate available capacity as total - occupied
          availableCapacity = totalBenches - roomOccupancyData.totalOccupied;
        } else if (!roomOccupancyData || roomOccupancyData.totalOccupied === 0) {
          // Room is completely empty - full capacity available
          availableCapacity = totalBenches;
        } else {
          // Room has existing occupancy - check class compatibility
          const occupiedClasses = roomOccupancyData.occupiedClasses;
          const currentClass = classNumber;

          if (occupiedClasses.has(currentClass)) {
            // Current class already occupies this room - no additional capacity
            // (cannot double-book the same exam)
            availableCapacity = 0;
          } else {
            // Different classes occupy the room - full capacity available
            // (different classes get different benches/sides, one side per class)
            availableCapacity = totalBenches - roomOccupancyData.totalOccupied;
          }
        }

        return {
          ...recommendedRoom,
          totalCapacity: seatingFormData.benchCapacity,
          occupiedCapacity: roomOccupancyData?.totalOccupied || 0,
          availableCapacity: Math.max(0, availableCapacity)
        };
      });

      // Filter out rooms with no available capacity and sort by available capacity
      const availableRooms = roomsWithAvailability
        .filter(room => room.availableCapacity > 0 && room.totalCapacity > 0)
        .sort((a, b) => b.availableCapacity - a.availableCapacity);

      if (availableRooms.length === 0) {
        toast.error('No rooms available with sufficient capacity. All rooms are either full or have invalid configurations.');
        return;
      }

      const totalStudents = studentData.totalCount || studentData.studentIds.length;

      if (totalStudents === 0) {
        toast.error('No students to assign in this section.');
        return;
      }

      // Calculate total available capacity
      const totalAvailableCapacity = availableRooms.reduce((sum, room) => sum + room.availableCapacity, 0);

      if (totalStudents > totalAvailableCapacity) {
        toast.error(`Insufficient room capacity. Need: ${totalStudents} seats, Available: ${totalAvailableCapacity} seats.`);
        return;
      }

      if (studentData && availableRooms.length > 0) {
        let studentsToAssign = totalStudents;
        let roomsNeeded = [];

        // Add rooms until we have enough capacity for all students
        for (const room of [...availableRooms].sort(() => Math.random() - 0.5)) {
          if (studentsToAssign <= 0) break;

          // Use available capacity for assignment
          const usableCapacity = Math.min(room.availableCapacity, studentsToAssign);

          if (usableCapacity > 0) {
            roomsNeeded.push({
              roomId: room._id,
              capacity: usableCapacity,
              availableCapacity: room.availableCapacity
            });
            studentsToAssign -= usableCapacity;
          }
        }

        // Extract just the room IDs for shuffling
        const matchedRoomIds = roomsNeeded.map(r => r.roomId);

        // Shuffle the matchedRoomIds array for random assignment
        // This uses the Fisher-Yates shuffle algorithm
        const shuffleArray = (array: string[]) => {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        };

        // Before processing the rooms, shuffle the array
        const randomizedRoomIds = shuffleArray(matchedRoomIds);

        // If student data is available, distribute students across rooms based on available capacity
        if (studentData && studentData.studentIds && randomizedRoomIds.length > 0) {
          const actualRollNumbersFromData = studentData.studentIds.map((student: any) => student.rollNumber).sort((a: number, b: number) => a - b);

          // Validate roll numbers
          const invalidRolls = actualRollNumbersFromData.filter((roll: number) => isNaN(roll) || roll <= 0);
          if (invalidRolls.length > 0) {
            toast.error(`Invalid roll numbers found: ${invalidRolls.join(', ')}`);
            return;
          }

          if (actualRollNumbersFromData.length === 0) {
            toast.error("No students found for this section to assign.");
            // Optionally, still assign rooms but leave roll numbers blank
            const newVenueDetails = randomizedRoomIds.map(roomId => ({
              roomId: roomId,
              startRollNo: '',
              endRollNo: '',
              rollNumbers: [] as number[]
            }));
            setSeatingFormData({
              ...seatingFormData,
              venueDetails: newVenueDetails
            });
            toast.error(`Assigned ${newVenueDetails.length} room(s) without student roll numbers.`);
            return;
          }

          const newVenueDetails = [];
          let currentStudentIndex = 0; // Index for iterating through actualRollNumbersFromData

          for (const roomId of randomizedRoomIds) {
            if (currentStudentIndex >= actualRollNumbersFromData.length) {
              break; // All students have been assigned
            }

            const room = seatingFormData.rooms.find(r => r._id === roomId);
            if (!room) {
              console.warn(`Room with ID ${roomId} not found`);
              continue;
            }

            // Calculate available capacity for this room considering bench capacity and class compatibility
            const totalBenches = room.layout.reduce((sum, row) => sum + row.benches, 0);
            const totalCapacity = totalBenches;
            const roomOccupancyData = roomOccupancy?.[roomId];

            let availableCapacity = 0;
            // Check if this room ID exists in the roomOccupancy object
            if (roomOccupancy && roomId in roomOccupancy && roomOccupancyData) {
              // Room has occupancy data - calculate available capacity as total - occupied
              availableCapacity = totalCapacity - roomOccupancyData.totalOccupied;
            } else if (!roomOccupancyData || roomOccupancyData.totalOccupied === 0) {
              // Room is completely empty
              availableCapacity = totalCapacity;
            } else {
              // Check class compatibility
              const occupiedClasses = roomOccupancyData.occupiedClasses;
              if (occupiedClasses.has(classNumber)) {
                // Current class already occupies this room - no additional capacity
                // (cannot double-book the same exam)
                availableCapacity = 0;
              } else {
                // Different classes occupy the room - full capacity available
                // (different classes get different benches/sides, one side per class)
                availableCapacity = totalCapacity - roomOccupancyData.totalOccupied;
              }
            }

            if (availableCapacity === 0) {
              continue; // Skip rooms with no available capacity
            }

            const rollNumbersForThisRoom: number[] = [];
            let roomStartRoll: number | null = null;
            let roomEndRoll: number | null = null;

            // Assign students to this room up to its available capacity
            const studentsToAssignToRoom = Math.min(availableCapacity, actualRollNumbersFromData.length - currentStudentIndex);

            for (let i = 0; i < studentsToAssignToRoom; i++) {
              const studentRoll = actualRollNumbersFromData[currentStudentIndex];
              if (roomStartRoll === null) {
                roomStartRoll = studentRoll;
              }
              roomEndRoll = studentRoll;
              rollNumbersForThisRoom.push(studentRoll);
              currentStudentIndex++;
            }

            if (rollNumbersForThisRoom.length > 0 && roomStartRoll !== null && roomEndRoll !== null) {
              newVenueDetails.push({
                roomId: roomId,
                startRollNo: roomStartRoll.toString(),
                endRollNo: roomEndRoll.toString(),
                rollNumbers: rollNumbersForThisRoom
              });
            }
          }

          // Final validation before setting the data
          if (newVenueDetails.length === 0) {
            toast.error("No rooms could be assigned. Please check room availability and configurations.");
            return;
          }

          // Validate that all students are assigned
          const assignedStudents = newVenueDetails.reduce((total, venue) => total + venue.rollNumbers.length, 0);
          if (assignedStudents !== actualRollNumbersFromData.length) {
            toast.error(`Assignment incomplete. Expected: ${actualRollNumbersFromData.length}, Assigned: ${assignedStudents}`);
            return;
          }

          // ADDITIONAL VALIDATION 1: Check that no room exceeds bench capacity
          for (const venue of newVenueDetails) {
            const room = seatingFormData.rooms.find(r => r._id === venue.roomId);
            if (room && room.layout) {
              const totalBenches = room.layout.reduce((sum, row) => sum + (row.benches || 0), 0);
              const maxRoomCapacity = totalBenches * seatingFormData.benchCapacity;
              const studentsInRoom = venue.rollNumbers.length;

              if (studentsInRoom > maxRoomCapacity) {
                toast.error(`Auto-assignment failed: Room ${room.room} would have ${studentsInRoom} students but can only accommodate ${maxRoomCapacity} students (${totalBenches} benches × ${seatingFormData.benchCapacity} students per bench).`);
                return;
              }
            }
          }

          // ADDITIONAL VALIDATION 2: Check for duplicate roll number assignments
          const rollNumberToRoomMap = new Map<number, string>();
          for (const venue of newVenueDetails) {
            const roomName = seatingFormData.rooms.find(r => r._id === venue.roomId)?.room || 'Unknown Room';

            for (const roll of venue.rollNumbers) {
              if (rollNumberToRoomMap.has(roll)) {
                const previousRoomId = rollNumberToRoomMap.get(roll);
                const previousRoomName = seatingFormData.rooms.find(r => r._id === previousRoomId)?.room || 'Unknown Room';
                toast.error(`Auto-assignment failed: Roll number ${roll} assigned to both ${previousRoomName} and ${roomName}.`);
                return;
              }
              rollNumberToRoomMap.set(roll, venue.roomId);
            }
          }

          setSeatingFormData({
            ...seatingFormData,
            venueDetails: newVenueDetails
          });

          if (newVenueDetails.length > 0) {
            toast.success(`Auto-assigned ${newVenueDetails.length} room(s) with ${assignedStudents} students.`);

            // Show warning if rooms have existing occupancy
            const roomsWithOccupancy = newVenueDetails.filter(venue =>
              roomOccupancy?.[venue.roomId] && roomOccupancy?.[venue.roomId].totalOccupied > 0
            );

            if (roomsWithOccupancy.length > 0) {
              toast(`Note: ${roomsWithOccupancy.length} room(s) already have partial occupancy from other sections.`, {
                icon: '📝',
              });
            }
          }

          if (currentStudentIndex < actualRollNumbersFromData.length) {
            const unassignedCount = actualRollNumbersFromData.length - currentStudentIndex;
            toast.error(`Not all students could be assigned. ${unassignedCount} student(s) remaining due to insufficient room capacity.`);
          }

        } else if (randomizedRoomIds.length > 0) {
          // If we have rooms but no student data, just assign the rooms without roll numbers
          const newVenueDetails = randomizedRoomIds.map(roomId => ({
            roomId: roomId,
            startRollNo: '',
            endRollNo: '',
            rollNumbers: []
          }));

          setSeatingFormData({
            ...seatingFormData,
            venueDetails: newVenueDetails
          });

          toast.success(`Auto-assigned ${randomizedRoomIds.length} room(s) for Class ${classNumber}`);
        } else {
          toast.error('Could not find available rooms. All recommended rooms may be fully occupied.');
        }
      } else {
        toast.error('No available rooms found or student data missing.');
      }
    } catch (error) {
      console.error('Error in auto-assigning rooms:', error);
      toast.error('An error occurred while auto-assigning rooms. Please try again.');
    } finally {
      setIsLoadingRooms(false);
    }
  };

  if (isLoadingAcademicYears) {
    return (
      <div className="flex flex-col w-full min-h-screen p-2 sm:p-3 lg:p-4 xl:p-6 bg-base-100">
        <div className="card bg-base-200 shadow-xl flex-1 w-full">
          <div className="card-body flex items-center justify-center p-8 sm:p-12">
            <div className="text-center">
              <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
              <p className="text-sm sm:text-base text-base-content">Loading calendar...</p>
              <p className="text-xs sm:text-sm text-base-content/60 mt-2">Please wait while we fetch your academic data</p>
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
                Please set up this account first by creating academic years before accessing the Exams and Holidays.
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
              <p className="text-sm sm:text-base text-base-content">Loading calendar...</p>
              <p className="text-xs sm:text-sm text-base-content/60 mt-2">Please wait while we fetch your academic data</p>
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
          <div className="mb-4 sm:mb-6 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="card-title text-base sm:text-lg md:text-xl lg:text-2xl text-base-content break-words">Academic Calendar</h2>

              {/* Replace custom dropdown with our component */}
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

          <Tabs
            defaultValue="events"
            className="w-full"
            onValueChange={(value) => setActiveTab(value)}
          >
            <TabsList className="relative grid w-full grid-cols-3 bg-base-300 backdrop-blur-sm max-w-2xl sm:max-w-4xl md:max-w-2xl lg:max-w-3xl xl:max-w-3xl mx-auto mt-4 sm:mb-6 rounded-lg sm:rounded-xl p-1 shadow-md border border-base-content/30">
              {/* Sliding Background Indicator */}
              <div
                className={`absolute top-1 bottom-1 rounded-md sm:rounded-lg bg-base-100 shadow-md transition-all duration-300 ease-in-out ${activeTab === 'events'
                  ? 'left-1 w-1/3 mr-1'
                  : activeTab === 'holidays'
                    ? 'left-[calc(33.333%+0.25rem)] w-1/3'
                    : 'left-[calc(66.666%+0.25rem)] w-1/3'
                  }`}
              />
              <TabsTrigger
                value="events"
                className={`relative flex items-center justify-center rounded-md sm:rounded-lg transition-all duration-300 ease-in-out px-2 sm:px-4 py-2 sm:py-3 min-w-0 z-10 ${activeTab === 'events'
                  ? 'text-orange-600 font-semibold'
                  : 'text-base-content/80 hover:text-orange-600 font-medium'
                  }`}
              >
                <CalendarFold className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">Events</span>
              </TabsTrigger>

              <TabsTrigger
                value="holidays"
                className={`relative flex items-center justify-center rounded-md sm:rounded-lg transition-all duration-300 ease-in-out px-2 sm:px-4 py-2 sm:py-3 min-w-0 z-10 ${activeTab === 'holidays'
                  ? 'text-emerald-600 font-semibold'
                  : 'text-base-content/80 hover:text-emerald-600 font-medium'
                  }`}
              >
                <Palmtree className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">Holidays</span>
              </TabsTrigger>
              <TabsTrigger
                value="exams"
                className={`relative flex items-center justify-center rounded-md sm:rounded-lg transition-all duration-300 ease-in-out px-2 sm:px-4 py-2 sm:py-3 min-w-0 z-10 ${activeTab === 'exams'
                  ? 'text-blue-600 font-semibold'
                  : 'text-base-content/80 hover:text-blue-600 font-medium'
                  }`}
              >
                <GraduationCap className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium truncate">Exams</span>
              </TabsTrigger>
            </TabsList>

            <div className="overflow-x-auto">
              <TabsContent value="events" className="mt-0">
                {/* Add Event Button */}
                <div className="flex justify-end mb-4">
                  <Button
                    variant="primary"
                    outline
                    className="w-full sm:w-auto flex items-center gap-2"
                    onClick={() => setIsAddEventModalOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Add Event
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-3 sm:gap-4">
                  {apiEvents.map(event => (
                    <div
                      key={event.id || event._id}
                      className="border border-base-300 rounded-lg p-3 sm:p-4 hover:bg-base-100/80 transition-colors bg-base-100 hover:shadow-md min-w-0 cursor-pointer relative"
                      onClick={() => handleEventCardClick(event)}
                    >
                      <div className="flex gap-3">
                        {/* Event Photos - Horizontal Overlapping */}
                        {(event.photo1 || event.photo2 || event.photo3) && (
                          <div className="flex-shrink-0">
                            <div className="flex items-center">
                              {/* Photo 1 - Leftmost */}
                              {event.photo1 && (
                                <div className="w-8 h-8 sm:w-10 sm:h-10 relative z-30">
                                  <img
                                    src={event.photo1}
                                    alt={`${event.name} photo 1`}
                                    className="w-full h-full object-cover rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const modal = document.createElement('div');
                                      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';
                                      modal.innerHTML = `
                                        <div class="relative max-w-4xl max-h-4xl p-4">
                                          <img src="${event.photo1}" class="max-w-full max-h-full object-contain rounded-lg" />
                                          <button class="absolute top-2 right-2 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold hover:bg-gray-200" onclick="this.parentElement.parentElement.remove()">×</button>
                                        </div>
                                      `;
                                      modal.addEventListener('click', (e) => {
                                        if (e.target === modal) modal.remove();
                                      });
                                      document.body.appendChild(modal);
                                    }}
                                  />
                                </div>
                              )}

                              {/* Photo 2 - Overlapping middle */}
                              {event.photo2 && (
                                <div className="w-8 h-8 sm:w-10 sm:h-10 relative z-20 -ml-2 sm:-ml-3">
                                  <img
                                    src={event.photo2}
                                    alt={`${event.name} photo 2`}
                                    className="w-full h-full object-cover rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const modal = document.createElement('div');
                                      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';
                                      modal.innerHTML = `
                                        <div class="relative max-w-4xl max-h-4xl p-4">
                                          <img src="${event.photo2}" class="max-w-full max-h-full object-contain rounded-lg" />
                                          <button class="absolute top-2 right-2 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold hover:bg-gray-200" onclick="this.parentElement.parentElement.remove()">×</button>
                                        </div>
                                      `;
                                      modal.addEventListener('click', (e) => {
                                        if (e.target === modal) modal.remove();
                                      });
                                      document.body.appendChild(modal);
                                    }}
                                  />
                                </div>
                              )}

                              {/* Photo 3 - Rightmost overlapping */}
                              {event.photo3 && (
                                <div className="w-8 h-8 sm:w-10 sm:h-10 relative z-10 -ml-2 sm:-ml-3">
                                  <img
                                    src={event.photo3}
                                    alt={`${event.name} photo 3`}
                                    className="w-full h-full object-cover rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const modal = document.createElement('div');
                                      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75';
                                      modal.innerHTML = `
                                        <div class="relative max-w-4xl max-h-4xl p-4">
                                          <img src="${event.photo3}" class="max-w-full max-h-full object-contain rounded-lg" />
                                          <button class="absolute top-2 right-2 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center text-lg font-bold hover:bg-gray-200" onclick="this.parentElement.parentElement.remove()">×</button>
                                        </div>
                                      `;
                                      modal.addEventListener('click', (e) => {
                                        if (e.target === modal) modal.remove();
                                      });
                                      document.body.appendChild(modal);
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Event Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2">
                            <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-base-content break-words leading-tight">{event.name}</h3>
                            <div className="badge bg-blue-100 text-blue-800 border-blue-200 text-xs whitespace-nowrap flex-shrink-0 self-start">
                              {responsiveDate(event.date || event.startDate)}
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-base-content/70 break-words mt-1 leading-relaxed">{event.description || event.summary}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="holidays" className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-3 sm:gap-4">
                  {holidays.map(holiday => (
                    <div key={holiday.id} className="border border-base-300 rounded-lg p-3 sm:p-4 hover:bg-base-100/80 transition-colors bg-base-100 hover:shadow-md min-w-0">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-base-content break-words">{holiday.name}</h3>
                          <div className="badge bg-emerald-100 text-emerald-800 border-emerald-200 text-xs whitespace-nowrap flex-shrink-0 self-start">
                            {responsiveDate(holiday.date)}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-base-content/70 break-words">{holiday.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="exams" className="mt-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                  <h3 className="text-base sm:text-lg font-semibold text-base-content">
                    {userRole === 'STUDENT' ? 'Your Examination Schedule' : 'Examination Schedule'}
                  </h3>

                  {/* Only show Add Exam button for non-student users */}
                  {userRole !== 'STUDENT' && (
                    <Button
                      variant='primary'
                      outline
                      onClick={handleAddExamClick}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="xs:inline">Add Exam</span>
                    </Button>
                  )}
                </div>

                {isLoadingExams ? (
                  <div className="flex flex-col justify-center items-center p-8">
                    <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
                    <p className="mt-2 text-base-content">Loading exams...</p>
                  </div>
                ) : exams.length > 0 ? (
                  <ManageExam exams={exams} />
                ) : (
                  <div className="text-center py-8 sm:py-12 text-base-content/70">
                    <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📚</div>
                    <p className="text-sm sm:text-base mb-4">No exams scheduled for this academic year.</p>
                    {userRole !== 'STUDENT' && (
                      <Button
                        variant='primary'
                        outline
                        className="btn btn-sm sm:btn-md btn-outline"
                        onClick={handleAddExamClick}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        <span className="xs:inline">Schedule an exam</span>
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Add Exam Modal */}
      {isAddExamModalOpen && userRole !== 'STUDENT' && (
        <div
          className="fixed bg-black bg-opacity-50 flex items-center justify-center z-50"
          style={{
            top: '4rem', // Account for navbar height (64px)
            left: isExpanded ? '16rem' : '4rem', // Account for sidebar width
            right: '0',
            bottom: '0'
          }}
        >
          <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-3xl max-h-[calc(100%-4rem)] overflow-y-auto m-4">
            <div className="sticky top-0 bg-base-100 border-b border-base-300 border-base-content/60 p-2 sm:p-3 md:p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg sm:text-xl font-semibold text-base-content">Add New Examination</h3>
                <Button
                  variant="error"
                  outline
                  className="btn btn-sm"
                  onClick={() => setIsAddExamModalOpen(false)}
                >
                  <span className="text-lg sm:text-xl">×</span>
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-6">

              <form className="space-y-4" onSubmit={handleSubmitExam}>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-base-content">Exam Type</span>
                  </label>
                  <select
                    className="select select-bordered w-full text-base-content"
                    required
                    name="examType"
                    value={examFormData.examType}
                    onChange={handleInputChange}
                  >
                    <option value="" disabled className="text-base-content">Select exam type</option>
                    {isLoadingExamTypes ? (
                      <option disabled className="text-base-content">Loading exam types...</option>
                    ) : (
                      examTypes.map((type: any) => (
                        <option key={type._id} value={type._id} className="text-base-content">{type.type}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Conditional Bench Capacity Field */}
                {examFormData.isBenchCapacityCapture && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-base-content">Bench Capacity</span>
                    </label>
                    <input
                      type="number"
                      className={`input input-bordered text-base-content ${benchCapacityError ? 'input-error border-error' : ''}`}
                      required
                      name="benchCapacity"
                      value={examFormData.benchCapacity}
                      onChange={handleInputChange}
                      min="1"
                      max="3"
                      placeholder="Enter bench capacity"
                    />
                    {benchCapacityError && (
                      <label className="label">
                        <span className="label-text-alt text-error">{benchCapacityError}</span>
                      </label>
                    )}
                    <label className="label">
                      <span className="label-text-alt text-info">
                        Number of students per bench
                      </span>
                    </label>
                  </div>
                )}

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-base-content">Class</span>
                  </label>
                  <select
                    className="select select-bordered w-full text-base-content"
                    required
                    name="classId"
                    value={examFormData.classId}
                    onChange={handleInputChange}
                  >
                    <option value="" disabled className="text-base-content">Select class</option>
                    {isLoadingClasses ? (
                      <option disabled className="text-base-content">Loading classes...</option>
                    ) : (
                      classes.map((cls: any) => (
                        <option key={cls._id} value={cls._id} className="text-base-content">
                          {cls.classNumber}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-base-content">Subject</span>
                  </label>
                  <select
                    className="select select-bordered w-full text-base-content"
                    required
                    name="subjectId"
                    value={examFormData.subjectId}
                    onChange={handleInputChange}
                    disabled={!examFormData.classId || !examFormData.examType || isLoadingSubjects}
                  >
                    <option value="" disabled className="text-base-content">
                      {!examFormData.classId
                        ? 'Select a class first'
                        : !examFormData.examType
                          ? 'Select an exam type first'
                          : 'Select subject'}
                    </option>
                    {isLoadingSubjects ? (
                      <option disabled className="text-base-content">Loading subjects...</option>
                    ) : (
                      subjects.map((subject: any) => (
                        <option key={subject._id} value={subject._id} className="text-base-content">
                          {subject.subject}
                        </option>
                      ))
                    )}
                  </select>
                  {examFormData.classId && examFormData.examType && subjects.length === 0 && !isLoadingSubjects && (
                    <p className="text-xs text-red-500 mt-1">No available subjects found. All subjects may already have exams scheduled for this exam type.</p>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-base-content">Exam Date</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered text-base-content"
                    required
                    name="examDate"
                    value={examFormData.examDate}
                    onChange={handleInputChange}
                    min={selectedAcademicYear ? new Date(selectedAcademicYear.startDate).toISOString().slice(0, 10) : ''}
                    max={selectedAcademicYear ? new Date(selectedAcademicYear.endDate).toISOString().slice(0, 10) : ''}
                  />
                  <label className="label">
                    <span className="label-text-alt text-info">
                      Date must be within {formatAcademicYearLabel(selectedAcademicYear)}
                    </span>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    outline
                    className="w-full sm:w-auto order-2 sm:order-1"
                    onClick={() => setIsAddExamModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    outline
                    disabled={isSubmitting}
                    className="w-full sm:w-auto order-1 sm:order-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-xs mr-2"></span>
                        Saving...
                      </>
                    ) : (
                      'Add Exam'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Seating Arrangement Modal */}
      {isSeatingModalOpen && (
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
              setIsSeatingModalOpen(false);
            }
          }}
        >
          <div
            className="bg-base-100 rounded-lg shadow-2xl 
                       w-[calc(100%-1rem)] h-[calc(100%-2rem)] m-2
                       sm:w-[calc(100%-2rem)] sm:h-[calc(100%-3rem)] sm:rounded-xl sm:m-4 
                       md:w-[calc(100%-4rem)] md:h-[calc(100%-4rem)] md:rounded-2xl md:m-6
                       lg:w-[calc(100%-6rem)] lg:max-h-[calc(100vh-8rem)] lg:rounded-2xl lg:m-8
                       xl:max-w-6xl xl:max-h-[calc(100vh-6rem)] xl:rounded-3xl
                       2xl:max-w-7xl 2xl:max-h-[calc(100vh-4rem)]
                       overflow-hidden animate-in zoom-in-95 duration-200 border border-base-content/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              <div className="sticky top-0 bg-base-200 border-b border-base-300 border-base-content/60 z-10 px-4 py-3">
                <div className="flex justify-between items-center gap-2 p-2">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-base-content truncate pr-2">
                    {seatingFormData.subjectName} : Add Seating Arrangement
                  </h3>
                  <Button
                    outline
                    variant='error'
                    onClick={() => setIsSeatingModalOpen(false)}
                  >
                    <span className="text-lg font-bold">×</span>
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">

                <form className="space-y-3 sm:space-y-4 md:space-y-5" onSubmit={handleSubmitSeatingArrangement}>
                  {/* Class and Section in flex layout */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* Class information (read-only) */}
                    <div className="form-control flex-1 min-w-0">
                      <label className="label">
                        <span className="label-text text-xs sm:text-sm md:text-base text-base-content">Class</span>
                      </label>
                      <input
                        type="text"
                        className="input input-bordered input-sm sm:input-md text-base-content"
                        value={`Class ${seatingFormData.classNumber}`}
                        disabled
                      />
                    </div>

                    {/* Section dropdown */}
                    <div className="form-control flex-1 min-w-0">
                      <label className="label">
                        <span className="label-text text-xs sm:text-sm md:text-base text-base-content">Section</span>
                      </label>
                      <select
                        className="select select-bordered select-sm sm:select-md w-full text-base-content"
                        required
                        name="sectionId"
                        value={seatingFormData.sectionId}
                        onChange={handleSeatingInputChange}
                      >
                        <option value="" disabled className="text-base-content">Select section</option>
                        {isLoadingSubjectSections ? (
                          <option disabled className="text-base-content">Loading sections...</option>
                        ) : subjectSections.length === 0 ? (
                          <option disabled className="text-base-content">No sections have students enrolled in this subject</option>
                        ) : (
                          subjectSections.map((section: any) => (
                            <option key={section._id} value={section._id} className="text-base-content">
                              {section.section}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Auto-assign button */}
                  {seatingFormData.sectionId && (
                    <div className="flex justify-center mt-2">
                      <Button
                        type="button"
                        variant='secondary'
                        outline
                        className="btn-sm sm:btn-md w-full sm:w-auto max-w-xs"
                        onClick={autoAssignRooms}
                        disabled={isLoadingRooms || rooms.length === 0}
                      >
                        {isLoadingRooms ? (
                          <span className="loading loading-spinner loading-xs mr-1"></span>
                        ) : (
                          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                        <span className="text-xs sm:text-sm">Auto-Assign Class</span>
                      </Button>
                    </div>
                  )}

                  {/* Venue Details Section */}
                  <div className="divider mt-2 mb-0 text-xs sm:text-sm md:text-base text-base-content font-medium">Venue Details</div>

                  {seatingFormData.venueDetails.map((venue, index) => (
                    <div key={index} className="bg-base-50 border border-base-content/80 rounded-lg p-3 sm:p-4 md:p-5 mt-3">
                      {/* Header with remove button for additional venues */}
                      {index > 0 && (
                        <div className="flex justify-end items-center mb-3">
                          <button
                            type="button"
                            onClick={() => removeVenueDetail(index)}
                            className="btn btn-xs sm:btn-sm btn-ghost text-error hover:bg-error/10"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="hidden sm:inline ml-1">Remove</span>
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
                        {/* Room selection */}
                        <div className="form-control sm:col-span-2 lg:col-span-1">
                          <label className="label">
                            <span className="label-text text-xs sm:text-sm md:text-base text-base-content">Classroom</span>
                          </label>
                          <select
                            className="select select-bordered select-sm sm:select-md w-full text-base-content"
                            required
                            value={venue.roomId}
                            onChange={(e) => handleVenueDetailChange(index, 'roomId', e.target.value)}
                          >
                            <option value="" disabled className="text-base-content">Select room</option>
                            {isLoadingRooms ? (
                              <option disabled className="text-base-content">Loading rooms...</option>
                            ) : (
                              rooms.map((room: any) => (
                                <option
                                  key={room._id}
                                  value={room._id}
                                  className="text-base-content"
                                >
                                  {room.room}
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        {/* Start Roll Number */}
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text text-xs sm:text-sm md:text-base text-base-content">Start Roll No.</span>
                          </label>
                          <input
                            type="number"
                            className="input input-bordered input-sm sm:input-md text-base-content"
                            required
                            min="1"
                            placeholder="From"
                            value={venue.startRollNo}
                            onChange={(e) => handleVenueDetailChange(index, 'startRollNo', e.target.value)}
                          />
                        </div>

                        {/* End Roll Number */}
                        <div className="form-control">
                          <label className="label">
                            <span className="label-text text-xs sm:text-sm md:text-base text-base-content">End Roll No.</span>
                          </label>
                          <input
                            type="number"
                            className="input input-bordered input-sm sm:input-md text-base-content"
                            required
                            min="1"
                            placeholder="To"
                            value={venue.endRollNo}
                            onChange={(e) => handleVenueDetailChange(index, 'endRollNo', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 border-t border-base-300">
                    <Button
                      type="button"
                      variant="error"
                      outline
                      className="w-full sm:w-auto order-2 sm:order-1 btn-sm sm:btn-md"
                      onClick={() => setIsSeatingModalOpen(false)}
                    >
                      <span className="text-xs sm:text-sm">Cancel</span>
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      outline
                      disabled={isSubmitting}
                      className="w-full sm:w-auto order-1 sm:order-2 btn-sm sm:btn-md"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="loading loading-spinner loading-xs mr-1 sm:mr-2"></span>
                          <span className="text-xs sm:text-sm">Saving...</span>
                        </>
                      ) : (
                        <span className="text-xs sm:text-sm">Save Arrangement</span>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room List Modal */}
      {showRoomListModal && roomSeatingData && (
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
              setShowRoomListModal(false);
            }
          }}
        >
          <div
            className="bg-base-100 rounded-lg shadow-2xl w-full h-full 
                     xs:w-[calc(100%-1rem)] xs:h-[calc(100%-1rem)] xs:rounded-lg xs:m-2
                     sm:w-[calc(100%-2rem)] sm:h-[calc(100%-2rem)] sm:rounded-xl sm:m-4 
                     md:w-[calc(100%-4rem)] md:h-[calc(100%-4rem)] md:rounded-2xl md:m-6
                     lg:w-[calc(100%-6rem)] lg:h-[calc(100%-6rem)] lg:rounded-2xl lg:m-8
                     xl:max-w-7xl xl:h-[calc(100%-8rem)] xl:rounded-3xl
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
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <h2 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl 
                                   font-bold text-base-content leading-tight break-words">
                        {(() => {
                          const classes = Array.from(new Set(roomSeatingData.seatingPlans.flatMap((room: any) =>
                            room.seatingPlan.map((seat: any) => seat.classNumber)
                          ))).sort();
                          return classes.length > 1
                            ? `${roomSeatingData.subjectName} : Classes ${classes.join(', ')} Seating Arrangement`
                            : `${roomSeatingData.subjectName} : Class ${classes[0]} Seating Arrangement`;
                        })()}
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      outline
                      variant="primary"
                      onClick={handlePrintRoomSeating}
                      className="flex items-center gap-1 sm:gap-2"
                    >
                      <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline text-xs sm:text-sm">Print</span>
                    </Button>
                    <Button
                      outline
                      variant='error'
                      onClick={() => setShowRoomListModal(false)}
                    >
                      <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold">×</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto w-full
                            p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 xl:p-7 bg-base-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 
                              gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7 
                              w-full max-w-full items-start">
                  {roomSeatingData.seatingPlans.map((roomPlan: any) => {
                    // Process seating plan to get class-section summaries
                    const classSectionSummary: {
                      [key: string]: {
                        classNumber: string;
                        section: string;
                        rollNumbers: number[];
                        position: string;
                        minRoll?: number;
                        maxRoll?: number;
                        totalStudents?: number;
                      }
                    } = {};

                    roomPlan.seatingPlan.forEach((seat: any) => {
                      const key = `${seat.classNumber}-${seat.section}`;
                      if (!classSectionSummary[key]) {
                        classSectionSummary[key] = {
                          classNumber: seat.classNumber,
                          section: seat.section,
                          rollNumbers: [],
                          position: seat.position
                        };
                      }
                      classSectionSummary[key].rollNumbers.push(seat.rollNumber);
                    });

                    // Sort and get min/max for each class-section
                    Object.keys(classSectionSummary).forEach(key => {
                      classSectionSummary[key].rollNumbers.sort((a: number, b: number) => a - b);
                      classSectionSummary[key].minRoll = Math.min(...classSectionSummary[key].rollNumbers);
                      classSectionSummary[key].maxRoll = Math.max(...classSectionSummary[key].rollNumbers);
                      classSectionSummary[key].totalStudents = classSectionSummary[key].rollNumbers.length;
                    });

                    return (
                      <div
                        key={roomPlan._id}
                        className="card bg-base-200 shadow-md hover:bg-base-300/50 transition-colors cursor-pointer border border-base-300 rounded-lg flex flex-col h-fit"
                        onClick={() => handleRoomSelection(roomPlan)}
                      >
                        <div className="card-body p-2 sm:p-3 md:p-4">
                          {/* Room Header */}
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <h3 className="card-title text-sm sm:text-base md:text-lg text-base-content truncate">
                              Classroom {roomPlan.roomId.room}
                            </h3>
                            <div className="badge badge-neutral badge-sm sm:badge-md md:badge-lg flex-shrink-0 ml-2">
                              <span className="sm:inline">{roomPlan.seatingPlan.length} total</span>
                            </div>
                          </div>

                          {/* Class-Section Details */}
                          <div className="mb-3 sm:mb-4">
                            <p className="text-xs sm:text-sm font-medium text-base-content/70 mb-2 sm:mb-3">Class & Section Seating:</p>
                            <div className="space-y-1 sm:space-y-2">
                              {Object.values(classSectionSummary).map((summary: any, idx) => {
                                // Generate unique colors for any class-section combination (handles strings like "CS-1", "12", etc.)
                                const getClassSectionColor = (classNum: string, section: string): string => {
                                  const classColors = [
                                    'bg-red-100 text-red-800 border-red-200',
                                    'bg-blue-100 text-blue-800 border-blue-200',
                                    'bg-green-100 text-green-800 border-green-200',
                                    'bg-yellow-100 text-yellow-800 border-yellow-200',
                                    'bg-purple-100 text-purple-800 border-purple-200',
                                    'bg-pink-100 text-pink-800 border-pink-200',
                                    'bg-indigo-100 text-indigo-800 border-indigo-200',
                                    'bg-orange-100 text-orange-800 border-orange-200',
                                    'bg-cyan-100 text-cyan-800 border-cyan-200',
                                    'bg-teal-100 text-teal-800 border-teal-200',
                                    'bg-rose-100 text-rose-800 border-rose-200',
                                    'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  ];

                                  // Better hash function that works well for both numeric and string inputs
                                  const getBetterHash = (str: string) => {
                                    // If it's a pure number, use a simple offset approach
                                    if (/^\d+$/.test(str)) {
                                      return parseInt(str) * 7 + 3; // Multiply by prime and add offset for better distribution
                                    }

                                    // For strings, use a more robust hash
                                    let hash = 5381; // DJB2 hash algorithm
                                    for (let i = 0; i < str.length; i++) {
                                      hash = ((hash << 5) + hash) + str.charCodeAt(i);
                                    }
                                    return Math.abs(hash);
                                  };

                                  const classHash = getBetterHash(classNum);
                                  const classIndex = classHash % classColors.length;
                                  return classColors[classIndex];
                                };
                                const colorClass = getClassSectionColor(summary.classNumber, summary.section);

                                return (
                                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-1.5 sm:p-2 rounded-lg bg-base-100 border border-base-300 gap-1 sm:gap-2">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <div className={`badge ${colorClass} badge-xs sm:badge-sm md:badge-md font-medium text-xs sm:text-sm`}>
                                        Class {summary.classNumber} - {summary.section}
                                      </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                      <div className="text-xs sm:text-sm font-semibold text-base-content">
                                        Roll No. {summary.minRoll} - {summary.maxRoll}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* View Button */}
                          <div className="card-actions justify-end mt-2 sm:mt-3">
                            <Button
                              variant="primary"
                              outline
                              className="btn-xs sm:btn-sm w-full text-xs sm:text-sm"
                            >
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              <span className="sm:inline">View Seating Plan</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seating Arrangement Modal */}
      <SeatingArrangementModal
        isOpen={showSeatingModal}
        onClose={() => {
          setShowSeatingModal(false);
          setSelectedRoomData(null);
          setShowRoomListModal(true); // Reopen the room list modal
        }}
        seatingPlanData={seatingArrangementData}
      />

      {isLoadingSeatingModal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-40">
          <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
          <span className="text-base-content">Fetching class and room details</span>
        </div>
      )}
      {isLoadingStudents && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-40">
          <Image width={100} height={100} src={bookLoader1} unoptimized={true} alt="Loading" className="w-16 h-16 mx-auto mb-6" />
          <span className="text-base-content">Fetching student details</span>
        </div>
      )}

      {/* Add Event Modal */}
      {isAddEventModalOpen && (
        <>
          {/* Full page backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 animate-in fade-in duration-200"
            onClick={cancelEventCreation}
          />

          {/* Modal container positioned below navbar and beside sidebar */}
          <div
            className="fixed bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200 p-2 sm:p-4"
            style={{
              top: '4rem', // Account for navbar height (64px)
              left: isExpanded ? '16rem' : '4rem', // Account for sidebar width
              right: '0',
              bottom: '0'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                cancelEventCreation();
              }
            }}
          >
            <div
              className="bg-base-100 rounded-lg shadow-2xl border border-base-content/20
                       w-[calc(100%-0.5rem)] h-[calc(100%-1rem)] max-h-[95vh] max-w-[98vw] mx-1 my-2
                       xs:w-[calc(100%-1rem)] xs:h-[calc(100%-1.5rem)] xs:max-h-[92vh] xs:rounded-lg xs:m-3
                       sm:w-[calc(100%-2rem)] sm:h-[calc(100%-2rem)] sm:max-h-[88vh] sm:rounded-xl sm:m-4 sm:max-w-[92vw]
                       md:w-[calc(100%-3rem)] md:h-[calc(100%-2.5rem)] md:max-h-[85vh] md:rounded-2xl md:max-w-4xl
                       lg:w-[calc(100%-4rem)] lg:h-[calc(100%-3rem)] lg:max-h-[80vh] lg:rounded-2xl lg:max-w-5xl
                       xl:max-w-6xl xl:h-[calc(100%-3rem)] xl:max-h-[75vh] xl:rounded-3xl
                       2xl:max-w-7xl 2xl:max-h-[70vh]
                       overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="sticky top-0 bg-base-200 border-b border-base-content/20 px-2 sm:px-4 py-2 sm:py-3 z-10">
                  <div className="flex justify-between items-center gap-2 p-1 sm:p-2">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-base-content truncate pr-2">
                      Add New Event
                    </h3>
                    <Button
                      outline
                      variant="error"
                      onClick={cancelEventCreation}
                    >
                      <span className="text-lg font-bold">×</span>
                    </Button>
                  </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-4">
                  <div className="card bg-base-300 border border-base-content/20 shadow-xl">
                    <div className="card-body p-3 sm:p-4 lg:p-6">
                      <form onSubmit={handleEventSubmit} className="space-y-3 sm:space-y-4 lg:space-y-6" noValidate>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                          {/* Event Name */}
                          <div className="form-control w-full">
                            <label className="label">
                              <span className="label-text text-base-content">Event Name <span className="text-error">*</span></span>
                            </label>
                            <input
                              type="text"
                              value={eventFormData.name}
                              onChange={(e) => setEventFormData(prev => ({ ...prev, name: e.target.value }))}
                              className={`input input-bordered w-full bg-base-100 text-base-content ${eventFormErrors.name ? 'input-error' : ''}`}
                              placeholder="Enter event name"
                              maxLength={80}
                              required
                            />
                            <div className="flex justify-between items-center">
                              {eventFormErrors.name && (
                                <label className="label">
                                  <span className="label-text-alt text-error">{eventFormErrors.name}</span>
                                </label>
                              )}
                              <span className="text-xs text-base-content/60 ml-auto">
                                {eventFormData.name.length}/80
                              </span>
                            </div>
                          </div>

                          {/* Event Summary */}
                          <div className="form-control w-full">
                            <label className="label">
                              <span className="label-text text-base-content">Event Summary <span className="text-error">*</span></span>
                            </label>
                            <input
                              type="text"
                              value={eventFormData.summary}
                              onChange={(e) => setEventFormData(prev => ({ ...prev, summary: e.target.value }))}
                              className={`input input-bordered w-full bg-base-100 text-base-content ${eventFormErrors.summary ? 'input-error' : ''}`}
                              placeholder="Brief description of the event"
                              maxLength={200}
                              required
                            />
                            <div className="flex justify-between items-center">
                              {eventFormErrors.summary && (
                                <label className="label">
                                  <span className="label-text-alt text-error">{eventFormErrors.summary}</span>
                                </label>
                              )}
                              <span className="text-xs text-base-content/60 ml-auto">
                                {eventFormData.summary.length}/200
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="form-control w-full">
                          <label className="label">
                            <span className="label-text text-base-content">Event Details</span>
                          </label>
                          <textarea
                            value={eventFormData.details}
                            onChange={(e) => setEventFormData(prev => ({ ...prev, details: e.target.value }))}
                            className="textarea textarea-bordered w-full bg-base-100 text-base-content resize-none"
                            rows={3}
                            placeholder="Detailed description of the event (optional)"
                            maxLength={350}
                          />
                          <div className="flex justify-end">
                            <span className="text-xs text-base-content/60">
                              {eventFormData.details.length}/350
                            </span>
                          </div>
                        </div>



                        {/* Additional Photos */}
                        <div className="form-control w-full">
                          <label className="label">
                            <span className="label-text text-base-content">
                              Event Photos ({photoPreviews.length}/3)
                              {photoPreviews.length < 3 && (
                                <span className="text-base-content/60 ml-2">
                                  - {3 - photoPreviews.length} slot(s) remaining
                                </span>
                              )}
                            </span>
                          </label>
                          <div className="space-y-4">
                            {/* Photo Previews */}
                            {photoPreviews.length > 0 && (
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-sm font-medium text-base-content/70">
                                    {photoPreviews.length} photo(s) uploaded
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={removeAllPhotos}
                                    className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                                  >
                                    Remove All
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {photoPreviews.map((preview, index) => (
                                    <div key={index} className="relative">
                                      <img
                                        src={preview}
                                        alt={`Event photo ${index + 1} preview`}
                                        className="w-full h-24 object-cover rounded-lg border border-base-300"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removePhoto(index)}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                                      >
                                        ×
                                      </button>
                                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                        {index + 1}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Upload Button */}
                            {photoPreviews.length < 3 && (
                              <div>
                                <input
                                  ref={photosInputRef}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handlePhotosUpload}
                                  className="hidden"
                                  id="photos-upload"
                                />
                                <label
                                  htmlFor="photos-upload"
                                  className={`btn btn-outline gap-2 w-full ${uploadingPhotos ? 'loading' : ''}`}
                                >
                                  {uploadingPhotos ? (
                                    'Uploading...'
                                  ) : (
                                    <>
                                      <Plus className="w-4 h-4" />
                                      {photoPreviews.length === 0
                                        ? 'Add Photos (up to 3)'
                                        : `Add More Photos (${3 - photoPreviews.length} remaining)`
                                      }
                                    </>
                                  )}
                                </label>
                                <div className="label">
                                  <span className="label-text-alt text-base-content/60">
                                    Upload one at a time or select multiple. Supported formats: JPG, PNG, GIF (max 5MB per photo)
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Date Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                          {/* Start Date */}
                          <div className="form-control w-full">
                            <label className="label">
                              <span className="label-text text-base-content">Start Date <span className="text-error">*</span></span>
                            </label>
                            <input
                              type="datetime-local"
                              value={eventFormData.startDate}
                              onChange={(e) => setEventFormData(prev => ({ ...prev, startDate: e.target.value }))}
                              className={`input input-bordered w-full bg-base-100 text-base-content ${eventFormErrors.startDate ? 'input-error' : ''}`}
                              min={new Date().toISOString().slice(0, 16)}
                              required
                            />
                            {eventFormErrors.startDate && (
                              <label className="label">
                                <span className="label-text-alt text-error">{eventFormErrors.startDate}</span>
                              </label>
                            )}
                          </div>

                          {/* End Date */}
                          <div className="form-control w-full">
                            <label className="label">
                              <span className="label-text text-base-content">End Date</span>
                            </label>
                            <input
                              type="datetime-local"
                              value={eventFormData.endDate}
                              onChange={(e) => setEventFormData(prev => ({ ...prev, endDate: e.target.value }))}
                              className={`input input-bordered w-full bg-base-100 text-base-content ${eventFormErrors.endDate ? 'input-error' : ''}`}
                            />
                            {eventFormErrors.endDate && (
                              <label className="label">
                                <span className="label-text-alt text-error">{eventFormErrors.endDate}</span>
                              </label>
                            )}
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-base-200 border-t border-base-content/20 px-2 sm:px-4 py-2 sm:py-3">
                  <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 lg:gap-4">
                    <Button
                      type="button"
                      variant="error"
                      outline
                      onClick={cancelEventCreation}
                      disabled={isCreatingEvent}
                      className="w-full sm:w-auto order-2 sm:order-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      outline
                      onClick={handleEventSubmit}
                      disabled={isCreatingEvent}
                      className="w-full sm:w-auto order-1 sm:order-2 min-w-[120px]"
                    >
                      {isCreatingEvent ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Creating...
                        </div>
                      ) : (
                        'Create Event'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Enhanced Event View Modal */}
      {isEventViewModalOpen && selectedEvent && (
        <>
          {/* Full page backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 animate-in fade-in duration-200"
            onClick={() => closeEventViewModal()}
          />

          {/* Modal container positioned below navbar and beside sidebar */}
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
                closeEventViewModal();
              }
            }}
          >
            <div
              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl 
                         w-[calc(100%-0.5rem)] h-[calc(100%-1rem)] max-h-[95vh] max-w-[98vw] mx-1 my-2
                         xs:w-[calc(100%-1rem)] xs:h-[calc(100%-1.5rem)] xs:max-h-[92vh] xs:rounded-lg xs:m-3
                         sm:w-[calc(100%-2rem)] sm:h-[calc(100%-2rem)] sm:max-h-[88vh] sm:rounded-xl sm:m-4 sm:max-w-[92vw]
                         md:w-[calc(100%-3rem)] md:h-[calc(100%-2.5rem)] md:max-h-[85vh] md:rounded-2xl md:max-w-4xl
                         lg:w-[calc(100%-4rem)] lg:h-[calc(100%-3rem)] lg:max-h-[80vh] lg:rounded-2xl lg:max-w-5xl
                         xl:max-w-6xl xl:h-[calc(100%-3rem)] xl:max-h-[75vh] xl:rounded-3xl
                         2xl:max-w-7xl 2xl:max-h-[70vh]
                         overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full">
                {/* Hero Section with Photos */}
                {(selectedEvent.photo1 || selectedEvent.photo2 || selectedEvent.photo3) ? (
                  <div className="relative h-64 bg-gradient-to-r from-blue-600 to-purple-600 overflow-hidden">
                    {/* Background Photos Collage */}
                    <div className="absolute inset-0 flex">
                      {selectedEvent.photo1 && (
                        <div className="flex-1 relative">
                          <img
                            src={selectedEvent.photo1}
                            alt={`${selectedEvent.name} photo 1`}
                            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md';
                              modal.innerHTML = `
                                <div class="relative max-w-6xl max-h-[90vh] p-4">
                                  <img src="${selectedEvent.photo1}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                                  <button class="absolute top-2 right-2 w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-white/30 transition-colors" onclick="this.parentElement.parentElement.remove()">×</button>
                                </div>
                              `;
                              modal.addEventListener('click', (e) => {
                                if (e.target === modal) modal.remove();
                              });
                              document.body.appendChild(modal);
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20"></div>
                        </div>
                      )}
                      {selectedEvent.photo2 && (
                        <div className="flex-1 relative">
                          <img
                            src={selectedEvent.photo2}
                            alt={`${selectedEvent.name} photo 2`}
                            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md';
                              modal.innerHTML = `
                                <div class="relative max-w-6xl max-h-[90vh] p-4">
                                  <img src="${selectedEvent.photo2}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                                  <button class="absolute top-2 right-2 w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-white/30 transition-colors" onclick="this.parentElement.parentElement.remove()">×</button>
                                </div>
                              `;
                              modal.addEventListener('click', (e) => {
                                if (e.target === modal) modal.remove();
                              });
                              document.body.appendChild(modal);
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-black/20"></div>
                        </div>
                      )}
                      {selectedEvent.photo3 && (
                        <div className="flex-1 relative">
                          <img
                            src={selectedEvent.photo3}
                            alt={`${selectedEvent.name} photo 3`}
                            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md';
                              modal.innerHTML = `
                                <div class="relative max-w-6xl max-h-[90vh] p-4">
                                  <img src="${selectedEvent.photo3}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                                  <button class="absolute top-2 right-2 w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-white/30 transition-colors" onclick="this.parentElement.parentElement.remove()">×</button>
                                </div>
                              `;
                              modal.addEventListener('click', (e) => {
                                if (e.target === modal) modal.remove();
                              });
                              document.body.appendChild(modal);
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/20"></div>
                        </div>
                      )}
                    </div>

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                    {/* Action buttons */}
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                      {!isEventInPast(selectedEvent) && !isEditMode && (
                        <Button
                          variant="primary"
                          outline
                          size="sm"
                          className="w-10 h-10 bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-blue-500/50 transition-colors rounded-full"
                          onClick={() => startEditMode(selectedEvent)}
                          title="Edit Event"
                        >
                          <PenIcon className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="error"
                        outline
                        size="sm"
                        onClick={closeEventViewModal}
                        className="w-10 h-10 bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-red-500/50 transition-colors rounded-full"
                      >
                        <span className="text-lg font-bold">×</span>
                      </Button>
                    </div>

                    {/* Title Overlay */}
                    <div className="absolute bottom-6 left-6 right-6 text-white">
                      <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">
                        {selectedEvent.name}
                      </h2>
                      <div className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        {selectedEvent.startDate ? new Date(selectedEvent.startDate).toLocaleDateString() : 'No date set'}
                        {selectedEvent.endDate && ` - ${new Date(selectedEvent.endDate).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Header without photos */
                  <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 flex-shrink-0">
                    {/* Action buttons */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      {!isEventInPast(selectedEvent) && !isEditMode && (
                        <button
                          onClick={() => startEditMode(selectedEvent)}
                          className="w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-blue-500/50 transition-colors"
                          title="Edit Event"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          closeEventViewModal();
                          cancelEditMode();
                        }}
                        className="w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                      >
                        <span className="text-lg font-bold">×</span>
                      </button>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2 pr-12">
                      {selectedEvent.name}
                    </h2>
                    <div className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      {selectedEvent.startDate ? new Date(selectedEvent.startDate).toLocaleDateString() : 'No date set'}
                      {selectedEvent.endDate && ` - ${new Date(selectedEvent.endDate).toLocaleDateString()}`}
                    </div>
                  </div>
                )}

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                  {isEditMode ? (
                    /* Edit Mode - Form */
                    <form onSubmit={handleEditEventSubmit} className="space-y-6">
                      {/* Event Name */}
                      <div>
                        <label htmlFor="edit-event-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Event Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="edit-event-name"
                          type="text"
                          value={editEventFormData.name}
                          onChange={(e) => setEditEventFormData((prev: any) => ({ ...prev, name: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white ${editEventFormErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                          placeholder="Enter event name"
                          maxLength={80}
                        />
                        <div className="flex justify-between items-center mt-1">
                          {editEventFormErrors.name && (
                            <p className="text-red-500 text-sm">{editEventFormErrors.name}</p>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                            {editEventFormData.name.length}/80
                          </span>
                        </div>
                      </div>

                      {/* Event Summary */}
                      <div>
                        <label htmlFor="edit-event-summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Summary <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="edit-event-summary"
                          value={editEventFormData.summary}
                          onChange={(e) => setEditEventFormData((prev: any) => ({ ...prev, summary: e.target.value }))}
                          rows={3}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none dark:bg-gray-800 dark:border-gray-600 dark:text-white ${editEventFormErrors.summary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                          placeholder="Enter event summary"
                          maxLength={200}
                        />
                        <div className="flex justify-between items-center mt-1">
                          {editEventFormErrors.summary && (
                            <p className="text-red-500 text-sm">{editEventFormErrors.summary}</p>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                            {editEventFormData.summary.length}/200
                          </span>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div>
                        <label htmlFor="edit-event-details" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Details
                        </label>
                        <textarea
                          id="edit-event-details"
                          value={editEventFormData.details}
                          onChange={(e) => setEditEventFormData((prev: any) => ({ ...prev, details: e.target.value }))}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none dark:bg-gray-800 dark:text-white"
                          placeholder="Enter event details (optional)"
                          maxLength={350}
                        />
                        <div className="flex justify-end mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {editEventFormData.details.length}/350
                          </span>
                        </div>
                      </div>

                      {/* Date Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="edit-start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Start Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="edit-start-date"
                            type="date"
                            value={editEventFormData.startDate}
                            onChange={(e) => setEditEventFormData((prev: any) => ({ ...prev, startDate: e.target.value }))}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white ${editEventFormErrors.startDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                              }`}
                            min={new Date().toISOString().slice(0, 10)}
                          />
                          {editEventFormErrors.startDate && (
                            <p className="text-red-500 text-sm mt-1">{editEventFormErrors.startDate}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="edit-end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            End Date
                          </label>
                          <input
                            id="edit-end-date"
                            type="date"
                            value={editEventFormData.endDate}
                            onChange={(e) => setEditEventFormData((prev: any) => ({ ...prev, endDate: e.target.value }))}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white ${editEventFormErrors.endDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                              }`}
                          />
                          {editEventFormErrors.endDate && (
                            <p className="text-red-500 text-sm mt-1">{editEventFormErrors.endDate}</p>
                          )}
                        </div>
                      </div>

                      {/* Photos Section */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Event Photos (Optional) - Max 3 photos
                        </label>

                        {/* Current Photos Display */}
                        {editPhotoPreviews.length > 0 && (
                          <div className="mb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              {editPhotoPreviews.map((preview, index) => (
                                <div key={index} className="relative group">
                                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                                    <img
                                      src={preview}
                                      alt={`Event photo ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                                      <button
                                        type="button"
                                        onClick={() => removeEditPhoto(index)}
                                        className="bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                                        title={`Remove photo ${index + 1}`}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                                    Photo {index + 1}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* Remove All Photos Button */}
                            {editPhotoPreviews.length > 1 && (
                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={removeAllEditPhotos}
                                  className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                                >
                                  Remove All Photos ({editPhotoPreviews.length})
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Photo Upload Section */}
                        {editPhotoPreviews.length < 3 && (
                          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                            <div className="text-center">
                              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <div className="mb-4">
                                <label htmlFor="edit-photos-upload" className="cursor-pointer">
                                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                                    {uploadingEditPhotos ? 'Processing photos...' : 'Click to upload photos'}
                                  </span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                                    or drag and drop
                                  </span>
                                  <input
                                    id="edit-photos-upload"
                                    ref={editPhotosInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleEditPhotosUpload}
                                    disabled={uploadingEditPhotos}
                                    className="sr-only"
                                  />
                                </label>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                PNG, JPG, GIF up to 5MB each. You can add {3 - editPhotoPreviews.length} more photo{3 - editPhotoPreviews.length !== 1 ? 's' : ''}.
                              </p>
                              {uploadingEditPhotos && (
                                <div className="mt-3">
                                  <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-blue-500 hover:bg-blue-400 transition ease-in-out duration-150">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Max photos reached message */}
                        {editPhotoPreviews.length >= 3 && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              Maximum of 3 photos reached. Remove a photo to add a new one.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 justify-end">
                        <Button
                          variant="error"
                          outline
                          type="button"
                          onClick={cancelEditMode}
                          disabled={isUpdatingEvent}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          outline
                          type="submit"
                          disabled={isUpdatingEvent}
                        >
                          {isUpdatingEvent ? 'Updating...' : 'Update Event'}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    /* View Mode - Display */
                    <div className="space-y-6">
                      {/* Event Summary */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border-l-4 border-blue-500">
                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">{selectedEvent.summary}</h3>
                      </div>

                      {/* Event Details */}
                      {selectedEvent.details && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border-l-4 border-purple-500">
                          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3">{selectedEvent.details}</h3>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarPage;