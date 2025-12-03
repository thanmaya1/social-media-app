import React from 'react';
import { render, screen } from '@testing-library/react';
import Login from '../pages/Login';
import axios from '../lib/axios';

jest.mock('../lib/axios');

describe('Login page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form with key elements', () => {
    axios.post.mockResolvedValue({ data: { accessToken: 'token' } });
    const onLogin = jest.fn();
    render(<Login onLogin={onLogin} />);

    // Verify the form renders with key elements
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByText(/Or sign in with/i)).toBeInTheDocument();
    
    // Verify social login buttons are present
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1); // Login + Social buttons
  });
});
