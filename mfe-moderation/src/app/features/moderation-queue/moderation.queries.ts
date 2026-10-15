/** Operaciones GraphQL del MFE (contrato: `bandadau-docs/contracts/graphql/admin.graphql`). */

const USER = `id email status`;

const MEDIA = `
  id kind status previewUrl thumbnailUrl tags ocrText createdAt
  owner { ${USER} }
  moderation { decision labels scores maxScore modelVersion }`;

const POST = `
  id text hashtags status createdAt
  author { ${USER} }
  media { ${MEDIA} }`;

export const ITEM_FIELDS = `
  id source openReports enqueuedAt
  media { ${MEDIA} }
  post { ${POST} }`;

export const MODERATION_QUEUE = `
  query ModerationQueue($filter: ModerationQueueFilter, $after: String, $first: Int) {
    moderationQueue(filter: $filter, after: $after, first: $first) {
      totalCount
      pageInfo { hasNextPage endCursor }
      edges { cursor node { ${ITEM_FIELDS} } }
    }
  }`;

export const CONTENT_REPORTS = `
  query ContentReports($first: Int) {
    contentReports(status: OPEN, first: $first) {
      id targetType targetId reason details createdAt
      reporter { ${USER} }
      post { ${POST} }
    }
  }`;

export const ME = `query Me { me { id roles } }`;

export const MODERATE_MEDIA = `
  mutation ModerateMedia($id: UUID!, $decision: MediaReviewDecision!, $note: String) {
    moderateMedia(id: $id, decision: $decision, note: $note) {
      media { id status }
      errors { code message field }
    }
  }`;

export const RESOLVE_CONTENT_REPORT = `
  mutation ResolveContentReport($input: ResolveContentReportInput!) {
    resolveContentReport(input: $input) {
      report { id status resolution }
      errors { code message field }
    }
  }`;

export const SUSPEND_USER = `
  mutation SuspendUser($input: SuspendUserInput!) {
    suspendUser(input: $input) {
      user { id status }
      errors { code message field }
    }
  }`;

export const QUEUE_CHANGED = `
  subscription ModerationQueueChanged {
    moderationQueueChanged {
      type totalCount
      item { ${ITEM_FIELDS} }
    }
  }`;
