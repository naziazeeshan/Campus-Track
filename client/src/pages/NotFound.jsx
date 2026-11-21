import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="placeholder" style={{ padding: '4rem 1rem' }}>
      <h1>404</h1>
      <p>Page not found.</p>
      <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
    </div>
  );
}
