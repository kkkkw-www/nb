import { useTranslation } from '@nocobase/i18n/client';
import { LifecycleDiagram } from '#components/lifecycle-diagram';
import { PageHeader } from '#components/page-header';
import { WorkflowDefinitionDetail } from '#extensions/nocobase-workflow-management/layout';
import { useSettingsData } from '../settings/hooks.js';
import { SettingsError, SettingsLoading } from '../settings/shared.js';
import type { Definition } from './model.js';
export default function DefinitionPage() {
  const { t } = useTranslation();
  const request = useSettingsData<{ data: Definition }>('releaseWorkflows');
  return (
    <>
      <PageHeader title={t('releaseRequests.process')} />
      <SettingsError error={request.error} retry={request.reload} />
      {request.loading ? (
        <SettingsLoading />
      ) : (
        request.data && (
          <WorkflowDefinitionDetail
            diagramTitle={t('releaseRequests.diagram')}
            parametersTitle={t('releaseRequests.parameters')}
            parameters={<p>{t('releaseRequests.noParameters')}</p>}
            diagram={
              <LifecycleDiagram
                description={request.data.data.description}
                ariaLabel={t('releaseRequests.diagram')}
                stateLabel={(state) =>
                  t(`releaseRequests.states.${state.name}`)
                }
                transitionLabel={(transition) =>
                  t(`releaseRequests.transitions.${transition.name}`)
                }
              />
            }
          />
        )
      )}
    </>
  );
}
