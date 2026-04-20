import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ServerConfigStoreProvider } from '@/store/serverConfig/Provider';

import { ProviderDetailPage, ProviderLayout } from './index';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  Outlet: () => <div>outlet</div>,
  useNavigate: () => mockNavigate,
  useParams: () => ({ providerId: 'openai' }),
}));

vi.mock('@/const/version', () => ({
  isCustomBranding: false,
}));

vi.mock('./ProviderMenu', () => ({
  default: () => <div>provider-menu</div>,
}));

vi.mock('./_layout/Desktop/Container', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('./(list)/Footer', () => ({
  default: () => <div>footer</div>,
}));

vi.mock('./detail', () => ({
  default: () => <div>detail-page</div>,
}));

describe('settings provider route guard', () => {
  it('should redirect provider layout when provider settings are disabled', async () => {
    render(
      <ServerConfigStoreProvider featureFlags={{ provider_settings: false }}>
        <ProviderLayout />
      </ServerConfigStoreProvider>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings/service-model', { replace: true });
    });
  });

  it('should redirect provider detail page when provider settings are disabled', async () => {
    render(
      <ServerConfigStoreProvider featureFlags={{ provider_settings: false }}>
        <ProviderDetailPage />
      </ServerConfigStoreProvider>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings/service-model', { replace: true });
    });
  });
});
