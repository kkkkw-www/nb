import type { Application } from '@nocobase/app-server/application';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { ServiceProvider } from '@nocobase/service-provider';

/**
 * The chat is for asking questions and organizing content; it reads no business data.
 * Replace the plugin's native bash/skill defaults with an empty tool list.
 */
export default class AgentChatProvider extends ServiceProvider<Application> {
  readonly name = 'app/agent-chat';

  override async boot(): Promise<void> {
    if (!this.app.container.has(agentsToken)) return;
    const agents = this.app.container.resolve(agentsToken);
    agents.onlineAgent.configurator.registerOnlineAgentGlobalScope({
      tool: [],
    });
    // The page entry starts conversations from "askAgent"; the plugin refuses sources the application has not named.
    agents.conversations.sources.register({
      key: 'askAgent',
      title: { key: 'chat.source.askAgent', ns: 'nb' },
    });
  }
}
