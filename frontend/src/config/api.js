import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for large file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log outgoing requests in development
    if (import.meta.env.DEV) {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeUser('user_data');
      window.location.href = '/login';
    }
    
    // Handle network errors
    if (error.code === 'NETWORK_ERROR') {
      console.error('Network error - backend may be down');
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  sendOTP: (email) => api.post('/auth/login', { email }),
  verifyOTP: (email, otp) => api.post('/auth/verify', { email, otp }),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }
};

export const transcriptionAPI = {
  uploadAudio: (audioFile, metadata = {}) => {
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    
    // Add metadata if provided
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });
    
    return api.post('/transcribe/audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getModels: () => api.get('/transcribe/models'),
};

export const soapAPI = {
  generateSOAP: (data) => api.post('/soap/generate', data),
  refineSOAP: (soapNote, refinementNotes) => 
    api.post('/soap/refine', { soap_note: soapNote, refinement_notes: refinementNotes }),
  getTemplates: () => api.get('/soap/templates'),
  getStatistics: () => api.get('/soap/statistics'),
};

export const fileAPI = {
  uploadToBlob: (filename, data) => api.post('/files/upload', { filename, data }),
  downloadFromBlob: (fileId) => api.get(`/files/download/${fileId}`),
  listFiles: () => api.get('/files/list'),
};

export const adminAPI = {
  getUsageStats: () => api.get('/admin/stats'),
  getLogs: (filters = {}) => api.get('/admin/logs', { params: filters }),
  getUsers: () => api.get('/admin/users'),
};

// Utility functions
export const setAuthToken = (token) => {
  localStorage.setItem('auth_token', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    // Simple JWT token validation (check if expired)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch (error) {
    return false;
  }
};

export const getUserRole = () => {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || 'doctor';
  } catch (error) {
    return null;
  }
};

// Toast notification helper
export const showToast = (message, type = 'info') => {
  // This will be implemented with the toast component
  console.log(`Toast [${type}]: ${message}`);
  
  // Create a simple toast for now
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 animate-fade-in ${
    type === 'error' ? 'bg-red-500' : 
    type === 'success' ? 'bg-green-500' : 
    type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
  } text-white`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
};

export default api;