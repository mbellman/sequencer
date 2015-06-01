// ---------------------------------------
// -------------- Variables --------------
var init = false;

var page = {
    $window    : $(window),
    width      : $(window).width(),
    height     : $(window).height(),
    $body      : $('body'),
    $sequencer : $('.sequencer .content'),
    $piano     : $('.piano'),
    $music     : $('.music')
}

var instruments = {
    1 : 'square',
    2 : 'sawtooth',
    3 : 'triangle',
    4 : 'piano'
}

var sequence;

var activeChannel = 1;
var selectedTool = 1;
var selectedInstrument = 1;

var pianoRoll = true;       // Viewing piano roll
var extendedView = true;    // Viewing extended view

var pianoPreview = false;   // Set to true on piano key mousedown so rollovers will play new tones (false on mouseup)

var notesSelected = false;  // Group of notes selected
var movingNotes = false;    // Moving notes around

var playOffset = 0;         // Offset from which to start playing

var keys = {
    SHIFT : false,
    CTRL  : false
}

// ---------------------------------------
// -------------- Handlers ---------------
function handleResize() {
    page.width  = page.$window.width();
    page.height = page.$window.height();

    if(init) {
        updateCorners();
        toolbar.resize();
        lockScrollBottom();
    }
}

function updateCorners() {
    var br = {
        s : 0.02,
        b : 0.019
    }

    $('main .sequencer').css({
        'border-top-left-radius'     : page.width*br.s + 'px',
        'border-top-right-radius'    : page.width*br.s + 'px',
        'border-bottom-left-radius'  : page.width*br.s + 'px',
        'border-bottom-right-radius' : page.width*br.s + 'px'
    });

    $('.sequencer .content').css({
        'border-top-left-radius'     : page.width*br.b + 'px',
        'border-top-right-radius'    : page.width*br.b + 'px',
        'border-bottom-left-radius'  : page.width*br.b + 'px',
        'border-bottom-right-radius' : page.width*br.b + 'px'
    });
}

// ---------------------------------------
// -------------- Interface --------------
var toolbar;
var toolbarActive = false;
var activeDrop = -1;

var tools = {
    File    : {
        'New' : function() {
        },

        'Save' : function() {
        },

        'Open' : function() {
        },

        'br' : null,

        'Play [P]' : function() {
            sequence.play();
            resetNavDrops();
        },

        'Pause [P]' : function() {
            sequence.pause();
            resetNavDrops();
        },

        'Restart [R]' : function() {
            sequence.restart();
            resetNavDrops();
        },

        'br2' : null,

        'Demos' : function() {
        },
    },

    Tools   : {
        'Notate [N]' : function() {
            selectedTool = 1;
            resetNavDrops();
            page.$music.removeClass('select drag');
            disableSelections();
        },

        'Erase [E]' : function() {
            selectedTool = 2;
            resetNavDrops();
            page.$music.removeClass('select drag');
            disableSelections();
        },

        'Select [S]' : function() {
            selectedTool = 3;
            resetNavDrops();
            page.$music.removeClass('drag').addClass('select');
            $('.select-bar').css('display', 'block');
        },

        'Drag Area [D]' : function() {
            selectedTool = 4;
            resetNavDrops();
            page.$music.removeClass('select').addClass('drag');
            disableSelections();
        },
    },

    Options : {
        'Tempo' : function() {
        },

        'Time Signature' : function() {
        },

        'Instruments' : function() {
        },
        
        'br' : null,
        
        'Play from here [SPACE]' : function(){
            focusPlayOffset();
        },
        
        'Go to start [G]' : function(){
            jumpToStart();
        }
    },

    Channel : {
        'Channel 1 [1]' : function(){
        },

        'Channel 2 [2]' : function(){
        },

        'Channel 3 [3]' : function(){
        },

        'Channel 4 [4]' : function(){
        },

        'Channel 5 [5]' : function(){
        },

        'Channel 6 [6]' : function(){
        },

        'Channel 7 [7]' : function(){
        },

        'Channel 8 [8]' : function(){
        },
    },

    Toggle  : {
        'Piano Roll' : function() {
            if(pianoRoll) {
                pianoRoll = false;
                page.$piano.translateXY('-100px', '0px');
                page.$music.translateXY('0px', '0px');
            } else {
                pianoRoll = true;
                page.$piano.translateXY('0px', '0px');
                page.$music.translateXY('100px', '0px');
            }
        },

        'Extended View' : function() {
        },

        'Measure Breaks' : function() {
        }
    }
}

function Toolbar(bar, dropdowns) {
    this.target  = bar;
    this.drops   = dropdowns;
    this.options = {};
    this.dropTimers = [];
    this.length  = 0;
}

Toolbar.prototype.add = function(nav, text) {
    this.options[nav] = {
        element : $('<div/>', {
            class : 'nav'
        }).text(text).appendTo(this.target),

        drop    : $('<div/>', {
            class: 'nav-drop'
        }).appendTo(this.drops)
    }

    this.dropTimers.push(null);

    this.length++;
}

Toolbar.prototype.dropItem = function(nav, text, callback) {
    if(typeof callback == 'function') {
        var item = $('<div/>', {
            class : 'item'
        }).text(text).click(callback);
    } else {
        var item = $('<div/>', {
            class : 'break'
        });
    }

    this.options[nav].drop.append(item);
}

Toolbar.prototype.expandDrop = function(index) {
    if(activeDrop != index) {
        var nav = $('.ui-bar .nav').eq(index);

        toolbar.resize();
        toolbar.hideOtherDrops(index);

        activeDrop = index;

        var dropdown = $('.ui-dropdowns .nav-drop').eq(index);

        dropdown.removeClass('drop-transition');
        dropdown.scale(0).css({
            'opacity' : '0',
            'display' : 'block'
        });
        dropdown.addClass('drop-transition');

        clearTimeout(this.dropTimers[index]);
        this.dropTimers[index] = setTimeout(function(){
            dropdown.scale(1).css('opacity', '1');
            nav.addClass('selected');
        }, 25);
    }
}

Toolbar.prototype.hideDrop = function(index) {
    var nav = $('.ui-bar .nav').eq(index);
    nav.removeClass('selected');

    $('.ui-dropdowns .nav-drop').eq(index).css('opacity', '0');

    clearTimeout(this.dropTimers[index]);
    this.dropTimers[index] = setTimeout(function(){
        $('.ui-dropdowns .nav-drop').eq(index).css('display', 'none').scale(0);
    }, 550);
}

Toolbar.prototype.hideOtherDrops = function(index) {
    for(var i = 0 ; i < this.length ; i++) {
        if(i != index || index == null) {
            toolbar.hideDrop(i);
        }
    }
}
Toolbar.prototype.resize = function() {
    $('.ui-bar .nav').each(function(index){
        var nav = $(this);
        var xOff = nav.position().left;

        $('.ui-dropdowns .nav-drop').eq(index).css('left', xOff + 'px');
    });
}

function generateUI() {
    // Building toolbar
    toolbar = new Toolbar($('.ui-bar'), $('.ui-dropdowns'));

    for(var key in tools) {
        var prop = key.toLowerCase();
        toolbar.add(prop, key);

        for(var subKey in tools[key]) {
            toolbar.dropItem(prop, subKey, tools[key][subKey]);
        }
    }
    
    // Building piano keys
    var blackKeys = [2, 4, 6, 9, 11];
    var C = 7;

    for(var k = 0 ; k < 88 ; k++) {
        var key = $('<div/>', {
            class      : 'key',
            'data-key' : k
        });
        
        var octaveKey = k%12;
        
        for(var b = 0 ; b < blackKeys.length ; b++) {
            if(octaveKey == blackKeys[b]) {
                key.addClass('black');
                break;
            }
        }
        
        if(octaveKey == 0) {
            // C note
            key.text('C' + C);
            C--;
        }
        
        page.$piano.append(key);
    }
}

function resetNavDrops() {
    toolbar.hideOtherDrops();
    toolbarActive = false;
    $('.nav').removeClass('active');
    activeDrop = -1;
}

// ---------------------------------------
// -------------- Music roll -------------
var roll = {
    scroll : {
        x: 0,
        y: 0
    },

    clipboard : []
}

var tagViewTimer;

/**
 * Simple constructor for note data held in memory for pasting
 */
function NoteCopy(_pitch, _time, _duration) {
    this.pitch    = _pitch;
    this.time     = _time;
    this.duration = _duration;
}


function getTile(mouseX, mouseY) {
    var container = $('.music').offset();

    return {
        x: Math.floor( (mouseX - container.left)/30 ),
        y: Math.floor( (mouseY - container.top)/30 )
    }
}

function putPreviewNote(x, y) {
    var pNote = $('<div/>', {
        class : 'preview-note',
        css   : {
            width : '0px',
            top   : (y*30)+8 + 'px',
            left  : x*30 + 'px',
        }
    });

    page.$music.append(pNote);

    return pNote;
}

function putNote(x, y, width, animate) {
    var note = $('<div/>', {
        class : 'note channel-' + activeChannel,
        css   : {
            width : width + 'px',
            top   : (y*30)+5 + 'px',
            left  : x*30 + 'px'
        }
    });
    
    note.attr('data-channel', activeChannel)
        .attr('data-note', sequence.channel[activeChannel-1].notes.length);
    
    if(!!animate) {
        note.scale(0).css('opacity', '0');
    }

    page.$music.append( note.addClass(instruments[selectedInstrument]) );

    note.delay(25).queue(function(){
        $(this).scale(1).css('opacity', '1');
        $(this).dequeue();
    });
    
    var time     = x;
    var pitch    = y;
    var duration = Math.ceil( width/30 );
    
    sequence.channel[activeChannel-1].write(pitch, time, duration);
}

function eraseNote(element) {
    element.off('mouseenter').trigger('mouseleave');                    // Force unhover
    element.addClass('erase erased');
    element.css('background-color', element.css('background-color'));   // Lock the erased state

    var note = parseInt(element.attr('data-note'));
    sequence.channel[activeChannel-1].erase(note);

    element.css('opacity', '0').scale(0.5).delay(550).queue(function(){
        $(this).dequeue();
        $(this).remove();
    });
}

/**
 * Runs after scrolling has stopped (determined by a
 * timer delay). Labels all notes within approximately
 * viewable range with a special class to optimize
 * note selection range boundary clip checks.
 */
function tagViewableNotes() {
    $('.note').removeClass('inView');
    
    $('.note.channel-' + activeChannel).each(function(){
        var note = $(this);
        var offset = note.offset();
        var width = note.width();

        // If note isn't in view, we won't tag it as such
        if(offset.top + 21 < 0 || offset.top > page.height) return;
        if(offset.left + width < 0 || offset.left > page.width) return;

        note.addClass('inView');
    });
}

/**
 * Creates a new selection range element
 */
function startSelection(x, y) {
    var container = page.$music.offset();

    var selectArea = $('<div/>', {
        class : 'selection',
        css   : {
            width  : '0px',
            height : '0px',
            top    : y-container.top  + 'px',
            left   : x-container.left + 'px'
        }
    }).appendTo(page.$music);

    return {
        element  : selectArea,
        initTop  : y-container.top,
        initLeft : x-container.left
    };
}

/**
 * Grabs any notes clipped by the selection range
 */
function selectNotes(range) {
    if(!keys.SHIFT) {
        notesSelected = false;
    }

    $('.note.channel-' + activeChannel + '.inView').each(function(){
        var note = $(this);
        var pos = note.position();

        var el = {
            jq : note,
            x  : pos.left,
            y  : pos.top,
            w  : note.width()
        }
        
        var inRange = false;

        if( (range.x < el.x && range.x+range.w > el.x) || (range.x > el.x && range.x < el.x+el.w) ) {
            if( (range.y < el.y && range.y+range.h > el.y) || (range.y > el.y && range.y < el.y+21) ) {
                // Element within selection range
                inRange = true;
                notesSelected = true;
                el.jq.addClass('selected');
            }
        }
        
        if(!keys.SHIFT) {
            if(!inRange) el.jq.removeClass('selected');
        }
    });
}

/**
 * Turns off selection mode
 */
function disableSelections() {
    $('.note').removeClass('selected');
    $('.select-bar').css('display', 'none');
}

/**
 * Returns a pseudo note object representing a given
 * note (referenced by element) shifted by deltaX/deltaY
 */
function noteDelta(element, deltaX, deltaY) {
    var note = {
        channel : parseInt(element.attr('data-channel')),
        id      : parseInt(element.attr('data-note')),
        dTime   : 0,
        dPitch  : 0
    }
    
    note.data = sequence.channel[note.channel-1].notes[note.id];
    
    note.dTime  = note.data.time + deltaX;
    note.dPitch = note.data.pitch + deltaY;
    
    return note;
}

/**
 * Move a group of selected notes
 */
function shiftGroupXY(deltaX, deltaY) {
    var limit = false;
    
    // First we check to make sure no notes are
    // being moved outside of the valid range
    $('.note.selected').each(function(){
        var newNote = noteDelta($(this), deltaX, deltaY);
        
        if(newNote.dTime < 0 || newNote.dPitch > 88 || newNote.dPitch < 0) {
            limit = true;
        }
    });
    
    if(limit) {
        // Can't move notes outside of music roll boundaries
        return;
    }
    
    // Check passed, so actually move the notes this time!
    $('.note.selected').each(function(){
        var newNote = noteDelta($(this), deltaX, deltaY);
        
        newNote.data.time  = newNote.dTime;
        newNote.data.pitch = newNote.dPitch;
        
        $(this).css({
            'top'  : 5 + newNote.data.pitch*30 + 'px',
            'left' : newNote.data.time*30 + 'px'
        });
    });
}

/**
 * Copy a group of notes to the "clipboard"
 */
function copyNotes() {
    if(selectedTool == 3 && $('.note.selected').length > 0) {
        roll.clipboard.length = 0;

        var firstNoteX = -1;    // Temporary init value

        $('.note.selected').each(function(){
            var el = $(this);
            note = {
                channel : parseInt(el.attr('data-channel')),
                id      : parseInt(el.attr('data-note'))
            };

            note.data = sequence.channel[note.channel-1].notes[note.id];

            if(firstNoteX == -1) {
                // Begin tracking note time positions
                firstNoteX = note.data.time;
            } else {
                if(note.data.time < firstNoteX) {
                    // Keep track of the earliest note in the copied selection
                    firstNoteX = note.data.time;
                }
            }

            roll.clipboard.push(new NoteCopy(note.data.pitch, note.data.time, note.data.duration));
        });
        
        for(var n = 0, totalCopies = roll.clipboard.length ; n < totalCopies ; n++) {
            // Resetting time data relative to the first note in the copied group
            roll.clipboard[n].time -= firstNoteX;
        }
    }
}

/**
 * Paste a group of notes stored in the "clipboard"
 * to the current focused column (selection mode)
 */
function pasteNotes() {
    if(selectedTool == 3 && roll.clipboard.length > 0) {
        // Ensure we have a view of where we're pasting the notes
        if($('.select-bar').is(':visible')) {
            var startX = Math.floor( $('.select-bar').position().left/30 );

            for(var n = 0, totalCopies = roll.clipboard.length ; n < totalCopies ; n++) {
                var copy = roll.clipboard[n];

                putNote(
                    copy.time + startX,
                    copy.pitch,
                    copy.duration*30,
                    true
                );
            }
        }
 
        // Refresh viewable notes
        setTimeout(tagViewableNotes, 250);
    }
}

/**
 * Deletes a group of selected notes
 */
function deleteNotes() {
    if(selectedTool == 3 && $('.note.selected').length > 0) {
        $('.note.selected').each(function(){
            $(this).removeClass('selected');
            eraseNote($(this));
        });
    }
}

/**
 * Changes scroll position
 */
function scrollMusicTo(x, y) {
    page.$piano.moveXY('0',      35+y + 'px');
    page.$music.moveXY(x + 'px', 35+y + 'px');

    clearTimeout(tagViewTimer);
    tagViewTimer = setTimeout(tagViewableNotes, 250);
}

/**
 * Prevent music roll from being
 * scrolled past the bottom edge
 */
function lockScrollBottom() {
    var limit = -1*(2640 - page.$sequencer.height())-35;

    if(roll.scroll.y <= limit) {
        page.$piano.css('top', limit+35);
        page.$music.css('top', limit+35);
    }
}

/**
 * Brings the play start bar into view (setting it
 * as close to the beginning of the view as possible)
 */
function focusPlayOffset() {
    var scrollX = Math.abs(roll.scroll.x);

    var newOffset = Math.ceil(scrollX/30);
    playOffset = newOffset;

    if(playOffset > 0) {
        $('.play-bar').css('left', (playOffset*30 - 2) + 'px');
    } else {
        playOffset = 0;
        $('.play-bar').css('left', '0px');
    }
}

/**
 * Goes to the play start line
 */
function jumpToStart() {
    margin = 0;

    if(playOffset > 0) {
        var margin = 2;
    }

    scrollMusicTo(-30*playOffset + margin, roll.scroll.y);
    roll.scroll.x = -30*playOffset + margin;
}

// -----
// Initialization
function generateSequence() {
    sequence = new Sequence();
    sequence.build();
}

function startAudioContext() {
    if(WebAudio.context == null) {
        WebAudio.init();
        WebAudio.addNode('gainNode', WebAudio.context.createGain());
        WebAudio.nodes.gainNode.gain.value = 1/3;
    }
}
// -----

// ---------------------------------------
// -------------- DOM/Events -------------
var mouseDrag = false, dragTimer = null;
var noteAction = false, noteActionTimer = null;
var noteGrab = false, grabTimer = null;
var playDrag = false, playDragTimer = null;
var erasing = false;

function resetMouseDrag()  { mouseDrag = false; }
function resetNoteAction() { noteAction = false;}
function resetNoteGrab()   { noteGrab = false; }
function resetPlayDrag()   { playDrag = false; }

$(document).ready(function(){

    // Build UI layout
    generateUI();

    
    /** --- Event handlers/UI system --- **/

    // Show dropdown menu
    $('.nav').click(function(){
        toolbarActive = true;
        toolbar.expandDrop( $(this).index() );
        $('.nav').addClass('active');
    });

    // Shop dropdown on hover if actively looking through options
    $('.nav').on('mouseenter', function(){
        if(toolbarActive) {
            var i = $(this).index();
            toolbar.expandDrop(i);
        }
    });

    // Remove nav dropdowns if clicking outside of nav area
    $('*').click(function(e){
        e.stopPropagation();

        if(!$(this).hasClass('nav') && !$(this).hasClass('item')) {
            toolbar.hideOtherDrops();
            activeDrop = -1;
            $('.nav').removeClass('active');

            setTimeout(function(){
                toolbarActive = false;
            }, 25);
        }
    });
    
    // Holding a piano key
    $('.piano .key').on('mousedown', function(){
        var key = $(this);

        var note = parseInt(key.attr('data-key'));
        var pSound = WebAudio.tone(frequency(88-note), true);
        
        pianoPreview = true;
        
        page.$body.on('mouseup', function(){
            page.$body.off('mouseup');
            pianoPreview = false;
        });
        
        key.on('mouseup mouseleave', function(){
            key.off('mouseup mouseleave');
            pSound.dispose();
        });
    }).on('mouseenter', function(){
        if(pianoPreview) {
            var key = $(this);
            
            var note = parseInt(key.attr('data-key'));
            var pSound = WebAudio.tone(frequency(88-note), true);
            
            page.$body.on('mouseup', function(){
                page.$body.on('mouseup');
                if(!!pSound.dispose) pSound.dispose();
            });

            key.on('mouseup mouseleave', function(){
                key.off('mouseup mouseleave');
                if(!!pSound.dispose) pSound.dispose();
            });
        }
    });

    // Placing a single note
    page.$music.click(function(e){
        if(!toolbarActive && !mouseDrag && !noteAction && !noteGrab && !playDrag) {
            var mouseX = e.clientX;
            var mouseY = e.clientY;

            var tile = getTile(mouseX, mouseY);

            switch(selectedTool) {
                case 1:     // Placing a new note
                    putNote(tile.x, tile.y, 30, true);
                    WebAudio.tone(frequency(88-tile.y), false);
                    setTimeout(tagViewableNotes, 250);
                    break;
            }
        }
    });

    page.$music.on('mouseenter', function(){
        if(selectedTool == 3 && !movingNotes && $('.selection').length == 0) {
            // Show current focused column in selection mode
            $('.select-bar').css('display', 'block');
        }
    });

    page.$music.on('mouseleave', function(){
        // Hide focused column indicator (selection mode)
        $('.select-bar').css('display', 'none');
    });

    page.$music.on('mousemove', function(e){
        // Update focused column position (even if it's not necessarily visible)
        var tileX = getTile(e.clientX, e.clientY).x;
        $('.select-bar').css('left', 8 + tileX*30 + 'px');
    });

    // Hovering over a note - preparing for note interactions
    $(document).on('mouseenter', '.music .note', function(){
        if(!toolbarActive && !playDrag) {
            var el = $(this);

            if(selectedTool == 1) {
                // Notate tool active; indicate
                // note can be interacted with
                el.css('opacity', '0.5');
                var note = {x: el.offset().left, w: el.width()};

                noteAction = true;

                page.$body.on('mousemove', function(e){
                    if((note.x + note.w) - e.clientX < 15) {
                        el.addClass('stretch');
                    } else {
                        el.removeClass('stretch');
                    }
                });
            }
            
            if(selectedTool == 2) {
                // Preparing to erase note
                el.addClass('erase');

                if(erasing) {
                    // Removing note
                    eraseNote(el);
                }
            }
            
            if(selectedTool == 3 && notesSelected && el.hasClass('selected')) {
                noteAction = true;
            }
        }
    });
    
    // Mouse off the note - restoring normal functionality
    $(document).on('mouseleave', '.music .note', function(){
        if(!toolbarActive && !playDrag && selectedTool == 1) {
            if(!noteGrab && $('.preview-note').length == 0) {
                // In notate mode, neither moving any notes nor
                // creating new ones, so we remove the stretch
                // indicator handler
                page.$body.off('mousemove');
            }
        }
        
        if(!$(this).hasClass('erased')) {
            $(this).css('opacity', '1.0').removeClass('stretch erase');
        }

        noteAction = false;
    });
    
    // Note manipulation
    $(document).on('mousedown', '.music .note', function(e){
        if(!toolbarActive && noteAction && selectedTool == 1) {
            // Dragging or stretching a note (processed
            // by the mousemove handler below)
            var el = $(this);
            var note = {
                x    : el.offset().left,
                y    : el.offset().top,
                w    : el.width(),
                id   : parseInt(el.attr('data-note'))
            };

            note.data  = sequence.channel[activeChannel-1].notes[note.id];
            note.tileX = Math.round( parseInt(el.css('left'))/30 );
            note.tileY = Math.round( parseInt(el.css('top'))/30 );
            
            WebAudio.tone(frequency(88-note.data.pitch), false);

            clearTimeout(grabTimer);
            noteGrab = true;

            var mouse = {x: e.clientX, y: e.clientY}
            var delta = {x: 0, y: 0}
            var xTileDiff = getTile(e.clientX, e.clientY).x - note.tileX;
            var action = ((note.x + note.w) - mouse.x < 15) ? 'stretch' : 'move';

            page.$body.on('mousemove', function(e){
                delta.x = e.clientX - mouse.x;
                delta.y = e.clientY - mouse.y;

                switch(action) {
                    case 'move':    // Dragging the note around
                        
                        var tile = getTile(e.clientX, e.clientY);

                        var newTop  = 5 + tile.y*30;
                        var newLeft = (tile.x-xTileDiff)*30;

                        var newTime  = Math.floor(newLeft/30);
                        var newPitch = Math.floor(newTop/30);

                        if(newTime != note.data.time && newTime >= 0) {
                            note.data.time = newTime;
                            el.css('left', newLeft + 'px');
                        }

                        if(newPitch != note.data.pitch && newPitch >= 0 && newPitch <= 88) {
                            WebAudio.tone(frequency(88-newPitch), false);
                            note.data.pitch = newPitch;
                            el.css('top', newTop + 'px');
                        }
                        break;

                    case 'stretch': // Changing the note's length

                        var newLength   = note.w + Math.round(delta.x/30)*30;
                        var newDuration = Math.round(newLength/30);

                        if(newDuration != note.data.duration && newDuration >= 1) {
                            note.data.duration = newDuration;
                            el.width(newLength + 'px');
                        }

                        break;
                }
            });
            
            page.$body.on('mouseup', function(){
                page.$body.off('mousemove mouseup');
                el.removeClass('stretch');
                grabTimer = setTimeout(resetNoteGrab, 50);
            });
        }
        
        if(!toolbarActive && selectedTool == 2) {
            // Erasing a single note via click
            eraseNote($(this));
        }
        
        if(!toolbarActive && selectedTool == 3 && keys.SHIFT) {
            // Selecting an individual note via SHIFT-click
            notesSelected = true;
            noteAction = true;
            $(this).addClass('selected');
        }
    });

    // Dragging along the music roll
    page.$music.on('mousedown', function(e){
        if(toolbarActive || (selectedTool == 1 && (noteAction || noteGrab)) || (selectedTool == 3 && noteAction && keys.SHIFT)) {
            // Toolbar being open means we do nothing.

            // If notate tool is active and we're already hovering
            // over a note or directly manipulating it, do nothing.
            
            // If selection tool is active and we're manually
            // selecting single notes with SHIFT, do nothing.
            return;
        }

        var mouseX = e.clientX;
        var mouseY = e.clientY;
        var delta = {x: 0, y: 0};

        var tile = getTile(mouseX, mouseY);

        switch(selectedTool) {
            case 1:     // Placing a new note
                var pNote  = putPreviewNote(tile.x, tile.y);
                var pSound = WebAudio.tone(frequency(88-tile.y), true);
                break;
            case 2:     // Erasing notes
                erasing = true;
                break;
            case 3:     // Starting an area selection

                $('.select-bar').css('display', 'none');    // Temporarily disable column indicator (selection mode)

                if(!(selectedTool == 3 && notesSelected && noteAction) || keys.SHIFT) {
                    // Only start the new selection if we aren't
                    // already preparing to move a selected group
                    if(!keys.SHIFT) {
                        $('.note').removeClass('selected');
                    }

                    var selectArea = startSelection(mouseX, mouseY);
                    var selectRange = {
                        x: 0,
                        y: 0,
                        w: 0,
                        h: 0
                    }
                } else {
                    // If we're performing a group movement
                    // action, gear up the necessary values
                    movingNotes = true;
                    var updateTile = {x: tile.x, y: tile.y};      // Track movement of note group
                }
                break;
        }

        page.$body.on('mousemove', function(e){
            clearTimeout(dragTimer);
            mouseDrag = true;

            var nMouseX = e.clientX;
            var nMouseY = e.clientY;
            var newTile = getTile(nMouseX, nMouseY);

            delta.x = nMouseX - mouseX;
            delta.y = nMouseY - mouseY;

            // Drag actions
            switch(selectedTool) {
                case 1:     // Previewing an elongated new note
                    pNote.css('width', 30+(30*(newTile.x - tile.x)) + 'px');
                    break;
                case 2:     // Erasing any notes covered by the mouse (handled separately)
                    break;
                case 3:     // Selecting notes

                    if(!movingNotes) {
                        // Creating a new selection range
                        if(delta.x < 0) {
                            selectArea.element.css('left', selectArea.initLeft + delta.x + 'px');
                            selectRange.x = selectArea.initLeft + delta.x;
                        } else {
                            selectArea.element.css('left', selectArea.initLeft + 'px');
                            selectRange.x = selectArea.initLeft;
                        }

                        if(delta.y < 0) {
                            selectArea.element.css('top', selectArea.initTop + delta.y + 'px');
                            selectRange.y = selectArea.initTop + delta.y;
                        } else {
                            selectArea.element.css('top', selectArea.initTop + 'px');
                            selectRange.y = selectArea.initTop;
                        }

                        selectArea.element.css({
                            'width'  : Math.abs(delta.x) + 'px',
                            'height' : Math.abs(delta.y) + 'px'
                        });

                        selectRange.w = Math.abs(delta.x);
                        selectRange.h = Math.abs(delta.y);

                        selectNotes(selectRange);
                    } else {
                        // Dragging a group of selected notes
                        var newTile = getTile(nMouseX, nMouseY);
                        
                        if(newTile.x != updateTile.x) {
                            shiftGroupXY(newTile.x - updateTile.x, 0);
                            updateTile.x = newTile.x;
                        }
                        
                        if(newTile.y != updateTile.y) {
                            shiftGroupXY(0, newTile.y - updateTile.y);
                            updateTile.y = newTile.y;
                        }
                    }

                    break;

                case 4:     // Dragging the music roll view

                    var newX = roll.scroll.x + delta.x;
                    var newY = roll.scroll.y + delta.y;
                    var yLimit = -1*(2640 - page.$sequencer.height()) - 35;

                    if(newX >= 0) {
                        roll.scroll.x -= newX;
                        newX = 0;
                    }

                    if(newY >= 0) {
                        roll.scroll.y -= newY;
                        newY = 0;
                    }

                    if(newY <= yLimit) {
                        roll.scroll.y -= (newY - yLimit);
                        newY = yLimit;
                    }

                    scrollMusicTo(newX, newY);
                    break;
            }
        });

        page.$body.on('mouseup', function(e){
            page.$body.off('mousemove mouseup');
            
            if(selectedTool == 1) {
                // Removing preview note/stopping preview sound
                pNote.remove();
                if(!!pSound.dispose) pSound.dispose();
            } else
            if(selectedTool == 2) {
                // Stopping erasure
                erasing = false;
            } else
            if(selectedTool == 3) {
                // Rigorous select area removal
                page.$music.find('.selection').remove();
                $('.select-bar').css('display', 'block');    // Show column indicator again (selection mode)
                
                movingNotes = false;
            }

            if(!mouseDrag) {
                // Mouse was not dragged after being held, so the
                // action will be processed by the click handler
                // (only really applies 
                return;
            }

            var fMouseX = e.clientX;
            var fMouseY = e.clientY;

            var finalTile = getTile(fMouseX, fMouseY);

            // Release actions (erasure is omitted since it triggers no new action)
            switch(selectedTool) {
                case 1:     // Placing an elongated new note
                    if(finalTile.x >= tile.x) {
                        putNote(tile.x, tile.y, 30+(30*(finalTile.x - tile.x)), true);
                        setTimeout(tagViewableNotes, 250);
                    }
                    break;
                case 3:     // Selecting notes (group all selected)
                    break;
                case 4:     // Stopping drag
                    roll.scroll.x += (fMouseX - mouseX);
                    roll.scroll.y += (fMouseY - mouseY);
                    
                    if(roll.scroll.x >= 0) roll.scroll.x = 0;
                    if(roll.scroll.y >= 0) roll.scroll.y = 0;

                    break;
            }

            dragTimer = setTimeout(resetMouseDrag, 250);
        });
    });

    // Dragging play start line
    $('.play-bar').on('mousedown', function(e){
        if(toolbarActive) {
            return;
        }

        e.stopPropagation();
        
        clearTimeout(playDragTimer);
        playDrag = true;

        var mouseX = e.clientX;
        var newOffset = 30*playOffset;

        page.$body.on('mousemove', function(e){
            var deltaX = e.clientX - mouseX;

            newOffset = 30*playOffset + 30*Math.round(deltaX/30);

            if(newOffset > 0) {
                $('.play-bar').css('left', newOffset-2 + 'px');
            } else {
                $('.play-bar').css('left', '0px');
            }
        });

        page.$body.on('mouseup', function(e){
            page.$body.off('mousemove mouseup');

            playOffset = Math.floor(newOffset/30);

            if(playOffset < 0) {
                playOffset = 0;
            }
            
            playDragTimer = setTimeout(resetPlayDrag, 200);
        });
    });

    // Prevent other default actions
    page.$body.on('mousedown', function(e){
        e.preventDefault();
    });

    $(document).on('keydown', function(e){
        if(!init) {
            return;
        }

        var tools = $('.ui-dropdowns .nav-drop').eq(1).find('.item');
        var channels = $('.ui-dropdowns .nav-drop').eq(3).find('.item');
        
        switch(e.which) {
            // File
            case 80:    // Play or pause
                if(sequence.playing) {
                    sequence.pause();
                } else {
                    sequence.play();
                }
                break;
            case 82:    // Restart from beginning
                sequence.restart();
                break;
        
            // Tools
            case 78:    // Notate
                tools.eq(0).click();
                break;
            case 69:    // Erase
                tools.eq(1).click();
                break;
            case 83:    // Select
                tools.eq(2).click();
                break;
            case 68:    // Drag
                tools.eq(3).click();
                break;
                
            // Other
            case 16:    // SHIFT
                keys.SHIFT = true;
                break;
            case 17:    // CTRL
                keys.CTRL = true;
                break;
            case 32:    // SPACE
                focusPlayOffset();
                break;
            case 71:    // G
                jumpToStart();
                break;
            case 67:    // C
                copyNotes();
                break;
            case 86:    // V
                pasteNotes();
                break;
            case 88:    // X
                deleteNotes();
                break;
        }
    });
    
    $(document).on('keyup', function(e){
        switch(e.which) {
            case 16:    // SHIFT
                keys.SHIFT = false;
                break;
            case 17:    // CTRL
                keys.CTRL = false;
                break;
        }
    });
    
    $(document).on('mousewheel', function(e){
        roll.scroll.x += e.deltaX*10;
        roll.scroll.y += e.deltaY*10;

        if(roll.scroll.x > 0) roll.scroll.x = 0;
        if(roll.scroll.y > 0) roll.scroll.y = 0;
        if(roll.scroll.y < -2640 + page.$sequencer.height()-35) roll.scroll.y = -2640 + page.$sequencer.height()-35;
        
        scrollMusicTo(roll.scroll.x, roll.scroll.y);
    });
    
    // Set music roll starting position (C5 at top)
    scrollMusicTo(0, -24*30);
    roll.scroll.y = -24*30;

    // Create new sequence data
    generateSequence();

    // Initialize Web Audio
    page.$window.on('mousemove mousedown', function(){
        page.$window.off('mousemove mousedown');
        startAudioContext();
    });
    
    // Mark initialization as done
    init = true;

    // Bind resize handler/trigger resize
    page.$window.resize(handleResize).resize();

    // Fade in
    $('.sequencer').css('opacity', '1');
});

$.fn.scale = function(ratio) {
    var _ = this;

    _.css({
        '-ms-transform'     : 'scale(' + ratio + ')',
        '-o-transform'      : 'scale(' + ratio + ')',
        '-moz-transform'    : 'scale(' + ratio + ')',
        '-webkit-transform' : 'scale(' + ratio + ')',
        'transform'         : 'scale(' + ratio + ')'
    });

    return _;
}

$.fn.moveXY = function(x, y) {
    var _ = this;

    _.css({
        'left' : x,
        'top'  : y
    });

    return _;
}

$.fn.translateXY = function(x, y) {
    var _ = this;

    _.css({
        '-ms-transform'     : 'translateX(' + x + ') translateY(' + y + ')',
        '-o-transform'      : 'translateX(' + x + ') translateY(' + y + ')',
        '-moz-transform'    : 'translateX(' + x + ') translateY(' + y + ')',
        '-webkit-transform' : 'translateX(' + x + ') translateY(' + y + ')',
        'transform'         : 'translateX(' + x + ') translateY(' + y + ')'
    });

    return _;
}