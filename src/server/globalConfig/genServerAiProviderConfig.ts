import { type ProviderConfig } from '@lobechat/types';
import { type AiFullModelCard } from 'model-bank';
import { ModelProvider } from 'model-bank';
import * as AiModels from 'model-bank';

import { getLLMConfig } from '@/envs/llm';
import { extractEnabledModels, transformToAiModelList } from '@/utils/server/parseModels';

interface ProviderSpecificConfig {
  enabled?: boolean;
  enabledKey?: string;
  envVarPrefix?: string;
  fetchOnClient?: boolean;
  modelListKey?: string;
  withDeploymentName?: boolean;
}

interface GenServerAiProvidersConfigOptions {
  restrictToConfiguredProviders?: boolean;
}

const hasExplicitProviderConfiguration = (
  provider: string,
  providerConfig: ProviderSpecificConfig,
) => {
  const providerUpperCase = provider.toUpperCase();
  const enabledKey = providerConfig.enabledKey || `ENABLED_${providerUpperCase}`;
  const envVarPrefix = providerConfig.envVarPrefix || providerUpperCase;
  const modelListKey = providerConfig.modelListKey ?? `${providerUpperCase}_MODEL_LIST`;

  if (process.env[enabledKey] !== undefined) return true;
  if (process.env[modelListKey] !== undefined) return true;

  return Object.entries(process.env).some(
    ([key, value]) => key.startsWith(`${envVarPrefix}_`) && value !== undefined && value !== '',
  );
};

export const genServerAiProvidersConfig = async (
  specificConfig: Record<any, ProviderSpecificConfig>,
  options: GenServerAiProvidersConfigOptions = {},
) => {
  const llmConfig = getLLMConfig() as Record<string, any>;

  // Process all providers concurrently
  const providerConfigs = await Promise.all(
    Object.values(ModelProvider).map(async (provider) => {
      const providerUpperCase = provider.toUpperCase();
      const aiModels = AiModels[provider] as AiFullModelCard[];

      if (!aiModels)
        throw new Error(
          `Provider [${provider}] not found in aiModels, please make sure you have exported the provider in the \`aiModels/index.ts\``,
        );

      const providerConfig = specificConfig[provider as keyof typeof specificConfig] || {};
      const hasExplicitConfig = hasExplicitProviderConfiguration(provider, providerConfig);
      const modelString =
        process.env[providerConfig.modelListKey ?? `${providerUpperCase}_MODEL_LIST`];
      const resolvedEnabled =
        typeof providerConfig.enabled !== 'undefined'
          ? providerConfig.enabled
          : llmConfig[providerConfig.enabledKey || `ENABLED_${providerUpperCase}`];

      // Process extractEnabledModels and transformToAiModelList concurrently
      const [enabledModels, serverModelLists] = await Promise.all([
        extractEnabledModels(provider, modelString, providerConfig.withDeploymentName || false),
        transformToAiModelList({
          defaultModels: aiModels || [],
          modelString,
          providerId: provider,
          withDeploymentName: providerConfig.withDeploymentName || false,
        }),
      ]);

      return {
        config: {
          enabled:
            options.restrictToConfiguredProviders && !hasExplicitConfig ? false : resolvedEnabled,
          enabledModels,
          ...(options.restrictToConfiguredProviders && { serverManaged: true }),
          serverModelLists,
          ...(providerConfig.fetchOnClient !== undefined && {
            fetchOnClient: providerConfig.fetchOnClient,
          }),
        },
        provider,
      };
    }),
  );

  // Convert the results to an object
  const config = {} as Record<string, ProviderConfig>;
  for (const { provider, config: providerConfig } of providerConfigs) {
    config[provider] = providerConfig;
  }

  return config;
};
