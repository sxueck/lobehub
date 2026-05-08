import { Flexbox } from '@lobehub/ui';
import { useEffect, useRef } from 'react';

import DragUploadZone, { useUploadFiles } from '@/components/DragUploadZone';
import { type ActionKeys } from '@/features/ChatInput';
import { ChatInputProvider, DesktopChatInput } from '@/features/ChatInput';
import { useAgentStore } from '@/store/agent';
import { agentByIdSelectors } from '@/store/agent/selectors';
import { useChatStore } from '@/store/chat';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useHomeStore } from '@/store/home';
import { serverConfigSelectors, useServerConfigStore } from '@/store/serverConfig';

import SkillInstallBanner, { SKILL_INSTALL_BANNER_ID } from './SkillInstallBanner';
import StarterList from './StarterList';
import { useSend } from './useSend';

const leftActions: ActionKeys[] = ['model', 'search', 'fileUpload', 'tools'];

const InputArea = () => {
  const { agentId, loading, send } = useSend();
  const inputActiveMode = useHomeStore((s) => s.inputActiveMode);
  const isLobehubSkillEnabled = useServerConfigStore(serverConfigSelectors.enableLobehubSkill);
  const isKlavisEnabled = useServerConfigStore(serverConfigSelectors.enableKlavis);
  const isSkillBannerDismissed = useGlobalStore(
    systemStatusSelectors.isBannerDismissed(SKILL_INSTALL_BANNER_ID),
  );
  const showSkillBanner = (isLobehubSkillEnabled || isKlavisEnabled) && !isSkillBannerDismissed;
  const chatInputRef = useRef<HTMLDivElement>(null);

  // Re-focus the editor and scroll it back into view when switching starter modes.
  useEffect(() => {
    if (!inputActiveMode) return;

    requestAnimationFrame(() => {
      chatInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      useChatStore.getState().mainInputEditor?.focus();
    });
  }, [inputActiveMode]);

  // Get agent's model info for vision support check
  const model = useAgentStore((s) => agentByIdSelectors.getAgentModelById(agentId ?? '')(s));
  const provider = useAgentStore((s) =>
    agentByIdSelectors.getAgentModelProviderById(agentId ?? '')(s),
  );
  const { handleUploadFiles } = useUploadFiles({ model, provider });

  // A slot to insert content above the chat input
  // Override some default behavior of the chat input
  const inputContainerProps = {
    minHeight: 88,
    resize: false,
    style: {
      borderRadius: 20,
      boxShadow: '0 12px 32px rgba(0,0,0,.04)',
    },
  };

  const hideStarterList = inputActiveMode && ['agent', 'group', 'write'].includes(inputActiveMode);

  return (
    <Flexbox gap={16}>
      <Flexbox
        ref={chatInputRef}
        style={{ paddingBottom: showSkillBanner ? 32 : 0, position: 'relative' }}
      >
        {showSkillBanner && <SkillInstallBanner />}
        <DragUploadZone
          style={{ position: 'relative', zIndex: 1 }}
          onUploadFiles={handleUploadFiles}
        >
          <ChatInputProvider
            agentId={agentId}
            allowExpand={false}
            leftActions={leftActions}
            slashPlacement="bottom"
            chatInputEditorRef={(instance) => {
              if (!instance) return;
              useChatStore.setState({ mainInputEditor: instance });
            }}
            sendButtonProps={{
              disabled: loading,
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

      {/* Keep StarterList mounted to prevent useInitBuiltinAgent hooks from re-running */}
      <div style={{ display: hideStarterList ? 'none' : undefined }}>
        <StarterList />
      </div>
    </Flexbox>
  );
};

export default InputArea;
