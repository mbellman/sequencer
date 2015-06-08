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
    $render    : $('canvas.view'),
    $render2   : $('canvas.cover'),
    $ViewFrame : $('.mini-frame'),
    $music     : $('.music')
}

var sequence;

var activeChannel = 1;
var selectedTool = 1;
var selectedInstrument = 1;

var pianoRoll = true;           // Viewing piano roll
var extendedView = true;        // Viewing extended view

var pianoPreview = false;       // Set to true on piano key mousedown so rollovers will play new tones (false on mouseup)

var notesSelected = false;      // Group of notes selected
var movingNotes = false;        // Moving notes around

var groupStretch = false;       // Able to stretch a group of notes (on mousedown)
var stretchingNotes = false;    // Actively stretching a group of notes

var grabbedNote = null;         // Grabbed note of a selected group (jQ element)

var playOffset = 0;             // Offset from which to start playing

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
        boundScrollArea();

        View.canvas.width  = page.$render.width();
        View.canvas.height = page.$render.height();

        ViewCover.canvas.width  = page.$render2.width();
        ViewCover.canvas.height = page.$render2.height();

        View.render.all();

        ViewCover.fill();
        ViewCover.render();
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
var toggleRenderTimer;

var tools = {
    File    : {
        'New' : function() {
        },

        'Save' : function() {
            saveSequence();
        },

        'Open' : function() {
            $('#open-link').click();
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
        
        'Start from here [BACKSPACE]' : function(){
            focusPlayOffset();
        },

        'Start from beginning [ENTER]' : function(){
            roll.scroll.x = 0;
            scrollMusicTo(0, roll.scroll.y);
            focusPlayOffset();
        },

        'Jump to start [SPACE]' : function(){
            jumpToStart();
        }
    },

    Channel : {
        'Channel 1 [1]' : function(){
            setChannel(1);
        },

        'Channel 2 [2]' : function(){
            setChannel(2);
        },

        'Channel 3 [3]' : function(){
            setChannel(3);
        },

        'Channel 4 [4]' : function(){
            setChannel(4);
        },

        'Channel 5 [5]' : function(){
            setChannel(5);
        },

        'Channel 6 [6]' : function(){
            setChannel(6);
        },

        'Channel 7 [7]' : function(){
            setChannel(7);
        },

        'Channel 8 [8]' : function(){
            setChannel(8);
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

            clearTimeout(toggleRenderTimer);
            toggleRenderTimer = setTimeout(function(){
                ViewCover.fill();
                ViewCover.render();
            }, 750);
        },

        'Extended View' : function() {
            if(extendedView) {
                extendedView = false;
                page.$render.parent().translateXY('0px', '180px');
            } else {
                extendedView = true;
                page.$render.parent().translateXY('0px', '0px');
            }
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

Toolbar.prototype.newDropItem = function(nav, text, callback) {
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
            toolbar.newDropItem(prop, subKey, tools[key][subKey]);
        }
    }
    
    // Building tempo/channel options
    var tempoBox = $('<div/>', {class : 'tempo'});
    var instrumentBox = $('<div/>', {class : 'instrument'});

    tempoBox.text('BPM:').appendTo($('.ui-bar'));
    instrumentBox.html('<div id="ch">Ch.1</div>').appendTo($('.ui-bar'));

    var tempo = $('<input/>', {
        class     : 'tempo-form',
        value     : '180',
        maxlength : '3'
    }).appendTo(tempoBox);
    
    var instrument = $('<select/>', {
        class : 'instrument-select'
    }).appendTo(instrumentBox);

    for(var i in instruments) {
        var o = $('<option/>', {
            value : i
        }).text(instruments[i].charAt(0).toUpperCase() + instruments[i].slice(1));
        o.appendTo(instrument);
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

    // Placing measure labels
    var m = 1;
    var mOffset = 482;

    while(mOffset <= page.$music.width()) {
        var label = $('<div/>', {
            class : 'label',
            css : {
                'left' : mOffset + 'px'
            }
        }).text(m).appendTo( $('.measure-labels') );

        mOffset += 480;
        m++;
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

function activeNote(element) {
    return element.hasClass('channel-' + activeChannel);
}

function getNoteData(element) {
    var ch = parseInt(element.attr('data-channel'));
    var id = parseInt(element.attr('data-note'));

    return sequence.channel[ch-1].notes[id];
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

function putNote(x, y, width, animate, _forceChannel) {
    var targetChannel = (!!_forceChannel ? _forceChannel : activeChannel);

    var note = $('<div/>', {
        class : 'note channel-' + targetChannel,
        css   : {
            width : width + 'px',
            top   : (y*30)+5 + 'px',
            left  : x*30 + 'px'
        }
    });
    
    note.attr('data-channel', targetChannel)
        .attr('data-note', sequence.channel[targetChannel-1].notes.length);
    
    if(!!animate) {
        note.scale(0).css('opacity', '0');
    }

    page.$music.append(note);

    note.delay(25).queue(function(){
        $(this).scale(1).css('opacity', '1');
        $(this).dequeue();
    });
    
    var time     = x;
    var pitch    = y;
    var duration = Math.ceil( width/30 );
    
    sequence.channel[targetChannel-1].write(pitch, time, duration);
}

function eraseNote(element) {
    element.off('mouseenter').trigger('mouseleave');                    // Force unhover
    element.addClass('erase erased');
    element.css('background-color', element.css('background-color'));   // Lock the erased state

    var channel = parseInt(element.attr('data-channel'));
    var note = parseInt(element.attr('data-note'));
    sequence.channel[channel-1].erase(note);

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
 * Turns off selection UI features
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
        data    : getNoteData(element),
        dTime   : 0,
        dPitch  : 0
    }
    
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

    // Determining a pitch to play for the
    // grabbed note of a selected group
    if(grabbedNote != null) {
        var grabbedData = getNoteData(grabbedNote);
        var gPitch = grabbedData.pitch;

        if( Math.abs(deltaY) >= 1 ) {
            WebAudio.tone(frequency(88-gPitch), false);
        }
    }

    // RENDER ACTION
    View.render.all();
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
                data : getNoteData(el)
            };

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

        // RENDER ACTION
        View.render.all();
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

        // RENDER ACTION
        View.render.all();
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

    // Update extended view local area position
    ViewCover.render();

    // Keep measure labels stuck to top
    $('.measure-labels').css('top', -y + 'px');
}

/**
 * Prevent music roll from being
 * scrolled past the top/bottom edges
 */
function boundScrollArea() {
    var bottomLimit = -1*(2640 - page.$sequencer.height())-35;

    if(roll.scroll.y <= bottomLimit) {
        page.$piano.css('top', bottomLimit+35);
        page.$music.css('top', bottomLimit+35);

        roll.scroll.y = bottomLimit;

        ViewCover.render();
    }

    if(roll.scroll.y > 0) {
        page.$piano.css('top', 35);
        page.$music.css('top', 35);

        roll.scroll.y = 0;

        ViewCover.render();
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

    $('.mini-playbar').css('left', (playOffset*2 + View.offsetX) + 'px');
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

/**
 * Changes the active sequence track
 */
function setChannel(c) {
    if(activeChannel != c) {
        activeChannel = c;

        $('.note:not(.channel-' + activeChannel + ')').addClass('inactive-channel');
        $('.note.channel-' + activeChannel).removeClass('inactive-channel');

        $('.instrument-select').find('option').eq( sequence.channel[c-1].instrument - 1 )[0].selected = true;
        selectedInstrument = sequence.channel[c-1].instrument;

        setTimeout(tagViewableNotes, 250);
    }
}


// ------------
// Canvas tools

/**
 * Canvas object constructor
 */
function Canvas() {
    this.canvas;
    this.context;
}

/**
 * Set up the canvas DOM element and context
 * via a canvas jQuery selector
 */
Canvas.prototype.load = function(_jQueryCanvas) {
    this.canvas  = _jQueryCanvas[0];
    this.context = this.canvas.getContext('2d');
}

/**
 * Clear the canvas
 */
Canvas.prototype.clear = function() {
    if(this.context != null) {
        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );
    }
}

/**
 * Draw a rectangle on the canvas
 */
Canvas.prototype.rectangle = function(_x, _y, _width, _height, _color) {
    if(this.context != null) {
        if(_color != 'blank') {
            // Drawing a normal box with a color fill
            this.context.beginPath();
            this.context.rect(_x, _y, _width, _height);
            this.context.fillStyle = _color;
            this.context.fill();
        } else {
            // Clearing an area defined by the region
            this.context.clearRect(
                _x,
                _y,
                _width,
                _height
            );
        }
    }
}


/* --- Extended view --- */
var viewScale = 1/15;

var viewCanvas = new Canvas();
viewCanvas.load( page.$render );

var View = {
    canvas    : viewCanvas.canvas,
    colors    : ['#0FF', '#FD0', '#F0F', '#0FF', '#0FF', '#0FF', '#0FF', '#0FF'],

    scrolling : false,
    offsetX   : 0,

    render    : {}
};

View.render.note = function(x, y, length, channel) {
    viewCanvas.rectangle( x, y, length, 2, View.colors[channel]);
}

View.render.all = function() {
    viewCanvas.clear();

    for(c in sequence.channel) {
        var channel = sequence.channel[c];

        for(n in channel.notes) {
            var note = channel.notes[n];

            if(!note.disposed) {
                View.render.note(
                    note.time     * 2 + View.offsetX,
                    note.pitch    * 2,
                    note.duration * 2,
                    c
                );
            }
        }
    }

    var distance = 0 + View.offsetX % (480*viewScale);

    while(distance < viewCanvas.canvas.width) {
        distance += 480*viewScale;

        viewCanvas.rectangle( distance, 0, 1, 176, '#DDD');
    }
}

/* --- Extended view darker overlay (with local view box) --- */
var coverCanvas = new Canvas();

coverCanvas.load( page.$render2 );

var ViewCover = {
    canvas : coverCanvas.canvas,

    fillColor  : '#08B',

    lastX      : 0,
    lastY      : 0,
    lastWidth  : 0,
    lastHeight : 0,

    fill : function() {
        coverCanvas.rectangle( 0, 0, page.$render2.width(), page.$render2.height(), this.fillColor );
    },

    render : function() {
        // Dark overlay (only fill in the last window region)
        var pad = 5;
        coverCanvas.rectangle( this.lastX-pad, this.lastY-pad, this.lastWidth+pad*2, this.lastHeight+pad*2, this.fillColor );

        // Window region
        var rollPos = page.$music.position();
        var pOffset = (pianoRoll ? 100 : 0);

        var xScroll = Math.abs( rollPos.left - pOffset );
        var yScroll = Math.abs( rollPos.top - 35);

        var w = (page.$sequencer.width() - pOffset)   * viewScale;
        var h = (page.$sequencer.height() - 35 - 176) * viewScale;

        // Save new rect coordinates
        this.lastX = xScroll * viewScale + View.offsetX;
        this.lastY = yScroll * viewScale;
        this.lastWidth  = w;
        this.lastHeight = h;

        // Draw window
        coverCanvas.rectangle( this.lastX, this.lastY, this.lastWidth, this.lastHeight, 'blank' );

        moveViewFrame();
    }
}

/**
 * Update view frame automatically through the render operation
 */
function moveViewFrame() {
    page.$ViewFrame.css({
        'width'  : ViewCover.lastWidth + 'px',
        'height' : ViewCover.lastHeight + 'px',
        'top'    : ViewCover.lastY + 'px',
        'left'   : ViewCover.lastX + 'px'
    });
}

/**
 * Handler for dragging the view frame and re-rendering accordingly
 */
function viewFrameDragged() {
    roll.scroll.x = -1 * (page.$ViewFrame.position().left / viewScale);
    roll.scroll.y = -1 * (page.$ViewFrame.position().top / viewScale);

    scrollMusicTo(
        roll.scroll.x,
        roll.scroll.y
    );
}

function setViewTo(x) {
    View.offsetX = x;

    View.render.all();
    ViewCover.render();

    $('.mini-playbar').css('left', (playOffset*2 + x) + 'px');
}

function scrollViewTo(destX) {
    if(destX == View.offsetX || View.scrolling) {
        // No need to scroll to the same spot;
        // also cancels new action if still moving
        return;
    }

    if(destX > 0) {
        destX = 0;
    }

    View.scrolling = true;

    var start      = View.offsetX;

    var time       = 1000;
    var dt         = 50;

    var posDestX   = Math.abs(destX);
    var posStart   = Math.abs(start);
    var xDelta     = Math.max(posDestX, posStart) - Math.min(posDestX, posStart);

    var sign       = (start > destX ? -1 : 1);

    var i = 0;
    var t = 0;

    while(++i <= time/dt) {
        setTimeout(function(){
            ++t;
            setViewTo( start + (Ease.quad.out(t / (time/dt)) * xDelta * sign) );

            if(t >= time/dt) {
                setViewTo(destX);
                checkViewEdge();

                View.scrolling = false;
            }
        }, i*dt);
    }
}

function checkViewEdge() {
    if(View.offsetX == 0) {
        $('.extended .scroll.left').addClass('disabled');
    } else {
        $('.extended .scroll.left').removeClass('disabled');
    }
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
var viewClick = false, viewClickTimer = null;
var erasing = false;

function resetMouseDrag()  { mouseDrag = false; }
function resetNoteAction() { noteAction = false;}
function resetNoteGrab()   { noteGrab = false; }
function resetPlayDrag()   { playDrag = false; }
function resetViewClick()  { viewClick = false; }

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
    
    // Editing tempo value
    $(document).on('keydown', '.tempo-form', function(e){
        if(!(e.which >= 48 && e.which <= 57) && (e.which != 37 && e.which != 39) && (e.which != 8)) {
            // Only permit numbers, LR arrow keys and backspace
            return false;
        }
    }).on('keyup', '.tempo-form', function(){
        var tempoValue = $(this).val();
        
        if(tempoValue != '') {
            if(isNaN(tempoValue)) {
                tempoValue = sequence.tempo;
            } else {
                if(tempoValue > 299) {
                    tempoValue = 299;
                    $(this).val(tempoValue);
                } else if(tempoValue < 1) {
                    tempoValue = 1;
                    $(this).val(tempoValue);
                }
            }

            sequence.tempo = tempoValue;
        }
    });

    // Changing instrument
    $(document).on('change', '.instrument-select', function(){
        selectedInstrument = $('.instrument-select').val();
        sequence.channel[activeChannel-1].instrument = selectedInstrument;
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

    // Dragging the view frame
    page.$ViewFrame.on('mousedown', function(e){
        var mouseX = e.clientX + View.offsetX;
        var mouseY = e.clientY;

        var delta = {x: 0, y:0};
        var frame = {
            x: page.$ViewFrame.position().left,
            y: page.$ViewFrame.position().top
        };

        page.$body.on('mousemove', function(e){
            delta.x = e.clientX - mouseX;
            delta.y = e.clientY - mouseY;

            page.$ViewFrame.css({
                'top'  : frame.y + delta.y,
                'left' : frame.x + delta.x
            });

            if(page.$ViewFrame.position().top < 0) {
                page.$ViewFrame.css('top', '0px');
            }

            if(page.$ViewFrame.position().left < 0) {
                page.$ViewFrame.css('left', '0px');
            }

            if(page.$ViewFrame.position().top + page.$ViewFrame.height() > (176 - 176*viewScale)) {
                page.$ViewFrame.css('top', 176 - 176*viewScale - page.$ViewFrame.height() + 'px');
            }

            viewFrameDragged();
        });

        page.$body.on('mouseup', function(){
            page.$body.off('mousemove mouseup');
        });
    });

    // Double-clicking a spot on the extended view to scroll there
    $('canvas.cover').click(function(e){
        if(viewClick) {
            // Double click!
            var pointX = e.clientX - $('.mini-frame').width()/2 - page.$render.offset().left;
            var pointY = e.clientY - $('.mini-frame').height()/2 - page.$render.offset().top;

            var newX = (-1*(pointX - View.offsetX)) / viewScale;
            var newY = (-1*pointY) / viewScale;

            scrollMusicTo(newX, newY);
            roll.scroll.x = newX;
            roll.scroll.y = newY;

            boundScrollArea();
        }

        viewClick = true;

        clearTimeout(viewClickTimer);
        viewClickTimer = setTimeout(resetViewClick, 250);
    });

    $('canvas.cover').on('mousedown', function(e){
        var mouseX = e.clientX;
        var initialX = View.offsetX;

        page.$body.on('mousemove', function(e){
            var deltaX = e.clientX - mouseX;

            if(initialX + deltaX <= 0) {
                View.offsetX = initialX + deltaX;
                setViewTo(View.offsetX);
            } else {
                mouseX += (initialX + deltaX);

                View.offsetX = 0;
                setViewTo(0);
            }

            checkViewEdge();
        });

        page.$body.on('mouseup', function(){
            page.$body.off('mousemove mouseup');
        });
    });

    // Extended view scroll buttons
    $('.scroll.left, .scroll.left .arrow').click(function(){
        scrollViewTo(View.offsetX + 400);
    });

    $('.scroll.right, .scroll.right .arrow').click(function(){
        scrollViewTo(View.offsetX - 400);
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

                    // RENDER ACTION
                    View.render.all();
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

            if(!activeNote(el)) {
                return;
            }

            if(selectedTool == 1) {
                // Notate tool active; indicate
                // note can be interacted with
                el.css('opacity', '0.5');

                noteAction = true;
            }
            
            if(selectedTool == 2) {
                // Preparing to erase note
                el.addClass('erase');

                if(erasing) {
                    // Removing note
                    eraseNote(el);

                    // RENDER ACTION
                    View.render.all();
                }
            }
            
            if(selectedTool == 3 && notesSelected && el.hasClass('selected')) {
                grabbedNote = $(this);
                noteAction = true;
            }

            if(selectedTool == 1 || selectedTool == 3) {
                // We'll check for stretch range if either
                // the notate or selection tools are active
                var note = {
                    x: el.offset().left,
                    w: el.width()
                };

                page.$body.on('mousemove', function(e){
                    if((note.x + note.w) - e.clientX < 15) {
                        // Within note stretch range
                        el.addClass('stretch');

                        if(selectedTool == 3) {
                            groupStretch = true;
                        }
                    } else {
                        // Out of note stretch range
                        el.removeClass('stretch');

                        if(selectedTool == 3) {
                            groupStretch = false;
                        }
                    }
                });
            }
        }
    });
    
    // Mouse off the note - restoring normal functionality
    $(document).on('mouseleave', '.music .note', function(){
        if(!toolbarActive && !playDrag) {
            if(!activeNote($(this))) {
                return;
            }

            if(selectedTool == 1 && !noteGrab && $('.preview-note').length == 0) {
                // In notate mode, neither moving any notes nor
                // creating new ones, so we remove the stretch
                // indicator handler
                page.$body.off('mousemove');
            }

            if(selectedTool == 3 && !noteGrab && !stretchingNotes && !movingNotes) {
                // In selection mode, not currently
                // stretching or moving a group
                groupStretch = false;

                if($('.selection').length == 0) {
                    // Only remove the mousemove handler
                    // if not doing an area selection
                    page.$body.off('mousemove');
                }
            }
        }
        
        if(!$(this).hasClass('erased')) {
            $(this).css('opacity', '1.0').removeClass('stretch erase');
        }

        noteAction = false;
    });
    
    // Note manipulation
    $(document).on('mousedown', '.music .note', function(e){
        if(!toolbarActive && noteAction && (selectedTool == 1 || (selectedTool == 3 && groupStretch))) {
            // Dragging or stretching a note (processed
            // by the mousemove handler below)
            var el = $(this);

            if(!activeNote(el)) {
                return;
            }

            var note = {
                x    : el.offset().left,
                y    : el.offset().top,
                w    : el.width(),
                data : getNoteData(el)
            };

            note.tileX = Math.round( parseInt(el.css('left'))/30 );
            note.tileY = Math.round( parseInt(el.css('top'))/30 );

            WebAudio.tone(frequency(88-note.data.pitch), false);

            clearTimeout(grabTimer);
            noteGrab = true;

            var mouse = {x: e.clientX, y: e.clientY}
            var delta = {x: 0, y: 0}
            var xTileDiff = getTile(e.clientX, e.clientY).x - note.tileX;
            var action = ((note.x + note.w) - mouse.x < 15) ? 'stretch' : 'move';

            if(selectedTool == 3 && action == 'stretch') {
                stretchingNotes = true;
            }

            page.$body.on('mousemove', function(e){
                delta.x = e.clientX - mouse.x;
                delta.y = e.clientY - mouse.y;

                switch(action) {
                    case 'move':    // Dragging the note around

                        if(selectedTool == 3) {
                            // Group movement is handled elsewhere
                            return;
                        }
                        
                        var tile = getTile(e.clientX, e.clientY);

                        var newTop  = 5 + tile.y*30;
                        var newLeft = (tile.x-xTileDiff)*30;

                        var newTime  = Math.floor(newLeft/30);
                        var newPitch = Math.floor(newTop/30);

                        if(newTime != note.data.time && newTime >= 0) {
                            note.data.time = newTime;
                            el.css('left', newLeft + 'px');

                            // RENDER ACTION
                            View.render.all();
                        }

                        if(newPitch != note.data.pitch && newPitch >= 0 && newPitch <= 88) {
                            WebAudio.tone(frequency(88-newPitch), false);
                            note.data.pitch = newPitch;
                            el.css('top', newTop + 'px');

                            // RENDER ACTION
                            View.render.all();
                        }
                        break;

                    case 'stretch': // Changing the note's length

                        if(selectedTool == 1) {
                            // Only stretching one note
                            var newLength   = note.w + Math.round(delta.x/30)*30;
                            var newDuration = Math.round(newLength/30);

                            if(newDuration != note.data.duration && newDuration >= 1) {
                                note.data.duration = newDuration;
                                el.width(newLength + 'px');

                                // RENDER ACTION
                                View.render.all();
                            }
                        }

                        if(selectedTool == 3) {
                            // Stretching a group of notes
                            var stretchLength = Math.round(delta.x/30)*30;
                            var stretchDuration = Math.round(stretchLength/30);

                            $('.note.selected').each(function(){
                                var sNote = $(this);
                                var sNoteData = getNoteData(sNote);
                                var newDuration = sNoteData.duration + stretchDuration;

                                if(newDuration >= 1) {
                                    sNote.width(newDuration*30 + 'px');
                                }
                            });
                        }

                        break;
                }
            });
            
            page.$body.on('mouseup', function(){
                page.$body.off('mousemove mouseup');
                el.removeClass('stretch');
                grabTimer = setTimeout(resetNoteGrab, 50);

                if(selectedTool == 3) {
                    // Finished stretching notes
                    $('.note.selected').each(function(){
                        var el = $(this);
                        var sNoteData = getNoteData(el);

                        sNoteData.duration = Math.round(el.width()/30);
                    });

                    groupStretch = false;
                    stretchingNotes = false;

                    // RENDER ACTION
                    View.render.all();
                }
            });
        }
        
        if(!toolbarActive && selectedTool == 2) {
            if(activeNote($(this))) {
                // Erasing a single note via click
                eraseNote($(this));

                // RENDER ACTION
                View.render.all();
            }
        }
        
        if(!toolbarActive && selectedTool == 3 && keys.SHIFT) {
            if(activeNote($(this))) {
                // Selecting an individual note via SHIFT-click
                notesSelected = true;
                noteAction = true;
                $(this).addClass('selected');
            }
        }
    });

    // Dragging along the music roll
    page.$music.on('mousedown', function(e){
        if(toolbarActive || (selectedTool == 1 && (noteAction || noteGrab)) || (selectedTool == 3 && (groupStretch || (noteAction && keys.SHIFT)))) {
            // Toolbar being open means we do nothing.

            // If notate tool is active and we're already hovering
            // over a note or directly manipulating it, do nothing.
            
            // If selection tool is active and we're manually
            // selecting single notes with SHIFT, or we're
            // stretching a group of notes, do nothing here.
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
            case 3:     // Starting an area selection, or preparing to move/stretch a group

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
                groupStretch = false;   // Catch for shift-drag over right edge of a note
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

                        // RENDER ACTION
                        View.render.all();
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

            $('.mini-playbar').css('left', ($('.play-bar').position().left * viewScale + View.offsetX) + 'px');
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

    $(document).on('keydown', function(e){
        if(!init) {
            return;
        }

        var tools = $('.ui-dropdowns .nav-drop').eq(1).find('.item');
        var options = $('.ui-dropdowns .nav-drop').eq(2).find('.item');
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
            case 8:     // BACKSPACE
                if(!$('.tempo-form').is(':focus')) {
                    options.eq(3).click();
                    return false;
                }
                break;
            case 13:    // ENTER
                options.eq(4).click();
                break;
            case 16:    // SHIFT
                keys.SHIFT = true;
                break;
            case 17:    // CTRL
                keys.CTRL = true;
                break;
            case 32:    // SPACE
                options.eq(5).click();
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

    // Setting extended view position (along x)
    scrollViewTo(0);
    checkViewEdge();

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