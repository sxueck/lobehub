'use client';

import { type KlavisServerType, type LobehubSkillProviderType } from '@lobechat/const';
import { KLAVIS_SERVER_TYPES, LOBEHUB_SKILL_PROVIDERS } from '@lobechat/const';
import { Avatar, Icon, Tag } from '@lobehub/ui';
import { createStaticStyles, cssVar } from 'antd-style';
import isEqual from 'fast-deep-equal';
import { AlertCircle, Loader2, X } from 'lucide-react';
import React, { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import PluginAvatar from '@/components/Plugins/PluginAvatar';
import { useIsDark } from '@/hooks/useIsDark';
import { useDiscoverStore } from '@/store/discover';
import { serverConfigSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useToolStore } from '@/store/tool';
import {
  builtinToolSelectors,
  klavisStoreSelectors,
  lobehubSkillStoreSelectors,
  pluginSelectors,
} from '@/store/tool/selectors';
import { type LobeToolMetaWithAvailability } from '@/store/tool/slices/builtin/selectors';

/**
 * Klavis server icon component
 */
const KlavisIcon = memo<Pick<KlavisServerType, 'icon' | 'label'>>(({ icon, label }) => {
  if (typeof icon === 'string') {
    return <img alt={label} height={16} src={icon} style={{ flexShrink: 0 }} width={16} />;
  }

  return <Icon fill={cssVar.colorText} icon={icon} size={16} />;
});

/**
 * LobeHub Skill Provider icon component
 */
const LobehubSkillIcon = memo<Pick<LobehubSkillProviderType, 'icon' | 'label'>>(
  ({ icon, label }) => {
    if (typeof icon === 'string') {
      return <img alt={label} height={16} src={icon} style={{ flexShrink: 0 }} width={16} />;
    }

    return <Icon fill={cssVar.colorText} icon={icon} size={16} />;
  },
);

const styles = createStaticStyles(({ css, cssVar }) => ({
  loadingIcon: css`
    flex-shrink: 0;
    color: ${cssVar.colorTextSecondary};
    animation: spin 1s linear infinite;

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }
  `,
  notInstalledTag: css`
    border-color: ${cssVar.colorWarningBorder};
    background: ${cssVar.colorWarningBg};
  `,
  tag: css`
    height: 28px !important;
    border-radius: ${cssVar.borderRadiusSM} !important;
  `,
  warningIcon: css`
    flex-shrink: 0;
    color: ${cssVar.colorWarning};
  `,
}));

export interface PluginTagProps {
  onRemove: (e: React.MouseEvent) => void;
  pluginId: string | { enabled: boolean; identifier: string; settings: Record<string, any> };
  /**
   * Whether to show "Desktop Only" label for tools not available in web
   * @default false
   */
  showDesktopOnlyLabel?: boolean;
  /**
   * Whether to use allMetaList (includes hidden tools) or metaList
   * @default false
   */
  useAllMetaList?: boolean;
}

const PluginTag = memo<PluginTagProps>(
  ({ pluginId, onRemove, showDesktopOnlyLabel = false, useAllMetaList = false }) => {
    const isDarkMode = useIsDark();
    const { t } = useTranslation('setting');

    const identifier = typeof pluginId === 'string' ? pluginId : pluginId?.identifier;

    const builtinList = useToolStore(
      useAllMetaList ? builtinToolSelectors.allMetaList : builtinToolSelectors.metaList,
      isEqual,
    );
    const installedPluginList = useToolStore(pluginSelectors.installedPluginMetaList, isEqual);

    const allKlavisServers = useToolStore(klavisStoreSelectors.getServers, isEqual);
    const isKlavisEnabledInEnv = useServerConfigStore(serverConfigSelectors.enableKlavis);

    const allLobehubSkillServers = useToolStore(lobehubSkillStoreSelectors.getServers, isEqual);
    const isLobehubSkillEnabled = useServerConfigStore(serverConfigSelectors.enableLobehubSkill);

    const isInstalled = useToolStore(pluginSelectors.isPluginInstalled(identifier));

    const localMeta = useMemo(() => {
      if (isKlavisEnabledInEnv) {
        const klavisType = KLAVIS_SERVER_TYPES.find((type) => type.identifier === identifier);
        if (klavisType) {
          const connectedServer = allKlavisServers.find((s) => s.identifier === identifier);
          return {
            availableInWeb: true,
            icon: klavisType.icon,
            isInstalled: !!connectedServer,
            label: klavisType.label,
            title: klavisType.label,
            type: 'klavis' as const,
          };
        }
      }

      if (isLobehubSkillEnabled) {
        const lobehubSkillProvider = LOBEHUB_SKILL_PROVIDERS.find((p) => p.id === identifier);
        if (lobehubSkillProvider) {
          const connectedServer = allLobehubSkillServers.find((s) => s.identifier === identifier);
          return {
            availableInWeb: true,
            icon: lobehubSkillProvider.icon,
            isInstalled: !!connectedServer,
            label: lobehubSkillProvider.label,
            title: lobehubSkillProvider.label,
            type: 'lobehub-skill' as const,
          };
        }
      }

      const builtinMeta = builtinList.find((p) => p.identifier === identifier);
      if (builtinMeta) {
        // availableInWeb is only present when using allMetaList
        const availableInWeb =
          useAllMetaList && 'availableInWeb' in builtinMeta
            ? (builtinMeta as LobeToolMetaWithAvailability).availableInWeb
            : true;
        return {
          availableInWeb,
          avatar: builtinMeta.meta.avatar,
          isInstalled: true,
          title: builtinMeta.meta.title,
          type: 'builtin' as const,
        };
      }

      const installedMeta = installedPluginList.find((p) => p.identifier === identifier);
      if (installedMeta) {
        return {
          availableInWeb: true,
          avatar: installedMeta.avatar,
          isInstalled: true,
          title: installedMeta.title,
          type: 'plugin' as const,
        };
      }

      return null;
    }, [
      identifier,
      builtinList,
      installedPluginList,
      isKlavisEnabledInEnv,
      allKlavisServers,
      isLobehubSkillEnabled,
      allLobehubSkillServers,
    ]);

    // Fetch from remote if not found locally
    const usePluginDetail = useDiscoverStore((s) => s.usePluginDetail);
    const { data: remoteData, isLoading } = usePluginDetail({
      identifier: !localMeta && !isInstalled ? identifier : undefined,
      withManifest: false,
    });

    const meta = localMeta || {
      availableInWeb: true,
      avatar: remoteData?.avatar,
      isInstalled: false,
      title: remoteData?.title || identifier,
      type: 'plugin' as const,
    };

    const displayTitle = meta.title;
    const isDesktopOnly = showDesktopOnlyLabel && !meta.availableInWeb;

    const renderIcon = () => {
      if (isLoading) {
        return <Loader2 className={styles.loadingIcon} size={14} />;
      }

      if (!meta.isInstalled) {
        return <AlertCircle className={styles.warningIcon} size={14} />;
      }

      if (meta.type === 'klavis' && 'icon' in meta && 'label' in meta) {
        return <KlavisIcon icon={meta.icon} label={meta.label} />;
      }

      if (meta.type === 'lobehub-skill' && 'icon' in meta && 'label' in meta) {
        return <LobehubSkillIcon icon={meta.icon} label={meta.label} />;
      }

      if (meta.type === 'builtin' && 'avatar' in meta && meta.avatar) {
        return <Avatar avatar={meta.avatar} shape={'square'} size={16} style={{ flexShrink: 0 }} />;
      }

      if ('avatar' in meta) {
        return <PluginAvatar avatar={meta.avatar} size={16} />;
      }

      return null;
    };

    const getDisplayText = () => {
      let text = displayTitle;
      if (isDesktopOnly) {
        text += ` (${t('tools.desktopOnly', { defaultValue: 'Desktop Only' })})`;
      }
      if (!meta.isInstalled && !isLoading) {
        text += ` (${t('tools.notInstalled', { defaultValue: 'Not Installed' })})`;
      }
      return text;
    };

    const showErrorState = !meta.isInstalled && !isLoading;

    return (
      <Tag
        closable
        className={styles.tag}
        closeIcon={<X size={12} />}
        color={showErrorState ? 'error' : undefined}
        icon={renderIcon()}
        variant={isDarkMode ? 'filled' : 'outlined'}
        title={
          showErrorState
            ? t('tools.notInstalledWarning', { defaultValue: 'This tool is not installed' })
            : undefined
        }
        onClose={onRemove}
      >
        {getDisplayText()}
      </Tag>
    );
  },
);

PluginTag.displayName = 'PluginTag';

export default PluginTag;
