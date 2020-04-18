const params = new URLSearchParams(location.search);
const voices = document.getElementById("voices");
const player = document.getElementById("player").parentNode;
const search = document.getElementById("search");
const inputs = document.querySelectorAll("#controls input");
const controls = document.querySelectorAll("#controls nav");
const holding = {};
const keys = [ "a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j" ];

search.value = params.get("id");
voices.addEventListener("change", function() {
  for (const option of voices.children)
    document
      .getElementById(option.value)
      .classList.toggle("dn", !option.selected);
});

for (const i of inputs) {
  i.addEventListener("input", function() {
    setParam(i.labels[0].innerText.replace("#", "s"), i.value);
  });
}

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
    inputs.forEach((x, i) => x.placeholder = (i * unit).toFixed(1));
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

  // MIDI listeners
  window.addEventListener("keydown", event => onFakeMidi(event, video, 144, 100));
  window.addEventListener("keyup", event => onFakeMidi(event, video, 128, 0));
  window.navigator
    && typeof window.navigator.requestMIDIAccess === "function"
    && navigator.requestMIDIAccess().then(function(midi) {
      for(const input of midi.inputs.values())
        input.onmidimessage = event => onMidi(video, Array.from(event.data), event.timeStamp);
    });
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
function onFakeMidi(event, video, status, velocity) {
  const index = keys.indexOf(event.key);
  if (index !== -1 && !event.repeat && event.target.nodeName !== "INPUT")
    onMidi(video, [ status, index, velocity ], performance.now());
}

function hold(i, toggle) {
  const note = i % 12;
  holding[note] = toggle;
  return note;
}

// Make it a playable instrument!
function onMidi(video, data, time) {
  if (data.length === 3 && data[0] >> 4 === 8) {
    // NOTE OFF
    const note = hold(data[1], false);
    controls[note].classList.remove("pressed");
    if (!Object.values(holding).includes(true))
      video.mute();

  } else if (data.length === 3 && data[0] >> 4 === 9) {
    // NOTE ON
    const note = hold(data[1], true);
    controls[note].classList.add("pressed");
    video.seekTo(getValue(inputs[note]), true);
    video.unMute();
    video.playVideo();
  }
}

function getValue(input) {
  const draft = parseFloat(input.value);
  return isNaN(draft) ? parseFloat(input.placeholder) : draft;
}

function setParam(key, value) {
  value ? params.set(key, value) : params.delete(key);
  window.history.replaceState(null, null, "?" + params.toString());
}
