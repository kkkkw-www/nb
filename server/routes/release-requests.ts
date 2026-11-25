import type { Application } from '@nocobase/app-server/application';
import {
  authenticationToken,
  type AuthEnv,
} from '@nocobase/app-plugin-authentication';
import {
  authorizationToken,
  type AuthorizationEnv,
} from '@nocobase/app-plugin-authorization/server';
import {
  ApiError,
  apiErrorHandler,
  apiErrorResponses,
  apiValidator,
  dataResponse,
  defineApiRoutes,
  describeRoute,
  executeIdempotentMutation,
} from '@nocobase/app-server/router';
import { databaseManagerToken } from '@nocobase/db';
import {
  LifecycleError,
  lifecycleErrorFields,
  lifecycleDescriptionView,
} from '@nocobase/lifecycle';
import { Hono } from 'hono';
import { z } from 'zod';
import { releaseRequestsToken } from '../providers/release-requests.js';

const states = z.enum([
  'pending',
  'rejected',
  'awaitingRelease',
  'released',
  'failed',
]);
const listQuery = z.object({
  appId: z.string().max(64).optional(),
  status: states.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const id = z.object({ id: z.string().min(1).max(64) });
const header = z.object({ 'idempotency-key': z.string().min(1) });
const create = z.strictObject({
  appId: z.string().min(1).max(64),
  description: z.string().trim().min(1).max(4000),
});
const action = z
  .strictObject({
    transition: z.enum(['approve', 'reject', 'succeed', 'fail']),
    note: z.string().trim().max(4000).default(''),
    releasedAt: z.iso.datetime().optional(),
    version: z.number().int().min(0),
  })
  .superRefine((input, ctx) => {
    if (['reject', 'fail'].includes(input.transition) && !input.note)
      ctx.addIssue({
        code: 'custom',
        path: ['note'],
        message: 'A reason is required.',
      });
    if (input.releasedAt && input.transition !== 'succeed')
      ctx.addIssue({
        code: 'custom',
        path: ['releasedAt'],
        message: 'Only success may set the release time.',
      });
  });
const response = { 200: dataResponse(z.unknown()), ...apiErrorResponses };
export default defineApiRoutes<Application>((app) => {
  const router = new Hono<AuthEnv & AuthorizationEnv>();
  const auth = app.container.resolve(authenticationToken);
  const authz = app.container.resolve(authorizationToken);
  const service = app.container.resolve(releaseRequestsToken);
  const db = app.container.resolve(databaseManagerToken);
  for (const path of [
    '/releaseRequests',
    '/releaseRequests/*',
    '/releaseWorkflows',
    '/releaseWorkflows/*',
  ])
    router.use(path, auth.required(), authz.middleware());
  router.onError((error, c) => {
    const fields =
      error instanceof LifecycleError ? lifecycleErrorFields(error) : undefined;
    return apiErrorHandler(
      fields ? new ApiError({ ...fields, domain: 'release-requests' }) : error,
      c,
    );
  });
  router.get(
    '/releaseRequests',
    describeRoute({
      tags: ['Release requests'],
      summary: 'List release requests',
      responses: response,
    }),
    apiValidator('query', listQuery),
    async (c) => {
      await c.get('authz').require({
        resource: { type: 'settings', id: 'release-requests' },
        action: 'read',
      });
      const query = c.req.valid('query');
      const result = await service.list(query);
      return c.json({
        data: result.rows,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
        },
      });
    },
  );
  router.get(
    '/releaseRequests/appOptions',
    describeRoute({
      tags: ['Release requests'],
      summary: 'Select enabled applications for a request',
      responses: response,
    }),
    apiValidator(
      'query',
      z.object({
        q: z.string().trim().max(120).optional(),
        page: z.coerce.number().int().min(1).default(1),
      }),
    ),
    async (c) => {
      await c.get('authz').require({
        resource: { type: 'settings', id: 'release-requests' },
        action: 'submit',
      });
      const { q, page } = c.req.valid('query');
      const filter = (f: import('@nocobase/db').FilterBuilder) =>
        q
          ? f.and([
              f.boolean('enabled').isTrue(),
              f.string('name').includes(q, { mode: 'insensitive' }),
            ])
          : f.boolean('enabled').isTrue();
      const repository = db.repository('releaseApps');
      const [rows, total] = await Promise.all([
        repository.findMany({
          filter,
          select: (s) => s.fields('id', 'name'),
          sort: (s) => s.field('name').asc(),
          limit: 20,
          offset: (page - 1) * 20,
        }),
        repository.count({ filter }),
      ]);
      return c.json({ data: rows, meta: { page, pageSize: 20, total } });
    },
  );
  router.post(
    '/releaseRequests',
    describeRoute({
      tags: ['Release requests'],
      summary: 'Submit a release request',
      responses: { 201: dataResponse(z.unknown()), ...apiErrorResponses },
    }),
    apiValidator('header', header),
    apiValidator('json', create),
    async (c) => {
      const require = () =>
        c.get('authz').require({
          resource: { type: 'settings', id: 'release-requests' },
          action: 'submit',
        });
      await require();
      const user = c.get('auth')!.user;
      const input = c.req.valid('json');
      const result = await executeIdempotentMutation({
        connection: db.connection(),
        key: c.req.valid('header')['idempotency-key'],
        principal: user.id,
        operation: 'releaseRequests/submit',
        input,
        authorize: require,
        authorizeReplay: async () => undefined,
        execute: (tx) =>
          service.create(tx, input, { id: user.id, name: user.name }),
      });
      c.header('Idempotency-Replayed', String(result.replayed));
      return c.json({ data: result.data }, 201);
    },
  );
  router.get(
    '/releaseRequests/:id',
    describeRoute({
      tags: ['Release requests'],
      summary: 'Get request and history',
      responses: response,
    }),
    apiValidator('param', id),
    async (c) => {
      await c.get('authz').require({
        resource: { type: 'settings', id: 'release-requests' },
        action: 'read',
      });
      return c.json({ data: await service.get(c.req.valid('param').id) });
    },
  );
  router.post(
    '/releaseRequests/:id/fire',
    describeRoute({
      tags: ['Release requests'],
      summary: 'Review or register a release result',
      responses: response,
    }),
    apiValidator('param', id),
    apiValidator('header', header),
    apiValidator('json', action),
    async (c) => {
      const input = c.req.valid('json');
      const requestId = c.req.valid('param').id;
      const require = () =>
        c.get('authz').require({
          resource: { type: 'settings', id: 'release-requests' },
          action: ['approve', 'reject'].includes(input.transition)
            ? 'review'
            : 'register',
        });
      await require();
      const user = c.get('auth')!.user;
      const key = c.req.valid('header')['idempotency-key'];
      const result = await executeIdempotentMutation({
        connection: db.connection(),
        key,
        principal: user.id,
        operation: `releaseRequests/${requestId}/${input.transition}`,
        input,
        authorize: require,
        authorizeReplay: async () => undefined,
        execute: (tx) =>
          service.act(
            tx,
            requestId,
            input.transition,
            input,
            { id: user.id, name: user.name },
            key,
          ),
      });
      c.header('Idempotency-Replayed', String(result.replayed));
      return c.json({ data: result.data });
    },
  );
  router.get(
    '/releaseWorkflows',
    describeRoute({
      tags: ['Release workflows'],
      summary: 'Get release workflow definition',
      responses: response,
    }),
    async (c) => {
      await c.get('authz').require({
        resource: { type: 'settings', id: 'release-workflows' },
        action: 'read',
      });
      return c.json({
        data: lifecycleDescriptionView(service.runtime, 'releaseRequests'),
      });
    },
  );
  router.get(
    '/releaseWorkflows/executions',
    describeRoute({
      tags: ['Release workflows'],
      summary: 'List release executions',
      responses: response,
    }),
    apiValidator('query', listQuery),
    async (c) => {
      await c.get('authz').require({
        resource: { type: 'settings', id: 'release-workflows' },
        action: 'read',
      });
      const query = c.req.valid('query');
      const result = await service.list(query);
      return c.json({
        data: result.rows,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
        },
      });
    },
  );
  router.get(
    '/releaseWorkflows/executions/:id',
    describeRoute({
      tags: ['Release workflows'],
      summary: 'Get release execution history',
      responses: response,
    }),
    apiValidator('param', id),
    async (c) => {
      await c.get('authz').require({
        resource: { type: 'settings', id: 'release-workflows' },
        action: 'read',
      });
      return c.json({ data: await service.get(c.req.valid('param').id) });
    },
  );
  return new Hono().route('/', router);
});
