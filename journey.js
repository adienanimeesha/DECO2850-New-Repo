const journeys = require('./public/js/journey-content');

// One authoritative, in-memory adventure shared by journey-enabled sockets.
function createJourney(io, { transitionMs = 2200 } = {}) {
  let timer;
  let attemptSequence = 0, revision = 0;
  const fresh = (trip = 0, language = null) => ({
    phase: 'aquarium', language, trip,
    learning: {
      tutorialCompleted: false, allCompleted: false, storybookUnlocked: false,
      storybookUnlockVersion: 0, storybookUnlockedAtTrip: null,
      levels: Array.from({ length: 3 }, (_, index) => ({
        level: index + 1, unlocked: index === 0, completed: false,
      })),
      active: null,
    },
    stories: [], activeStoryId: null, storyPage: 0, storyDone: false,
    invited: false, outfit: null, festivalId: null,
    festivalArea: 0, festivalMission: 0, festivalFeedback: false,
    festivalFound: [], mainAdventureCompleted: false, bag: [], memories: [],
  });
  let state = fresh();
  function normaliseLearningState() {
    const definitions = content()?.learningLevels;
    if (!Array.isArray(definitions)) return;
    const previous = Array.isArray(state.learning.levels) ? state.learning.levels : [];
    const festivalCompleted = state.mainAdventureCompleted === true ||
      state.memories.some(item => item.source === 'festival');
    state.mainAdventureCompleted = festivalCompleted;
    state.learning.levels = definitions.map((definition, index) => {
      const progress = previous.find(item => item.level === definition.level) || {};
      const completed = progress.completed === true;
      const predecessor = definitions[index - 1];
      const unlocked = index === 0 || completed ||
        previous.some(item => item.level === predecessor?.level && item.completed === true) ||
        // Retain availability in older completed-adventure snapshots.
        (definition.level === 2 && (state.learning.tutorialCompleted || festivalCompleted));
      return { level: definition.level, unlocked, completed };
    });
    state.learning.allCompleted = state.learning.levels.every(entry => entry.completed);
  }
  const snapshot = () => {
    normaliseLearningState();
    return JSON.parse(JSON.stringify({...state, revision}));
  };
  const publish = () => { revision++; io.to('journey-devices').emit('journey-state', snapshot()); };
  const content = () => journeys[state.language];
  const story = () => content()?.stories.find(item => item.id === state.activeStoryId);
  const festival = () => content()?.festivals.find(item => item.id === state.festivalId);
  const question = () => {
    const active = state.learning.active;
    return active && content()?.learningLevels[active.level - 1]?.questions[active.questionIndex];
  };
  const invalid = (socket, event) => socket.emit('journey-error', {
    event, code: 'invalid-state', message: 'That action is not available right now.',
  });
  function reward(item, source) {
    const entry = { ...item, source, language: state.language };
    if (![...state.bag, ...state.memories].some(x => x.id === entry.id && x.language === entry.language))
      state.bag.push(entry);
  }
  function transition(phase, next) {
    clearTimeout(timer);
    state.phase = phase;
    publish();
    timer = setTimeout(() => { state.phase = next; publish(); }, transitionMs);
  }
  function returnHome() {
    state.learning.active = null;
    for (const item of state.bag) {
      if (!state.memories.some(x => x.id === item.id && x.language === item.language))
        state.memories.push(item);
    }
    transition('returning', 'aquarium');
  }
  function resetTrip() {
    state.trip++;
    state.learning.active = null;
    state.activeStoryId = content().stories[0]?.id || null;
    state.storyPage = 0; state.storyDone = false; state.invited = false;
    state.outfit = null; state.festivalId = null; state.festivalArea = 0;
    state.festivalMission = 0; state.festivalFeedback = false;
    state.festivalFound = []; state.bag = [];
  }
  function activate(level, questionIndex) {
    state.learning.active = {
      level, questionIndex,
      questionId: content().learningLevels[level - 1].questions[questionIndex].id,
      attemptId: ++attemptSequence, stage: 'select',
    };
  }
  function finishQuestion(artwork) {
    const active = state.learning.active, item = question();
    reward({
      id: 'learning-' + item.id, word: item.targetWord, meaning: item.translation,
      pronunciation: item.pinyin, icon: item.colouringAsset,
      ...(artwork ? { artwork } : {}),
    }, 'learning');
    if (active.questionIndex < 4) {
      activate(active.level, active.questionIndex + 1);
    } else {
      const level = active.level;
      state.learning.active = null;
      state.learning.levels[level - 1].completed = true;
      if (level === 1 && !state.learning.tutorialCompleted) {
        state.learning.tutorialCompleted = true;
        state.learning.storybookUnlocked = true;
        state.learning.storybookUnlockVersion++;
        state.learning.storybookUnlockedAtTrip = state.trip;
      }
      // Learning progresses independently of the story/festival. Unlock the
      // next shelf, but let the player choose when to start it.
      const nextLevel = state.learning.levels.find(entry => entry.level === level + 1);
      if (nextLevel) nextLevel.unlocked = true;
      state.learning.allCompleted = state.learning.levels.every(entry => entry.completed);
    }
    publish();
  }
  io.on('connection', socket => {
    if (socket.handshake.auth.journey !== true) return;
    socket.join('journey-devices');
    socket.emit('journey-state', snapshot());
    socket.on('journey-start', payload => {
      const language = typeof payload === 'string' ? payload : payload?.language;
      const startFresh = typeof payload === 'object' && payload?.fresh === true;
      if (!Object.hasOwn(journeys, language) || state.phase !== 'aquarium')
        return invalid(socket, 'journey-start');
      if (startFresh || state.language !== language) {
        state = fresh(state.trip, language);
        state.stories = content().stories.map(item => ({
          id: item.id, language, title: item.title, festivalId: item.festivalId,
          completed: false, invitationAvailable: false, invited: false, replayEligible: true,
        }));
      }
      // Continue an entered festival without resetting its story or missions.
      if (!startFresh && state.storyDone && state.invited && state.outfit && festival() && state.festivalMission < festival().items.length) {
        state.trip++;
        state.learning.active = null;
        transition('departing', 'festival');
      } else {
        resetTrip();
        const completed = state.stories.find(item => item.id === state.activeStoryId && item.completed);
        if (completed) {
          state.storyDone = true;
          state.storyPage = story().chapters.length;
        }
        transition('departing', 'room');
      }
    });
    socket.on('journey-reset', () => {
      clearTimeout(timer); state = fresh(state.trip + 1); publish();
    });
    socket.on('journey-learning-start', payload => {
      const level = payload?.level;
      normaliseLearningState();
      const definition = content()?.learningLevels.find(item => item.level === level);
      if (state.phase !== 'room' || state.learning.active ||
          !Number.isInteger(level) || !definition ||
          !state.learning.levels.find(item => item.level === level)?.unlocked)
        return invalid(socket, 'journey-learning-start');
      activate(level, 0); publish();
    });
    socket.on('journey-learning-select-item', payload => {
      const active = state.learning.active, item = question();
      if (state.phase !== 'room' || !active || active.stage !== 'select' ||
          payload?.questionId !== item.id || payload?.attemptId !== active.attemptId ||
          typeof payload?.itemId !== 'string' ||
          !item.options.some(option => option.itemId === payload.itemId))
        return invalid(socket, 'journey-learning-select-item');
      if (payload.itemId !== item.correctItemId) {
        socket.emit('journey-learning-result', {
          correct: false, questionId: item.id, attemptId: active.attemptId,
          hint: content().learningRetryMessage,
        });
        return;
      }
      active.stage = 'colouring';
      socket.emit('journey-learning-result', {
        correct: true, questionId: item.id, attemptId: active.attemptId,
        colouringAsset: item.colouringAsset,
      });
      publish();
    });
    socket.on('journey-learning-colouring-complete', payload => {
      const active = state.learning.active, item = question();
      if (state.phase !== 'room' || !active || active.stage !== 'colouring' ||
          payload?.questionId !== item.id || payload?.attemptId !== active.attemptId ||
          (payload.artwork !== undefined && (typeof payload.artwork !== 'string' ||
            !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(payload.artwork) ||
            payload.artwork.length > 250000)))
        return invalid(socket, 'journey-learning-colouring-complete');
      finishQuestion(payload.artwork);
    });
    socket.on('journey-learning-exit', () => {
      if (state.phase !== 'room' || !state.learning.active)
        return invalid(socket, 'journey-learning-exit');
      state.learning.active = null; publish();
    });
    socket.on('journey-story-select', payload => {
      const selected = content()?.stories.find(item => item.id === payload?.storyId);
      if (state.phase !== 'room' || !state.learning.storybookUnlocked ||
          state.learning.active || !selected ||
          !content().festivals.some(item => item.id === selected.festivalId))
        return invalid(socket, 'journey-story-select');
      state.activeStoryId = selected.id;
      if (state.stories.find(item => item.id === selected.id)?.completed) {
        state.storyPage = selected.chapters.length;
        state.storyDone = true; state.invited = true;
        state.festivalId = selected.festivalId;
        state.stories.find(item => item.id === selected.id).invited = true;
        state.outfit = festival().outfits.find(item => item.id === state.outfit)?.id || festival().outfits[0].id;
        state.festivalArea = 0; state.festivalMission = 0;
        state.festivalFeedback = false; state.festivalFound = [];
        transition('travelling', 'festival');
        return;
      }
      state.storyPage = 0; state.storyDone = false; state.invited = false;
      state.outfit = null; state.festivalId = null; state.festivalArea = 0;
      state.festivalMission = 0; state.festivalFeedback = false; state.festivalFound = [];
      publish();
    });
    socket.on('journey-story-page', page => {
      const selected = story();
      if (state.phase !== 'room' || !state.learning.storybookUnlocked ||
          state.learning.active || !selected || state.storyDone || page !== state.storyPage)
        return invalid(socket, 'journey-story-page');
      reward(selected.rewards[page], 'story');
      state.storyPage++;
      state.storyDone = state.storyPage === selected.chapters.length;
      if (state.storyDone) {
        const progress = state.stories.find(item => item.id === selected.id);
        progress.completed = true; progress.invitationAvailable = true;
      }
      publish();
    });
    socket.on('journey-invitation', () => {
      if (state.phase !== 'room' || !state.storyDone || state.learning.active ||
          !content().festivals.some(item => item.id === story()?.festivalId))
        return invalid(socket, 'journey-invitation');
      state.invited = true; state.festivalId = story().festivalId;
      state.stories.find(item => item.id === state.activeStoryId).invited = true;
      publish();
    });
    socket.on('journey-try-outfit', id => {
      if (state.phase !== 'room' || state.learning.active || !state.invited ||
          !festival()?.outfits.some(item => item.id === id))
        return invalid(socket, 'journey-try-outfit');
      state.outfit = id; publish();
    });
    socket.on('journey-festival', () => {
      if (state.phase !== 'room' || state.learning.active || !state.invited || !state.outfit || !festival())
        return invalid(socket, 'journey-festival');
      transition('travelling', 'festival');
    });
    socket.on('journey-area', area => {
      if (state.phase !== 'festival' || state.festivalFeedback || !Number.isInteger(area) ||
          Math.abs(area - state.festivalArea) !== 1 || !festival()?.areas[area])
        return invalid(socket, 'journey-area');
      state.festivalArea = area; publish();
    });
    socket.on('journey-find', id => {
      if (state.phase !== 'festival' || state.festivalFeedback)
        return invalid(socket, 'journey-find');
      const item = festival()?.items[state.festivalMission];
      if (!item) return invalid(socket, 'journey-find');
      if (item.id !== id || item.area !== state.festivalArea) {
        const selected = festival()?.areas[state.festivalArea]?.distractors.find(choice => choice.id === id);
        socket.emit('journey-hint', selected?.word && selected?.meaning
          ? `That's not ${item.word}. That's ${selected.word} (${selected.meaning})! Let's try again.`
          : `Jelly is looking for ${item.word}. Keep exploring!`);
        return;
      }
      state.festivalFound.push(id);
      const { x, y, area, request, thanks, fact, ...keepsake } = item;
      reward(keepsake, 'festival');
      state.festivalFeedback = true; publish();
    });
    socket.on('journey-next-festival', () => {
      if (state.phase !== 'festival' || !state.festivalFeedback)
        return invalid(socket, 'journey-next-festival');
      state.festivalFeedback = false; state.festivalMission++; publish();
    });
    socket.on('journey-return', () => {
      if (state.phase !== 'festival' || state.festivalMission !== festival()?.items.length ||
          state.festivalFeedback) return invalid(socket, 'journey-return');
      state.mainAdventureCompleted = true;
      returnHome();
    });
    socket.on('journey-exit', () => {
      if (state.phase === 'aquarium' || state.phase === 'returning')
        return invalid(socket, 'journey-exit');
      returnHome();
    });
  });
  return { snapshot, stop: () => clearTimeout(timer) };
}
module.exports = { createJourney };
