function onYouTubeIframeAPIReady() {
  new YT.Player("player", {
    events: { onReady },
    videoId: "_AVxxcRRshU", // TODO
    playerVars: { disablekb: 1, modestbranding: 1 },
  });
}

function onReady(event) {
  loadVideo(event.target);
  loadControls(event.target);
  setupMidiListeners(event.target);
}

// It seems there's no explicit way to load a video,
// so instead we mute the video and start playing it immediately.
// YouTube will lazily load the video as it plays.
function loadVideo(player) {
  player.mute();
  player.playVideo();
}

const inputs = document.querySelectorAll("[data-note] input");
function loadControls(player) {
  const unit = player.getDuration() / 12;
  inputs.forEach((x, i) => x.placeholder = (i * unit).toFixed(1));
  document.querySelector(".controls").classList.remove("hidden");
}

function setupMidiListeners(player) {
  window.addEventListener("keydown", event => onFakeMidi(event, player, 144, 100));
  window.addEventListener("keyup", event => onFakeMidi(event, player, 128, 0));
  navigator.requestMIDIAccess().then(function(midi) {
    for(const input of midi.inputs.values())
      input.onmidimessage = event => onMidi(player, Array.from(event.data), event.timeStamp);
  });
}

// Use the keyboard as a backup MIDI controller — GarageBand layout
const keys = [ "a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j"];
function onFakeMidi(event, player, status, velocity) {
  const index = keys.indexOf(event.key);
  if (index !== -1 && !event.repeat)
    onMidi(player, [ status, index, velocity ], performance.now());
}

// Make it a playable instrument!
const hold = {};
function onMidi(player, data, time) {
  if (data.length === 3 && data[0] >> 4 === 8) {
    // NOTE OFF
    const note = toNote(data[1]);
    const input = inputs[note];
    hold[note] = false;

    input.parentNode.classList.remove("pressed");
    if (!Object.values(hold).includes(true))
      player.mute();
  } else if (data.length === 3 && data[0] >> 4 === 9) {
    // NOTE ON
    const note = toNote(data[1]);
    const input = inputs[note];
    hold[note] = true;

    input.parentNode.classList.add("pressed");
    player.seekTo(getValue(input));
    player.unMute();
    player.playVideo();
  }
}

function getValue(input) {
  const draft = parseFloat(input.value);
  return isNaN(draft) ? parseFloat(input.placeholder) : draft;
}

function toNote(i) {
  return i % 12;
}
