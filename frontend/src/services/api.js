import axios from 'axios';

const isProd = import.meta.env.PROD;
const API_URL = isProd ? '/_/backend/api' : 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_URL });

// ─── Health ──────────────────────────────────────────────────────────────────
export const checkHealth = async () => {
  const res = await api.get('/health', { timeout: 3000 });
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
