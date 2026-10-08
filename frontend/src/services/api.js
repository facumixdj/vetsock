import axios from 'axios'

const api = axios.create({
  baseURL: 'http://192.168.1.125:8000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vetstock_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api