import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Provider, initServerConfigStore } from '@/store/serverConfig/store';

import ChannelPage from './index';

vi.mock('react-router-dom', () => ({
  Navigate: ({ replace, to }: { replace?: boolean; to: string }) => (
    <div data-replace={String(!!replace)} data-testid="navigate" data-to={to} />
  ),
  useParams: () => ({ aid: 'agt_test' }),
}));

describe('agent channel route guard', () => {
  it('should redirect to the agent page when message channels are disabled', () => {
    render(
      <Provider
        createStore={() =>
          initServerConfigStore({
            serverConfig: {
              aiProvider: {},
              enableMessageChannels: false,
              telemetry: {},
            },
            serverConfigInit: true,
          })
        }
      >
        <ChannelPage />
      </Provider>,
    );

    const navigate = screen.getByTestId('navigate');

    expect(navigate.getAttribute('data-to')).toBe('/agent/agt_test');
    expect(navigate.getAttribute('data-replace')).toBe('true');
  });
});
