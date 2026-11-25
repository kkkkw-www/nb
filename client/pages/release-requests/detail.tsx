import { useState } from 'react';
import { useApiClient, useSubmission } from '@nocobase/app-client';
import { useAuthentication } from '@nocobase/app-plugin-authentication/client';
import { useCan } from '@nocobase/app-plugin-authorization/client';
import { useTranslation } from '@nocobase/i18n/client';
import {
  useLocation,
  useOutletContext,
  useParams,
  useResolvedPath,
} from 'react-router';
import { FeedbackForm } from '#components/feedback-form';
import { RouteDrawer } from '#components/route-drawer';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import { Label } from '#components/ui/label';
import { Textarea } from '#components/ui/textarea';
import { useSettingsData } from '../settings/hooks.js';
import { SettingsError, SettingsLoading } from '../settings/shared.js';
import type { RequestDetail, ReleaseRequest } from './model.js';

function ActionForm({
  record,
  transition,
  onSaved,
  onCancel,
}: {
  record: ReleaseRequest;
  transition: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const api = useApiClient();
  const { session } = useAuthentication();
  const submission = useSubmission({
    scope: `${session?.user.id}:releaseRequests:${record.id}:${transition}`,
  });
  const [note, setNote] = useState('');
  const [releasedAt, setReleasedAt] = useState('');
  const [error, setError] = useState<unknown>();
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    try {
      const saved = await submission.run(
        {
          transition,
          note,
          version: record.lifecycleVersion,
          ...(transition === 'succeed' && releasedAt
            ? { releasedAt: new Date(releasedAt).toISOString() }
            : {}),
        },
        (key, signal, input) =>
          api.request({
            path: `releaseRequests/${record.id}/fire`,
            method: 'POST',
            json: input,
            signal,
            headers: { 'Idempotency-Key': key },
          }),
      );
      if (saved) onSaved();
    } catch (next) {
      setError(next);
    }
  };
  return (
    <FeedbackForm
      onSubmit={submit}
      submitting={submission.submitting}
      error={error}
      values={() => ({ note, releasedAt })}
      savedValues={{ note: '', releasedAt: '' }}
      className='space-y-3 rounded-lg border p-4'
    >
      <h2 className='font-medium'>
        {t(`releaseRequests.transitions.${transition}`)}
      </h2>
      <Label htmlFor='action-note'>{t('releaseRequests.note')}</Label>
      <Textarea
        id='action-note'
        value={note}
        onChange={(e) => setNote(e.target.value)}
        required={transition === 'reject' || transition === 'fail'}
        maxLength={4000}
      />
      {transition === 'succeed' && (
        <>
          <Label htmlFor='actual-release-time'>
            {t('releaseRequests.releasedAt')}
          </Label>
          <Input
            id='actual-release-time'
            type='datetime-local'
            value={releasedAt}
            onChange={(e) => setReleasedAt(e.target.value)}
          />
          <p className='text-sm text-muted-foreground'>
            {t('releaseRequests.timeHint')}
          </p>
        </>
      )}
      <div className='flex flex-wrap gap-2'>
        <Button type='submit' disabled={submission.submitting}>
          {t(`releaseRequests.transitions.${transition}`)}
        </Button>
        <Button
          type='button'
          variant='outline'
          disabled={submission.submitting}
          onClick={onCancel}
        >
          {t('releaseRequests.cancel')}
        </Button>
      </div>
    </FeedbackForm>
  );
}
export function RequestFields({ record }: { record: ReleaseRequest }) {
  const { t } = useTranslation();
  return (
    <dl className='grid gap-4 sm:grid-cols-2'>
      {(
        [
          'appName',
          'status',
          'applicantName',
          'appliedAt',
          'description',
          'reviewerName',
          'reviewedAt',
          'reviewResult',
          'reviewNote',
          'registrarName',
          'registeredAt',
          'releasedAt',
          'releaseNote',
        ] as const
      ).map((key) => {
        const value = record[key];
        const display =
          key === 'status'
            ? t(`releaseRequests.states.${record.status}`)
            : key === 'reviewResult' && value
              ? t(`releaseRequests.results.${value}`)
              : key.endsWith('At') && value
                ? new Date(value).toLocaleString()
                : value || '—';
        return (
          <div key={key} className='min-w-0 space-y-1'>
            <dt className='text-sm text-muted-foreground'>
              {t(`releaseRequests.fields.${key}`)}
            </dt>
            <dd className='whitespace-pre-wrap break-words'>{display}</dd>
          </div>
        );
      })}
    </dl>
  );
}
export default function RequestDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const location = useLocation();
  const parent = useOutletContext<{ reload: () => void }>();
  const request = useSettingsData<{ data: RequestDetail }>(
    `releaseRequests/${id}`,
  );
  const canReview = useCan({
    resource: { type: 'settings', id: 'release-requests' },
    action: 'review',
  }).can;
  const canRegister = useCan({
    resource: { type: 'settings', id: 'release-requests' },
    action: 'register',
  }).can;
  const [transition, setTransition] = useState<string>();
  const detail = request.data?.data;
  const record = detail?.record;
  const actions =
    record?.status === 'pending' && canReview
      ? ['approve', 'reject']
      : record?.status === 'awaitingRelease' && canRegister
        ? ['succeed', 'fail']
        : [];
  return (
    <RouteDrawer
      title={t('releaseRequests.detail')}
      description={record?.appName}
      closeTo={{
        pathname: useResolvedPath('..').pathname,
        search: location.search,
      }}
    >
      <SettingsError error={request.error} retry={request.reload} />
      {request.loading ? (
        <SettingsLoading />
      ) : record && detail ? (
        <div className='space-y-6'>
          <RequestFields record={record} />
          {transition && actions.includes(transition) ? (
            <ActionForm
              key={transition}
              record={record}
              transition={transition}
              onCancel={() => setTransition(undefined)}
              onSaved={() => {
                setTransition(undefined);
                request.reload();
                parent.reload();
              }}
            />
          ) : (
            <div className='flex flex-wrap gap-2'>
              {actions.map((action) => (
                <Button key={action} onClick={() => setTransition(action)}>
                  {t(`releaseRequests.transitions.${action}`)}
                </Button>
              ))}
            </div>
          )}
          <section className='space-y-3'>
            <h2 className='font-medium'>{t('releaseRequests.history')}</h2>
            <ol className='space-y-3'>
              {detail.history.transitions.map((entry) => (
                <li key={entry.id} className='rounded-lg border p-3 text-sm'>
                  <p>
                    {t(`releaseRequests.transitions.${entry.transition}`)} ·{' '}
                    {t(`releaseRequests.states.${entry.to}`)}
                  </p>
                  <p className='text-muted-foreground'>
                    {entry.actorId} · {new Date(entry.at).toLocaleString()}
                  </p>
                  {typeof entry.input.note === 'string' && (
                    <p className='whitespace-pre-wrap break-words'>
                      {entry.input.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </RouteDrawer>
  );
}
