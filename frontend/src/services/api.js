// import axios from 'axios';

// const API_URL = "http://127.0.0.1:8000/api/v1/chat";

// export const sendChat = async (payload) => {
//   const response = await axios.post("http://127.0.0.1:8000/api/v1/chat", payload);
//   return response.data;
// };

import axios from 'axios';

// 1. Define the base URL. 
// If VITE_API_URL exists in Vercel settings, it uses that.
// Otherwise, it falls back to your local machine for testing.
const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const API_ENDPOINT = `${BASE_URL}/api/v1/chat`;

export const sendChat = async (payload) => {
  try {
    const response = await axios.post(API_ENDPOINT, payload);
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};