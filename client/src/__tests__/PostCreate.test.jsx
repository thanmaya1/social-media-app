import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PostCreate from '../components/Posts/PostCreate';

jest.mock('../lib/axios', () => ({ get: jest.fn() }));

describe('PostCreate', () => {
  test('typing @ triggers mention suggestions but does not throw', () => {
    render(
      <MemoryRouter>
        <PostCreate />
      </MemoryRouter>
    );

    const textarea = screen.getByPlaceholderText("What's happening?");
    fireEvent.change(textarea, { target: { value: '@ali' } });
    expect(textarea.value).toBe('@ali');
  });
});
