const params = new URLSearchParams(location.search);
const left = document.querySelector(".left");
const search = document.querySelector(".search input");
const inputs = document.querySelectorAll(".controls input");
const controls = document.querySelectorAll(".controls nav");
const holding = {};
const keys = [ "a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j" ];

search.value = params.get("id");

function onYouTubeIframeAPIReady() {
  new YT.Player("player", {
    events: { onStateChange, onReady },
    width: left.clientWidth,
    height: left.clientHeight,
    videoId: params.get("id") || search.placeholder,
    playerVars: { disablekb: 1, modestbranding: 1 },
  });
}

function onStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    // Reset default times, evenly spaced throughout video
    const unit = event.target.getDuration() / 12;
    inputs.forEach((x, i) => x.placeholder = (i * unit).toFixed(1));
  }
}

function onReady(event) {
  const player = event.target;
  startBuffering(player);
  window.addEventListener("resize", () => onResize(player));

  // Update URL and video on search change
  search.addEventListener("input", function(event) {
    player.loadVideoById(search.value || search.placeholder);
    startBuffering(player);
    params.set("id", search.value);
    window.history.replaceState(null, null, "?" + params.toString());
  });

  // MIDI listeners
  window.addEventListener("keydown", event => onFakeMidi(event, player, 144, 100));
  window.addEventListener("keyup", event => onFakeMidi(event, player, 128, 0));
  window.navigator
    && typeof window.navigator.requestMIDIAccess === "function"
    && navigator.requestMIDIAccess().then(function(midi) {
      for(const input of midi.inputs.values())
        input.onmidimessage = event => onMidi(player, Array.from(event.data), event.timeStamp);
    });
}

function onResize(player) {
  player.setSize(left.clientWidth, left.clientHeight);
}

// It seems there's no explicit way to load a video,
// so instead we mute the video and start playing it immediately.
// YouTube will lazily load the video as it plays.
function startBuffering(player) {
  player.mute();
  player.playVideo();
}

// Use the keyboard as a backup MIDI controller — GarageBand layout
function onFakeMidi(event, player, status, velocity) {
  const index = keys.indexOf(event.key);
  if (index !== -1 && !event.repeat && event.target.nodeName !== "INPUT")
    onMidi(player, [ status, index, velocity ], performance.now());
}

function hold(i, toggle) {
  const note = i % 12;
  holding[note] = toggle;
  return note;
}

// Make it a playable instrument!
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
