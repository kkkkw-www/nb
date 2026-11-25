import { Link, Outlet, useLocation } from 'react-router';
import { resolveListState } from '@nocobase/app-client';
import { useTranslation } from '@nocobase/i18n/client';
import { WorkflowDefinitionList } from '#extensions/nocobase-workflow-management/definition-list';
import { useSettingsData } from '../settings/hooks.js';
import type { Definition } from './model.js';
export default function Definitions() {
  const { t } = useTranslation();
  const location = useLocation();
  const detail = location.pathname.endsWith('/release');
  const request = useSettingsData<{ data: Definition }>('releaseWorkflows', {
    active: !detail,
  });
  if (detail) return <Outlet />;
  return (
    <WorkflowDefinitionList
      rows={
        request.data
          ? [
              {
                id: 'release',
                title: <Link to='release'>{t('releaseRequests.process')}</Link>,
                activity: (
                  <Link to='../executions'>
                    {t('releaseRequests.executions')}
                  </Link>
                ),
              },
            ]
          : []
      }
      search={null}
      onRefresh={request.reload}
      loaded={Boolean(request.data)}
      loading={request.loading}
      listState={resolveListState(
        {
          data: request.data,
          error: request.error,
          isPending: request.loading,
        },
        request.data ? 1 : 0,
        false,
      )}
      labels={{
        workflow: t('releaseRequests.process'),
        executionCount: t('releaseRequests.executions'),
        executionActivity: t('releaseRequests.executions'),
      }}
    />
  );
}
