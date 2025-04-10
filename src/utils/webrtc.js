// Removed Firestore imports as signaling is now handled via Supabase Realtime in VideoCall.js

// Configuration for the RTCPeerConnection
const peerConnectionConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add more STUN/TURN servers if needed, especially TURN for NAT traversal
  ]
};

/**
 * Initializes and returns a new RTCPeerConnection object.
 * @returns {RTCPeerConnection}
 */
export const initializePeerConnection = () => {
  try {
    const pc = new RTCPeerConnection(peerConnectionConfig);
    console.log("RTCPeerConnection initialized.");
    return pc;
  } catch (error) {
     console.error("Error creating RTCPeerConnection:", error);
     // Handle the error appropriately, maybe return null or throw
     return null; 
  }
};

// setupFirestoreSignaling function is removed as its logic is replaced by 
// Supabase Realtime channel handling within the VideoCall component itself.
