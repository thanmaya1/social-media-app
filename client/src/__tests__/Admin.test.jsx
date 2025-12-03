import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Admin from '../pages/Admin';
import * as adminService from '../services/admin';
import * as socket from '../socket';

jest.mock('../services/admin');
jest.mock('../socket');

describe('Admin page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders and loads initial data', async () => {
    adminService.fetchUsers.mockResolvedValue([
      { _id: 'u1', username: 'alice', roles: ['user'], isVerified: false, isActive: true },
    ]);
    adminService.fetchModerationQueue.mockResolvedValue([
      { _id: 'r1', reporter: { username: 'bob' }, reason: 'spam', targetType: 'post', target: { content: 'spammy' } },
    ]);
    adminService.fetchSettings.mockResolvedValue({ autoVerifySocial: false });
    socket.connectSocket.mockReturnValue(null);
    socket.subscribe.mockReturnValue(() => {});

    render(<Admin />);

    // Test that the component renders
    await waitFor(() => {
      expect(adminService.fetchUsers).toHaveBeenCalled();
    });
  });
});
