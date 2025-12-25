export enum UserRole {
  SUPER = 'SUPER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  STUDENT = 'STUDENT',
}

export interface UserRoleAccess {
  role: UserRole;
  routes: string[];
}

export const roleAccess: UserRoleAccess[] = [
  {
    role: UserRole.SUPER,
    routes: ['/manage-admin', '/manage-admin/add', '/api/manage-staff', '/api/clients', '/api/organizations', '/api/client-organization', '/profile', '/api/classes', '/api/sections', '/api/session', '/api/auth/signup', '/api/examType', '/api/basic-setup', '/api/manage-course', '/api/manage-subject', '/api/manage-exam', '/api/manage-fees', '/api/manage-leave', '/api/manage-result', '/api/manage-staff', '/api/manage-student', '/api/manage-student', '/api/rooms', '/api/seating-arrangement', '/api/roomSeatingPlan', '/api/whatsapp', '/api/announcement', '/api/late-fee', '/api/student-late-fees', '/api/student-fees', '/api/student-fee-payments', '/api/student-fee-payment', '/api/student-late-fee', '/api/fee-receipt', '/api/student-fee', '/api/fees-type', '/api/fees-structure', '/api/discount-type', '/api/basic-setup', '/api/manage-course', '/api/manage-subject', '/api/manage-exam', '/api/manage-fees', '/api/manage-leave', '/api/manage-result', '/api/manage-staff', '/api/manage-student', '/api/manage-student', '/api/rooms', '/api/seating-arrangement', '/api/roomSeatingPlan', '/api/whatsapp', '/api/announcement', '/api/late-fee', '/api/student-late-fees', '/api/student-fees', '/api/student-fee-payments', '/api/late-fee', '/api/rooms', '/api/events'],  
  },
  {
    role: UserRole.ADMIN,
    routes: ['/dashboard', '/manage-staff', '/manage-staff/add', '/api/manage-staff', '/manage-student', '/manage-student/add', '/api/manage-student', '/api/student-class', '/manage-course', '/manage-course/add', '/api/manage-course', '/manage-subject', '/manage-subject/add', '/api/manage-subject', 'attendance/add', '/attendance', '/api/attendance', '/manage-leave/add', '/manage-leave', '/api/leave' , '/manage-result', '/manage-result/add', '/api/manage-result', '/profile', '/calendar', '/api/classes', '/api/sections', '/api/session', '/api/examType', '/api/manage-exam', '/api/rooms', '/api/seating-arrangement', '/api/roomSeatingPlan', '/announcements', '/api/announcement', '/api/whatsapp', '/manage-fees', '/manage-fees/add', '/api/manage-fees', '/api/fees-type', '/api/fees-structure', '/api/discount-type', '/api/student-fee', '/api/student-fee-payment', '/api/fee-receipt', '/api/student-late-fee', '/api/student-fees', '/api/student-fee-payments', '/api/late-fee', '/api/student-late-fees', '/api/basic-setup', '/manage-timetable', '/manage-timetable/add', '/api/timetable', '/api/exam', '/api/client-organization', '/api/events', '/api/dashboard/student-stats', '/api/dashboard/fee-stats', '/api/dashboard/outstanding-fees', '/api/dashboard/defaulters', '/api/dashboard/fee-payments', '/manage-transport', '/manage-transport/add', '/api/manage-transport', '/api/manage-transport', '/api/student-bus', '/api/student-bus-fees', '/api/student-bus-fee-payments', '/manage-marksheet', '/manage-marksheet/add', '/api/manage-marksheet', '/manage-marksheet/schema-builder', '/manage-admitCard', '/manage-admitCard/add', '/api/manage-admitCard'],
  },
  {
    role: UserRole.STAFF,
    routes: ['/manage-staff', '/manage-student', '/manage-student/add', '/api/manage-staff', '/api/student-class', '/manage-course', '/manage-course/add', '/api/manage-course', '/manage-subject', '/manage-subject/add', '/api/manage-subject', '/attendance', '/attendance/add', '/api/attendance', '/manage-leave', '/manage-leave/add', '/api/leave', '/manage-result', '/manage-result/add', '/api/manage-result', '/profile', '/calendar', '/api/classes', '/api/sections', '/api/session', '/api/examType', '/api/manage-exam', '/api/rooms', '/api/seating-arrangement', '/seating-arrangement', '/api/roomSeatingPlan', '/announcements', '/api/announcement', '/api/whatsapp', '/manage-fees', '/manage-fees/add', '/api/manage-fees', '/api/fees-type', '/api/fees-structure', '/api/discount-type', '/api/student-fee', '/api/student-fee-payment', '/api/fee-receipt', '/api/student-late-fee', '/api/student-fees', '/api/student-fee-payments', '/api/late-fee', '/api/student-late-fees', '/manage-timetable', '/manage-timetable/add', '/api/timetable', '/api/exam', '/api/client-organization', '/api/events', '/manage-transport', '/manage-transport/add', '/api/manage-transport', '/api/manage-transport', '/api/student-bus', '/api/student-bus-fees', '/api/student-bus-fee-payments', '/manage-marksheet', '/manage-marksheet/add', '/api/manage-marksheet', '/manage-marksheet/schema-builder', '/manage-admitCard', '/manage-admitCard/add', '/api/manage-admitCard'],
  },
  {
    role: UserRole.STUDENT,
    routes: ['/manage-student', '/api/manage-staff', '/api/student-class', '/manage-subject', '/api/manage-subject', '/attendance', '/api/attendance', '/manage-result', '/api/manage-result', '/profile', '/calendar', '/api/classes', '/api/sections', '/api/session', '/api/examType', '/api/manage-exam', '/api/rooms', '/api/seating-arrangement', '/api/roomSeatingPlan', '/announcements', '/api/announcements', '/api/whatsapp', '/manage-fees', '/api/manage-fees', '/api/fees-type', '/api/fees-structure', '/api/discount-type', '/api/student-fee', '/api/student-fee-payment', '/api/fee-receipt', '/api/student-late-fee', '/api/student-fees', '/api/student-fee-payments', '/manage-timetable', '/manage-timetable/add', '/api/timetable', '/api/announcement', '/api/student-late-fees', '/api/client-organization', '/api/events', '/api/manage-transport', '/api/student-bus', '/api/student-bus-fees', '/api/student-bus-fee-payments', '/api/manage-marksheet'],
  },
];

export const hasAccess = (userRole: UserRole, path: string): boolean => {
  const access = roleAccess.find((access) => access.role === userRole);
  if (!access) return false;

  // First check for exact match
  if (access.routes.includes(path)) {
    return true;
  }

  // For paths with subpaths like /manage-course/add
  const pathParts = path.split('/');

  // If this is an "add" or other special subpath, it must be explicitly allowed
  if (pathParts.length > 2 && pathParts[2] !== '') {
    const exactPath = path;
    return access.routes.includes(exactPath);
  }

  // For API routes, we need to be more careful
  if (path.startsWith('/api/')) {
    return access.routes.includes(path);
  }

  // For regular routes, check if the base path is allowed
  const basePath = `/${pathParts[1]}`;
  return access.routes.includes(basePath);
};

export const getFirstAllowedRoute = (userRole: UserRole): string => {
  const access = roleAccess.find((access) => access.role === userRole);
  if (!access || access.routes.length === 0) {
    return '/login'; // Fallback to login if no routes found
  }

  // Return the first non-API route (prefer UI routes over API routes)
  const uiRoutes = access.routes.filter(route => !route.startsWith('/api/'));
  if (uiRoutes.length > 0) {
    return uiRoutes[0];
  }

  // If only API routes are available, return the first one
  return access.routes[0];
};