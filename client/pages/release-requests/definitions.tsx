import { Link, Outlet, useLocation } from 'react-router';
import { useTranslation } from '@nocobase/i18n/client';
import { WorkflowDefinitionList } from '#extensions/nocobase-workflow-management/definition-list';
export default function Definitions() {
  const { t } = useTranslation();
  const location = useLocation();
  if (location.pathname.endsWith('/release')) return <Outlet />;
  return (
    <WorkflowDefinitionList
      rows={[
        {
          id: 'release',
          title: <Link to='release'>{t('releaseRequests.process')}</Link>,
          activity: (
            <Link to='../executions'>{t('releaseRequests.executions')}</Link>
          ),
        },
      ]}
      search={null}
      onRefresh={() => undefined}
      loaded
      loading={false}
      labels={{
        workflow: t('releaseRequests.process'),
        executionCount: t('releaseRequests.executions'),
        executionActivity: t('releaseRequests.executions'),
      }}
    />
  );
}
