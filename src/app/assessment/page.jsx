"use client";
import { useState } from 'react';
import { useAuth } from '@/context/AuthProvider'; // To get user ID
import { useRouter } from 'next/navigation';

// Placeholder Assessment Page
export default function AssessmentPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [language, setLanguage] = useState('Spanish'); // Example language
  const [quizAnswers, setQuizAnswers] = useState({}); // Placeholder for answers
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    // Redirect if already a teacher? Or allow re-assessment? For now, allow.
    // if (!authLoading && userProfile?.role === 'teacher') {
    //   router.push('/dashboard');
    // }
  }, [user, userProfile, authLoading, router]);

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to submit an assessment.");
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    // TODO: Implement actual quiz questions and answer collection
    const placeholderQuizData = {
      q1: "Answer 1",
      q2: "Answer 2",
      language: language,
    };

    try {
      // TODO: Create this API endpoint
      const response = await fetch('/api/assessments', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id, // Make sure API doesn't rely on this if auth is checked server-side
          language: language,
          quizData: placeholderQuizData, 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      setMessage("Assessment submitted successfully! It will be reviewed by an admin.");
      // Optionally redirect or disable form
      // router.push('/dashboard'); 

    } catch (err) {
      console.error("Error submitting assessment:", err);
      setError(err.message || "Failed to submit assessment.");
    } finally {
      setSubmitting(false);
    }
  };
  
  if (authLoading) {
     return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
     // Should be redirected by useEffect, but show message just in case
     return <div className="min-h-screen flex items-center justify-center">Redirecting to login...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Teacher Assessment</h1>
        
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {message && <p className="text-green-600 text-center mb-4">{message}</p>}

        <form onSubmit={handleQuizSubmit} className="space-y-6">
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700">
              Language for Assessment
            </label>
            {/* TODO: Fetch available languages? */}
            <select 
              id="language" 
              name="language" 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option>Spanish</option>
              <option>French</option>
              <option>German</option> 
              {/* Add more languages */}
            </select>
          </div>

          {/* Placeholder for Quiz Questions */}
          <div className="p-4 border rounded bg-gray-50 text-center">
            <p className="text-gray-700 font-medium">Quiz Section</p>
            <p className="text-gray-500 text-sm mt-2">(Actual quiz questions will appear here)</p>
            {/* Example Question (replace with actual components) */}
             <div className="mt-4 text-left">
                <label className="block text-sm font-medium text-gray-700">Sample Question 1?</label>
                <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Your answer"/>
             </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Assessment'}
          </button>
        </form>
      </div>
    </div>
  );
}
