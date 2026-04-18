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

// ============================================================
// IN-MEMORY CACHE — Prevents repeated network calls for the
// same data within a session or short time window.
// ============================================================
const cache = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

function getCached(key) {
  const entry = cache[key];
  if (!entry) return null;
  const ttl = entry.ttl ?? CACHE_TTL_MS;
  if (Date.now() - entry.ts > ttl) {
    delete cache[key];
    return null;
  }
  return entry.data;
}

function setCache(key, data, ttlMs) {
  cache[key] = { data, ts: Date.now(), ttl: ttlMs ?? CACHE_TTL_MS };
}

function clearCache(keyPrefix) {
  Object.keys(cache).forEach(k => {
    if (!keyPrefix || k.startsWith(keyPrefix)) delete cache[k];
  });
}

// ============================================================
// WARM-UP PING — Called once on app mount to wake up the
// Vercel serverless function before user navigates to a page
// ============================================================
export async function warmupServer() {
  try {
    await api.get('/courses');
  } catch (_) {
    // Silent — just waking up the server
  }
}

export const db = {
  // --- AUTH ---
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('ssa_user', JSON.stringify(res.data));
    clearCache();
    return res.data;
  },

  async register(email, password, name, secretKey = '') {
    const res = await api.post('/auth/register', { name, email, password, secretKey });
    localStorage.setItem('ssa_user', JSON.stringify(res.data));
    clearCache();
    return res.data;
  },

  async logout() {
    localStorage.removeItem('ssa_user');
    clearCache();
  },

  async getMe() {
    // Never cache getMe — needs to be fresh for auth checks
    const res = await api.get('/auth/me', { headers: getAuthHeader() });
    return res.data;
  },

  // --- COURSES (CACHED) ---
  async getCourses() {
    const cacheKey = 'courses';
    const cached = getCached(cacheKey);
    if (cached) return cached;
    const res = await api.get('/courses');
    setCache(cacheKey, res.data);
    return res.data;
  },

  async getCourseById(courseId) {
    const courses = await this.getCourses();
    return courses.find(c => c.id === courseId);
  },

  async getLesson(courseId, levelId, lessonId) {
    const cacheKey = `lesson:${courseId}:${levelId}:${lessonId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    const res = await api.get(`/courses/lesson/${courseId}/${levelId}/${lessonId}`, {
      headers: getAuthHeader()
    });
    // Short TTL for lessons — admin config changes (allowedErrorPercent etc.) must reflect quickly
    setCache(cacheKey, res.data, 10 * 1000);
    return res.data;
  },


  // Admin Only
  async addCourse(courseData) {
    clearCache('courses');
    const res = await api.post('/courses', courseData, { headers: getAuthHeader() });
    return res.data;
  },

  async editCourse(courseId, newData) {
    clearCache('courses');
    clearCache('lesson:');
    const res = await api.put(`/courses/${courseId}`, newData, { headers: getAuthHeader() });
    return res.data;
  },

  async deleteCourse(courseId) {
    clearCache('courses');
    const res = await api.delete(`/courses/${courseId}`, { headers: getAuthHeader() });
    return res.data;
  },

  // --- RESULTS ---
  async saveAttempt(userId, attemptData) {
    clearCache('results');
    const res = await api.post('/results/submit', attemptData, { headers: getAuthHeader() });
    return res.data;
  },

  async getUserAttempts() {
    const cacheKey = 'results:my';
    const cached = getCached(cacheKey);
    if (cached) return cached;
    const res = await api.get('/results/my', { headers: getAuthHeader() });
    setCache(cacheKey, res.data);
    return res.data;
  },

  async getAllAttempts() {
    const cacheKey = 'results:all';
    const cached = getCached(cacheKey);
    if (cached) return cached;
    const res = await api.get('/results/all', { headers: getAuthHeader() });
    setCache(cacheKey, res.data);
    return res.data;
  },

  // --- PURCHASE & SETTINGS ---
  async getGlobalSettings() {
    const cacheKey = 'settings';
    const cached = getCached(cacheKey);
    if (cached) return cached;
    const res = await api.get('/purchase/settings');
    setCache(cacheKey, res.data);
    return res.data;
  },

  async updateGlobalSettings(settings) {
    clearCache('settings');
    const res = await api.post('/purchase/settings', settings, { headers: getAuthHeader() });
    return res.data;
  },

  async submitPurchaseRequest(userId, courseId) {
    clearCache('purchase');
    const res = await api.post('/purchase/submit', { courseId }, { headers: getAuthHeader() });
    return res.data;
  },

  async getPendingRequests() {
    const user = JSON.parse(localStorage.getItem('ssa_user') || '{}');
    const endpoint = user.role === 'admin' ? '/purchase/all' : '/purchase/my';
    const cacheKey = `purchase:${endpoint}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    const res = await api.get(endpoint, { headers: getAuthHeader() });
    setCache(cacheKey, res.data);
    return res.data;
  },

  async purchaseCourse(reqId, userId, courseId, durationDays = 0) {
    clearCache('purchase');
    // Direct approve using the request's _id (MongoDB ObjectId)
    if (reqId) {
      const res = await api.put(`/purchase/approve/${reqId}`, { durationDays }, { headers: getAuthHeader() });
      return res.data;
    }
    // Fallback: search by userId + courseId if no reqId
    const requests = await this.getPendingRequests();
    const req = requests.find(r => (r.userId?._id === userId || r.userId === userId) && r.courseId === courseId);
    if (req) {
       const res = await api.put(`/purchase/approve/${req._id || req.id}`, { durationDays }, { headers: getAuthHeader() });
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
    const cacheKey = 'admin:users';
    const cached = getCached(cacheKey);
    if (cached) return cached;
    const res = await api.get('/auth/users', { headers: getAuthHeader() });
    setCache(cacheKey, res.data);
    return res.data;
  },

  async adminCreateUser(email, password, name, role) {
    clearCache('admin:users');
    const res = await api.post('/auth/admin/create-user', { email, password, name, role }, { headers: getAuthHeader() });
    return res.data;
  },

  async deleteUser(userId) {
    clearCache('admin:users');
    const res = await api.delete(`/auth/${userId}`, { headers: getAuthHeader() });
    return res.data;
  },

  async updateUserAccess(userId, purchasedCourses) {
    clearCache('admin:users');
    const res = await api.put(`/auth/${userId}/access`, { purchasedCourses }, { headers: getAuthHeader() });
    return res.data;
  },

  async resetUserPassword(userId, password) {
    const res = await api.put(`/auth/${userId}/reset-password`, { password }, { headers: getAuthHeader() });
    return res.data;
  },

  async getPromos() {
    return [];
  },

  async generatePromoCode(courseId) {
    return "FREE-" + Math.random().toString(36).substring(7).toUpperCase();
  },

  async addLesson(courseId, levelId, lessonData) {
    clearCache('courses');
    clearCache('lesson:');
    const res = await api.post(`/courses/lesson/${courseId}/${levelId}`, lessonData, { headers: getAuthHeader() });
    return res.data;
  },

  async editLesson(courseId, levelId, lessonId, lessonData) {
    clearCache('courses');
    clearCache(`lesson:${courseId}`);
    const res = await api.put(`/courses/lesson/${courseId}/${levelId}/${lessonId}`, lessonData, { headers: getAuthHeader() });
    return res.data;
  },

  // --- CMS ---
  async getSiteContent() {
    const cacheKey = 'cms';
    const cached = getCached(cacheKey);
    if (cached) return cached;
    const res = await api.get('/cms');
    setCache(cacheKey, res.data);
    return res.data;
  },

  async updateSiteContent(data) {
    clearCache('cms');
    const res = await api.post('/cms', data, { headers: getAuthHeader() });
    return res.data;
  }
};

export default api;
