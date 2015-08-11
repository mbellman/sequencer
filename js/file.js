// --- Plaintext sequence file creator --- //
var objectURL = null;

function textFile(content) {
    var fileData = new Blob([content], {type: 'text/plain'});

    if(objectURL != null) {
        window.URL.revokeObjectURL(objectURL);
    }

    objectURL = window.URL.createObjectURL(fileData);

    return objectURL;
}


// --- Save/load actions and tools --- //

function validSequenceData(data) {
    // Write this up later
    return true;
}

function saveSequence() {
    var seqData = sequence.serialize();

    objectURL = textFile(seqData);

    $('#save-link')[0].href = objectURL;
    $('#save-link')[0].click();
}

function loadSequence(seq) {
    if(validSequenceData(seq)) {
        // Clear music roll
        $('.note').remove();

        // Rebuild sequence data structure
        clearInterval(sequence.progInterval);
        sequence = null;
        sequence = new Sequence();
        sequence.build();

        seq = seq.split('<>');

        sequence.tempo = seq[0].split('/')[0];
        $('.tempo-form').val( sequence.tempo );

        var instruments = seq[0].split('/')[1].split('*');
        var channels = seq[1].split('+');
        channels.pop();

        for(c in channels) {
            var notes = channels[c].split('|');

            sequence.channel[c].instrument = parseInt(instruments[c]);

            if(notes.length > 0) {
                for(n in notes) {
                    if(!!notes[n].match('-')) {
                        var noteData = notes[n].split('-');

                        putNote(
                            parseFloat(noteData[1]),
                            parseInt(noteData[0]),
                            parseFloat(noteData[2])*30,
                            false,
                            (parseInt(c)+1)
                        );
                    }
                }
            }
        }

        activeChannel = -1;
        setChannel(1);

        // RENDER ACTION
        View.render.all();
    }
}


// --- File browser handler --- //

$(document).ready(function(){
    $('#open-link').on('change', function(){
        var file = $(this)[0].files[0];

        if(typeof file != 'undefined') {
            if(file.type == 'text/plain') {
                // Loading a regular plaintext file
                var fileReader = new FileReader();
                fileReader.onload = function(f) {
                    loadSequence(f.target.result);
                }
                fileReader.readAsText(file);
            } else {
                // Loading an invalid non-plaintext file
            }
        }
    });
});