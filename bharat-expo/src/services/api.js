import axios from 'axios';

// Updated to your new local IP address
const API_URL = 'http://192.168.29.84:8000/api'; 

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

export default api;