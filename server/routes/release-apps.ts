import type { Application } from '@nocobase/app-server/application';
import {
  authenticationToken,
  type AuthEnv,
} from '@nocobase/app-plugin-authentication';
import {
  authorizationToken,
  type AuthorizationContext,
  type AuthorizationEnv,
} from '@nocobase/app-plugin-authorization/server';
import {
  apiErrorResponse,
  apiErrorResponses,
  apiValidator,
  dataResponse,
  defineApiRoutes,
  describeRoute,
  executeIdempotentMutation,
  listResponse,
  type AppApiRouteContribution,
} from '@nocobase/app-server/router';
import { databaseManagerToken } from '@nocobase/db';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  releaseAppsServiceToken,
  type ReleaseAppsService,
} from '../providers/release-apps.js';

const ReleaseAppSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  owner: z.string().nullable(),
  enabled: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const ListQuery = z.object({
  q: z.string().trim().max(120).optional(),
  enabled: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const IdParams = z.object({
  id: z.string().min(1).max(64),
});

const IdempotencyHeader = z.object({
  'idempotency-key': z.string().min(1),
});

const CreateInput = z.strictObject({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(64).nullable().optional(),
  owner: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  enabled: z.boolean().optional(),
});

const UpdateInput = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    code: z.string().trim().max(64).nullable().optional(),
    owner: z.string().trim().max(120).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

function requirePermission(
  authz: AuthorizationContext,
  action: 'read' | 'create' | 'update',
): Promise<void> {
  return authz.require({
    resource: { type: 'settings', id: 'release-apps' },
    action,
  });
}

export const releaseAppsRoutes: AppApiRouteContribution<Application> =
  defineApiRoutes((app) => {
    const router = new Hono<AuthEnv & AuthorizationEnv>();
    const auth = app.container.resolve(authenticationToken);
    const authorization = app.container.resolve(authorizationToken);
    const database = app.container.resolve(databaseManagerToken);
    const service: ReleaseAppsService = app.container.resolve(
      releaseAppsServiceToken,
    );

    router.use('*', auth.required(), authorization.middleware());

    router.get(
      '/',
      describeRoute({
        tags: ['Release applications'],
        summary: 'List release applications',
        operationId: 'listReleaseApps',
        responses: {
          200: listResponse(ReleaseAppSchema),
          ...apiErrorResponses,
        },
      }),
      apiValidator('query', ListQuery),
      async (context) => {
        await requirePermission(context.get('authz'), 'read');
        const query = context.req.valid('query');
        const { rows, total } = await service.list({
          q: query.q,
          enabled:
            query.enabled === undefined ? undefined : query.enabled === 'true',
          page: query.page,
          pageSize: query.pageSize,
        });
        return context.json({
          data: rows,
          meta: { page: query.page, pageSize: query.pageSize, total },
        });
      },
    );

    router.post(
      '/',
      describeRoute({
        tags: ['Release applications'],
        summary: 'Create a release application',
        operationId: 'createReleaseApp',
        responses: {
          201: dataResponse(ReleaseAppSchema),
          409: apiErrorResponse(409),
          ...apiErrorResponses,
        },
      }),
      apiValidator('header', IdempotencyHeader),
      apiValidator('json', CreateInput),
      async (context) => {
        await requirePermission(context.get('authz'), 'create');
        const user = context.get('auth') as { user: { id: string } };
        const input = context.req.valid('json');
        const result = await executeIdempotentMutation({
          connection: database.connection(),
          key: context.req.valid('header')['idempotency-key'],
          principal: user.user.id,
          operation: 'releaseApps/create',
          input,
          authorize: () => requirePermission(context.get('authz'), 'create'),
          authorizeReplay: async () => undefined,
          execute: (transaction) => service.create(transaction, input),
        });
        context.header('Idempotency-Replayed', String(result.replayed));
        return context.json({ data: result.data }, 201);
      },
    );

    router.get(
      '/:id',
      describeRoute({
        tags: ['Release applications'],
        summary: 'Get a release application',
        operationId: 'getReleaseApp',
        responses: {
          200: dataResponse(ReleaseAppSchema),
          404: apiErrorResponse(404),
          ...apiErrorResponses,
        },
      }),
      apiValidator('param', IdParams),
      async (context) => {
        await requirePermission(context.get('authz'), 'read');
        return context.json({
          data: await service.get(context.req.valid('param').id),
        });
      },
    );

    router.patch(
      '/:id',
      describeRoute({
        tags: ['Release applications'],
        summary: 'Update a release application',
        operationId: 'updateReleaseApp',
        responses: {
          200: dataResponse(ReleaseAppSchema),
          404: apiErrorResponse(404),
          409: apiErrorResponse(409),
          ...apiErrorResponses,
        },
      }),
      apiValidator('param', IdParams),
      apiValidator('header', IdempotencyHeader),
      apiValidator('json', UpdateInput),
      async (context) => {
        await requirePermission(context.get('authz'), 'update');
        const user = context.get('auth') as { user: { id: string } };
        const { id } = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await executeIdempotentMutation({
          connection: database.connection(),
          key: context.req.valid('header')['idempotency-key'],
          principal: user.user.id,
          operation: `releaseApps/${id}/update`,
          input,
          authorize: () => requirePermission(context.get('authz'), 'update'),
          authorizeReplay: async () => {
            await service.get(id);
          },
          execute: (transaction) => service.update(transaction, id, input),
        });
        context.header('Idempotency-Replayed', String(result.replayed));
        return context.json({ data: result.data });
      },
    );

    router.delete(
      '/:id',
      describeRoute({
        tags: ['Release applications'],
        summary:
          'Delete a release application without deleting release history',
        operationId: 'deleteReleaseApp',
        responses: {
          200: dataResponse(z.object({ id: z.string() })),
          404: apiErrorResponse(404),
          ...apiErrorResponses,
        },
      }),
      apiValidator('param', IdParams),
      apiValidator('header', IdempotencyHeader),
      async (context) => {
        await requirePermission(context.get('authz'), 'update');
        const user = context.get('auth') as { user: { id: string } };
        const { id } = context.req.valid('param');
        const result = await executeIdempotentMutation({
          connection: database.connection(),
          key: context.req.valid('header')['idempotency-key'],
          principal: user.user.id,
          operation: `releaseApps/${id}/delete`,
          input: { id },
          authorize: () => requirePermission(context.get('authz'), 'update'),
          authorizeReplay: async () => undefined,
          execute: (transaction) => service.delete(transaction, id),
        });
        context.header('Idempotency-Replayed', String(result.replayed));
        return context.json({ data: result.data });
      },
    );

    return new Hono().route('/releaseApps', router);
  });

export default releaseAppsRoutes;
