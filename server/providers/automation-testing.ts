import type { Application } from '@nocobase/app-server/application';
import { authorizationToken } from '@nocobase/app-plugin-authorization/server';
import { ServiceProvider } from '@nocobase/service-provider';

export default class AutomationTestingProvider extends ServiceProvider<Application> {
  readonly name = 'app/automation-testing';

  override boot(): Promise<void> {
    if (!this.app.container.has(authorizationToken)) return Promise.resolve();
    const authorization = this.app.container.resolve(authorizationToken);
    const title = { key: 'automationTesting.title', ns: 'nb' } as const;
    authorization.ui.sections.add({
      name: 'automation-testing',
      title,
      parent: 'business',
    });
    authorization.settings.add({
      id: 'automation-testing',
      title,
      actions: [{ name: 'read' }],
    });
    authorization.ui.place(
      { type: 'settings', id: 'automation-testing' },
      { section: 'automation-testing' },
    );
    return Promise.resolve();
  }
}
