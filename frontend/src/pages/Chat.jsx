import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { chatsAPI, transactionsAPI, getImageUrl, geocodingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, MapPin, CheckCircle, Shield, Ban, Unlock, Trash2, ArrowLeft, Award, Sparkles } from 'lucide-react';
import ReviewModal from '../components/ReviewModal';

export default function Chat() {
  const { user } = useAuth();
  const { 
    sendMessage, 
    sendTyping, 
    subscribeToMessages, 
    subscribeToTyping,
    subscribeToReadReceipts,
    subscribeToGlobalMessages,
    refreshUnreadChatsCount
  } = useSocket();

  const [searchParams, setSearchParams] = useSearchParams();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Escrow details
  const [escrowTx, setEscrowTx] = useState(null);

  // Offer / Bargaining states
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);

  // Safe Meetup Zone states
  const [isMeetupModalOpen, setIsMeetupModalOpen] = useState(false);
  const [selectedMeetupSpot, setSelectedMeetupSpot] = useState('');
  const [meetupDate, setMeetupDate] = useState('');
  const [meetupTime, setMeetupTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const meetupMapRef = useRef(null);

  // Escrow Dispute states
  const [activeDispute, setActiveDispute] = useState(null);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const [disputeImage, setDisputeImage] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const safeSpotsLayerRef = useRef(null);

  const handleMakeOffer = async (e) => {
    if (e) e.preventDefault();
    if (!offerAmount || isNaN(offerAmount) || parseFloat(offerAmount) <= 0) {
      alert("Please enter a valid offer amount.");
      return;
    }
    setOfferSubmitting(true);
    try {
      await chatsAPI.makeOffer(activeChat.id, parseFloat(offerAmount));
      setIsOfferModalOpen(false);
      setOfferAmount('');
      // Reload chat details
      handleSelectChat(activeChat);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to submit offer.");
    } finally {
      setOfferSubmitting(false);
    }
  };
  const handleConfirmMeetup = (e) => {
    if (e) e.preventDefault();
    if (!selectedMeetupSpot || !meetupDate || !meetupTime) return;

    const dateObj = new Date(meetupDate);
    const formattedDate = dateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    
    const [hours, minutes] = meetupTime.split(':');
    const hr = parseInt(hours);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const formattedTime = `${hr % 12 || 12}:${minutes} ${ampm}`;

    const msg = `🤝 Let's meet at *${selectedMeetupSpot}* on *${formattedDate}* at *${formattedTime}*.`;
    sendMessage(activeChat.id, msg);
    
    setSelectedMeetupSpot('');
    setMeetupDate('');
    setMeetupTime('');
    setIsMeetupModalOpen(false);
  };

  const handleSearchLocation = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !meetupMapRef.current) return;
    
    setSearchLoading(true);
    try {
      const response = await geocodingAPI.search(searchQuery);
      const data = response.data;
      if (data && data.length > 0) {
          const { lat, lon, display_name } = data[0];
          const latFloat = parseFloat(lat);
          const lonFloat = parseFloat(lon);
          
          const map = meetupMapRef.current;
          map.setView([latFloat, lonFloat], 15);
          loadSafeSpots(latFloat, lonFloat, map);
          
          const L = window.L;
          
          // Place green marker
          L.marker([latFloat, lonFloat], {
            icon: L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })
          }).addTo(map).bindPopup(display_name).openPopup();
          
          const parts = display_name.split(',');
          const shortAddress = parts.slice(0, 3).join(',').trim();
          setSelectedMeetupSpot(shortAddress);
          setSearchQuery('');
        } else {
          alert("Location not found. Please try a different search term.");
        }
    } catch (err) {
      console.error("Geocoding search failed:", err);
      alert("Search failed. Check your internet connection.");
    } finally {
      setSearchLoading(false);
    }
  };

  const [trackingInput, setTrackingInput] = useState('');

  // AI Co-Pilot states
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [dealSlipLoading, setDealSlipLoading] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [translatingIds, setTranslatingIds] = useState({});

  const handleTranslateMessage = async (msgId, content, targetLang) => {
    setTranslatingIds((prev) => ({ ...prev, [msgId]: true }));
    try {
      const apiModule = await import('../services/api');
      const res = await apiModule.aiAPI.translateMessage(content, targetLang);
      setTranslatedMessages((prev) => ({ ...prev, [msgId]: res.data.translated_text }));
    } catch (err) {
      console.error(err);
      alert("Translation failed. Make sure the backend is fully built and running.");
    } finally {
      setTranslatingIds((prev) => ({ ...prev, [msgId]: false }));
    }
  };

  const handleSuggestReply = async () => {
    if (!activeChat) return;
    setSuggestLoading(true);
    try {
      const apiModule = await import('../services/api');
      const res = await apiModule.aiAPI.getNegotiationReply(activeChat.id);
      setInputValue(res.data.suggestion);
    } catch (err) {
      console.error(err);
      alert("Failed to get suggestion.");
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleTranslateInput = async (targetLang) => {
    if (!inputValue.trim()) {
      alert("Please type some message text to translate first!");
      return;
    }
    try {
      const apiModule = await import('../services/api');
      const res = await apiModule.aiAPI.translateMessage(inputValue, targetLang);
      setInputValue(res.data.translated_text);
    } catch (err) {
      console.error(err);
      alert("Input translation failed.");
    }
  };

  const handleGenerateDealSlip = async () => {
    if (!activeChat) return;
    setDealSlipLoading(true);
    try {
      const apiModule = await import('../services/api');
      const res = await apiModule.aiAPI.getDealSlip(activeChat.id);
      sendMessage(activeChat.id, JSON.stringify(res.data), 'dealslip');
      setIsCopilotOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to generate deal slip. Note that at least one bargain offer must be accepted before generating a deal slip.");
    } finally {
      setDealSlipLoading(false);
    }
  };

  const handleUpdateTracking = async () => {
    if (!trackingInput.trim()) return;
    try {
      const res = await transactionsAPI.updateTracking(escrowTx.id, trackingInput.trim());
      setEscrowTx(res.data);
      setTrackingInput('');
      alert("Tracking number updated! Buyer has been notified.");
    } catch (err) {
      console.error(err);
      alert("Failed to update tracking details.");
    }
  };

  const loadSafeSpots = async (lat, lon, map) => {
    if (!safeSpotsLayerRef.current) return;
    safeSpotsLayerRef.current.clearLayers();
    
    const L = window.L;
    if (!L) return;

    const safeIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    
    try {
      const query = `
        [out:json][timeout:15];
        (
          node["amenity"="restaurant"](around:2500, ${lat}, ${lon});
          node["amenity"="cafe"](around:2500, ${lat}, ${lon});
          node["amenity"="fast_food"](around:2500, ${lat}, ${lon});
          node["tourism"="hotel"](around:2500, ${lat}, ${lon});
          node["shop"="mall"](around:2500, ${lat}, ${lon});
          node["leisure"="park"](around:2500, ${lat}, ${lon});
        );
        out body 20;
      `;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Overpass API failed");
      const data = await response.json();
      const elements = data.elements || [];
      
      elements.forEach((spot) => {
        const spotName = spot.tags?.name || `${spot.tags?.amenity || spot.tags?.tourism || 'Meeting Spot'}`;
        const marker = L.marker([spot.lat, spot.lon], { icon: safeIcon });
        marker.bindPopup(`<b>${spotName}</b><br/><span class="text-xs text-slate-400">Click marker to select</span>`);
        
        // When marker is clicked, update selected location
        marker.on('click', () => {
          setSelectedMeetupSpot(spotName);
        });
        
        safeSpotsLayerRef.current.addLayer(marker);
      });
    } catch (err) {
      console.error("Failed to load safe meeting spots:", err);
      // Fallback local markers around the midpoint/searched point
      const offset = 0.003;
      const fallbacks = [
        { name: "Gloria Jean's Coffees", lat: lat + offset, lon: lon + offset },
        { name: "Espresso Cafe", lat: lat - offset, lon: lon + offset },
        { name: "Butlers Chocolate Cafe", lat: lat + offset, lon: lon - offset }
      ];
      
      fallbacks.forEach((fb) => {
        const marker = L.marker([fb.lat, fb.lon], { icon: safeIcon });
        marker.bindPopup(`<b>${fb.name}</b><br/><span class="text-xs text-slate-400">Click marker to select</span>`);
        marker.on('click', () => {
          setSelectedMeetupSpot(fb.name);
        });
        safeSpotsLayerRef.current.addLayer(marker);
      });
    }
  };

  useEffect(() => {
    if (!isMeetupModalOpen || !activeChat) return;

    const timer = setTimeout(() => {
      const L = window.L;
      if (!L) {
        console.error("Leaflet library not found on window object.");
        return;
      }

      const buyerLat = activeChat.buyer.latitude || 24.8607;
      const buyerLon = activeChat.buyer.longitude || 67.0011;
      const sellerLat = activeChat.seller.latitude || 24.8607;
      const sellerLon = activeChat.seller.longitude || 67.0011;

      const midLat = (buyerLat + sellerLat) / 2;
      const midLon = (buyerLon + sellerLon) / 2;

      // Initialize map
      const map = L.map('meetup-map').setView([midLat, midLon], 13);
      meetupMapRef.current = map;

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Custom icons
      const buyerIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const sellerIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const safeIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Markers
      L.marker([buyerLat, buyerLon], { icon: buyerIcon }).addTo(map).bindPopup("Buyer's Location").openPopup();
      L.marker([sellerLat, sellerLon], { icon: sellerIcon }).addTo(map).bindPopup("Seller's Location");
      
      // Initialize Safe Spots layer and load them dynamically around the midpoint
      const safeSpotsLayer = L.layerGroup().addTo(map);
      safeSpotsLayerRef.current = safeSpotsLayer;
      loadSafeSpots(midLat, midLon, map);

      // Midpoint circle
      L.circle([midLat, midLon], {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        radius: 1000
      }).addTo(map);

      // Click listener for custom location picking
      let customMarker = null;
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        
        // Remove previous custom marker if it exists
        if (customMarker) {
          map.removeLayer(customMarker);
        }
        
        // Add new green custom marker
        customMarker = L.marker([lat, lng], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        }).addTo(map).bindPopup("Chosen Custom Meetup Spot").openPopup();

        // Reverse geocoding via Nominatim
        let address = `Custom Spot (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        try {
          const res = await geocodingAPI.reverse(lat, lng);
          const data = res.data;
          if (data && data.display_name) {
            const parts = data.display_name.split(',');
            address = parts.slice(0, 3).join(',').trim();
          }
        } catch (err) {
          console.error("Reverse geocoding failed, falling back to coords:", err);
        }

        setSelectedMeetupSpot(address);
      });

    }, 200);

    return () => {
      clearTimeout(timer);
      if (meetupMapRef.current) {
        meetupMapRef.current.remove();
        meetupMapRef.current = null;
      }
    };
  }, [isMeetupModalOpen, activeChat]);

  // Load all chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await chatsAPI.getChats();
        setChats(res.data);
        
        // Handle direct chat opening from url param
        const urlChatId = searchParams.get('chat_id');
        if (urlChatId) {
          const found = res.data.find(c => c.id === parseInt(urlChatId, 10));
          if (found) {
            handleSelectChat(found);
          }
        }
      } catch (err) {
        console.error("Failed to load chats:", err);
      }
    };
    fetchChats();
  }, [searchParams]);

  // Subscribe to all incoming messages globally to dynamically refresh inbox list
  useEffect(() => {
    const unsubscribeGlobal = subscribeToGlobalMessages(async (newMsg) => {
      try {
        const res = await chatsAPI.getChats();
        setChats(res.data);
        refreshUnreadChatsCount();
      } catch (err) {
        console.error("Failed to sync chat list on message event:", err);
      }
    });

    return () => {
      unsubscribeGlobal();
    };
  }, [subscribeToGlobalMessages, refreshUnreadChatsCount]);

  // Handle auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to real-time events for active chat
  useEffect(() => {
    if (!activeChat) return;

    // 1. Subscribe to incoming messages
    const unsubscribeMsg = subscribeToMessages(activeChat.id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === newMsg.id && newMsg.id !== -1)) return prev;
        return [...prev, newMsg];
      });
      // Mark read receipt
      chatsAPI.markAsRead(activeChat.id).then(() => refreshUnreadChatsCount()).catch(err => console.error(err));
    });

    // 2. Subscribe to typing alerts
    const unsubscribeTyping = subscribeToTyping(activeChat.id, (data) => {
      if (String(data.sender_id) !== String(user?.id)) {
        setRecipientTyping(data.is_typing);
      }
    });

    return () => {
      unsubscribeMsg();
      unsubscribeTyping();
    };
  }, [activeChat, user]);

  const handleSelectChat = async (chat) => {
    setChatLoading(true);
    setActiveChat(chat);
    setSearchParams({ chat_id: chat.id });
    try {
      const res = await chatsAPI.getChat(chat.id);
      setMessages(res.data.messages || []);

      // Load transactions to see if there is an active escrow transaction
      const txRes = await transactionsAPI.getHistory();
      const match = txRes.data.find(tx => tx.product_id === chat.product_id && (tx.status === 'escrow' || tx.status === 'disputed'));
      setEscrowTx(match || null);
      if (match && match.status === 'disputed') {
        try {
          const dispRes = await transactionsAPI.getDispute(match.id);
          setActiveDispute(dispRes.data);
        } catch (dispErr) {
          console.error("Failed to load dispute details:", dispErr);
          setActiveDispute(null);
        }
      } else {
        setActiveDispute(null);
      }

      // Mark read
      await chatsAPI.markAsRead(chat.id);
      refreshUnreadChatsCount();
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChat) return;

    sendMessage(activeChat.id, inputValue.trim());
    setInputValue('');
    
    // Stop typing alert
    setIsTyping(false);
    sendTyping(activeChat.id, false);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    if (!isTyping && activeChat) {
      setIsTyping(true);
      sendTyping(activeChat.id, true);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (activeChat) sendTyping(activeChat.id, false);
    }, 2000);
  };

  const handleReleaseEscrow = async () => {
    if (!escrowTx) return;
    if (!window.confirm(`Are you sure you want to release the escrow payment of Rs. ${parseFloat(escrowTx.amount).toLocaleString()} to the seller?`)) return;
    
    try {
      await transactionsAPI.releaseEscrow(escrowTx.id);
      alert('🎉 Escrow released! Funds have been credited to the seller. Please take a moment to review the seller.');
      setEscrowTx(null);
      setReviewOpen(true);
    } catch (err) {
      alert('Failed to release escrow.');
    }
  };

  const handleRaiseDispute = async (e) => {
    if (e) e.preventDefault();
    if (!disputeEvidence.trim()) {
      alert("Please provide evidence details for your dispute.");
      return;
    }
    setDisputeSubmitting(true);
    try {
      await transactionsAPI.raiseDispute(escrowTx.id, disputeEvidence.trim(), disputeImage.trim() || null);
      alert("Dispute successfully raised! The escrow funds have been locked and a moderator has been assigned.");
      setIsDisputeModalOpen(false);
      setDisputeEvidence('');
      setDisputeImage('');
      handleSelectChat(activeChat);
    } catch (err) {
      console.error(err);
      alert("Failed to raise dispute.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const handleRespondDispute = async (e) => {
    if (e) e.preventDefault();
    if (!disputeEvidence.trim()) {
      alert("Please provide counter-evidence details.");
      return;
    }
    setDisputeSubmitting(true);
    try {
      await transactionsAPI.respondDispute(escrowTx.id, disputeEvidence.trim(), disputeImage.trim() || null);
      alert("Counter-evidence successfully submitted to the moderator!");
      setIsCounterModalOpen(false);
      setDisputeEvidence('');
      setDisputeImage('');
      handleSelectChat(activeChat);
    } catch (err) {
      console.error(err);
      alert("Failed to submit counter-evidence.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const handleBlockUser = async () => {
    const otherUser = activeChat.buyer_id === user.id ? activeChat.seller : activeChat.buyer;
    if (!window.confirm(`Block ${otherUser.name}? You will no longer receive their messages.`)) return;

    try {
      await chatsAPI.blockUser(otherUser.id);
      alert(`${otherUser.name} has been blocked.`);
    } catch (err) {
      alert('Error blocking user.');
    }
  };

  const handleDeleteChat = async () => {
    if (!activeChat) return;
    if (!window.confirm("Are you sure you want to permanently delete this chat? This action cannot be undone.")) return;

    try {
      await chatsAPI.deleteChat(activeChat.id);
      alert("Chat permanently deleted.");
      setActiveChat(null);
      setMessages([]);
      setEscrowTx(null);
      setSearchParams({});
      
      // Refresh chats list
      const res = await chatsAPI.getChats();
      setChats(res.data);
      refreshUnreadChatsCount();
    } catch (err) {
      alert("Failed to delete chat.");
      console.error(err);
    }
  };

  const handleDeleteChatFromList = async (chatId) => {
    if (!window.confirm("Are you sure you want to permanently delete this chat? This action cannot be undone.")) return;

    try {
      await chatsAPI.deleteChat(chatId);
      alert("Chat permanently deleted.");
      
      // If we deleted the active chat, reset active chat selection
      if (activeChat?.id === chatId) {
        setActiveChat(null);
        setMessages([]);
        setEscrowTx(null);
        setSearchParams({});
      }
      
      // Refresh chats list
      const res = await chatsAPI.getChats();
      setChats(res.data);
      refreshUnreadChatsCount();
    } catch (err) {
      alert("Failed to delete chat.");
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 h-[80vh] flex gap-6">
      {/* Left panel: Chats list */}
      <div className={`w-full md:w-80 rounded-3xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900 flex-col gap-4 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <h3 className="font-extrabold text-xl border-b border-slate-100 pb-2 dark:border-slate-800">Inbox</h3>
        <div className="flex-1 overflow-y-auto space-y-2">
          {chats.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">No chats initiated yet.</div>
          ) : (
            chats.map((c) => {
              const otherUser = c.buyer_id === user.id ? c.seller : c.buyer;
              const isActive = activeChat?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectChat(c)}
                  className={`group/item flex items-center gap-3 rounded-2xl p-3 cursor-pointer transition ${isActive ? 'bg-brand-50 border border-brand-200 dark:bg-brand-900/10 dark:border-brand-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-850'}`}
                >
                  <img src={getImageUrl(otherUser.profile_picture, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150')} alt="Avatar" className="h-10 w-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`font-bold text-sm truncate ${c.has_unread ? 'text-brand-600 dark:text-brand-400' : ''}`}>{otherUser.name}</h4>
                      {c.has_unread && (
                        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
                      )}
                    </div>
                    <span className={`text-xs truncate block ${c.has_unread ? 'text-slate-900 font-extrabold dark:text-white' : 'text-slate-400'}`}>{c.product.title}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChatFromList(c.id);
                    }}
                    className="opacity-0 group-hover/item:opacity-100 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-55 dark:hover:bg-red-950/20 transition shrink-0"
                    title="Delete Conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel: Active Chat Room */}
      <div className={`flex-1 rounded-3xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 flex-col overflow-hidden ${activeChat ? 'flex' : 'hidden md:flex'}`}>
        {activeChat ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveChat(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full md:hidden">
                  <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </button>
                <img 
                  src={getImageUrl(activeChat.buyer_id === user.id ? activeChat.seller.profile_picture : activeChat.buyer.profile_picture, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150')} 
                  alt="Avatar" 
                  className="h-10 w-10 rounded-full object-cover" 
                />
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                      {activeChat.buyer_id === user.id ? activeChat.seller.name : activeChat.buyer.name}
                    </h4>
                    <CheckCircle className="h-4 w-4 text-blue-500 fill-blue-50" />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 block">Online</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBlockUser}
                  className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                  title="Block User"
                >
                  <Ban className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDeleteChat}
                  className="p-2 rounded-xl border border-slate-200 text-red-400 hover:text-red-650 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20"
                  title="Delete Chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Custom Mockup Action Buttons Bar */}
            <div className="grid grid-cols-2 gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsMeetupModalOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#0d5c3a] py-2.5 text-xs font-bold text-white hover:bg-[#084228] transition shadow-sm"
              >
                <Shield className="h-4 w-4 text-white" />
                Safe Meetup
              </button>
              <button
                onClick={() => {
                  if (activeChat.buyer_id !== user?.id) {
                    alert("Only the buyer can make an initial bargain offer.");
                  } else {
                    setIsOfferModalOpen(true);
                  }
                }}
                className="flex items-center justify-center gap-1.5 rounded-full border border-[#0d5c3a] bg-white py-2.5 text-xs font-bold text-[#0d5c3a] hover:bg-slate-50 transition"
              >
                <Award className="h-4 w-4 text-[#0d5c3a]" />
                Make Offer
              </button>
            </div>

            {/* Escrow Banner (If active or disputed) */}
            {escrowTx && (
              <div className={`${escrowTx.status === 'disputed' ? 'bg-rose-50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30' : 'bg-amber-50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30'} p-4 border-b text-xs space-y-2`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className={`flex items-center gap-2 font-bold ${escrowTx.status === 'disputed' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    <Shield className={`h-4.5 w-4.5 ${escrowTx.status === 'disputed' ? 'text-rose-500' : 'text-amber-500'}`} />
                    <span>
                      {escrowTx.status === 'disputed' 
                        ? `🔒 Escrow Locked: Disputed (Rs. ${parseFloat(escrowTx.amount).toLocaleString()})`
                        : `Escrow Active: Rs. ${parseFloat(escrowTx.amount).toLocaleString()} held securely.`
                      }
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {escrowTx.status === 'escrow' && escrowTx.buyer_id === user.id && (
                      <>
                        <button
                          onClick={handleReleaseEscrow}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Release Funds
                        </button>
                        <button
                          onClick={() => setIsDisputeModalOpen(true)}
                          className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition"
                        >
                          Raise Dispute
                        </button>
                      </>
                    )}
                    {escrowTx.status === 'disputed' && escrowTx.seller_id === user.id && activeDispute && !activeDispute.seller_evidence && (
                      <button
                        onClick={() => setIsCounterModalOpen(true)}
                        className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
                      >
                        Submit Counter Evidence
                      </button>
                    )}
                  </div>
                </div>

                {escrowTx.status === 'disputed' && activeDispute && (
                  <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-rose-200/40 space-y-1.5 text-[11px] mb-2">
                    <div>
                      <span className="font-bold text-slate-500 block">Buyer's Claim:</span>
                      <span className="text-slate-800 dark:text-slate-200">{activeDispute.buyer_evidence}</span>
                      {activeDispute.buyer_image_url && (
                        <a href={activeDispute.buyer_image_url} target="_blank" rel="noreferrer" className="block text-brand-600 font-semibold mt-0.5 hover:underline">
                          🖼️ View Buyer Proof Image
                        </a>
                      )}
                    </div>
                    <div className="pt-1.5 border-t border-rose-100 dark:border-rose-900/20">
                      <span className="font-bold text-slate-500 block">Seller's Response:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {activeDispute.seller_evidence || 'Awaiting counter-evidence from seller...'}
                      </span>
                      {activeDispute.seller_image_url && (
                        <a href={activeDispute.seller_image_url} target="_blank" rel="noreferrer" className="block text-brand-600 font-semibold mt-0.5 hover:underline">
                          🖼️ View Seller Proof Image
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="pl-6 text-slate-500 dark:text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/40">
                  <div>
                    <span className="font-semibold block text-slate-400">Delivery Address:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-350">{escrowTx.shipping_address || 'Self Meetup / Handover'}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-400">Tracking Info:</span>
                    {escrowTx.seller_id === user.id ? (
                      <div className="flex gap-2 items-center mt-0.5">
                        <input
                          type="text"
                          placeholder="Courier / Tracking number..."
                          value={trackingInput}
                          onChange={(e) => setTrackingInput(e.target.value)}
                          className="bg-white border border-slate-200 rounded px-2 py-1 text-[11px] focus:outline-none dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                        />
                        <button
                          onClick={handleUpdateTracking}
                          className="bg-brand-600 text-white font-bold px-2 py-1 rounded hover:bg-brand-700 text-[11px]"
                        >
                          Submit
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium text-slate-750 dark:text-slate-300">
                        {escrowTx.tracking_number ? (
                          <span className="bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded font-mono font-bold dark:bg-brand-950/20 dark:text-brand-400">
                            {escrowTx.tracking_number}
                          </span>
                        ) : 'Awaiting shipment details...'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Messages Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efeae2] dark:bg-[#0b141a]">
              {chatLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600"></div>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMine = m.sender_id && user?.id && String(m.sender_id) === String(user.id);
                  const isOffer = m.message_type === 'offer';
                  let offerData = null;
                  if (isOffer) {
                    try {
                      offerData = JSON.parse(m.content);
                    } catch (e) {
                      console.error("Failed to parse offer json", e);
                    }
                  }

                  if (isOffer) {
                    const isAccepted = offerData?.status === 'accepted';
                    const isCountered = offerData?.status === 'countered';

                    return (
                      <div key={idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[75%] rounded-3xl overflow-hidden shadow-md border border-transparent">
                          {/* Green accepted block */}
                          <div className={`p-4 text-white ${
                            isAccepted 
                              ? 'bg-[#1e7e4e] dark:bg-[#135434]' 
                              : isCountered 
                                ? 'bg-amber-600 dark:bg-amber-700' 
                                : 'bg-slate-650'
                          }`}>
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <span className="font-bold text-sm tracking-wide flex items-center gap-1">
                                <Award className="h-4.5 w-4.5" />
                                Bargain Offer
                              </span>
                              <span className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-md ${
                                isAccepted 
                                  ? 'bg-[#0d5c3a] text-white' 
                                  : 'bg-white text-amber-750 font-black'
                              }`}>
                                {offerData?.status || 'PENDING'}
                              </span>
                            </div>
                            <p className="text-sm opacity-95">
                              Offered Price: <span className="text-lg font-black text-white">Rs. {parseInt(offerData?.amount || 0).toLocaleString()}</span>
                            </p>
                            <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-90 leading-relaxed">
                              {isAccepted ? (
                                <>
                                  <p className="font-bold">Counter Offer Accepted! (by User)</p>
                                  <p>This price is now locked.</p>
                                </>
                              ) : (
                                <p>{offerData?.feedback}</p>
                              )}
                              {isCountered && offerData?.counter_amount && (
                                <p className="font-bold mt-1">System Counter Offer: Rs. {parseInt(offerData.counter_amount).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                          {/* Timestamp bar */}
                          <div className="bg-white dark:bg-slate-900 px-3 py-1.5 flex justify-end border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[9px] text-[#8696a0]">
                              {m.created_at === 'Just now' ? 'Just now' : new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isDealSlip = m.message_type === 'dealslip';
                  let dealData = null;
                  if (isDealSlip) {
                    try {
                      dealData = JSON.parse(m.content);
                    } catch (e) {
                      console.error("Failed to parse dealslip json", e);
                    }
                  }

                  if (isDealSlip && dealData) {
                    return (
                      <div key={idx} className="flex justify-center">
                        <div className="max-w-[85%] w-80 rounded-3xl overflow-hidden shadow-lg border border-emerald-250 dark:border-emerald-900 bg-white dark:bg-slate-900">
                          <div className="bg-[#1c7444] p-4 text-white text-center">
                            <span className="font-extrabold text-sm uppercase tracking-wider block">🤝 Official Deal Summary</span>
                            <span className="text-[10px] opacity-75">ResellIt Trusted Escrow Protocol</span>
                          </div>
                          <div className="p-4 text-slate-800 dark:text-slate-200 text-xs space-y-2 leading-relaxed">
                            <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                              <span className="font-semibold text-slate-400">Listing:</span>
                              <span className="font-bold">{dealData.product_title}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                              <span className="font-semibold text-slate-400">Listed Price:</span>
                              <span className="font-bold">Rs. {parseInt(dealData.listing_price).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                              <span className="font-semibold text-slate-400">Agreed Price:</span>
                              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">Rs. {parseInt(dealData.final_price).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                              <span className="font-semibold text-slate-400">Seller:</span>
                              <span className="font-semibold">{dealData.seller_name}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                              <span className="font-semibold text-slate-400">Buyer:</span>
                              <span className="font-semibold">{dealData.buyer_name}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                              <span className="font-semibold text-slate-400">Handoff:</span>
                              <span className="font-bold">{dealData.handoff_method} ({dealData.location})</span>
                            </div>
                            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-2.5 text-[10px] text-emerald-700 dark:text-emerald-400 text-center font-bold border border-emerald-100 dark:border-emerald-900/30">
                              🔒 Agreed price is locked! Buyer should click "Buy Now" to lock funds in Escrow.
                            </div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900 px-3 py-2 flex justify-between border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                            <span>Transaction: Pending Checkout</span>
                            <span>
                              {m.created_at === 'Just now' ? 'Just now' : new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm border ${
                        isMine 
                          ? 'bg-[#d9fdd3] text-[#111b21] border-[#c1ebd0]/40 rounded-tr-none dark:bg-[#005c4b] dark:text-[#e9edef] dark:border-none' 
                          : 'bg-white text-[#111b21] border-slate-200/60 rounded-tl-none dark:bg-[#202c33] dark:text-[#e9edef] dark:border-none'
                      }`}>
                        <p className="break-all whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        
                        {/* Inline translation indicator / result */}
                        {translatedMessages[m.id || idx] ? (
                          <div className="mt-2 pt-1.5 border-t border-slate-100/40 dark:border-slate-800/40 text-[11px] italic text-emerald-700 dark:text-emerald-400 font-medium">
                            Translated: {translatedMessages[m.id || idx]}
                          </div>
                        ) : (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100/30 dark:border-slate-800/30 flex gap-2 text-[9px] text-slate-400">
                            <button
                              type="button"
                              onClick={() => handleTranslateMessage(m.id || idx, m.content, 'en')}
                              disabled={translatingIds[m.id || idx]}
                              className="hover:text-emerald-600 font-semibold"
                            >
                              {translatingIds[m.id || idx] ? 'Translating...' : 'Translate to EN'}
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => handleTranslateMessage(m.id || idx, m.content, 'ur_roman')}
                              disabled={translatingIds[m.id || idx]}
                              className="hover:text-emerald-600 font-semibold"
                            >
                              Roman Urdu
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => handleTranslateMessage(m.id || idx, m.content, 'ur_nastaliq')}
                              disabled={translatingIds[m.id || idx]}
                              className="hover:text-emerald-600 font-semibold"
                            >
                              اردو
                            </button>
                          </div>
                        )}
                        
                        <span className={`block mt-1 text-[9px] text-right ${isMine ? 'text-[#597a61] dark:text-[#8696a0]' : 'text-[#8696a0]'}`}>
                          {m.created_at === 'Just now' ? 'Just now' : new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              {recipientTyping && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-2.5 bg-white border border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-850 text-xs italic flex items-center gap-1.5">
                    <span className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 animate-bounce bg-slate-400 rounded-full"></span>
                      <span className="h-1.5 w-1.5 animate-bounce delay-100 bg-slate-400 rounded-full"></span>
                      <span className="h-1.5 w-1.5 animate-bounce delay-200 bg-slate-400 rounded-full"></span>
                    </span>
                    <span>Typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Co-Pilot Panel */}
            {isCopilotOpen && (
              <div className="bg-slate-50 border-t border-slate-200 p-4 dark:bg-slate-900 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1c7444] dark:text-brand-400">
                    <Sparkles className="h-4 w-4 animate-pulse text-[#1c7444]" />
                    <span>AI Bilingual Negotiation Co-Pilot</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsCopilotOpen(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {/* Suggest Response */}
                  <button
                    type="button"
                    onClick={handleSuggestReply}
                    disabled={suggestLoading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 py-2 px-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-750 transition"
                  >
                    {suggestLoading ? 'Thinking...' : '🤖 Suggest Reply'}
                  </button>

                  {/* Translate typed text */}
                  <div className="relative group/translate">
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 py-2 px-3 font-bold text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-750 transition"
                    >
                      🌐 Translate Input...
                    </button>
                    {/* Translate Dropdown */}
                    <div className="hidden group-hover/translate:block absolute bottom-full left-0 mb-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 py-1 divide-y divide-slate-100 dark:divide-slate-700">
                      <button
                        type="button"
                        onClick={() => handleTranslateInput('ur_roman')}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200"
                      >
                        To Roman Urdu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTranslateInput('ur_nastaliq')}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200"
                      >
                        To Urdu (اردو)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTranslateInput('en')}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200"
                      >
                        To English
                      </button>
                    </div>
                  </div>

                  {/* Generate Deal Slip */}
                  <button
                    type="button"
                    onClick={handleGenerateDealSlip}
                    disabled={dealSlipLoading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 py-2 px-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-750 transition"
                  >
                    {dealSlipLoading ? 'Generating...' : '🤝 Create Deal Slip'}
                  </button>
                </div>
              </div>
            )}

            {/* Input Footer */}
            <form onSubmit={handleSend} className="border-t border-slate-100 p-4 dark:border-slate-800 flex gap-2 items-center">
              <button
                type="button"
                onClick={() => setIsCopilotOpen(!isCopilotOpen)}
                className={`rounded-xl p-2.5 transition shrink-0 ${isCopilotOpen ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-850 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                title="AI Co-Pilot Help"
              >
                <Sparkles className="h-5 w-5" />
              </button>
              <input
                type="text"
                placeholder="Type your message..."
                value={inputValue}
                onChange={handleInputChange}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="rounded-xl bg-brand-600 p-2.5 text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 shrink-0"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <Shield className="h-12 w-12 text-slate-350 mb-2" />
            <p className="text-sm font-semibold">Select a conversation to start messaging</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">Chat securely. Do not share your personal credentials or checkout outside the platform.</p>
          </div>
        )}
      </div>
      {activeChat && (
        <ReviewModal
          isOpen={reviewOpen}
          onClose={() => setReviewOpen(false)}
          sellerName={activeChat.seller_id == user?.id ? activeChat.buyer.name : activeChat.seller.name}
          sellerId={activeChat.seller_id == user?.id ? activeChat.buyer_id : activeChat.seller_id}
        />
      )}

      {/* Safe Meetup Zone Modal */}
      {isMeetupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 border dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-4">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">
                Select Safe Meetup Location
              </h3>
              <button onClick={() => setIsMeetupModalOpen(false)} className="rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-extrabold text-sm px-2">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSearchLocation} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Search meeting spots or areas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 text-slate-850 dark:text-slate-200"
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="rounded-xl bg-[#0d5c3a] px-4 py-2 text-xs font-bold text-white hover:bg-[#084228] disabled:opacity-50 transition"
              >
                {searchLoading ? '...' : 'Search'}
              </button>
            </form>

            <p className="text-[11px] text-slate-400 mb-2 font-bold flex items-center gap-1">
              <span>💡</span> Search an area above or click anywhere on the map to set a meetup spot!
            </p>
            
            <div id="meetup-map-container" className="h-72 w-full rounded-2xl overflow-hidden border dark:border-slate-800 bg-slate-50 relative mb-4">
              <div id="meetup-map" className="h-full w-full"></div>
            </div>

            {selectedMeetupSpot ? (
              <form onSubmit={handleConfirmMeetup} className="space-y-4 pt-2">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-3.5 border border-emerald-100 dark:border-emerald-900/30">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 block mb-1">Selected Meeting Point:</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">{selectedMeetupSpot}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold uppercase mb-1">Select Day/Date</label>
                    <input 
                      type="date"
                      required
                      value={meetupDate}
                      onChange={(e) => setMeetupDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2.5 focus:border-brand-500 focus:outline-none text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold uppercase mb-1">Select Time</label>
                    <input 
                      type="time"
                      required
                      value={meetupTime}
                      onChange={(e) => setMeetupTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2.5 focus:border-brand-500 focus:outline-none text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="flex gap-2 text-xs">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-brand-600 py-2.5 font-bold text-white hover:bg-brand-700 dark:bg-brand-500"
                  >
                    Send Meetup Suggestion
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMeetupSpot('')}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 py-2.5 font-bold hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-1">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Safe Locations (Click to suggest meetup)</h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div 
                    onClick={() => setSelectedMeetupSpot("Gloria Jean's Coffees")}
                    className="py-2.5 flex justify-between items-center text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 px-2 rounded-xl transition"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 hover:text-brand-600">1. Gloria Jean's Coffees</span>
                      <span className="block text-slate-400 text-[10px] mt-0.5">Popular coffee shop with active public seating. Highly busy and safe.</span>
                    </div>
                    <span className="font-bold text-emerald-600 shrink-0">(0.8 km)</span>
                  </div>
                  <div 
                    onClick={() => setSelectedMeetupSpot("Espresso Cafe")}
                    className="py-2.5 flex justify-between items-center text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 px-2 rounded-xl transition"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">2. Espresso Cafe</span>
                      <span className="block text-slate-400 text-[10px] mt-0.5">Centrally located café spot with outdoor seating. Brightly lit and secure.</span>
                    </div>
                    <span className="font-bold text-emerald-600 shrink-0">(1.1 km)</span>
                  </div>
                  <div 
                    onClick={() => setSelectedMeetupSpot("Butlers Chocolate Cafe")}
                    className="py-2.5 flex justify-between items-center text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 px-2 rounded-xl transition"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">3. Butlers Chocolate Cafe</span>
                      <span className="block text-slate-400 text-[10px] mt-0.5">Premium chocolate lounge inside a bustling shopping plaza. Secure public lobby.</span>
                    </div>
                    <span className="font-bold text-emerald-600 shrink-0">(1.3 km)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Make Offer Modal */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4">Make a Bargain Offer</h3>
            <p className="text-xs text-slate-400 mb-4">Your offer will be evaluated automatically by the seller's negotiation system.</p>
            <form onSubmit={handleMakeOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Offer Amount (Rs.)</label>
                <input
                  type="number"
                  required
                  placeholder="Enter your price..."
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-850 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={offerSubmitting}
                  className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500"
                >
                  {offerSubmitting ? 'Sending...' : 'Send Offer'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOfferModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-800 text-slate-700 dark:text-slate-350"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
          </div>
      )}

      {/* Raise Dispute Modal */}
      {isDisputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border dark:border-slate-800">
            <h3 className="text-lg font-bold mb-2 text-rose-600 dark:text-rose-450">Raise Escrow Dispute</h3>
            <p className="text-xs text-slate-400 mb-4">
              Escrow funds will be locked immediately. A moderator will review your claims and proof images to resolve the transaction.
            </p>
            <form onSubmit={handleRaiseDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Explain the Issue</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe what is wrong with the package or transaction..."
                  value={disputeEvidence}
                  onChange={(e) => setDisputeEvidence(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 text-slate-800 dark:text-slate-205"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Proof Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="Link to item photo or video evidence..."
                  value={disputeImage}
                  onChange={(e) => setDisputeImage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 text-slate-800 dark:text-slate-205"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={disputeSubmitting}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                >
                  {disputeSubmitting ? 'Raising...' : 'Lock Escrow & File Claim'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDisputeModalOpen(false);
                    setDisputeEvidence('');
                    setDisputeImage('');
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-800 text-slate-700 dark:text-slate-350"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seller Counter Evidence Modal */}
      {isCounterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border dark:border-slate-800">
            <h3 className="text-lg font-bold mb-2 text-amber-600 dark:text-amber-450">Submit Counter Evidence</h3>
            <p className="text-xs text-slate-400 mb-4">
              Respond to the buyer's claims. Your counter-proof and description will be reviewed by the dispute center moderators.
            </p>
            <form onSubmit={handleRespondDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Your Defense / Explanation</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe how the package was shipped or address the buyer's claims..."
                  value={disputeEvidence}
                  onChange={(e) => setDisputeEvidence(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 text-slate-800 dark:text-slate-205"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Defense Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="Link to shipping proof, packing receipt, etc..."
                  value={disputeImage}
                  onChange={(e) => setDisputeImage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 text-slate-800 dark:text-slate-205"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={disputeSubmitting}
                  className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition"
                >
                  {disputeSubmitting ? 'Submitting...' : 'Submit Counter Defense'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCounterModalOpen(false);
                    setDisputeEvidence('');
                    setDisputeImage('');
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-800 text-slate-700 dark:text-slate-350"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
