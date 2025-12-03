import React from 'react';
import { render, screen } from '@testing-library/react';
import Feed from '../components/Posts/Feed';
import * as postsService from '../services/posts';

jest.mock('../services/posts');

describe('Feed', () => {
  test('renders posts from service', async () => {
    const sample = { posts: [{ _id: '1', content: 'Hello world', author: { username: 'alice' } }] };
    postsService.getFeed.mockResolvedValueOnce(sample);
    render(<Feed />);

    const el = await screen.findByText(/Hello world/i);
    expect(el).toBeInTheDocument();
  });
});
