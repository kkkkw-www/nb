import type {
  TransitionEntry,
  LifecycleDescriptionView,
} from '@nocobase/lifecycle';
export type State =
  'pending' | 'rejected' | 'awaitingRelease' | 'released' | 'failed';
export interface ReleaseRequest {
  id: string;
  appId: string;
  appName: string;
  status: State;
  lifecycleVersion: number;
  description: string;
  applicantId: string;
  applicantName: string;
  appliedAt: string;
  reviewerId: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  reviewResult: string | null;
  reviewNote: string | null;
  registrarId: string | null;
  registrarName: string | null;
  registeredAt: string | null;
  releasedAt: string | null;
  releaseNote: string | null;
}
export interface RequestDetail {
  record: ReleaseRequest;
  history: { transitions: TransitionEntry[] };
}
export type Definition = LifecycleDescriptionView;
export const states: State[] = [
  'pending',
  'rejected',
  'awaitingRelease',
  'released',
  'failed',
];
