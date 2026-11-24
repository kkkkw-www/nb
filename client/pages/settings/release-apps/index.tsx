import type { ColumnDef } from '@tanstack/react-table';
import {
  resolveListState,
  useApiClient,
  useSubmission,
  useToaster,
} from '@nocobase/app-client';
import { useCan } from '@nocobase/app-plugin-authorization/client';
import { useChatPanel } from '@nocobase/app-plugin-agents/client/chat';
import { useTranslation } from '@nocobase/i18n/client';
import { BotMessageSquareIcon, PlusIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Link, Outlet, useLocation } from 'react-router';

import { DataTable } from '#components/data-table';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { RowActions } from '#components/row-actions';
import { StatusBadge } from '#components/status-badge';
import { Button } from '#components/ui/button';
import { Input } from '#components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#components/ui/select';
import { useListLocation } from '#hooks/use-list-location';
import {
  readTableUrlState,
  useTableUrlState,
} from '#hooks/use-table-url-state';

import { useSettingsData } from '../hooks.js';
import { ConfirmAction, SettingsError } from '../shared.js';
import { ReleaseAppsClient, type ReleaseApp } from './client.js';

function useReleaseAppPermission(action: 'read' | 'create' | 'update') {
  return useCan({
    resource: { type: 'settings', id: 'release-apps' },
    action,
  }).can;
}

function ReleaseAppActions({
  app,
  reload,
}: {
  readonly app: ReleaseApp;
  readonly reload: () => void;
}): ReactElement | null {
  const { t } = useTranslation();
  const api = useApiClient();
  const toaster = useToaster();
  const location = useLocation();
  const client = useMemo(() => new ReleaseAppsClient(api), [api]);
  const canUpdate = useReleaseAppPermission('update');
  const [enabled, setEnabled] = useState<boolean>();
  const [requestBusy, setRequestBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const submission = useSubmission({
    scope: `settings:release-app:${app.id}:status`,
  });
  const busy = requestBusy || submission.submitting;
  const run = async () => {
    if (enabled === undefined) return;
    setRequestBusy(true);
    setError(undefined);
    try {
      const updated = await submission.run({ enabled }, (key) =>
        client.update(app.id, { enabled }, key),
      );
      if (!updated) return;
      toaster.show({
        type: 'success',
        title: t(
          enabled
            ? 'releaseApps.enabledSuccess'
            : 'releaseApps.disabledSuccess',
          { name: app.name },
        ),
      });
      setEnabled(undefined);
      reload();
    } catch (next) {
      setError(next);
    } finally {
      setRequestBusy(false);
    }
  };
  if (!canUpdate) return null;
  return (
    <>
      <RowActions
        label={t('releaseApps.actionsFor', { name: app.name })}
        actions={[
          {
            key: 'edit',
            label: t('releaseApps.editAction'),
            render: (
              <Link
                to={{
                  pathname: `${encodeURIComponent(app.id)}/edit`,
                  search: location.search,
                }}
              />
            ),
          },
          {
            key: 'toggle',
            label: t(
              app.enabled ? 'releaseApps.disable' : 'releaseApps.enable',
            ),
            onClick: () => setEnabled(!app.enabled),
          },
        ]}
      />
      <ConfirmAction
        open={enabled !== undefined}
        title={t(
          enabled ? 'releaseApps.enableTitle' : 'releaseApps.disableTitle',
          { name: app.name },
        )}
        description={
          <>
            <p>
              {t(
                enabled ? 'releaseApps.enableHint' : 'releaseApps.disableHint',
              )}
            </p>
            <SettingsError error={error} />
          </>
        }
        confirmLabel={t(enabled ? 'releaseApps.enable' : 'releaseApps.disable')}
        busy={busy}
        onCancel={() => setEnabled(undefined)}
        onConfirm={() => void run()}
      />
    </>
  );
}

export default function ReleaseAppsPage(): ReactElement {
  const { t } = useTranslation();
  const chat = useChatPanel();
  const { params, setParams, active } = useListLocation();
  const location = useLocation();
  const [queryDraft, setQueryDraft] = useState<{
    key: string;
    value: string;
  }>();
  const query =
    queryDraft?.key === location.key
      ? queryDraft.value
      : (params.get('q') ?? '');
  const setQuery = (value: string) =>
    setQueryDraft({ key: location.key, value });
  const [composing, setComposing] = useState(false);
  useEffect(() => {
    if (composing || query === (params.get('q') ?? '')) return;
    const timer = setTimeout(() => {
      setParams(
        (old) => {
          const next = new URLSearchParams(old);
          if (query) next.set('q', query);
          else next.delete('q');
          next.delete('page');
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [query, composing, params, setParams]);
  const { paginationState } = readTableUrlState(params, {
    defaultPageSize: 20,
    pageSizeOptions: [20, 50, 100],
    sortColumns: [],
  });
  const page = paginationState.pageIndex + 1;
  const pageSize = paginationState.pageSize;
  const status = params.get('status') ?? 'all';
  const updateStatus = (value: string) =>
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        if (value === 'all') next.delete('status');
        else next.set('status', value);
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  const remote = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(params.get('q') ? { q: params.get('q')! } : {}),
    ...(status !== 'all' ? { enabled: String(status === 'enabled') } : {}),
  });
  const requestPath = `releaseApps?${remote}`;
  const request = useSettingsData<{
    data: readonly ReleaseApp[];
    meta: { total: number };
  }>(requestPath, { keepPreviousData: true, active });
  const hasCurrentResponse = request.path === requestPath;
  const tableState = useTableUrlState({
    active,
    revision: request.revision,
    defaultPageSize: 20,
    pageSizeOptions: [20, 50, 100],
    sortColumns: [],
    rowCount:
      hasCurrentResponse && !request.loading && !request.error
        ? request.data?.meta.total
        : undefined,
  });
  const canCreate = useReleaseAppPermission('create');
  const canUpdate = useReleaseAppPermission('update');
  const rows = request.data?.data ?? [];
  const filtered = Boolean(params.get('q')) || status !== 'all';
  const listState = resolveListState(
    {
      data: hasCurrentResponse ? request.data : undefined,
      error: tableState.error ?? request.error,
      isPending: request.loading && !hasCurrentResponse,
    },
    hasCurrentResponse ? (request.data?.meta.total ?? rows.length) : 0,
    filtered,
  );
  const clearFilters = () => {
    setQuery('');
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        for (const key of ['q', 'status', 'page']) next.delete(key);
        return next;
      },
      { replace: true },
    );
  };
  const reload = request.reload;
  const columns = useMemo<ColumnDef<ReleaseApp>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('releaseApps.name'),
        enableSorting: false,
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'code',
        header: t('releaseApps.code'),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.code ? (
            <span className='font-mono text-sm'>{row.original.code}</span>
          ) : (
            <span className='text-muted-foreground'>—</span>
          ),
      },
      {
        accessorKey: 'owner',
        header: t('releaseApps.owner'),
        enableSorting: false,
        cell: ({ row }) => row.original.owner || '—',
      },
      {
        id: 'status',
        header: t('releaseApps.status'),
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge tone={row.original.enabled ? 'success' : 'neutral'}>
            {t(
              row.original.enabled
                ? 'releaseApps.enabledStatus'
                : 'releaseApps.disabledStatus',
            )}
          </StatusBadge>
        ),
      },
      {
        accessorKey: 'notes',
        header: t('releaseApps.notes'),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className='block max-w-72 truncate text-muted-foreground'
            title={row.original.notes ?? undefined}
          >
            {row.original.notes || '—'}
          </span>
        ),
      },
      ...(canUpdate
        ? [
            {
              id: 'actions',
              header: () => (
                <span className='sr-only'>{t('releaseApps.actions')}</span>
              ),
              enableSorting: false,
              cell: ({ row }) => (
                <ReleaseAppActions app={row.original} reload={reload} />
              ),
            } satisfies ColumnDef<ReleaseApp>,
          ]
        : []),
    ],
    [t, canUpdate, reload],
  );
  const create =
    canCreate &&
    (listState === 'empty' ||
      listState === 'ready' ||
      listState === 'no-results' ||
      listState === 'refresh-failed') ? (
      <Button
        nativeButton={false}
        render={<Link to={{ pathname: 'create', search: location.search }} />}
      >
        <PlusIcon />
        {t('releaseApps.create')}
      </Button>
    ) : null;
  const askAi = (
    <Button
      variant='outline'
      disabled={!chat.available}
      onClick={() => chat.openChat({ source: 'askAgent' })}
    >
      <BotMessageSquareIcon />
      {t('releaseApps.askAi')}
    </Button>
  );
  return (
    <>
      <PageContainer>
        <PageHeader
          title={t('releaseApps.title')}
          description={t('releaseApps.description')}
          actions={
            <div className='flex flex-wrap items-center gap-2'>
              {askAi}
              {create}
            </div>
          }
        />
        <div className='flex flex-wrap items-center gap-3'>
          <Input
            className='w-full sm:max-w-xs'
            value={query}
            aria-label={t('releaseApps.search')}
            placeholder={t('releaseApps.search')}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select
            items={[
              { value: 'all', label: t('releaseApps.all') },
              { value: 'enabled', label: t('releaseApps.enabledStatus') },
              { value: 'disabled', label: t('releaseApps.disabledStatus') },
            ]}
            value={status}
            onValueChange={(value) => updateStatus(String(value))}
          >
            <SelectTrigger aria-label={t('releaseApps.status')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='w-auto max-w-[min(var(--container-sm),var(--available-width))] min-w-(--anchor-width) [&_[data-slot=select-item]>:first-child]:whitespace-normal'>
              {[
                { value: 'all', label: t('releaseApps.all') },
                { value: 'enabled', label: t('releaseApps.enabledStatus') },
                {
                  value: 'disabled',
                  label: t('releaseApps.disabledStatus'),
                },
              ].map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered && listState !== 'no-results' && (
            <Button variant='ghost' onClick={clearFilters}>
              {t('settings.clear')}
            </Button>
          )}
        </div>
        <DataTable<ReleaseApp>
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          manualPagination
          rowCount={request.data?.meta.total ?? 0}
          {...tableState}
          showSelectedCount={false}
          loading={active && request.loading}
          loadingIdentity={requestPath}
          listState={listState}
          onRetry={request.reload}
          onClearFilters={clearFilters}
          emptyMessage={t(
            filtered ? 'releaseApps.noResults' : 'releaseApps.emptyHint',
          )}
        />
        {request.data && (
          <p className='text-sm text-muted-foreground'>
            {t('releaseApps.total', { count: request.data.meta.total })}
          </p>
        )}
      </PageContainer>
      <Outlet context={{ reload }} />
    </>
  );
}
