import { create } from 'zustand';

// Temporary mock user for ease of development. Later we initialize with null.
const useStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('ssa_user')) || null,
  activeTest: null,
  theme: localStorage.getItem('ssa_theme') || 'lite',
  
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

  setActiveTest: (testData) => set({ activeTest: testData }),
  
  clearActiveTest: () => set({ activeTest: null }),
}));

export default useStore;
