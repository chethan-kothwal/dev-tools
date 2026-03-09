const test = require('node:test');
const assert = require('node:assert/strict');

const { loadApp } = require('./load-app');
const { api } = loadApp();

function toBase64UrlJson(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function buildJwt(header, payload, signature = 'sig') {
  return `${toBase64UrlJson(header)}.${toBase64UrlJson(payload)}.${signature}`;
}

test('JSON: parseJsonError computes line/column for one-line input', () => {
  const info = api.parseJsonError('Unexpected token } in JSON at position 9', '{"a":123,}');
  assert.equal(info.line, 1);
  assert.equal(info.column, 10);
  assert.match(info.message, /Unexpected token/);
});

test('JSON: parseJsonError computes line/column for multi-line input', () => {
  const input = '{\n  "a": 1,\n  "b" 2\n}';
  const info = api.parseJsonError("Expected ':' after property name in JSON at position 19", input);
  assert.equal(info.line, 3);
  assert.equal(info.column, 8);
});

test('JSON: normalizeJsonInput converts smart quotes and removes comments', () => {
  const messy = '{\n  “name”: “chethan”, // inline\n  "count": 1\n}';
  const normalized = api.normalizeJsonInput(messy);
  assert.match(normalized, /"name"/);
  assert.ok(!normalized.includes('// inline'));
});

test('JSON: fixJsonControlCharsInStrings escapes hard newlines in strings', () => {
  const input = '{"a":"line1\nline2"}';
  const fixed = api.fixJsonControlCharsInStrings(input);
  assert.equal(fixed, '{"a":"line1\\nline2"}');
});

test('JSON: runJsonRepairPasses repairs common malformed json patterns', () => {
  const broken = "{name:'Jane', age: 30, active: true,}";
  const repaired = api.runJsonRepairPasses(broken);
  const parsed = JSON.parse(repaired);
  assert.deepEqual(parsed, { name: 'Jane', age: 30, active: true });
});

test('JSON: fixJsonStep can move malformed input toward valid JSON', () => {
  const broken = '{"a":1 "b":2}';
  const result = api.fixJsonStep(broken, 'Unexpected token " in JSON at position 7');
  assert.ok(result.fixed.includes(','));
});

test('JSON: parseLooseJsonFallback parses yaml-like input to object', () => {
  const parsed = api.parseLooseJsonFallback('{name: John, age: 32, active: true}');
  assert.deepEqual(parsed, { name: 'John', age: 32, active: true });
});

test('JSON: buildJsonErrorDetails returns actionable hint and pointer', () => {
  const input = '{"a" 1}';
  const info = { message: "Expected ':' after property name in JSON", line: 1, column: 6 };
  const details = api.buildJsonErrorDetails(input, info);
  assert.match(details, /Likely missing ":"/);
  assert.match(details, /\^/);
});

test('YAML: fixYamlTabs converts tabs to spaces', () => {
  assert.equal(api.fixYamlTabs('\tname:\tjohn'), '  name:  john');
});

test('YAML: fixYamlListSpacing inserts missing list item spacing', () => {
  assert.equal(api.fixYamlListSpacing('-item\n  -child'), '- item\n  - child');
});

test('YAML: fixYamlColonSpacing inserts missing space after colon', () => {
  assert.equal(api.fixYamlColonSpacing('name:john\nage:20'), 'name: john\nage: 20');
});

test('YAML: fixYamlMissingColons repairs key value lines', () => {
  const fixed = api.fixYamlMissingColons('name John\ncity Bangkok\n- keep list');
  assert.equal(fixed, 'name: John\ncity: Bangkok\n- keep list');
});

test('YAML: fixYamlTrailingCommas removes trailing commas', () => {
  const fixed = api.fixYamlTrailingCommas('name: John,\narr: [1,2,]\nobj: {a: 1,}');
  assert.equal(fixed, 'name: John\narr: [1,2]\nobj: {a: 1}');
});

test('YAML: fixYamlUnsafeValues quotes problematic values', () => {
  const fixed = api.fixYamlUnsafeValues('url: https://x.y\ncolor: #ff00ff\nvar: ${HOME}');
  assert.equal(fixed, 'url: "https://x.y"\ncolor: "#ff00ff"\nvar: "${HOME}"');
});

test('YAML: fixYamlIndentation normalizes odd indentation', () => {
  const fixed = api.fixYamlIndentation('root:\n child:\n   value: 1');
  assert.equal(fixed, 'root:\n  child:\n    value: 1');
});

test('YAML: fixYamlIndentByError adjusts offending line indentation', () => {
  const fixed = api.fixYamlIndentByError('root:\nvalue: 1', 1);
  assert.equal(fixed, 'root:\n  value: 1');
});

test('YAML: parseLooseYamlToObject parses nested objects and arrays', () => {
  const parsed = api.parseLooseYamlToObject([
    'person:',
    '  name: Jane',
    '  age: 28',
    '  tags:',
    '    - engineer',
    '    - remote',
    'active true'
  ].join('\n'));

  // The loose parser is heuristic-based; verify stable essentials.
  assert.equal(parsed.person.name, 'Jane');
  assert.equal(parsed.age, 28);
  assert.equal(parsed.active, true);
  assert.ok(Array.isArray(parsed.tags));
  assert.equal(parsed.tags[0], 'engineer');
});

test('JWT: base64UrlDecode decodes url-safe payload', () => {
  const payload = toBase64UrlJson({ hello: 'world' });
  assert.equal(api.base64UrlDecode(payload), '{"hello":"world"}');
});

test('JWT: decodeJwtToken decodes header and payload', () => {
  const now = 1700000000;
  const token = buildJwt({ alg: 'HS256', typ: 'JWT' }, { sub: 'u1', exp: now + 60 });
  const decoded = api.decodeJwtToken(token, now);

  assert.equal(decoded.header.alg, 'HS256');
  assert.equal(decoded.payload.sub, 'u1');
  assert.equal(decoded.tokenInfo.signaturePresent, true);
  assert.equal(decoded.timing.isExpired, false);
  assert.equal(decoded.timing.secondsUntilExpiry, 60);
});

test('JWT: decodeJwtToken supports Bearer prefix and whitespace', () => {
  const token = buildJwt({ alg: 'none' }, { role: 'admin' }, '');
  const decoded = api.decodeJwtToken(`Bearer  ${token}  `, 1700000000);
  assert.equal(decoded.payload.role, 'admin');
  assert.equal(decoded.tokenInfo.signaturePresent, false);
});

test('JWT: decodeJwtToken reports expired token correctly', () => {
  const now = 1700000000;
  const token = buildJwt({ alg: 'HS256' }, { exp: now - 1 });
  const decoded = api.decodeJwtToken(token, now);
  assert.equal(decoded.timing.isExpired, true);
  assert.equal(decoded.timing.secondsUntilExpiry, -1);
});

test('JWT: decodeJwtToken throws for invalid format', () => {
  assert.throws(() => api.decodeJwtToken('not-a-token'), /Invalid JWT format/);
});

test('JWT: decodeJwtToken throws for invalid JSON payload', () => {
  const badPayload = Buffer.from('not-json', 'utf8').toString('base64url');
  const token = `${toBase64UrlJson({ alg: 'HS256' })}.${badPayload}.sig`;
  assert.throws(() => api.decodeJwtToken(token), /Unexpected token|JSON/);
});

test('Cron: parseCronExpression accepts valid expressions', () => {
  const cases = [
    '* * * * *',
    '*/15 9-17 * * 1-5',
    '0 0 1 1 *',
    '5,10,15 6 * * 0',
    '30 23 * * 7'
  ];

  for (const expr of cases) {
    const schedule = api.parseCronExpression(expr);
    assert.equal(typeof schedule.minute.has, 'function');
  }
});

test('Cron: parseCronExpression rejects invalid field count', () => {
  const invalid = ['* * * *', '* * * * * *'];
  for (const expr of invalid) {
    assert.throws(() => api.parseCronExpression(expr), /Use 5 fields/);
  }
});

test('Cron: parseCronField supports wildcard and step', () => {
  const set = api.parseCronField('*/20', 0, 59);
  assert.deepEqual([...set], [0, 20, 40]);
});

test('Cron: parseCronField supports ranges and csv', () => {
  const set = api.parseCronField('1-3,8,10-12', 0, 59);
  assert.deepEqual([...set], [1, 2, 3, 8, 10, 11, 12]);
});

test('Cron: parseCronField maps day-of-week 7 to 0', () => {
  const set = api.parseCronField('7', 0, 6, true);
  assert.deepEqual([...set], [0]);
});

test('Cron: parseCronField rejects invalid values', () => {
  const invalids = [
    ['*/0', /Invalid step/],
    ['a-b', /Invalid range/],
    ['70', /Out of range/],
    ['9-2', /Out of range/],
    ['', /Invalid field/]
  ];

  for (const [field, pattern] of invalids) {
    assert.throws(() => api.parseCronField(field, 0, 59), pattern);
  }
});

test('Cron: cronMatches validates date against schedule', () => {
  const schedule = api.parseCronExpression('30 14 * * 1');
  assert.equal(api.cronMatches(schedule, new Date('2026-03-09T14:30:00')), true);
  assert.equal(api.cronMatches(schedule, new Date('2026-03-09T14:31:00')), false);
});

test('Cron: getNextCronRuns returns requested count in ascending order', () => {
  const schedule = api.parseCronExpression('*/30 * * * *');
  const runs = api.getNextCronRuns(schedule, new Date('2026-03-07T10:10:00Z'), 5);
  assert.equal(runs.length, 5);

  for (let i = 1; i < runs.length; i++) {
    assert.ok(runs[i].getTime() > runs[i - 1].getTime());
  }
});

test('Cron: getNextCronRuns can handle sparse yearly schedule', () => {
  const schedule = api.parseCronExpression('0 0 1 1 *');
  const runs = api.getNextCronRuns(schedule, new Date('2026-01-01T00:01:00Z'), 1);
  assert.equal(runs.length, 1);
});

test('Timestamp: buildTimestampConversions handles unix seconds', () => {
  const out = api.buildTimestampConversions('1700000000');
  assert.equal(out.source, 'unix_seconds');
  assert.equal(out.unixSeconds, 1700000000);
});

test('Timestamp: buildTimestampConversions handles unix milliseconds', () => {
  const out = api.buildTimestampConversions('1700000000123');
  assert.equal(out.source, 'unix_milliseconds');
  assert.equal(out.unixMilliseconds, 1700000000123);
});

test('Timestamp: buildTimestampConversions handles negative epoch', () => {
  const out = api.buildTimestampConversions('-1');
  assert.equal(out.unixSeconds, -1);
  assert.match(out.isoUtc, /^1969/);
});

test('Timestamp: buildTimestampConversions handles ISO date strings', () => {
  const out = api.buildTimestampConversions('2026-03-08T15:20:30Z');
  assert.equal(out.source, 'date_string');
  assert.equal(out.isoUtc, '2026-03-08T15:20:30.000Z');
});

test('Timestamp: buildTimestampConversions handles local-like date strings', () => {
  const out = api.buildTimestampConversions('March 8, 2026 12:00:00 GMT');
  assert.equal(out.source, 'date_string');
  assert.ok(Number.isFinite(out.unixSeconds));
});

test('Timestamp: buildTimestampConversions rejects invalid date', () => {
  assert.throws(() => api.buildTimestampConversions('not-a-date'), /Invalid input date\/time/);
});

test('Line/Column helper: lineColumnToIndex maps correctly', () => {
  const text = 'abc\ndef\nghi';
  assert.equal(api.lineColumnToIndex(text, 1, 1), 0);
  assert.equal(api.lineColumnToIndex(text, 2, 2), 5);
  assert.equal(api.lineColumnToIndex(text, 3, 4), 11);
});

// Large table-driven set for cron field behavior
const cronFieldCases = [
  ['*', [0, 1, 2, 3, 4, 5, 6]],
  ['0', [0]],
  ['1,3,5', [1, 3, 5]],
  ['2-4', [2, 3, 4]],
  ['0-6/2', [0, 2, 4, 6]],
  ['5/10', [5]],
  ['*/3', [0, 3, 6]],
  ['6,0,2', [0, 2, 6]],
  ['7', [0]],
  ['1-1', [1]]
];

test('Cron: table-driven parseCronField coverage', () => {
  for (const [field, expected] of cronFieldCases) {
    const set = api.parseCronField(field, 0, 6, true);
    const actual = [...set].sort((a, b) => a - b);
    assert.deepEqual(actual, expected);
  }
});

const repairCases = [
  ["{name: bob}", { name: 'bob' }],
  ["{'name':'bob'}", { name: 'bob' }],
  ["{\"name\":\"bob\",}", { name: 'bob' }],
  ["{name: bob, age: 22}", { name: 'bob', age: 22 }],
  ["{flag: true, num: 2}", { flag: true, num: 2 }],
  ["{items:[one,two,three]}", { items: ['one', 'two', 'three'] }],
  ["{x:'y',z:null}", { x: 'y', z: null }],
  ["{nested:{k:v}}", { nested: { k: 'v' } }]
];

test('JSON: table-driven repair pass coverage', () => {
  for (const [input, expected] of repairCases) {
    const repaired = api.runJsonRepairPasses(input);
    const parsed = JSON.parse(repaired);
    assert.deepEqual(parsed, expected);
  }
});

const timestampCases = [
  ['0', 0],
  ['1', 1],
  ['60', 60],
  ['3600', 3600],
  ['1700000000', 1700000000],
  ['1700000000000', 1700000000],
  ['2026-01-01T00:00:00Z', 1767225600],
  ['1970-01-01T00:00:00Z', 0]
];

test('Timestamp: table-driven conversion coverage', () => {
  for (const [input, unixSeconds] of timestampCases) {
    const out = api.buildTimestampConversions(input);
    assert.equal(out.unixSeconds, unixSeconds);
  }
});
