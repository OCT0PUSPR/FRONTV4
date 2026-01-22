// WebSocket hook for real-time stock updates

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConnectionStatus, StockUpdateMessage } from '../types';
import { API_CONFIG } from '../../../config/api';

interface UseWebSocketOptions {
  warehouseId: number | null;
  onStockUpdate?: (update: StockUpdateMessage) => void;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  lastUpdate: StockUpdateMessage | null;
  reconnect: () => void;
}

export function useWebSocket({
  warehouseId,
  onStockUpdate,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<StockUpdateMessage | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = Infinity;
  const reconnectIntervalRef = useRef(1000);
  const maxReconnectInterval = 30000;

  // Get user ID for joining user-specific room
  const getUserId = (): string | null => {
    return localStorage.getItem('partnerId') || localStorage.getItem('uid');
  };

  // Connect to WebSocket server
  const connect = useCallback(() => {
    const userId = getUserId();
    const baseUrl = API_CONFIG.BACKEND_BASE_URL?.replace('/api', '') || 'http://localhost:3029';

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    setStatus('reconnecting');

    const socket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection manually
      timeout: 20000,
      auth: {
        userId,
        token: localStorage.getItem('token'),
      },
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[Warehouse WS] Connected:', socket.id);
      setStatus('connected');
      reconnectAttemptsRef.current = 0;
      reconnectIntervalRef.current = 1000;

      // Join user room for notifications
      if (userId) {
        socket.emit('join-user-room', { userId });
      }

      // Join warehouse room for stock updates
      if (warehouseId) {
        socket.emit('join-warehouse-room', { warehouseId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Warehouse WS] Disconnected:', reason);
      setStatus('disconnected');

      // Attempt to reconnect unless it was intentional
      if (reason !== 'io client disconnect') {
        scheduleReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Warehouse WS] Connection error:', error);
      setStatus('disconnected');
      scheduleReconnect();
    });

    // Stock update events
    socket.on('stock-update', (data: StockUpdateMessage) => {
      console.log('[Warehouse WS] Stock update received:', data);
      setLastUpdate(data);
      onStockUpdate?.(data);
    });

    // Listen for generic notification events that might contain stock updates
    socket.on('new-notification', (notification: Record<string, unknown>) => {
      if (notification.type === 'stock_update') {
        const update = notification as unknown as StockUpdateMessage;
        setLastUpdate(update);
        onStockUpdate?.(update);
      }
    });
    // scheduleReconnect is defined below, but we avoid adding it to deps to prevent circular dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, onStockUpdate]);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('[Warehouse WS] Max reconnect attempts reached');
      return;
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(
      reconnectIntervalRef.current * Math.pow(1.5, reconnectAttemptsRef.current - 1),
      maxReconnectInterval
    );

    console.log(`[Warehouse WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

    setTimeout(() => {
      connect();
    }, delay);
    // connect is intentionally referenced here but we manage the dependency cycle manually
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    reconnectIntervalRef.current = 1000;
    connect();
  }, [connect]);

  // Connect on mount and when warehouse changes
  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  // Join warehouse room when warehouse changes
  useEffect(() => {
    if (socketRef.current?.connected && warehouseId) {
      socketRef.current.emit('join-warehouse-room', { warehouseId });
    }
  }, [warehouseId]);

  return {
    status,
    lastUpdate,
    reconnect,
  };
}
