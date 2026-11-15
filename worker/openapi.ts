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
        'The JSON API behind the donor relationships app. Every route except `/api/config` and the read API needs a WorkOS AuthKit access token for a CIC board member, sent as `Authorization: Bearer <token>`.',
        '',
        'The **read API** (`/api/v1/*`) is for CIC\'s own dashboard and other integrations. It takes an API key instead (`Authorization: Bearer cic_live_…`), which an admin creates on the app\'s API page, and returns aggregates only: no donor names, emails or IDs.',
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
      { name: 'Admin', description: 'Import, board member and API key management' },
      { name: 'Read API', description: 'Aggregates for CIC\'s dashboard, authenticated with an API key' },
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
      '/api/donors/{id}/invite': {
        post: {
          tags: ['Donors'], summary: 'Invite a donor to an event',
          description: 'Sets the next step to "Invite to <event>", due a week before the event (or today if that has passed), and creates a pending event-invite draft. Returns both.',
          parameters: [idParam('id', 'Donor ID')],
          requestBody: jsonBody({ type: 'object', required: ['eventId'], properties: { eventId: { type: 'string', description: 'An upcoming event ID from /api/bootstrap' } } }),
          responses: { 201: { description: 'The new next step and draft', content: { 'application/json': { schema: { type: 'object', properties: { nextStep: ref('NextStep'), draft: ref('Draft') } } } } }, ...errors(400, 401, 403, 404) },
        },
      },
      '/api/donors/{id}/notes': {
        put: {
          tags: ['Donors'], summary: "Replace a donor's notes", description: 'Send `""` to clear them. The AI reads them when it writes a draft.',
          parameters: [idParam('id', 'Donor ID')],
          requestBody: jsonBody({ type: 'object', required: ['notes'], properties: { notes: { type: 'string', maxLength: 10000 } } }),
          responses: { 200: ok, ...errors(400, 401, 403, 404) },
        },
      },
      '/api/donors/{id}/contact': {
        put: {
          tags: ['Donors'], summary: "Set a donor's email and phone", description: 'Only the fields sent change; `""` clears one. Phones keep their formatting but need 7 to 15 digits.',
          parameters: [idParam('id', 'Donor ID')],
          requestBody: jsonBody({ type: 'object', properties: { email: { type: 'string', format: 'email', maxLength: 200 }, phone: { type: 'string', maxLength: 200 } } }),
          responses: { 200: ok, ...errors(400, 401, 403, 404) },
        },
      },
      '/api/donors/{id}/owner': {
        put: {
          tags: ['Donors'], summary: 'Reassign a donor (admin only)',
          parameters: [idParam('id', 'Donor ID')],
          requestBody: jsonBody({ type: 'object', required: ['ownerId'], properties: { ownerId: { type: ['string', 'null'], description: 'A board member ID, or null to unassign' } } }),
          responses: { 200: ok, ...errors(400, 401, 403, 404) },
        },
      },
      '/api/assign': {
        post: {
          tags: ['Donors'], summary: 'Assign several donors at once (admin only)', description: 'One transaction: all or nothing.',
          requestBody: jsonBody({
            type: 'object', required: ['assignments'],
            properties: { assignments: { type: 'array', minItems: 1, maxItems: 1000, items: { type: 'object', required: ['donorId', 'ownerId'], properties: { donorId: { type: 'string' }, ownerId: { type: ['string', 'null'], description: 'A board member ID, or null to unassign' } } } } },
          }),
          responses: { 200: ok, ...errors(400, 401, 403, 404) },
        },
      },
      '/api/drafts': {
        post: {
          tags: ['Drafts'], summary: 'Draft a message', description: 'The server writes the body from the donor\'s history and the programs they funded, signed by the donor\'s owner. Thank-yous, quarterly updates and lapsed nudges are written by the AI gateway (`ai: true`), falling back to a template if it fails or is slow. It starts as `pending`.',
          requestBody: jsonBody({
            type: 'object', required: ['donorId', 'kind'],
            properties: { donorId: { type: 'string' }, kind: { enum: enums.kinds.filter((k) => k !== 'event-invite'), description: 'Invitations come from POST /api/donors/{id}/invite' }, channel: { enum: ['email', 'text'], default: 'email', description: 'Used if the donor has that contact detail, otherwise whichever of email or text they have. A donor with neither gets a 400.' }, body: { type: 'string', maxLength: 4000, description: 'Use this body instead of writing one, e.g. a follow-up the assistant wrote from a debrief. Still starts as `pending`.' }, template: { type: 'boolean', default: false, description: 'The body is a template someone picked, so the draft is not marked as written by AI' } },
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
          description: 'Rows are deduplicated, matched against existing donors, and new donors are saved unassigned (the response lists them) for an admin to assign on All Donors, where Suggest assignment proposes board members. Gifts a donor already has (same amount, near-same date) are skipped. All or nothing.',
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
      '/api/v1/summary': {
        get: {
          tags: ['Read API'], summary: 'Totals and recent activity for a period', security: [{ apiKey: [] }],
          description: 'Gifts summed by quarter, program and board member (the donor\'s owner), plus the 25 latest gifts and contacts. `program` filters gifts only; `board_member` filters gifts by donor owner and contacts by who made them.',
          parameters: [
            { name: 'period', in: 'query', description: 'A year or a quarter; defaults to this year', schema: { type: 'string', pattern: '^\\d{4}(-Q[1-4])?$', examples: ['2026', '2026-Q4'] } },
            { name: 'program', in: 'query', schema: { enum: enums.programs } },
            { name: 'board_member', in: 'query', description: 'A board member ID', schema: { type: 'string' } },
          ],
          responses: { 200: jsonResponse('Aggregates for the period', ref('Summary')), ...errors(400, 401) },
        },
      },
      '/api/keys': {
        get: {
          tags: ['Admin'], summary: 'List API keys (admin only)', description: 'Active keys first. Only the prefix of each key is kept.',
          responses: { 200: jsonResponse('Keys, newest first', { type: 'array', items: ref('ApiKey') }), ...errors(401, 403) },
        },
        post: {
          tags: ['Admin'], summary: 'Create an API key (admin only)', description: 'The response is the only time the full key is shown.',
          requestBody: jsonBody({ type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 100, examples: ['CIC org dashboard'] } } }),
          responses: { 201: jsonResponse('The new key', { allOf: [ref('ApiKey'), { type: 'object', properties: { key: { type: 'string', examples: ['cic_live_0123456789abcdef0123456789abcdef'] } } }] }), ...errors(400, 401, 403) },
        },
      },
      '/api/keys/{id}': {
        delete: {
          tags: ['Admin'], summary: 'Revoke an API key (admin only)', description: 'It stops working immediately.',
          parameters: [idParam('id', 'Key ID')],
          responses: { 200: ok, ...errors(401, 403, 404) },
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
        apiKey: { type: 'http', scheme: 'bearer', description: 'A read API key (cic_live_…) from the app\'s API page' },
      },
      responses: Object.fromEntries(
        [[400, 'Invalid input'], [401, 'Missing, expired or revoked token or key'], [403, 'Not a board member, or admin only'], [404, 'Not found, or not yours'], [409, 'The draft is no longer pending']]
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
            ownerId: { type: ['string', 'null'], description: 'null until an admin assigns a board member' },
            extra: { type: 'object', additionalProperties: { type: 'string' }, description: 'Custom fields created while importing' }, notes: { type: 'string', description: 'Free text from the donor profile or an imported Notes column' }, sources: { type: 'array', items: { enum: enums.sources } }, nextStep: ref('NextStep'), lastTouchAt: isoDate,
          },
        },
        Gift: {
          type: 'object',
          properties: { id: { type: 'string' }, donorId: { type: 'string' }, amount: { type: 'number' }, date: { ...isoDate, type: ['string', 'null'], description: 'null when the import had no usable date' }, source: { enum: enums.sources }, program: { enum: enums.programs } },
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
            ai: { type: 'boolean', description: 'Written by the AI gateway (or the assistant) rather than a template' },
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
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string' }, name: { type: 'string' }, prefix: { type: 'string', examples: ['cic_live_0123'] }, createdAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string' }, lastUsedAt: { type: 'string', format: 'date-time' }, revokedAt: { type: 'string', format: 'date-time' },
          },
        },
        Summary: {
          type: 'object',
          properties: {
            period: { type: 'string', examples: ['2026-Q4'] }, from: isoDate, to: { ...isoDate, description: 'Exclusive' },
            filters: { type: 'object', properties: { program: { type: ['string', 'null'] }, board_member: { type: ['string', 'null'] } } },
            totals: {
              type: 'object',
              properties: {
                raised: { type: 'number' }, gifts: { type: 'integer' }, donors: { type: 'integer', description: 'Distinct donors who gave' },
                by_quarter: { type: 'object', additionalProperties: { type: 'number' }, examples: [{ Q3: 1200, Q4: 5400 }] },
                by_program: { type: 'object', additionalProperties: { type: 'number' }, examples: [{ 'AI Academy': 5000, General: 1600 }] },
                by_board_member: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, raised: { type: 'number' } } } },
              },
            },
            recent_activity: {
              type: 'array', maxItems: 25,
              items: {
                type: 'object',
                properties: {
                  date: isoDate, type: { enum: ['gift', 'contact'] }, board_member: { type: 'string' },
                  amount: { type: 'number', description: 'Gifts only' }, program: { enum: enums.programs, description: 'Gifts only' }, channel: { enum: enums.channels, description: 'Contacts only' },
                },
              },
            },
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
  <link rel="icon" href="/icon-192.png" type="image/png">
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.76.0/dist/browser/standalone.js" crossorigin="anonymous"></script>
  <script>Scalar.createApiReference('#app', { url: '/api/openapi.json' })</script>
</body>
</html>`
