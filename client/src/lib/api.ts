import axios from 'axios';

const api = axios.create({
  baseURL: 'https://creativebriefbuilder-monorepo.onrender.com/api',
  withCredentials: true,
});

export default api;
