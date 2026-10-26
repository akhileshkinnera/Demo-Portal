// DEVELOPMENT ONLY - sample backend so you can try the UI without Google Sheets.
// Enabled by VITE_USE_MOCK=true in .env.local. Never included in production builds.
import { ApiError } from './api.js';

const DEMO_USER = { identifier: 'demo', email: 'demo@example.com', password: 'Demo@12345', name: 'Demo User', role: 'admin' };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const content = {
  carousel: [
    { id: '1', title: 'Welcome to Company Portal', text: 'Your one place for reports, services and company updates.', imageUrl: '', linkUrl: '/app/reports', linkText: 'View reports' },
    { id: '2', title: 'Quarterly Reports Available', text: 'The latest quarterly performance reports are ready to view.', imageUrl: '', linkUrl: '/app/services', linkText: 'Explore services' },
    { id: '3', title: 'Scheduled Maintenance', text: 'Some services will be unavailable on Sunday between 2:00 and 4:00 AM IST.', imageUrl: '', linkUrl: '', linkText: '' },
  ],
  tabs: [
    { id: '1', label: 'Home', path: '/app/home', icon: 'home' },
    { id: '2', label: 'Reports', path: '/app/reports', icon: 'reports' },
    { id: '3', label: 'Services', path: '/app/services', icon: 'services' },
    { id: '4', label: 'Settings', path: '/app/settings', icon: 'settings' },
    { id: '5', label: 'Logout', path: '/logout', icon: 'logout' },
  ],
  tiles: [
    { id: '1', title: 'Reports', description: 'View and download business reports and analytics.', icon: 'reports', path: '/app/reports' },
    { id: '2', title: 'Services', description: 'Browse available services and submit requests.', icon: 'services', path: '/app/services' },
    { id: '3', title: 'Settings', description: 'Manage your profile and preferences.', icon: 'settings', path: '/app/settings' },
    { id: '4', title: 'Documents', description: 'Policies, templates and shared files.', icon: 'docs', path: '/app/module/documents' },
    { id: '5', title: 'Support', description: 'Raise a ticket or contact the help desk.', icon: 'support', path: '/app/module/support' },
    { id: '6', title: 'Calendar', description: 'Upcoming events, holidays and deadlines.', icon: 'calendar', path: '/app/module/calendar' },
    { id: '7', title: 'Team Directory', description: 'Find colleagues and departments.', icon: 'users', path: '/app/module/directory' },
    { id: '8', title: 'Notifications', description: 'Alerts and recent activity.', icon: 'bell', path: '/app/module/notifications' },
  ],
};

export async function mockCall(action, payload) {
  await wait(500);

  if (action === 'login') {
    const id = String(payload.identifier || '').trim().toLowerCase();
    if ((id === DEMO_USER.identifier || id === DEMO_USER.email) && payload.password === DEMO_USER.password) {
      const exp = Date.now() + 2 * 60 * 60 * 1000;
      return { token: 'mock-token', exp, user: { name: DEMO_USER.name, email: DEMO_USER.email, role: DEMO_USER.role } };
    }
    throw new ApiError('INVALID_CREDENTIALS', 'Invalid username or password.');
  }

  if (action === 'content') {
    if (payload.token !== 'mock-token') throw new ApiError('UNAUTHORIZED', 'Your session has expired. Please log in again.');
    return content;
  }

  throw new ApiError('BAD_REQUEST', 'Unknown request.');
}
