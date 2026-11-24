import { describe, expect, it, vi } from 'vitest';

import AgentChatProvider from '../../server/providers/agent-chat.js';

function providerFor(agents: unknown): AgentChatProvider {
  return new AgentChatProvider({
    container: {
      has: () => true,
      resolve: () => agents,
    },
  } as never);
}

describe('agent chat provider', () => {
  it('removes native tools and registers the page conversation source', async () => {
    const registerOnlineAgentGlobalScope = vi.fn();
    const registerSource = vi.fn();
    const provider = providerFor({
      onlineAgent: { configurator: { registerOnlineAgentGlobalScope } },
      conversations: { sources: { register: registerSource } },
    });

    await provider.boot();

    expect(registerOnlineAgentGlobalScope).toHaveBeenCalledWith({ tool: [] });
    expect(registerSource).toHaveBeenCalledWith({
      key: 'askAgent',
      title: { key: 'chat.source.askAgent', ns: 'nb' },
    });
  });

  it('does nothing when the agents plugin is not registered', async () => {
    const provider = new AgentChatProvider({
      container: { has: () => false, resolve: vi.fn() },
    } as never);

    await expect(provider.boot()).resolves.toBeUndefined();
  });
});
