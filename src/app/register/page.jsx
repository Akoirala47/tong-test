// src/app/register/page.jsx
"use client";
import { useState } from 'react';
// Import the client creation utility from @supabase/ssr setup
import { createClient } from '@/utils/supabase/client'; 
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  // Create the client instance inside the component
  const supabase = createClient(); 
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'learner', // default role
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Added loading state
  const [message, setMessage] = useState(''); // Added message state for success/info

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading true
    setError(''); // Clear previous errors
    setMessage(''); // Clear previous messages
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          // Pass additional data to be stored in auth.users.user_metadata
          // This will be used by AuthProvider to create the profile row
          data: {
            display_name: formData.displayName,
            role: formData.role,
          }
        }
      });

      if (signUpError) throw signUpError;

      // Check if email confirmation is required
      if (data.user && data.user.identities && data.user.identities.length === 0) {
         setMessage('Registration successful! Please check your email to confirm your account.');
         // Don't redirect immediately, user needs to confirm email
         // router.push('/dashboard'); 
      } else if (data.user) {
         // If email confirmation is not required or already confirmed (e.g., social auth in future)
         setMessage('Registration successful! Redirecting...');
         // AuthProvider will handle profile creation and redirect eventually
         // router.push('/dashboard'); 
      } else {
         // Should not happen if no error, but handle defensively
         setMessage('Registration complete. Please login.');
      }

    } catch (error) {
      console.error("Registration error:", error);
      setError(error.message || 'An unexpected error occurred during registration.');
    } finally {
      setLoading(false); // Set loading false
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{message}</span>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <div className="mt-1">
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                I want to
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="learner">Learn a language</option>
                <option value="teacher">Teach a language</option> {/* Changed value to 'teacher' */}
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !!message} // Disable button while loading or if success message is shown
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Register'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                    Login
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
