# audiolib-tracker.js
## Overview

audiolib-tracker.js is an audio-tracker built with the best practices of audiolib.js (buffer-based, uicontrols, etc...). This library is currently a work in progress.

## Example usage

```javascript
// example score
var sampleScore = [
  // track 1
  [
    {
        notes: ['C4', 'G4'],
        dur: 1 / 4
    },
    {
        notes: ['D4', 'A4'],
        dur: 1 / 4
    },
    {
        notes: ['E4', 'B4'],
        dur: 1 / 4
    },
    {
        notes: ['F4', 'C5'],
        dur: 1 / 4
    }
  ],
  
  // track 2
  [
    {
        notes: ['C5', 'G5', 'E5', 'C6', 'G6', 'E6'],
        dur: 1 / 2
    },
    {
        // rest
        notes: ['C5', 'G5', 'E5'],
        dur: 1 / 2
    }
  ]

]


``` 

```javascript
var tracker = new Tracker(sampleScore);

// add tracks w/ multiple voices per track
// track 1
tracker.addVoice(0, 0);
tracker.addVoice(0, 1);

// track 2 (has chords w/ max of 5 notes so 5 voices are added)
tracker.addVoice(1, 0);
tracker.addVoice(1, 1);
tracker.addVoice(1, 2);
tracker.addVoice(1, 3);
tracker.addVoice(1, 4);
tracker.addVoice(1, 5);

// add optional metronome drum samples defined w/ base64 encoded string
tracker.addMetronome(samples.snare);

// build audio
tracker.buildAudio();

// and rock!
tracker.play();
```