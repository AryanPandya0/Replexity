import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
  it('renders the navigation bar with brand name', () => {
    // Render the App component wrapped in its internal BrowserRouter
    render(<App />);
    
    // Assert the brand "Replexity" is in the document
    const brandElements = screen.getAllByText(/Replexity/i);
    expect(brandElements.length).toBeGreaterThan(0);
  });

  it('renders the Home and Analyze links', () => {
    render(<App />);
    
    // Check navigation links
    expect(screen.getByRole('link', { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Analyze/i })).toBeInTheDocument();
  });
});
