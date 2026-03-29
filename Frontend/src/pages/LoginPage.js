import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function LoginPage({ setAuth }) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/login', { identifier, password });
      const { accessToken } = response.data;
      setAuth(accessToken);
      navigate('/', { replace: true });
    } catch (error) {
      setErrorMessage(error.response?.data?.error?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="shell">
      <section className="login-card">
        <div className="login-copy">
          <p className="eyebrow">Secure access</p>
          <h1>Sign in to Fleet Management</h1>
          <p className="muted-text">
            Use username, email, id, or name together with a valid password for an admin or driver account.
          </p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <label className="field">
            <span>Identifier</span>
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Enter username or email"
              autoComplete="username email"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </label>

          {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
