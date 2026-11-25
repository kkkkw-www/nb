import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { useTranslation } from '@nocobase/i18n/client';
import { WorkflowManagementLayout } from '#extensions/nocobase-workflow-management/layout';
export default function Workflows() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const section = location.pathname.split('/workflows')[1] ?? '';
  if (!section || section === '/') return <Navigate to='definitions' replace />;
  const tab = section.startsWith('/executions') ? 'executions' : 'definitions';
  return (
    <WorkflowManagementLayout
      title={t('releaseRequests.workflows')}
      labels={{
        definitions: t('releaseRequests.definitions'),
        executions: t('releaseRequests.executions'),
      }}
      tab={tab}
      detail={section.split('/').filter(Boolean).length > 1}
      onTabChange={(next) => void navigate(next)}
    >
      <Outlet />
    </WorkflowManagementLayout>
  );
}
