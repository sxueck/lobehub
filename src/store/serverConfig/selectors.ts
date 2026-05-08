import { type ServerConfigState } from './store';

export const featureFlagsSelectors = (s: ServerConfigState) => s.featureFlags;

export const serverConfigSelectors = {
  disableEmailPassword: (s: ServerConfigState) => s.serverConfig.disableEmailPassword || false,
  disableEmailPasswordSignUp: (s: ServerConfigState) =>
    s.serverConfig.disableEmailPasswordSignUp || false,
  enableBusinessFeatures: (s: ServerConfigState) => s.serverConfig.enableBusinessFeatures || false,
  enableEmailVerification: (s: ServerConfigState) =>
    s.serverConfig.enableEmailVerification || false,
  enableKlavis: (s: ServerConfigState) => s.serverConfig.enableKlavis || false,
  enableLobehubSkill: (s: ServerConfigState) => s.serverConfig.enableLobehubSkill || false,
  enableMagicLink: (s: ServerConfigState) => s.serverConfig.enableMagicLink || false,
  enableMarketTrustedClient: (s: ServerConfigState) =>
    s.serverConfig.enableMarketTrustedClient || false,
  enableMessageChannels: (s: ServerConfigState) => s.serverConfig.enableMessageChannels ?? true,
  enableUploadFileToServer: (s: ServerConfigState) => s.serverConfig.enableUploadFileToServer,
  enableVisualUnderstanding: (s: ServerConfigState) =>
    s.serverConfig.enableVisualUnderstanding || false,
  enabledTelemetryChat: (s: ServerConfigState) => s.serverConfig.telemetry.langfuse || false,
  isMobile: (s: ServerConfigState) => s.isMobile || false,
  oAuthSSOProviders: (s: ServerConfigState) => s.serverConfig.oAuthSSOProviders,
  visualUnderstanding: (s: ServerConfigState) => s.serverConfig.visualUnderstanding,
};
