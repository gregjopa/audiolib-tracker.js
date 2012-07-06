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
