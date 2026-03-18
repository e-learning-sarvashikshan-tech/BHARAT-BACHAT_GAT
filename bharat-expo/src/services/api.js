import axios from 'axios';

const api = axios.create({
  // Your confirmed working IP address
<<<<<<< HEAD
  baseURL: 'http://192.168.29.133:8000/api', 
=======
  baseURL: 'http://192.168.29.84:8000/api', 
>>>>>>> 150e1cc04b3850a13afa7c3ed0e23a5fc208ae18
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 10000, 
});

export default api;