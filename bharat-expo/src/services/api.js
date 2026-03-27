import axios from 'axios';

const api = axios.create({
  // Your confirmed working IP address
  baseURL: 'http://192.168.29.132:8000/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 10000, 
});

export default api;