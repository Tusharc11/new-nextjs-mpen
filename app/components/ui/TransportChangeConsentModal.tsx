'use client';

import React from 'react';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';

interface TransportChangeDetails {
  transportChanged: boolean;
  routeChanged: boolean;
  currentTransport: {
    id: string;
    number: number;
    vehicleNumber: string;
    route: {
      id: string;
      destination: string;
      amount: number;
    };
  };
  newTransport: {
    id: string;
    number: number;
    vehicleNumber: string;
    route: {
      id: string;
      destination: string;
      amount: number;
    };
  };
  pendingInstallments: number;
}

interface TransportChangeConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  changeDetails: TransportChangeDetails | null;
  isLoading?: boolean;
}

const TransportChangeConsentModal: React.FC<TransportChangeConsentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  changeDetails,
  isLoading = false
}) => {
  if (!isOpen || !changeDetails) return null;

  const { currentTransport, newTransport, pendingInstallments, transportChanged, routeChanged } = changeDetails;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto"
         style={{
           paddingTop: '1rem',
           paddingBottom: '1rem',
           paddingLeft: '0.5rem',
           paddingRight: '0.5rem'
         }}>
      <div
        className="bg-base-100 rounded-lg shadow-2xl 
                   h-[calc(100%-2rem)] m-2
                   sm:h-[calc(100%-3rem)] sm:rounded-xl sm:m-4 
                   md:h-[calc(100%-4rem)] md:rounded-2xl md:m-6
                   lg:max-h-[calc(100vh-8rem)] lg:rounded-2xl lg:m-8
                   xl:max-h-[calc(100vh-6rem)] xl:rounded-3xl
                   2xl:max-h-[calc(100vh-4rem)]
                   overflow-hidden animate-in zoom-in-95 duration-200 border border-base-content/20 flex flex-col"
        style={{
          width: `min(calc(100vw - 2rem), 900px)`,
          maxWidth: `min(95vw, 900px)`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-2 md:py-2 bg-base-200 border-b border-base-300 border-base-content/60 rounded-t-lg sm:rounded-t-xl flex-shrink-0">
          <div className="relative flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-base-content/90 mb-1 sm:mb-2">
                Transport Details Changed
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-base-content/60">
                Review the changes and confirm to proceed
              </p>
            </div>
            <div className="absolute right-0 flex items-center gap-2">
              <Button
                variant="error"
                outline
                className="btn btn-sm"
                onClick={onClose}
                disabled={isLoading}
              >
                <span className="text-lg sm:text-xl">×</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-3 md:px-5">
          <div className="space-y-4 py-4">
            
            {/* Warning Message */}
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-base-content mb-2">
                    Transport changes detected!
                  </h3>
                  <p className="text-sm text-base-content/80">
                    You have <span className="font-semibold text-warning">{pendingInstallments}</span> pending/unpaid installments that will be updated with the new transport details.
                  </p>
                </div>
              </div>
            </div>

            {/* Current vs New Transport Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Current Transport */}
              <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                <h3 className="font-semibold text-error mb-3 flex items-center">
                  <span className="w-3 h-3 bg-error rounded-full mr-2"></span>
                  Current Transport
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content">Bus Number:</span>
                    <span className="font-medium text-base-content">#{currentTransport.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content">Vehicle:</span>
                    <span className="font-medium text-base-content">{currentTransport.vehicleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content">Route:</span>
                    <span className="font-medium text-base-content">{currentTransport.route.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content">Amount:</span>
                    <span className="font-medium text-base-content">₹{currentTransport.route.amount}/month</span>
                  </div>
                </div>
              </div>

              {/* New Transport */}
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <h3 className="font-semibold text-success mb-3 flex items-center">
                  <span className="w-3 h-3 bg-success rounded-full mr-2"></span>
                  New Transport
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content">Bus Number:</span>
                    <span className="font-medium text-base-content">#{newTransport.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content">Vehicle:</span>
                    <span className="font-medium text-base-content">{newTransport.vehicleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content">Route:</span>
                    <span className="font-medium text-base-content">{newTransport.route.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content">Amount:</span>
                    <span className="font-medium text-base-content">₹{newTransport.route.amount}/month</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Changes Summary */}
            <div className="bg-base-200 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-base-content">Changes Summary:</h3>
              <ul className="space-y-2 text-sm">
                {transportChanged && (
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-warning rounded-full mr-3 text-base-content"></span>
                    Bus changed from #{currentTransport.number} to #{newTransport.number}
                  </li>
                )}
                {routeChanged && (
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-warning rounded-full mr-3 text-base-content"></span>
                    <span className="text-base-content">Route changed from <span className="font-medium text-primary">{currentTransport.route.destination}</span> to <span className="font-medium text-primary">{newTransport.route.destination}</span></span>
                  </li>
                )}
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-info rounded-full mr-3 text-base-content"></span>
                  <span className="text-base-content"><span className="font-medium text-primary">{pendingInstallments}</span> pending installments will be updated</span>
                </li>
                {currentTransport.route.amount !== newTransport.route.amount && (
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-warning rounded-full mr-3 text-base-content"></span>
                    <span className="text-base-content">Monthly amount changed from <span className="font-medium text-primary">₹{currentTransport.route.amount}</span> to <span className="font-medium text-primary">₹{newTransport.route.amount}</span></span>
                  </li>
                )}
              </ul> 
            </div>

            {/* Confirmation Message */}
            <div className="bg-base-300/50 border border-base-content/20 rounded-lg p-4 text-center">
              <p className="font-medium mb-2 text-error">
                Are you sure you want to proceed with these changes?
              </p>
              <p className="text-sm text-error">
                This action will update all pending fee entries and maintain the previous records for history.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-4 md:px-6 py-3 bg-base-200 border-t border-base-300 flex-shrink-0">
          <div className="flex justify-end gap-3">
            <Button
              outline
              variant='error'
              onClick={onClose}
              disabled={isLoading}
            //   className="btn btn-sm"
            >
              Cancel
            </Button>
            <Button
            outline
              variant="warning"
              onClick={onConfirm}
              disabled={isLoading}
            //   className="btn btn-sm"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  Updating...
                </div>
              ) : (
                'Yes, Update Transport'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportChangeConsentModal;
