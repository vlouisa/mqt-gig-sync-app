/** Lokale build; geen netwerk, credentials of Apps Script-services. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function buildEventCopyGuidelines(root = path.resolve(__dirname, '..'), check = false) {
  const source = 'knowledge/event-copy-guidelines.md';
  const destination = path.join(root, 'generated/event-copy-guidelines.js');
  const text = fs.readFileSync(path.join(root, source), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim() + '\n';
  if (!text.trim()) throw new Error('Event-copy guidelines zijn leeg.');
  const sha256 = crypto.createHash('sha256').update(text).digest('hex');
  const serialized = JSON.stringify({ source, sha256, text }).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const output = '// Gegenereerd uit ' + source + '; niet handmatig aanpassen.\n' +
    'const EVENT_COPY_GUIDELINES_RESOURCE = Object.freeze(' + serialized + ');\n';
  if (check) {
    const actual = fs.existsSync(destination) ? fs.readFileSync(destination, 'utf8').replace(/\r\n/g, '\n') : '';
    if (actual !== output) throw new Error('Event-copy resource ontbreekt of is verouderd. Voer npm run build:guidelines uit.');
  } else {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, output, 'utf8');
  }
}

if (require.main === module) buildEventCopyGuidelines(undefined, process.argv.includes('--check'));
module.exports = { buildEventCopyGuidelines };
