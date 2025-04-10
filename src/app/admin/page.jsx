"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthProvider'; // To check admin status client-side (optional, middleware is primary)
import { useRouter } from 'next/navigation';

// Placeholder Admin Page
export default function AdminPage() {
  const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pendingAssessments, setPendingAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null); // Track which assessment is being updated

  // Redirect if not admin (client-side check as fallback/UX improvement)
  // Middleware should handle the primary security
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      // Check if profile loaded and user is not admin
      if (userProfile && !isAdmin) {
         console.warn("Non-admin user redirected from /admin");
         router.push('/dashboard'); 
      } else if (!user) {
         router.push('/login'); // Redirect if not logged in
      }
    }
  }, [user, userProfile, isAdmin, authLoading, router]);

  // Fetch pending assessments
  useEffect(() => {
    // Only fetch if confirmed admin
    if (!authLoading && isAdmin) {
      const fetchAssessments = async () => {
        setLoading(true);
        setError('');
        try {
          // Fetch from the GET endpoint we just created
          const response = await fetch('/api/assessments?status=pending'); 
          if (!response.ok) {
             // Handle specific auth errors differently?
             if (response.status === 401 || response.status === 403) {
                setError("Authorization failed. You might not be logged in as admin.");
                // Optionally redirect
                // router.push('/login');
                return; // Stop fetching
             }
            const errData = await response.json();
            throw new Error(errData.error || `HTTP Error: ${response.status}`);
          }
          const data = await response.json();
          setPendingAssessments(data || []);
        } catch (err) {
          console.error("Error fetching pending assessments:", err);
          setError(err.message || "Failed to load assessments.");
        } finally {
          setLoading(false);
        }
      };
      fetchAssessments();
    } else if (!authLoading && !isAdmin) {
       setLoading(false); // Not admin, stop loading
    }
  }, [isAdmin, authLoading]);

  const handleApproval = async (assessmentId, newStatus) => {
     if (!isAdmin) return; // Extra check
     setUpdatingId(assessmentId);
     setError('');
     try {
        // TODO: Create PATCH /api/assessments/[assessmentId] endpoint
        const response = await fetch(`/api/assessments/${assessmentId}`, {
           method: 'PATCH',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ status: newStatus }) // 'approved' or 'rejected'
        });
        if (!response.ok) {
           const errData = await response.json();
           throw new Error(errData.error || `HTTP Error: ${response.status}`);
        }
        // Remove from list on success
        setPendingAssessments(prev => prev.filter(a => a.id !== assessmentId));
     } catch (err) {
        console.error(`Error updating assessment ${assessmentId} to ${newStatus}:`, err);
        setError(err.message || `Failed to update assessment ${assessmentId}.`);
     } finally {
        setUpdatingId(null);
     }
  };

  // Render loading or redirect message if auth state isn't ready or user isn't admin
  if (authLoading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading or checking admin status...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Admin Panel - Pending Teacher Assessments</h1>

        {loading && <p>Loading assessments...</p>}
        {error && <p className="text-red-500 mb-4">Error: {error}</p>}

        {!loading && pendingAssessments.length === 0 && (
          <p className="text-gray-600">No pending assessments found.</p>
        )}

        {!loading && pendingAssessments.length > 0 && (
          <ul className="space-y-4">
            {pendingAssessments.map((assessment) => (
              <li key={assessment.id} className="p-4 border rounded-md flex justify-between items-center">
                <div>
                  <p><strong>User ID:</strong> {assessment.user_id}</p>
                  <p><strong>Language:</strong> {assessment.language}</p>
                  <p><strong>Submitted:</strong> {new Date(assessment.submitted_at).toLocaleString()}</p>
                  {/* TODO: Display quiz_data nicely */}
                  {/* <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-auto">
                    {JSON.stringify(assessment.quiz_data, null, 2)}
                  </pre> */}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleApproval(assessment.id, 'approved')}
                    disabled={updatingId === assessment.id}
                    className="bg-green-500 text-white py-1 px-3 rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    {updatingId === assessment.id ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleApproval(assessment.id, 'rejected')}
                    disabled={updatingId === assessment.id}
                    className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 disabled:opacity-50"
                  >
                     {updatingId === assessment.id ? '...' : 'Reject'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
