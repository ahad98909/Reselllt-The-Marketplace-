import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { notificationsAPI, chatsAPI } from '../services/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const messageListeners = useRef({}); // Mapping chat_id -> Callback functions
  const typingListeners = useRef({}); // Mapping chat_id -> Callback functions
  const readListeners = useRef({}); // Mapping chat_id -> Callback functions
  const globalMessageListeners = useRef([]); // List of global message callback functions

  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Fetch initial unread messages status
  const refreshUnreadChatsCount = async () => {
    if (!user) return;
    try {
      const res = await chatsAPI.getChats();
      setHasUnreadMessages(res.data.some(c => c.has_unread));
    } catch (err) {
      console.error("Failed to load initial chats for badge:", err);
    }
  };

  useEffect(() => {
    if (user) {
      refreshUnreadChatsCount();
    } else {
      setHasUnreadMessages(false);
    }
  }, [user]);

  // Fetch initial notifications
  useEffect(() => {
    if (user) {
      const loadNotifications = async () => {
        try {
          const res = await notificationsAPI.getNotifications();
          setNotifications(res.data);
          setUnreadNotificationsCount(res.data.filter(n => !n.is_read).length);
        } catch (err) {
          console.error("Failed to load notifications:", err);
        }
      };
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadNotificationsCount(0);
    }
  }, [user]);

  // HTTP Polling Fallback when WebSocket is not connected/supported (e.g. Vercel)
  useEffect(() => {
    if (!token || !user) return;

    const pollInterval = setInterval(async () => {
      // Only poll if WebSocket is NOT connected/open
      if (socket && socket.readyState === 1) return; // 1 means WebSocket.OPEN

      try {
        // 1. Poll for messages in active chats
        const chatIds = Object.keys(messageListeners.current);
        for (const chatId of chatIds) {
          const listeners = messageListeners.current[chatId];
          if (listeners && listeners.length > 0) {
            try {
              const res = await chatsAPI.getChat(chatId);
              const chatData = res.data;
              if (chatData && chatData.messages) {
                chatData.messages.forEach(msg => {
                  listeners.forEach(cb => cb(msg));
                });
              }
            } catch (err) {
              console.error(`Failed to poll chat ${chatId}:`, err);
            }
          }
        }

        // 2. Poll for notifications
        try {
          const notifRes = await notificationsAPI.getNotifications();
          const serverNotifs = notifRes.data || [];
          
          setNotifications(prev => {
            const prevIds = new Set(prev.map(n => n.id));
            const newNotifs = serverNotifs.filter(n => !prevIds.has(n.id));
            if (newNotifs.length > 0) {
              setUnreadNotificationsCount(serverNotifs.filter(n => !n.is_read).length);
              return serverNotifs;
            }
            return prev;
          });
        } catch (err) {
          console.error("Failed to poll notifications:", err);
        }

      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [token, user, socket]);

  // Handle WebSocket Connection
  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.close();
        setSocket(null);
      }
      return;
    }

    // Connect to WebSockets
    const wsBase = import.meta.env.VITE_WS_URL;
    let wsUrl;
    if (wsBase) {
      wsUrl = `${wsBase}?token=${token}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // If running in local Vite dev server directly without Nginx proxy (e.g. localhost:5173),
      // we fallback to localhost:8000 for backend ws.
      const host = window.location.host.includes('localhost:') && !window.location.host.includes('8000')
        ? 'localhost:8000'
        : window.location.host;
        
      wsUrl = `${protocol}//${host}/ws?token=${token}`;
    }
    
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected.");
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: eventName, data } = payload;

        console.log("WS Event Received:", eventName, data);

        if (eventName === "new_message") {
          const chatListeners = messageListeners.current[data.chat_id];
          if (chatListeners && chatListeners.length > 0) {
            chatListeners.forEach(cb => cb(data));
          }
          if (globalMessageListeners.current.length > 0) {
            globalMessageListeners.current.forEach(cb => cb(data));
          }
          // Set unread flag if message is from counterparty
          if (data.sender_id !== user.id) {
            setHasUnreadMessages(true);
          }
        }
        
        else if (eventName === "typing") {
          const tListeners = typingListeners.current[data.chat_id];
          if (tListeners && tListeners.length > 0) {
            tListeners.forEach(cb => cb(data));
          }
        } 
        
        else if (eventName === "read_receipt") {
          const rListeners = readListeners.current[data.chat_id];
          if (rListeners && rListeners.length > 0) {
            rListeners.forEach(cb => cb(data));
          }
        } 
        
        else if (eventName === "notification") {
          // Play subtle sound or show toast
          const newNotif = {
            id: Date.now(),
            notification_type: data.type,
            content: data.content,
            is_read: false,
            created_at: new Date()
          };
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadNotificationsCount(prev => prev + 1);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected.");
      setSocket(null);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error occurred:", err);
    };

    return () => {
      ws.close();
    };
  }, [token, user]);

  // Methods to register component-specific listeners
  const subscribeToMessages = (chatId, callback) => {
    if (!messageListeners.current[chatId]) {
      messageListeners.current[chatId] = [];
    }
    messageListeners.current[chatId].push(callback);
    
    return () => {
      messageListeners.current[chatId] = messageListeners.current[chatId].filter(cb => cb !== callback);
    };
  };

  const subscribeToTyping = (chatId, callback) => {
    if (!typingListeners.current[chatId]) {
      typingListeners.current[chatId] = [];
    }
    typingListeners.current[chatId].push(callback);
    
    return () => {
      typingListeners.current[chatId] = typingListeners.current[chatId].filter(cb => cb !== callback);
    };
  };

  const subscribeToReadReceipts = (chatId, callback) => {
    if (!readListeners.current[chatId]) {
      readListeners.current[chatId] = [];
    }
    readListeners.current[chatId].push(callback);
    
    return () => {
      readListeners.current[chatId] = readListeners.current[chatId].filter(cb => cb !== callback);
    };
  };

  const subscribeToGlobalMessages = (callback) => {
    globalMessageListeners.current.push(callback);
    return () => {
      globalMessageListeners.current = globalMessageListeners.current.filter(cb => cb !== callback);
    };
  };

  // Actions
  const sendMessage = async (chatId, content, messageType = 'text') => {
    try {
      const res = await chatsAPI.sendMessage(chatId, content, messageType);
      const newMsg = res.data;
      
      const chatListeners = messageListeners.current[chatId];
      if (chatListeners && chatListeners.length > 0) {
        chatListeners.forEach(cb => cb(newMsg));
      }
      if (globalMessageListeners.current.length > 0) {
        globalMessageListeners.current.forEach(cb => cb(newMsg));
      }
    } catch (err) {
      console.error("Failed to send message over HTTP:", err);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          event: "send_message",
          data: {
            chat_id: chatId,
            content,
            message_type: messageType
          }
        }));
      }
    }
  };

  const sendTyping = (chatId, isTyping) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        event: "typing",
        data: {
          chat_id: chatId,
          is_typing: isTyping
        }
      }));
    }
  };

  const clearNotifications = async () => {
    try {
      await notificationsAPI.readAll();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotificationsCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadNotificationsCount,
        hasUnreadMessages,
        refreshUnreadChatsCount,
        sendMessage,
        sendTyping,
        subscribeToMessages,
        subscribeToTyping,
        subscribeToReadReceipts,
        subscribeToGlobalMessages,
        clearNotifications,
        markNotificationRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
