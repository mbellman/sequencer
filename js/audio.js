// -- Sound data structure -- //

// Constructors
function Sequence() {
    this.channel = [];
    this.tempo = 180;       // In BPM, where four 16th notes constitute a single beat
    
    this.playing = false;

    this.build   = build;
    this.timer   = timer;
    this.play    = play;
    this.pause   = pause;
    this.restart = restart;

    function build() {
        for(var c = 0 ; c < 8 ; c++) {
            this.channel.push(new Channel(selectedInstrument));
        }
    }
    
    function timer(time) {
        var bps = this.tempo / 60;
        return (time*(1/bps))*1/4;
    }
    
    function play() {
        refreshAudioContext();
        
        this.playing = true;
        
        var lastNote = null;
        var lastTime = 0;

        for(c in this.channel) {
            var channel = this.channel[c];
            var notes = channel.notes;
            var totalNotes = notes.length;
            
            for(var n = 0 ; n < totalNotes ; n++) {
                var note = notes[n];
                
                if(!note.disposed) {
                     var oscillator = new Oscillator(
                        frequency(88-note.pitch),
                        this.timer(note.time),
                        this.timer(note.time + note.duration)
                    );
                    oscillator.connect();
                    
                    if(note.time + note.duration > lastTime) {
                        // Currently the farthest note in the sequence
                        lastNote = oscillator;
                    }
                }
            }
        }

        // Bind sequence end handler to the last note
        lastNote.bindEnd();
    }
        
    function pause() {
        if(this.playing) {
            this.playing = false;
            closeAudioContext();
        }
    }
        
    function restart() {
        
    }
}

function Channel(_instrument) {
    this.instrument = _instrument;
    this.notes = [];
    
    this.write = write;
    this.erase = erase;

    function write(pitch, time, duration) {
        this.notes.push(new Note(pitch, time, duration));
    }

    function erase(note) {
        this.notes[note].disposed = true;
    }
}

function Note(_pitch, _time, _duration) {
    this.pitch    = _pitch;
    this.time     = _time;
    this.duration = _duration;

    // When set to true, this note will no longer play in the audio
    // stream or become part of the serialized audio file output
    this.disposed = false;
}


// ------------------------- //
// -- Web Audio API Tools -- //
// ------------------------- //
var audioCtx;
var audioActive = false;

window.audioContext = (window.audioContext || window.webkitAudioContext);

function refreshAudioContext() {
    if(audioActive) {
        audioCtx.close();
    }

    audioCtx = new window.audioContext();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 1/3;
    
    audioActive = true;
}

function closeAudioContext() {
    if(audioActive) {
        audioCtx.close();
        audioActive = false;
    }
}

function playPreview(pitch, infinite) {
    if(!audioActive) {
        refreshAudioContext();
    }

    var preview = new Oscillator(pitch, audioCtx.currentTime, (infinite ? null : audioCtx.currentTime+0.25));
    preview.connect();
    
    return preview;
}

// -- Tones -- //
var tuningConst = Math.pow(2, 1/12);

var frequency = function(key) {
    return Math.pow(tuningConst, key-49) * 440;
}

function Oscillator(_pitch, _startTime, _endTime) {
    this.object    = null;
    this.wave      = 'square';
    this.pitch     = _pitch;
    this.startTime = _startTime;
    this.endTime   = _endTime;
    
    this.create  = create;
    this.connect = connect;
    this.bindEnd = bindEnd;
    this.dispose = dispose;
    
    function create() {
        this.object = audioCtx.createOscillator();
        this.object.type = this.wave;
        this.object.frequency.value = this.pitch;
    }
    
    function connect() {
        this.object.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        this.object.start(this.startTime);
        if(this.endTime != null) {
            this.object.stop(this.endTime);
        }
    }
    
    function bindEnd() {
        this.object.onended = function(){
            sequence.playing = false;
        }
    }
    
    function dispose() {
        if(audioActive) {
            this.object.stop(audioCtx.currentTime);
        }
    }
    
    this.create();
}

// -- Samples -- //