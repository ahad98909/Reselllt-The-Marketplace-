import axios from 'axios';

// Base URL points to the same host's /api endpoint (handled by Nginx reverse proxy or Vite dev proxy)
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function to resolve relative image/upload paths from backend
export const getImageUrl = (url, fallback = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600') => {
  if (!url) return fallback;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  // Resolve relative URLs using VITE_API_URL or fallback to relative route
  const baseUrl = import.meta.env.VITE_API_URL || '';
  // Strip trailing '/api' if present from VITE_API_URL to get the root domain
  const rootUrl = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
  return `${rootUrl}${url}`;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT authentication header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle authorization errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Optional: window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password, address, latitude, longitude) => api.post('/auth/register', { name, email, password, address, latitude, longitude }),
  getMe: () => api.get('/auth/me'),
  verifyEmail: () => api.post('/auth/verify-email'),
  googleLogin: (email, name, picture) => api.post('/auth/google', { email, name, picture }),
};

export const productsAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  markSold: (id) => api.post(`/products/${id}/sold`),
  searchSemantic: (q) => api.get('/products/search/semantic', { params: { q } }),
  searchVisual: (image) => api.post('/products/search/visual', { image }),
};

export const usersAPI = {
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  addReview: (userId, data) => api.post(`/users/${userId}/reviews`, data),
  getReviews: (userId) => api.get(`/users/${userId}/reviews`),
};

export const favoritesAPI = {
  getFavorites: () => api.get('/favorites'),
  toggleFavorite: (productId) => api.post(`/favorites/${productId}`),
};

export const chatsAPI = {
  getChats: () => api.get('/chats'),
  getChat: (id) => api.get(`/chats/${id}`),
  createChat: (productId) => api.post('/chats', { product_id: productId }),
  sendMessage: (chatId, content, messageType = 'text') => 
    api.post(`/chats/${chatId}/messages`, { content, message_type: messageType }),
  markAsRead: (chatId) => api.post(`/chats/${chatId}/read`),
  blockUser: (userId) => api.post(`/chats/block/${userId}`),
  unblockUser: (userId) => api.post(`/chats/unblock/${userId}`),
  deleteChat: (id) => api.delete(`/chats/${id}`),
  makeOffer: (chatId, amount) => api.post(`/chats/${chatId}/offer`, { amount }),
};

export const notificationsAPI = {
  getNotifications: () => api.get('/notifications'),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  readAll: () => api.post('/notifications/read-all'),
};

export const transactionsAPI = {
  createCheckout: (productId) => api.post('/transactions/checkout', { product_id: productId }),
  completeCheckout: (productId, buyerId, sessionId, shippingAddress = null) => 
    api.post('/transactions/checkout-complete', { product_id: productId, buyer_id: buyerId, session_id: sessionId, shipping_address: shippingAddress }),
  getHistory: () => api.get('/transactions/history'),
  releaseEscrow: (id) => api.post(`/transactions/${id}/release`),
  updateTracking: (id, trackingNumber) => api.post(`/transactions/${id}/tracking`, { tracking_number: trackingNumber }),
  raiseDispute: (id, evidence, imageUrl = null) => api.post(`/transactions/${id}/dispute`, { evidence, image_url: imageUrl }),
  respondDispute: (id, evidence, imageUrl = null) => api.post(`/transactions/${id}/dispute/respond`, { evidence, image_url: imageUrl }),
  getDispute: (id) => api.get(`/transactions/${id}/dispute`),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  toggleBan: (id) => api.post(`/admin/users/${id}/ban`),
  getReports: () => api.get('/admin/reports'),
  resolveReport: (id, status) => api.post(`/admin/reports/${id}/resolve?status_update=${status}`),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  createCategory: (name, slug) => api.post('/admin/categories', { name, slug }),
  updateCategory: (id, name, slug) => api.put(`/admin/categories/${id}`, { name, slug }),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  getDisputes: () => api.get('/admin/disputes'),
  resolveDispute: (id, decision) => api.post(`/admin/disputes/${id}/resolve?decision=${decision}`),
};

export const aiAPI = {
  getDescriptionSuggest: (title, categoryId, condition) => 
    api.post('/ai/description-suggest', { title, category_id: categoryId, item_condition: condition }),
  getPriceSuggest: (title, categoryId, condition) => 
    api.post('/ai/price-suggest', { title, category_id: categoryId, item_condition: condition }),
  verifyImage: (imageBase64, title, categoryName) =>
    api.post('/ai/verify-image', { image_base64: imageBase64, title, category_name: categoryName }),
  translateMessage: (content, targetLang) => 
    api.post('/ai/copilot/translate', { content, target_lang: targetLang }),
  getNegotiationReply: (chatId) => 
    api.post('/ai/copilot/negotiate', { chat_id: chatId }),
  getDealSlip: (chatId) => 
    api.get(`/ai/copilot/dealslip/${chatId}`),
};

export const geocodingAPI = {
  search: (query) => api.get(`/geocoding/search?q=${encodeURIComponent(query)}`),
  reverse: (lat, lon) => api.get(`/geocoding/reverse?lat=${lat}&lon=${lon}`)
};

export default api;
