import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PostCreate from './PostCreate';

jest.mock('../../services/posts', () => ({
  createPost: jest.fn(() => Promise.resolve({})),
}));

test('renders PostCreate and allows typing', () => {
  render(<PostCreate />);
  const textarea = screen.getByPlaceholderText("What's happening?");
  fireEvent.change(textarea, { target: { value: 'Hello testing' } });
  expect(textarea.value).toBe('Hello testing');
});
