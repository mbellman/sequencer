// -- Sound data structure -- //

// Constructors
function Sequence() {
    this.channel = [];
    this.tempo = 180;       // In BPM, where four 16th notes constitute a single beat

    this.build = build;
    this.timer = timer;
    this.play  = play;
    this.stop  = stop;

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

        for(c in this.channel) {
            var channel = this.channel[c];
            var notes = channel.notes;
            var totalNotes = notes.length;
            
            for(var n = 0 ; n < totalNotes ; n++) {
                var note = notes[n];
                
                var oscillator = new Oscillator(
                    note.pitch,
                    this.timer(note.time),
                    this.timer(note.time + note.duration)
                );
                oscillator.connect();
            }
        }
    }
    
    function stop() {
        if(audioActive) {
            audioCtx.close();
            audioActive = false;
        }
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
        this.notes.splice(note, 1);
    }
}

function Note(_pitch, _time, _duration) {
    this.pitch    = _pitch;
    this.time     = _time;
    this.duration = _duration;
}


// ------------------------- //
// -- Web Audio API Tools -- //
// ------------------------- //
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
    
    function create() {
        this.object = audioCtx.createOscillator();
        this.object.type = this.wave;
        this.object.frequency.value = this.pitch;
    }
    
    function connect() {
        this.object.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        this.object.start(this.startTime);
        this.object.stop(this.endTime);
    }
    
    this.create();
}

// -- Samples -- //