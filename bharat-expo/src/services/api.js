import axios from 'axios';

const api = axios.create({
  // Your confirmed working IP address
  baseURL: 'https://iona-irrelevant-unchaotically.ngrok-free.dev -> http://localhost:8000 ',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 10000, 
});

export default api;