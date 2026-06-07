  import axios from 'axios';

const api = axios.create({
  baseURL: 'http://flyingclass.localhost:8001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptors for token/auth if needed later
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
