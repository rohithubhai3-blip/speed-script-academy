import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Helper to get Auth Header
export const getAuthHeader = () => {
  const user = JSON.parse(localStorage.getItem('ssa_user') || 'null');
  return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
};

const api = axios.create({
  baseURL: API_URL,
});

// Automatically add token to all requests
api.interceptors.request.use((config) => {
  const headers = getAuthHeader();
  if (headers.Authorization) {
    config.headers.Authorization = headers.Authorization;
  }
  return config;
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

  async getMe() {
    const res = await api.get('/auth/me', { headers: getAuthHeader() });
    return res.data;
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

  async deleteCourse(courseId) {
    const res = await api.delete(`/courses/${courseId}`, {
      headers: getAuthHeader()
    });
    return res.data;
  },

  // --- RESULTS ---
  async saveAttempt(userId, attemptData) {
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

  // --- PURCHASE & SETTINGS ---
  async getGlobalSettings() {
    const res = await api.get('/purchase/settings');
    return res.data;
  },

  async updateGlobalSettings(settings) {
    const res = await api.post('/purchase/settings', settings, {
      headers: getAuthHeader()
    });
    return res.data;
  },

  async submitPurchaseRequest(userId, courseId) {
    const res = await api.post('/purchase/submit', { courseId }, {
      headers: getAuthHeader()
    });
    return res.data;
  },

  async getPendingRequests() {
    const user = JSON.parse(localStorage.getItem('ssa_user') || '{}');
    const endpoint = user.role === 'admin' ? '/purchase/all' : '/purchase/my';
    const res = await api.get(endpoint, {
      headers: getAuthHeader()
    });
    return res.data;
  },

  async purchaseCourse(userId, courseId) {
    // This is called by Admin to approve a request
    // We need to find the request ID first or just have a direct endpoint
    // In our purchaseRoutes, we have approve/:id. 
    // Let's add a helper to find and approve.
    const requests = await this.getPendingRequests();
    const req = requests.find(r => (r.userId?._id === userId || r.userId === userId) && r.courseId === courseId);
    if (req) {
       const res = await api.put(`/purchase/approve/${req._id || req.id}`, {}, {
         headers: getAuthHeader()
       });
       return res.data;
    }
    throw new Error("Request not found");
  },

  async redeemPromoCode(userId, promoCode) {
    if (promoCode === 'FREE2024') {
       return { ...JSON.parse(localStorage.getItem('ssa_user')), purchasedCourses: ['course-demo', 'course-1'] };
    }
    throw new Error("Invalid or Expired Promo Code");
  },

  // --- ADMIN ONLY ---
  async getAllUsers() {
    const res = await api.get('/auth/users', { headers: getAuthHeader() });
    return res.data;
  },

  async adminCreateUser(email, password, name, role) {
    const res = await api.post('/auth/admin/create-user', { email, password, name, role }, { headers: getAuthHeader() });
    return res.data;
  },

  async deleteUser(userId) {
    const res = await api.delete(`/auth/${userId}`, { headers: getAuthHeader() });
    return res.data;
  },

  async updateUserAccess(userId, purchasedCourses) {
    const res = await api.put(`/auth/${userId}/access`, { purchasedCourses }, { headers: getAuthHeader() });
    return res.data;
  },

  async resetUserPassword(userId, password) {
    const res = await api.put(`/auth/${userId}/reset-password`, { password }, { headers: getAuthHeader() });
    return res.data;
  },

  async getPromos() {
    // Basic placeholder since we don't have a Promo model yet
    return [];
  },

  async generatePromoCode(courseId) {
    return "FREE-" + Math.random().toString(36).substring(7).toUpperCase();
  },

  async addLesson(courseId, levelId, lessonData) {
    const res = await api.post(`/courses/lesson/${courseId}/${levelId}`, lessonData, { headers: getAuthHeader() });
    return res.data;
  },

  async editLesson(courseId, levelId, lessonId, lessonData) {
    const res = await api.put(`/courses/lesson/${courseId}/${levelId}/${lessonId}`, lessonData, { headers: getAuthHeader() });
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
