"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider"; // Corrected path

export default function SessionList() {
  // Get user and profile (which contains the role)
  const { user, userProfile, loading: authLoading } = useAuth(); 
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      // Wait for auth loading to finish and ensure user and profile are available
      if (authLoading) {
        setLoading(true);
        return;
      }
      if (!user || !userProfile) {
        setSessions([]);
        setLoading(false);
        setError(''); // Clear error if logged out
        return;
      }

      setLoading(true);
      setError(''); // Clear previous errors

      try {
        // Determine the role from the user profile
        const role = userProfile.role; // 'learner' or 'teacher'
        if (!role) {
          throw new Error("User role not found in profile.");
        }

        const response = await fetch(`/api/sessions?userId=${user.id}&role=${role}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const sessionsData = await response.json();
        
        // Convert scheduled_time string to Date object for display formatting
        const formattedSessions = sessionsData.map(s => ({
          ...s,
          scheduled_time: new Date(s.scheduled_time) 
        }));

        setSessions(formattedSessions);

      } catch (error) {
        console.error("Error fetching sessions:", error);
        setError(error.message || "Failed to fetch sessions.");
        setSessions([]); // Clear sessions on error
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();

    // No cleanup needed as we are not using subscriptions here
  }, [user, userProfile, authLoading]); // Re-fetch if user or profile changes

  if (loading || authLoading) {
    return <p className="text-gray-600">Loading sessions...</p>;
  }

  if (error) {
     return <p className="text-red-600">Error loading sessions: {error}</p>;
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg shadow-sm">
      {/* <h2 className="text-xl font-semibold text-gray-800 mb-4">My Sessions:</h2> */}
      {sessions.length > 0 ? (
        sessions.map((session) => (
          <div
            key={session.id}
            className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            {/* Title is not available, using ID or status */}
            <h3 className="font-medium text-gray-900">Session ID: {session.id}</h3> 
            <p className="text-sm text-gray-600 mt-1">
              Status: <span className={`font-medium ${session.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}`}>{session.status}</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Scheduled Time: {session.scheduled_time.toLocaleString()}
            </p>
            {/* Display learner/teacher based on current user's role */}
            {userProfile?.role === 'learner' ? (
              <p className="text-sm text-gray-500 mt-1">Teacher ID: {session.teacher_id}</p>
            ) : (
              <p className="text-sm text-gray-500 mt-1">Learner ID: {session.learner_id}</p>
            )}
          </div>
        ))
      ) : (
        <p className="text-gray-600">No sessions found.</p>
      )}
    </div>
  );
}
