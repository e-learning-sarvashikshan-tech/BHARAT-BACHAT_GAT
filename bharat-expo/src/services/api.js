import axios from 'axios';

const api = axios.create({
  // Make sure this IP is correct!
  baseURL: 'http://192.168.29.133:8000/api', 
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 10000, 
});

export default api;