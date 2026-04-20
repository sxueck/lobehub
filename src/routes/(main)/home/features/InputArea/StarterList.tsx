import { type ButtonProps } from '@lobehub/ui';
import { Center, Tag } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const styles = createStaticStyles(({ css, cssVar }) => ({
  newTag: css`
    padding-inline: 10px !important;
    border-radius: 999px !important;
  `,
}));

interface StarterItem {
  disabled?: boolean;
  icon?: ButtonProps['icon'];
  key: string;
  titleKey: string;
}

const StarterList = memo(() => {
  const { t } = useTranslation('home');

  const items: StarterItem[] = [];

  return (
    <Center horizontal gap={8}>
      <Tag className={styles.newTag} size={'small'}>
        {t('starter.newLabel')}
      </Tag>
    </Center>
  );
});

export default StarterList;
