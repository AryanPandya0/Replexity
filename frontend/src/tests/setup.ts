import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    // Immediately trigger state change to null user to complete loading
    callback(null);
    return () => {};
  }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GithubAuthProvider: class {
    addScope = vi.fn();
  },
}));

vi.mock('../lib/firebase', () => ({
  auth: {},
  githubProvider: {
    addScope: vi.fn(),
    addScopeReturnValue: {},
  },
}));

// Mock IntersectionObserver for framer-motion viewport animations in JSDOM
class MockIntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn();
  unobserve = vi.fn();
}

globalThis.IntersectionObserver = MockIntersectionObserver as any;
