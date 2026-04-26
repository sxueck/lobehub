import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUserStore } from '@/store/user';

import UserUpdater from './UserUpdater';

const { useSession } = vi.hoisted(() => ({
  useSession: vi.fn(),
}));

vi.mock('@/libs/better-auth/auth-client', () => ({
  useSession,
}));

describe('BetterAuth UserUpdater', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useSession.mockReset();
  });

  it('preserves profile fields loaded from user state when syncing session user', async () => {
    useUserStore.setState({
      user: {
        avatar: '/webapi/user/avatar.png',
        email: 'old@example.com',
        fullName: 'Old Name',
        id: 'user-1',
        interests: ['Development'],
        isAdmin: true,
        username: 'old-name',
      },
    });

    useSession.mockReturnValue({
      data: {
        user: {
          email: 'new@example.com',
          id: 'user-1',
          name: 'New Name',
          username: 'new-name',
        },
      },
      error: undefined,
      isPending: false,
    });

    render(<UserUpdater />);

    await waitFor(() => {
      expect(useUserStore.getState().user).toMatchObject({
        avatar: '/webapi/user/avatar.png',
        email: 'new@example.com',
        fullName: 'New Name',
        id: 'user-1',
        interests: ['Development'],
        isAdmin: true,
        username: 'new-name',
      });
    });
  });

  it('does not preserve profile fields when the session user changes', async () => {
    useUserStore.setState({
      user: {
        avatar: '/webapi/user/avatar.png',
        email: 'old@example.com',
        fullName: 'Old Name',
        id: 'user-1',
        interests: ['Development'],
        isAdmin: true,
        username: 'old-name',
      },
    });

    useSession.mockReturnValue({
      data: {
        user: {
          email: 'new@example.com',
          id: 'user-2',
          name: 'New Name',
          username: 'new-name',
        },
      },
      error: undefined,
      isPending: false,
    });

    render(<UserUpdater />);

    await waitFor(() => {
      expect(useUserStore.getState().user).toMatchObject({
        avatar: '',
        email: 'new@example.com',
        fullName: 'New Name',
        id: 'user-2',
        username: 'new-name',
      });
      expect(useUserStore.getState().user?.interests).toBeUndefined();
      expect(useUserStore.getState().user?.isAdmin).toBeUndefined();
    });
  });
});
