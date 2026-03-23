import axios from 'axios';

const api = axios.create({
  // Your confirmed working IP address
  baseURL: 'https://iona-irrelevant-unchaotically.ngrok-free.app/api', 
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 10000, 
});

export default api;