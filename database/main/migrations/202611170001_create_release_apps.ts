import { defineMigration, type MigrationDefinition } from '@nocobase/db';

const migration: MigrationDefinition = defineMigration({
  name: '202611170001_create_release_apps',

  async up({ builder }) {
    await builder.createCollection('releaseApps', (collection) => {
      collection.string('id', { length: 64 }).notNull();
      collection.string('name', { length: 120 }).notNull();
      collection.string('code', { length: 64 }).nullable();
      collection.string('owner', { length: 120 }).nullable();
      collection.boolean('enabled', { defaultValue: true }).notNull();
      collection.text('notes').nullable();
      collection.datetime('createdAt').notNull();
      collection.datetime('updatedAt').notNull();

      collection.primary('id', { name: 'pk_release_apps' });
      collection.unique('name', { name: 'uq_release_apps_name' });
      collection.unique('code', { name: 'uq_release_apps_code' });
      collection.index('enabled', { name: 'ix_release_apps_enabled' });
    });
  },

  async down({ builder }) {
    await builder.dropCollection('releaseApps');
  },
});

export default migration;
