import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Page from './index';

const useClientDataSWR = vi.fn();

vi.mock('@lobehub/ui', () => ({
  Avatar: ({ avatar, children }: { avatar?: ReactNode; children?: ReactNode }) => <div>{avatar || children}</div>,
  Empty: ({ description }: { description?: ReactNode }) => <div>{description}</div>,
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  FormGroup: ({ children, title }: { children?: ReactNode; title?: ReactNode }) => (
    <section>
      {title ? <div>{title}</div> : null}
      {children}
    </section>
  ),
}));

vi.mock('@/components/InlineTable', () => ({
  default: ({
    columns,
    dataSource,
  }: {
    columns: Array<{
      dataIndex: string;
      key: string;
      render?: (value: unknown, record: Record<string, unknown>) => ReactNode;
      title: ReactNode;
    }>;
    dataSource: Record<string, unknown>[];
  }) => (
    <div>
      {dataSource.map((record) => (
        <div key={String(record.id)}>
          {columns.map((column) => (
            <div key={column.key}>
              <span>{column.title}</span>
              <div>
                {column.render ? column.render(record[column.dataIndex], record) : record[column.dataIndex]}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
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

  it('should render the hero title once and fall back to user initials when avatar is missing', () => {
    useClientDataSWR.mockReturnValue({
      data: {
        total: 1,
        users: [
          {
            createdAt: new Date('2026-04-01T00:00:00Z'),
            email: 'alice@example.com',
            fullName: 'Alice Example',
            id: 'user-1',
            isAdmin: true,
            lastActiveAt: new Date('2026-04-02T00:00:00Z'),
            username: 'alice',
          },
        ],
      },
      error: undefined,
      isLoading: false,
    });

    render(<Page />);

    expect(screen.getAllByText('All Users')).toHaveLength(1);

    const nameHeader = screen.getByText('admin.users.columns.name').closest('div');

    expect(nameHeader).not.toBeNull();

    const nameCell = within(nameHeader as HTMLElement).getByText('A');

    expect(nameCell).toBeInTheDocument();
  });
});
