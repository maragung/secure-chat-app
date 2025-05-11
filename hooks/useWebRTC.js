// hooks/useWebRTC.js
import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { v4 as uuidv4 } from 'uuid';

const ICE_SERVERS = { /* ... */ };

export default function useWebRTC(roomId) {
  const store = useStore(); // Get the whole store or specific slices
  const { username, addMessage, setSocket, roomPassword, peers, addPeer, removePeer, getPeer, clearPeers } = store;

  const socketRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const dataChannelsRef = useRef(new Map());

  // Define createPeerConnection, closePeerConnection, setupDataChannelEvents, handleSignalingMessage
  // These need to be memoized if they are dependencies of other effects or used in callbacks.
  // For brevity here, I'm assuming they are structured correctly as in the previous detailed version.
  // The key is that their execution is triggered by client-side events or WebSocket messages.

  const memoizedClosePeerConnection = useCallback((peerId) => {
    // ... (implementation from previous thought, ensure dependencies like removePeer are stable from store)
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) { pc.close(); peerConnectionsRef.current.delete(peerId); }
    const dc = dataChannelsRef.current.get(peerId);
    if (dc) { dc.close(); dataChannelsRef.current.delete(peerId); }
    removePeer(peerId);
  }, [removePeer]);


  const memoizedSetupDataChannelEvents = useCallback((dataChannel, peerId, remoteUsernameForChannel, pcForChannel) => {
    dataChannel.onopen = () => {
        console.log(`Data channel with ${peerId} (${remoteUsernameForChannel}) opened.`);
        dataChannel.send(JSON.stringify({ type: 'user-info', username: username }));
        addMessage({ id: uuidv4(), type: 'notification', text: `Chat channel with ${remoteUsernameForChannel || peerId} is open.`, timestamp: Date.now() });
    };
    dataChannel.onmessage = (event) => {
        try {
            const messageData = JSON.parse(event.data);
            if (messageData.type === 'chat') {
                addMessage({
                    id: uuidv4(),
                    sender: messageData.sender || remoteUsernameForChannel || peerId,
                    text: messageData.text,
                    timestamp: messageData.timestamp || Date.now(),
                    type: 'message'
                });
            } else if (messageData.type === 'user-info') {
                const peerData = getPeer(peerId); // getPeer from store
                if (peerData && peerData.username !== messageData.username) {
                    addPeer(peerId, { ...peerData, username: messageData.username }); // addPeer from store
                } else if (!peerData) {
                     addPeer(peerId, { username: messageData.username, connection: pcForChannel, dataChannel });
                }
            }
        } catch (error) {
            console.error("Error processing received message:", error, "Raw data:", event.data);
        }
    };
    dataChannel.onclose = () => console.log(`Data channel with ${peerId} (${remoteUsernameForChannel}) closed.`);
    dataChannel.onerror = (error) => console.error(`Data channel error with ${peerId}:`, error);
  }, [username, addMessage, getPeer, addPeer]);


  const memoizedCreatePeerConnection = useCallback((peerId, remoteUsername, isInitiator) => {
    if (peerConnectionsRef.current.has(peerId)) {
        return peerConnectionsRef.current.get(peerId);
    }
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(peerId, pc);
    addPeer(peerId, { username: remoteUsername, connection: pc, dataChannel: null });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'candidate', candidate: event.candidate, target: peerId, from: username, roomId, username }));
      }
    };
    pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state for ${peerId}: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'connected') {
            addMessage({ id: uuidv4(), type: 'notification', text: `Connection established with ${remoteUsername || peerId}.`, timestamp: Date.now() });
        }
        // Consider more robust handling for failed/disconnected states
    };
    pc.ondatachannel = (event) => {
      const dataChannel = event.channel;
      memoizedSetupDataChannelEvents(dataChannel, peerId, remoteUsername, pc);
      dataChannelsRef.current.set(peerId, dataChannel);
      const currentPeerData = getPeer(peerId); // getPeer from store
      if (currentPeerData) addPeer(peerId, { ...currentPeerData, dataChannel }); // addPeer from store
    };

    if (isInitiator) {
      const dataChannel = pc.createDataChannel('chat');
      memoizedSetupDataChannelEvents(dataChannel, peerId, remoteUsername, pc);
      dataChannelsRef.current.set(peerId, dataChannel);
      const currentPeerData = getPeer(peerId); // getPeer from store
      if (currentPeerData) addPeer(peerId, { ...currentPeerData, dataChannel }); // addPeer from store

      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription.sdp, target: peerId, from: username, roomId, username }));
          }
        })
        .catch(e => console.error('Error creating offer:', e));
    }
    return pc;
  }, [username, roomId, addPeer, getPeer, addMessage, memoizedSetupDataChannelEvents]);


  const memoizedHandleSignalingMessage = useCallback(async (message) => {
    const { type, sdp, candidate, from: peerId, target, users: roomUsers, username: remoteUsername } = message;
    if (target && target !== username) return; // Message not for me

    let pc = peerConnectionsRef.current.get(peerId);

    switch (type) {
      case 'room-joined':
        addMessage({ id: uuidv4(), type: 'notification', text: `${remoteUsername === username ? 'You' : remoteUsername} joined the room.`, timestamp: Date.now() });
        if (remoteUsername !== username) { // If a new user (not me) joined, and I am an existing user
            memoizedCreatePeerConnection(peerId, remoteUsername, true); // I initiate connection to them
        }
        // Update peer's username in the store
        const existingPeerData = getPeer(peerId);
        if (existingPeerData) { addPeer(peerId, { ...existingPeerData, username: remoteUsername }); }
        else if (remoteUsername !== username) { addPeer(peerId, { username: remoteUsername, connection: null, dataChannel: null }); }
        break;
      case 'user-list': // Received when I first join
        roomUsers.forEach(user => {
          if (user.username !== username && !peerConnectionsRef.current.has(user.id)) {
            memoizedCreatePeerConnection(user.id, user.username, true); // I initiate to existing users
          }
        });
        break;
      case 'offer':
        if (peerId === username) return;
        pc = memoizedCreatePeerConnection(peerId, remoteUsername, false); // Not initiator
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription.sdp, target: peerId, from: username, roomId, username }));
        }
        break;
      case 'answer':
        if (peerId === username || !pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
        break;
      case 'candidate':
        if (peerId === username || !pc) return;
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (e) { console.error('Error adding received ICE candidate', e); }
        break;
      case 'user-left':
        addMessage({ id: uuidv4(), type: 'notification', text: `${remoteUsername || peerId} left the room.`, timestamp: Date.now() });
        memoizedClosePeerConnection(peerId);
        break;
      case 'password-required':
        addMessage({ id: uuidv4(), type: 'notification', text: `This room requires a password.`, timestamp: Date.now() });
        break;
      case 'auth-failed':
        addMessage({ id: uuidv4(), type: 'notification', text: `Password incorrect for room.`, timestamp: Date.now() });
        // Consider redirecting or showing a modal
        break;
      case 'error':
        addMessage({ id: uuidv4(), type: 'notification', text: `Error: ${message.message}`, timestamp: Date.now() });
        console.error("Signaling server error:", message.message);
        break;
      default:
        console.warn('Unknown signaling message type:', type);
    }
  }, [username, roomId, addMessage, memoizedCreatePeerConnection, memoizedClosePeerConnection, getPeer, addPeer]);


  useEffect(() => {
    if (typeof window === 'undefined' || !username || !roomId) {
      return; // Guard against SSR and missing username/roomId
    }

    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
        socketRef.current.close(); // Close existing socket before creating a new one
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsURL = `${wsProtocol}//${window.location.host}/api/socket`;
    
    const newSocket = new WebSocket(wsURL);
    socketRef.current = newSocket;
    setSocket(newSocket); // Update Zustand store

    newSocket.onopen = () => {
      console.log('WebSocket connected');
      newSocket.send(JSON.stringify({ type: 'join-room', roomId, username, password: roomPassword }));
      addMessage({ id: uuidv4(), type: 'notification', text: `Attempting to join room: ${roomId}...`, timestamp: Date.now() });
    };

    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        memoizedHandleSignalingMessage(message);
      } catch (e) { console.error("Error parsing WebSocket message:", e, event.data); }
    };

    newSocket.onclose = () => {
      console.log('WebSocket disconnected');
      if (socketRef.current === newSocket) { // Only nullify if it's the current socket instance
        socketRef.current = null;
        setSocket(null);
      }
      addMessage({ id: uuidv4(), type: 'notification', text: 'Disconnected from signaling server.', timestamp: Date.now() });
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      addMessage({ id: uuidv4(), type: 'notification', text: 'Signaling server connection error.', timestamp: Date.now() });
      if (socketRef.current === newSocket) {
        socketRef.current = null;
        setSocket(null);
      }
    };

    return () => {
      console.log("Cleaning up WebSocket from main effect in useWebRTC.");
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        newSocket.send(JSON.stringify({ type: 'leave-room', roomId, username }));
        newSocket.close();
      }
      if (socketRef.current === newSocket) {
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [username, roomId, roomPassword, addMessage, setSocket, memoizedHandleSignalingMessage]);


  // Effect for cleaning up ALL peer connections when the hook unmounts or roomId changes
  useEffect(() => {
    return () => {
        console.log("Full cleanup of ALL peer connections (e.g., on navigating away from room or roomId change).");
        peerConnectionsRef.current.forEach((pc, peerId) => {
            memoizedClosePeerConnection(peerId);
        });
        // peerConnectionsRef.current.clear(); // memoizedClosePeerConnection already deletes
        // dataChannelsRef.current.clear(); // memoizedClosePeerConnection already deletes
        clearPeers(); // Clear all peers from Zustand
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, clearPeers, memoizedClosePeerConnection]); // roomId ensures cleanup if user switches rooms


  const sendMessageToAllPeers = useCallback((text) => {
    if (!username) { return; }
    const message = { id: uuidv4(), sender: username, text, timestamp: Date.now(), type: 'message' };
    addMessage(message);
    const chatMessagePayload = JSON.stringify({ type: 'chat', sender: username, text, timestamp: message.timestamp });
    dataChannelsRef.current.forEach((dataChannel, peerId) => {
      if (dataChannel.readyState === 'open') {
        try { dataChannel.send(chatMessagePayload); }
        catch (error) { console.error(`Error sending message to ${peerId}:`, error); }
      }
    });
  }, [username, addMessage]);

  return { sendMessageToAllPeers };
}
