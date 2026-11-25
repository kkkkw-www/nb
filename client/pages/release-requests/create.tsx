import { useState } from 'react';
import {
  ApiClientError,
  useApiClient,
  useSubmission,
} from '@nocobase/app-client';
import { useAuthentication } from '@nocobase/app-plugin-authentication/client';
import { useTranslation } from '@nocobase/i18n/client';
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useResolvedPath,
  useSearchParams,
} from 'react-router';
import { FeedbackForm } from '#components/feedback-form';
import { RouteDialog } from '#components/route-dialog';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import { Label } from '#components/ui/label';
import { Textarea } from '#components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '#components/ui/select';
import { useSettingsData } from '../settings/hooks.js';
import { SettingsError } from '../settings/shared.js';

export default function CreateRequest() {
  const { t } = useTranslation();
  const api = useApiClient();
  const { session } = useAuthentication();
  const [params] = useSearchParams();
  const [appId, setAppId] = useState(params.get('appId') ?? '');
  const [description, setDescription] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<unknown>();
  const request = useSettingsData<{
    data: { id: string; name: string }[];
    meta: { total: number };
  }>(
    `releaseRequests/appOptions?${new URLSearchParams({ q, page: String(page) })}`,
  );
  const submission = useSubmission({
    scope: `${session?.user.id}:releaseRequests:create`,
  });
  const parent = useOutletContext<{ reload: () => void }>();
  const navigate = useNavigate();
  const location = useLocation();
  const closeTo = {
    pathname: useResolvedPath('..').pathname,
    search: location.search,
  };
  const initial = { appId: params.get('appId') ?? '', description: '' };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    try {
      const saved = await submission.run(
        { appId, description },
        (key, signal, input) =>
          api.request({
            path: 'releaseRequests',
            method: 'POST',
            json: input,
            signal,
            headers: { 'Idempotency-Key': key },
          }),
      );
      if (saved) {
        parent.reload();
        void navigate(closeTo);
      }
    } catch (next) {
      setError(next);
    }
  };
  const items = (request.data?.data ?? []).map((app) => ({
    value: app.id,
    label: app.name,
  }));
  return (
    <RouteDialog
      title={t('releaseRequests.submit')}
      closeTo={closeTo}
      beforeClose={() => !submission.submitting}
      footer={
        <Button
          type='submit'
          form='release-request-create'
          disabled={submission.submitting || !appId || !description.trim()}
        >
          {t('releaseRequests.submit')}
        </Button>
      }
    >
      <FeedbackForm
        id='release-request-create'
        onSubmit={save}
        error={error}
        errorContent={
          error instanceof ApiClientError &&
          ['ACTIVE_RELEASE_REQUEST', 'APP_NOT_ENABLED'].includes(
            error.reason ?? '',
          )
            ? t(
                error.reason === 'ACTIVE_RELEASE_REQUEST'
                  ? 'releaseRequests.duplicate'
                  : 'releaseRequests.disabled',
              )
            : undefined
        }
        submitting={submission.submitting}
        values={() => ({ appId, description })}
        savedValues={initial}
        className='space-y-4'
      >
        <div className='space-y-2'>
          <Label htmlFor='app-search'>{t('releaseRequests.searchApps')}</Label>
          <Input
            id='app-search'
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <SettingsError error={request.error} retry={request.reload} />
          <Select
            items={items}
            value={appId}
            onValueChange={(value) => setAppId(String(value ?? ''))}
          >
            <SelectTrigger aria-label={t('releaseRequests.app')}>
              <SelectValue placeholder={t('releaseRequests.chooseApp')} />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!request.loading && items.length === 0 && (
            <p>{t('releaseRequests.noApps')}</p>
          )}
          <div className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              disabled={page <= 1 || request.loading}
              onClick={() => setPage(page - 1)}
            >
              {t('releaseRequests.previous')}
            </Button>
            <Button
              type='button'
              variant='outline'
              disabled={
                page * 20 >= (request.data?.meta.total ?? 0) || request.loading
              }
              onClick={() => setPage(page + 1)}
            >
              {t('releaseRequests.next')}
            </Button>
          </div>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='request-description'>
            {t('releaseRequests.description')}
          </Label>
          <Textarea
            id='request-description'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={4000}
          />
        </div>
      </FeedbackForm>
    </RouteDialog>
  );
}
