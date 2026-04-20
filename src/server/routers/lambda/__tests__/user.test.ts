// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageModel } from '@/database/models/message';
import { SessionModel } from '@/database/models/session';
import { UserModel } from '@/database/models/user';
import { serverDB } from '@/database/server';
import { isAuthAdminUser } from '@/envs/auth';
import { KeyVaultsGateKeeper } from '@/server/modules/KeyVaultsEncrypt';

import { userRouter } from '../user';

const ilikeMock = vi.hoisted(() => vi.fn((column, pattern) => ({ column, pattern })));
const orMock = vi.hoisted(() => vi.fn((...conditions) => conditions));

// Mock modules
vi.mock('@/database/server', () => ({
  serverDB: {},
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();

  return {
    ...actual,
    ilike: ilikeMock,
    or: orMock,
  };
});

vi.mock('@/database/models/message');
vi.mock('@/database/models/session');
vi.mock('@/database/models/user');
vi.mock('@/envs/auth', () => ({
  isAuthAdminUser: vi.fn(),
}));
vi.mock('@/server/modules/KeyVaultsEncrypt');
vi.mock('@/server/modules/S3');
vi.mock('@/server/services/user');

describe('userRouter', () => {
  const mockUserId = 'test-user-id';
  const mockCtx = {
    userId: mockUserId,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAuthAdminUser).mockImplementation((userId) => userId === mockUserId);
  });

  describe('getUserRegistrationDuration', () => {
    it('should return registration duration', async () => {
      const mockDuration = { duration: 100, createdAt: '2023-01-01', updatedAt: '2023-01-02' };
      vi.mocked(UserModel).mockImplementation(
        () =>
          ({
            getUserRegistrationDuration: vi.fn().mockResolvedValue(mockDuration),
          }) as any,
      );

      const result = await userRouter.createCaller({ ...mockCtx }).getUserRegistrationDuration();

      expect(result).toEqual(mockDuration);
      expect(UserModel).toHaveBeenCalledWith(serverDB, mockUserId);
    });
  });

  describe('getUserSSOProviders', () => {
    it('should return SSO providers', async () => {
      const mockProviders = [
        {
          provider: 'google',
          providerAccountId: '123',
          userId: 'user-1',
          type: 'oauth',
        },
      ];
      vi.mocked(UserModel).mockImplementation(
        () =>
          ({
            getUserSSOProviders: vi.fn().mockResolvedValue(mockProviders),
          }) as any,
      );

      const result = await userRouter.createCaller({ ...mockCtx }).getUserSSOProviders();

      expect(result).toEqual(mockProviders);
      expect(UserModel).toHaveBeenCalledWith(serverDB, mockUserId);
    });
  });

  describe('getUserState', () => {
    it('should return user state', async () => {
      const mockState = {
        isOnboarded: true,
        preference: { telemetry: true },
        settings: {},
        userId: mockUserId,
      };

      vi.mocked(UserModel).mockImplementation(
        () =>
          ({
            getUserState: vi.fn().mockResolvedValue(mockState),
            updateUser: vi.fn().mockResolvedValue({ rowCount: 1 }),
          }) as any,
      );

      vi.mocked(MessageModel).mockImplementation(
        () =>
          ({
            countUpTo: vi.fn().mockResolvedValue(5),
          }) as any,
      );

      vi.mocked(SessionModel).mockImplementation(
        () =>
          ({
            hasMoreThanN: vi.fn().mockResolvedValue(true),
          }) as any,
      );

      const result = await userRouter.createCaller({ ...mockCtx }).getUserState();

      expect(result).toMatchObject({
        isAdmin: true,
        isOnboard: true,
        preference: { telemetry: true },
        settings: {},
        hasConversation: true,
        canEnablePWAGuide: true,
        canEnableTrace: true,
        userId: mockUserId,
      });
    });
  });

  describe('queryAdminUsers', () => {
    it('should return paginated users for admin', async () => {
      const mockUsers = [
        {
          avatar: null,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          email: 'alice@example.com',
          fullName: 'Alice',
          id: 'user-2',
          lastActiveAt: new Date('2024-01-03T00:00:00.000Z'),
          username: 'alice',
        },
      ];

      Object.assign(serverDB as any, {
        query: {
          users: {
            findMany: vi.fn().mockResolvedValue(mockUsers),
          },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        }),
      });

      const result = await userRouter.createCaller({ ...mockCtx }).queryAdminUsers({
        keyword: 'alice',
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({
        total: 1,
        users: [
          {
            avatar: null,
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
            email: 'alice@example.com',
            fullName: 'Alice',
            id: 'user-2',
            isAdmin: false,
            lastActiveAt: new Date('2024-01-03T00:00:00.000Z'),
            username: 'alice',
          },
        ],
      });

      expect(ilikeMock).toHaveBeenNthCalledWith(1, expect.anything(), '%alice%');
      expect(ilikeMock).toHaveBeenNthCalledWith(2, expect.anything(), '%alice%');
      expect(ilikeMock).toHaveBeenNthCalledWith(3, expect.anything(), '%alice%');
      expect(ilikeMock).toHaveBeenNthCalledWith(4, expect.anything(), '%alice%');
    });

    it('should escape wildcard characters in keyword search', async () => {
      Object.assign(serverDB as any, {
        query: {
          users: {
            findMany: vi.fn().mockResolvedValue([]),
          },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      });

      await userRouter.createCaller({ ...mockCtx }).queryAdminUsers({
        keyword: 'user_100%',
        page: 1,
        pageSize: 20,
      });

      expect(ilikeMock).toHaveBeenNthCalledWith(1, expect.anything(), '%user\\_100\\%%');
      expect(ilikeMock).toHaveBeenNthCalledWith(2, expect.anything(), '%user\\_100\\%%');
      expect(ilikeMock).toHaveBeenNthCalledWith(3, expect.anything(), '%user\\_100\\%%');
      expect(ilikeMock).toHaveBeenNthCalledWith(4, expect.anything(), '%user\\_100\\%%');
    });

    it('should reject non-admin callers', async () => {
      vi.mocked(isAuthAdminUser).mockReturnValue(false);

      await expect(
        userRouter.createCaller({ ...mockCtx }).queryAdminUsers({ page: 1, pageSize: 20 }),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'ADMIN_ONLY',
      });
    });
  });

  describe('makeUserOnboarded', () => {
    it('should update user onboarded status', async () => {
      vi.mocked(UserModel).mockImplementation(
        () =>
          ({
            updateUser: vi.fn().mockResolvedValue({ rowCount: 1 }),
          }) as any,
      );

      await userRouter.createCaller({ ...mockCtx }).makeUserOnboarded();

      expect(UserModel).toHaveBeenCalledWith(serverDB, mockUserId);
    });
  });

  describe('updateSettings', () => {
    it('should update settings with encrypted key vaults', async () => {
      const mockSettings = {
        keyVaults: { openai: { key: 'test-key' } },
        general: { language: 'en-US' },
      };

      const mockEncryptedVaults = 'encrypted-data';
      const mockGateKeeper = {
        encrypt: vi.fn().mockResolvedValue(mockEncryptedVaults),
      };

      vi.mocked(KeyVaultsGateKeeper.initWithEnvKey).mockResolvedValue(mockGateKeeper as any);
      vi.mocked(UserModel).mockImplementation(
        () =>
          ({
            updateSetting: vi.fn().mockResolvedValue({ rowCount: 1 }),
          }) as any,
      );

      await userRouter.createCaller({ ...mockCtx }).updateSettings(mockSettings);

      expect(mockGateKeeper.encrypt).toHaveBeenCalledWith(JSON.stringify(mockSettings.keyVaults));
    });

    it('should update settings without key vaults', async () => {
      const mockSettings = {
        general: { language: 'en-US' },
      };

      vi.mocked(UserModel).mockImplementation(
        () =>
          ({
            updateSetting: vi.fn().mockResolvedValue({ rowCount: 1 }),
          }) as any,
      );

      await userRouter.createCaller({ ...mockCtx }).updateSettings(mockSettings);

      expect(UserModel).toHaveBeenCalledWith(serverDB, mockUserId);
    });
  });
});
