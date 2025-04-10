"use client";

// import { useAuth } from "../../context/AuthProvider"; // Remove duplicate/old path
import { useAuth } from "@/context/AuthProvider"; // Keep correct path
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabase/supabase"; // Import Supabase client
// import { signOut } from "firebase/auth"; // Remove Firebase import
// import { auth } from "@/fb/firebase"; // Remove Firebase import
import SessionList from "../components/SessionList";
import SessionCalendar from "../components/Calendar"; // Assuming this doesn't use Firebase directly
import CreateSessionRequest from "../components/CreateSessionRequest";
import SessionRequests from "../components/SessionRequests";

export default function Dashboard() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("learner");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Determine initial tab based on user role from profile
  useEffect(() => {
    if (userProfile) {
      setActiveTab(userProfile.role || 'learner'); // Default to learner if role is missing
    }
  }, [userProfile]);

  const handleLogout = async () => {
    try {
      // Clear local state if needed
      setActiveTab(null); 
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // AuthProvider will handle clearing user state
      // Redirect is handled by the effect checking for !user
      // router.push("/login"); // No longer needed here
    } catch (error) {
      console.error("Error signing out: ", error);
      // Optionally show an error message to the user
    }
  };

  // --- Refactored Rendering Logic ---
  // Always return the main layout structure.
  // Conditionally render content inside based on loading/user state.

  // Log state just before returning JSX
  console.log("Dashboard rendering:", { loading, user, userProfile });

  return (
    <div className="min-h-screen bg-gray-100 p-8"> 
      <div className="max-w-6xl mx-auto">
        {loading ? (
          // Show loading indicator if context is loading
          <div className="flex items-center justify-center pt-20">
             <p className="text-gray-700">Loading Dashboard...</p>
          </div>
        ) : !user ? (
          // Show message if no user (should be redirecting via useEffect)
           <div className="flex items-center justify-center pt-20">
             <p className="text-gray-700">Redirecting...</p>
           </div>
        ) : (
          // User is loaded and exists, render the actual dashboard content
          <>
            {/* Top Welcome/Info Box */}
            <div className="bg-white p-8 rounded-lg shadow-md mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-quizlet-blue">
                Welcome, {userProfile?.display_name || user?.email}! {/* Use display_name from profile */}
              </h1>
              <p className="mt-2 text-gray-700">
                Role: <span className="font-medium capitalize">{userProfile?.role || 'N/A'}</span>
              </p>
               {/* Simple description based on role */}
               <p className="mt-1 text-gray-600">
                 {userProfile?.role === 'teacher' 
                   ? "Manage your schedule and session requests." 
                   : "Request sessions and view your schedule."}
               </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
          
          {/* Tab Switching - Only show if both roles are possible? Or simplify based on user's actual role */}
          {/* For now, keep tabs but default based on role */}
          <div className="mt-6 border-b border-gray-200">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab("learner")}
                className={`py-2 font-medium ${
                  activeTab === "learner"
                    ? "text-quizlet-blue border-b-2 border-quizlet-blue"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Learner Dashboard
              </button>
              <button
                onClick={() => setActiveTab("teacher")} // Use 'teacher' role name
                className={`py-2 font-medium ${
                  activeTab === "teacher"
                    ? "text-blue-600 border-b-2 border-blue-600" // Updated color
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Teacher Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Render content based on the ACTIVE TAB */}
        {/* Learner Tab Content */}
        {activeTab === 'learner' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* Only show request form if user is actually a learner */}
             {userProfile?.role === 'learner' && (
               <div className="bg-white p-6 rounded-lg shadow">
                 <h2 className="text-xl font-semibold mb-4 text-gray-900">Request New Session</h2>
                 <CreateSessionRequest userId={user.id} /> 
               </div>
             )}
             {/* Session List and Calendar are relevant for both roles */}
             <div className="bg-white p-6 rounded-lg shadow col-span-1 lg:grid-cols-2"> {/* Adjusted grid span */}
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Request New Session</h2>
              {/* Pass Supabase user ID */}
              <CreateSessionRequest userId={user.id} /> 
            </div>
             <div className="bg-white p-6 rounded-lg shadow col-span-1 lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">My Sessions</h2>
              <SessionList /> 
            </div>
             <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Your Schedule</h2>
              {/* Pass the actual role for calendar filtering */}
              <SessionCalendar userId={user.id} role={userProfile?.role} /> 
            </div>
          </div>
        )}

        {/* Teacher Tab Content */}
        {activeTab === 'teacher' && (
           <>
             {/* If user IS a teacher, show teacher tools */}
             {userProfile?.role === 'teacher' && (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white p-6 rounded-lg shadow">
                   <h2 className="text-xl font-semibold mb-4 text-gray-900">Pending Session Requests</h2>
                   <SessionRequests /> 
                 </div>
                 <div className="bg-white p-6 rounded-lg shadow col-span-1 lg:grid-cols-2"> {/* Adjusted grid span */}
                   <h2 className="text-xl font-semibold mb-4 text-gray-900">My Sessions</h2>
                   <SessionList /> 
                 </div>
                 <div className="bg-white p-6 rounded-lg shadow">
                   <h2 className="text-xl font-semibold mb-4 text-gray-900">Your Schedule</h2>
                   <SessionCalendar userId={user.id} role="teacher" />
                 </div>
               </div>
             )}
             {/* If user is NOT a teacher, show assessment button */}
             {userProfile?.role !== 'teacher' && (
               <div className="bg-white p-6 rounded-lg shadow text-center">
                 <h2 className="text-xl font-semibold mb-4 text-gray-900">Become a Teacher</h2>
                 <p className="text-gray-600 mb-4">
                   Interested in sharing your language skills? Take our assessment to become a certified teacher on Tong!
                 </p>
                 <button 
                   onClick={() => router.push('/assessment')} // TODO: Create /assessment route
                   className="bg-green-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
                 >
                   Take Assessment
                 </button>
               </div>
             )}
           </>
        )}

        {/* Fallback if role is somehow invalid or tab is unexpected */}
             {/* Fallback if role is somehow invalid or tab is unexpected */}
             {/* {userProfile && userProfile.role !== 'learner' && userProfile.role !== 'teacher' && (
                <p className="text-center text-gray-600">Dashboard view for role '{userProfile.role}' is not implemented.</p>
             )} */}
           </>
        )}
      </div>
    </div>
  );
}
