"use client";
import { useState, useEffect } from 'react';
import { useAuth } from "@/context/AuthProvider"; // Corrected path

// This component is intended for teachers ('teacher' role)
export default function SessionRequests() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState([]); // Will hold sessions with status 'requested'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null); // Track which request is being updated

  useEffect(() => {
    const fetchRequests = async () => {
      if (authLoading) {
        setLoading(true);
        return;
      }
      // Only fetch if user is logged in and is a teacher
      if (!user || !userProfile || userProfile.role !== 'teacher') {
        setRequests([]);
        setLoading(false);
        setError(userProfile && userProfile.role !== 'teacher' ? 'Access denied: Teachers only.' : '');
        return;
      }

      setLoading(true);
      setError('');

      try {
        // Fetch all sessions where the current user is the teacher
        const response = await fetch(`/api/sessions?userId=${user.id}&role=teacher`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const sessionsData = await response.json();
        
        // Filter for sessions with status 'requested' client-side
        const pendingRequests = sessionsData
          .filter(s => s.status === 'requested')
          .map(s => ({
            ...s,
            scheduled_time: new Date(s.scheduled_time) // Convert to Date object
          }));

        setRequests(pendingRequests);

      } catch (error) {
        console.error("Error fetching session requests:", error);
        setError(error.message || "Failed to fetch session requests.");
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
    // No real-time updates for now
  }, [user, userProfile, authLoading]);

  const handleAccept = async (requestId) => {
    if (!user || !userProfile || userProfile.role !== 'teacher') return;
    
    setUpdatingId(requestId); // Indicate loading for this specific request
    setError('');

    try {
      // Call the new PATCH endpoint (to be created)
      const response = await fetch(`/api/sessions/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'confirmed' }), // Update status to confirmed
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Update the UI by removing the accepted request from the list
      setRequests(prevRequests => prevRequests.filter(req => req.id !== requestId));

    } catch (error) {
      console.error("Error accepting request:", error);
      setError(`Failed to accept request ${requestId}: ${error.message}`);
    } finally {
      setUpdatingId(null); // Reset loading indicator
    }
  };

  if (loading || authLoading) {
    return <p className="text-gray-600">Loading requests...</p>;
  }

   if (error && requests.length === 0) { // Show general error only if list is empty
     return <p className="text-red-600">Error loading requests: {error}</p>;
  }

  // Ensure component only renders content if the user is a teacher
  if (!userProfile || userProfile.role !== 'teacher') {
     return <p className="text-gray-600">{error || 'No requests to display.'}</p>;
  }


  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg shadow-sm">
       <h2 className="text-xl font-semibold text-gray-800 mb-4">Pending Session Requests:</h2>
       {error && <p className="text-red-600 mb-4">Error updating request: {error}</p>} {/* Show update errors */}
      {requests.map((request) => (
        <div key={request.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Display relevant info from scheduled_sessions */}
          <p className="text-sm text-gray-700">
            Requested Time: {request.scheduled_time.toLocaleString()}
          </p>
           <p className="text-sm text-gray-500 mt-1">Learner ID: {request.learner_id}</p>
          <button
              onClick={() => handleAccept(request.id)}
              disabled={updatingId === request.id} // Disable button while updating this specific request
              className="mt-2 bg-green-500 text-white py-1 px-3 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {updatingId === request.id ? 'Accepting...' : 'Accept Request'}
            </button>
        </div>
      ))}
      {requests.length === 0 && !loading && (
        <p className="text-gray-600">No pending session requests.</p>
      )}
    </div>
  );
}
