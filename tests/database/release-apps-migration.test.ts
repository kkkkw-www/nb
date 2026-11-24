import path from 'node:path';
import { describeMigration } from '@nocobase/app-testing/server';
import { expect } from 'vitest';

describeMigration('202611170001_create_release_apps', {
  sources: [
    {
      packageName: 'release-apps-test',
      directory: path.resolve(
        import.meta.dirname,
        '../../database/main/migrations',
      ),
    },
  ],
  up: async ({ connection, expectCollection }) => {
    const apps = await expectCollection('releaseApps').toExist();
    expect(apps.primaryKey).toEqual(['id']);
    expect(Object.keys(apps.fields)).toEqual([
      'id',
      'name',
      'code',
      'owner',
      'enabled',
      'notes',
      'createdAt',
      'updatedAt',
    ]);
    await expectCollection('releaseApps').toHaveField('name', {
      nullable: false,
    });
    await expectCollection('releaseApps').toHaveField('code', {
      nullable: true,
    });
    await expectCollection('releaseApps').toHaveField('enabled', {
      nullable: false,
    });
    const row = {
      name: 'Order center',
      code: 'order-center',
      owner: 'Alice',
      enabled: true,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await connection.query
      .insertInto('releaseApps')
      .values({ ...row, id: 'first' })
      .execute();
    await expect(
      connection.query
        .insertInto('releaseApps')
        .values({ ...row, id: 'second', code: 'other-code' })
        .execute(),
    ).rejects.toThrow();
    await expect(
      connection.query
        .insertInto('releaseApps')
        .values({ ...row, id: 'third', name: 'Other app' })
        .execute(),
    ).rejects.toThrow();
    // A code is optional, so several rows may leave it null.
    await connection.query
      .insertInto('releaseApps')
      .values({
        ...row,
        id: 'fourth',
        name: 'Other app',
        code: null,
      })
      .execute();
    await connection.query
      .insertInto('releaseApps')
      .values({
        ...row,
        id: 'fifth',
        name: 'Third app',
        code: null,
      })
      .execute();
  },
  down: async ({ expectCollection }) => {
    await expectCollection('releaseApps').not.toExist();
  },
});
