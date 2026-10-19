#!/usr/bin/env node
// Validates questions.json. Run: node scripts/validate.mjs
// Exits non-zero if any problem is found. No dependencies.
import { readFileSync } from 'node:fs';

const file = new URL('../questions.json', import.meta.url);
let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`questions.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

const errors = [];
const warn = [];
const SHORT = new Set(['Yes', 'No', 'Depends']);
const CONF = new Set(['high', 'medium', 'low']);
const CATS = new Set(['health', 'food', 'first-aid', 'safety', 'technology', 'environment']);
const REQUIRED = ['id', 'slug', 'question', 'shortAnswer', 'answer', 'description', 'reasoning',
  'scientificBasis', 'confidence', 'category', 'tags', 'sources', 'relatedQuestions'];

if (!Array.isArray(data.questions)) errors.push('Top-level "questions" must be an array');
const qs = data.questions || [];
const slugs = new Map();

qs.forEach((q, i) => {
  const where = q.slug || `index ${i}`;
  for (const f of REQUIRED) if (q[f] === undefined || q[f] === '') errors.push(`${where}: missing "${f}"`);
  if (q.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(q.slug)) errors.push(`${where}: slug must be lowercase-kebab-case`);
  if (q.slug === 'browse') errors.push(`${where}: "browse" is a reserved slug`);
  if (q.id !== q.slug) errors.push(`${where}: id and slug should match`);
  if (slugs.has(q.slug)) errors.push(`${where}: duplicate slug`);
  slugs.set(q.slug, q);
  if (!SHORT.has(q.shortAnswer)) errors.push(`${where}: shortAnswer must be Yes, No or Depends`);
  if (!CONF.has(q.confidence)) errors.push(`${where}: confidence must be high, medium or low`);
  if (!CATS.has(q.category)) warn.push(`${where}: category "${q.category}" has no display label in index.html`);
  if (!Array.isArray(q.sources) || q.sources.length === 0) errors.push(`${where}: needs at least one source`);
  (q.sources || []).forEach((s, j) => {
    for (const f of ['title', 'url', 'type', 'organization']) if (!s[f]) errors.push(`${where}: source ${j} missing "${f}"`);
    if (s.url && !/^https:\/\//.test(s.url)) errors.push(`${where}: source ${j} URL must use https`);
  });
  if (q.lastReviewed && !/^\d{4}-\d{2}-\d{2}$/.test(q.lastReviewed)) errors.push(`${where}: lastReviewed must be YYYY-MM-DD`);
});

qs.forEach(q => {
  (q.relatedQuestions || []).forEach(r => {
    if (r === q.slug) errors.push(`${q.slug}: relates to itself`);
    else if (!slugs.has(r)) errors.push(`${q.slug}: related question "${r}" does not exist`);
  });
});

warn.forEach(w => console.warn(`warning: ${w}`));
if (errors.length) {
  errors.forEach(e => console.error(`error: ${e}`));
  console.error(`\n${errors.length} error(s) in ${qs.length} questions`);
  process.exit(1);
}
console.log(`OK: ${qs.length} questions, ${qs.reduce((n, q) => n + q.sources.length, 0)} sources, all related links resolve.`);
