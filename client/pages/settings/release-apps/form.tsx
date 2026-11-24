import {
  ApiClientError,
  useApiClient,
  useSubmission,
  useToaster,
} from '@nocobase/app-client';
import { useAuthentication } from '@nocobase/app-plugin-authentication/client';
import { useCan } from '@nocobase/app-plugin-authorization/client';
import { useTranslation } from '@nocobase/i18n/client';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
  useResolvedPath,
} from 'react-router';

import { FeedbackForm } from '#components/feedback-form';
import { PendingButton } from '#components/pending-button';
import { RouteDialog } from '#components/route-dialog';
import { RouteDrawer } from '#components/route-drawer';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import { Label } from '#components/ui/label';
import { Switch } from '#components/ui/switch';
import { Textarea } from '#components/ui/textarea';

import { useSettingsData, useSettingsLeave } from '../hooks.js';
import { SettingsError, SettingsLoading } from '../shared.js';
import { ReleaseAppsClient, type ReleaseApp } from './client.js';

interface Fields {
  name: string;
  code: string;
  owner: string;
  notes: string;
  enabled: boolean;
}

type FieldName = keyof Fields;

function useReleaseAppPermission(action: 'create' | 'update') {
  return useCan({
    resource: { type: 'settings', id: 'release-apps' },
    action,
  }).can;
}

function validateFields(
  fields: Fields,
  t: ReturnType<typeof useTranslation>['t'],
): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};
  if (!fields.name.trim()) errors.name = t('releaseApps.nameRequired');
  else if (fields.name.trim().length > 120)
    errors.name = t('releaseApps.nameTooLong');
  if (fields.code.trim().length > 64)
    errors.code = t('releaseApps.codeTooLong');
  if (fields.owner.trim().length > 120)
    errors.owner = t('releaseApps.ownerTooLong');
  if (fields.notes.trim().length > 2000)
    errors.notes = t('releaseApps.notesTooLong');
  return errors;
}

function ReleaseAppEditor(): ReactElement {
  const { appId } = useParams<{ appId: string }>();
  const creating = !appId;
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();
  const client = useMemo(() => new ReleaseAppsClient(api), [api]);
  const navigate = useNavigate();
  const location = useLocation();
  const parent = useOutletContext<{ reload: () => void }>();
  const { session } = useAuthentication();
  const canCreate = useReleaseAppPermission('create');
  const canUpdate = useReleaseAppPermission('update');
  const allowed = creating ? canCreate : canUpdate;
  const request = useSettingsData<{ data: ReleaseApp }>(
    appId ? `releaseApps/${encodeURIComponent(appId)}` : 'releaseApps',
    { active: !creating },
  );
  const initial = creating ? undefined : request.data?.data;
  const [draft, setDraft] = useState<Fields>();
  const fields: Fields = draft ?? {
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    owner: initial?.owner ?? '',
    notes: initial?.notes ?? '',
    enabled: initial?.enabled ?? true,
  };
  const [dirty, setDirty] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});
  const [error, setError] = useState<unknown>();
  const [requestBusy, setRequestBusy] = useState(false);
  const submission = useSubmission({
    scope: `${session?.user.id ?? 'anonymous'}:settings:release-app:${appId ?? 'new'}`,
  });
  const busy = requestBusy || submission.submitting;
  const leave = useSettingsLeave(dirty, busy);
  const formId = creating ? 'release-app-create' : 'release-app-edit';
  const closeTo = {
    pathname: useResolvedPath('..').pathname,
    search: location.search,
  };
  const fieldError = (field: FieldName): string | undefined => {
    if (serverErrors[field]) return serverErrors[field];
    return submitted ? validateFields(fields, t)[field] : undefined;
  };
  const updateField = <K extends FieldName>(field: K, value: Fields[K]) => {
    setDraft({ ...fields, [field]: value });
    setServerErrors((old) => ({ ...old, [field]: undefined }));
    setDirty(true);
  };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !allowed) return;
    setSubmitted(true);
    const validation = validateFields(fields, t);
    setServerErrors(validation);
    if (Object.keys(validation).length > 0) {
      event.currentTarget
        .querySelector<HTMLInputElement>('input:invalid, textarea:invalid')
        ?.focus();
      return;
    }
    if (!creating && (request.error || request.loading)) return;
    setRequestBusy(true);
    setError(undefined);
    setServerErrors({});
    try {
      const input = {
        name: fields.name.trim(),
        code: fields.code.trim() || null,
        owner: fields.owner.trim() || null,
        notes: fields.notes.trim() || null,
        enabled: fields.enabled,
      };
      const saved = await submission.run(input, (key) =>
        creating ? client.create(input, key) : client.update(appId, input, key),
      );
      if (!saved) return;
      setDirty(false);
      parent?.reload();
      toaster.show({
        type: 'success',
        title: t(
          creating ? 'releaseApps.createdSuccess' : 'releaseApps.savedSuccess',
          { name: saved.name },
        ),
      });
      leave.allow();
      void navigate(closeTo, { replace: true });
    } catch (next) {
      if (next instanceof ApiClientError && next.reason === 'APP_NAME_TAKEN') {
        setServerErrors({ name: t('releaseApps.nameTaken') });
        document.getElementById(`${formId}-name`)?.focus();
      } else if (
        next instanceof ApiClientError &&
        next.reason === 'APP_CODE_TAKEN'
      ) {
        setServerErrors({ code: t('releaseApps.codeTaken') });
        document.getElementById(`${formId}-code`)?.focus();
      } else {
        setError(next);
      }
    } finally {
      setRequestBusy(false);
    }
  };
  const focusedRef = useRef(false);
  useEffect(() => {
    if (creating || request.loading || request.error || focusedRef.current)
      return;
    focusedRef.current = true;
    const frame = requestAnimationFrame(() =>
      document.getElementById(`${formId}-name`)?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [creating, formId, request.error, request.loading]);
  const actions = (
    <>
      <Button
        variant='outline'
        disabled={busy}
        onClick={() => void navigate(closeTo, { replace: true })}
      >
        {t('settings.cancel')}
      </Button>
      {allowed && (
        <PendingButton
          busy={busy}
          pendingLabel={t('settings.saving')}
          form={formId}
          type='submit'
          disabled={
            busy ||
            (!creating && !dirty) ||
            (!creating && (request.loading || Boolean(request.error)))
          }
        >
          {t(creating ? 'releaseApps.create' : 'settings.save')}
        </PendingButton>
      )}
    </>
  );
  const body = (
    <>
      <SettingsError error={request.error} retry={request.reload} />
      {!creating && request.loading ? (
        <SettingsLoading />
      ) : (
        !request.error && (
          <FeedbackForm
            id={formId}
            submitting={busy}
            error={error}
            errorContent={<SettingsError error={error} inline />}
            onSubmit={(event) => void save(event)}
            noValidate
            className='flex flex-col gap-4'
          >
            <div className='flex flex-col gap-2'>
              <Label htmlFor={`${formId}-name`}>
                {t('releaseApps.name')} *
              </Label>
              <Input
                id={`${formId}-name`}
                name='name'
                required
                maxLength={120}
                value={fields.name}
                disabled={!allowed || busy}
                aria-invalid={Boolean(fieldError('name'))}
                aria-errormessage={
                  fieldError('name') ? `${formId}-name-error` : undefined
                }
                onChange={(event) => updateField('name', event.target.value)}
              />
              {fieldError('name') && (
                <p
                  id={`${formId}-name-error`}
                  className='text-xs text-destructive'
                >
                  {fieldError('name')}
                </p>
              )}
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor={`${formId}-code`}>{t('releaseApps.code')}</Label>
              <Input
                id={`${formId}-code`}
                name='code'
                maxLength={64}
                value={fields.code}
                disabled={!allowed || busy}
                aria-invalid={Boolean(fieldError('code'))}
                aria-errormessage={
                  fieldError('code') ? `${formId}-code-error` : undefined
                }
                onChange={(event) => updateField('code', event.target.value)}
              />
              <p className='text-xs text-muted-foreground'>
                {t('releaseApps.codeHint')}
              </p>
              {fieldError('code') && (
                <p
                  id={`${formId}-code-error`}
                  className='text-xs text-destructive'
                >
                  {fieldError('code')}
                </p>
              )}
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor={`${formId}-owner`}>
                {t('releaseApps.owner')}
              </Label>
              <Input
                id={`${formId}-owner`}
                name='owner'
                maxLength={120}
                value={fields.owner}
                disabled={!allowed || busy}
                aria-invalid={Boolean(fieldError('owner'))}
                aria-errormessage={
                  fieldError('owner') ? `${formId}-owner-error` : undefined
                }
                onChange={(event) => updateField('owner', event.target.value)}
              />
              {fieldError('owner') && (
                <p
                  id={`${formId}-owner-error`}
                  className='text-xs text-destructive'
                >
                  {fieldError('owner')}
                </p>
              )}
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor={`${formId}-notes`}>
                {t('releaseApps.notes')}
              </Label>
              <Textarea
                id={`${formId}-notes`}
                name='notes'
                maxLength={2000}
                value={fields.notes}
                disabled={!allowed || busy}
                aria-invalid={Boolean(fieldError('notes'))}
                aria-errormessage={
                  fieldError('notes') ? `${formId}-notes-error` : undefined
                }
                onChange={(event) => updateField('notes', event.target.value)}
              />
              {fieldError('notes') && (
                <p
                  id={`${formId}-notes-error`}
                  className='text-xs text-destructive'
                >
                  {fieldError('notes')}
                </p>
              )}
            </div>
            <div className='flex items-start justify-between gap-4 rounded-lg border p-4'>
              <div className='flex flex-col gap-1'>
                <Label htmlFor={`${formId}-enabled`}>
                  {t('releaseApps.enabled')}
                </Label>
                <p className='text-sm text-muted-foreground'>
                  {t('releaseApps.enabledHint')}
                </p>
              </div>
              <Switch
                id={`${formId}-enabled`}
                checked={fields.enabled}
                disabled={!allowed || busy}
                onCheckedChange={(checked) =>
                  updateField('enabled', checked === true)
                }
              />
            </div>
          </FeedbackForm>
        )
      )}
      {leave.dialog}
    </>
  );
  if (creating)
    return (
      <RouteDialog
        title={t('releaseApps.create')}
        closeTo={closeTo}
        beforeClose={leave.guard}
        footer={actions}
        dirty={dirty}
      >
        {body}
      </RouteDialog>
    );
  return (
    <RouteDrawer
      title={t('releaseApps.edit')}
      description={initial?.name}
      closeTo={closeTo}
      beforeClose={leave.guard}
      footer={actions}
      dirty={dirty}
    >
      {body}
    </RouteDrawer>
  );
}

export default function ReleaseAppForm(): ReactElement {
  const { appId } = useParams();
  return <ReleaseAppEditor key={appId ?? '$new'} />;
}
