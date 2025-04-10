"use client";
import { createContext, useContext, useState, useEffect } from "react";
// Import the client creation utility from @supabase/ssr setup
import { createClient } from '@/utils/supabase/client'; 

const AuthContext = createContext();

// Create the client instance once for the provider
const supabase = createClient(); 

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true); // Represents overall auth readiness

  useEffect(() => {
    console.log("Setting up Auth listener...");

    const { data: authListener } = supabase.auth.onAuthStateChange(
       (event, session) => { // REMOVED async here
        const currentUser = session?.user;
        setUser(currentUser ?? null);

        console.log("Auth Event:", event, "Session User:", currentUser);

        if (currentUser) {
          // User is logged in, fetch their profile (call async function)
          fetchUserProfile(currentUser.id).then(() => {
             // Set loading false AFTER profile fetch attempt completes
             setLoading(false); 
             console.log("Auth state determined: Logged in, profile fetch completed.");
          });
        } else {
          // User logged out
          setUserProfile(null);
          setLoading(false); // Set loading false for logged out state
          console.log("Auth state determined: Logged out.");
        }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      console.log("Cleaning up Auth listener.");
      authListener?.subscription.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Fetches the user profile - assumes the trigger created it on signup.
  // This function NO LONGER manages the main 'loading' state directly.
  const fetchUserProfile = async (userId) => {
    // setLoading(true); // REMOVED - Handled by the listener
    try {
      console.log(`Fetching profile for userId: ${userId}`);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // Handle potential errors during fetch
      if (error) {
        // Log error but don't necessarily throw if it's just 'No rows found'
        // as the trigger might have a slight delay in some edge cases, 
        // though ideally it should be synchronous enough.
        console.error("Error fetching profile:", error);
        setUserProfile(null); // Ensure profile is null on error
        // Consider specific handling for error.code === 'PGRST116' (No rows found)
        if (error.code === 'PGRST116') {
           console.warn(`Profile not found for user ${userId}. Trigger might have failed or is delayed.`);
        }
        // setUserProfile(null); // Already set in the catch block if needed
        // setLoading(false); // REMOVED - Handled by the listener
        return; // Exit function after handling error
      }

      // If data is successfully fetched
      if (data) {
        setUserProfile(data);
        console.log("Successfully fetched profile data:", data);
      } else {
         // This case should ideally not be reached if error handling above is correct
         console.warn(`Profile data for user ${userId} was null/undefined after fetch, though no error was thrown.`);
         setUserProfile(null);
      }
      // setLoading(false); // REMOVED - Handled by the listener

    } catch (catchError) {
      // Catch any unexpected errors during the try block
      console.error("Unexpected error in fetchUserProfile:", catchError);
      setUserProfile(null); // Reset profile on unexpected error
      // setLoading(false); // REMOVED - Handled by the listener
    } 
    // REMOVED finally block that set loading state
    console.log(`Finished profile fetch attempt for userId: ${userId}`);
  };


  const value = {
    user, // Supabase user object
    userProfile, // Profile from 'profiles' table
    loading, // Overall auth readiness state
    // Convenience booleans based on profile role
    isLearner: userProfile?.role === 'learner',
    isTeacher: userProfile?.role === 'teacher', 
     isAdmin: userProfile?.is_admin === true, 
  };

  // Log the value being provided to the context
  console.log("AuthProvider Context Value:", value); 

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
