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
