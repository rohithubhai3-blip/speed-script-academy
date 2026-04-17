import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get Auth Header
const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('ssa_user') || 'null');
  return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
};

const api = axios.create({
  baseURL: API_URL,
});

export const db = {
  // --- AUTH ---
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('ssa_user', JSON.stringify(res.data));
    return res.data;
  },

  async register(email, password, name, secretKey = '') {
    const res = await api.post('/auth/register', { name, email, password, secretKey });
    localStorage.setItem('ssa_user', JSON.stringify(res.data));
    return res.data;
  },

  async logout() {
    localStorage.removeItem('ssa_user');
  },

  // --- COURSES ---
  async getCourses() {
    const res = await api.get('/courses');
    return res.data;
  },

  async getCourseById(courseId) {
    const courses = await this.getCourses();
    return courses.find(c => c.id === courseId);
  },

  async getLesson(courseId, levelId, lessonId) {
    const res = await api.get(`/courses/lesson/${courseId}/${levelId}/${lessonId}`, {
      headers: getAuthHeader()
    });
    return res.data;
  },

  // Admin Only
  async addCourse(courseData) {
    const res = await api.post('/courses', courseData, {
      headers: getAuthHeader()
    });
    return res.data;
  },

  async editCourse(courseId, newData) {
    const res = await api.put(`/courses/${courseId}`, newData, {
      headers: getAuthHeader()
    });
    return res.data;
  },

  // --- RESULTS ---
  async saveAttempt(userId, attemptData) {
    // attemptData: { courseId, levelId, lessonId, typedText, timeTakenMinutes, warnings }
    const res = await api.post('/results/submit', attemptData, {
      headers: getAuthHeader()
    });
    return res.data;
  },

  async getUserAttempts() {
    const res = await api.get('/results/my', {
      headers: getAuthHeader()
    });
    return res.data;
  },

  async getAllAttempts() {
    const res = await api.get('/results/all', {
      headers: getAuthHeader()
    });
    return res.data;
  },

  // --- CMS ---
  async getSiteContent() {
    const res = await api.get('/cms');
    return res.data;
  },

  async updateSiteContent(data) {
    const res = await api.post('/cms', data, {
      headers: getAuthHeader()
    });
    return res.data;
  }
};

export default api;
