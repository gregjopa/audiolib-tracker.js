function Tracker(score, sampleRate, tempo, notesPerBeat, beatsPerBar) {
    // mandatory argument
    this.score = score;

    // optional arguments
    this.sampleRate = isNaN(sampleRate) || sampleRate === null ? this.sampleRate: sampleRate;
    this.tempo = isNaN(tempo) || tempo === null ? this.tempo: tempo;
    this.notesPerBeat = isNaN(notesPerBeat) || notesPerBeat === null ? this.notesPerBeat: notesPerBeat;
    this.beatsPerBar = isNaN(beatsPerBar) || beatsPerBar === null ? this.beatsPerBar: beatsPerBar;

    // control for master volume
    this.volumeControl = audioLib.UIControl(this.sampleRate, 0);

    this.voices = [];


    this.metronome = {
        active: false
    };
}

Tracker.prototype = {
    sampleRate: 44100,
    tempo: 120,
    notesPerBeat: 4,
    beatsPerBar: 4,
    hasMetronome: false,
    // whether or not the metronome exists
    isMetronomeActive: false,
    // whether the metronome is muted or not
    drumSample: null,
    voices: null,
    isPlaying: false,
    isLooping: true,

    addVoice: function(trackIndex, voiceIndex) {
        this.voices.push(audioLib.generators.Voice(this.score[trackIndex], voiceIndex, this.sampleRate, this.tempo));
    },

    addMetronome: function(drumSample) {
        this.hasMetronome = true;
        this.metronome = audioLib.generators.Beat(this.sampleRate, this.tempo, drumSample);
    },

    play: function() {


        if (!this.isPlaying) {

            var voiceCount = this.voices.length,
            i;

            for (i = 0; i < voiceCount; i++) {

                if (!this.voices[i].active) {
                    this.voices[i].endOfSong = false;
                    this.voices[i].active = true;
                }

                if (this.hasMetronome && this.isMetronomeActive) {

                    this.metronome.start();

                }

                this.isPlaying = true;

            }

        }

    },

    pause: function() {
        this.isPlaying = false;
    },

    stop: function() {

        if (this.isPlaying) {

            this.isPlaying = false;

            var voiceCount = this.voices.length,
            i;

            for (i = 0; i < voiceCount; i++) {
                this.voices[i].stop();
            }

            this.metronome.stop();

        }


    },

    metronomeOn: function() {
        this.isMetronomeActive = true;
        this.metronome.active = true;
    },

    metronomeOff: function() {
        this.isMetronomeActive = false;
        this.metronome.active = false;
    },

    loopingOn: function() {

        this.isLooping = true;

        var voiceCount = this.voices.length,
        i;

        for (i = 0; i < voiceCount; i++) {
            this.voices[i].isLooping = true;
        }

    },

    loopingOff: function() {
        this.isLooping = false;

        var voiceCount = this.voices.length,
        i;

        for (i = 0; i < voiceCount; i++) {
            this.voices[i].isLooping = false;
        }
    },

    setVolume: function(volume) {
        this.volumeControl.setValue(volume);
    },

    setTempo: function(tempo) {
        this.metronome.setTempo(tempo);

        this.isLooping = true;

        var voiceCount = this.voices.length,
        i;

        for (i = 0; i < voiceCount; i++) {
            this.voices[i].setTempo(tempo);
        }
    },


    // TODO: abstract out effects code by adding an Instrument class for shaping notes
    buildAudio: function() {

        // sink for output
        var sink = Sink();

        // effects
        var reverb = audioLib.Reverb(sink.sampleRate, 2, .6, .45, .5, .25),
        comp = audioLib.Compressor.createBufferBased(2, this.sampleRate, 3, 0.5),
        lpf = new audioLib.BiquadFilter.LowPass(this.sampleRate, 1500, 0.6),
        volume = audioLib.GainController.createBufferBased(2, this.sampleRate, 0);

        var that = this;


        // attach UIControl to gain effect for master volume
        volume.addPreProcessing(function() {
            that.volumeControl.generate();
            // TODO: make volume scale consistant
            // the audiolib Gain controller is currently using -1 for muting a track instead of 0
            volume.effects[0].gain = volume.effects[1].gain = parseFloat(that.volumeControl.value) - 1;

            // set volume for the metronome
            that.metronome.volume = parseFloat(that.volumeControl.value);
        });


        // callback
        sink.on('audioprocess',
        function(buffer, channelCount) {

            // check to see if end of song (TODO: implement a better way to handle end of song event (Observer pattern))
            if (that.voices[0].endOfSong && that.isPlaying) {
                that.stop();
            }

            if (that.isPlaying) {

                var voiceCount = that.voices.length,
                i;

                for (i = 0; i < voiceCount; i++) {
                    that.voices[i].append(buffer, channelCount);
                }

                volume.append(buffer, channelCount);

                lpf.append(buffer, channelCount);

                reverb.append(buffer, channelCount);

                if (that.hasMetronome) {
                    that.metronome.append(buffer, channelCount);
                }

                comp.append(buffer, channelCount);


            }

        });


    }

};

function Voice(track, voiceIndex, sampleRate, tempo) {
    // mandatory argument
    this.track = track;

    // optional arguments
    this.voiceIndex = isNaN(voiceIndex) || voiceIndex === null ? this.voiceIndex: voiceIndex;
    this.sampleRate = isNaN(sampleRate) || sampleRate === null ? this.sampleRate: sampleRate;
    this.tempo = isNaN(tempo) || tempo === null ? this.tempo: tempo;

    this.str = audioLib.Pluck(this.sampleRate);
}

Voice.prototype = {
    sampleRate: 44100,
    gain: null,
    mix: 0.5,
    sample: 0,
    length: -1,
    samplesLeft: -1,
    noteIndex: -1,
    track: null,
    voiceIndex: 0,
    active: true,
    tempo: 120,
    // time signature
    notesPerBeat: 4,
    beatsPerBar: 4,
    isLooping: false,
    endOfSong: false,

    stop: function() {
        this.active = false;
        this.noteIndex = -1;
        this.samplesLeft = -1;
    },

    setTempo: function(tempo) {

        var percentSamplesLeft = this.samplesLeft / (this.sampleRate / (this.tempo / 60));

        this.tempo = tempo;
        this.samplesLeft = (this.sampleRate / (this.tempo / 60)) * percentSamplesLeft;

    },

    generate: function() {

        // countdown - if no samples left then load new note
        this.samplesLeft--;
        if (this.samplesLeft <= 0) {
            this.loadNote();
        }

        if (this.active) {
            this.str.generate();
            this.sample = this.str.getMix() * 2;
        }
        else {
            this.sample = 0;
        }

    },

    getMix: function() {
        // return output
        return this.sample;
    },

    loadNote: function() {
        this.noteIndex++;

        // when the end of the song is reached check looping status
        if (this.noteIndex >= this.track.length) {

            this.noteIndex = 0;

            if (!this.isLooping) {
                this.endOfSong = true;
                this.stop();
            }

        }

        if (this.active) {

            var noteName = this.track[this.noteIndex].notes[this.voiceIndex];

            // if note exists
            if (noteName) {
                this.active = true;
                this.str.note(audioLib.Note.fromLatin(noteName).frequency());
            }
            else {
                this.active = false;
            }

            this.length = this.track[this.noteIndex].dur * 4
            * (this.notesPerBeat / this.beatsPerBar) / (this.tempo / 60);

            this.samplesLeft = this.length * this.sampleRate;

        }

    }

};


// make Voice class inherit from the audiolib.js Generator class
audioLib.generators('Voice', Voice);

function Beat(sampleRate, tempo, drumSample) {
    this.sampleRate = isNaN(sampleRate) || sampleRate === null ? this.sampleRate: sampleRate;
    this.tempo = isNaN(tempo) || tempo === null ? this.tempo: tempo;

    this.sampler = audioLib.Sampler(this.sampleRate);
    this.sampler.loadWav(atob(drumSample), true);
    this.volume = 1;
}

Beat.prototype = {
    sampleRate: 44100,
    mix: 0.5,
    sample: 0,
    length: -1,
    samplesLeft: -1,
    active: true,
    tempo: 120,
    // time signature
    notesPerBeat: 4,
    beatsPerBar: 4,
    volume: 1,
    ready: true,

    stop: function() {
        this.active = false;
        this.ready = false;
        this.samplesLeft = -1;
    },

    start: function() {
        this.sampler.noteOn(0);
        this.active = true;
    },

    setTempo: function(tempo) {

        var percentSamplesLeft = this.samplesLeft / (this.sampleRate / (this.tempo / 60));

        this.tempo = tempo;
        this.samplesLeft = (this.sampleRate / (this.tempo / 60)) * percentSamplesLeft;

    },

    generate: function() {

        // countdown
        this.samplesLeft--;
        if (this.samplesLeft <= 0) {
            this.samplesLeft = this.sampleRate / (this.tempo / 60);
            this.ready = true;
            this.sampler.noteOn(440);
        }

        if (this.active && this.ready) {
            this.sampler.generate();
            this.sample = this.sampler.getMix() * this.volume * .5;
        }
        else {
            this.sample = 0;
        }

    },

    getMix: function() {
        // return output
        return this.sample;
    }
};


// make Beat class inherit from the audiolib.js Generator class
audioLib.generators('Beat', Beat);
