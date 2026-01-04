import axios from 'axios';

const API_URL = "http://127.0.0.1:8000/api/v1/chat";

export const sendChat = async (payload) => {
  const response = await axios.post("http://127.0.0.1:8000/api/v1/chat", payload);
  return response.data;
};