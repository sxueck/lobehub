'use client';

import { Avatar, Empty, Flexbox, FormGroup } from '@lobehub/ui';
import { Alert, Input } from 'antd';
import type { TableColumnType } from 'antd';
import { createStaticStyles, cssVar } from 'antd-style';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import InlineTable from '@/components/InlineTable';
import { useClientDataSWR } from '@/libs/swr';
import SettingHeader from '@/routes/(main)/settings/features/SettingHeader';
import { userService } from '@/services/user';
import { type AdminUserListItem } from '@/types/user';
import { formatDate } from '@/utils/format';

const styles = createStaticStyles(({ css }) => ({
  adminBadge: css`
    padding: 4px 10px;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: 999px;
    background: ${cssVar.colorFillQuaternary};
    color: ${cssVar.colorTextSecondary};
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  `,
  adminBadgeActive: css`
    border-color: color-mix(in srgb, ${cssVar.colorSuccess} 24%, transparent);
    background: color-mix(in srgb, ${cssVar.colorSuccessBg} 82%, white 18%);
    color: ${cssVar.colorSuccess};
  `,
  dateText: css`
    color: ${cssVar.colorTextSecondary};
    font-size: 12px;
    line-height: 1.6;
    white-space: nowrap;
  `,
  hero: css`
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    padding: 20px;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: 20px;
    background:
      radial-gradient(circle at top left, color-mix(in srgb, ${cssVar.colorPrimaryBg} 88%, white 12%), transparent 52%),
      linear-gradient(180deg, color-mix(in srgb, ${cssVar.colorBgContainer} 92%, white 8%), ${cssVar.colorBgLayout});
  `,
  heroCount: css`
    display: inline-flex;
    gap: 8px;
    align-items: center;
    padding: 6px 12px;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: 999px;
    background: color-mix(in srgb, ${cssVar.colorBgContainer} 85%, white 15%);
    color: ${cssVar.colorTextSecondary};
    font-size: 12px;
    font-weight: 600;
    width: fit-content;
  `,
  heroDescription: css`
    color: ${cssVar.colorTextSecondary};
    font-size: 13px;
    line-height: 1.7;
    max-width: 720px;
  `,
  heroTitle: css`
    color: ${cssVar.colorText};
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
  `,
  idText: css`
    display: inline-block;
    overflow: hidden;
    max-width: 320px;
    padding: 6px 10px;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: 12px;
    background: ${cssVar.colorFillQuaternary};
    color: ${cssVar.colorTextSecondary};
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
      'Courier New', monospace;
    font-size: 12px;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  search: css`
    .ant-input-group-wrapper,
    .ant-input-affix-wrapper,
    .ant-input-search-button,
    .ant-input {
      border-radius: 14px !important;
    }

    .ant-input-group-addon {
      padding-inline-start: 10px;
      background: transparent;
    }

    .ant-input-group-addon .ant-btn {
      min-width: 92px;
      font-weight: 600;
    }

    .ant-input-affix-wrapper,
    .ant-input-group-wrapper {
      background: color-mix(in srgb, ${cssVar.colorBgContainer} 92%, white 8%);
    }
  `,
  tableWrap: css`
    overflow: hidden;
    border: 1px solid ${cssVar.colorBorderSecondary};
    border-radius: 18px;
    background: ${cssVar.colorBgContainer};
    box-shadow: 0 10px 30px -24px rgba(15, 23, 42, 0.35);

    .ant-table {
      background: transparent;
    }

    .ant-table-thead > tr > th {
      color: ${cssVar.colorTextSecondary};
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .ant-table-tbody > tr > td {
      padding-block: 14px !important;
      border-top: 1px solid ${cssVar.colorBorderSecondary} !important;
      transition: background-color 0.2s ease;
      vertical-align: middle;
    }

    .ant-table-tbody > tr:first-child > td {
      border-top: none !important;
    }

    .ant-table-tbody > tr:hover > td {
      background: ${cssVar.colorFillQuaternary} !important;
    }

    .ant-pagination {
      padding: 0 20px 18px;
    }
  `,
  userMeta: css`
    color: ${cssVar.colorTextSecondary};
    font-size: 12px;
    line-height: 1.4;
  `,
  userName: css`
    color: ${cssVar.colorText};
    font-size: 14px;
    font-weight: 600;
    line-height: 1.35;
  `,
}));

const getUserDisplayName = (record: AdminUserListItem) => record.fullName || record.username || '-';

const getUserMeta = (record: AdminUserListItem) =>
  record.username ? `@${record.username}` : record.email || record.id;

const getUserInitial = (record: AdminUserListItem) => {
  const content = record.fullName || record.username || record.email || record.id;

  return content.trim().charAt(0).toUpperCase();
};

const renderFriendlyDate = (value: Date | string) => {
  const datetime = dayjs(value);

  return (
    <span className={styles.dateText} title={formatDate(new Date(value))}>
      {datetime.fromNow()}
    </span>
  );
};

const Page = () => {
  const { t } = useTranslation('setting');
  const [draftKeyword, setDraftKeyword] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, error, isLoading } = useClientDataSWR(
    ['admin-users', keyword, page, pageSize],
    () => userService.queryAdminUsers({ keyword, page, pageSize }),
  );

  const columns: TableColumnType<AdminUserListItem>[] = [
    {
      dataIndex: 'fullName',
      key: 'fullName',
      render: (_, record) => (
        <Flexbox align={'center'} gap={12} horizontal>
          <Avatar avatar={record.avatar || getUserInitial(record)} size={36} />
          <Flexbox gap={2}>
            <span className={styles.userName}>{getUserDisplayName(record)}</span>
            <span className={styles.userMeta}>{getUserMeta(record)}</span>
          </Flexbox>
        </Flexbox>
      ),
      title: t('admin.users.columns.name'),
    },
    {
      dataIndex: 'id',
      key: 'id',
      render: (value) => <span className={styles.idText}>{value}</span>,
      title: t('admin.users.columns.id'),
    },
    {
      dataIndex: 'email',
      key: 'email',
      render: (value) => <span className={styles.userMeta}>{value || '-'}</span>,
      title: t('admin.users.columns.email'),
    },
    {
      dataIndex: 'isAdmin',
      key: 'isAdmin',
      render: (value) => (
        <span className={`${styles.adminBadge} ${value ? styles.adminBadgeActive : ''}`}>
          {value ? t('admin.users.yes') : t('admin.users.no')}
        </span>
      ),
      title: t('admin.users.columns.admin'),
    },
    {
      dataIndex: 'lastActiveAt',
      key: 'lastActiveAt',
      render: (value) => renderFriendlyDate(value),
      title: t('admin.users.columns.lastActiveAt'),
    },
    {
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value) => renderFriendlyDate(value),
      title: t('admin.users.columns.createdAt'),
    },
  ];

  return (
    <>
      <SettingHeader title={t('tab.admin')} />
      <FormGroup collapsible={false} gap={16} variant={'filled'}>
        <div className={styles.hero}>
          <Flexbox gap={8}>
            <span className={styles.heroTitle}>{t('admin.users.title')}</span>
            <span className={styles.heroDescription}>{t('admin.desc')}</span>
            <span className={styles.heroCount}>{data?.total || 0}</span>
          </Flexbox>

          <div className={styles.search}>
            <Input.Search
              allowClear
              enterButton={t('admin.users.searchButton')}
              onChange={(event) => {
                const nextKeyword = event.target.value;

                setDraftKeyword(nextKeyword);

                if (nextKeyword.length === 0) {
                  setKeyword('');
                  setPage(1);
                }
              }}
              onSearch={(value) => {
                setKeyword(value.trim());
                setPage(1);
              }}
              placeholder={t('admin.users.searchPlaceholder')}
              size={'large'}
              value={draftKeyword}
            />
          </div>
        </div>

        {error ? <Alert message={t('admin.users.loadFailed')} showIcon type={'error'} /> : null}

        {!error && !isLoading && !data?.users.length ? (
          <Empty description={t('admin.users.empty')} />
        ) : (
          <div className={styles.tableWrap}>
            <InlineTable
              columns={columns}
              dataSource={data?.users || []}
              loading={isLoading}
              pagination={{
                current: page,
                onChange: (nextPage, nextPageSize) => {
                  setPage(nextPage);
                  setPageSize(nextPageSize);
                },
                pageSize,
                showSizeChanger: true,
                total: data?.total || 0,
              }}
              rowKey={(record) => record.id}
            />
          </div>
        )}
      </FormGroup>
    </>
  );
};

export default Page;
