import api, { setAccessToken } from './api';

export const authService = {
  async signup(name, email, password) {
    const response = await api.post('/api/auth/signup', { name, email, password });
    return response.data;
  },

  async login(email, password) {
    const response = await api.post('/api/auth/login', { email, password });
    const { user, accessToken } = response.data.data;
    setAccessToken(accessToken);
    return user;
  },

  async logout() {
    const response = await api.post('/api/auth/logout');
    setAccessToken('');
    return response.data;
  },

  async getMe() {
    const response = await api.get('/api/auth/me');
    return response.data.data;
  },
};
export default authService;
