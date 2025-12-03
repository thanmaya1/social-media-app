import React from 'react';
import { render, screen } from '@testing-library/react';
import Login from '../components/Auth/Login';
import Register from '../components/Auth/Register';

jest.mock('../services/auth', () => ({ login: jest.fn(async () => ({})), register: jest.fn(async () => ({})) }));

describe('Auth components', () => {
  test('renders login and register', () => {
    render(<Login />);
    expect(screen.getByText('Login')).toBeInTheDocument();
    render(<Register />);
    expect(screen.getByText('Register')).toBeInTheDocument();
  });
});
