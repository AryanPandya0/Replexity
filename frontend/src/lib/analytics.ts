import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let isInitialized = false;

/**
 * Initializes Google Analytics 4 if a valid Measurement ID is provided.
 * Ensures no errors are thrown if the ID is missing.
 */
export const initGA = () => {
  if (isInitialized) return;

  if (GA_MEASUREMENT_ID) {
    try {
      ReactGA.initialize(GA_MEASUREMENT_ID);
      isInitialized = true;
      if (import.meta.env.DEV) {
        console.log('Google Analytics 4 initialized successfully.');
      }
    } catch (error) {
      console.error('Failed to initialize Google Analytics 4:', error);
    }
  } else {
    if (import.meta.env.DEV) {
      console.warn('Google Analytics 4 Measurement ID is missing. Analytics tracking is disabled.');
    }
  }
};

/**
 * Tracks a pageview.
 * Safe to call even if GA4 is not initialized.
 * @param path The relative path of the page (e.g. '/dashboard').
 * @param title The page title (optional).
 */
export const trackPageView = (path: string, title?: string) => {
  if (isInitialized) {
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title: title || document.title,
    });
  } else if (import.meta.env.DEV) {
    console.log(`[GA4 Mock] Pageview tracked for: ${path}`);
  }
};

/**
 * Tracks a custom event.
 * Safe to call even if GA4 is not initialized.
 */
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (isInitialized) {
    ReactGA.event({
      action,
      category,
      label,
      value,
    });
  } else if (import.meta.env.DEV) {
    console.log(`[GA4 Mock] Event tracked - Category: ${category}, Action: ${action}, Label: ${label}, Value: ${value}`);
  }
};
