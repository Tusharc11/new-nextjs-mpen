'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/app/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, ChevronDown } from 'lucide-react';


const formSchema = (isUpdate: boolean) => z.object({
  firstName: z.string()
    .transform(val => val.trim())
    .transform(val => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase())
    .refine(val => val.length > 0, "First name is required")
    .refine(val => val.length >= 2, "First name must be at least 2 characters long"),
  lastName: z.string()
    .transform(val => val.trim())
    .transform(val => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase())
    .refine(val => val.length > 0, "Last name is required")
    .refine(val => val.length >= 2, "Last name must be at least 2 characters long"),
  email: z.string()
    .transform(val => val.trim().toLowerCase())
    .refine(val => val.length > 0, "Email is required")
    .refine(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email address"),
  password: isUpdate ? z.string().optional() : z.string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Password is required")
    .refine(val => val.length >= 6, "Password must be at least 6 characters long"),
  address: z.string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Address is required")
    .refine(val => val.length >= 5, "Address must be at least 5 characters long"),
  dateJoined: z.string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Date joined is required"),
  dateOfBirth: z.string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Date of birth is required"),
  bloodGroup: z.string()
    .transform(val => val.trim())
    .optional(),
  gender: z.string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Gender is required"),
  phoneNumber: z.string()
    .transform(val => val.trim())
    .refine(val => val.length > 0, "Phone number is required")
    .refine(val => /^\+\d{1,4}\s\d{10}$/.test(val), "Phone number must be in format: +countrycode phonenumber"),
});


type FormData = z.infer<ReturnType<typeof formSchema>>;

interface Country {
  code: string;
  flag: string;
  name: string;
  cca2: string;
}

const validatePhoneInput = (input: string) => {
  // Only allow digits
  return input.replace(/\D/g, '');
};

const getFlagForCountryCode = (code: string, countries: Country[]) => {
  const country = countries.find(c => c.code === code);
  return country ? country.flag : '🇮🇳';
};

function AddStaffForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const staffRole = "STAFF";
  const isUpdate = !!id; // If `id` exists, it's an update, otherwise it's a new user
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clientOrganizationId, setClientOrganizationId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Calculate date limits for DOB (18-70 years old)
  const today = new Date();
  const maxBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  const minBirthDate = new Date(today.getFullYear() - 70, today.getMonth(), today.getDate()).toISOString().split('T')[0];

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema(isUpdate)),
  });


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));
      const userRole = decodedPayload.role;
      const clientOrganizationId = decodedPayload.clientOrganizationId;
      setUserRole(userRole);
      setClientOrganizationId(clientOrganizationId);
    }


    if (id) {
      const fetchUserData = async () => {
        try {
          const response = await fetch(`/api/manage-staff?id=${id}&clientOrganizationId=${clientOrganizationId}`);
          if (!response.ok) throw new Error('Failed to fetch user data');
          const data = await response.json();

          setValue("firstName", data.firstName || '');
          setValue("lastName", data.lastName || '');
          setValue("email", data.email || '');
          setValue("address", data.address || '');
          setValue("dateJoined", new Date(data.dateJoined).toISOString().split('T')[0]);
          setValue("dateOfBirth", new Date(data.dateOfBirth).toISOString().split('T')[0]);
          setValue("bloodGroup", data.bloodGroup || '');
          setValue("gender", data.gender || '');
          
          // Handle phone number with country code
          if (data.phoneNumber) {
            if (data.phoneNumber.includes(" ")) {
              const [code, number] = data.phoneNumber.split(" ");
              setCountryCode(code);
              setPhoneNumber(number);
              setValue("phoneNumber", data.phoneNumber);
            } else {
              // Legacy format without country code, assume India
              setPhoneNumber(data.phoneNumber);
              setValue("phoneNumber", `+91 ${data.phoneNumber}`);
            }
          }

        } catch (error) {
        }
      };
      fetchUserData();
    }
  }, [id, setValue]);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCountryDropdown) {
        setShowCountryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryDropdown]);

  // Fetch countries for phone number dropdown
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,flags,idd,cca2');
        if (!response.ok) {
          throw new Error('Failed to fetch countries');
        }

        const data: any[] = await response.json();

        const formattedCountries = data
          .filter(country => country.idd.root)
          .map(country => {
            const suffix = country.idd.suffixes && country.idd.suffixes.length > 0 ? country.idd.suffixes[0] : '';
            const code = `${country.idd.root}${suffix}`;

            return {
              code,
              flag: country.flag,
              name: country.name.common,
              cca2: country.cca2
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        setCountries(formattedCountries);
      } catch (error) {
        toast.error('Error fetching countries');
      }
    };

    fetchCountries();
  }, []);

  // Handle phone number change
  const handlePhoneChange = (value: string) => {
    const cleanedValue = validatePhoneInput(value);
    setPhoneNumber(cleanedValue);
    
    if (cleanedValue.length === 10) {
      const fullPhoneNumber = `${countryCode} ${cleanedValue}`;
      setValue("phoneNumber", fullPhoneNumber);
    } else {
      setValue("phoneNumber", "");
    }
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {

    const method = id ? 'PUT' : 'POST';
    const userData = id ? { ...data, id } : {
      ...data,
      role: staffRole
    };
    const response = await fetch(`/api/manage-staff${id ? `?id=${id}` : ''}`, {

      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      toast.error(responseData.error || 'An error occurred');
    } else {
      toast.success(id ? 'Staff member updated successfully!' : 'Staff member created successfully!');
      router.push('/manage-staff');
    }
  };

  return (
    <div className="flex flex-col w-full p-6 bg-base-100 h-full overflow-y-auto">
      <div className="card bg-base-300 border border-base-content/20 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-base-content mb-6">{id ? 'Update Staff Member' : 'Add New Staff Member'}</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">First Name<span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  {...register("firstName")}
                  className={`input input-bordered w-full bg-base-100 text-base-content ${errors.firstName ? 'input-error' : ''}`}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.firstName.message}</span>
                  </label>
                )}
              </div>

              {/* Last Name */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Last Name<span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  {...register("lastName")}
                  className={`input input-bordered w-full bg-base-100 text-base-content ${errors.lastName ? 'input-error' : ''}`}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.lastName.message}</span>
                  </label>
                )}
              </div>

              {/* Email */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Email<span className="text-error">*</span></span>
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  {...register("email")}
                  required
                  className={`input input-bordered w-full bg-base-100 text-base-content ${id ? 'cursor-not-allowed' : ''} ${errors.email ? 'input-error' : ''}`}
                  disabled={!!id}
                />
                {errors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.email.message}</span>
                  </label>
                )}
              </div>

              {/* Password */}
              {!id && (
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text text-base-content">Password<span className="text-error">*</span></span>
                  </label>
                  <input
                    type={id ? "password" : "text"}
                    {...register("password")}
                    className={`input input-bordered w-full bg-base-100 text-base-content ${errors.password ? 'input-error' : ''}`}
                    placeholder="Enter password"
                  />
                  {errors.password && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.password.message}</span>
                    </label>
                  )}
                </div>
              )}

              {/* Date Joined */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Date Joined<span className="text-error">*</span></span>
                </label>
                <input
                  type="date"
                  {...register("dateJoined")}
                  className={`input input-bordered w-full bg-base-100 text-base-content ${errors.dateJoined ? 'input-error' : ''}`}
                  placeholder="Enter date joined"
                />
                {errors.dateJoined && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.dateJoined.message}</span>
                  </label>
                )}
              </div>

              {/* Date of Birth */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Date of Birth<span className="text-error">*</span></span>
                </label>
                <input
                  type="date"
                  {...register("dateOfBirth")}
                  min={minBirthDate}
                  max={maxBirthDate}
                  className={`input input-bordered w-full bg-base-100 text-base-content ${errors.dateOfBirth ? 'input-error' : ''}`}
                  placeholder="Enter date of birth"
                />
                {errors.dateOfBirth && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.dateOfBirth.message}</span>
                  </label>
                )}
              </div>

              {/* Phone Number */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Phone Number<span className="text-error">*</span></span>
                </label>
                <div className="flex items-center w-full">
                  <div className="relative">
                    <button
                      type="button"
                      className="flex items-center gap-1 border rounded-l-md px-3 py-3 bg-base-200 text-base-content border-base-300 h-12"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    >
                      <span>{getFlagForCountryCode(countryCode, countries)}</span>
                      <span>{countryCode}</span>
                      <ChevronDown size={16} />
                    </button>

                    {showCountryDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-72 bg-base-100 shadow-lg rounded-md z-50 max-h-60 overflow-y-auto border border-base-300">
                        <div className="p-2 sticky top-0 bg-base-100 border-b border-base-300">
                          <input
                            type="text"
                            placeholder="Search countries..."
                            className="input input-bordered input-sm w-full bg-base-100 text-base-content"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {countries
                          .filter(country =>
                            country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                            country.code.includes(countrySearch)
                          )
                          .map(country => (
                            <button
                              key={country.code + country.name}
                              type="button"
                              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-base-200 text-left text-base-content"
                              onClick={() => {
                                setCountryCode(country.code);
                                setShowCountryDropdown(false);
                                setCountrySearch("");
                                // Update phone number with new country code
                                if (phoneNumber.length === 10) {
                                  setValue("phoneNumber", `${country.code} ${phoneNumber}`);
                                }
                              }}
                            >
                              <span>{country.flag}</span>
                              <span className="flex-1 truncate">{country.name}</span>
                              <span className="text-base-content/60 text-sm">{country.code}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  <input
                    ref={phoneInputRef}
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className={`input input-bordered flex-1 rounded-l-none bg-base-100 text-base-content border-base-300 ${errors.phoneNumber ? 'input-error' : ''}`}
                    placeholder="10-digit phone number"
                    maxLength={10}
                  />
                </div>
                {phoneNumber.length > 0 && phoneNumber.length < 10 && (
                  <label className="label">
                    <span className="label-text-alt text-error">Please enter a valid 10-digit phone number</span>
                  </label>
                )}
                {errors.phoneNumber && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.phoneNumber.message}</span>
                  </label>
                )}
              </div>

              {/* Gender */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Gender<span className="text-error">*</span></span>
                </label>
                <select
                  {...register("gender")}
                  className={`select select-bordered w-full bg-base-100 text-base-content ${errors.gender ? 'select-error' : ''}`}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                {errors.gender && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.gender.message}</span>
                  </label>
                )}
              </div>

              {/* Blood Group */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Blood Group</span>
                </label>
                <select
                  {...register("bloodGroup")}
                  className={`select select-bordered w-full bg-base-100 text-base-content ${errors.bloodGroup ? 'select-error' : ''}`}
                >
                  <option value="">Select blood group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
                {errors.bloodGroup && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.bloodGroup.message}</span>
                  </label>
                )}
              </div>

              {/* Address */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text text-base-content">Address<span className="text-error">*</span></span>
                </label>
                <textarea
                  {...register("address")}
                  className={`textarea textarea-bordered w-full bg-base-100 text-base-content h-24 ${errors.address ? 'textarea-error' : ''}`}
                  placeholder="Enter address"
                />
                {errors.address && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.address.message}</span>
                  </label>
                )}
              </div>

            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="error"
                outline
                onClick={() => router.push('/manage-staff')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                outline
              >
                {id ? 'Update Staff Member' : 'Add Staff Member'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AddStaffPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-base-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-base-content">Loading Staff...</p>
        </div>
      </div>
    }>
      <AddStaffForm />
    </Suspense>
  );
}