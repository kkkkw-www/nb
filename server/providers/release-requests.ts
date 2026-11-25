import { randomUUID } from 'node:crypto';
import type { Application } from '@nocobase/app-server/application';
import { ApiError } from '@nocobase/app-server/router';
import { authorizationToken } from '@nocobase/app-plugin-authorization/server';
import {
  databaseManagerToken,
  isUniqueConstraintViolation,
  type DatabaseManager,
  type DatabaseConnection,
} from '@nocobase/db';
import {
  createRepositoryLifecycleStore,
  defineLifecycle,
  LifecycleRuntime,
  type LifecycleRecord,
  type TransitionContext,
  type JsonObject,
} from '@nocobase/lifecycle';
import {
  createServiceToken,
  ServiceProvider,
} from '@nocobase/service-provider';
import type { ReleaseAppRecord } from './release-apps.js';

export type ReleaseState =
  'pending' | 'rejected' | 'awaitingRelease' | 'released' | 'failed';
export interface ReleaseRequest extends LifecycleRecord {
  id: string;
  appId: string;
  appName: string;
  status: ReleaseState;
  lifecycleVersion: number;
}
interface ReleaseTypes {
  record: ReleaseRequest;
  state: ReleaseState;
}
const noteRequired = (input: JsonObject) =>
  typeof input.note === 'string' && input.note.trim()
    ? []
    : [{ field: 'note', message: 'A reason is required.' }];
const review = ({
  actor,
  input,
  now,
  to,
}: TransitionContext<ReleaseTypes> & { to: ReleaseState }) => ({
  reviewerId: actor.id,
  reviewerName: input.actorName,
  reviewedAt: now.toISOString(),
  reviewNote: input.note || null,
  reviewResult: to === 'rejected' ? 'rejected' : 'approved',
  ...(to === 'rejected' ? { activeAppId: null } : {}),
});
const register = ({
  actor,
  input,
  now,
  to,
}: TransitionContext<ReleaseTypes> & { to: ReleaseState }) => ({
  registrarId: actor.id,
  registrarName: input.actorName,
  registeredAt: now.toISOString(),
  releaseNote: input.note || null,
  activeAppId: null,
  releasedAt: to === 'released' ? input.releasedAt || now.toISOString() : null,
});
export const releaseLifecycle = defineLifecycle<ReleaseTypes>({
  name: 'releaseRequests',
  initial: 'pending',
  states: [
    'pending',
    'awaitingRelease',
    { name: 'rejected', final: true },
    { name: 'released', final: true },
    { name: 'failed', final: true },
  ],
  transitions: {
    approve: { from: 'pending', to: 'awaitingRelease', set: review },
    reject: {
      from: 'pending',
      to: 'rejected',
      validate: noteRequired,
      set: review,
    },
    succeed: { from: 'awaitingRelease', to: 'released', set: register },
    fail: {
      from: 'awaitingRelease',
      to: 'failed',
      validate: noteRequired,
      set: register,
    },
  },
});
export class ReleaseRequestsService {
  readonly runtime: LifecycleRuntime;
  constructor(private readonly database: DatabaseManager) {
    // This process has no effects, triggers or external deployment work.
    this.runtime = new LifecycleRuntime({
      store: createRepositoryLifecycleStore(database),
    });
    this.runtime.register(releaseLifecycle);
  }
  async list(query: {
    appId?: string;
    status?: ReleaseState;
    page: number;
    pageSize: number;
  }) {
    const repository =
      this.database.repository<ReleaseRequest>('releaseRequests');
    const filter = {
      ...(query.appId ? { appId: query.appId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await Promise.all([
      repository.findMany({
        filter,
        sort: (s) => [s.field('appliedAt').desc(), s.field('id').desc()],
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
      }),
      repository.count({ filter }),
    ]);
    // Do not expose the internal uniqueness key.
    return { rows: rows.map(({ activeAppId: _active, ...row }) => row), total };
  }
  async get(id: string) {
    const row = await this.database
      .repository<ReleaseRequest>('releaseRequests')
      .findOne({ filter: { id } });
    if (!row)
      throw new ApiError({
        status: 'NOT_FOUND',
        reason: 'RELEASE_REQUEST_NOT_FOUND',
        domain: 'release-requests',
        message: 'Release request not found.',
      });
    const { activeAppId: _active, ...record } = row;
    return {
      record,
      history: await this.runtime.history('releaseRequests', id),
    };
  }
  async create(
    connection: DatabaseConnection,
    input: { appId: string; description: string },
    user: { id: string; name: string },
  ) {
    const app = await connection
      .repository<ReleaseAppRecord>('releaseApps')
      .findOne({ filter: { id: input.appId } });
    if (!app?.enabled)
      throw new ApiError({
        status: 'FAILED_PRECONDITION',
        reason: 'APP_NOT_ENABLED',
        domain: 'release-requests',
        message: 'Only enabled applications can be requested.',
      });
    try {
      const result = await this.runtime.create(
        'releaseRequests',
        {
          id: randomUUID(),
          appId: app.id,
          appName: app.name,
          activeAppId: app.id,
          applicantId: user.id,
          applicantName: user.name,
          appliedAt: new Date().toISOString(),
          description: input.description,
        },
        { actor: { id: user.id }, transaction: connection },
      );
      const { activeAppId: _active, ...record } = result.record;
      return record;
    } catch (error) {
      if (isUniqueConstraintViolation(error))
        throw new ApiError({
          status: 'ALREADY_EXISTS',
          reason: 'ACTIVE_RELEASE_REQUEST',
          domain: 'release-requests',
          message: 'This application already has a pending release request.',
        });
      throw error;
    }
  }
  async act(
    connection: DatabaseConnection,
    id: string,
    transition: string,
    input: { note: string; releasedAt?: string; version: number },
    user: { id: string; name: string },
    key: string,
  ) {
    const result = await this.runtime.fire('releaseRequests', id, transition, {
      actor: { id: user.id },
      manual: true,
      transaction: connection,
      requestId: key,
      expect: { version: input.version },
      input: {
        note: input.note,
        actorName: user.name,
        ...(input.releasedAt ? { releasedAt: input.releasedAt } : {}),
      },
    });
    const { activeAppId: _active, ...record } = result.record;
    return record;
  }
}
export const releaseRequestsToken = createServiceToken<ReleaseRequestsService>(
  'app/release-requests',
);
export default class ReleaseRequestsProvider extends ServiceProvider<Application> {
  readonly name = 'app/release-requests';
  override register() {
    this.app.container.singleton(
      releaseRequestsToken,
      () =>
        new ReleaseRequestsService(
          this.app.container.resolve(databaseManagerToken),
        ),
    );
  }
  override async boot(): Promise<void> {
    const authz = this.app.container.resolve(authorizationToken);
    for (const [id, actions] of [
      ['release-requests', ['read', 'submit', 'review', 'register']],
      ['release-workflows', ['read']],
    ] as const) {
      authz.settings.add({
        id,
        title: {
          key:
            id === 'release-requests'
              ? 'releaseRequests.title'
              : 'releaseRequests.workflows',
          ns: 'nb',
        },
        actions: actions.map((name) => ({
          name,
          title: { key: `releaseRequests.permissions.${name}`, ns: 'nb' },
        })),
      });
      authz.ui.place(
        { type: 'settings', id },
        { section: 'release-management' },
      );
    }
  }
}
