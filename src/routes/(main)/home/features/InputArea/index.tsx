import { Flexbox } from '@lobehub/ui';
import { useEffect, useMemo, useRef, useState } from 'react';

import DragUploadZone, { useUploadFiles } from '@/components/DragUploadZone';
import { type ActionKeys } from '@/features/ChatInput';
import { ChatInputProvider, DesktopChatInput } from '@/features/ChatInput';
import { useInitAgentConfig } from '@/hooks/useInitAgentConfig';
import { useAgentStore } from '@/store/agent';
import { agentByIdSelectors } from '@/store/agent/selectors';
import { builtinAgentSelectors } from '@/store/agent/selectors/builtinAgentSelectors';
import { useChatStore } from '@/store/chat';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { serverConfigSelectors, useServerConfigStore } from '@/store/serverConfig';

import BotIntegrationBanner, { BOT_INTEGRATION_BANNER_ID } from './BotIntegrationBanner';
import MessengerBanner, { MESSENGER_BANNER_ID } from './MessengerBanner';
import SkillInstallBanner, { SKILL_INSTALL_BANNER_ID } from './SkillInstallBanner';
import StarterList from './StarterList';
import { useSend } from './useSend';

const leftActions: ActionKeys[] = ['agentMode', 'plus'];
const rightActions: ActionKeys[] = ['modelLabel'];

type BannerKind = 'skill' | 'botIntegration' | 'messenger';

const InputArea = () => {
  const { loading, send, agentId } = useSend();
  useInitAgentConfig(agentId);
  const isAgentConfigLoading = useAgentStore((s) =>
    agentByIdSelectors.isAgentConfigLoadingById(agentId ?? '')(s),
  );
  const inboxAgentId = useAgentStore(builtinAgentSelectors.inboxAgentId);
  const isLobehubSkillEnabled = useServerConfigStore(serverConfigSelectors.enableLobehubSkill);
  const isKlavisEnabled = useServerConfigStore(serverConfigSelectors.enableKlavis);
  const serverConfigInit = useServerConfigStore((s) => s.serverConfigInit);
  const isSkillBannerDismissed = useGlobalStore(
    systemStatusSelectors.isBannerDismissed(SKILL_INSTALL_BANNER_ID),
  );
  const isBotIntegrationBannerDismissed = useGlobalStore(
    systemStatusSelectors.isBannerDismissed(BOT_INTEGRATION_BANNER_ID),
  );
  const isMessengerBannerDismissed = useGlobalStore(
    systemStatusSelectors.isBannerDismissed(MESSENGER_BANNER_ID),
  );
  const chatInputRef = useRef<HTMLDivElement>(null);

  const [activeBanner, setActiveBanner] = useState<BannerKind | null>(null);
  const hasPickedRef = useRef(false);

  useEffect(() => {
    if (hasPickedRef.current) return;
    if (!serverConfigInit || !inboxAgentId) return;

    const candidates: BannerKind[] = [];
    if ((isLobehubSkillEnabled || isKlavisEnabled) && !isSkillBannerDismissed) {
      candidates.push('skill');
    }
    if (!isBotIntegrationBannerDismissed) candidates.push('botIntegration');
    if (!isMessengerBannerDismissed) candidates.push('messenger');
    if (candidates.length === 0) return;

    hasPickedRef.current = true;
    setActiveBanner(candidates[Math.floor(Math.random() * candidates.length)]);
  }, [
    inboxAgentId,
    isBotIntegrationBannerDismissed,
    isKlavisEnabled,
    isLobehubSkillEnabled,
    isMessengerBannerDismissed,
    isSkillBannerDismissed,
    serverConfigInit,
  ]);

  const isActiveBannerDismissed =
    (activeBanner === 'skill' && isSkillBannerDismissed) ||
    (activeBanner === 'botIntegration' && isBotIntegrationBannerDismissed) ||
    (activeBanner === 'messenger' && isMessengerBannerDismissed);
  const visibleBanner = isActiveBannerDismissed ? null : activeBanner;

  const resolvedAgentId = agentId ?? '';
  const model = useAgentStore((s) => agentByIdSelectors.getAgentModelById(resolvedAgentId)(s));
  const provider = useAgentStore((s) =>
    agentByIdSelectors.getAgentModelProviderById(resolvedAgentId)(s),
  );
  const { handleUploadFiles } = useUploadFiles({ model, provider });

  const inputContainerProps = useMemo(
    () => ({
      minHeight: 88,
      resize: false,
      style: {
        borderRadius: 20,
        boxShadow: '0 12px 32px rgba(0,0,0,.04)',
      },
    }),
    [],
  );

  return (
    <Flexbox gap={16}>
      <Flexbox
        ref={chatInputRef}
        style={{ paddingBottom: visibleBanner ? 32 : 0, position: 'relative' }}
      >
        {visibleBanner === 'skill' && <SkillInstallBanner />}
        {visibleBanner === 'botIntegration' && <BotIntegrationBanner />}
        {visibleBanner === 'messenger' && <MessengerBanner />}
        <DragUploadZone
          style={{ position: 'relative', zIndex: 1 }}
          onUploadFiles={handleUploadFiles}
        >
          <ChatInputProvider
            agentId={agentId}
            allowExpand={false}
            leftActions={leftActions}
            rightActions={rightActions}
            slashPlacement="bottom"
            chatInputEditorRef={(instance) => {
              if (!instance) return;
              useChatStore.setState({ mainInputEditor: instance });
            }}
            sendButtonProps={{
              disabled: loading || isAgentConfigLoading,
              generating: loading,
              onStop: () => {},
              shape: 'round',
            }}
            onSend={send}
            onMarkdownContentChange={(content) => {
              useChatStore.setState({ inputMessage: content });
            }}
          >
            <DesktopChatInput
              dropdownPlacement="bottomLeft"
              inputContainerProps={inputContainerProps}
              showRuntimeConfig={false}
            />
          </ChatInputProvider>
        </DragUploadZone>
      </Flexbox>

      <StarterList />
    </Flexbox>
  );
};

export default InputArea;
