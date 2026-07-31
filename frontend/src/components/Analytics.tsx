import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';

/**
 * Reusable hook to track page views automatically on route changes using React Router.
 * Can be used inside any component that is rendered within a React Router context.
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Send a pageview event with the pathname and search query params on route change
    trackPageView(location.pathname + location.search);
  }, [location]);
}

/**
 * Reusable Analytics component that automatically tracks page views.
 * Simply render this component inside your React Router context (e.g. inside <BrowserRouter>).
 */
export default function Analytics() {
  usePageTracking();
  return null;
}
