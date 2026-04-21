'use client';

import { Flexbox } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { memo, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import urlJoin from 'url-join';

import Loading from '@/components/Loading/BrandTextLoading';
import NavHeader from '@/features/NavHeader';
import { useAgentStore } from '@/store/agent';
import { serverConfigSelectors, useServerConfigStore } from '@/store/serverConfig';

import { BOT_RUNTIME_STATUSES, type BotRuntimeStatus } from '../../../../types/botRuntimeStatus';
import PlatformDetail from './detail';
import PlatformList from './list';

const styles = createStaticStyles(({ css }) => ({
  container: css`
    overflow: hidden;
    display: flex;
    flex: 1;

    width: 100%;
    height: 100%;
  `,
}));

interface ChannelContentProps {
  aid: string;
}

const ChannelContent = memo<ChannelContentProps>(({ aid }) => {
  const [activeProviderId, setActiveProviderId] = useState<string>('');

  const { data: platforms, isLoading: platformsLoading } = useAgentStore((s) =>
    s.useFetchPlatformDefinitions(),
  );
  const { data: providers, isLoading: providersLoading } = useAgentStore((s) =>
    s.useFetchBotProviders(aid),
  );
  const triggerRefreshAllBotStatuses = useAgentStore((s) => s.triggerRefreshAllBotStatuses);

  // Fire-and-forget a live gateway status refresh on entry. The list renders
  // from cached statuses immediately; SWR revalidates once Redis is updated.
  useEffect(() => {
    if (!aid) return;
    triggerRefreshAllBotStatuses(aid);
  }, [aid, triggerRefreshAllBotStatuses]);

  const isLoading = platformsLoading || providersLoading;

  // Default to first platform once loaded
  const effectiveActiveId = activeProviderId || platforms?.[0]?.id || '';

  const platformRuntimeStatuses = useMemo(
    () =>
      new Map<string, BotRuntimeStatus>(
        (providers ?? [])
          .filter((provider) => provider.enabled)
          .map((provider) => [
            provider.platform,
            ((provider as any).runtimeStatus as BotRuntimeStatus) ??
              BOT_RUNTIME_STATUSES.disconnected,
          ]),
      ),
    [providers],
  );

  const activePlatformDef = useMemo(
    () => platforms?.find((p) => p.id === effectiveActiveId) || platforms?.[0],
    [platforms, effectiveActiveId],
  );

  const currentConfig = useMemo(
    () => providers?.find((p) => p.platform === effectiveActiveId),
    [providers, effectiveActiveId],
  );

  return (
    <Flexbox flex={1} height={'100%'}>
      <NavHeader />
      <Flexbox flex={1} style={{ overflowY: 'auto' }}>
        {isLoading && <Loading debugId="ChannelPage" />}

        {!isLoading && platforms && platforms.length > 0 && activePlatformDef && (
          <div className={styles.container}>
            <PlatformList
              activeId={effectiveActiveId}
              agentId={aid}
              platforms={platforms}
              providers={providers}
              runtimeStatuses={platformRuntimeStatuses}
              onSelect={setActiveProviderId}
            />
            <PlatformDetail
              agentId={aid}
              currentConfig={currentConfig}
              platformDef={activePlatformDef}
              runtimeStatus={platformRuntimeStatuses.get(activePlatformDef.id)}
            />
          </div>
        )}
      </Flexbox>
    </Flexbox>
  );
});

const ChannelPage = memo(() => {
  const { aid } = useParams<{ aid?: string }>();
  const enableMessageChannels = useServerConfigStore(serverConfigSelectors.enableMessageChannels);
  const serverConfigInit = useServerConfigStore((s) => s.serverConfigInit);

  if (!aid) return null;

  if (!serverConfigInit) return <Loading debugId="ChannelPage" />;

  if (!enableMessageChannels) {
    return <Navigate replace to={urlJoin('/agent', aid)} />;
  }

  return <ChannelContent aid={aid} />;
});

export default ChannelPage;
