(function (root) {
'use strict';
const keyOf = (state, active = state?.learning?.active) => active &&
 `${state.language}:${state.trip}:${active.attemptId}:${active.questionId}`;
function presentation(state, content) {
 const active = state?.learning?.active;
 if (!active || state.phase !== 'room') return null;
 const question = content.learningLevels.find(level => level.level === active.level)?.questions[active.questionIndex];
 if (!question || question.id !== active.questionId) throw new Error('The active vocabulary question is missing from content.');
 return {
  ...active, key: keyOf(state), language: state.language, index: active.questionIndex,
  colouringItemId: question.correctItemId, colouringAsset: question.colouringAsset,
  question: {
   before: question.sentenceBefore, word: question.targetWord, after: question.sentenceAfter,
   pronunciation: question.pinyin || '', hint: content.learningRetryMessage,
   objects: question.options.map(option => ({id: option.itemId, icon: option.asset}))
  }
 };
}
function selectedContent(content, state) {
 const story = content.stories?.find(item => item.id === state?.activeStoryId);
 const festival = content.festivals?.find(item => item.id === (state?.festivalId || story?.festivalId));
 return {...content,
  ...(story ? {chapters: story.chapters, storyTitle: story.title, storyRewards: story.rewards} : {}),
  ...(festival ? {festival: festival.title, place: festival.place, festivalIntro: festival.intro,
   festivalAreas: festival.areas, festivalItems: festival.items, outfits: festival.outfits} : {})
 };
}
function create({socket, timeoutMs = 8000, onError = () => {}}) {
 let state = null, pending = null;
 function settle(error, result) {
  if (!pending) return;
  const request = pending; pending = null; clearTimeout(request.timer);
  if (error) request.reject(error); else request.resolve(result || {ok: true});
 }
 function observe(next) {
  if (state && next.revision < state.revision) return;
  state = next;
  if (!pending) return;
  if (next.language !== pending.language || next.trip !== pending.trip || next.phase !== 'room') {
   settle(new Error('The adventure changed. Please try again.')); return;
  }
  if (pending.accept(next)) settle(null, pending.result ||
   (pending.event === 'journey-learning-select-item' ? {correct: true, colouringAllowed: true} : undefined));
  else if (pending.questionKey && keyOf(next) !== pending.questionKey)
   settle(new Error('That question is no longer active.'));
 }
 socket.on('journey-state', observe);
 socket.on('journey-learning-result', result => {
  if (pending?.event !== 'journey-learning-select-item' ||
      result.questionId !== pending.payload.questionId || result.attemptId !== pending.payload.attemptId) return;
  if (!result.correct) { settle(null, result); return; }
  pending.result = {...result, colouringAllowed: true};
  if (pending.accept(state)) settle(null, pending.result);
 });
 socket.on('journey-error', error => {
  if (pending?.event === error.event) settle(new Error(error.message));
  onError(error.message);
 });
 const disconnected = () => { state = null; settle(new Error('The ocean is reconnecting. Please try again.')); };
 socket.on('disconnect', disconnected);
 socket.on('connect_error', disconnected);
 function request(name, data = {}) {
  if (!socket.connected || !state) return Promise.reject(new Error('The ocean is reconnecting. Please try again.'));
  if (pending) return Promise.reject(new Error('Please wait for the current action.'));
  const active = state.learning?.active, oldKey = keyOf(state);
  let event, payload, accept;
  if (name === 'startLevel') {
   event = 'journey-learning-start'; payload = {level: data.level};
   accept = next => next.learning.active?.level === data.level && keyOf(next) !== oldKey;
  } else if (name === 'selectStory') {
   event = 'journey-story-select'; payload = {storyId: data.storyId};
   accept = next => next.activeStoryId === data.storyId && next.storyPage === 0 && !next.storyDone && !next.learning.active;
  } else if (name === 'storyPage') {
   event = 'journey-story-page'; payload = data.page;
   const storyId = state.activeStoryId;
   accept = next => next.activeStoryId === storyId && next.storyPage === data.page + 1;
  } else if (name === 'exitLevel') {
   event = 'journey-learning-exit'; accept = next => !next.learning.active;
  } else if (name === 'selectObject' || name === 'completeQuestion') {
   if (!active || data.key !== oldKey) return Promise.reject(new Error('That question is no longer active.'));
   payload = {questionId: active.questionId, attemptId: active.attemptId};
   if (name === 'selectObject') {
    event = 'journey-learning-select-item'; payload.itemId = data.objectId;
    accept = next => keyOf(next) === oldKey && next.learning.active.stage === 'colouring';
   } else {
    event = 'journey-learning-colouring-complete';
    if (data.artwork !== undefined) payload.artwork = data.artwork;
    accept = next => active.questionIndex === 4
     ? !next.learning.active && next.learning.levels.some(level => level.level === active.level && level.completed)
     : next.learning.active?.level === active.level && next.learning.active.questionIndex === active.questionIndex + 1 && keyOf(next) !== oldKey;
   }
  } else return Promise.reject(new Error('Unknown learning action.'));
  return new Promise((resolve, reject) => {
   pending = {event, payload, accept, resolve, reject, language: state.language, trip: state.trip,
    questionKey: name === 'selectObject' || name === 'completeQuestion' ? oldKey : null};
   pending.timer = setTimeout(() => settle(new Error('The activity took too long to respond. Please try again.')), timeoutMs);
   socket.emit(event, payload);
  });
 }
 return {request, get pending() { return Boolean(pending); }};
}
const api = {create, presentation, selectedContent, keyOf};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.JourneyLearning = api;
})(typeof window !== 'undefined' ? window : globalThis);
