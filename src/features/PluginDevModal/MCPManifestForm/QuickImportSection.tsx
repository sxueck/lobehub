import { Alert, Button, Flexbox, TextArea } from '@lobehub/ui';
import { type FormInstance } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isDesktop } from '@/const/version';
import { useToolStore } from '@/store/tool';
import { pluginSelectors } from '@/store/tool/selectors';
import { electronStylish } from '@/styles/electron';

import { parseMcpInput } from './utils';

interface QuickImportSectionProps {
  form: FormInstance;
  isEditMode?: boolean;
  onClearConnectionError?: () => void;
}

const QuickImportSection = ({
  form,
  isEditMode,
  onClearConnectionError,
}: QuickImportSectionProps) => {
  const { t } = useTranslation(['plugin', 'common']);
  const pluginIds = useToolStore(pluginSelectors.storeAndInstallPluginsIdList);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportConfirm = () => {
    setImportError(null);
    onClearConnectionError?.();

    const value = jsonInput.trim();
    if (!value) {
      setImportError(t('dev.mcp.quickImportError.empty'));
      return;
    }

    const parseResult = parseMcpInput(value);

    if (parseResult.status === 'error') {
      setImportError(parseResult.errorCode);
      return;
    }

    if (parseResult.status === 'noop') {
      setImportError(t('dev.mcp.quickImportError.invalidJson'));
      return;
    }

    const { identifier, mcpConfig } = parseResult;

    if (!isDesktop && mcpConfig.type === 'stdio') {
      setImportError(t('dev.mcp.stdioNotSupported'));
      return;
    }

    if (!isEditMode && pluginIds.includes(identifier)) {
      form.setFieldsValue({
        customParams: { mcp: mcpConfig },
        identifier,
      });
      form.validateFields(['identifier']);
      setIsImportModalVisible(false);
      setJsonInput('');
      return;
    }

    form.setFieldsValue({
      customParams: { mcp: mcpConfig },
      identifier,
    });

    form.setFields([{ errors: [], name: 'identifier' }]);

    setIsImportModalVisible(false);
    setImportError(null);
  };

  if (!isImportModalVisible) {
    return (
      <div>
        <Button
          block // Make button full width
          style={{ marginBottom: 16 }} // Add some spacing
          type="dashed"
          onClick={() => {
            setImportError(null);
            setIsImportModalVisible(true);
          }}
        >
          {t('dev.mcp.quickImport')}
        </Button>
      </div>
    );
  }

  return (
    <Flexbox gap={8}>
      {importError && (
        <Alert showIcon style={{ marginBottom: 8 }} title={importError} type="error" />
      )}
      <TextArea
        autoSize={{ maxRows: 15, minRows: 10 }}
        value={jsonInput}
        placeholder={`{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-api-key>"
      }
    }
  }
}`}
        onChange={(e) => {
          setJsonInput(e.target.value);
          if (importError) setImportError(null);
        }}
      />
      <Flexbox horizontal justify={'space-between'}>
        <Button
          className={electronStylish.nodrag}
          size={'small'}
          onClick={() => {
            setIsImportModalVisible(false);
          }}
        >
          {t('common:cancel')}
        </Button>
        <Button size={'small'} type={'primary'} onClick={handleImportConfirm}>
          {t('common:import')}
        </Button>
      </Flexbox>
    </Flexbox>
  );
};

export default QuickImportSection;
