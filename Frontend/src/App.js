import './App.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import RequireAuth from './components/RequireAuth';
import { clearAccessToken, getAccessToken, setAccessToken } from './auth';
import api, { refreshAccessToken } from './api';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

function App() {
  const [token, setToken] = useState(() => getAccessToken());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const setAuth = (nextToken) => {
    if (nextToken) {
      setAccessToken(nextToken);
    } else {
      clearAccessToken();
    }
    setToken(nextToken || null);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Local cleanup still needs to happen if the backend is unavailable.
    } finally {
      setAuth(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const nextAccessToken = await refreshAccessToken();
        if (isMounted) {
          setToken(nextAccessToken);
        }
      } catch (error) {
        if (isMounted) {
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isBootstrapping) {
    return (
      <main className="shell">
        <section className="login-card">
          <p className="eyebrow">Fleet Management</p>
          <h1>Checking session</h1>
          <p className="muted-text">Restoring access token from refresh session.</p>
        </section>
      </main>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          token ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage setAuth={setAuth} />
          )
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth token={token}>
            <HomePage onLogout={logout} />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to={token ? '/' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
