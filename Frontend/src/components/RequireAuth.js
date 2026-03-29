import { Navigate } from 'react-router-dom';

function RequireAuth({ token, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RequireAuth;
