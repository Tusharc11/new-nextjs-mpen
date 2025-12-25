import React from 'react';
import { AlertDialog } from 'radix-ui';
import { useSidebarStore } from '../store/useSidebarStore';

interface ModalPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    message?: string;
    cancelButtonText?: string;
    confirmButtonText?: string;
    confirmButtonColor?: string;
    isLoading?: boolean;
}

const ModalPopup: React.FC<ModalPopupProps> = ({
    isOpen,
    onClose,
    onConfirm,
    message,
    cancelButtonText = 'Cancel',
    confirmButtonText = 'Yes, Delete',
    confirmButtonColor = 'bg-red-600',
    isLoading = false
}) => {
    const { isExpanded } = useSidebarStore();

    return (
        <AlertDialog.Root open={isOpen} onOpenChange={onClose}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-[9999]" />
                <AlertDialog.Content 
                    className="fixed z-[9999] gap-4 border border-gray-200 bg-white p-4 sm:p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg sm:rounded-lg focus:outline-none"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 'min(95vw, 32rem)',
                        maxWidth: `calc(100vw - ${isExpanded ? '20rem' : '8rem'})` // Account for sidebar + padding
                    }}
                >
                <div className="space-y-4">
                    <AlertDialog.Title className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">
                        Are you sure?
                    </AlertDialog.Title>
                    <AlertDialog.Description className="text-sm sm:text-base text-gray-600 leading-relaxed">
                        {message}
                    </AlertDialog.Description>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-3 pt-4 sm:pt-2">
                    <AlertDialog.Cancel asChild>
                        <button 
                            onClick={onClose} 
                            disabled={isLoading}
                            className="flex h-10 sm:h-9 px-4 py-2 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cancelButtonText}
                        </button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action asChild>
                        <button 
                            onClick={onConfirm} 
                            disabled={isLoading}
                            className={`flex h-10 sm:h-9 px-4 py-2 items-center justify-center rounded-md text-sm font-medium text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 w-full sm:w-auto disabled:opacity-75 disabled:cursor-not-allowed ${confirmButtonColor}`}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Deleting...
                                </>
                            ) : (
                                confirmButtonText
                            )}
                        </button>
                    </AlertDialog.Action>
                </div>
            </AlertDialog.Content>
        </AlertDialog.Portal>
    </AlertDialog.Root>
    );
};

export default ModalPopup;
