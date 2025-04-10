"use client";
import { useState, useEffect } from 'react'; // Import useEffect

// Assuming userId is passed correctly, e.g., from useAuth() in the parent component
export default function CreateSessionRequest({ userId }) {
  const [teachers, setTeachers] = useState([]); // State for teacher list
  const [selectedTeacherId, setSelectedTeacherId] = useState(''); // State for selected teacher
  const [sessionRequest, setSessionRequest] = useState({
    date: '',
    time: '',
    // duration: 60, // Duration not used by current API
  });
  const [error, setError] = useState(''); // Added error state
  const [loading, setLoading] = useState(false); 
  const [message, setMessage] = useState(''); 
  const [fetchTeachersError, setFetchTeachersError] = useState(''); // Error state for fetching teachers

  // Fetch teachers on component mount
  useEffect(() => {
    const fetchTeachers = async () => {
      setFetchTeachersError(''); // Clear previous errors
      try {
        const response = await fetch('/api/teachers');
        if (!response.ok) {
          throw new Error(`Failed to fetch teachers: ${response.statusText}`);
        }
        const data = await response.json();
        setTeachers(data || []);
        if (data && data.length > 0) {
          setSelectedTeacherId(data[0].id); // Default to the first teacher
        }
      } catch (error) {
        console.error("Error fetching teachers:", error);
        setFetchTeachersError(error.message || "Could not load teacher list.");
      }
    };

    fetchTeachers();
  }, []); // Empty dependency array ensures this runs only once

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Use the selectedTeacherId from state
    const expertId = selectedTeacherId; 

    if (!userId) {
        setError('User ID is missing. Cannot request session.');
        setLoading(false);
        return;
    }
    
    if (!expertId) {
      setError('Please select a teacher.');
      setLoading(false);
      return;
    }

    if (!sessionRequest.date || !sessionRequest.time) {
      setError('Please select a date and time.');
      setLoading(false);
      return;
    }

    const startTime = new Date(`${sessionRequest.date}T${sessionRequest.time}`);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          learnerId: userId,
          expertId: expertId, // Use the placeholder or actual ID
          startTime: startTime.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const newSession = await response.json();
      setMessage(`Session requested successfully! (ID: ${newSession.id})`);
      // Reset form fields used
      setSessionRequest({ date: '', time: '' });
    } catch (error) {
      console.error("Error creating session request:", error);
      setError(error.message || "Failed to request session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg shadow bg-white">
      <h3 className="text-lg font-medium leading-6 text-gray-900">Request a New Session</h3>
       {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{message}</span>
        </div>
      )}
      
      {/* Teacher Selection Dropdown */}
      <div>
        <label htmlFor="teacher" className="block text-sm font-medium text-gray-700">Select Teacher</label>
        <select
          id="teacher"
          name="teacher"
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 disabled:opacity-50"
          disabled={teachers.length === 0 || loading} // Disable if no teachers or loading
          required
        >
          <option value="" disabled>-- Select a Teacher --</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.display_name || teacher.id} {/* Fallback to ID if name is missing */}
            </option>
          ))}
        </select>
        {fetchTeachersError && <p className="mt-1 text-sm text-red-600">{fetchTeachersError}</p>}
        {teachers.length === 0 && !fetchTeachersError && <p className="mt-1 text-sm text-gray-500">Loading teachers...</p>}
      </div>

      {/* Title input removed as it's not used by the API */}
      {/* <div>
        <label className="block text-sm font-medium text-gray-700">Session Title (Optional)</label>
        <input
          type="text"
          value={sessionRequest.title}
          onChange={(e) => setSessionRequest(prev => ({ ...prev, title: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 placeholder-gray-400 text-gray-900"
          placeholder="Brief description (e.g., Conversational Practice)"
        />
      </div> */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={sessionRequest.date}
            onChange={(e) => setSessionRequest(prev => ({ ...prev, date: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 placeholder-gray-400 text-gray-900"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Time</label>
          <input
            type="time"
            value={sessionRequest.time}
            onChange={(e) => setSessionRequest(prev => ({ ...prev, time: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 placeholder-gray-400 text-gray-900"
            required
          />
        </div>
      </div>
      {/* Duration select removed as it's not used by the API */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? 'Requesting...' : 'Request Session'}
      </button>
    </form>
  );
}
