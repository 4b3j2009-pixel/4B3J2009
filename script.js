const today = new Date();
today.setHours(0, 0, 0, 0);

const showDate = new Date(2026, 7, 8);
const millisecondsPerDay = 1000 * 60 * 60 * 24;
const differenceInMilliseconds = showDate.getTime() - today.getTime();
const differenceInDays = Math.max(0, Math.ceil(differenceInMilliseconds / millisecondsPerDay));

document.getElementById("倒數").textContent = `距離首場演出還有 ${differenceInDays} 天`;

const navigationLinks = document.querySelectorAll(".site-header nav a[href^='#']");
navigationLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href");
        const target = document.querySelector(targetId);

        if (!target) {
            return;
        }

        event.preventDefault();
        history.pushState(null, "", targetId);

        target.scrollIntoView({ behavior: "instant", block: "start" });
    });
});

const playButton = document.getElementById("play-button");
const progress = document.getElementById("progress");
const volume = document.getElementById("volume");
const currentTime = document.getElementById("current-time");
const playerPanel = document.querySelector(".player-panel");

const duration = 30;
const notes = [220, 277.18, 329.63, 369.99, 329.63, 277.18, 246.94, 329.63];
let audioContext;
let masterGain;
let timer;
let startPosition = 0;
let startedAt = 0;
let isPlaying = false;

function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.min(duration, seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = Math.floor(safeSeconds % 60);
    return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function updateProgress(position) {
    progress.value = position;
    currentTime.textContent = formatTime(position);
}

function scheduleTone(frequency, start, length) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + length);
}

function buildTrack() {
    const start = audioContext.currentTime + 0.03;
    const beatLength = 1.25;

    for (let index = 0; index < 24; index += 1) {
        const noteStart = start + index * beatLength;
        scheduleTone(notes[index % notes.length], noteStart, beatLength * 0.82);

        if (index % 4 === 0) {
            scheduleTone(notes[index % notes.length] / 2, noteStart, beatLength * 1.8);
        }
    }
}

function stopTrack({ preservePosition = true } = {}) {
    isPlaying = false;
    window.clearInterval(timer);

    if (preservePosition) {
        startPosition = Math.min(duration, startPosition + audioContext.currentTime - startedAt);
    }

    if (masterGain) {
        masterGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.035);
    }

    playButton.textContent = "播放";
    playButton.setAttribute("aria-label", "播放新曲");
    playerPanel.classList.remove("is-playing");
}

function playTrack() {
    if (!audioContext) {
        audioContext = new AudioContext();
        masterGain = audioContext.createGain();
        masterGain.gain.value = Number(volume.value);
        masterGain.connect(audioContext.destination);
    }

    audioContext.resume();
    if (startPosition >= duration) {
        startPosition = 0;
    }

    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setValueAtTime(Number(volume.value), audioContext.currentTime);
    buildTrack();
    isPlaying = true;
    startedAt = audioContext.currentTime;
    playButton.textContent = "暫停";
    playButton.setAttribute("aria-label", "暫停新曲");
    playerPanel.classList.add("is-playing");

    timer = window.setInterval(() => {
        const position = startPosition + audioContext.currentTime - startedAt;

        if (position >= duration) {
            stopTrack({ preservePosition: false });
            startPosition = 0;
            updateProgress(0);
            return;
        }

        updateProgress(position);
    }, 100);
}

playButton.addEventListener("click", () => {
    if (isPlaying) {
        stopTrack();
    } else {
        playTrack();
    }
});

progress.addEventListener("input", () => {
    startPosition = Number(progress.value);
    updateProgress(startPosition);

    if (isPlaying) {
        stopTrack({ preservePosition: false });
        playTrack();
    }
});

volume.addEventListener("input", () => {
    if (masterGain) {
        masterGain.gain.setTargetAtTime(Number(volume.value), audioContext.currentTime, 0.02);
    }
});
