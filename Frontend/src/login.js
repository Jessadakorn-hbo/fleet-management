import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ setAuth }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Requirement 1.1 & 1.4: Sending credentials to BE
            const response = await axios.post('http://localhost:5000/auth/login', { username, password });
            
            // Requirement 1.4: Save tokens
            const { accessToken, refreshToken } = response.data;
            localStorage.setItem('refreshToken', refreshToken); // For simplicity in 3 hours
            setAuth(accessToken); 
            
            alert("Logged in!");
        } catch (err) {
            // Requirement 1.1: Error pattern
            alert(err.response?.data?.error?.message || "Login Failed");
        }
    };

    return (
        <form onSubmit={handleLogin}>
            <h2>Dispatcher Login</h2>
            <input type="text" placeholder="Username" onChange={e => setUsername(e.target.value)} />
            <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
            <button type="submit">Login</button>
        </form>
    );
};

export default Login;