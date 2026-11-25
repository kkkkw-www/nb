import { useParams } from 'react-router';
import { useTranslation } from '@nocobase/i18n/client';
import { LifecycleDiagram } from '#components/lifecycle-diagram';
import { PageHeader } from '#components/page-header';
import {
  WorkflowExecutionDetail,
  type WorkflowExecutionLabels,
} from '#extensions/nocobase-workflow-management/execution-detail';
import { useSettingsData } from '../settings/hooks.js';
import { SettingsError, SettingsLoading } from '../settings/shared.js';
import { RequestFields } from './detail.js';
import type { RequestDetail, Definition } from './model.js';
export default function Execution() {
  const { id } = useParams();
  const { t } = useTranslation();
  const request = useSettingsData<{ data: RequestDetail }>(
    `releaseWorkflows/executions/${id}`,
  );
  const definition = useSettingsData<{ data: Definition }>('releaseWorkflows');
  const detail = request.data?.data;
  const labels = Object.fromEntries(
    [
      'processDiagram',
      'history',
      'historyHint',
      'step',
      'transition',
      'from',
      'to',
      'actor',
      'time',
      'noHistory',
      'effects',
      'effect',
      'state',
      'attempts',
      'error',
      'noEffects',
      'executionParameters',
      'snapshotHint',
    ].map((key) => [key, t(`releaseRequests.workflowLabels.${key}`)]),
  ) as Omit<WorkflowExecutionLabels, 'showStep'>;
  return (
    <>
      <PageHeader
        title={detail?.record.appName ?? t('releaseRequests.detail')}
      />
      <SettingsError error={request.error ?? definition.error} />
      {request.loading || definition.loading ? (
        <SettingsLoading />
      ) : (
        detail &&
        definition.data && (
          <div className='space-y-6'>
            <RequestFields record={detail.record} />
            <WorkflowExecutionDetail
              transitions={detail.history.transitions}
              state={detail.record.status}
              effects={[]}
              labels={{
                ...labels,
                showStep: (step) => t('releaseRequests.showStep', { step }),
              }}
              stateLabel={(state) => t(`releaseRequests.states.${state}`)}
              transitionLabel={(transition) =>
                t(`releaseRequests.transitions.${transition}`)
              }
              dateLabel={(at) => new Date(at).toLocaleString()}
              effectStatusLabel={(status) => status}
              renderDiagram={({ current, history }) => (
                <LifecycleDiagram
                  description={definition.data!.data.description}
                  ariaLabel={t('releaseRequests.diagram')}
                  currentState={current}
                  history={history}
                  stateLabel={(state) =>
                    t(`releaseRequests.states.${state.name}`)
                  }
                  transitionLabel={(transition) =>
                    t(`releaseRequests.transitions.${transition.name}`)
                  }
                />
              )}
            />
          </div>
        )
      )}
    </>
  );
}
