'use client';

import React, { useState } from 'react';
import { Button } from './button';
import { Printer } from 'lucide-react';
import toast from 'react-hot-toast';

interface SeatingArrangementModalProps {
    isOpen: boolean;
    onClose: () => void;
    seatingPlanData?: {
        seatingPlans: Array<{
            _id: string;
            roomId: {
                _id: string;
                room: string;
                capacity: number;
                layout: Array<{
                    row: number;
                    benches: number;
                }>;
                entry?: string;
            };
            seatingPlan: Array<{
                row: number;
                bench: number;
                position: string;
                rollNumber: number;
                classNumber: string;
                section: string;
                _id: string;
            }>;
            benchCapacity: number;
            examDate: string;
        }>;
        totalRooms: number;
        className: string;
    };
    selectedRoomIndex?: number;
}

// This is the interface for seat data
interface SeatStatus {
    [key: string]: boolean;
}

// Page component that demonstrates the modal
export default function SeatingArrangementPage() {
    // For demo purposes, we'll show the modal directly on this page
    const [showModal, setShowModal] = useState(true);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-base-100">
            <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center text-base-content">Classroom Seating Arrangement</h1>
            <p className="text-center text-base-content/70 max-w-md mb-6 text-sm sm:text-base">
                This feature allows you to view and manage classroom seating arrangements for exams and other events.
            </p>

            {/* Demo button to reopen the modal */}
            <button
                className="btn btn-primary mt-4"
                onClick={() => setShowModal(true)}
            >
                Show Seating Arrangement
            </button>

            {/* Include the modal on this page for demonstration */}
            <SeatingArrangementModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            />
        </div>
    );
}

// Modal component implementation
export function SeatingArrangementModal({
    isOpen,
    onClose,
    seatingPlanData,
    selectedRoomIndex = 0
}: SeatingArrangementModalProps) {
    // Constants for classroom layout
    const ROWS = 6; // 7 rows vertically
    const COLUMNS = 3; // 3 columns horizontally

    // State for selected and unavailable seats
    const [selectedSeats, setSelectedSeats] = useState<SeatStatus>({});
    const [hoverSeat, setHoverSeat] = useState<string | null>(null);
    const [currentRoomIndex, setCurrentRoomIndex] = useState(selectedRoomIndex);

    // Function to select/deselect seat
    const toggleSeat = (row: number, col: number, seat: number) => {
        const seatId = `${row}-${col}-${seat}`;

        setSelectedSeats(prev => {
            const newSelected = { ...prev };
            if (newSelected[seatId]) {
                delete newSelected[seatId];
            } else {
                newSelected[seatId] = true;
            }
            return newSelected;
        });
    };

    // Get seat status
    const getSeatStatus = (row: number, col: number, seat: number) => {
        const seatId = `${row}-${col}-${seat}`;

        if (hoverSeat === seatId) return 'hover';
        return 'available';
    };

    // Get seat styling based on status
    const getSeatClassName = (status: string) => {
        switch (status) {
            case 'unavailable':
                return 'bg-base-content/20 border-base-content/30 cursor-not-allowed opacity-75';
            case 'selected':
                return 'bg-primary border-primary text-primary-content shadow-inner glow-cyan';
            case 'hover':
                return 'bg-secondary border-secondary text-secondary-content';
            default:
                return 'bg-base-200 border-base-content/30 text-base-content hover:bg-secondary/50 hover:border-secondary';
        }
    };

    // Get seat identifier
    const getSeatIdentifier = (row: number, col: number, seat: number) => {
        const rowLabel = String.fromCharCode(65 + row); // A, B, C, etc.
        const seatNum = col * 2 + seat + 1;
        return `${rowLabel}${seatNum}`;
    };

    // Function to get student data for real seating arrangement
    const getStudentAtPosition = (row: number, benchIndex: number, position: string, seatingPlan: any[]) => {
        return seatingPlan.find((seat: any) =>
            seat.row === row && seat.bench === benchIndex + 1 && seat.position === position
        );
    };

    // Function to get seat color based on class-section combination
    const getSeatColorByClassSection = (student: any) => {
        if (!student) return 'bg-base-200 border-base-content/30 text-base-content/60';

        // Use the same color system as the legend
        const getClassSectionColor = (classNum: string, section: string): string => {
            const classColors = [
                'bg-red-600 border-red-700 text-white',           // Bright Red
                'bg-blue-600 border-blue-700 text-white',         // Bright Blue  
                'bg-green-600 border-green-700 text-white',       // Bright Green
                'bg-amber-500 border-amber-600 text-black',       // Bright Yellow/Amber
                'bg-purple-600 border-purple-700 text-white',     // Bright Purple
                'bg-pink-600 border-pink-700 text-white',         // Bright Pink
                'bg-orange-600 border-orange-700 text-white',     // Bright Orange
                'bg-teal-600 border-teal-700 text-white',         // Bright Teal
                'bg-indigo-600 border-indigo-700 text-white',     // Bright Indigo
                'bg-cyan-600 border-cyan-700 text-black',         // Bright Cyan
                'bg-emerald-600 border-emerald-700 text-white',   // Bright Emerald
                'bg-violet-600 border-violet-700 text-white',     // Bright Violet
                'bg-rose-600 border-rose-700 text-white',         // Bright Rose
                'bg-lime-600 border-lime-700 text-black',         // Bright Lime
                'bg-fuchsia-600 border-fuchsia-700 text-white',   // Bright Fuchsia
                'bg-sky-600 border-sky-700 text-white',           // Bright Sky Blue
                'bg-stone-600 border-stone-700 text-white',       // Stone Gray
                'bg-red-800 border-red-900 text-white',           // Dark Red
                'bg-blue-800 border-blue-900 text-white',         // Dark Blue
                'bg-green-800 border-green-900 text-white'        // Dark Green
            ];

            // Get all class-section combos in this room to check for same-class sections
            const allCombos = Array.from(new Set(
                currentRoom?.seatingPlan?.map((seat: any) => `${seat.classNumber}-${seat.section}`) || []
            ));

            // Check if there are multiple sections of the same class
            const sameClassSections = allCombos.filter(combo => combo.startsWith(`${classNum}-`));

            if (sameClassSections.length > 1) {
                // Multiple sections of same class - ensure distinct colors
                const sortedSections = sameClassSections.sort();
                const sectionIndex = sortedSections.indexOf(`${classNum}-${section}`);

                // Use section-based offset to ensure different colors for same class
                const classBaseIndex = parseInt(classNum) % (classColors.length - sameClassSections.length);
                const finalIndex = (classBaseIndex + sectionIndex * 3) % classColors.length;
                return classColors[finalIndex];
            } else {
                // Single section of this class - use regular hash
                const getBetterHash = (str: string) => {
                    if (/^\d+$/.test(str)) {
                        return parseInt(str) * 7 + 3;
                    }
                    let hash = 5381;
                    for (let i = 0; i < str.length; i++) {
                        hash = ((hash << 5) + hash) + str.charCodeAt(i);
                    }
                    return Math.abs(hash);
                };

                const classHash = getBetterHash(classNum);
                const classIndex = classHash % classColors.length;
                return classColors[classIndex];
            }
        };

        return getClassSectionColor(student.classNumber, student.section);
    };

    // Get current room data
    const getCurrentRoomData = () => {
        if (!seatingPlanData || !seatingPlanData.seatingPlans.length) return null;
        return seatingPlanData.seatingPlans[currentRoomIndex];
    };

    const currentRoom = getCurrentRoomData();
    const hasRealSeatingData = currentRoom && currentRoom.roomId.layout && currentRoom.seatingPlan.length > 0;

    // Get door positioning based on entry value
    const getDoorPosition = () => {
        if (!hasRealSeatingData || !currentRoom) return { position: '', labelPosition: '', doorOrientation: '' };

        const entry = currentRoom.roomId.entry || 'R'; // Default to right if not specified

        switch (entry) {
            case 'TL': // Top Left corner
                return {
                    position: '-top-1 left-3 sm:left-6',
                    labelPosition: 'bottom right-3 sm:right-6',
                    doorOrientation: 'w-12 sm:w-16 md:w-20 h-1.5 sm:h-2 md:h-2.5 bg-gradient-to-br from-amber-600 to-amber-800 rounded border border-amber-900'
                };
            case 'TR': // Top Right corner
                return {
                    position: '-top-1 right-3 sm:right-6',
                    labelPosition: 'bottom left-3 sm:left-6',
                    doorOrientation: 'w-12 sm:w-16 md:w-20 h-1.5 sm:h-2 md:h-2.5 bg-gradient-to-bl from-amber-600 to-amber-800 rounded border border-amber-900'
                };
            case 'BL': // Bottom Left corner
                return {
                    position: '-bottom-1 left-3 sm:left-6',
                    labelPosition: 'top-3 right-3 sm:right-6',
                    doorOrientation: 'w-12 sm:w-16 md:w-20 h-1.5 sm:h-2 md:h-2.5 bg-gradient-to-tr from-amber-600 to-amber-800 rounded border border-amber-900'
                };
            case 'BR': // Bottom Right corner
                return {
                    position: 'bottom-1 right-3 sm:right-6',
                    labelPosition: 'top-3 left-3 sm:left-6',
                    doorOrientation: 'w-12 sm:w-16 md:w-20 h-1.5 sm:h-2 md:h-2.5 bg-gradient-to-tl from-amber-600 to-amber-800 rounded border border-amber-900'
                };
            case 'L': // Left wall - between blackboard and teacher
                return {
                    position: '-left-1 top-16 sm:top-20 md:top-24',
                    labelPosition: 'right-2 top-1/2 transform -translate-y-1/2 rotate-90',
                    doorOrientation: 'w-1 sm:w-1.5 md:w-2 h-12 sm:h-16 md:h-20 bg-gradient-to-b from-amber-600 to-amber-800 rounded border-r border-amber-900'
                };
            case 'R': // Right wall - between blackboard and teacher
            default:
                return {
                    position: 'right-1 top-16 sm:top-20 md:top-24',
                    labelPosition: 'left-2 top-1/2 transform -translate-y-1/2 -rotate-90',
                    doorOrientation: 'w-1 sm:w-1.5 md:w-2 h-12 sm:h-16 md:h-20 bg-gradient-to-b from-amber-600 to-amber-800 rounded border-l border-amber-900'
                };
        }
    };

    // Calculate dynamic dimensions based on number of rows
    const getRoomDimensions = () => {
        if (hasRealSeatingData && currentRoom) {
            const numRows = currentRoom.roomId.layout.length;
            const maxBenches = Math.max(...currentRoom.roomId.layout.map((r: any) => r.benches));

            return {
                // Modal width scales with number of rows
                modalWidth: Math.max(400, Math.min(1400, numRows * 180)),
                // Blackboard width scales with room width
                blackboardWidth: Math.max(120, Math.min(400, numRows * 60)),
                // Teacher desk width scales proportionally
                teacherDeskWidth: Math.max(60, Math.min(120, numRows * 20)),
                // Room padding adjusts with size
                roomPadding: Math.max(8, Math.min(32, numRows * 4)),
                // Gap between rows
                rowGap: Math.max(8, Math.min(32, numRows > 6 ? 16 : 24)),
                // Wall border thickness
                wallBorder: numRows > 8 ? 6 : numRows > 4 ? 4 : 2
            };
        }
        // Default fallback for interactive seating
        return {
            modalWidth: 600,
            blackboardWidth: 200,
            teacherDeskWidth: 80,
            roomPadding: 16,
            rowGap: 24,
            wallBorder: 4
        };
    };

    const roomDimensions = getRoomDimensions();

    // Print function for seating arrangement modal - captures exact modal UI
    const handlePrintSeatingArrangement = () => {
        // Get the modal content element
        const modalElement = document.querySelector('[data-modal-content="seating-arrangement"]');
        if (!modalElement) {
            toast.error('Modal content not found for printing');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Please allow popups to enable printing');
            return;
        }

        // Get all the current styles from the parent document
        const styles = Array.from(document.styleSheets)
            .map(styleSheet => {
                try {
                    return Array.from(styleSheet.cssRules)
                        .map(rule => rule.cssText)
                        .join('\n');
                } catch (e) {
                    console.log('Cannot access stylesheet');
                    return '';
                }
            })
            .join('\n');

        // Get the modal content HTML
        const modalContent = modalElement.outerHTML;

        // Generate the print content with the exact modal UI
        const printContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Seating Arrangement - ${currentRoom?.roomId.room || 'Classroom'}</title>
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 6mm;
                        }
                        
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        body {
                            margin: 0;
                            padding: 3px;
                            background: white;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            height: auto;
                            max-height: calc(297mm - 12mm);
                            overflow: hidden;
                            display: flex;
                            justify-content: center;
                            align-items: flex-start;
                        }
                        
                        /* Tailwind CSS base - in case external CSS doesn't load */
                        .bg-base-100 { background-color: #ffffff; }
                        .bg-base-200 { background-color: #f3f4f6; }
                        .bg-base-300 { background-color: #e5e7eb; }
                        .text-base-content { color: #1f2937; }
                        .border-base-300 { border-color: #e5e7eb; }
                        .border-base-content\\/60 { border-color: rgba(31, 41, 55, 0.6); }
                        .rounded-lg { border-radius: 0.5rem; }
                        .rounded-xl { border-radius: 0.75rem; }
                        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
                        .flex { display: flex; }
                        .flex-col { flex-direction: column; }
                        .flex-1 { flex: 1 1 0%; }
                        .items-center { align-items: center; }
                        .justify-center { justify-content: center; }
                        .justify-between { justify-content: space-between; }
                        .gap-1 { gap: 0.25rem; }
                        .gap-2 { gap: 0.5rem; }
                        .gap-3 { gap: 0.75rem; }
                        .gap-4 { gap: 1rem; }
                        .p-1 { padding: 0.25rem; }
                        .p-2 { padding: 0.5rem; }
                        .p-3 { padding: 0.75rem; }
                        .p-4 { padding: 1rem; }
                        .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
                        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
                        .px-4 { padding-left: 1rem; padding-right: 1rem; }
                        .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
                        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
                        .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
                        .mb-1 { margin-bottom: 0.25rem; }
                        .mb-2 { margin-bottom: 0.5rem; }
                        .mb-3 { margin-bottom: 0.75rem; }
                        .mb-4 { margin-bottom: 1rem; }
                        .text-xs { font-size: 0.75rem; line-height: 1rem; }
                        .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
                        .text-base { font-size: 1rem; line-height: 1.5rem; }
                        .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
                        .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
                        .text-2xl { font-size: 1.5rem; line-height: 2rem; }
                        .font-semibold { font-weight: 600; }
                        .font-bold { font-weight: 700; }
                        .text-center { text-align: center; }
                        .relative { position: relative; }
                        .absolute { position: absolute; }
                        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
                        .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem; }
                        .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem; }
                        .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.75rem; }
                        .border { border-width: 1px; }
                        .border-b { border-bottom-width: 1px; }
                        .w-3 { width: 0.75rem; }
                        .w-4 { width: 1rem; }
                        .h-3 { height: 0.75rem; }
                        .h-4 { height: 1rem; }
                        .h-5 { height: 1.25rem; }
                        .h-6 { height: 1.5rem; }
                        .overflow-hidden { overflow: hidden; }
                        .flex-wrap { flex-wrap: wrap; }
                        .flex-shrink-0 { flex-shrink: 0; }
                        .max-w-full { max-width: 100%; }
                        
                        /* Include all original styles */
                        ${styles}
                        
                        /* Print-specific overrides */
                        .fixed {
                            position: relative !important;
                            inset: auto !important;
                            z-index: auto !important;
                        }
                        
                        .bg-black\\/60 {
                            background: transparent !important;
                        }
                        
                        .backdrop-blur-sm {
                            backdrop-filter: none !important;
                        }
                        
                        .overflow-y-auto {
                            overflow: visible !important;
                        }
                        
                        .h-\\[calc\\(100\\%-2rem\\)\\],
                        .h-\\[calc\\(100\\%-3rem\\)\\],
                        .h-\\[calc\\(100\\%-4rem\\)\\],
                        .lg\\:max-h-\\[calc\\(100vh-8rem\\)\\],
                        .xl\\:max-h-\\[calc\\(100vh-6rem\\)\\],
                        .\\32xl\\:max-h-\\[calc\\(100vh-4rem\\)\\] {
                            height: auto !important;
                            max-height: none !important;
                        }
                        
                        .animate-in {
                            animation: none !important;
                        }
                        
                        /* Make modal content fit single page */
                        [data-modal-content="seating-arrangement"] {
                            width: 100% !important;
                            max-width: none !important;
                            margin: 0 !important;
                            border-radius: 8px !important;
                            box-shadow: none !important;
                            height: auto !important;
                            max-height: calc(297mm - 12mm) !important;
                            display: flex !important;
                            flex-direction: column !important;
                            overflow: hidden !important;
                        }
                        
                        /* Optimize classroom layout for portrait */
                        .wall-border {
                            border-width: 2px !important;
                        }
                        
                        /* Compact classroom content for single page */
                        .classroom-layout {
                            padding: 6px !important;
                            height: auto !important;
                            max-height: calc(100% - 60px) !important;
                            display: flex !important;
                            flex-direction: column !important;
                        }
                        
                        /* Compact content areas */
                        .flex-1.overflow-y-auto {
                            flex: 1 !important;
                            overflow: visible !important;
                            padding: 6px 8px !important;
                        }
                        
                        /* Reduced header spacing */
                        .px-3.sm\\:px-4.md\\:px-6.py-2 {
                            padding: 6px 8px !important;
                        }
                        
                        /* Compact legend section */
                        .px-3.sm\\:px-4.md\\:px-6.bg-base-50\\/30 {
                            padding: 6px 8px !important;
                        }
                        
                        /* Preserve classroom wall styling for portrait print */
                        .relative.bg-base-100.rounded-lg {
                            background: white !important;
                            border-radius: 8px !important;
                        }
                        
                        /* Maintain classroom wall border appearance */
                        .absolute.border-base-content\\/20.rounded-lg.shadow-inner {
                            border: 2px solid rgba(31, 41, 55, 0.2) !important;
                            box-shadow: inset 0 2px 8px rgba(31, 41, 55, 0.1) !important;
                        }
                        
                        /* Ensure blackboard and teacher desk are visible and scaled */
                        .blackboard-frame,
                        .teacher-desk-frame {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Compact classroom elements for single page */
                        .flex.justify-center.relative.z-10 {
                            margin-top: 4px !important;
                            margin-bottom: 4px !important;
                        }
                        
                        /* Compact seating area spacing */
                        .flex.flex-row.justify-center {
                            gap: 10px !important;
                            padding: 0 6px !important;
                        }
                        
                        /* Reduce row spacing */
                        .flex.flex-col.items-center {
                            margin-bottom: 0 !important;
                        }
                        
                        /* Compact bench visibility */
                        .flex.flex-col.justify-start.items-center {
                            gap: 3px !important;
                        }
                        
                        /* Compact legend item spacing */
                        .flex.flex-wrap.items-center.justify-center {
                            gap: 3px !important;
                            margin: 3px 0 !important;
                        }
                        
                        /* Compact classroom border for single page */
                        .absolute.border-base-content\\/20.rounded-lg.shadow-inner {
                            border: 2px solid rgba(31, 41, 55, 0.3) !important;
                            box-shadow: inset 0 2px 6px rgba(31, 41, 55, 0.15) !important;
                        }
                        
                        /* Ensure single page fit */
                        .relative.bg-base-100.rounded-lg.p-1 {
                            max-height: calc(100% - 60px) !important;
                            overflow: hidden !important;
                        }
                        
                        /* Compact text for single page print */
                        .text-lg.sm\\:text-xl.md\\:text-2xl {
                            font-size: 1.25rem !important;
                            line-height: 1.5rem !important;
                        }
                        
                        .text-xs.sm\\:text-sm.md\\:text-base {
                            font-size: 0.75rem !important;
                            line-height: 1rem !important;
                        }
                        
                        /* Compact row labels */
                        .text-center.text-xs.sm\\:text-sm.font-medium {
                            font-size: 0.75rem !important;
                            font-weight: 600 !important;
                            margin-bottom: 4px !important;
                        }
                        
                        /* Compact bench seat text */
                        .font-bold.text-\\[0\\.5rem\\].sm\\:text-xs.md\\:text-sm {
                            font-size: 0.65rem !important;
                            font-weight: 700 !important;
                        }
                        
                        /* Add page break control */
                        @media print {
                            * {
                                page-break-inside: avoid !important;
                            }
                            
                            [data-modal-content="seating-arrangement"] {
                                page-break-after: avoid !important;
                                page-break-inside: avoid !important;
                            }
                        }
                        
                        /* Ensure proper scaling for print */
                        .flex-1 {
                            flex: 1 1 auto !important;
                        }
                        
                        /* Hide scrollbars in print */
                        ::-webkit-scrollbar {
                            display: none !important;
                        }
                        
                        /* Hide action buttons in print view */
                        @media print {
                            [data-print-button],
                            [data-close-button] {
                                display: none !important;
                            }
                        }
                        
                        /* Ensure colors are preserved */
                        .bg-red-600,
                        .bg-blue-600,
                        .bg-green-600,
                        .bg-amber-500,
                        .bg-purple-600,
                        .bg-pink-600,
                        .bg-orange-600,
                        .bg-teal-600,
                        .bg-indigo-600,
                        .bg-cyan-600,
                        .bg-emerald-600,
                        .bg-violet-600,
                        .bg-rose-600,
                        .bg-lime-600,
                        .bg-fuchsia-600,
                        .bg-sky-600,
                        .bg-stone-600,
                        .bg-red-800,
                        .bg-blue-800,
                        .bg-green-800 {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        @media print {
                            body {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${modalContent}
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto"
            style={{
                paddingTop: '1rem',
                paddingBottom: '1rem',
                paddingLeft: '0.5rem',
                paddingRight: '0.5rem'
            }}>
            <div
                data-modal-content="seating-arrangement"
                className="bg-base-100 rounded-lg shadow-2xl 
                         h-[calc(100%-2rem)] m-2
                         sm:h-[calc(100%-3rem)] sm:rounded-xl sm:m-4 
                         md:h-[calc(100%-4rem)] md:rounded-2xl md:m-6
                         lg:max-h-[calc(100vh-8rem)] lg:rounded-2xl lg:m-8
                         xl:max-h-[calc(100vh-6rem)] xl:rounded-3xl
                         2xl:max-h-[calc(100vh-4rem)]
                         overflow-hidden animate-in zoom-in-95 duration-200 border border-base-content/20 flex flex-col"
                style={{
                    width: `min(calc(100vw - 2rem), ${roomDimensions.modalWidth}px)`,
                    maxWidth: `min(95vw, ${roomDimensions.modalWidth}px)`
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-2 md:py-2 bg-base-200 border-b border-base-300 border-base-content/60 rounded-t-lg sm:rounded-t-xl flex-shrink-0">
                    <div className="relative flex items-center justify-center">
                        <div className="text-center">
                            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-base-content/90 mb-1 sm:mb-2">
                                {`Classroom ${currentRoom?.roomId.room}`}
                                {currentRoom && (
                                    <p className="text-xs sm:text-sm md:text-base text-base-content/60">
                                        Class {seatingPlanData?.className || currentRoom.seatingPlan[0]?.classNumber}
                                        {currentRoom.examDate ? ` • ${new Date(currentRoom.examDate).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })}` : ''}
                                    </p>
                                )}
                            </h3>
                        </div>
                        <div className="absolute right-0 flex items-center gap-2">
                            <Button
                                data-print-button
                                outline
                                variant="primary"
                                onClick={handlePrintSeatingArrangement}
                                className="flex items-center gap-1 sm:gap-2 btn btn-sm"
                            >
                                <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline text-xs sm:text-sm">Print</span>
                            </Button>
                            <Button
                                data-close-button
                                variant="error"
                                outline
                                className="btn btn-sm"
                                onClick={onClose}
                            >
                                <span className="text-lg sm:text-xl">×</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Class-Section Legend */}
                {hasRealSeatingData && currentRoom && (
                    <div className="px-3 sm:px-4 md:px-6 bg-base-50/30 flex-shrink-0 py-3 sm:py-3">
                        <div className="space-y-2 sm:space-y-3 flex flex-col items-center justify-center">
                            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 md:gap-3">
                                {(() => {
                                    // Create class-section combinations
                                    const classSectionCombos = Array.from(new Set(
                                        currentRoom.seatingPlan.map((seat: any) => `${seat.classNumber}-${seat.section}`)
                                    )).sort();

                                    // Generate unique colors for each class-section combination
                                    const getClassSectionColor = (classNum: string, section: string): string => {
                                        const classColors = [
                                            'bg-red-600 text-white border-red-700',           // Bright Red
                                            'bg-blue-600 text-white border-blue-700',         // Bright Blue  
                                            'bg-green-600 text-white border-green-700',       // Bright Green
                                            'bg-amber-500 text-black border-amber-600',       // Bright Yellow/Amber
                                            'bg-purple-600 text-white border-purple-700',     // Bright Purple
                                            'bg-pink-600 text-white border-pink-700',         // Bright Pink
                                            'bg-orange-600 text-white border-orange-700',     // Bright Orange
                                            'bg-teal-600 text-white border-teal-700',         // Bright Teal
                                            'bg-indigo-600 text-white border-indigo-700',     // Bright Indigo
                                            'bg-cyan-600 text-black border-cyan-700',         // Bright Cyan
                                            'bg-emerald-600 text-white border-emerald-700',   // Bright Emerald
                                            'bg-violet-600 text-white border-violet-700',     // Bright Violet
                                            'bg-rose-600 text-white border-rose-700',         // Bright Rose
                                            'bg-lime-600 text-black border-lime-700',         // Bright Lime
                                            'bg-fuchsia-600 text-white border-fuchsia-700',   // Bright Fuchsia
                                            'bg-sky-600 text-white border-sky-700',           // Bright Sky Blue
                                            'bg-stone-600 text-white border-stone-700',       // Stone Gray
                                            'bg-red-800 text-white border-red-900',           // Dark Red
                                            'bg-blue-800 text-white border-blue-900',         // Dark Blue
                                            'bg-green-800 text-white border-green-900'        // Dark Green
                                        ];

                                        // Get all class-section combos in this room to check for same-class sections
                                        const allCombos = Array.from(new Set(
                                            currentRoom?.seatingPlan?.map((seat: any) => `${seat.classNumber}-${seat.section}`) || []
                                        ));

                                        // Check if there are multiple sections of the same class
                                        const sameClassSections = allCombos.filter(combo => combo.startsWith(`${classNum}-`));

                                        if (sameClassSections.length > 1) {
                                            // Multiple sections of same class - ensure distinct colors
                                            const sortedSections = sameClassSections.sort();
                                            const sectionIndex = sortedSections.indexOf(`${classNum}-${section}`);

                                            // Use section-based offset to ensure different colors for same class
                                            const classBaseIndex = parseInt(classNum) % (classColors.length - sameClassSections.length);
                                            const finalIndex = (classBaseIndex + sectionIndex * 3) % classColors.length;
                                            return classColors[finalIndex];
                                        } else {
                                            // Single section of this class - use regular hash
                                            const getBetterHash = (str: string) => {
                                                if (/^\d+$/.test(str)) {
                                                    return parseInt(str) * 7 + 3;
                                                }
                                                let hash = 5381;
                                                for (let i = 0; i < str.length; i++) {
                                                    hash = ((hash << 5) + hash) + str.charCodeAt(i);
                                                }
                                                return Math.abs(hash);
                                            };

                                            const classHash = getBetterHash(classNum);
                                            const classIndex = classHash % classColors.length;
                                            return classColors[classIndex];
                                        }
                                    };

                                    return classSectionCombos.map((combo: string) => {
                                        const [classNum, section] = combo.split('-');
                                        const studentCount = currentRoom.seatingPlan.filter((seat: any) =>
                                            seat.classNumber === classNum && seat.section === section
                                        ).length;

                                        const rollNumbers = currentRoom.seatingPlan
                                            .filter((seat: any) => seat.classNumber === classNum && seat.section === section)
                                            .map((seat: any) => seat.rollNumber)
                                            .sort((a: number, b: number) => a - b);

                                        const minRoll = Math.min(...rollNumbers);
                                        const maxRoll = Math.max(...rollNumbers);
                                        const colorClass = getClassSectionColor(classNum, section);

                                        return (
                                            <div key={combo} className={`${colorClass} px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full shadow-sm flex items-center gap-1 sm:gap-2 transition-all duration-200 hover:shadow-md text-xs sm:text-sm`}>
                                                <span className="font-semibold">
                                                    {classNum}{section}
                                                </span>
                                                <span className="opacity-75 font-medium">
                                                    ({minRoll}-{maxRoll})
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto px-2 sm:px-3 md:px-5">
                    <style jsx global>{`
                          .glow-cyan {
                            box-shadow: 0 0 10px oklch(var(--p) / 0.5);
                          }
                          .glow-board {
                            box-shadow: 0 0 15px rgba(34, 211, 238, 0.3);
                          }
                          .door-shadow {
                            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
                          }
                          .blackboard-frame {
                            background: linear-gradient(to right, #b06d3b, #cd9c77, #b06d3b);
                            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
                          }
                          .blackboard-surface {
                            background: linear-gradient(to bottom right, #2d6a4f, #40916c, #2d6a4f);
                            box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.25);
                          }
                          .chalk-tray {
                            background: linear-gradient(to bottom, #d4d4d4, #bdbdbd);
                            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
                          }
                          .examiner-desk {
                            background: linear-gradient(to bottom, #755c44, #5d4b38);
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                          }
                          .teacher-desk-frame {
                            background: linear-gradient(to right, #8B4513, #A0522D, #8B4513);
                            box-shadow: 0 3px 7px rgba(0, 0, 0, 0.2);
                          }
                          .teacher-desk-surface {
                            background: linear-gradient(to bottom right, #D2B48C, #DEB887, #D2B48C);
                            box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.15);
                          }
                          .desk-items {
                            filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
                          }
                          .wall-border {
                            background: oklch(var(--b2));
                            box-shadow: inset 0 2px 8px oklch(var(--bc) / 0.1), 0 0 15px oklch(var(--bc) / 0.05);
                          }
                        `}</style>

                    <div className="relative bg-base-100 rounded-lg sm:rounded-xl p-1 sm:p-2 md:p-4">
                        {/* Classroom Wall Border */}
                        <div
                            className="absolute border-base-content/20 rounded-lg shadow-inner wall-border"
                            style={{
                                top: `${roomDimensions.roomPadding}px`,
                                bottom: `${roomDimensions.roomPadding}px`,
                                left: `${roomDimensions.roomPadding}px`,
                                right: `${roomDimensions.roomPadding}px`,
                                borderWidth: `${roomDimensions.wallBorder}px`
                            }}
                        ></div>
                        {/* Content with padding from walls */}
                        <div className="relative z-10 pt-4 sm:pt-6 pb-4 sm:pb-6">
                            {/* Board and Door Area */}
                            <div className="flex items-center justify-center mb-4 sm:mb-6 md:mb-8 relative">
                                {/* Black Board - Top View */}
                                <div className="relative">
                                    <div className="flex justify-center mb-1 sm:mb-2">
                                        <span className="font-medium text-base-content/80 text-xs sm:text-sm tracking-wider">BLACKBOARD</span>
                                    </div>

                                    {/* Blackboard with wooden frame, viewed from above */}
                                    <div
                                        className="blackboard-frame h-4 sm:h-6 md:h-8 rounded-md mx-auto relative"
                                        style={{ width: `${roomDimensions.blackboardWidth}px` }}
                                    >
                                        {/* Green surface */}
                                        <div className="blackboard-surface absolute inset-0.5 sm:inset-1 rounded-sm">
                                            {/* Chalk and eraser */}
                                            <div className="absolute bottom-0.5 sm:bottom-1 right-1 sm:right-2">
                                                <div className="w-1.5 sm:w-2 md:w-3 h-0.5 bg-white opacity-70 rounded-full"></div>
                                            </div>
                                        </div>

                                        {/* Chalk tray */}
                                        <div className="chalk-tray absolute -bottom-0.5 sm:-bottom-1 left-2 sm:left-4 right-2 sm:right-4 h-0.5 sm:h-1 rounded"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Door - Dynamic positioning based on entry value */}
                            {hasRealSeatingData && currentRoom && (
                                <div className={`absolute ${getDoorPosition().position} block`}>
                                    <div className="relative">
                                        {/* Door */}
                                        <div className={`${getDoorPosition().doorOrientation} door-shadow flex items-center justify-center`}>
                                            {/* Door handle */}
                                            <div className="w-0.5 sm:w-1 h-1 sm:h-2 md:h-3 bg-gray-400 absolute rounded-full"></div>
                                        </div>

                                        {/* Entry label */}
                                        <div className={`absolute ${getDoorPosition().labelPosition} origin-center text-[0.5rem] sm:text-[0.6rem] md:text-[0.8rem] text-base-content/70 whitespace-nowrap`}>
                                            ENTRY
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Teacher Desk - Top View */}
                            <div className="flex justify-center items-center mb-3 sm:mb-5 md:mb-8 relative">
                                <div className="relative">
                                    <div className="flex justify-center mb-1">
                                        <span className="font-medium text-base-content/80 text-xs tracking-wider">TEACHER</span>
                                    </div>

                                    {/* Teacher desk with wooden frame, viewed from above */}
                                    <div
                                        className="teacher-desk-frame h-3 sm:h-4 md:h-6 rounded-md mx-auto relative"
                                        style={{ width: `${roomDimensions.teacherDeskWidth}px` }}
                                    >
                                        {/* Desk surface */}
                                        <div className="teacher-desk-surface absolute inset-0.5 sm:inset-1 rounded-sm">
                                        </div>

                                        {/* Desk drawer indicators */}
                                        <div className="absolute -bottom-0.5 left-2 sm:left-3 right-2 sm:right-3 h-0.5 sm:h-1 flex space-x-0.5 sm:space-x-1">
                                            <div className="flex-1 h-full bg-amber-800/40 dark:bg-amber-900/40 rounded"></div>
                                            <div className="flex-1 h-full bg-amber-800/40 dark:bg-amber-900/40 rounded"></div>
                                            <div className="flex-1 h-full bg-amber-800/40 dark:bg-amber-900/40 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main seating area */}
                            <div className="flex justify-center relative z-10">
                                {hasRealSeatingData && currentRoom ? (
                                    /* Real seating arrangement based on room layout */
                                    <div
                                        className="flex flex-row justify-center"
                                        style={{
                                            minHeight: `${Math.max(...currentRoom.roomId.layout.map((r: any) => r.benches)) * 1.5}rem`,
                                            gap: `${roomDimensions.rowGap}px`,
                                            padding: `0 ${roomDimensions.roomPadding}px`
                                        }}
                                    >
                                        {/* Dynamic layout based on room data */}
                                        {currentRoom.roomId.layout.map((rowLayout: any) => (
                                            <div key={rowLayout.row} className="flex flex-col items-center">
                                                <div className="text-center text-xs sm:text-sm font-medium text-base-content/80 mb-2 sm:mb-3 md:mb-4">
                                                    Row {rowLayout.row}
                                                </div>
                                                <div className="flex flex-col justify-start items-center space-y-1.5 sm:space-y-2 md:space-y-3 max-w-full overflow-hidden">
                                                    {Array.from({ length: rowLayout.benches }).map((_, benchIndex) => {
                                                        const leftStudent = getStudentAtPosition(rowLayout.row, benchIndex, 'L', currentRoom.seatingPlan);
                                                        const middleStudent = getStudentAtPosition(rowLayout.row, benchIndex, 'M', currentRoom.seatingPlan);
                                                        const rightStudent = getStudentAtPosition(rowLayout.row, benchIndex, 'R', currentRoom.seatingPlan);

                                                        const benchCapacity = currentRoom.benchCapacity || 2;

                                                        return (
                                                            <div key={benchIndex} className="relative group w-full max-w-[100px] sm:max-w-[140px] md:max-w-[160px] lg:max-w-[200px]">
                                                                <div className="flex flex-col">
                                                                    {/* Seat top */}
                                                                    <div className="h-4 sm:h-5 md:h-6 lg:h-6 bg-base-300 rounded-md sm:rounded-lg shadow-lg flex overflow-hidden border border-base-content/20 gap-0 sm:gap-0.5 md:gap-1 w-full">
                                                                        {/* Left seat */}
                                                                        <div className={`${benchCapacity === 3 ? 'w-1/3' : 'w-1/2'} h-full flex items-center justify-center rounded-l-md sm:rounded-l-lg ${leftStudent ? getSeatColorByClassSection(leftStudent) : 'bg-base-200 text-base-content/60'}`}>
                                                                            <span className="font-bold text-[0.5rem] sm:text-xs md:text-sm">
                                                                                {leftStudent ? leftStudent.rollNumber : ''}
                                                                            </span>
                                                                        </div>

                                                                        {/* Middle seat (only if bench capacity is 3) */}
                                                                        {benchCapacity === 3 && (
                                                                            <div className={`w-1/3 h-full flex items-center justify-center ${middleStudent ? getSeatColorByClassSection(middleStudent) : 'bg-base-200 text-base-content/60'}`}>
                                                                                <span className="font-bold text-[0.5rem] sm:text-xs md:text-sm">
                                                                                    {middleStudent ? middleStudent.rollNumber : ''}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {/* Right seat */}
                                                                        <div className={`${benchCapacity === 3 ? 'w-1/3' : 'w-1/2'} h-full flex items-center justify-center rounded-r-md sm:rounded-r-lg ${rightStudent ? getSeatColorByClassSection(rightStudent) : 'bg-base-200 text-base-content/60'}`}>
                                                                            <span className="font-bold text-[0.5rem] sm:text-xs md:text-sm">
                                                                                {rightStudent ? rightStudent.rollNumber : ''}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Bench legs */}
                                                                    <div className="flex justify-between px-1.5 sm:px-2 md:px-3 lg:px-4 w-full gap-1 sm:gap-2 md:gap-3">
                                                                        <div className="w-1.5 sm:w-2 md:w-3 lg:w-4 h-1 sm:h-1.5 md:h-2 lg:h-3 bg-gradient-to-b from-base-content/30 to-base-content/50 rounded-b"></div>
                                                                        {benchCapacity === 3 && (
                                                                            <div className="w-1.5 sm:w-2 md:w-3 lg:w-4 h-1 sm:h-1.5 md:h-2 lg:h-3 bg-gradient-to-b from-base-content/30 to-base-content/50 rounded-b"></div>
                                                                        )}
                                                                        <div className="w-1.5 sm:w-2 md:w-3 lg:w-4 h-1 sm:h-1.5 md:h-2 lg:h-3 bg-gradient-to-b from-base-content/30 to-base-content/50 rounded-b"></div>
                                                                    </div>
                                                                </div>

                                                                {/* Bench number tooltip */}
                                                                <div className="absolute -top-6 sm:-top-8 inset-x-0 bg-base-300 rounded px-1 py-0.5 text-[0.5rem] sm:text-[0.6rem] text-center text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none border border-base-content/20 z-10 hidden sm:block">
                                                                    Row {rowLayout.row} Bench {benchIndex + 1}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* Default interactive seating arrangement */
                                    <div className="flex flex-col space-y-2 sm:space-y-3 md:space-y-4" style={{ minHeight: `${ROWS * COLUMNS * 2}rem` }}>
                                        {Array.from({ length: ROWS * COLUMNS }).map((_, benchIndex) => {
                                            const rolIndex = Math.floor(benchIndex / COLUMNS);
                                            const rowIndex = benchIndex % COLUMNS;
                                            return (
                                                <div key={`bench-${benchIndex}`} className="flex justify-center">
                                                    <div className="w-20 sm:w-24 md:w-28 lg:w-32 h-6 sm:h-7 md:h-8 lg:h-10 relative group">
                                                        {/* Bench */}
                                                        <div className="flex">
                                                            {/* Seat top */}
                                                            <div className="h-4 sm:h-5 md:h-6 lg:h-8 bg-base-300 rounded-md sm:rounded-lg shadow-lg flex overflow-hidden border border-base-content/20">
                                                                {/* Left seat */}
                                                                <div
                                                                    className={`w-1/2 h-full flex items-center justify-center cursor-pointer transition-all duration-300 border-r border-base-content/20 ${getSeatClassName(getSeatStatus(rolIndex, rowIndex, 0))}`}
                                                                    onClick={() => toggleSeat(rolIndex, rowIndex, 0)}
                                                                    onMouseEnter={() => setHoverSeat(`${rolIndex}-${rowIndex}-0`)}
                                                                    onMouseLeave={() => setHoverSeat(null)}
                                                                >
                                                                    <span className="font-bold text-[0.5rem] sm:text-[0.65rem] md:text-xs text-white">
                                                                        {getSeatIdentifier(rolIndex, rowIndex, 0)}
                                                                    </span>
                                                                </div>

                                                                {/* Right seat */}
                                                                <div
                                                                    className={`w-1/2 h-full flex items-center justify-center cursor-pointer transition-all duration-300 ${getSeatClassName(getSeatStatus(rolIndex, rowIndex, 1))}`}
                                                                    onClick={() => toggleSeat(rolIndex, rowIndex, 1)}
                                                                    onMouseEnter={() => setHoverSeat(`${rolIndex}-${rowIndex}-1`)}
                                                                    onMouseLeave={() => setHoverSeat(null)}
                                                                >
                                                                    <span className="font-bold text-[0.5rem] sm:text-[0.65rem] md:text-xs text-white">
                                                                        {getSeatIdentifier(rolIndex, rowIndex, 1)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Bench legs */}
                                                            <div className="flex justify-between px-1 sm:px-2 md:px-3 w-full">
                                                                <div className="w-1.5 sm:w-2 md:w-3 lg:w-4 h-0.5 sm:h-1 md:h-1.5 lg:h-2 bg-gradient-to-b from-base-content/30 to-base-content/50 rounded-b"></div>
                                                                <div className="w-1.5 sm:w-2 md:w-3 lg:w-4 h-0.5 sm:h-1 md:h-1.5 lg:h-2 bg-gradient-to-b from-base-content/30 to-base-content/50 rounded-b"></div>
                                                            </div>
                                                        </div>

                                                        {/* Hover effect - tooltip (visible only on larger screens) */}
                                                        <div className="absolute -top-6 sm:-top-8 inset-x-0 bg-base-300 rounded px-1 py-0.5 text-[0.5rem] sm:text-[0.6rem] text-center text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none border border-base-content/20 z-10 hidden sm:block">
                                                            R{rolIndex + 1}C{rowIndex + 1}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

