'use client'

import React, { useState, useEffect } from 'react';
import { Image, Video, Calendar, Sparkles, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { useSidebarStore } from '../store/useSidebarStore';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';

// Validation schema
const formSchema = z.object({
    message: z.string()
        .min(1, 'Message is required')
        .min(10, 'Message must be at least 10 characters')
        .max(150, 'Message must not exceed 150 characters'),
    messageType: z.enum(['announcement', 'reminder', 'alert'], {
        required_error: 'Message type is required'
    }),
    sendToWhatsApp: z.boolean().default(false),
    sendToGroupType: z.enum(['EVERYONE', 'ALL_STAFF'], {
        required_error: 'Group type is required'
    })
});

type FormData = z.infer<typeof formSchema>;

// Mock current user - in real app, this would come from auth context
const currentUser = {
    id: '1',
    name: 'Mayank Gupta',
    role: 'Principal',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face&auto=format'
};

interface CreateAnnouncementFormProps {
    onAnnouncementCreated?: () => void;
}

export default function CreateAnnouncementForm({ onAnnouncementCreated }: CreateAnnouncementFormProps) {
    const [showFullForm, setShowFullForm] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { isExpanded } = useSidebarStore();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        reset,
        trigger
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            message: '',
            messageType: 'announcement',
            sendToWhatsApp: false,
            sendToGroupType: 'EVERYONE'
        }
    });

    // Watch the message field to display character count
    const messageValue = watch('message') || '';
    const sendToWhatsApp = watch('sendToWhatsApp');

    // Check if we're on mobile
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (!token) return;
            const payload = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));
            const userRole = decodedPayload.role;
            const userId = decodedPayload.id;
            const userName = decodedPayload.name || decodedPayload.firstName + ' ' + decodedPayload.lastName;
            setUserRole(userRole);
            setUserId(userId);
            setUserName(userName);
        }

        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);

        try {

            // Create announcement (WhatsApp will be handled by this endpoint based on flag)
            const response = await fetch(`/api/announcement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: data.message,
                    messageType: data.messageType,
                    groupType: data.sendToGroupType,
                    senderId: userId,
                    sendToWhatsApp: data.sendToWhatsApp
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                toast.error(responseData.error || 'An error occurred');
            } else {
                // Handle success messages based on WhatsApp result
                if (data.sendToWhatsApp && responseData.whatsappResult) {
                    if (responseData.whatsappResult.success) {
                        toast.success('Announced & sent to WhatsApp!', {
                            icon: '🔔'
                        });
                    } else if (responseData.whatsappResult.attempted) {
                        toast.success('Announced!', {
                            icon: '🔔'
                        });
                    } else {
                        toast.success('Announced!)', {
                            icon: '🔔'
                        });
                    }
                } else {
                    toast.success('Announced!!!', {
                        icon: '🔔'
                    });
                }

                // Reset form and close modal on success
                reset();
                setShowFullForm(false);
                // Trigger refresh of announcement list
                if (onAnnouncementCreated) {
                    onAnnouncementCreated();
                }
            }
        } catch (error) {
            console.error('Error creating announcement:', error);
            toast.error('Failed to create announcement');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="flex justify-end">
                <Button variant="primary" outline className="w-full sm:w-auto" onClick={() => setShowFullForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Announcement
                </Button>
            </div>

            {/* Full Form Modal */}
            {showFullForm && (
                <>
                    {/* Full page backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 animate-in fade-in duration-200"
                        onClick={() => setShowFullForm(false)}
                    />

                    {/* Modal container positioned below navbar and beside sidebar */}
                    <div
                        className="fixed bg-transparent flex items-center justify-center z-50 animate-in fade-in duration-200"
                        style={{
                            top: '4rem', // Account for navbar height (64px)
                            left: isExpanded ? '16rem' : '4rem', // Account for sidebar width
                            right: '0',
                            bottom: '0'
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowFullForm(false);
                            }
                        }}
                    >
                        <div
                            className="bg-base-100 shadow-2xl overflow-y-auto border border-base-content/20
                                   w-[calc(100%-0.5rem)] max-h-[calc(100%-0.5rem)] m-1 p-4 rounded-md
                                   xs:w-[calc(100%-1rem)] xs:max-h-[calc(100%-1rem)] xs:m-2 xs:p-5 xs:rounded-lg
                                   sm:w-[calc(100%-2rem)] sm:max-h-[calc(100%-2rem)] sm:m-4 sm:p-6 sm:rounded-xl 
                                   md:w-[calc(100%-3rem)] md:max-h-[calc(100%-3rem)] md:m-6 md:rounded-2xl
                                   lg:w-[calc(100%-4rem)] lg:max-h-[calc(100%-4rem)] lg:m-8 lg:rounded-2xl
                                   xl:w-[calc(100%-6rem)] xl:max-w-4xl xl:max-h-[calc(100%-2rem)] xl:rounded-3xl
                                   2xl:w-[calc(100%-8rem)] 2xl:max-w-5xl 2xl:max-h-[calc(100%-1rem)]
                                   3xl:max-w-6xl 3xl:max-h-[calc(100%-0.5rem)]
                                   animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="font-bold text-lg sm:text-xl mb-4 text-base-content">Create Announcement</h3>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                {/* Message Content */}
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text text-base-content text-sm sm:text-base">
                                            Message <span className="text-error">*</span>
                                        </span>
                                        <span className="label-text-alt text-base-content/60">
                                            {messageValue.length}/150
                                        </span>
                                    </label>
                                    <textarea
                                        {...register('message')}
                                        className={`textarea textarea-bordered h-20 sm:h-32 text-base-content text-sm sm:text-base resize-none ${errors.message ? 'border-error' : ''
                                            }`}
                                        placeholder="Enter your message here... (10-150 characters)"
                                    />
                                    {errors.message && (
                                        <div className="label">
                                            <span className="label-text-alt text-error">
                                                {errors.message.message}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {/* send to group type and message type - flex layout */}
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="form-control flex-1">
                                        <label className="label">
                                            <span className="label-text text-base-content text-sm sm:text-base">
                                                Send to Group Type <span className="text-error">*</span>
                                            </span>
                                        </label>
                                        <select
                                            {...register('sendToGroupType')}
                                            className={`select select-bordered text-base-content text-sm sm:text-base ${errors.sendToGroupType ? 'border-error' : ''
                                                }`}
                                        >
                                            <option value="" disabled>Select group type</option>
                                            <option value="EVERYONE">All Students and Teachers</option>
                                            <option value="ALL_STAFF">All Staff No Students</option>
                                        </select>
                                    </div>

                                    <div className="form-control flex-1">
                                        <label className="label">
                                            <span className="label-text text-base-content text-sm sm:text-base">
                                                Message Type <span className="text-error">*</span>
                                            </span>
                                        </label>
                                        <select
                                            {...register('messageType')}
                                            className={`select select-bordered text-base-content text-sm sm:text-base ${errors.messageType ? 'border-error' : ''
                                                }`}
                                        >
                                            <option value="announcement">Announcement</option>
                                            <option value="reminder">Reminder</option>
                                            <option value="alert">Alert</option>
                                        </select>
                                        <div className="label">
                                            <span className="label-text-alt text-base-content/60">
                                                {watch('messageType') === 'announcement' && 'General information or updates'}
                                                {watch('messageType') === 'reminder' && 'Important reminders or deadlines'}
                                                {watch('messageType') === 'alert' && 'Urgent notifications requiring immediate attention'}
                                            </span>
                                        </div>
                                        {errors.messageType && (
                                            <div className="label">
                                                <span className="label-text-alt text-error">
                                                    {errors.messageType.message}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* WhatsApp Checkbox */}
                                {/* <div className="form-control">
                                <label className="label cursor-pointer justify-start gap-3">
                                    <input
                                        type="checkbox"
                                        {...register('sendToWhatsApp')}
                                        className="checkbox checkbox-primary"
                                    />
                                    <div className="flex items-center gap-2">
                                        <span className="label-text text-base-content text-sm sm:text-base">
                                            Send this update on WhatsApp
                                        </span>
                                    </div>
                                </label>
                                {sendToWhatsApp && (
                                    <div className="label">
                                        <span className="label-text-alt text-base-content/60 text-xs">
                                            This announcement will be sent to all registered WhatsApp numbers
                                        </span>
                                    </div>
                                )}
                            </div> */}

                                {/* Actions */}
                                <div className="modal-action justify-end pt-4">
                                    <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
                                        <Button
                                            outline
                                            variant="error"
                                            type="button"
                                            onClick={() => setShowFullForm(false)}
                                            className="w-full sm:w-auto min-w-[100px]"
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            outline
                                            variant="primary"
                                            type="submit"
                                            className="w-full sm:w-auto min-w-[100px]"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="loading loading-spinner loading-sm"></span>
                                                    Publishing...
                                                </>
                                            ) : (
                                                <>
                                                    {/* <Send className="w-4 h-4 mr-2" /> */}
                                                    Publish
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </>
    );
} 