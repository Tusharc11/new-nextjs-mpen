'use client';

import { useRouter } from 'next/navigation';

export default function AccessDenied() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-[450px] bg-white rounded-lg border shadow-lg p-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-gray-500">
            You don&apos;t have permission to access this page
          </p>
        </div>
        
        <div className="text-center mb-6">
          <div className="mb-4">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-24 w-24 mx-auto text-red-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-3a3 3 0 100-6 3 3 0 000 6z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3-3h10l3 3z" 
              />
            </svg>
          </div>
          <p className="text-gray-600">
            Sorry, you don&apos;t have the necessary permissions to view this page. 
            Please contact your administrator if you believe this is an error.
          </p>
        </div>
        
        <div className="flex justify-center">
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}