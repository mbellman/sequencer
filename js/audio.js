// -- System utilities -- //
function unixTime() {
    return new Date().getTime();
}

// -- Sound data structure -- //

/**
 * Full audio sequence constructor
 */
function Sequence() {
    this.channel = [];
    this.tempo = 180;           // In BPM, where four 16th notes constitute a single beat

    this.playing   = false;

    this.build      = build;
    this.tempoTime  = tempoTime;
    this.columnTime = columnTime;
    this.play       = play;
    this.pause      = pause;
    this.restart    = restart;

    function build() {
        for(var c = 0 ; c < 8 ; c++) {
            this.channel.push(new Channel(selectedInstrument));
        }
    }

    /** Column time to AudioContext time **/
    function tempoTime(time) {
        var bps = this.tempo / 60;
        return (time*(1/bps))*0.25;
    }

    /** AudioContext time to column time **/
    function columnTime(time) {
        return time/this.tempoTime(1);
    }

    function play() {
        if(this.playing) {
            return;
        }

        this.playing   = true;
        
        var startTime = WebAudio.context.currentTime;
        var lastTime = 0;

        var lastNote;           // Keep track of farthest notes based on [lastTime]

        for(c in this.channel) {
            var channel = this.channel[c];
            var notes = channel.notes;
            var totalNotes = notes.length;

            for(var n = 0 ; n < totalNotes ; n++) {
                var note = notes[n];

                if(!note.disposed) {
                    var oscillator = new Oscillator(
                        frequency(88-note.pitch),
                        this.tempoTime(note.time) + startTime + 0.1,
                        this.tempoTime(note.time + note.duration) + startTime + 0.1
                    );
                    oscillator.connect();

                    if(lastTime < note.time + note.duration) {
                        // Tentatively mark this note as the last in the sequence
                        lastNote = oscillator;
                        lastTime = note.time + note.duration;
                    }
                }
            }
        }

        if(typeof lastNote != 'undefined') {
            if(lastNote.hasOwnProperty('bindEnd')) {
                // Bind sequence end handler to last note
                lastNote.bindEnd();
            }
        }
    }

    function pause() {
        this.playing   = false;
        this.startTime = 0;

        WebAudio.close();
    }

    function restart() {
        
    }
}

/**
 * Constructor for a single-instrument audio data channel
 */
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

/**
 * Individual note constructor
 */
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

// Legacy-friendly Web Audio API definitions
var AudioContext = (window.AudioContext || window.webkitAudioContext);

AudioContext.prototype.createGain = (AudioContext.prototype.createGain || AudioContext.prototype.createGainNode);

/**
 * Static instance of the page's Audio
 * Context and relevant components
 */
var WebAudio = {
    // System properties
    context     : null,
    nodes       : {},
    oscillators : new SoundQueue(),     // Registration list for active/queued oscillators
    samples     : new SoundQueue(),     // Registration list for active/queued samples

    // Methods

    /**
     * Starts the audio context
     */
    init : function() {
        this.context = new AudioContext();
    },

    /**
     * Connects a new node to the context destination,
     * or to _inputNode if specified and valid
     */
    addNode : function(name, node, _inputNode) {
        if(!!this.context) {
            if(typeof this.nodes[name] != 'undefined') {
                // Already declared a node with this name
                return;
            }
 
            this.nodes[name] = node;

            if(_inputNode == null) {
                // Connecting node directly to the context destination
                this.nodes[name].connect(this.context.destination);
            } else {
                if(typeof _inputNode != 'undefined') {
                    // Connecting node to another node
                    this.nodes[name].connect(_inputNode);
                }
            }
        }
    },

    /**
     * Disconnects a node (but leaves it
     * available to be reconnected)
     */
    removeNode : function(name) {
        if(!!this.context) {
            if(typeof this.nodes[name] != 'undefined') {
                if(this.nodes[name].hasOwnProperty('disconnect')) {
                    this.nodes[name].disconnect();
                }
            }
        }
    },
    
    /**
     * Immediately plays a tone, and returns the
     * associated oscillator object for deletion
     * (if [infinite] is set to true, the tone begins
     * without a definite stop time; otherwise
     * it stops automatically after 0.25 seconds)
     */
    tone : function(pitch, infinite) {
        if(!!this.context) {
            var _oscillator = new Oscillator(
                pitch,
                this.context.currentTime,
                (infinite ? null : WebAudio.context.currentTime+0.25)
            );
            _oscillator.connect();

            return _oscillator;
        }
        
        return false;
    },

    /**
     * Stops any sounds registered/queued in
     * [oscillators] and [samples]; does not
     * completely halt the audio context
     */
    close : function() {
        this.oscillators.dispose();
        this.samples.dispose();
    }
}


/**
 * Container/disposer for connected sounds
 */
function SoundQueue() {
    this.data = [];
}

SoundQueue.prototype.register = function(sound) {
    this.data.push(sound);
}

SoundQueue.prototype.dispose = function(s) {
    if(s == null) {
        // Dispose all registered sounds
        for(var d = 0, total = this.data.length ; d < total ; d++) {
            if(this.data[d].hasOwnProperty('dispose')) {
                this.data[d].dispose();
            }
        }
        
        this.data.length = 0;
    } else {
        if(typeof this.data[s] != 'undefined') {
            // Disposing a single sound in the bank
            if(this.data[s].hasOwnProperty('dispose')) {
                this.data[s].dispose();
            }
            this.data[s].splice(s, 1);
        }
    }
}


// -- Tones -- //
var tuningConst = Math.pow(2, 1/12);

var frequency = function(key) {
    return Math.pow(tuningConst, key-49) * 440;
}


/**
 * Constructor for oscillators
 */
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
        if(!!WebAudio.context) {
            this.object = WebAudio.context.createOscillator();
            this.object.type = this.wave;
            this.object.frequency.value = this.pitch;

            this.object.start = (this.object.start || this.object.noteOn);
            this.object.stop = (this.object.stop || this.object.noteOff);

            if(!!this.object.noteOn && !!this.object.noteOff)
                this.object.type = '2';
        }
    }
    
    function connect() {
        this.object.connect(WebAudio.nodes.gainNode);

        this.object.start(this.startTime);
        if(this.endTime != null) {
            this.object.stop(this.endTime);
        }
        
        WebAudio.oscillators.register(this);
    }
    
    // Mark this note as the last in the sequence;
    // update sequence.playing to false when ended
    function bindEnd() {
        this.object.onended = function(){
            sequence.playing = false;
        }
    }
    
    function dispose() {
        if(!!WebAudio.context) {
            this.object.stop(WebAudio.context.currentTime);
        }
    }
    
    this.create();
}

// -- Samples -- //