import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from '../lib/axios';
import Search from '../pages/Search';

jest.mock('../lib/axios');

describe('Search page', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  test('performs tag search when query starts with #', async () => {
    const mockPosts = [{ _id: 'p1', content: '#news hello', author: { username: 'a' }, createdAt: new Date().toISOString() }];
    axios.get.mockResolvedValueOnce({ data: { posts: mockPosts } });

    render(
      <MemoryRouter initialEntries={["/search?q=%23news"]}>
        <Routes>
          <Route path="/search" element={<Search />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(screen.getByText('Posts (1)')).toBeInTheDocument();
    expect(screen.getByText('#news hello')).toBeInTheDocument();
  });
});
