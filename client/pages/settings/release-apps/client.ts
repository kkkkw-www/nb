import type { ApiClient } from '@nocobase/app-client';

export interface ReleaseApp {
  id: string;
  name: string;
  code: string | null;
  owner: string | null;
  enabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseAppInput {
  name?: string;
  code?: string | null;
  owner?: string | null;
  notes?: string | null;
  enabled?: boolean;
}

export class ReleaseAppsClient {
  constructor(private readonly api: ApiClient) {}

  async create(
    input: ReleaseAppInput,
    idempotencyKey: string,
  ): Promise<ReleaseApp> {
    const response = await this.api.request<{ data: ReleaseApp }>({
      path: 'releaseApps',
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      json: input,
    });
    return response.data;
  }

  async delete(
    id: string,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<{ id: string }> {
    const response = await this.api.request<{ data: { id: string } }>({
      path: `releaseApps/${encodeURIComponent(id)}`,
      method: 'DELETE',
      headers: { 'Idempotency-Key': idempotencyKey },
      signal,
    });
    return response.data;
  }

  async update(
    id: string,
    input: ReleaseAppInput,
    idempotencyKey: string,
  ): Promise<ReleaseApp> {
    const response = await this.api.request<{ data: ReleaseApp }>({
      path: `releaseApps/${encodeURIComponent(id)}`,
      method: 'PATCH',
      headers: { 'Idempotency-Key': idempotencyKey },
      json: input,
    });
    return response.data;
  }
}
