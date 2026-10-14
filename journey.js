const journeys = require('./public/js/journey-content');

// One adventure shared by the mobile and aquarium. Home keeps the current
// trip's outfit and memories; starting another adventure clears them.
function createJourney(io, { transitionMs = 2200 } = {}) {
  let timer;
  const freshState = (trip = 0) => ({ phase: 'aquarium', language: null, storyPage: 0, storyDone: false,
    rhymeStep: 0, rhymeDone: false, rhymeListened: false, invited: false, outfit: null,
    festivalArea: 0, festivalMission: 0, festivalFeedback: false, festivalFound: [], bag: [], memories: [], trip });
  let state = freshState();
  const snapshot = () => JSON.parse(JSON.stringify(state));
  const publish = () => io.to('journey-devices').emit('journey-state', snapshot());
  const content = () => journeys[state.language];
  function reward(item, source) {
    const entry = { ...item, source, language: state.language };
    if (!state.bag.some(x => x.id === item.id)) state.bag.push(entry);
  }
  function transition(phase, next) {
    clearTimeout(timer);
    state.phase = phase;
    publish();
    timer = setTimeout(() => { state.phase = next; publish(); }, transitionMs);
  }
  function returnHome() {
    state.memories = [...state.memories];
    for (const item of state.bag) {
      if (!state.memories.some(x => x.id === item.id && x.language === item.language))
        state.memories.push(item);
    }
    transition('returning', 'aquarium');
  }
  io.on('connection', socket => {
    if (socket.handshake.auth.journey !== true) return;
    socket.join('journey-devices');
    socket.emit('journey-state', snapshot());
    socket.on('journey-start', language => {
      if (!['indonesian', 'chinese'].includes(language) || state.phase !== 'aquarium') return;
      state = { ...freshState(state.trip + 1), language };
      transition('departing', 'room');
    });
    socket.on('journey-story-page', page => {
      if (state.phase !== 'room' || state.storyDone || page !== state.storyPage) return;
      reward(content().storyRewards[page], 'story');
      state.storyPage++;
      state.storyDone = state.storyPage === content().chapters.length;
      publish();
    });
    socket.on('journey-rhyme-listened', () => {
      if (state.phase !== 'room' || state.rhymeListened) return;
      state.rhymeListened = true;
      publish();
    });
    socket.on('journey-rhyme-answer', payload => {
      if (state.phase !== 'room' || state.rhymeDone || !state.rhymeListened) return;
      if (!payload || typeof payload.icon !== 'string' || typeof payload.artwork !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(payload.artwork) || payload.artwork.length > 250000) {
        socket.emit('journey-hint', 'Colour your object and press Done to collect it.');
        return;
      }
      const icon = payload.icon;
      const line = content().rhyme.lines[state.rhymeStep];
      if (line.icon !== icon) {
        socket.emit('journey-hint', 'Good try! Listen again and find the matching picture.');
        return;
      }
      reward({ id: 'rhyme-' + line.icon, word: line.word, meaning: line.meaning,
        pronunciation: line.pronunciation, icon: line.icon,
        artwork: payload.artwork }, 'rhyme');
      state.rhymeStep++;
      state.rhymeDone = state.rhymeStep === content().rhyme.lines.length;
      publish();
    });
    socket.on('journey-invitation', () => {
      if (state.phase !== 'room' || !state.storyDone || !state.rhymeDone) return;
      state.invited = true;
      publish();
    });
    socket.on('journey-try-outfit', id => {
      if (state.phase !== 'room' || !state.invited || !content().outfits.some(x => x.id === id)) return;
      state.outfit = id;
      publish();
    });
    socket.on('journey-festival', () => {
      if (state.phase !== 'room' || !state.invited || !state.outfit) return;
      transition('travelling', 'festival');
    });
    socket.on('journey-area', area => {
      if (state.phase !== 'festival' || state.festivalFeedback || !Number.isInteger(area) ||
          Math.abs(area - state.festivalArea) !== 1 || !content().festivalAreas[area]) return;
      state.festivalArea = area;
      publish();
    });
    socket.on('journey-find', id => {
      if (state.phase !== 'festival' || state.festivalFeedback) return;
      const item = content().festivalItems[state.festivalMission];
      if (!item) return;
      if (item.id !== id || item.area !== state.festivalArea) {
        socket.emit('journey-hint', `Jelly is looking for ${item.word}. Keep exploring!`);
        return;
      }
      state.festivalFound.push(id);
      const { x, y, area, request, thanks, fact, ...keepsake } = item;
      reward(keepsake, 'festival');
      state.festivalFeedback = true;
      publish();
    });
    socket.on('journey-next-festival', () => {
      if (state.phase !== 'festival' || !state.festivalFeedback) return;
      state.festivalFeedback = false;
      state.festivalMission++;
      publish();
    });
    socket.on('journey-return', () => {
      if (state.phase !== 'festival' || state.festivalMission !== content().festivalItems.length || state.festivalFeedback) return;
      returnHome();
    });
    socket.on('journey-exit', () => {
      if (state.phase === 'aquarium' || state.phase === 'returning') return;
      returnHome();
    });
  });
  return { snapshot, stop: () => clearTimeout(timer) };
}
module.exports = { createJourney };
