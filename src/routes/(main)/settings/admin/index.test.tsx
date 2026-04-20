import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Page from './index';

const useClientDataSWR = vi.fn();

vi.mock('@lobehub/ui', () => ({
  Empty: ({ description }: { description?: ReactNode }) => <div>{description}</div>,
  FormGroup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/InlineTable', () => ({
  default: () => <div>inline-table</div>,
}));

vi.mock('@/libs/swr', () => ({
  useClientDataSWR: (...args: unknown[]) => useClientDataSWR(...args),
}));

vi.mock('@/routes/(main)/settings/features/SettingHeader', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/services/user', () => ({
  userService: {
    queryAdminUsers: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          'admin.desc': 'Review all registered users in the current deployment.',
          'admin.users.empty': 'No users found',
          'admin.users.loadFailed': 'Failed to load user list',
          'admin.users.searchButton': 'Search',
          'admin.users.searchPlaceholder': 'Search by name, email, username, or user ID',
          'admin.users.title': 'All Users',
          'tab.admin': 'Admin',
        } as Record<string, string>
      )[key] || key,
  }),
}));

describe('settings admin page', () => {
  beforeEach(() => {
    useClientDataSWR.mockReset();
  });

  it('should reset the applied keyword when the search input is cleared', async () => {
    useClientDataSWR.mockReturnValue({ data: { total: 0, users: [] }, error: undefined, isLoading: false });

    render(<Page />);

    fireEvent.change(screen.getByPlaceholderText('Search by name, email, username, or user ID'), {
      target: { value: 'alice' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(useClientDataSWR).toHaveBeenLastCalledWith(
        ['admin-users', 'alice', 1, 20],
        expect.any(Function),
      );
    });

    fireEvent.change(screen.getByPlaceholderText('Search by name, email, username, or user ID'), {
      target: { value: '' },
    });

    await waitFor(() => {
      expect(useClientDataSWR).toHaveBeenLastCalledWith(
        ['admin-users', '', 1, 20],
        expect.any(Function),
      );
    });
  });
});
