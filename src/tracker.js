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
