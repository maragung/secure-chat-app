// hooks/useWebRTC.js
import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { v4 as uuidv4 } from 'uuid';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // You might need TURN servers for production for robust NAT traversal
    // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'password' }
  ],
};

export default function useWebRTC(roomId) {
  const {
    username,
    socket, setSocket,
    addMessage,
    peers, addPeer, removePeer, getPeer, clearPeers,
    roomPassword, // Get room password from store
  } = useStore(state => ({
    username: state.username,
    socket: state.socket,
    setSocket: state.setSocket,
    addMessage: state.addMessage,
    peers: state.peers,
    addPeer: state.addPeer,
    removePeer: state.removePeer,
    getPeer: state.getPeer,
    clearPeers: state.clearPeers,
    roomPassword: state.roomPassword,
  }));

  const localStreamRef = useRef(null); // Not using audio/video stream in this chat, but structure is there
  const peerConnectionsRef = useRef(new Map()); // Stores RTCPeerConnection instances: peerId -> RTCPeerConnection
  const dataChannelsRef = useRef(new Map()); // Stores RTCDataChannel instances: peerId -> RTCDataChannel

  const handleSignalingMessage = useCallback(async (message) => {
    const { type, sdp, candidate, from: peerId, target, error, message: content, passwordVerified, users: roomUsers, username: remoteUsername } = message;

    if (target && target !== username) return; // Message not for me

    let pc = peerConnectionsRef.current.get(peerId);

    switch (type) {
      case 'room-joined':
        addMessage({ id: uuidv4(), type: 'notification', text: `${remoteUsername === username ? 'You' : remoteUsername} joined the room.`, timestamp: Date.now() });
        // If this is not me joining, and I'm the initiator for this new peer
        if (remoteUsername !== username) {
            console.log(`New user ${remoteUsername} joined, I am ${username}. Creating offer.`);
            createPeerConnection(peerId, remoteUsername, true); // I am the initiator
        }
        // Update peer's username in the store
        const peerData = getPeer(peerId);
        if (peerData) {
            addPeer(peerId, { ...peerData, username: remoteUsername });
        } else if (remoteUsername !== username) { // Only add if it's a remote peer
            addPeer(peerId, { username: remoteUsername, connection: null, dataChannel: null });
        }
        break;

      case 'password-required':
        addMessage({ id: uuidv4(), type: 'notification', text: `This room requires a password.`, timestamp: Date.now() });
        // Potentially prompt user for password again if it was wrong, or handle UI
        break;

      case 'auth-failed':
        addMessage({ id: uuidv4(), type: 'notification', text: `Password incorrect for room.`, timestamp: Date.now() });
        // Redirect or show error
        break;
      
      case 'user-list': // Received when I first join, or when someone else joins/leaves
        // `roomUsers` is an array of { id: socketId, username: string }
        console.log('Received user list:', roomUsers);
        roomUsers.forEach(user => {
          if (user.username !== username && !peerConnectionsRef.current.has(user.id)) {
            console.log(`Found user ${user.username} (${user.id}) in list, I am ${username}. Creating offer.`);
            createPeerConnection(user.id, user.username, true); // I am the initiator for existing users
          }
        });
        break;

      case 'offer':
        if (peerId === username) return; // Offer from myself, ignore
        console.log(`Received offer from ${peerId} (${remoteUsername})`);
        pc = createPeerConnection(peerId, remoteUsername, false); // Not initiator
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription.sdp, target: peerId, from: username, roomId, username }));
        console.log(`Sent answer to ${peerId}`);
        break;

      case 'answer':
        if (peerId === username) return;
        console.log(`Received answer from ${peerId}`);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
          console.log(`Processed answer from ${peerId}`);
        } else {
          console.warn(`No peer connection found for ${peerId} to set answer.`);
        }
        break;

      case 'candidate':
        if (peerId === username) return;
        console.log(`Received ICE candidate from ${peerId}`);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error adding received ICE candidate', e);
          }
        } else {
            console.warn(`No peer connection found for ${peerId} to add ICE candidate.`);
        }
        break;

      case 'user-left':
        addMessage({ id: uuidv4(), type: 'notification', text: `${remoteUsername || peerId} left the room.`, timestamp: Date.now() });
        closePeerConnection(peerId);
        break;
      
      case 'error':
        addMessage({ id: uuidv4(), type: 'notification', text: `Error: ${content}`, timestamp: Date.now() });
        console.error("Signaling server error:", content);
        break;

      default:
        console.warn('Unknown signaling message type:', type);
    }
  }, [socket, username, roomId, addMessage, createPeerConnection, closePeerConnection, roomPassword, getPeer, addPeer]);


  function createPeerConnection(peerId, remoteUsername, isInitiator) {
    if (peerConnectionsRef.current.has(peerId)) {
        console.log(`Peer connection for ${peerId} already exists or is being established.`);
        return peerConnectionsRef.current.get(peerId);
    }
    console.log(`Creating new peer connection to ${peerId} (${remoteUsername}). Initiator: ${isInitiator}`);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(peerId, pc);
    
    // Update store with peer info (username, but connection and datachannel are refs)
    // The actual RTCPeerConnection and RTCDataChannel objects are not serializable for Zustand state,
    // so we manage them in refs and update the store with metadata like username.
    addPeer(peerId, { username: remoteUsername, connection: pc, dataChannel: null });


    pc.onicecandidate = (event) => {
      if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
        console.log(`Sending ICE candidate to ${peerId}`);
        socket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate, target: peerId, from: username, roomId, username }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${peerId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
        // closePeerConnection(peerId); // This might be too aggressive, consider reconnection logic
      }
      if (pc.iceConnectionState === 'connected') {
         addMessage({ id: uuidv4(), type: 'notification', text: `Connected with ${remoteUsername || peerId}.`, timestamp: Date.now() });
      }
    };
    
    pc.ondatachannel = (event) => {
      console.log(`Data channel received from ${peerId}`);
      const dataChannel = event.channel;
      setupDataChannelEvents(dataChannel, peerId, remoteUsername);
      dataChannelsRef.current.set(peerId, dataChannel);
      // Update peer in store
      const peerData = getPeer(peerId);
      if (peerData) addPeer(peerId, { ...peerData, dataChannel });
    };

    if (isInitiator) {
      console.log(`I am initiator for ${peerId}. Creating data channel.`);
      const dataChannel = pc.createDataChannel('chat');
      setupDataChannelEvents(dataChannel, peerId, remoteUsername);
      dataChannelsRef.current.set(peerId, dataChannel);
      // Update peer in store
      const peerData = getPeer(peerId);
      if (peerData) addPeer(peerId, { ...peerData, dataChannel });


      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            console.log(`Sending offer to ${peerId}`);
            socket.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription.sdp, target: peerId, from: username, roomId, username }));
          }
        })
        .catch(e => console.error('Error creating offer:', e));
    }
    return pc;
  }

  function setupDataChannelEvents(dataChannel, peerId, remoteUsername) {
    dataChannel.onopen = () => {
      console.log(`Data channel with ${peerId} (${remoteUsername}) opened.`);
      // Send a "hello" or user info message
      dataChannel.send(JSON.stringify({ type: 'user-info', username: username }));
      addMessage({ id: uuidv4(), type: 'notification', text: `Chat channel with ${remoteUsername || peerId} is open.`, timestamp: Date.now() });
    };

    dataChannel.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data);
        if (messageData.type === 'chat') {
          console.log(`Message from ${peerId}:`, messageData.text);
          addMessage({
            id: uuidv4(),
            sender: messageData.sender || remoteUsername || peerId, // Use sender from message, fallback to remoteUsername
            text: messageData.text,
            timestamp: messageData.timestamp || Date.now(),
            type: 'message'
          });
        } else if (messageData.type === 'user-info') {
            // Received user info from peer, update their username in our store/UI
            console.log(`Received user-info from ${peerId}: ${messageData.username}`);
            const peerData = getPeer(peerId);
            if (peerData && peerData.username !== messageData.username) {
                addPeer(peerId, { ...peerData, username: messageData.username });
            } else if (!peerData) {
                 addPeer(peerId, { username: messageData.username, connection: peerConnectionsRef.current.get(peerId), dataChannel });
            }
        }
      } catch (error) {
        console.error("Error processing received message:", error, "Raw data:", event.data);
        // Handle non-JSON messages if necessary, or log as an error
         addMessage({
            id: uuidv4(),
            sender: remoteUsername || peerId,
            text: event.data, // Display raw data if not JSON
            timestamp: Date.now(),
            type: 'message'
          });
      }
    };

    dataChannel.onclose = () => {
      console.log(`Data channel with ${peerId} (${remoteUsername}) closed.`);
      // No need to call closePeerConnection here as oniceconnectionstatechange should handle it
    };
    dataChannel.onerror = (error) => {
      console.error(`Data channel error with ${peerId}:`, error);
    };
  }
  
  const closePeerConnection = useCallback((peerId) => {
    console.log(`Closing peer connection with ${peerId}`);
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    const dc = dataChannelsRef.current.get(peerId);
    if (dc) {
      dc.close();
      dataChannelsRef.current.delete(peerId);
    }
    removePeer(peerId); // Remove from Zustand store
  }, [removePeer]);

  // Effect for WebSocket connection
  useEffect(() => {
    if (!username || !roomId) return;

    // Determine WebSocket protocol (ws or wss)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsURL = `${wsProtocol}//${window.location.host}/api/socket`;
    
    const newSocket = new WebSocket(wsURL);

    newSocket.onopen = () => {
      console.log('WebSocket connected');
      setSocket(newSocket);
      // Join room message to signaling server
      newSocket.send(JSON.stringify({ type: 'join-room', roomId, username, password: roomPassword })); 
      addMessage({ id: uuidv4(), type: 'notification', text: `Attempting to join room: ${roomId}...`, timestamp: Date.now() });
    };

    newSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('WebSocket message received:', message);
      handleSignalingMessage(message);
    };

    newSocket.onclose = () => {
      console.log('WebSocket disconnected');
      setSocket(null);
      addMessage({ id: uuidv4(), type: 'notification', text: 'Disconnected from signaling server.', timestamp: Date.now() });
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      addMessage({ id: uuidv4(), type: 'notification', text: 'Signaling server connection error.', timestamp: Date.now() });
    };

    return () => {
      console.log("Cleaning up WebSocket and WebRTC connections.");
      if (newSocket) {
        newSocket.send(JSON.stringify({ type: 'leave-room', roomId, username }));
        newSocket.close();
      }
      peerConnectionsRef.current.forEach((pc, peerId) => {
        closePeerConnection(peerId);
      });
      peerConnectionsRef.current.clear();
      dataChannelsRef.current.clear();
      clearPeers(); // Clear peers from Zustand store
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, roomId, roomPassword, setSocket, addMessage, handleSignalingMessage, clearPeers]); // Dependencies for socket connection

  const sendMessageToAllPeers = (text) => {
    if (!username) {
        console.error("Username not set, cannot send message.");
        return;
    }
    const message = {
      id: uuidv4(),
      sender: username,
      text,
      timestamp: Date.now(),
      type: 'message' // This is for local display
    };
    addMessage(message); // Add to local messages immediately

    const chatMessagePayload = JSON.stringify({
        type: 'chat', // This type is for P2P data channel transmission
        sender: username,
        text,
        timestamp: message.timestamp
    });

    console.log("Broadcasting message to data channels:", dataChannelsRef.current.size);
    dataChannelsRef.current.forEach((dataChannel, peerId) => {
      if (dataChannel.readyState === 'open') {
        try {
            dataChannel.send(chatMessagePayload);
            console.log(`Message sent to ${peerId}`);
        } catch (error) {
            console.error(`Error sending message to ${peerId}:`, error);
        }
      } else {
        console.warn(`Data channel to ${peerId} is not open. State: ${dataChannel.readyState}`);
      }
    });
  };
  
  return { sendMessageToAllPeers };
}
