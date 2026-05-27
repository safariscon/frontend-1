import { io } from 'socket.io-client';

const DEFAULT_API_BASE_URL = 'http://localhost:5000';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

let socket;

export const REALTIME_EVENTS = {
  CATALOG_CHANGED: 'catalog:changed',
  HOTEL_CHANGED: 'hotel:changed',
  SERVICE_CHANGED: 'service:changed',
  ROOM_CHANGED: 'room:changed',
  BOOKING_CHANGED: 'booking:changed',
  NOTIFICATION: 'notification:new',
};

export const getRealtimeSocket = () => {
  if (!socket) {
    socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });
  }

  return socket;
};

export const subscribeToRealtime = (events, handler) => {
  const realtimeSocket = getRealtimeSocket();
  const eventList = Array.isArray(events) ? events : [events];

  eventList.forEach((event) => realtimeSocket.on(event, handler));

  return () => {
    eventList.forEach((event) => realtimeSocket.off(event, handler));
  };
};

export const joinRealtimeRoom = (room, id) => {
  if (!id) return;
  getRealtimeSocket().emit(`${room}:join`, id);
};

export const joinRealtimeChannel = joinRealtimeRoom;
