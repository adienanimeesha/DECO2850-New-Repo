(function () {
'use strict';

const $ = id => document.getElementById(id);

function create({ action, getContent, room = () => window.OceanRoom }) {
 let state = null, previous = null, learningRoom = null, activePopup = null;
 let restoreFocus = null, unlockShown = false, pending = false;
 const levelScreen = $('learning-level-screen');
 const storyScreen = $('learning-story-screen');
 const unlockScreen = $('storybook-unlock-screen');
 const guidance = $('learning-guidance');
 const gameplayRoot = $('vocabulary-gameplay');

 const learning = value => value?.learning || value?.vocabularyLearning || null;
 const enabled = value => Boolean(learning(value) || value?.vocabularyLevels || getContent(value)?.vocabularyLevels);
 const levelItems = value => {
  const model = learning(value) || {};
  const content = getContent(value) || {};
  const definitions = model.levels || value?.vocabularyLevels || content.vocabularyLevels || [];
  return Array.isArray(definitions) ? definitions : [];
 };
 const storyItems = value => {
  const model = learning(value) || {};
  const content = getContent(value) || {};
  const definitions = model.stories || value?.culturalStories || content.culturalStories || [];
  return Array.isArray(definitions) ? definitions : [];
 };
 function levelOneComplete(value) {
  const model = learning(value) || {};
  if (typeof model.storyUnlocked === 'boolean') return model.storyUnlocked;
  if (typeof value?.storyUnlocked === 'boolean') return value.storyUnlocked;
  const first = levelItems(value)[0];
  return first?.completed === true || first?.status === 'completed';
 }
 function tutorialStarted(value) {
  const model = learning(value) || {};
  if (model.activeLevel != null || model.presentation || model.currentQuestion) return true;
  const first = levelItems(value)[0];
  return first?.started === true || first?.completed === true || first?.status === 'in-progress' || first?.status === 'completed';
 }
 function presentation(value) {
  const model = learning(value) || {};
  return model.presentation || model.currentQuestion || value?.vocabularyPresentation || null;
 }

 function focusable(root) {
  return [...root.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(node => !node.hidden);
 }
 function trapFocus(event, root) {
  const nodes = focusable(root), first = nodes[0], last = nodes.at(-1);
  if (!first) return;
  if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
 }
 function show(screen, name) {
  closePopup(false);
  restoreFocus = document.activeElement;
  activePopup = name;
  screen.hidden = false;
  room()?.clearMovement?.();
  room()?.lock?.(true);
  screen.querySelector('button:not(:disabled)')?.focus();
 }
 function closePopup(restore = true) {
  levelScreen.hidden = true;
  storyScreen.hidden = true;
  unlockScreen.hidden = true;
  activePopup = null;
  room()?.lock?.(false);
  if (restore) (restoreFocus?.isConnected ? restoreFocus : $('game'))?.focus();
 }
 function statusOf(item, index) {
  if (!item) return { locked: true, completed: false };
  const completed = item.completed === true || item.status === 'completed';
  const locked = item.locked === true || item.available === false || ['locked', 'unavailable'].includes(item.status);
  return { locked, completed };
 }
 function labelledButton(text, className) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = className; button.textContent = text;
  return button;
 }
 function renderLevels() {
  const list = $('learning-level-list');
  list.replaceChildren();
  const levels = levelItems(state);
  for (let index = 0; index < 5; index++) {
   const item = levels[index], status = statusOf(item, index);
   const row = document.createElement('article'); row.className = 'learning-card';
   row.classList.toggle('is-locked', status.locked); row.classList.toggle('is-complete', status.completed);
   const badge = document.createElement('span'); badge.className = 'learning-number'; badge.textContent = String(index + 1);
   const copy = document.createElement('div');
   const heading = document.createElement('h3'); heading.textContent = item?.title || 'Content coming soon';
   const meta = document.createElement('small');
   meta.textContent = status.completed ? 'Completed ✓' : status.locked ? 'Locked' : 'Ready to learn';
   copy.append(heading, meta); row.append(badge, copy);
   if (!status.locked) {
    const button = labelledButton(status.completed ? 'Replay' : 'Start', 'learning-card-action');
    button.addEventListener('click', async () => {
     if (pending) return;
     pending = true; button.disabled = true;
     try {
      await action('startLevel', { levelId: item.id ?? index + 1, level: index + 1 });
      closePopup();
     } catch (error) {
      $('learning-level-status').textContent = error?.message || 'That level could not start. Please try again.';
      button.disabled = false;
     } finally { pending = false; }
    });
    row.append(button);
   } else {
    const lock = document.createElement('span'); lock.className = 'learning-lock'; lock.textContent = '🔒'; lock.setAttribute('aria-label', 'Locked'); row.append(lock);
   }
   list.append(row);
  }
  $('learning-level-status').textContent = levels.length ? '' : 'Level details are still loading.';
 }
 function renderStories() {
  const list = $('learning-story-list'); list.replaceChildren();
  const stories = storyItems(state);
  for (const item of stories) {
   const status = statusOf(item, 0);
   const row = document.createElement('article'); row.className = 'learning-card story-choice';
   row.classList.toggle('is-locked', status.locked); row.classList.toggle('is-complete', status.completed);
   const icon = document.createElement('span'); icon.className = 'learning-number'; icon.textContent = '📖';
   const copy = document.createElement('div'); const title = document.createElement('h3'); title.textContent = item.title;
   const theme = document.createElement('small'); theme.textContent = [item.culturalTheme || item.theme, item.festival].filter(Boolean).join(' · ');
   const completion = document.createElement('span'); completion.className = 'story-status'; completion.textContent = status.completed ? 'Completed ✓' : status.locked ? 'Locked' : 'Ready to read';
   copy.append(title, theme, completion); row.append(icon, copy);
   if (!status.locked) {
    const button = labelledButton(status.completed ? 'Replay' : 'Start', 'learning-card-action');
    button.addEventListener('click', async () => {
     if (pending) return;
     pending = true; button.disabled = true;
     try { await action('selectStory', { storyId: item.id }); closePopup(); }
     catch (error) { $('learning-story-status').textContent = error?.message || 'That story could not open. Please try again.'; button.disabled = false; }
     finally { pending = false; }
    });
    row.append(button);
   } else {
    const lock = document.createElement('span'); lock.className = 'learning-lock'; lock.textContent = '🔒'; lock.setAttribute('aria-label', 'Locked'); row.append(lock);
   }
   list.append(row);
  }
  $('learning-story-status').textContent = stories.length ? '' : 'No cultural stories are available yet.';
 }
 function openLevels() {
  if (!state || state.phase !== 'room' || !enabled(state) || presentation(state)) return;
  renderLevels(); show(levelScreen, 'levels');
 }
 function openStories() {
  if (!state || state.phase !== 'room' || !levelOneComplete(state) || presentation(state)) return;
  renderStories(); show(storyScreen, 'stories');
 }
 function showUnlock() {
  unlockShown = true; show(unlockScreen, 'unlock');
 }
 async function gameplayAction(name, payload) {
  return action(name, payload);
 }
 function configureRoom() {
  if (learningRoom || !room()?.configureLearning || !window.VocabularyGameplay) return;
  learningRoom = room().configureLearning({
   root: gameplayRoot,
   onStorybook() { openStories(); },
   adapter: {
    select(payload) { return gameplayAction('selectObject', payload); },
    complete(payload) { return gameplayAction('completeQuestion', payload); },
    exit() { return gameplayAction('exitLevel'); }
   }
  });
 }
 function sync(next, prior) {
  previous = prior; state = next;
  configureRoom();
  const hasLearning = enabled(next), inRoom = next?.phase === 'room';
  const view = hasLearning ? presentation(next) : null;
  const unlocked = hasLearning && levelOneComplete(next);
  guidance.hidden = !(hasLearning && inRoom && !tutorialStarted(next));
  document.body.classList.toggle('is-vocabulary-active', Boolean(inRoom && view));
  $('mission-panel').classList.toggle('learning-guided', hasLearning && inRoom && !tutorialStarted(next));
  if (learningRoom) learningRoom.sync(inRoom ? view : null, { storyUnlocked: unlocked });
  else gameplayRoot.hidden = !view;
  if (view && !learningRoom) gameplayRoot.textContent = 'Your vocabulary activity is getting ready…';
  if (!inRoom && activePopup) closePopup(false);
  if (activePopup === 'levels') renderLevels();
  if (activePopup === 'stories') renderStories();
  const wasUnlocked = prior && enabled(prior) ? levelOneComplete(prior) : false;
  const explicitCelebration = learning(next)?.showStoryUnlockCelebration === true;
  if (inRoom && unlocked && !unlockShown && (explicitCelebration || (prior && !wasUnlocked))) showUnlock();
 }
 function approach(id) {
  if (id === 'learning-bookshelf') openLevels();
  if (['learning-storybook','storybook','book'].includes(id)) openStories();
 }
 function stop() { learningRoom?.stop(); document.body.classList.remove('is-vocabulary-active'); gameplayRoot.hidden = true; }

 $('close-level-select').addEventListener('click', closePopup);
 $('close-story-select').addEventListener('click', closePopup);
 $('explore-storybook').addEventListener('click', async () => {
  closePopup();
  try { await action('acknowledgeStoryUnlock'); } catch { /* visibility is still authoritative */ }
 });
 [levelScreen, storyScreen].forEach(screen => screen.addEventListener('pointerdown', event => { if (event.target === screen) closePopup(); }));
 window.addEventListener('ocean-room-ready', configureRoom);
 window.addEventListener('ocean-room-interaction', event => approach(event.detail?.id));
 document.addEventListener('keydown', event => {
  if (!activePopup) return;
  const screen = activePopup === 'levels' ? levelScreen : activePopup === 'stories' ? storyScreen : unlockScreen;
  if (event.key === 'Escape' && activePopup !== 'unlock') { event.preventDefault(); closePopup(); }
  else if (event.key === 'Tab') trapFocus(event, screen);
 });
 return { sync, stop, openLevels, openStories, approach, get activePopup() { return activePopup; } };
}

window.JellyLearningInterface = { create };
})();
