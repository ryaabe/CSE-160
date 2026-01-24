// MusicBox.js

const SLICES = 64;
const EXT = "ogg";

const BANKS = {
  miku:  { basePath: "../sounds/miku_box",  prefix: "miku_"  },
  drum:  { basePath: "../sounds/drum_box",  prefix: "drum_"  },
  music: { basePath: "../sounds/music_box", prefix: "music_" },
};

const LONG_RANGES = {
  miku: [
    [4, 6],
    [10, 12],
    [22, 23],
    [28, 30],
    [34, 36],
    [55, 57],
    [58, 60],
  ],
  drum: [
    [22, 24],
    [46, 48],
  ],
  music: [],
};

const urls = {};
const audio = {};
const clickCount = { miku: 0, drum: 0, music: 0 };

for (const bank in BANKS) {
  urls[bank] = new Array(SLICES + 1);
  audio[bank] = new Array(SLICES + 1);

  for (let i = 1; i <= SLICES; i++) {
    const { basePath, prefix } = BANKS[bank];
    const path = `${basePath}/${prefix}${i}.${EXT}`;
    urls[bank][i] = path;

    const el = new Audio(path);
    el.preload = "auto";
    audio[bank][i] = el;
  }
}

function playAudio(bank, idx, volume = 1.0) {
  const el = audio?.[bank]?.[idx];
  if (!el) return;
  el.pause();
  el.currentTime = 0;
  el.volume = volume;
  el.play();
}

function nextSliceIndex(bank) {
  let n = clickCount[bank] + 1;

  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of (LONG_RANGES[bank] || [])) {
      if (n > a && n <= b) {
        n = b + 1;
        changed = true;
        break;
      }
    }
  }

  clickCount[bank] = Math.min(n, SLICES);
  return clickCount[bank];
}

function playNext(bank, volume = 1.0) {
  const idx = nextSliceIndex(bank);
  playAudio(bank, idx, volume);
  return idx;
}

function resetBank(bank) {
  clickCount[bank] = 0;
}

function mapStep(bank, step) {
  let n = step;
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of (LONG_RANGES[bank] || [])) {
      if (n > a && n <= b) {
        n = b + 1;
        changed = true;
        break;
      }
    }
  }
  if (n < 1) n = 1;
  if (n > SLICES) n = SLICES;
  return n;
}

function sliceOrNullForStep(bank, step) {
  for (const [a, b] of (LONG_RANGES[bank] || [])) {
    if (step >= a && step <= b) {
      // start of long note: play the first slice
      if (step === a) return a;
      // inside the long note: play nothing
      return null;
    }
  }
  // normal note
  if (step < 1) return null;
  if (step > SLICES) return null;
  return step;
}

function playStep(bank, step, volume = 1.0) {
  const idx = sliceOrNullForStep(bank, step);
  if (idx !== null) playAudio(bank, idx, volume);
  return idx;
}

window.MusicBox = {
  playNext,
  resetBank,
  playAudio,
  playStep,
  mapStep,
  urls,
};