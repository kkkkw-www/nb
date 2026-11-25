import { randomUUID } from 'node:crypto';
import type { Application } from '@nocobase/app-server/application';
import { ApiError } from '@nocobase/app-server/router';
import { authorizationToken } from '@nocobase/app-plugin-authorization/server';
import {
  databaseManagerToken,
  isUniqueConstraintViolation,
  type DatabaseConnection,
  type DatabaseManager,
  type FilterBuilder,
  type FilterNode,
  type RepositoryFilter,
} from '@nocobase/db';
import {
  createServiceToken,
  ServiceProvider,
} from '@nocobase/service-provider';

export interface ReleaseAppRecord {
  id: string;
  name: string;
  code: string | null;
  owner: string | null;
  enabled: boolean;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ReleaseAppInput {
  name?: string;
  code?: string | null;
  owner?: string | null;
  notes?: string | null;
  enabled?: boolean;
}

export interface ReleaseAppListQuery {
  q?: string;
  enabled?: boolean;
  page: number;
  pageSize: number;
}

function requiredName(name: string): string {
  const value = name.trim();
  if (!value) {
    throw new ApiError({
      status: 'INVALID_ARGUMENT',
      reason: 'RELEASE_APP_NAME_REQUIRED',
      domain: 'release-apps',
      message: 'An application name is required.',
      fieldViolations: [
        {
          field: 'name',
          reason: 'REQUIRED',
          description: 'Enter the application name.',
        },
      ],
    });
  }
  return value;
}

function optionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = value.trim();
  return text || null;
}

function normalizedCode(code: string | null | undefined): string | null {
  const text = optionalText(code);
  return text === null ? null : text.toLowerCase();
}

function conflict(field: 'name' | 'code'): ApiError {
  const name = field === 'name' ? 'application name' : 'application code';
  return new ApiError({
    status: 'ALREADY_EXISTS',
    reason: field === 'name' ? 'APP_NAME_TAKEN' : 'APP_CODE_TAKEN',
    domain: 'release-apps',
    message: `This ${name} is already in use.`,
    fieldViolations: [
      {
        field,
        reason: field === 'name' ? 'APP_NAME_TAKEN' : 'APP_CODE_TAKEN',
        description: `This ${name} is already in use.`,
      },
    ],
  });
}

function notFound(id: string): ApiError {
  return new ApiError({
    status: 'NOT_FOUND',
    reason: 'RELEASE_APP_NOT_FOUND',
    domain: 'release-apps',
    message: `Release application ${id} was not found.`,
  });
}

function listFilter(
  query: ReleaseAppListQuery,
): RepositoryFilter<ReleaseAppRecord> | undefined {
  if (!query.q && query.enabled === undefined) return undefined;
  return (filter: FilterBuilder<ReleaseAppRecord>) => {
    const conditions: FilterNode[] = [];
    if (query.q) {
      const term = query.q;
      conditions.push(
        filter.or([
          filter.string('name').includes(term, { mode: 'insensitive' }),
          filter.string('code').includes(term, { mode: 'insensitive' }),
          filter.string('owner').includes(term, { mode: 'insensitive' }),
        ]),
      );
    }
    if (query.enabled !== undefined) {
      conditions.push(
        query.enabled
          ? filter.boolean('enabled').isTrue()
          : filter.boolean('enabled').isFalse(),
      );
    }
    return conditions.length === 1 ? conditions[0] : filter.and(conditions);
  };
}

export class ReleaseAppsService {
  constructor(private readonly database: DatabaseManager) {}

  async list(query: ReleaseAppListQuery) {
    const repository = this.database
      .connection()
      .repository<ReleaseAppRecord>('releaseApps');
    const filter = listFilter(query);
    const [rows, total] = await Promise.all([
      repository.findMany({
        ...(filter ? { filter } : {}),
        sort: (sort) => sort.field('name').asc(),
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
      }),
      repository.count(filter ? { filter } : {}),
    ]);
    return { rows, total };
  }

  async get(id: string): Promise<ReleaseAppRecord> {
    const record = await this.database
      .connection()
      .repository<ReleaseAppRecord>('releaseApps')
      .findOne({ filter: { id } });
    if (!record) throw notFound(id);
    return record;
  }

  async create(
    connection: DatabaseConnection,
    input: ReleaseAppInput,
  ): Promise<ReleaseAppRecord> {
    const name = requiredName(input.name ?? '');
    const code = normalizedCode(input.code);
    const values = {
      name,
      code,
      owner: optionalText(input.owner),
      enabled: input.enabled ?? true,
      notes: optionalText(input.notes),
    };
    await this.ensureAvailable(connection, values);
    const now = new Date();
    try {
      const { record } = await connection
        .repository<ReleaseAppRecord>('releaseApps')
        .createOne({
          values: {
            id: randomUUID(),
            ...values,
            createdAt: now,
            updatedAt: now,
          },
        });
      return record;
    } catch (error) {
      if (isUniqueConstraintViolation(error))
        await this.ensureAvailable(connection, values);
      throw error;
    }
  }

  async update(
    connection: DatabaseConnection,
    id: string,
    input: ReleaseAppInput,
  ): Promise<ReleaseAppRecord> {
    const repository = connection.repository<ReleaseAppRecord>('releaseApps');
    const current = await repository.findOne({ filter: { id } });
    if (!current) throw notFound(id);
    const values: Partial<ReleaseAppInput> = {};
    if (input.name !== undefined) values.name = requiredName(input.name);
    if (input.code !== undefined) values.code = normalizedCode(input.code);
    if (input.owner !== undefined) values.owner = optionalText(input.owner);
    if (input.notes !== undefined) values.notes = optionalText(input.notes);
    if (input.enabled !== undefined) values.enabled = input.enabled;
    if (Object.keys(values).length === 0) return current;
    await this.ensureAvailable(
      connection,
      {
        name: values.name ?? current.name,
        code: values.code === undefined ? current.code : values.code,
      },
      id,
    );
    try {
      const { record } = await repository.updateOne({
        filter: { id },
        values: {
          ...values,
          updatedAt: new Date(),
        },
      });
      return record;
    } catch (error) {
      if (isUniqueConstraintViolation(error))
        await this.ensureAvailable(
          connection,
          {
            name: values.name ?? current.name,
            code: values.code === undefined ? current.code : values.code,
          },
          id,
        );
      throw error;
    }
  }

  async delete(
    connection: DatabaseConnection,
    id: string,
  ): Promise<{ id: string }> {
    const repository = connection.repository<ReleaseAppRecord>('releaseApps');
    const current = await repository.findOne({ filter: { id } });
    if (!current) throw notFound(id);
    // Release requests retain their application-name snapshot; never cascade history.
    await repository.deleteOne({ filter: { id } });
    return { id };
  }

  private async ensureAvailable(
    connection: DatabaseConnection,
    values: { name: string; code: string | null },
    excludeId?: string,
  ): Promise<void> {
    const repository = connection.repository<ReleaseAppRecord>('releaseApps');
    const nameFilter = (
      filter: FilterBuilder<ReleaseAppRecord>,
    ): FilterNode => {
      const conditions: FilterNode[] = [
        filter.string('name').eq(values.name, { mode: 'insensitive' }),
      ];
      if (excludeId) conditions.push(filter.string('id').ne(excludeId));
      return conditions.length === 1 ? conditions[0] : filter.and(conditions);
    };
    if (await repository.exists({ filter: nameFilter })) throw conflict('name');
    if (values.code !== null) {
      const codeFilter = (
        filter: FilterBuilder<ReleaseAppRecord>,
      ): FilterNode => {
        const conditions: FilterNode[] = [
          filter.string('code').eq(values.code),
        ];
        if (excludeId) conditions.push(filter.string('id').ne(excludeId));
        return conditions.length === 1 ? conditions[0] : filter.and(conditions);
      };
      if (await repository.exists({ filter: codeFilter }))
        throw conflict('code');
    }
  }
}

export const releaseAppsServiceToken = createServiceToken<ReleaseAppsService>(
  'app/release-apps-service',
);

export default class ReleaseAppsProvider extends ServiceProvider<Application> {
  readonly name = 'app/release-apps';

  override register(): void {
    this.app.container.singleton(releaseAppsServiceToken, () => {
      const database = this.app.container.resolve(databaseManagerToken);
      return new ReleaseAppsService(database);
    });
  }

  override boot(): Promise<void> {
    if (!this.app.container.has(authorizationToken)) return Promise.resolve();
    const authorization = this.app.container.resolve(authorizationToken);
    authorization.settings.add({
      id: 'release-apps',
      title: 'Release applications',
      actions: [{ name: 'read' }, { name: 'create' }, { name: 'update' }],
    });
    authorization.database.collections.add({
      name: 'releaseApps',
      title: 'Release applications',
    });
    authorization.ui.sections.add({
      name: 'release-management',
      title: 'Release management',
      parent: 'business',
    });
    authorization.ui.place(
      { type: 'settings', id: 'release-apps' },
      { section: 'release-management' },
    );
    return Promise.resolve();
  }
}
