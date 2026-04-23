const STATES = {
idle: { tag: 'IDLE', text: 'PRESS PLAY TO TUNE IN' },
connecting: { tag: '. . .', text: 'CONNECTING' },
buffering: { tag: 'BUFF', text: 'BUFFERING SIGNAL' },
playing: { tag: 'LIVE', text: 'TRANSMISSION LOCKED' },
paused: { tag: 'IDLE', text: 'PAUSED — PRESS PLAY TO RESYNC' },
error: { tag: 'ERR', text: 'OFF AIR — CHECK STREAM' },
};

// simple padding helper
function padLeft(value, width) {
width = width || 2;

let str = String(value);

while (str.length < width) {
    str = '0' + str;
}

return str;

}

// convert ms into HH:MM:SS
function formatSessionTime(ms) {
let seconds = Math.floor(ms / 1000);

if (seconds < 0) {
    seconds = 0; // is this a meme?
}

let hours = Math.floor(seconds / 3600);
let minutes = Math.floor(seconds / 60) % 60;
let secs = seconds % 60;

return padLeft(hours) + ':' + padLeft(minutes) + ':' + padLeft(secs);

}

class StreamPlayer {

constructor(rootEl) {
    this.root = rootEl;
    this.src = rootEl.dataset.src;

    // collect references
    this.refs = {};

    let nodes = rootEl.querySelectorAll('[data-ref]');
    for (let i = 0; i < nodes.length; i++) {
        let key = nodes[i].dataset.ref;
        this.refs[key] = nodes[i];
    }

    this.actions = {
        toggle: this.toggle,
        stop: this.stop,
        mute: this.mute
    };

    this.timer = null;
    this.startedAt = 0;

    this.audio = this.createAudioInstance();

    this.bindEvents();

    // initialize volume (quietly)
    if (this.refs.volume) {
        this.setVolume(this.refs.volume.valueAsNumber, { silent: true });
    }

    this.setState('idle');
}


createAudioInstance() {
    let previous = this.audio || null;

    let audio = new Audio();

    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';
    audio.src = this.src;

    // carry over previous state if available
    audio.volume = previous ? previous.volume : 0.8;
    audio.muted  = previous ? previous.muted  : false;

    // guard pattern — avoids weird duplicated events
    let self = this;

    function attach(eventName, handler) {
        audio.addEventListener(eventName, function () {
            if (self.audio === audio) {
                handler();
            }
        });
    }

    attach('playing', function () { self.setState('playing'); });
    attach('waiting', function () { self.setState('buffering'); });
    attach('pause',   function () { self.setState('paused'); });
    attach('error',   function () { self.setState('error'); });

    return audio;
}


bindEvents() {
    let self = this;

    // click handling
    this.root.addEventListener('click', function (e) {
        let el = e.target.closest('[data-action]');

        if (!el) return;

        let action = el.dataset.action;

        if (self.actions[action]) {
            self.actions[action].call(self);
        }
    });

    // volume change
    if (this.refs.volume) {
        this.refs.volume.addEventListener('input', function (e) {
            self.setVolume(e.target.valueAsNumber);
        });
    }


    this.root.addEventListener('keydown', function (e) {
        if (e.target.matches('input, [contenteditable]')) {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            self.toggle();
        }
    });
}


async toggle() {

    if (!this.audio.paused) {
        this.audio.pause();
        return;
    }

    // streams don’t resume cleanly, so rebuild
    this.audio = this.createAudioInstance();

    this.setState('connecting');

    try {
        await this.audio.play();
    } catch (e) {
        console.warn('Playback failed', e);
        this.setState('error');
    }
}


stop() {
    this.audio.pause();

    // full reset (safer?)
    this.audio = this.createAudioInstance();

    this.setState('idle');
}


mute() {
    this.audio.muted = !this.audio.muted;

    this.renderMuteButton();
}


setVolume(value, options) {
    options = options || {};

    let silent = options.silent === true;

    this.audio.volume = value / 100;

    if (this.refs.volumeReadout) {
        this.refs.volumeReadout.textContent = padLeft(value, 3);
    }

    // auto-unmute if needed
    if (!silent && this.audio.muted && value > 0) {
        this.mute();
    }
}


setState(name) {
    let state = STATES[name];

    if (!state) {
        console.warn('Invalid state:', name);
        return;
    }

    this.root.dataset.state = name;

    if (this.refs.stateTag) {
        this.refs.stateTag.textContent = state.tag;
    }

    if (this.refs.stateText) {
        this.refs.stateText.textContent = state.text;
    }

    this.renderPlayButton(name === 'playing');

    if (name === 'playing') {
        this.startTimer();
    } else {
        this.stopTimer();
    }
}


renderPlayButton(isPlaying) {
    let btn = this.refs.playBtn;
    if (!btn) return;

    btn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');

    let icon = btn.querySelector('.ico');
    let label = btn.querySelector('.xbtn-label');

    if (icon) {
        icon.className = isPlaying ? 'ico ico-pause' : 'ico ico-play';
    }

    if (label) {
        label.textContent = isPlaying ? 'PAUSE' : 'PLAY';
    }
}


renderMuteButton() {
    let btn = this.refs.muteBtn;
    if (!btn) return;

    let muted = this.audio.muted;

    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');

    let icon = btn.querySelector('.ico');
    let label = btn.querySelector('.xbtn-label');

    if (icon) {
        icon.className = muted ? 'ico ico-mute' : 'ico ico-spkr';
    }

    if (label) {
        label.textContent = muted ? 'UNMUTE' : 'MUTE';
    }
}


startTimer() {
    if (this.timer) {
        return; // already running
    }

    this.startedAt = performance.now();

    let self = this;

    this.timer = setInterval(function () {
        let elapsed = performance.now() - self.startedAt;

        if (self.refs.elapsed) {
            self.refs.elapsed.textContent = formatSessionTime(elapsed);
        }

    }, 1000);
}


stopTimer() {
    if (!this.timer) return;

    clearInterval(this.timer);
    this.timer = null;

    if (this.refs.elapsed) {
        this.refs.elapsed.textContent = '00:00:00';
    }
}

}

// init
let players = document.querySelectorAll('[data-component="stream-player"]');

for (let i = 0; i < players.length; i++) {
new StreamPlayer(players[i]);
}