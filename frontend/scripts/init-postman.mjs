import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';

const frontendDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repoRoot = path.resolve(frontendDir, '..');
const postmanDir = path.join(frontendDir, 'postman');
const fixturesDir = path.join(postmanDir, 'fixtures');

const rootEnv = dotenv.config({ path: path.join(repoRoot, '.env.local') }).parsed ?? {};
const frontendEnv = dotenv.config({ path: path.join(frontendDir, '.env.local') }).parsed ?? {};
const mergedEnv = { ...frontendEnv, ...rootEnv };

const baseUrl = (
  process.env.SNAPLET_POSTMAN_BASE_URL ||
  mergedEnv.NEXT_PUBLIC_SITE_URL ||
  mergedEnv.APP_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');
const uploadFixturePath = path.join(fixturesDir, 'upload-sample.txt');

const environment = {
  id: 'snaplet-local-environment',
  name: 'Snaplet Local',
  values: [
    { key: 'baseUrl', value: baseUrl, type: 'default', enabled: true },
    { key: 'authToken', value: process.env.SNAPLET_POSTMAN_AUTH_TOKEN || '', type: 'secret', enabled: true },
    { key: 'supabaseUrl', value: mergedEnv.NEXT_PUBLIC_SUPABASE_URL || '', type: 'default', enabled: true },
    { key: 'supabaseAnonKey', value: mergedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', type: 'secret', enabled: true },
    { key: 'ollamaBaseUrl', value: mergedEnv.OLLAMA_BASE_URL || '', type: 'default', enabled: true },
    { key: 'ollamaModel', value: mergedEnv.OLLAMA_MODEL || '', type: 'default', enabled: true },
    { key: 'ocrSpaceApiKey', value: mergedEnv.OCR_SPACE_API_KEY || '', type: 'secret', enabled: true },
    { key: 'sampleSourceTitle', value: 'Postman Text Source', type: 'default', enabled: true },
    {
      key: 'sampleSourceContent',
      value: 'Mitochondria: powerhouse of the cell\\nPhotosynthesis: process plants use to make glucose',
      type: 'default',
      enabled: true,
    },
    { key: 'sampleCsvTitle', value: 'Postman CSV Import', type: 'default', enabled: true },
    {
      key: 'sampleCsvText',
      value: 'prompt,answer\\nCapital of France?,Paris\\nLargest planet?,Jupiter',
      type: 'default',
      enabled: true,
    },
    { key: 'uploadFixturePath', value: uploadFixturePath, type: 'default', enabled: true },
    { key: 'sourceId', value: 'demo-source-id', type: 'default', enabled: true },
    { key: 'sourceQuestionId', value: 'demo-source-question-id', type: 'default', enabled: true },
    { key: 'manualQuestionId', value: 'demo-manual-question-id', type: 'default', enabled: true },
    { key: 'duplicateSourceId', value: 'demo-duplicate-source-id', type: 'default', enabled: true },
    { key: 'importedSourceId', value: 'demo-imported-source-id', type: 'default', enabled: true },
    { key: 'importedQuestionId', value: 'demo-imported-question-id', type: 'default', enabled: true },
    { key: 'importedAnswer', value: 'demo-imported-answer', type: 'default', enabled: true },
    { key: 'uploadedSourceId', value: 'demo-uploaded-source-id', type: 'default', enabled: true },
    { key: 'sessionId', value: 'demo-session-id', type: 'default', enabled: true },
    { key: 'currentQuestionId', value: 'demo-current-question-id', type: 'default', enabled: true },
  ],
};

function rawJson(body) {
  return JSON.stringify(body, null, 2);
}

function jsonItem(name, method, rawUrl, body, testScript, options = {}) {
  return {
    name,
    event: testScript
      ? [
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: testScript.trim().split('\n'),
            },
          },
        ]
      : [],
    request: {
      method,
      header: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer {{authToken}}' },
      ],
      url: {
        raw: `{{baseUrl}}${rawUrl}`,
        host: ['{{baseUrl}}'],
        path: rawUrl.replace(/^\//, '').split('/'),
      },
      body: body
        ? {
            mode: 'raw',
            raw: typeof body === 'string' ? body : rawJson(body),
            options: { raw: { language: 'json' } },
          }
        : undefined,
      description: options.description,
    },
  };
}

const jsonPayload = [
  "const responseType = pm.response.headers.get('content-type') || '';",
  "const payload = responseType.includes('application/json') ? pm.response.json() : null;",
].join('\n');

const collection = {
  info: {
    name: 'Snaplet API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: 'Basic Newman/Postman coverage for the frontend/api runtime in Snaplet.',
  },
  item: [
    {
      name: 'Sources',
      item: [
        jsonItem(
          'List Sources',
          'GET',
          '/api/sources',
          null,
          `
pm.test('list sources responds', function () {
  pm.response.to.have.status(200);
});
`,
        ),
        jsonItem(
          'Create Text Source',
          'POST',
          '/api/sources',
          {
            title: '{{sampleSourceTitle}}',
            content: '{{sampleSourceContent}}',
          },
          `
pm.test('create source responds', function () {
  pm.response.to.have.status(201);
});
${jsonPayload}
if (payload?.source?.id) {
  pm.environment.set('sourceId', payload.source.id);
}
`,
        ),
        jsonItem(
          'Get Source By Id',
          'GET',
          '/api/sources/{{sourceId}}',
          null,
          `
pm.test('get source responds', function () {
  pm.response.to.have.status(200);
});
`,
        ),
        jsonItem(
          'List Source Questions',
          'GET',
          '/api/sources/{{sourceId}}/questions',
          null,
          `
pm.test('list source questions responds', function () {
  pm.response.to.have.status(200);
});
${jsonPayload}
if (payload?.questions && payload.questions.length > 0) {
  pm.environment.set('sourceQuestionId', payload.questions[0].id);
}
`,
        ),
        jsonItem(
          'Create Source Question',
          'POST',
          '/api/sources/{{sourceId}}/questions',
          {
            prompt: 'Postman manual prompt',
            answer: 'Postman manual answer',
          },
          `
pm.test('create source question responds', function () {
  pm.response.to.have.status(201);
});
${jsonPayload}
if (payload?.question?.id) {
  pm.environment.set('manualQuestionId', payload.question.id);
}
`,
        ),
        jsonItem(
          'Duplicate Source',
          'POST',
          '/api/sources/{{sourceId}}/duplicate',
          null,
          `
pm.test('duplicate source responds', function () {
  pm.response.to.have.status(201);
});
${jsonPayload}
if (payload?.source?.id) {
  pm.environment.set('duplicateSourceId', payload.source.id);
}
`,
        ),
        jsonItem(
          'Generate Source Questions',
          'POST',
          '/api/sources/{{sourceId}}/generate',
          null,
          `
pm.test('generate source questions responds', function () {
  pm.response.to.have.status(200);
});
`,
        ),
      ],
    },
    {
      name: 'Questions',
      item: [
        jsonItem(
          'Patch Question',
          'PATCH',
          '/api/questions/{{manualQuestionId}}',
          {
            prompt: 'Updated manual prompt',
            answer: 'Updated manual answer',
          },
          `
pm.test('patch question responds', function () {
  pm.response.to.have.status(200);
});
`,
        ),
        jsonItem(
          'Bulk Delete Questions',
          'POST',
          '/api/questions/bulk',
          {
            questionIds: ['{{manualQuestionId}}'],
          },
          `
pm.test('bulk delete questions responds', function () {
  pm.response.to.have.status(200);
});
`,
        ),
      ],
    },
    {
      name: 'Import',
      item: [
        jsonItem(
          'Preview CSV Import',
          'POST',
          '/api/import/csv',
          {
            mode: 'preview',
            title: '{{sampleCsvTitle}}',
            csvText: '{{sampleCsvText}}',
          },
          `
pm.test('preview csv responds', function () {
  pm.response.to.have.status(200);
});
`,
        ),
        jsonItem(
          'Import CSV',
          'POST',
          '/api/import/csv',
          {
            mode: 'import',
            title: '{{sampleCsvTitle}}',
            csvText: '{{sampleCsvText}}',
          },
          `
pm.test('import csv responds', function () {
  pm.response.to.have.status(201);
});
${jsonPayload}
if (payload?.source?.id) {
  pm.environment.set('importedSourceId', payload.source.id);
}
`,
        ),
        {
          name: 'Upload Source File',
          event: [
            {
              listen: 'test',
              script: {
                type: 'text/javascript',
                exec: [
                  "pm.test('upload source responds', function () {",
                  '  pm.response.to.have.status(201);',
                  '});',
                  ...jsonPayload.split('\n'),
                  "if (payload?.source?.id) {",
                  "  pm.environment.set('uploadedSourceId', payload.source.id);",
                  "}",
                ],
              },
            },
          ],
          request: {
            method: 'POST',
            header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
            url: {
              raw: '{{baseUrl}}/api/import/upload',
              host: ['{{baseUrl}}'],
              path: ['api', 'import', 'upload'],
            },
            body: {
              mode: 'formdata',
              formdata: [
                {
                  key: 'file',
                  type: 'file',
                  src: '{{uploadFixturePath}}',
                },
              ],
            },
          },
        },
      ],
    },
    {
      name: 'Study',
      item: [
        jsonItem(
          'List Imported Source Questions',
          'GET',
          '/api/sources/{{importedSourceId}}/questions',
          null,
          `
pm.test('list imported questions responds', function () {
  pm.response.to.have.status(200);
});
${jsonPayload}
if (payload?.questions && payload.questions.length > 0) {
  pm.environment.set('importedQuestionId', payload.questions[0].id);
  pm.environment.set('importedAnswer', payload.questions[0].answer);
}
`,
        ),
        jsonItem(
          'Start Session',
          'POST',
          '/api/sessions',
          {
            sourceId: '{{importedSourceId}}',
            mode: 'standard',
          },
          `
pm.test('start session responds', function () {
  pm.response.to.have.status(201);
});
${jsonPayload}
if (payload?.session?.id) {
  pm.environment.set('sessionId', payload.session.id);
}
if (payload?.currentQuestion) {
  pm.environment.set('currentQuestionId', payload.currentQuestion.questionId);
}
`,
        ),
        jsonItem(
          'Submit Attempt',
          'POST',
          '/api/sessions/{{sessionId}}/attempts',
          {
            questionId: '{{currentQuestionId}}',
            answer: '{{importedAnswer}}',
          },
          `
pm.test('submit attempt responds', function () {
  pm.response.to.have.status(200);
});
`,
        ),
        jsonItem(
          'Get Progress',
          'GET',
          '/api/progress',
          null,
          `
pm.test('get progress responds', function () {
  pm.response.to.have.status(200);
});
`,
        ),
      ],
    },
    {
      name: 'Cleanup',
      item: [
        jsonItem(
          'Delete Duplicate Source',
          'DELETE',
          '/api/sources/{{duplicateSourceId}}',
          null,
          `
pm.test('delete duplicate source responds', function () {
  pm.response.to.have.status(200);
});
`,
        ),
        jsonItem(
          'Delete Uploaded Source',
          'DELETE',
          '/api/sources/{{uploadedSourceId}}',
          null,
          `
pm.test('delete uploaded source responds', function () {
  pm.response.to.have.status(200);
});
`,
        ),
        jsonItem(
          'Delete Imported Source',
          'DELETE',
          '/api/sources/{{importedSourceId}}',
          null,
          `
pm.test('delete imported source responds', function () {
  pm.response.to.have.status(200);
});
`,
        ),
        jsonItem(
          'Delete Text Source',
          'DELETE',
          '/api/sources/{{sourceId}}',
          null,
          `
pm.test('delete text source responds', function () {
  pm.response.to.have.status(200);
});
`,
        ),
      ],
    },
  ],
};

await fs.mkdir(postmanDir, { recursive: true });
await fs.mkdir(fixturesDir, { recursive: true });
await fs.writeFile(path.join(fixturesDir, 'upload-sample.txt'), 'Snaplet upload fixture\nBinary-star system: two stars orbiting a common center of mass\n');
await fs.writeFile(path.join(postmanDir, 'Snaplet.postman_collection.json'), JSON.stringify(collection, null, 2));
await fs.writeFile(path.join(postmanDir, 'Snaplet.local.postman_environment.json'), JSON.stringify(environment, null, 2));

console.log(`Wrote ${path.relative(repoRoot, path.join(postmanDir, 'Snaplet.postman_collection.json'))}`);
console.log(`Wrote ${path.relative(repoRoot, path.join(postmanDir, 'Snaplet.local.postman_environment.json'))}`);
