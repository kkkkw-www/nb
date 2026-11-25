import { Outlet, useLocation } from 'react-router';
import ReleaseRequestsPage from './index.js';
export default function Executions() {
  const location = useLocation();
  return location.pathname.endsWith('/executions') ? (
    <ReleaseRequestsPage />
  ) : (
    <Outlet />
  );
}
