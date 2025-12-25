'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { useRouter } from 'next/navigation';
import { useSidebarStore } from '../store/useSidebarStore';
import { UserRole, roleAccess } from '@/lib/role';
import toast from 'react-hot-toast';
import { useTheme } from 'next-themes';
import { authService } from '@/lib/auth-service';
const lucideReact = require('lucide-react');
import Image from 'next/image';
import pencil from '@/public/pencil.gif';
const Sidebar = () => {
  const router = useRouter();
  const { isExpanded, toggleSidebar, organizationName, setOrganizationName } = useSidebarStore();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [currentPath, setCurrentPath] = useState('');
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [logoAnimation, setLogoAnimation] = useState('');

  useEffect(() => {
    setMounted(true);
    setCurrentPath(window.location.pathname);

    // Get data from localStorage (safely, in case of SSR)
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        router.push('/login');
      } else if (!userId) {
        const decodedPayload = JSON.parse(atob(storedToken.split('.')[1]));
        setUserRole(decodedPayload.role as UserRole);
        setUserName(decodedPayload.name);
        setUserEmail(decodedPayload.email);
        setUserId(decodedPayload.id);

        // Fetch organization name directly if clientOrganizationId is in token
        if (decodedPayload.clientOrganizationId) {
          fetch(`/api/client-organization?clientOrgId=${decodedPayload.clientOrganizationId}`)
            .then(response => {
              if (response.ok) return response.json();
              throw new Error('Failed to fetch organization');
            })
            .then(clientOrgData => {
              const orgName = clientOrgData.organizationName || 
                            clientOrgData.organizationId?.organizationName || 
                            'Global international School';
              setOrganizationName(orgName);
            })
            .catch(error => {
              console.error('Failed to fetch organization from token:', error);
            });
        }

        // Fetch user profile to get profile image
        if (decodedPayload.id) {
          fetch(`/api/manage-staff?id=${decodedPayload.id}`)
            .then(response => {
              if (response.ok) return response.json();
              throw new Error('Failed to fetch profile');
            })
            .then(userData => {
              if (userData.profileImage) {
                setProfileImage(userData.profileImage);
              }
            })
            .catch(error => {
              toast.error('Failed to fetch profile image');
            });
        }
      }
    }
  }, [userId]);

  // Close the profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Listen for profile image updates
  useEffect(() => {
    const handleProfileImageUpdate = (event: CustomEvent) => {
      const { profileImage } = event.detail;
      setProfileImage(profileImage);
    };

    window.addEventListener('profile-image-updated', handleProfileImageUpdate as EventListener);
    return () => {
      window.removeEventListener('profile-image-updated', handleProfileImageUpdate as EventListener);
    };
  }, []);

  const toggleProfileMenu = () => {
    setShowProfileMenu(prev => !prev);
  };

  // Add logo animation when sidebar expands/collapses
  useEffect(() => {
    if (mounted) {
      if (isExpanded) {
        setLogoAnimation('sidebar-logo-bounce');
        // Clear animation after it completes
        setTimeout(() => setLogoAnimation(''), 600);
      } else {
        setLogoAnimation('sidebar-logo-spin');
        // Clear animation after it completes
        setTimeout(() => setLogoAnimation(''), 400);
      }
    }
  }, [isExpanded, mounted]);

  const handleLogout = () => {
    // Stop auth service
    authService.stop();
    
    localStorage.removeItem('token');
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.dispatchEvent(new Event('auth-change'));
    router.push('/login');
  };

  const handleProfileClick = () => {
    router.push('/profile');
    setShowProfileMenu(false);
  };

  const canAccessRoute = (route: string): boolean => {
    if (!userRole) return false;
    const access = roleAccess.find(r => r.role === userRole);
    return access ? access.routes.includes(route) : false;
  };

  useEffect(() => {
    const updateScrollIndicators = () => {
      const scrollElement = scrollRef.current;
      if (!scrollElement) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const buffer = 5; // Reduced buffer for more sensitive detection

      const hasScrollUp = scrollTop > buffer;
      const hasScrollDown = scrollTop < scrollHeight - clientHeight - buffer;

      setShowScrollUp(hasScrollUp);
      setShowScrollDown(hasScrollDown);
    };

    const scrollElement = scrollRef.current;

    if (scrollElement) {
      // Add scroll event listener
      scrollElement.addEventListener('scroll', updateScrollIndicators, { passive: true });
      
      // Enhanced detection with multiple checks
      const performChecks = () => {
        updateScrollIndicators();
        // Check after DOM updates
        setTimeout(updateScrollIndicators, 100);
        // Check after layout is complete
        requestAnimationFrame(() => {
          setTimeout(updateScrollIndicators, 50);
        });
      };
      
      // Initial checks
      performChecks();
      
      // Check after any potential layout changes
      const observer = new MutationObserver(performChecks);
      observer.observe(scrollElement, { 
        childList: true, 
        subtree: true, 
        attributes: true 
      });
      
      // Also check on window resize
      const handleResize = () => {
        setTimeout(performChecks, 150);
      };
      window.addEventListener('resize', handleResize);
      
      // Check when sidebar expands/collapses
      const checkOnSidebarChange = () => {
        setTimeout(performChecks, 200);
      };
      
      return () => {
        scrollElement.removeEventListener('scroll', updateScrollIndicators);
        observer.disconnect();
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isExpanded]); // Added isExpanded dependency

  // Trigger scroll check when sidebar expands/collapses
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      const updateScrollIndicators = () => {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const buffer = 5;
        
        setShowScrollUp(scrollTop > buffer);
        setShowScrollDown(scrollTop < scrollHeight - clientHeight - buffer);
      };
      
      // Check after sidebar animation completes
      setTimeout(updateScrollIndicators, 250);
    }
  }, [isExpanded]);

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setCurrentPath(path);
  };

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <div>
      {/* Sidebar - Fixed with specific height for all screen sizes */}
      <div className={`fixed top-0 left-0 flex flex-col ${isExpanded ? 'w-64' : 'w-16'} h-[100vh] ${resolvedTheme === 'light' ? 'bg-blue-100' : 'bg-black'} transition-all duration-200 ease-in-out z-[1000]`}>
        {/* Logo and Expander Button - Fixed at the top */}
        <div className="py-3 border-b border-base-100 flex-shrink-0">
          {isExpanded ? (
            /* Expanded Layout */
            <div className="flex items-center justify-between">
              {/* Logo */}
              <button
                className="flex items-center hover:opacity-90 transition-all duration-200"
                title="Home"
              >
                <Image 
                  width={100}
                  height={100}
                  src={pencil} 
                  alt="App logo" 
                  className={`h-10 w-auto transition-all duration-200 ${logoAnimation}`}
                  style={{ transform: 'scaleX(-1)' }}
                />
                <span className="text-sm font-bold text-primary sidebar-app-name sidebar-app-name-enter">
                  {organizationName}
                </span>
              </button>
              
              {/* Expander Button */}
              <button
                onClick={toggleSidebar}
                className="btn btn-sm btn-primary flex-shrink-0"
              >
                <lucideReact.ChevronLeft className="w-4 h-4 text-primary-content" />
              </button>
            </div>
          ) : (
            /* Collapsed Layout - Only Logo */
            <div className="flex justify-center items-center">
              <button
                className="hover:opacity-90 transition-all duration-200"
                title="Home"
              >
                <Image 
                  width={100}
                  height={100}
                  src={pencil} 
                  alt="App logo" 
                  className={`h-11 w-auto transition-all duration-200 ${logoAnimation}`}
                  style={{ transform: 'scaleX(-1)' }}
                />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content with Chevron Indicators */}
        <div className="flex-1 overflow-hidden relative min-h-0">
          {showScrollUp && (
            <div className="absolute top-0 left-0 right-0 flex justify-center z-20 bg-gradient-to-b from-base-100 to-transparent pt-1 pb-2 sidebar-scroll-indicator">
              <button onClick={scrollToTop} className="btn btn-circle btn-sm bg-base-100 shadow-lg border border-base-300 hover:bg-base-200">
                <lucideReact.ChevronUp className="w-4 h-4 text-primary" />
              </button>
            </div>
          )}
          <div ref={scrollRef} className="flex flex-col space-y-2 overflow-y-auto custom-scrollbar-sidebar h-full p-1" style={{ paddingTop: showScrollUp ? '2.5rem' : '0.25rem' }}>
            {canAccessRoute('/manage-admin') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Manage Admin" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/manage-admin' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/manage-admin')}
                  title={!isExpanded ? "Manage Admin" : ""}
                >
                  <lucideReact.UserRoundCog className='w-6  h-6 text-primary' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Manage Admin</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/dashboard') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Dashboard" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/dashboard' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/dashboard')}
                  title={!isExpanded ? "Dashboard" : ""}
                >
                  <lucideReact.ChartColumnStacked className='w-6 h-6 text-[#9d057bfc]' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Dashboard</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/manage-staff') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Manage Staff" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/manage-staff' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/manage-staff')}
                  title={!isExpanded ? "Manage Staff" : ""}
                >
                  <lucideReact.Users className='w-6 h-6 text-primary' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Manage Staff</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/manage-student') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Manage Student" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/manage-student' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/manage-student')}
                  title={!isExpanded ? "Manage Student" : ""}
                >
                  <lucideReact.Contact className='w-6 h-6 text-[#2dad05]' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Manage Student</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/manage-course') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Manage Course" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/manage-course' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/manage-course')}
                  title={!isExpanded ? "Manage Course" : ""}
                >
                  <lucideReact.NotebookText className='w-6 h-6 text-[#af69ceed]' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Manage Course</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/manage-subject') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Manage Subject" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/manage-subject' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/manage-subject')}
                  title={!isExpanded ? "Manage Subject" : ""}
                >
                  <lucideReact.Library className='w-6 h-6 text-[#ef6f0a]' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Manage Subject</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/manage-fees') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Manage Fees" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/manage-fees' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/manage-fees')}
                  title={!isExpanded ? "Manage Fees" : ""}
                >
                  <lucideReact.HandCoins className='w-6 h-6 text-[#7fbc00]' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Manage Fees</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/attendance/add') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Manage Attendance" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/attendance/add' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/attendance/add')}
                  title={!isExpanded ? "Manage Attendance" : ""}
                >
                  <lucideReact.ListChecks className='w-6 h-6 text-[#d83cab]' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Manage Attendance</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/attendance') && userRole === UserRole.STUDENT && (
              <div className="tooltip tooltip-right relative w-full" data-tip="View Attendance" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/attendance' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/attendance')}
                  title={!isExpanded ? "View Attendance" : ""}
                >
                  <lucideReact.ListChecks className='w-6 h-6 text-secondary' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">View Attendance</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/manage-leave/add') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Manage Leave" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/manage-leave/add' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/manage-leave/add')}
                  title={!isExpanded ? "Manage Leave" : ""}
                >
                  <lucideReact.DoorOpen className='w-6 h-6 text-[#028e86]' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Manage Leave</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/manage-result/add') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Manage Result" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/manage-result/add' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/manage-result/add')}
                  title={!isExpanded ? "Manage Result" : ""}
                >
                  <lucideReact.GraduationCap className='w-6 h-6 text-[#8c76eb]' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Manage Result</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/manage-result') && userRole === UserRole.STUDENT && (
              <div className="tooltip tooltip-right relative w-full" data-tip="View Result" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/manage-result' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/manage-result')}
                  title={!isExpanded ? "Manage Result" : ""}
                >
                  <lucideReact.GraduationCap className='w-6 h-6 text-[#8c76eb]' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">View Result</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/calendar') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Exams & Holidays" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/calendar' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/calendar')}
                  title={!isExpanded ? "Exams & Holidays" : ""}
                >
                  <lucideReact.CalendarHeart className='w-6 h-6 text-[#c00202]' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Exams/Holidays</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/manage-transport') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Manage Transport" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/manage-transport' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/manage-transport')}
                  title={!isExpanded ? "Manage Transport" : ""}
                >
                  <lucideReact.Bus className='w-6 h-6 text-[#bbbb02fc]' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Manage Transport</span>}
                </button>
              </div>
            )}

            {canAccessRoute('/manage-marksheet') && (
              <div className="tooltip tooltip-right relative w-full" data-tip="Admit Card/Marksheet" style={{ position: 'static' }}>
                <button
                  className={`btn btn-ghost flex items-center justify-start w-full ${currentPath === '/manage-admitCard' ? 'btn-active' : ''}`}
                  onClick={() => handleNavigation('/manage-admitCard')}
                  title={!isExpanded ? "Admit Card/Marksheet" : ""}
                >
                  <lucideReact.FileText className='w-6 h-6 text-[#028e86]' />
                  {isExpanded && <span className="ml-2 text-base-content font-medium">Admit Card/Marksheet</span>}
                </button>
              </div>
            )}
          </div>
          {showScrollDown && (
            <div className="absolute bottom-0 left-0 right-0 flex justify-center z-20 bg-gradient-to-t from-base-100 to-transparent pt-2 pb-1 sidebar-scroll-indicator">
              <button onClick={scrollToBottom} className="btn btn-circle btn-sm bg-base-100 shadow-lg border border-base-300 hover:bg-base-200">
                <lucideReact.ChevronDown className="w-4 h-4 text-primary" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {isExpanded ? (
          <div className="p-4 border-t border-base-200 flex-shrink-0">
            <div className="relative" ref={profileMenuRef}>
              <Card
                className="shadow-sm border border-base-300 bg-base-100 dark:bg-base-100 dark:border-base-content/20 p-3 mb-3 cursor-pointer hover:bg-base-200 dark:hover:bg-base-200 transition-colors"
                onClick={toggleProfileMenu}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={profileImage || '/images/default-avatar.jpg'}
                    alt="User"
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-base-content">{userName || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </Card>
              {showProfileMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-full bg-base-100 rounded-md shadow-lg z-50 overflow-hidden border border-base-300" style={{ maxHeight: '150px' }}>
                  <ul className="py-1">
                    <li>
                      <button
                        onClick={handleProfileClick}
                        className="w-full text-left px-4 py-2 hover:bg-base-200 flex items-center text-base-content"
                      >
                        <lucideReact.User className="w-4 h-4 mr-2" />
                        Profile
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 hover:bg-base-200 flex items-center text-error"
                      >
                        <lucideReact.LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="join w-full">
              <button
                onClick={() => setTheme('light')}
                className={`join-item btn flex-1 transition-all duration-100 ${
                  theme === 'light' 
                    ? 'bg-blue-200 text-black border-blue-300 hover:bg-blue-300' 
                    : 'bg-blue-100 text-black border-blue-200 hover:bg-blue-200'
                }`}
              >
                <lucideReact.Sun className="w-5 h-5 mr-2" />
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`join-item btn flex-1 transition-all duration-100 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 text-white border-gray-600 hover:bg-gray-700' 
                    : 'bg-gray-700 text-white border-gray-600 hover:bg-gray-800'
                }`}
              >
                <lucideReact.Moon className="w-5 h-5 mr-2" />
                Dark
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-base-200 flex-shrink-0">
            <div className="flex flex-col items-center space-y-2">
              <div className="avatar tooltip tooltip-right relative" data-tip={userName || 'N/A'} ref={profileMenuRef}>
                <div
                  className="w-8 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 cursor-pointer hover:opacity-80 hover:ring-secondary transition-all duration-200"
                  onClick={toggleProfileMenu}
                >
                  <img src={profileImage || '/images/default-avatar.jpg'} alt="User" />
                </div>

                {showProfileMenu && (
                  <div className="fixed ml-2 bg-blue-100 dark:bg-black rounded-md shadow-lg z-[9999] w-32 overflow-hidden border border-base-300"
                    style={{
                      left: '4rem',
                      top: `${(profileMenuRef.current?.getBoundingClientRect().top || 0) - 50}px`,
                      maxHeight: '100px',
                    }}>
                    <ul className="py-1">
                      <li>
                        <button
                          onClick={handleProfileClick}
                          className="w-full text-left px-4 py-2 hover:bg-base-200 flex items-center text-base-content"
                        >
                          <lucideReact.User className="w-4 h-4 mr-2" />
                          Profile
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 hover:bg-base-200 flex items-center text-error"
                        >
                          <lucideReact.LogOut className="w-4 h-4 mr-2" />
                          Logout
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  const nextTheme = theme === 'light' ? 'dark' : 'light';
                  setTheme(nextTheme);
                }}
                className="btn btn-ghost btn-circle"
                title={`Current: ${theme || 'dark'} (click to cycle)`}
              >
                {theme === 'light' ? (
                  <lucideReact.Moon className="w-5 h-5 text-neutral" />
                ) : (
                  <lucideReact.Sun className="w-5 h-5 text-warning" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Expand Icon parallel to logo when collapsed */}
        {!isExpanded && (
          <div className="absolute top-[1.1rem] -right-5 p-1">
            <lucideReact.ChevronRight 
              className="w-6 h-6 text-primary cursor-pointer hover:scale-110 transition-transform duration-200"
              onClick={toggleSidebar}
              title="Expand sidebar"
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default Sidebar;