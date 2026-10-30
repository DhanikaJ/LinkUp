import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { WS_URL } from "../config/api";

interface WebSocketContextValue {
  socket: WebSocket | null;
  isConnected: boolean;
  userId: number;
  sendMessage: (data: any) => void;
}
const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export const WebSocketProvider: React.FC<{
  children: React.ReactNode;
  userId: number;
}> = ({ children, userId }) => {
  const [isConnected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = useCallback(() => {
    if (userId === 0) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN)
      return;

    // Clean up any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const socketUrl = `${WS_URL}/chat?userId=${userId}`;
    console.log("Connecting WebSocket:", socketUrl);

    try {
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log(new Date().toLocaleTimeString());
        console.log("WebSocket connected...");
        setConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      socket.onclose = () => {
        console.log(new Date().toLocaleTimeString());
        console.log("WebSocket disconnected...");
        setConnected(false);
        socketRef.current = null;

        // Attempt reconnection if not manually closed
        if (
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS &&
          !reconnectTimeoutRef.current
        ) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * reconnectAttemptsRef.current, 30000);
          console.log(
            `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, delay);
        }
      };

      socket.onerror = (error) => {
        console.log("WebSocket error:", error);
        setConnected(false);
      };

      return socket;
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setConnected(false);
      return null;
    }
  }, [userId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [connect]);

  const sendMessage = useCallback(
    (data: any) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ ...data, userId }));
      } else {
        console.warn("WebSocket is not connected. Message not sent:", data);
      }
    },
    [userId]
  );

  return (
    <WebSocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        userId,
        sendMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error("useWebSocket must be used inside WebSocketProvider");
  }
  return ctx;
};

