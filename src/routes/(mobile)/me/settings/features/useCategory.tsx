import { SkillsIcon } from '@lobehub/ui/icons';
import {
  Brain,
  BrainCircuit,
  ChartColumnBigIcon,
  Database,
  EllipsisIcon,
  Info,
  KeyIcon,
  KeyRound,
  PaletteIcon,
  ShieldUser,
  Sparkles,
  UserCircle,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type CellProps } from '@/components/Cell';
import { SettingsTabs } from '@/store/global/initialState';
import {
  featureFlagsSelectors,
  serverConfigSelectors,
  useServerConfigStore,
} from '@/store/serverConfig';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/slices/auth/selectors';
import { userGeneralSettingsSelectors } from '@/store/user/slices/settings/selectors';

export enum SettingsGroupKey {
  Agent = 'agent',
  General = 'general',
  System = 'system',
}

export interface CategoryItem extends Omit<CellProps, 'type'> {
  key: SettingsTabs;
}

export interface CategoryGroup {
  items: CategoryItem[];
  key: SettingsGroupKey;
  title: string;
}

export const useCategory = (): CategoryGroup[] => {
  const navigate = useNavigate();
  const { t } = useTranslation('setting');
  const { t: tAuth } = useTranslation('auth');
  const { hideDocs, showApiKeyManage, showProvider } = useServerConfigStore(featureFlagsSelectors);
  const enableBusinessFeatures = useServerConfigStore(serverConfigSelectors.enableBusinessFeatures);
  const isAdmin = useUserStore(userProfileSelectors.isAdmin);
  const isDevMode = useUserStore((s) => userGeneralSettingsSelectors.config(s).isDevMode);

  return useMemo(() => {
    const navigateTo = (key: SettingsTabs) =>
      navigate(key === SettingsTabs.Provider ? '/settings/provider/all' : `/settings/${key}`);

    const makeItem = (item: Omit<CategoryItem, 'onClick'>): CategoryItem => ({
      ...item,
      onClick: () => navigateTo(item.key),
    });

    const general: CategoryItem[] = [
      makeItem({ icon: UserCircle, key: SettingsTabs.Profile, label: tAuth('tab.profile') }),
      makeItem({ icon: ChartColumnBigIcon, key: SettingsTabs.Stats, label: tAuth('tab.stats') }),
      makeItem({ icon: PaletteIcon, key: SettingsTabs.Appearance, label: t('tab.appearance') }),
    ];

    const agent: CategoryItem[] = [
      showProvider && (!enableBusinessFeatures || isDevMode)
        ? makeItem({ icon: Brain, key: SettingsTabs.Provider, label: t('tab.provider') })
        : null,
      makeItem({ icon: Sparkles, key: SettingsTabs.ServiceModel, label: t('tab.serviceModel') }),
      makeItem({ icon: SkillsIcon, key: SettingsTabs.Skill, label: t('tab.skill') }),
      makeItem({ icon: BrainCircuit, key: SettingsTabs.Memory, label: t('tab.memory') }),
      makeItem({ icon: KeyRound, key: SettingsTabs.Creds, label: t('tab.creds') }),
      showApiKeyManage
        ? makeItem({ icon: KeyIcon, key: SettingsTabs.APIKey, label: tAuth('tab.apikey') })
        : null,
    ].filter((item): item is CategoryItem => Boolean(item));

    const system: CategoryItem[] = [
      isAdmin
        ? makeItem({ icon: ShieldUser, key: SettingsTabs.Admin, label: t('tab.admin') })
        : null,
      makeItem({ icon: Database, key: SettingsTabs.Storage, label: t('tab.storage') }),
      isDevMode
        ? makeItem({ icon: KeyIcon, key: SettingsTabs.APIKey, label: tAuth('tab.apikey') })
        : null,
      makeItem({ icon: EllipsisIcon, key: SettingsTabs.Advanced, label: t('tab.advanced') }),
      !hideDocs ? makeItem({ icon: Info, key: SettingsTabs.About, label: t('tab.about') }) : null,
    ].filter((item): item is CategoryItem => Boolean(item));

    return [
      { items: general, key: SettingsGroupKey.General, title: t('group.common') },
      { items: agent, key: SettingsGroupKey.Agent, title: t('group.aiConfig') },
      { items: system, key: SettingsGroupKey.System, title: t('group.system') },
    ].filter((group) => group.items.length > 0);
  }, [
    t,
    tAuth,
    enableBusinessFeatures,
    hideDocs,
    isAdmin,
    isDevMode,
    navigate,
    showApiKeyManage,
    showProvider,
  ]);
};
