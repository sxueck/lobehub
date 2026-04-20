'use client';

import { Empty, FormGroup } from '@lobehub/ui';
import { Alert, Input } from 'antd';
import type { TableColumnType } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import InlineTable from '@/components/InlineTable';
import { useClientDataSWR } from '@/libs/swr';
import SettingHeader from '@/routes/(main)/settings/features/SettingHeader';
import { userService } from '@/services/user';
import { type AdminUserListItem } from '@/types/user';
import { formatDate } from '@/utils/format';

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
      render: (_, record) => record.fullName || record.username || '-',
      title: t('admin.users.columns.name'),
    },
    {
      dataIndex: 'id',
      key: 'id',
      title: t('admin.users.columns.id'),
    },
    {
      dataIndex: 'email',
      key: 'email',
      render: (value) => value || '-',
      title: t('admin.users.columns.email'),
    },
    {
      dataIndex: 'isAdmin',
      key: 'isAdmin',
      render: (value) => (value ? t('admin.users.yes') : t('admin.users.no')),
      title: t('admin.users.columns.admin'),
    },
    {
      dataIndex: 'lastActiveAt',
      key: 'lastActiveAt',
      render: (value) => formatDate(new Date(value)),
      title: t('admin.users.columns.lastActiveAt'),
    },
    {
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value) => formatDate(new Date(value)),
      title: t('admin.users.columns.createdAt'),
    },
  ];

  return (
    <>
      <SettingHeader title={t('tab.admin')} />
      <FormGroup collapsible={false} gap={16} title={t('admin.users.title')} variant={'filled'}>
        <Alert message={t('admin.desc')} showIcon type={'info'} />
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
          value={draftKeyword}
        />

        {error ? <Alert message={t('admin.users.loadFailed')} showIcon type={'error'} /> : null}

        {!error && !isLoading && !data?.users.length ? (
          <Empty description={t('admin.users.empty')} />
        ) : (
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
        )}
      </FormGroup>
    </>
  );
};

export default Page;
