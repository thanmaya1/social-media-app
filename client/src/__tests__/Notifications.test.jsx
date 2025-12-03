import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Notifications from '../pages/Notifications';
import axios from '../lib/axios';
import * as socket from '../socket';

jest.mock('../lib/axios');
jest.mock('../socket');

describe('Notifications page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders and fetches notifications', async () => {
    axios.get.mockImplementation((url) => {
      if (url.startsWith('/notifications?')) return Promise.resolve({ data: { notifications: [{ _id: 'n1', type: 'message', message: 'Hi' }] } });
      if (url === '/notifications/unread-count') return Promise.resolve({ data: { unread: 1 } });
      return Promise.resolve({ data: {} });
    });
    socket.connectSocket.mockReturnValue(null);
    socket.subscribe.mockReturnValue(() => {});

    render(<Notifications />);
    
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });
});
