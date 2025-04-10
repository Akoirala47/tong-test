"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/supabase/supabase"; // Import Supabase client
import { initializePeerConnection } from "@/utils/webrtc"; // Keep this utility

export default function VideoCall({ roomId }) {
  const [pc, setPc] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isWebcamStarted, setIsWebcamStarted] = useState(false);
  const [supabaseChannel, setSupabaseChannel] = useState(null); // State for Supabase channel

  // Initialize PeerConnection and setup signaling on mount
  useEffect(() => {
    if (!roomId) return;
    
    console.log(`Initializing call for room: ${roomId}`);
    // Ensure PeerConnection is only initialized once per roomId change
    let peerConnection = initializePeerConnection();
    setPc(peerConnection);

    // --- Supabase Realtime Setup ---
    const channelName = `room-${roomId}`;
    console.log(`Setting up Supabase channel: ${channelName}`);
    const channel = supabase.channel(channelName, {
      config: {
        // Presence can be useful to know if the other user is connected
        presence: { 
          key: `user-${Date.now()}-${Math.random().toString(16).slice(2)}` // More unique key
        } 
      }
    });

    // Define handlers before subscribing
    const handleOffer = ({ payload }) => {
      console.log('Received offer:', payload);
      if (peerConnection && payload.offer) {
         handleReceivedOffer(payload.offer, peerConnection); // Pass pc instance
      }
    };
    const handleAnswer = ({ payload }) => {
       console.log('Received answer:', payload);
      if (peerConnection && payload.answer && !peerConnection.currentRemoteDescription) {
         peerConnection.setRemoteDescription(new RTCSessionDescription(payload.answer))
           .catch(e => console.error("Error setting remote description (answer):", e));
      }
    };
    const handleCandidate = ({ payload }) => {
      console.log('Received candidate:', payload);
      if (peerConnection && payload.candidate) {
        peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate))
          .catch(e => {
             // Ignore benign errors like candidate already added or state preventing addition
             if (!e.message.includes('already been gathered') && !e.message.includes('invalid state')) {
                console.error("Error adding received ICE candidate:", e);
             }
          });
      }
    };
    const handleHangup = () => {
      console.log('Received hangup signal');
      cleanupCall(channel, peerConnection); // Pass current channel and pc
    };
    const handlePresenceSync = () => {
      console.log('Presence sync:', channel.presenceState());
      // You could check here if the other user is present
    };
     const handlePresenceJoin = ({ key, newPresences }) => {
        console.log('Presence join:', key, newPresences);
      };
     const handlePresenceLeave = ({ key, leftPresences }) => {
        console.log('Presence leave:', key, leftPresences);
      };

    channel
      .on('presence', { event: 'sync' }, handlePresenceSync)
      .on('presence', { event: 'join' }, handlePresenceJoin)
      .on('presence', { event: 'leave' }, handlePresenceLeave)
      .on('broadcast', { event: 'offer' }, handleOffer)
      .on('broadcast', { event: 'answer' }, handleAnswer)
      .on('broadcast', { event: 'candidate' }, handleCandidate)
      .on('broadcast', { event: 'hangup' }, handleHangup)
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to Supabase channel: ${channelName}`);
          setSupabaseChannel(channel);
          // Optional: Track presence state after successful subscription
          // channel.track({ online_at: new Date().toISOString() }); 
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to channel ${channelName}:`, err);
        } else if (status === 'TIMED_OUT') {
           console.warn(`Subscription timed out for channel ${channelName}`);
        } else {
           console.log(`Channel status [${channelName}]: ${status}`);
        }
      });
      
    // --- End Supabase Realtime Setup ---

    // Setup PeerConnection event listeners
    peerConnection.ontrack = (event) => {
      console.log("Received remote track");
      if (remoteVideoRef.current) {
         remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && channel?.state === 'joined') { // Check if channel is ready
        console.log("Sending ICE candidate:", event.candidate.type, event.candidate.sdpMLineIndex);
        channel.send({
          type: 'broadcast',
          event: 'candidate',
          payload: { candidate: event.candidate.toJSON() },
        }).catch(e => console.error("Error sending ICE candidate:", e));
      }
    };
    peerConnection.onicecandidateerror = (error) => {
       console.error("ICE candidate error:", error);
    };
    peerConnection.onconnectionstatechange = () => {
       console.log("PeerConnection state:", peerConnection.connectionState);
       if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'closed') {
          console.warn(`PeerConnection state is ${peerConnection.connectionState}. Cleaning up.`);
          // Consider attempting renegotiation or just cleaning up
          // cleanupCall(channel, peerConnection); // Be cautious with auto-cleanup on disconnect
       }
    };

    // Cleanup function
    return () => {
      console.log(`Cleaning up effect for room: ${roomId}`);
      cleanupCall(channel, peerConnection); // Pass channel and pc to cleanup
    };

  }, [roomId]); // Rerun if roomId changes


  const startWebcam = async () => {
     console.log("Starting webcam...");
     if (!pc) {
        console.error("PeerConnection not initialized. Cannot start webcam.");
        return;
     }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
         localVideoRef.current.srcObject = stream;
      }
      // Add tracks to the existing PeerConnection
      stream.getTracks().forEach((track) => {
         // Check if track already exists before adding
         if (!pc.getSenders().find(sender => sender.track?.id === track.id)) {
           pc.addTrack(track, stream);
           console.log(`Added track: ${track.kind}`);
         }
      });
      setIsWebcamStarted(true);
      console.log("Webcam started successfully.");
    } catch (error) {
      console.error("Error starting webcam:", error);
    }
  };

  // Initiates the call by creating and sending an offer
  const startCall = async () => {
    if (!pc || !isWebcamStarted || !supabaseChannel || supabaseChannel.state !== 'joined') {
       console.warn("Cannot start call: PC, webcam, or channel not ready.");
       return;
    }
    console.log("Starting call (creating offer)...");
    try {
      // Ensure tracks are added before creating offer if webcam started after PC init
      if (localVideoRef.current?.srcObject) {
         localVideoRef.current.srcObject.getTracks().forEach(track => {
            if (!pc.getSenders().find(sender => sender.track?.id === track.id)) {
               pc.addTrack(track, localVideoRef.current.srcObject);
               console.log(`Re-added track before offer: ${track.kind}`);
            }
         });
      }

      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);
      
      console.log("Sending offer via Supabase channel");
      await supabaseChannel.send({
        type: 'broadcast',
        event: 'offer',
        payload: { offer: pc.localDescription.toJSON() }, // Send full description
      });
       console.log("Offer sent.");
    } catch (error) {
       console.error("Error creating or sending offer:", error);
    }
  };

  // Handles an offer received from the other peer
  const handleReceivedOffer = async (offer, currentPc) => {
     if (!currentPc || !isWebcamStarted || !supabaseChannel || supabaseChannel.state !== 'joined') {
       console.warn("Cannot handle received offer: PC, webcam, or channel not ready.");
       return;
     }
     console.log("Handling received offer...");
     try {
        // Ensure tracks are added before setting remote description/creating answer
        if (localVideoRef.current?.srcObject) {
           localVideoRef.current.srcObject.getTracks().forEach(track => {
              if (!currentPc.getSenders().find(sender => sender.track?.id === track.id)) {
                 currentPc.addTrack(track, localVideoRef.current.srcObject);
                 console.log(`Re-added track before answer: ${track.kind}`);
              }
           });
        }

        await currentPc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log("Remote description (offer) set.");

        console.log("Creating answer...");
        const answerDescription = await currentPc.createAnswer();
        await currentPc.setLocalDescription(answerDescription);
        console.log("Local description (answer) set.");

        console.log("Sending answer via Supabase channel");
        await supabaseChannel.send({
          type: 'broadcast',
          event: 'answer',
          payload: { answer: currentPc.localDescription.toJSON() }, // Send full description
        });
        console.log("Answer sent.");
     } catch (error) {
        console.error("Error handling received offer or sending answer:", error);
     }
  };

  // Centralized cleanup logic
  const cleanupCall = (channelToUnsubscribe, peerConnectionToClose) => {
     console.log("Cleaning up call resources...");
     // Stop media tracks
     if (localVideoRef.current?.srcObject) {
       localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
       localVideoRef.current.srcObject = null; 
     }
     if (remoteVideoRef.current?.srcObject) {
       remoteVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
       remoteVideoRef.current.srcObject = null; 
     }

     // Close PeerConnection
     if (peerConnectionToClose) {
       peerConnectionToClose.ontrack = null;
       peerConnectionToClose.onicecandidate = null;
       peerConnectionToClose.onicecandidateerror = null;
       peerConnectionToClose.onconnectionstatechange = null;
       if (peerConnectionToClose.connectionState !== 'closed') {
          peerConnectionToClose.close();
          console.log("PeerConnection closed.");
       }
     }
     // Reset component state if pc matches the one being closed
     if (pc === peerConnectionToClose) {
        setPc(null); 
     }

     // Unsubscribe from Supabase channel
     if (channelToUnsubscribe) {
       console.log(`Removing channel subscription: ${channelToUnsubscribe.topic}`);
       supabase.removeChannel(channelToUnsubscribe)
         .catch(e => console.error("Error removing channel:", e));
     }
      // Reset component state if channel matches the one being closed
     if (supabaseChannel === channelToUnsubscribe) {
        setSupabaseChannel(null); 
     }
     
     setIsWebcamStarted(false); 
  };

  // User-initiated hangup
  const hangupCall = async () => {
    console.log("Hangup initiated by user.");
     if (supabaseChannel && supabaseChannel.state === 'joined') {
       // Send hangup signal to the other peer
       supabaseChannel.send({
         type: 'broadcast',
         event: 'hangup',
         payload: {},
       }).catch(e => console.error("Error sending hangup signal:", e));
     }
    cleanupCall(supabaseChannel, pc); // Use current state channel and pc
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Video Call Room: {roomId}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">Local Stream</h3>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-64 md:h-80 rounded-lg bg-gray-900" // Darker background
            />
          </div>
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">Remote Stream</h3>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-64 md:h-80 rounded-lg bg-gray-900" // Darker background
            />
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center items-center gap-4">
          {!isWebcamStarted ? (
            <button
              onClick={startWebcam}
              disabled={!pc} // Disable if pc not ready
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Start Webcam
            </button>
          ) : (
             // Use startCall to initiate the call (send offer)
            <button
              onClick={startCall} 
              disabled={!pc || !supabaseChannel || supabaseChannel.state !== 'joined'} // Disable if pc or channel not ready
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Start Call
            </button>
          )}
          <button
            onClick={hangupCall}
            disabled={!isWebcamStarted && !remoteVideoRef.current?.srcObject} // Disable if call not active
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            Hangup
          </button>
        </div>
         {/* Optional: Display connection state */}
         {pc && <p className="text-center text-gray-500 mt-4">Connection State: {pc.connectionState}</p>}
         {/* Optional: Display channel state */}
         {supabaseChannel && <p className="text-center text-gray-500 mt-2">Channel State: {supabaseChannel.state}</p>}
      </div>
    </div>
  );
}
