// OpenAPI 3.1 description of the Worker API, served at /api/openapi.json and
// rendered by Scalar at /api/docs. Keep it next to the routes in index.ts:
// when a route or its validation changes, change it here too.

const ok = { description: 'Done', content: { 'application/json': { schema: { type: 'object', properties: { ok: { const: true } } } } } }
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const jsonBody = (schema: object, required = true) => ({ required, content: { 'application/json': { schema } } })
const jsonResponse = (description: string, schema: object) => ({ description, content: { 'application/json': { schema } } })
const errors = (...codes: number[]) => Object.fromEntries(codes.map((c) => [c, { $ref: `#/components/responses/E${c}` }]))
const idParam = (name: string, description: string) => ({ name, in: 'path', required: true, description, schema: { type: 'string' } })
const isoDate = { type: 'string', format: 'date', examples: ['2026-11-14'] }

export function openapi(enums: { channels: string[]; kinds: string[]; sources: string[]; programs: string[] }) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Coding in Color donor relationships API',
      version: '1.0.0',
      description: [
        'The JSON API behind the donor relationships app. Every route except `/api/config` needs a WorkOS AuthKit access token for a CIC board member, sent as `Authorization: Bearer <token>`.',
        '',
        'Board members only see and change donors they own. Routes marked **admin only** return 403 for everyone else.',
        '',
        'Errors are always `{"error": "message"}` with a 4xx or 5xx status.',
      ].join('\n'),
      license: { name: 'MIT', identifier: 'MIT' },
    },
    servers: [{ url: '/', description: 'This deployment' }],
    security: [{ workos: [] }],
    tags: [
      { name: 'Session', description: 'Sign-in config and everything the signed-in user can see' },
      { name: 'Donors', description: 'Contact log, next steps and ownership' },
      { name: 'Drafts', description: 'Messages a human approves before anything is sent' },
      { name: 'Assistant', description: 'Read-only chat over the caller\'s own records' },
      { name: 'Admin', description: 'Import and board member management' },
    ],
    paths: {
      '/api/config': {
        get: {
          tags: ['Session'], summary: 'Public sign-in config', security: [],
          responses: { 200: jsonResponse('The AuthKit client ID', { type: 'object', properties: { workosClientId: { type: 'string' } } }) },
        },
      },
      '/api/bootstrap': {
        get: {
          tags: ['Session'], summary: 'Everything the caller can see',
          description: 'Board members get their own donors and those donors\' gifts, interactions and drafts. Admins get every donor plus the last 50 imports.',
          responses: { 200: jsonResponse('Scoped records', ref('Bootstrap')), ...errors(401, 403) },
        },
      },
      '/api/donors/{id}/interactions': {
        post: {
          tags: ['Donors'], summary: 'Log a contact', description: 'Also resets the donor\'s quarterly touch clock.',
          parameters: [idParam('id', 'Donor ID')],
          requestBody: jsonBody({
            type: 'object', required: ['channel', 'summary'],
            properties: { channel: { enum: enums.channels }, summary: { type: 'string', maxLength: 2000 } },
          }),
          responses: { 201: ok, ...errors(400, 401, 403, 404) },
        },
      },
      '/api/donors/{id}/next-step': {
        put: {
          tags: ['Donors'], summary: 'Set or clear the next step', description: 'Send `{}` to clear it.',
          parameters: [idParam('id', 'Donor ID')],
          requestBody: jsonBody({ oneOf: [ref('NextStep'), { type: 'object', maxProperties: 0 }] }),
          responses: { 200: ok, ...errors(400, 401, 403, 404) },
        },
      },
      '/api/donors/{id}/owner': {
        put: {
          tags: ['Donors'], summary: 'Reassign a donor (admin only)',
          parameters: [idParam('id', 'Donor ID')],
          requestBody: jsonBody({ type: 'object', required: ['ownerId'], properties: { ownerId: { type: 'string', description: 'A board member ID' } } }),
          responses: { 200: ok, ...errors(400, 401, 403, 404) },
        },
      },
      '/api/drafts': {
        post: {
          tags: ['Drafts'], summary: 'Draft a message', description: 'The server writes the body from the donor\'s history, signed by the donor\'s owner. It starts as `pending`.',
          requestBody: jsonBody({
            type: 'object', required: ['donorId', 'kind'],
            properties: { donorId: { type: 'string' }, kind: { enum: enums.kinds }, channel: { enum: ['email', 'text'], default: 'email' } },
          }),
          responses: { 201: jsonResponse('The new draft', ref('Draft')), ...errors(400, 401, 403, 404) },
        },
      },
      '/api/drafts/{id}': {
        patch: {
          tags: ['Drafts'], summary: 'Edit a pending draft',
          parameters: [idParam('id', 'Draft ID')],
          requestBody: jsonBody({ type: 'object', required: ['body'], properties: { body: { type: 'string', maxLength: 10000 } } }),
          responses: { 200: ok, ...errors(400, 401, 403, 404, 409) },
        },
      },
      '/api/drafts/{id}/approve': {
        post: {
          tags: ['Drafts'], summary: 'Approve a pending draft', description: 'Marks it approved and logs the contact. The app then opens it in the board member\'s own email or Messages; the API never sends anything.',
          parameters: [idParam('id', 'Draft ID')],
          responses: { 200: ok, ...errors(401, 403, 404, 409) },
        },
      },
      '/api/drafts/{id}/discard': {
        post: {
          tags: ['Drafts'], summary: 'Discard a pending draft',
          parameters: [idParam('id', 'Draft ID')],
          responses: { 200: ok, ...errors(401, 403, 404, 409) },
        },
      },
      '/api/chat': {
        post: {
          tags: ['Assistant'], summary: 'Ask the assistant',
          description: 'Send the whole conversation so far, newest last. The reply is Markdown and can contain action buttons the app renders; the assistant can\'t change anything itself.',
          requestBody: jsonBody({
            type: 'object', required: ['messages'],
            properties: {
              messages: {
                type: 'array', minItems: 1, maxItems: 40,
                items: { type: 'object', required: ['role', 'content'], properties: { role: { enum: ['user', 'assistant'] }, content: { type: 'string', maxLength: 4000 } } },
              },
            },
          }),
          responses: { 200: jsonResponse('The reply', { type: 'object', properties: { reply: { type: 'string' } } }), ...errors(400, 401, 403) },
        },
      },
      '/api/import': {
        post: {
          tags: ['Admin'], summary: 'Import donor rows (admin only)',
          description: 'Rows are deduplicated, matched against existing donors, and new donors are assigned round-robin. Gifts a donor already has (same amount, near-same date) are skipped. All or nothing.',
          requestBody: jsonBody({
            type: 'object', required: ['rows'],
            properties: {
              rows: { type: 'array', maxItems: 5000, items: ref('ImportRow') },
              files: { type: 'object', description: 'File name per source, for the import history', additionalProperties: { type: 'string' }, examples: [{ zeffy: 'zeffy-2026.csv' }] },
            },
          }),
          responses: {
            200: jsonResponse('What changed', {
              type: 'object',
              properties: { created: { type: 'integer' }, merged: { type: 'integer' }, clusters: { type: 'integer' }, gifts: { type: 'integer' }, skippedGifts: { type: 'integer' } },
            }),
            ...errors(400, 401, 403),
          },
        },
      },
      '/api/widget-token': {
        post: {
          tags: ['Admin'], summary: 'Token for the WorkOS members widget (admin only)',
          responses: { 200: jsonResponse('A one-hour token', { type: 'object', properties: { token: { type: 'string' } } }), ...errors(401, 403) },
        },
      },
    },
    components: {
      securitySchemes: {
        workos: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'A WorkOS AuthKit access token for a CIC board member' },
      },
      responses: Object.fromEntries(
        [[400, 'Invalid input'], [401, 'Missing or expired token'], [403, 'Not a board member, or admin only'], [404, 'Not found, or not yours'], [409, 'The draft is no longer pending']]
          .map(([c, d]) => [`E${c}`, jsonResponse(d as string, ref('Error'))]),
      ),
      schemas: {
        Error: { type: 'object', required: ['error'], properties: { error: { type: 'string' } } },
        BoardMember: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string', format: 'email' } } },
        NextStep: {
          type: 'object', required: ['text', 'due'],
          properties: { text: { type: 'string', maxLength: 300 }, due: isoDate, eventId: { type: 'string', description: 'An event the step is tied to' } },
        },
        Donor: {
          type: 'object',
          properties: {
            id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, org: { type: 'string' },
            ownerId: { type: 'string' }, sources: { type: 'array', items: { enum: enums.sources } }, nextStep: ref('NextStep'), lastTouchAt: isoDate,
          },
        },
        Gift: {
          type: 'object',
          properties: { id: { type: 'string' }, donorId: { type: 'string' }, amount: { type: 'number' }, date: isoDate, source: { enum: enums.sources }, program: { enum: enums.programs } },
        },
        Interaction: {
          type: 'object',
          properties: { id: { type: 'string' }, donorId: { type: 'string' }, byId: { type: 'string' }, channel: { enum: enums.channels }, date: isoDate, summary: { type: 'string' } },
        },
        Draft: {
          type: 'object',
          properties: {
            id: { type: 'string' }, donorId: { type: 'string' }, kind: { enum: enums.kinds }, channel: { enum: ['email', 'text'] }, body: { type: 'string' },
            createdAt: isoDate, status: { enum: ['pending', 'approved', 'discarded'] }, approvedBy: { type: 'string' },
          },
        },
        Event: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, date: isoDate } },
        ImportRecord: {
          type: 'object',
          properties: { id: { type: 'string' }, source: { enum: enums.sources }, fileName: { type: 'string' }, rowCount: { type: 'integer' }, importedAt: { type: 'string', format: 'date-time' }, importedBy: { type: 'string' } },
        },
        ImportRow: {
          type: 'object', required: ['source', 'name'],
          properties: {
            source: { enum: enums.sources }, name: { type: 'string', maxLength: 200 }, email: { type: 'string' }, phone: { type: 'string', maxLength: 50 }, org: { type: 'string' },
            amount: { type: 'number', exclusiveMinimum: 0 }, date: isoDate, program: { enum: enums.programs },
          },
        },
        Bootstrap: {
          type: 'object',
          properties: {
            session: { type: 'object', properties: { role: { enum: ['admin', 'board'] }, memberId: { type: 'string' } } },
            today: isoDate,
            boardMembers: { type: 'array', items: ref('BoardMember') },
            events: { type: 'array', items: ref('Event') },
            donors: { type: 'array', items: ref('Donor') },
            gifts: { type: 'array', items: ref('Gift') },
            interactions: { type: 'array', items: ref('Interaction') },
            drafts: { type: 'array', items: ref('Draft') },
            imports: { type: 'array', items: ref('ImportRecord'), description: 'Admins only; empty for board members' },
          },
        },
      },
    },
  }
}

// Scalar renders the spec. Pinned so a CDN release can't change the page.
export const docsPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CIC Donor API</title>
  <link rel="icon" href="/icon.svg">
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.76.0/dist/browser/standalone.js" crossorigin="anonymous"></script>
  <script>Scalar.createApiReference('#app', { url: '/api/openapi.json' })</script>
</body>
</html>`
