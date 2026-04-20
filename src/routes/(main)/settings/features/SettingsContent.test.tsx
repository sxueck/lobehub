import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsTabs } from '@/store/global/initialState';

import SettingsContent from './SettingsContent';

const mockNavigate = vi.fn();
const useUserStore = vi.fn();
const useServerConfigStore = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/features/NavHeader', () => ({
  default: () => <div>nav-header</div>,
}));

vi.mock('@/features/Setting/SettingContainer', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/store/serverConfig', () => ({
  serverConfigSelectors: {
    enableBusinessFeatures: 'enableBusinessFeatures',
  },
  useServerConfigStore: (selector: unknown) => useServerConfigStore(selector),
}));

vi.mock('@/store/user', () => ({
  useUserStore: (selector: unknown) => useUserStore(selector),
}));

vi.mock('@/store/user/selectors', () => ({
  userProfileSelectors: {
    isAdmin: 'isAdmin',
  },
}));

vi.mock('./componentMap', () => ({
  componentMap: {
    admin: () => <div>admin-page</div>,
    appearance: () => <div>appearance-page</div>,
    profile: () => <div>profile-page</div>,
  },
}));

describe('SettingsContent', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    useServerConfigStore.mockReset();
    useUserStore.mockReset();
  });

  it('should not redirect admin tab before user state initialization completes', async () => {
    useServerConfigStore.mockReturnValue(false);
    useUserStore.mockImplementation((selector: unknown) => {
      if (selector === 'isAdmin') return false;

      return false;
    });

    render(<SettingsContent activeTab={SettingsTabs.Admin} />);

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('should redirect non-admin users away from admin tab after user state initialization', async () => {
    useServerConfigStore.mockReturnValue(false);
    useUserStore.mockImplementation((selector: unknown) => {
      if (selector === 'isAdmin') return false;

      return true;
    });

    render(<SettingsContent activeTab={SettingsTabs.Admin} />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings/profile', { replace: true });
    });
  });
});
