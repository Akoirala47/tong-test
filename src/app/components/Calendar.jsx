"use client";
import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useRouter } from "next/navigation";
// No longer need direct supabase client here
// import { supabase } from "@/supabase/supabase"; 
import "./Calendar.css";

export default function SessionCalendar({ userId, role }) {
  const [date, setDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true); // Added loading state
  const [error, setError] = useState('');     // Added error state
  const router = useRouter();

  useEffect(() => {
    // Only fetch if userId and role are provided
    if (!userId || !role) {
      setLoading(false);
      setError("User ID or role missing.");
      setSessions([]);
      return;
    }

    const fetchSessions = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/sessions?userId=${userId}&role=${role}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Format sessions: convert scheduled_time to Date and compute an endTime
        const sessionsData = data.map((session) => ({
          id: session.id,
          title: session.title || `Session ${session.id}`, // Use ID if title missing
          startTime: new Date(session.scheduled_time),
          // TODO: Add a 'duration' column to the DB schema? Defaulting to 1 hour for now.
          endTime: session.duration 
            ? new Date(new Date(session.scheduled_time).getTime() + session.duration * 60000) 
            : new Date(new Date(session.scheduled_time).getTime() + 60 * 60000), // Default 60 mins
          roomId: session.room_id, // Assuming room_id is added to schema later
          status: session.status,
        }));
        setSessions(sessionsData);
      } catch (err) {
        console.error("Error fetching sessions for calendar:", err);
        setError(err.message || "Failed to load schedule.");
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [userId, role]); // Re-fetch if userId or role changes

  const handleDateChange = (newDate) => {
    setDate(newDate);
  };

  // Filter sessions for the selected date (only show confirmed sessions on calendar?)
  // Let's show all for now, maybe add filtering later
  const sessionsForDate = sessions.filter(
    (session) => session.startTime.toDateString() === date.toDateString()
  );

  // Determine if the session is active
  const isSessionActive = (session) => {
    const now = new Date();
    return now >= session.startTime && now <= session.endTime;
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Your Scheduled Sessions</h2>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-1/2">
          <Calendar
            onChange={handleDateChange}
            value={date}
            className="custom-calendar"
            formatMonthYear={(locale, date) =>
              date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
            }
          />
        </div>
        <div className="lg:w-1/2">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            Sessions on{" "}
            {date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
          {loading ? (
             <p className="text-gray-600">Loading schedule...</p>
          ) : error ? (
             <p className="text-red-600">Error: {error}</p>
          ) : sessionsForDate.length > 0 ? (
            <ul className="space-y-2">
              {sessionsForDate.map((session) => (
                <li
                  key={session.id}
                  className="p-4 bg-gray-50 rounded-lg flex justify-between items-center border border-gray-200"
                >
                  <div>
                    <p className="font-medium text-gray-900">{session.title}</p> 
                    <p className="text-sm text-gray-700">
                      {session.startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {session.endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                     <p className="text-xs text-gray-500 mt-1">Status: {session.status}</p>
                  </div>
                  {/* Show Join button only for CONFIRMED and ACTIVE sessions */}
                  {session.status === 'confirmed' && isSessionActive(session) && session.roomId && (
                    <button
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={() => router.push(`/call/${session.roomId}`)}
                    >
                      Join Call
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No sessions scheduled for this date.</p>
          )}
        </div>
      </div>
    </div>
  );
}
