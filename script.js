const search = document.querySelector(".search input");
const params = new URLSearchParams(location.search);
search.value = params.get("id");

function onYouTubeIframeAPIReady() {
  new YT.Player("player", {
    events: { onReady },
    videoId: params.get("id") || search.placeholder,
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

const inputs = document.querySelectorAll(".controls input");
function loadControls(player) {
  const unit = player.getDuration() / 12;
  inputs.forEach((x, i) => x.placeholder = (i * unit).toFixed(1));
  search.addEventListener("input", function(event) {
    const id = event.target.value || event.target.placeholder;
    player.loadVideoById(id);
    params.set("id", id);
    window.history.replaceState(null, null, "?" + params.toString());
  });
}

function setupMidiListeners(player) {
  window.addEventListener("keydown", event => onFakeMidi(event, player, 144, 100));
  window.addEventListener("keyup", event => onFakeMidi(event, player, 128, 0));
  window.navigator
    && typeof window.navigator.requestMIDIAccess === "function"
    && navigator.requestMIDIAccess().then(function(midi) {
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

const holding = {};
function hold(i, toggle) {
  const note = i % 12;
  holding[note] = toggle;
  return note;
}

// Make it a playable instrument!
const controls = document.querySelectorAll(".controls nav");
function onMidi(player, data, time) {
  if (data.length === 3 && data[0] >> 4 === 8) {
    // NOTE OFF
    const note = hold(data[1], false);
    controls[note].classList.remove("pressed");
    if (!Object.values(holding).includes(true))
      player.mute();

  } else if (data.length === 3 && data[0] >> 4 === 9) {
    // NOTE ON
    const note = hold(data[1], true);
    controls[note].classList.add("pressed");
    player.seekTo(getValue(inputs[note]), true);
    player.unMute();
    player.playVideo();
  }
}

function getValue(input) {
  const draft = parseFloat(input.value);
  return isNaN(draft) ? parseFloat(input.placeholder) : draft;
}
