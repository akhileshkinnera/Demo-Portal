import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppRoutes } from '../App';
import { AuthProvider } from '../context/AuthContext';
import Carousel from '../components/Carousel';
import { ApiError } from '../services/api';
import { classifyLink, safeImageUrl } from '../utils/links';
import { validateIdentifier, validatePassword } from '../utils/validators';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return { ...actual, login: vi.fn(), getContent: vi.fn() };
});
import * as api from '../services/api';

const CONTENT = {
  carousel: [
    { id: '1', title: 'Slide One', text: 'First', imageUrl: '', linkUrl: '', linkText: '' },
    { id: '2', title: 'Slide Two', text: 'Second', imageUrl: '', linkUrl: '', linkText: '' },
    { id: '3', title: 'Slide Three', text: 'Third', imageUrl: '', linkUrl: '', linkText: '' },
  ],
  tabs: [
    { id: '1', label: 'Home', path: '/app/home', icon: 'home' },
    { id: '2', label: 'Reports', path: '/app/reports', icon: 'reports' },
    { id: '5', label: 'Logout', path: '/logout', icon: 'logout' },
  ],
  tiles: [
    { id: '1', title: 'Reports Tile', description: 'desc', icon: 'reports', path: '/app/reports' },
    { id: '2', title: 'Services Tile', description: 'desc', icon: 'services', path: '/app/services' },
  ],
};

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function seedSession() {
  sessionStorage.setItem(
    'portal.session',
    JSON.stringify({ token: 't', exp: Date.now() + 3600000, user: { name: 'Asha Rao', email: 'a@x.com', role: 'user' } }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getContent.mockResolvedValue(CONTENT);
});

describe('validators and link safety', () => {
  it('validates identifier and password', () => {
    expect(validateIdentifier('')).toMatch(/enter/i);
    expect(validateIdentifier('a@b')).toMatch(/valid email/i);
    expect(validateIdentifier('ab')).toMatch(/3-50/);
    expect(validateIdentifier('asha.rao')).toBe('');
    expect(validateIdentifier('asha@example.com')).toBe('');
    expect(validatePassword('')).toMatch(/enter/i);
    expect(validatePassword('x')).toBe('');
  });

  it('rejects unsafe URLs from the sheet', () => {
    expect(classifyLink('javascript:alert(1)')).toBeNull();
    expect(classifyLink('//evil.com')).toBeNull();
    expect(classifyLink('/app/reports')).toEqual({ type: 'internal', to: '/app/reports' });
    expect(classifyLink('https://example.com')?.type).toBe('external');
    expect(safeImageUrl('http://insecure.com/a.png')).toBeNull();
    expect(safeImageUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(safeImageUrl('https://ok.com/a.png')).toBe('https://ok.com/a.png');
  });
});

describe('main page', () => {
  it('shows welcome page with a Login button', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: /welcome to/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login');
  });
});

describe('route protection', () => {
  it('redirects unauthenticated users from a direct dashboard URL to login', () => {
    renderAt('/app/reports');
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(api.getContent).not.toHaveBeenCalled();
  });

  it('ignores an expired session', () => {
    sessionStorage.setItem('portal.session', JSON.stringify({ token: 't', exp: Date.now() - 1000, user: {} }));
    renderAt('/app/home');
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });
});

describe('login', () => {
  it('shows validation errors and does not call the server', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('Enter your username or email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it('shows an error for invalid credentials', async () => {
    api.login.mockRejectedValue(new ApiError('INVALID_CREDENTIALS', 'Invalid username or password.'));
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText('Username or email'), 'asha');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.');
    expect(sessionStorage.getItem('portal.session')).toBeNull();
  });

  it('navigates to the dashboard after a successful login', async () => {
    api.login.mockResolvedValue({ token: 'tok', exp: Date.now() + 3600000, user: { name: 'Asha Rao', email: 'a@x.com', role: 'user' } });
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText('Username or email'), 'asha');
    await user.type(screen.getByLabelText('Password'), 'Correct-horse-9');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText(/welcome back, asha/i)).toBeInTheDocument();
    expect(api.getContent).toHaveBeenCalledWith('tok');
    // the password is never written to storage
    expect(sessionStorage.getItem('portal.session')).not.toContain('Correct-horse-9');
  });
});

describe('dashboard and logout', () => {
  it('renders carousel, tabs and tiles from loaded content', async () => {
    seedSession();
    renderAt('/app/home');
    expect(await screen.findByText('Reports Tile')).toBeInTheDocument();
    expect(screen.getByText('Services Tile')).toBeInTheDocument();
    expect(screen.getAllByTestId('carousel-slide')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('shows an error with retry when content fails to load', async () => {
    seedSession();
    api.getContent.mockRejectedValueOnce(new ApiError('NETWORK', 'Unable to reach the server.'));
    const user = userEvent.setup();
    renderAt('/app/home');
    expect(await screen.findByText('Unable to reach the server.')).toBeInTheDocument();
    // Logout must remain available even when tabs failed to load
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Reports Tile')).toBeInTheDocument();
  });

  it('logs out when the server rejects the token', async () => {
    seedSession();
    api.getContent.mockRejectedValue(new ApiError('UNAUTHORIZED', 'expired'));
    renderAt('/app/home');
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(sessionStorage.getItem('portal.session')).toBeNull();
  });

  it('logout clears the session and returns to the Main Page; protected URLs stay blocked', async () => {
    seedSession();
    const user = userEvent.setup();
    const { unmount } = renderAt('/app/home');
    await user.click(await screen.findByRole('button', { name: /logout/i }));

    expect(await screen.findByRole('heading', { level: 1, name: /welcome to/i })).toBeInTheDocument();
    expect(sessionStorage.getItem('portal.session')).toBeNull();
    unmount();

    // direct URL after logout
    renderAt('/app/settings');
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('opens a tile page when a tile is clicked', async () => {
    seedSession();
    const user = userEvent.setup();
    renderAt('/app/home');
    await user.click(await screen.findByRole('link', { name: /reports tile/i }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument();
  });
});

describe('carousel', () => {
  const slides = CONTENT.carousel;
  const activeIndex = () => {
    const track = document.querySelector('.carousel__track');
    return Math.round(-parseFloat(track.style.transform.match(/-?[\d.]+/)[0]) / 100) || 0;
  };

  it('supports previous, next and indicator navigation', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Carousel slides={slides} /></MemoryRouter>);
    expect(activeIndex()).toBe(0);
    await user.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(activeIndex()).toBe(1);
    await user.click(screen.getByRole('button', { name: 'Previous slide' }));
    await user.click(screen.getByRole('button', { name: 'Previous slide' })); // wraps to last
    expect(activeIndex()).toBe(2);
    await user.click(screen.getByRole('button', { name: 'Go to slide 2' }));
    expect(activeIndex()).toBe(1);
    expect(screen.getByRole('button', { name: 'Go to slide 2' })).toHaveAttribute('aria-current', 'true');
  });

  it('slides automatically and pauses on hover', async () => {
    vi.useFakeTimers();
    try {
      render(<MemoryRouter><Carousel slides={slides} interval={1000} /></MemoryRouter>);
      expect(activeIndex()).toBe(0);
      act(() => { vi.advanceTimersByTime(1100); });
      expect(activeIndex()).toBe(1);

      const region = screen.getByRole('region', { name: 'Announcements' });
      act(() => { region.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
      // React's onMouseEnter is driven by mouseover in jsdom
      act(() => { vi.advanceTimersByTime(3000); });
      expect(activeIndex()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
