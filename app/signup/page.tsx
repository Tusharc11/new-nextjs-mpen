'use client';

import React, { useState } from 'react';
import LoginPage from '../login/page';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: `${firstName} ${lastName}`, 
          email, 
          password 
        }),
      });

      if (response.ok) {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        router.push('/login');
      } else {
        const data = await response.json();
        alert(data.error || 'Sign-up failed');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred during sign-up');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="bg-base-200 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-base-content">Sign Up</h1>
        {/* <p className="text-sm text-base-content/70 mb-6 text-center">
          Free forever. No credit card needed.
        </p> */}

        <div className="space-y-4">
          <button className="btn btn-outline w-full">
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="w-5 h-5 mr-2"
            />
            Sign up with Google
          </button>

          <button className="btn btn-outline w-full">
            <img
              src="https://www.apple.com/favicon.ico"
              alt="Apple"
              className="w-5 h-5 mr-2"
            />
            Sign up with Apple
          </button>
        </div>

        <div className="divider text-xs text-base-content/70">OR</div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-base-content">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary bg-base-100 text-base-content"
                placeholder="John"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-base-content">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary bg-base-100 text-base-content"
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-base-content">
              Your E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary bg-base-100 text-base-content"
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-base-content">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-base-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary bg-base-100 text-base-content"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-primary focus:ring-primary border-base-300 rounded"
              required
            />
            <label className="ml-2 block text-sm text-base-content">
              I agree to all the <a href="#" className="text-primary">Term</a>,{' '}
              <a href="#" className="text-primary">Privacy Policy</a> and{' '}
              <a href="#" className="text-primary">Fees</a>.
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-content py-2 px-4 rounded-lg hover:bg-primary-focus focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Continue
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-base-content/70">
          Have an account?{' '}
          <a href="/login" className="text-primary hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}