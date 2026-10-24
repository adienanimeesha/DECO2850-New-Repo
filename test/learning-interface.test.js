const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function setup(t) {
 const html = fs.readFileSync(path.join(__dirname, '../public/mobile.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
 const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost:3000/mobile.html' });
 t.after(() => dom.window.close());
 const { window } = dom, actions = [], locks = [];
 window.OceanRoom = { clearMovement() {}, lock(value) { locks.push(value); } };
 window.eval(fs.readFileSync(path.join(__dirname, '../public/js/learning-interface.js'), 'utf8'));
 const api = window.JellyLearningInterface.create({
  action(name, payload) { actions.push([name, payload]); return Promise.resolve({ ok: true }); },
  getContent() { return {}; },
  room: () => window.OceanRoom
 });
 const levels = Array.from({ length: 5 }, (_, index) => ({
  id: 'level-' + (index + 1), title: ['Discover the Culture', 'Festival Decorations', 'Traditional Food and Clothing', 'Cultural Performances and Traditions', 'Festival Adventure'][index],
  status: index ? 'locked' : 'available'
 }));
 const stories = [
  { id: 'mandalika', title: 'Putri Mandalika', culturalTheme: 'Sasak legend', festival: 'Bau Nyale', status: 'available' },
  { id: 'future', title: 'A future story', culturalTheme: 'Coming later', festival: 'Future festival', status: 'locked' }
 ];
 const base = { phase: 'room', language: 'indonesian', learning: { levels, stories, storyUnlocked: false } };
 return { window, document: window.document, api, actions, locks, base };
}

test('first room visit guides movement and bookshelf opens five authoritative level cards', t => {
 const p = setup(t);
 p.api.sync(p.base, null);
 assert.equal(p.document.querySelector('#learning-guidance').hidden, false);
 assert.match(p.document.querySelector('#learning-guidance').textContent, /Move your jellyfish towards the bookshelf/);
 p.api.approach('learning-bookshelf');
 assert.equal(p.document.querySelector('#learning-level-screen').hidden, false);
 assert.equal(p.document.querySelectorAll('#learning-level-list .learning-card').length, 5);
 assert.equal(p.document.querySelectorAll('#learning-level-list .learning-card-action').length, 1);
 assert.equal(p.document.querySelector('#learning-level-list .learning-card h3').textContent, 'Discover the Culture');
 assert.equal(p.document.querySelectorAll('#learning-level-list .is-locked').length, 4);
});

test('starting Level 1 closes the menu without starting from room entry', async t => {
 const p = setup(t);
 p.api.sync(p.base, null);
 assert.equal(p.actions.length, 0, 'room entry must not start the tutorial');
 p.api.approach('learning-bookshelf');
 p.document.querySelector('.learning-card-action').click();
 await new Promise(resolve => setImmediate(resolve));
 assert.equal(JSON.stringify(p.actions[0]), JSON.stringify(['startLevel', { levelId: 'level-1', level: 1 }]));
 assert.equal(p.document.querySelector('#learning-level-screen').hidden, true);
});

test('Level 1 completion celebrates once, then exposes available cultural stories', async t => {
 const p = setup(t);
 p.api.sync(p.base, null);
 const complete = structuredClone(p.base);
 complete.learning.levels[0].status = 'completed';
 complete.learning.storyUnlocked = true;
 p.api.sync(complete, p.base);
 assert.equal(p.document.querySelector('#storybook-unlock-screen').hidden, false);
 p.document.querySelector('#explore-storybook').click();
 await Promise.resolve();
 assert.equal(p.document.querySelector('#storybook-unlock-screen').hidden, true);
 p.api.sync(complete, complete);
 assert.equal(p.document.querySelector('#storybook-unlock-screen').hidden, true, 'unchanged reconnect state must not replay celebration');
 p.api.approach('learning-storybook');
 assert.equal(p.document.querySelector('#learning-story-screen').hidden, false);
 assert.equal(p.document.querySelectorAll('#learning-story-list .learning-card').length, 2);
 assert.equal(p.document.querySelectorAll('#learning-story-list .learning-card-action').length, 1);
 assert.match(p.document.querySelector('#learning-story-list').textContent, /Putri Mandalika/);
});

test('completed levels and stories render Replay while locked content stays inert', t => {
 const p = setup(t), state = structuredClone(p.base);
 state.learning.storyUnlocked = true;
 state.learning.levels[0].status = 'completed';
 state.learning.levels[1].status = 'available';
 state.learning.stories[0].status = 'completed';
 p.api.sync(state, null);
 p.api.openLevels();
 assert.equal(p.document.querySelector('.learning-card-action').textContent, 'Replay');
 assert.equal(p.document.querySelectorAll('#learning-level-list .learning-card-action').length, 2);
 p.document.querySelector('#close-level-select').click();
 p.api.openStories();
 assert.equal(p.document.querySelector('#learning-story-list .learning-card-action').textContent, 'Replay');
 assert.equal(p.document.querySelectorAll('#learning-story-list .is-locked button').length, 0);
});

test('owned interface removes nursery-rhyme navigation and includes responsive layouts', () => {
 const html = fs.readFileSync(path.join(__dirname, '../public/mobile.html'), 'utf8');
 const js = fs.readFileSync(path.join(__dirname, '../public/js/journey-mobile.js'), 'utf8');
 const css = fs.readFileSync(path.join(__dirname, '../public/css/ocean.css'), 'utf8');
 assert.doesNotMatch(html, /song-player\.js|rhyme-colouring\.js|nursery rhyme/i);
 assert.doesNotMatch(js, /journey-rhyme-|nursery rhyme|sing along/i);
 assert.match(css, /@media\(max-width:680px\)/);
 assert.match(css, /@media\(max-height:500px\) and \(orientation:landscape\)/);
});
