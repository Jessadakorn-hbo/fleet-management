import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000'
});

// The Secret Helper (Interceptor)
api.interceptors.response.use(
    (response) => response, // If everything is okay, just keep going
    async (error) => {
        const originalRequest = error.config;

        // If the error is 401 (Expired Wristband) and we haven't tried fixing it yet
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refreshToken');

            try {
                // Try to get a new Wristband using the VIP Card [cite: 88]
                const res = await axios.post('http://localhost:5000/auth/refresh', { refreshToken });
                const { accessToken } = res.data;

                // Update the broken request with the new Wristband and try again
                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // If the VIP Card is also expired, kick them out to login [cite: 92]
                window.location.href = '/login?message=session_expired';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;