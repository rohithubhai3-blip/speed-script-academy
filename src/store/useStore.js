import { create } from 'zustand';

// Temporary mock user for ease of development. Later we initialize with null.
const useStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('ssa_user')) || null,
  activeTest: null,
  theme: localStorage.getItem('ssa_theme') || 'dark',
  announcement: { message: '', expiresAt: null },
  
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'lite' ? 'dark' : 'lite';
    localStorage.setItem('ssa_theme', newTheme);
    return { theme: newTheme };
  }),
  
  login: (userData) => {
    localStorage.setItem('ssa_user', JSON.stringify(userData));
    set({ user: userData });
  },

  updateUser: (userData) => {
    localStorage.setItem('ssa_user', JSON.stringify(userData));
    set({ user: userData });
  },
  
  logout: () => {
    localStorage.removeItem('ssa_user');
    set({ user: null });
  },

  setAnnouncement: (data) => set({ announcement: data }),

  toasts: [],
  modal: null,

  // Toast Management
  addToast: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    // Auto-remove after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }));
    }, 4000);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  // Modal Management
  showModal: (config) => set({ modal: config }),
  hideModal: () => set({ modal: null }),

  setActiveTest: (testData) => set({ activeTest: testData }),
  
  clearActiveTest: () => set({ activeTest: null }),
}));

export default useStore;
