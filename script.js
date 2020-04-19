const params = new URLSearchParams(location.search);
const voices = document.getElementById("voices");
const player = document.getElementById("player").parentNode;
const search = document.getElementById("search");
const holding = {};

// Controls object can be accessed by note index (0-11) or note key
const controls = [ "a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j" ].reduce(setupControl, {});
function setupControl(object, key, index) {
  const container = document.querySelector("[data-key=" + key + "]");
  const input = container.querySelector("input");
  input.addEventListener("input", () => setParam(key, input.value));

  const control = { key, index, container, input };
  object[key] = control;
  object[index] = control;
  return object;
}

// Restore input values from params
search.value = params.get("id");
for (const control of Object.values(controls))
  control.input.value = params.get(control.key);

voices.addEventListener("change", function() {
  for (const option of voices.children)
    document
      .getElementById(option.value)
      .classList.toggle("dn", !option.selected);
});

function onYouTubeIframeAPIReady() {
  new YT.Player("player", {
    events: { onStateChange, onReady },
    width: player.clientWidth,
    height: player.clientHeight,
    videoId: params.get("id") || search.placeholder,
    playerVars: { disablekb: 1, modestbranding: 1 },
  });
}

function onStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    // Reset default times, evenly spaced throughout video
    const unit = event.target.getDuration() / 12;
    for (const control of Object.values(controls))
      control.input.placeholder = (control.index * unit).toFixed(1);
  }
}

function onReady(event) {
  const video = event.target;
  startBuffering(video);
  window.addEventListener("resize", () => onResize(video));

  // Update URL and video on search change
  search.addEventListener("input", function(event) {
    video.loadVideoById(search.value || search.placeholder);
    startBuffering(video);
    setParam("id", search.value);
  });

  // Key listeners
  for (const control of Object.values(controls)) {
    control.container.addEventListener("pointerdown", event => onFakeMidiOn (event, control.key, video));
    control.container.addEventListener("pointerup",   event => onFakeMidiOff(event, control.key, video));
    control.container.addEventListener("pointerout",  event => onFakeMidiOff(event, control.key, video));
  }
  window.addEventListener("keydown", event => onFakeMidiOn (event, event.key, video));
  window.addEventListener("keyup",   event => onFakeMidiOff(event, event.key, video));
  window.navigator
    && typeof window.navigator.requestMIDIAccess === "function"
    && navigator.requestMIDIAccess().then(onMidiAccess);
}

function onMidiAccess(midi) {
  for(const input of midi.inputs.values())
    input.onmidimessage = event => onMidi(video, Array.from(event.data));
  midi.onstatechange = () => onMidiAccess(midi);
}

function onResize(video) {
  video.setSize(player.clientWidth, player.clientHeight);
}

// It seems there's no explicit way to load a video,
// so instead we mute the video and start playing it immediately.
// YouTube will lazily load the video as it plays.
function startBuffering(video) {
  video.mute();
  video.playVideo();
}

// Use the keyboard as a backup MIDI controller — GarageBand layout
function onFakeMidiOn (event, key, video) { onFakeMidi(event, key, video, 144, 100) }
function onFakeMidiOff(event, key, video) { onFakeMidi(event, key, video, 128,   0) }
function onFakeMidi(event, key, video, status, velocity) {
  const control = controls[key];
  if (control && !event.repeat && event.target.nodeName !== "INPUT") {
    event.preventDefault();
    onMidi(video, [ status, control.index, velocity ]);
  }
}

// Make it a playable instrument!
function onMidi(video, data) {
  if (data.length === 3 && data[0] >> 4 === 8) {
    // NOTE OFF
    const note = hold(data[1], false);
    controls[note].container.classList.remove("pressed");
    if (!Object.values(holding).includes(true))
      video.mute();

  } else if (data.length === 3 && data[0] >> 4 === 9) {
    // NOTE ON
    const note = hold(data[1], true);
    controls[note].container.classList.add("pressed");
    video.seekTo(getValue(controls[note].input), true);
    video.unMute();
    video.playVideo();
  }
}

function hold(i, toggle) {
  const note = i % 12;
  holding[note] = toggle;
  return note;
}

function getValue(input) {
  const draft = parseFloat(input.value);
  return isNaN(draft) ? parseFloat(input.placeholder) : draft;
}

function setParam(key, value) {
  value ? params.set(key, value) : params.delete(key);
  window.history.replaceState(null, null, "?" + params.toString());
}
