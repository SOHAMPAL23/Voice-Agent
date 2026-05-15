import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: API_URL });
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.response?.data?.message;
    
    console.error(`[API Error] ${method} ${url}:`, status, detail || error.message);
    
    // Create a user-friendly message
    if (status === 429) error.message = "Nova is currently overwhelmed. Please wait a moment.";
    else if (status === 404) error.message = "The requested resource was not found.";
    else if (detail) error.message = detail;
    
    return Promise.reject(error);
  }
);

// ─── Health ──────────────────────────────────────────────────────────────────
export const checkHealth = async () => {
  const res = await api.get('/health', { timeout: 10000 });
  return res.data;
};

// ─── Todos ───────────────────────────────────────────────────────────────────
export const fetchTodos = async () => {
  const res = await api.get('/todos');
  return res.data;
};

export const fetchUpcomingTodos = async (withinMinutes = 120) => {
  const res = await api.get(`/todos/upcoming?within_minutes=${withinMinutes}`);
  return res.data;
};

export const patchTodo = async (id, update) => {
  const res = await api.patch(`/todos/${id}`, update);
  return res.data;
};

export const deleteTodoApi = async (id) => {
  const res = await api.delete(`/todos/${id}`);
  return res.data;
};

// ─── Memories ────────────────────────────────────────────────────────────────
export const fetchMemories = async () => {
  const res = await api.get('/memories');
  return res.data;
};

export const deleteMemoryApi = async (id) => {
  const res = await api.delete(`/memories/${id}`);
  return res.data;
};

// ─── Chat ────────────────────────────────────────────────────────────────────
export const sendChatMessage = async (message, history = []) => {
  const res = await api.post('/chat', { message, history }, { timeout: 45000 });
  return res.data;
};

export const sendAudioMessage = async (audioBlob, transcript = '', history = []) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('transcript', transcript);
  formData.append('history', JSON.stringify(history));
  const res = await api.post('/chat-audio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 45000,
  });
  return res.data;
};
