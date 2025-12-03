import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PostCard from '../components/Posts/PostCard';

// Mock AuthContext to provide a current user
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user1', username: 'tester', roles: ['user'] } }),
}));

// Mock FollowButton to avoid network calls
jest.mock('../components/User/FollowButton', () => () => <button>Follow</button>);

describe('PostCard mentions and hashtags', () => {
  test('renders @mentions and #hashtags as links', () => {
    const post = {
      _id: 'p1',
      author: { _id: 'a1', username: 'author', profilePicture: '' },
      content: '@alice hello #news',
      likes: [],
      comments: [],
      images: [],
      createdAt: new Date().toISOString(),
      blockedByCurrentUser: false,
      blockedCurrentUser: false,
    };

    render(
      <MemoryRouter>
        <PostCard post={post} onLike={() => {}} />
      </MemoryRouter>
    );

    const mention = screen.getByText('@alice');
    const hashtag = screen.getByText('#news');
    expect(mention.tagName.toLowerCase()).toBe('a');
    expect(hashtag.tagName.toLowerCase()).toBe('a');
  });
});
