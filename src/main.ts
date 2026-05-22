import './style.css';
import { createAppModel } from './app/app';

const appRoot = document.querySelector<HTMLElement>('#app');

if (appRoot === null) {
  throw new Error('Expected #app root element to exist.');
}

const model = createAppModel();

const shell = document.createElement('section');
shell.className = 'shell';
shell.setAttribute('aria-labelledby', 'project-title');

const eyebrow = document.createElement('p');
eyebrow.className = 'eyebrow';
eyebrow.textContent = 'say it without the dot';

const title = document.createElement('h1');
title.id = 'project-title';
title.textContent = model.projectName;

const tagline = document.createElement('p');
tagline.className = 'tagline';
tagline.textContent =
  'A playable haggis game hub, now backed by an executable Rust/WASM + TypeScript foundation.';

const facts = document.createElement('dl');
facts.className = 'facts';
facts.setAttribute('aria-label', 'Current project foundation state');

const factEntries: ReadonlyArray<readonly [string, string]> = [
  ['Public target', model.publicUrl],
  ['Stack', model.stack],
  ['Phase', model.phase]
];

for (const [label, value] of factEntries) {
  const row = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');

  term.textContent = label;
  description.textContent = value;

  row.append(term, description);
  facts.append(row);
}

shell.append(eyebrow, title, tagline, facts);
appRoot.replaceChildren(shell);
