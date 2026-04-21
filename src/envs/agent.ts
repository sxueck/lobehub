import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const getAgentConfig = () => {
  return createEnv({
    runtimeEnv: {
      ENABLE_MESSAGE_CHANNELS: process.env.ENABLE_MESSAGE_CHANNELS !== '0',
    },
    server: {
      ENABLE_MESSAGE_CHANNELS: z.boolean().optional().default(true),
    },
  });
};

export const agentEnv = getAgentConfig();
