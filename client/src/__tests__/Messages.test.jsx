import React from 'react';
import { render, screen } from '@testing-library/react';
import Messages from '../pages/Messages';

jest.mock('../services/api', () => ({ get: jest.fn(async () => ({ data: { messages: [] } })) }));

describe('Messages page', () => {
  test('renders Messages UI', () => {
    render(<Messages />);
    expect(screen.getByText('Messages')).toBeInTheDocument();
  });
});
