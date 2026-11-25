import { resolveListState } from '@nocobase/app-client';
import { useCan } from '@nocobase/app-plugin-authorization/client';
import { useTranslation } from '@nocobase/i18n/client';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, Outlet, useLocation } from 'react-router';
import { DataTable } from '#components/data-table';
import { PageContainer } from '#components/page-container';
import { PageHeader } from '#components/page-header';
import { Button } from '#components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '#components/ui/select';
import { useListLocation } from '#hooks/use-list-location';
import {
  useTableUrlState,
  readTableUrlState,
} from '#hooks/use-table-url-state';
import { useSettingsData } from '../settings/hooks.js';
import { states, type ReleaseRequest } from './model.js';

export default function ReleaseRequestsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { params, setParams, active } = useListLocation();
  const { paginationState } = readTableUrlState(params, {
    defaultPageSize: 20,
    pageSizeOptions: [20, 50, 100],
    sortColumns: [],
  });
  const remote = new URLSearchParams({
    page: String(paginationState.pageIndex + 1),
    pageSize: String(paginationState.pageSize),
  });
  for (const key of ['appId', 'status'])
    if (params.get(key)) remote.set(key, params.get(key)!);
  const workflow = location.pathname.includes('/workflows/');
  const path = `${workflow ? 'releaseWorkflows/executions' : 'releaseRequests'}?${remote}`;
  const request = useSettingsData<{
    data: ReleaseRequest[];
    meta: { total: number };
  }>(path, { active, keepPreviousData: true });
  const current = request.path === path;
  const table = useTableUrlState({
    active,
    revision: request.revision,
    defaultPageSize: 20,
    pageSizeOptions: [20, 50, 100],
    sortColumns: [],
    rowCount:
      current && !request.loading && !request.error
        ? request.data?.meta.total
        : undefined,
  });
  const canSubmit = useCan({
    resource: { type: 'settings', id: 'release-requests' },
    action: 'submit',
  }).can;
  const rows = request.data?.data ?? [];
  const filtered = Boolean(params.get('appId') || params.get('status'));
  const columns: ColumnDef<ReleaseRequest>[] = [
    {
      accessorKey: 'appName',
      header: t('releaseRequests.app'),
      cell: ({ row }) => (
        <Link
          className='font-medium underline'
          to={{ pathname: row.original.id, search: location.search }}
        >
          {row.original.appName}
        </Link>
      ),
    },
    {
      accessorKey: 'status',
      header: t('releaseRequests.status'),
      cell: ({ row }) => t(`releaseRequests.states.${row.original.status}`),
    },
    { accessorKey: 'applicantName', header: t('releaseRequests.applicant') },
    {
      accessorKey: 'appliedAt',
      header: t('releaseRequests.appliedAt'),
      cell: ({ row }) => new Date(row.original.appliedAt).toLocaleString(),
    },
    {
      accessorKey: 'reviewedAt',
      header: t('releaseRequests.reviewedAt'),
      cell: ({ row }) =>
        row.original.reviewedAt
          ? new Date(row.original.reviewedAt).toLocaleString()
          : '—',
    },
    {
      accessorKey: 'releasedAt',
      header: t('releaseRequests.releasedAt'),
      cell: ({ row }) =>
        row.original.releasedAt
          ? new Date(row.original.releasedAt).toLocaleString()
          : '—',
    },
  ];
  const items = [
    { value: 'all', label: t('releaseRequests.all') },
    ...states.map((value) => ({
      value,
      label: t(`releaseRequests.states.${value}`),
    })),
  ];
  const clear = () => setParams(new URLSearchParams());
  return (
    <>
      <PageContainer>
        <PageHeader
          title={t(
            workflow ? 'releaseRequests.executions' : 'releaseRequests.title',
          )}
          actions={
            !workflow && canSubmit ? (
              <Button
                nativeButton={false}
                render={
                  <Link to={{ pathname: 'create', search: location.search }} />
                }
              >
                {t('releaseRequests.submit')}
              </Button>
            ) : undefined
          }
        />
        <div className='flex flex-wrap gap-2'>
          <Select
            items={items}
            value={params.get('status') ?? 'all'}
            onValueChange={(value) =>
              setParams((old) => {
                const next = new URLSearchParams(old);
                next.delete('page');
                if (value === 'all') next.delete('status');
                else next.set('status', String(value));
                return next;
              })
            }
          >
            <SelectTrigger aria-label={t('releaseRequests.status')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered && (
            <Button variant='ghost' onClick={clear}>
              {t('settings.clear')}
            </Button>
          )}
        </div>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          manualPagination
          rowCount={request.data?.meta.total ?? 0}
          {...table}
          showSelectedCount={false}
          loading={request.loading}
          loadingIdentity={path}
          listState={resolveListState(
            {
              data: current ? request.data : undefined,
              error: request.error,
              isPending: request.loading && !current,
            },
            current ? rows.length : 0,
            filtered,
          )}
          onRetry={request.reload}
          onClearFilters={clear}
          renderCard={({ original: row }) => (
            <div className='space-y-2'>
              <Link
                className='font-medium underline'
                to={{ pathname: row.id, search: location.search }}
              >
                {row.appName}
              </Link>
              <p>{t(`releaseRequests.states.${row.status}`)}</p>
              <p className='text-sm text-muted-foreground'>
                {row.applicantName} · {new Date(row.appliedAt).toLocaleString()}
              </p>
            </div>
          )}
        />
      </PageContainer>
      <Outlet context={{ reload: request.reload }} />
    </>
  );
}
