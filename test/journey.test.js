const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { Server } = require('socket.io');
const { createJourney } = require('../journey');
const content = require('../public/js/journey-content');
const { io: clientIo } = require(path.join(path.dirname(require.resolve('socket.io')), '../client-dist/socket.io.js'));

async function setup(t) {
  const server = http.createServer(), io = new Server(server);
  const journey = createJourney(io, { transitionMs: 5 }), clients = [];
  io.on('connection', socket => socket.on('barrier', done => done()));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    journey.stop();
    clients.forEach(client => client.socket.disconnect());
    await new Promise(resolve => io.close(resolve));
  });
  async function connect(auth = { journey: true }) {
    const socket = clientIo(`http://127.0.0.1:${server.address().port}`, {
      auth, transports: ['websocket'], forceNew: true,
    });
    const client = { socket, states: [], results: [], errors: [], hints: [] };
    clients.push(client);
    socket.on('journey-state', state => client.states.push(state));
    socket.on('journey-learning-result', result => client.results.push(result));
    socket.on('journey-error', error => client.errors.push(error));
    socket.on('journey-hint', hint => client.hints.push(hint));
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve); socket.once('connect_error', reject);
    });
    await new Promise(resolve => socket.emit('barrier', resolve));
    return client;
  }
  async function send(client, event, payload) {
    client.socket.emit(event, payload);
    await Promise.all(clients.filter(item => item.socket.connected).map(item =>
      new Promise(resolve => item.socket.emit('barrier', resolve))));
    return journey.snapshot();
  }
  async function phase(expected) {
    const deadline = Date.now() + 1000;
    while (journey.snapshot().phase !== expected) {
      if (Date.now() > deadline) throw new Error('Expected phase ' + expected);
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    await Promise.all(clients.filter(item => item.socket.connected).map(item =>
      new Promise(resolve => item.socket.emit('barrier', resolve))));
  }
  return { connect, send, phase, journey };
}

async function answerCurrent(api, client, { wrong = false, artwork } = {}) {
  const active = api.journey.snapshot().learning.active;
  const item = content[api.journey.snapshot().language].learningLevels[active.level - 1].questions[active.questionIndex];
  const key = { questionId: item.id, attemptId: active.attemptId };
  if (wrong) {
    await api.send(client, 'journey-learning-select-item', { ...key, itemId: item.distractorItemIds[0] });
    assert.equal(api.journey.snapshot().learning.active.stage, 'select');
    assert.match(client.results.at(-1).hint, new RegExp(item.targetWord));
  }
  await api.send(client, 'journey-learning-colouring-complete', key);
  assert.equal(api.journey.snapshot().learning.active.stage, 'select', 'cannot colour before correct selection');
  await api.send(client, 'journey-learning-select-item', { ...key, itemId: item.correctItemId });
  assert.equal(api.journey.snapshot().learning.active.stage, 'colouring');
  await api.send(client, 'journey-learning-colouring-complete', { ...key, artwork });
  const after = api.journey.snapshot();
  await api.send(client, 'journey-learning-colouring-complete', { ...key, artwork });
  assert.deepEqual(api.journey.snapshot(), after, 'duplicate/stale completion cannot advance');
}
async function finishLevel(api, client, level, options = {}) {
  await api.send(client, 'journey-learning-start', { level });
  for (let index = 0; index < 5; index++)
    await answerCurrent(api, client, index === 0 ? options : {});
}

test('both culturally grounded language tracks have five distinct five-question levels', () => {
  for (const [language, entry] of Object.entries(content)) {
    assert.equal(entry.learningLevels.length, 5);
    assert.equal(entry.stories.length, 1);
    assert.equal(entry.festivals.length, 1);
    assert.equal(entry.stories[0].festivalId, entry.festivals[0].id);
    const words = new Set();
    for (const [index, level] of entry.learningLevels.entries()) {
      assert.equal(level.level, index + 1);
      assert.equal(level.questions.length, 5);
      for (const question of level.questions) {
        assert.equal(question.language, language);
        assert.equal(question.level, index + 1);
        assert.equal(question.options.length, 3);
        assert.ok(question.options.some(item => item.itemId === question.correctItemId));
        assert.equal(question.distractorItemIds.length, 2);
        assert.ok(question.hint && question.colouringAsset && question.translation);
        assert.ok(!words.has(question.targetWord), 'words are not repeated across levels');
        words.add(question.targetWord);
        if (language === 'chinese') {
          assert.match(question.targetWord, /[\u3400-\u9fff]/);
          assert.match(question.pinyin, /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/);
          assert.equal(question.pronunciationLocale, 'zh-CN');
        } else assert.equal(question.pronunciationLocale, 'id-ID');
      }
    }
  }
});

for (const language of ['indonesian', 'chinese']) {
  test(`${language}: Level 1 gates the story, then invitation and festival; revisit retains progress`, async t => {
    const api = await setup(t), mobile = await api.connect(), aquarium = await api.connect();
    assert.equal(mobile.states.at(-1).phase, 'aquarium');
    await api.send(mobile, 'journey-start', language);
    await api.phase('room');
    let state = api.journey.snapshot();
    assert.equal(state.learning.active, null);
    assert.deepEqual(state.learning.levels.map(item => item.unlocked), [true, false, false, false, false]);
    assert.equal(state.learning.storybookUnlocked, false);
    await api.send(mobile, 'journey-story-page', 0);
    await api.send(mobile, 'journey-invitation');
    await api.send(mobile, 'journey-learning-start', { level: 2 });
    assert.equal(api.journey.snapshot().storyPage, 0);
    assert.equal(api.journey.snapshot().invited, false);
    assert.equal(api.journey.snapshot().learning.active, null);
    await finishLevel(api, mobile, 1, { wrong: true, artwork: 'data:image/png;base64,Y29sb3Vy' });
    state = api.journey.snapshot();
    assert.equal(state.learning.tutorialCompleted, true);
    assert.equal(state.learning.storybookUnlocked, true);
    assert.equal(state.learning.storybookUnlockVersion, 1);
    assert.equal(state.learning.storybookUnlockedAtTrip, state.trip);
    assert.equal(state.learning.levels[1].unlocked, true);
    assert.equal(state.bag.length, 5);
    const reconnect = await api.connect();
    assert.deepEqual(reconnect.states.at(-1), state);
    await api.send(mobile, 'journey-story-select', { storyId: 'missing' });
    assert.equal(api.journey.snapshot().activeStoryId, content[language].stories[0].id);
    for (let page = 0; page < 5; page++) await api.send(mobile, 'journey-story-page', page);
    assert.equal(api.journey.snapshot().storyDone, true);
    assert.equal(api.journey.snapshot().stories[0].completed, true);
    assert.equal(api.journey.snapshot().stories[0].invitationAvailable, true);
    await api.send(mobile, 'journey-invitation');
    assert.equal(api.journey.snapshot().festivalId, content[language].festivals[0].id);
    assert.equal(api.journey.snapshot().stories[0].invited, true);
    await api.send(mobile, 'journey-festival');
    assert.equal(api.journey.snapshot().phase, 'room');
    await api.send(mobile, 'journey-try-outfit', content[language].outfits[0].id);
    await api.send(mobile, 'journey-festival');
    assert.equal(api.journey.snapshot().phase, 'travelling');
    await api.phase('festival');
    await api.send(mobile, 'journey-area', 2);
    assert.equal(api.journey.snapshot().festivalArea, 0);
    for (const item of content[language].festivalItems) {
      if (item.area !== api.journey.snapshot().festivalArea)
        await api.send(mobile, 'journey-area', item.area);
      await api.send(mobile, 'journey-find', 'wrong');
      assert.equal(api.journey.snapshot().festivalFeedback, false);
      await api.send(mobile, 'journey-find', item.id);
      await api.send(mobile, 'journey-find', item.id);
      assert.equal(api.journey.snapshot().festivalFeedback, true);
      await api.send(mobile, 'journey-next-festival');
      await api.send(mobile, 'journey-next-festival');
    }
    assert.equal(api.journey.snapshot().festivalFound.length, 3);
    await api.send(mobile, 'journey-return');
    await api.phase('aquarium');
    state = api.journey.snapshot();
    assert.equal(state.memories.length, 13);
    assert.deepEqual(aquarium.states.at(-1), state);
    await api.send(mobile, 'journey-start', language);
    await api.phase('room');
    state = api.journey.snapshot();
    assert.equal(state.learning.storybookUnlocked, true);
    assert.equal(state.learning.active, null);
    assert.equal(state.learning.levels[0].completed, true);
    assert.equal(state.stories[0].completed, true);
    assert.equal(state.memories.length, 13);
    await api.send(mobile, 'journey-story-select', { storyId: content[language].stories[0].id });
    for (let page = 0; page < 5; page++) await api.send(mobile, 'journey-story-page', page);
    assert.equal(api.journey.snapshot().bag.length, 0, 'replay does not duplicate story rewards');
    await api.send(mobile, 'journey-invitation');
    assert.equal(api.journey.snapshot().invited, true);
  });
}

test('optional levels unlock in order and replay grants no duplicate rewards', async t => {
  const api = await setup(t), client = await api.connect();
  await api.send(client, 'journey-start', 'chinese'); await api.phase('room');
  for (let level = 1; level <= 5; level++) {
    await finishLevel(api, client, level);
    const state = api.journey.snapshot();
    assert.equal(state.learning.levels[level - 1].completed, true);
    if (level < 5) assert.equal(state.learning.levels[level].unlocked, true);
  }
  assert.equal(api.journey.snapshot().learning.allCompleted, true);
  const rewardCount = api.journey.snapshot().bag.length;
  await finishLevel(api, client, 1);
  assert.equal(api.journey.snapshot().bag.length, rewardCount);
  assert.equal(api.journey.snapshot().learning.storybookUnlockVersion, 1);
});

test('invalid events, exit, reset and a language change cannot leak progress', async t => {
  const api = await setup(t), client = await api.connect(), legacy = await api.connect({});
  await api.send(legacy, 'journey-start', 'indonesian');
  assert.equal(api.journey.snapshot().phase, 'aquarium');
  assert.equal(legacy.states.length, 0);
  await api.send(client, 'journey-start', '__proto__');
  assert.equal(api.journey.snapshot().phase, 'aquarium');
  await api.send(client, 'journey-start', 'indonesian'); await api.phase('room');
  await api.send(client, 'journey-learning-start', { level: 1 });
  await api.send(client, 'journey-learning-exit');
  assert.equal(api.journey.snapshot().learning.active, null);
  await api.send(client, 'journey-story-select', { storyId: 'putri-mandalika' });
  assert.equal(api.journey.snapshot().storyPage, 0);
  assert.ok(client.errors.length >= 2);
  await api.send(client, 'journey-exit'); await api.phase('aquarium');
  await api.send(client, 'journey-start', 'indonesian'); await api.phase('room');
  assert.equal(api.journey.snapshot().learning.storybookUnlocked, false);
  await api.send(client, 'journey-reset');
  assert.equal(api.journey.snapshot().phase, 'aquarium');
  assert.equal(api.journey.snapshot().language, null);
  assert.deepEqual(api.journey.snapshot().memories, []);
  await api.send(client, 'journey-start', 'chinese'); await api.phase('room');
  assert.equal(api.journey.snapshot().learning.levels[0].completed, false);
});
