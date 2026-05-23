import { io } from 'socket.io-client';

const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? 'https://safarisconnback.onrender.com'
  : 'http://localhost:5000';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

let socket;

export const REALTIME_EVENTS = {
  CATALOG_CHANGED: 'catalog:changed',
  BUSINESS_CHANGED: 'business:changed',
  HOTEL_CHANGED: 'business:changed',
  SERVICE_CHANGED: 'service:changed',
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

export const joinRealtimeChannel = (channel, id) => {
  if (!id) return;
  getRealtimeSocket().emit(`${channel}:join`, id);
};
