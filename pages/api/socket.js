// pages/api/socket.js
// This is a basic WebSocket signaling server for Next.js API routes.
// IMPORTANT: In a Vercel serverless environment, the 'rooms' object will NOT be shared across
// different serverless function invocations if your app scales. This means if two users hit
// different instances, they won't see each other in the same room via this in-memory store.
// For production, you'd need a more robust solution like:
// 1. A dedicated WebSocket server (e.g., a small Node.js/Express app with 'ws' running on a separate instance).
// 2. A managed WebSocket service (e.g., Ably, Pusher, or AWS API Gateway with WebSockets).
// 3. Using a distributed cache like Redis to store room/client information if sticking with serverless.
// This example is simplified for demonstration and will work for local development or very low-traffic Vercel deployments.

import { WebSocketServer } from 'ws';

// Store rooms and clients in memory.
// rooms structure: Map<roomId, { clients: Map<clientId, { ws: WebSocket, username: string, password?: string }>, password?: string }>
const rooms = new Map(); 
// clients structure: Map<WebSocket, { clientId: string, roomId: string, username: string }>
const clients = new Map(); 

function getRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, { clients: new Map(), password: null });
    }
    return rooms.get(roomId);
}

function broadcastToRoom(roomId, message, excludeClientId = null) {
    const room = rooms.get(roomId);
    if (room) {
        room.clients.forEach((clientData, clientId) => {
            if (clientId !== excludeClientId && clientData.ws.readyState === WebSocket.OPEN) {
                clientData.ws.send(JSON.stringify(message));
            }
        });
    }
}

function getRoomUsers(roomId) {
    const room = rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.clients.values()).map(client => ({ id: client.clientId, username: client.username }));
}


export default function handler(req, res) {
  // Check if WebSocket server is already running (attached to the HTTP server)
  if (!res.socket.server.wss) {
    console.log('Initializing WebSocket server...');
    const wss = new WebSocketServer({ noServer: true }); // We'll use the existing Next.js server

    wss.on('connection', (ws, request) => {
      const clientId = `client-${Math.random().toString(36).substr(2, 9)}`; // Unique ID for this connection
      console.log(`Client ${clientId} connected`);
      clients.set(ws, { clientId, roomId: null, username: null });


      ws.on('message', (messageString) => {
        let message;
        try {
          message = JSON.parse(messageString);
        } catch (e) {
          console.error('Failed to parse message:', messageString, e);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON message format.' }));
          return;
        }

        const { type, roomId, username, password, sdp, candidate, target, from } = message;
        const clientInfo = clients.get(ws);

        console.log(`Received message type: ${type} from ${clientInfo.clientId} (${clientInfo.username}) for room ${roomId || clientInfo.roomId}`);

        switch (type) {
          case 'join-room':
            if (!roomId || !username) {
                ws.send(JSON.stringify({ type: 'error', message: 'Room ID and username are required to join.' }));
                return;
            }
            
            const roomToJoin = getRoom(roomId); // Ensures room exists in 'rooms' map

            // Password check
            if (roomToJoin.password && roomToJoin.password !== password) {
                ws.send(JSON.stringify({ type: 'auth-failed', message: 'Incorrect password for room.' }));
                return;
            }
            // If room has no password yet, and user provides one, set it (first user sets password)
            if (!roomToJoin.password && password) {
                roomToJoin.password = password;
                console.log(`Password set for room ${roomId} by ${username}`);
            } else if (roomToJoin.password === null && !password) {
                // Room is open, no password provided, allow join
            } else if (roomToJoin.password && !password) {
                ws.send(JSON.stringify({ type: 'password-required', message: 'This room requires a password.' }));
                return;
            }


            // Add client to room
            clientInfo.roomId = roomId;
            clientInfo.username = username;
            clientInfo.clientId = clientId; // Ensure clientId is set here as well
            roomToJoin.clients.set(clientId, { ws, username, clientId }); // Store with clientId as key

            console.log(`User ${username} (${clientId}) joined room ${roomId}. Current users in room: ${roomToJoin.clients.size}`);
            
            // Notify this client they joined successfully and send current user list
            ws.send(JSON.stringify({ type: 'room-joined', roomId, username, users: getRoomUsers(roomId), message: `Welcome to room ${roomId}, ${username}!`}));
            
            // Notify other clients in the room about the new user
            broadcastToRoom(roomId, { type: 'room-joined', roomId, username, peerId: clientId, users: getRoomUsers(roomId) }, clientId);
            break;

          case 'leave-room':
            if (clientInfo && clientInfo.roomId) {
              const roomToLeave = rooms.get(clientInfo.roomId);
              if (roomToLeave && roomToLeave.clients.has(clientInfo.clientId)) {
                roomToLeave.clients.delete(clientInfo.clientId);
                console.log(`User ${clientInfo.username} (${clientInfo.clientId}) left room ${clientInfo.roomId}. Remaining: ${roomToLeave.clients.size}`);
                broadcastToRoom(clientInfo.roomId, { type: 'user-left', username: clientInfo.username, peerId: clientInfo.clientId, users: getRoomUsers(clientInfo.roomId) });
                if (roomToLeave.clients.size === 0) {
                  // rooms.delete(clientInfo.roomId); // Optionally delete empty rooms
                  // console.log(`Room ${clientInfo.roomId} is now empty.`);
                }
              }
              clients.delete(ws); // Remove from global client map
            }
            break;

          // Signaling messages (offer, answer, candidate)
          case 'offer':
          case 'answer':
          case 'candidate':
            if (!target) {
                console.warn(`Signaling message type ${type} without target from ${from}`);
                return;
            }
            const targetClientData = getRoom(clientInfo.roomId)?.clients.get(target); // Target is a clientId
            if (targetClientData && targetClientData.ws && targetClientData.ws.readyState === WebSocket.OPEN) {
                console.log(`Relaying ${type} from ${from}(${clientInfo.clientId}) to ${target}(${targetClientData.username})`);
                targetClientData.ws.send(JSON.stringify({ ...message, from: clientInfo.clientId, username: clientInfo.username })); // Relay original message, but ensure 'from' is our server-known clientId
            } else {
                console.warn(`Target client ${target} not found or not open for ${type} from ${from}`);
                // Optionally notify sender that target is not available
                // ws.send(JSON.stringify({ type: 'error', message: `User ${target} not available.`}));
            }
            break;

          default:
            console.log('Unknown message type:', type);
            ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${type}` }));
        }
      });

      ws.on('close', () => {
        const clientInfo = clients.get(ws);
        if (clientInfo && clientInfo.roomId) {
          const room = rooms.get(clientInfo.roomId);
          if (room && room.clients.has(clientInfo.clientId)) {
            room.clients.delete(clientInfo.clientId);
            console.log(`Client ${clientInfo.clientId} (${clientInfo.username}) disconnected from room ${clientInfo.roomId}. Remaining: ${room.clients.size}`);
            broadcastToRoom(clientInfo.roomId, { type: 'user-left', username: clientInfo.username, peerId: clientInfo.clientId, users: getRoomUsers(clientInfo.roomId) });
            if (room.clients.size === 0) {
              // rooms.delete(clientInfo.roomId);
              // console.log(`Room ${clientInfo.roomId} was empty and removed.`);
            }
          }
        }
        clients.delete(ws);
        console.log(`Client ${clientInfo ? clientInfo.clientId : 'unknown'} disconnected`);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error for client:', clients.get(ws)?.clientId, error);
        // Handle cleanup similar to 'close' if necessary
      });
    });

    // Attach WebSocket server to the HTTP server
    res.socket.server.wss = wss;

    // Handle server upgrade manually
    res.socket.server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

    console.log('WebSocket server initialized and attached to HTTP server.');
  } else {
    console.log('WebSocket server already running.');
  }
  res.end(); // End the HTTP request, as WebSocket handling is now separate
}

// Required for Next.js API routes
export const config = {
  api: {
    bodyParser: false, // Disable body parsing, as we're dealing with WebSockets
  },
};
