"use client";

import { useState, useEffect } from "react";
// Import the client creation utility from @supabase/ssr setup
import { createClient } from '@/utils/supabase/client'; 
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider"; 

export default function Login() {
  // Create the client instance inside the component
  const supabase = createClient(); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); // Get user and loading state from context

  // Redirect if user is already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(""); // Clear previous errors
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      // AuthProvider will handle profile creation/fetching and redirect
      // router.push("/dashboard"); // No longer needed here
    } catch (error) {
      console.error("Email login error:", error);
      setError(error.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(""); // Clear previous errors
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Optional: Add redirect URL if needed, otherwise Supabase defaults work
          // redirectTo: `${window.location.origin}/auth/callback` 
        }
      });
      if (oauthError) throw oauthError;
      // Supabase handles the redirect flow for OAuth
      // router.push("/dashboard"); // No longer needed here
    } catch (error) {
      console.error("Google login error:", error);
      setError(error.message || "Error signing in with Google. Please try again.");
    } finally {
      // Keep loading true for OAuth as redirect happens
      // setLoading(false); 
    }
  };

  // Don't render the form if auth is still loading or user is logged in
  if (authLoading || user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>; 
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4"> {/* Updated background color */}
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-quizlet-blue text-center mb-8">Tong</h1>
        
        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg p-3 mb-6 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          <span className="text-gray-700 font-medium">Continue with Google</span>
        </button>

        <div className="flex items-center mb-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-gray-500 text-sm">or</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-quizlet-blue focus:border-quizlet-blue outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-quizlet-blue focus:border-quizlet-blue outline-none transition"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-quizlet-blue text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Don't have an account?{" "}
          <a 
            href="/register" // Changed from /signup to /register
            className="text-quizlet-blue hover:text-blue-800 font-medium transition-colors"
          >
            Sign up here
          </a>
        </p>
      </div>
    </div>
  );
}
