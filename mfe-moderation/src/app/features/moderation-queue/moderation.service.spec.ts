import { TestBed } from '@angular/core/testing';

import { GRAPHQL_CLIENT_OPTIONS } from '../../core/graphql-client';
import { HostConfig } from '../../core/host-config';
import { provideI18n } from '../../core/i18n';
import { RealtimeClient } from '../../core/realtime';
import { fakeRealtime } from '../../../testing/fixtures';
import { ModerationService } from './moderation.service';

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('ModerationService', () => {
  let service: ModerationService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideI18n(),
        { provide: RealtimeClient, useValue: fakeRealtime() },
        { provide: GRAPHQL_CLIENT_OPTIONS, useValue: { tokenWaitMs: 10 } },
      ],
    });
    const config = TestBed.inject(HostConfig);
    config.graphqlUrl.set('http://gw.test/graphql');
    config.setAccessToken('tok');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    service = TestBed.inject(ModerationService);
  });

  afterEach(() => vi.unstubAllGlobals());

  const sent = () => JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);

  it('loadQueue sends filter/cursor and flattens the Relay connection (JSON scores may be a string)', async () => {
    fetchMock.mockResolvedValue(
      json({
        data: {
          moderationQueue: {
            totalCount: 7,
            pageInfo: { hasNextPage: true, endCursor: 'c2' },
            edges: [
              {
                node: {
                  id: 'm-1', source: 'AI', openReports: 0, enqueuedAt: '2026-10-14T15:00:00Z', post: null,
                  media: { id: 'm-1', kind: 'IMAGE', status: 'FLAGGED', previewUrl: null, thumbnailUrl: null, tags: [], ocrText: null, createdAt: '2026-10-14T15:00:00Z', owner: null,
                    moderation: { decision: 'REVIEW', labels: [], scores: '{"nsfw":0.8}', maxScore: 0.8, modelVersion: 'v1' } },
                },
              },
            ],
          },
        },
        errors: [{ message: 'timeout', extensions: { code: 'UPSTREAM_UNAVAILABLE' } }],
      }),
    );
    const page = await service.loadQueue({ source: 'AI', kind: 'IMAGE' }, 'c1', 20);
    expect(sent().variables).toEqual({ filter: { source: 'AI', kind: 'IMAGE' }, after: 'c1', first: 20 });
    expect(page.totalCount).toBe(7);
    expect(page.pageInfo).toEqual({ hasNextPage: true, endCursor: 'c2' });
    expect(page.items[0]!.media!.moderation!.scores).toEqual({ nsfw: 0.8 });
    expect(page.partialError).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('moderateMedia sends decision + note and an Idempotency-Key, and returns ok', async () => {
    fetchMock.mockResolvedValue(json({ data: { moderateMedia: { media: { id: 'm-1', status: 'APPROVED' }, errors: [] } } }));
    const outcome = await service.moderateMedia('m-1', 'APPROVE', 'ok');
    expect(outcome).toEqual({ ok: true });
    expect(sent().variables).toEqual({ id: 'm-1', decision: 'APPROVE', note: 'ok' });
    const headers = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBeTruthy();
  });

  it('moderateMedia surfaces UserError codes from the payload (ALREADY_MODERATED)', async () => {
    fetchMock.mockResolvedValue(
      json({ data: { moderateMedia: { media: null, errors: [{ code: 'ALREADY_MODERATED', message: 'x', field: null }] } } }),
    );
    expect(await service.moderateMedia('m-1', 'REJECT', '')).toEqual({ ok: false, code: 'ALREADY_MODERATED' });
    expect(sent().variables.note).toBeNull();
  });

  it('also accepts the conflict as a GraphQL error with extensions.code (UC-18 10a)', async () => {
    fetchMock.mockResolvedValue(
      json({ data: null, errors: [{ message: 'x', extensions: { code: 'ALREADY_MODERATED' } }] }),
    );
    expect(await service.moderateMedia('m-1', 'APPROVE', '')).toEqual({ ok: false, code: 'ALREADY_MODERATED' });
  });

  it('maps transport failures to an outcome instead of throwing', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    expect(await service.suspendUser('u-1', 'spam')).toEqual({ ok: false, code: 'NETWORK_ERROR' });
  });

  it('resolveReport and suspendUser use the contract inputs', async () => {
    fetchMock.mockResolvedValue(json({ data: { resolveContentReport: { report: { id: 'r-1' }, errors: [] } } }));
    await service.resolveReport('r-1', 'REMOVE', 'n');
    expect(sent().variables).toEqual({ input: { reportId: 'r-1', resolution: 'REMOVE', note: 'n' } });

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(json({ data: { suspendUser: { user: { id: 'u-1' }, errors: [] } } }));
    await service.suspendUser('u-1', 'spam');
    expect(sent().variables).toEqual({ input: { userId: 'u-1', reason: 'spam', until: null } });
  });
});
