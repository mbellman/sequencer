// ---------------------------------------
// -------------- Variables --------------
var init = false;

var page = {
    $window : $(window),
    width   : $(window).width(),
    height  : $(window).height(),
    $body   : $('body'),
    $piano  : $('.piano'),
    $music  : $('.music')
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

var pianoRoll = true;
var extendedView = true;

// ---------------------------------------
// -------------- Handlers ---------------
function handleResize() {
    page.width  = page.$window.width();
    page.height = page.$window.height();

    if(init) {
        updateCorners();
        toolbar.resize();
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

        'Play' : function() {
            sequence.play();
            resetNavDrops();
        },

        'Pause' : function() {
            closeAudioContext();
            resetNavDrops();
        },

        'Restart' : function() {
        },

        'br2' : null,

        'Demos' : function() {
        },
    },

    Tools   : {
        'Notate' : function() {
            selectedTool = 1;
            resetNavDrops();
            page.$music.removeClass('select drag');
        },

        'Erase' : function() {
            selectedTool = 2;
            resetNavDrops();
            page.$music.removeClass('select drag');
        },

        'Select' : function() {
            selectedTool = 3;
            resetNavDrops();
            page.$music.removeClass('drag').addClass('select');
        },

        'Drag Area' : function() {
            selectedTool = 4;
            resetNavDrops();
            page.$music.removeClass('select').addClass('drag');
        },
    },

    Options : {
        'Tempo' : function() {
        },

        'Time Signature' : function() {
        },

        'Instruments' : function() {
        }
    },

    Channel : {
        'Channel 1' : function(){
        },

        'Channel 2' : function(){
        },

        'Channel 3' : function(){
        },

        'Channel 4' : function(){
        },

        'Channel 5' : function(){
        },

        'Channel 6' : function(){
        },

        'Channel 7' : function(){
        },

        'Channel 8' : function(){
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
    }
}

function getTile(mouseX, mouseY) {
    var container = $('.music').offset();

    return {
        x: Math.floor( (mouseX - container.left) / 30 ),
        y: Math.floor( (mouseY - container.top) / 30 )
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

function putNote(x, y, width) {
    var note = $('<div/>', {
        class : 'note',
        css   : {
            width : width + 'px',
            top   : (y*30)+5 + 'px',
            left  : x*30 + 'px'
        }
    });
    
    note.attr('data-channel', activeChannel)
        .attr('data-note', sequence.channel[activeChannel-1].notes.length)
        .scale(0).css('opacity', '0');

    page.$music.append( note.addClass(instruments[selectedInstrument]) );

    note.delay(25).queue(function(){
        $(this).scale(1).css('opacity', '1');
        $(this).dequeue();
    });
    
    var pitch    = frequency(88-y);
    var time     = x;
    var duration = Math.ceil( width/30 );
    
    sequence.channel[activeChannel-1].write(pitch, time, duration);
}

function eraseNote(element) {
    var note = parseInt(element.attr('data-note'));
    element.scale(0.5).css('opacity', '0').delay(550).queue(function(){
        $(this).dequeue();
        $(this).remove();
    });
    
    sequence.channel[activeChannel-1].erase(note);
}

function generateSequence() {
    sequence = new Sequence();
    sequence.build();
}

// ---------------------------------------
// -------------- DOM/Events -------------
var mouseDrag = false, dragTimer = null;
var noteAction = false, noteActionTimer = null;
var noteGrab = false, grabTimer = null;
var erasing = false;

function resetMouseDrag()  { mouseDrag = false; }
function resetNoteAction() { noteAction = false;}
function resetNoteGrab()   { noteGrab = false; }

$(document).ready(function(){

    generateUI();

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
        var pSound = playPreview(frequency(88-note), true);
        
        key.on('mouseup mouseleave', function(){
            key.off('mouseup mouseleave');
            pSound.dispose();
        });
    });

    // Placing a single note
    page.$music.click(function(e){
        if(!toolbarActive && !mouseDrag && !noteAction && !noteGrab) {
            var mouseX = e.clientX;
            var mouseY = e.clientY;

            var tile = getTile(mouseX, mouseY);

            switch(selectedTool) {
                case 1:     // Placing a new note
                    putNote(tile.x, tile.y, 30);
                    playPreview(frequency(88-tile.y), false);
                    break;
            }
        }
    });

    // Hovering over a note - preparing for note interactions
    $(document).on('mouseenter', '.music .note', function(){
        if(!toolbarActive) {
            var el = $(this);

            if(selectedTool == 1) {
                // Notate tool active; indicate
                // note can be interacted with
                el.css('opacity', '0.5');
                var note = {x: el.offset().left, w: el.width()};

                noteAction = true;

                page.$body.on('mousemove', function(e){
                    if((note.x + note.w) - e.clientX < 12) {
                        el.addClass('stretch');
                    } else {
                        el.removeClass('stretch');
                    }
                });
            }
            
            if(selectedTool == 2) {
                el.addClass('erase');

                if(erasing) {
                    // Removing note
                    eraseNote(el);
                }
            }
        }
    });
    
    // Mouse off the note - restoring normal functionality
    $(document).on('mouseleave', '.music .note', function(){
        if(!toolbarActive && selectedTool == 1) {
            if(!noteGrab) {
                page.$body.off('mousemove');
            }
            $(this).css('opacity', '1.0').removeClass('stretch');
            noteAction = false;
        }
        
        if(!toolbarActive && selectedTool == 2) {
            $(this).removeClass('erase');
        }
    });
    
    // Note manipulation
    $(document).on('mousedown', '.music .note', function(e){
        if(!toolbarActive && noteAction && selectedTool == 1) {
            var el = $(this);
            var note = {
                x    : el.offset().left,
                y    : el.offset().top,
                top  : parseInt(el.css('top')),
                left : parseInt(el.css('left')),
                w    : el.width(),
                id   : parseInt(el.attr('data-note'))
            };

            note.data  = sequence.channel[activeChannel-1].notes[note.id];
            note.tileX = Math.round(note.left/30);
            note.tileY = Math.round(note.top/30);

            var xTileDiff = getTile(e.clientX, e.clientY).x - note.tileX;
            console.log(note.tileX);

            playPreview(note.data.pitch, false);

            clearTimeout(grabTimer);
            noteGrab = true;

            var mouse = {x: e.clientX, y: e.clientY}
            var delta = {x: 0, y: 0}
            var action = ((note.x + note.w) - mouse.x < 12) ? 'stretch' : 'move';

            page.$body.on('mousemove', function(e){
                delta.x = e.clientX - mouse.x;
                delta.y = e.clientY - mouse.y;

                switch(action) {
                    case 'move':    // Dragging the note around
                        
                        var tile = getTile(e.clientX, e.clientY);

                        var newTop  = 5 + tile.y*30;
                        var newLeft = (tile.x-xTileDiff)*30;

                        var newTime  = Math.floor(newLeft/30);
                        var newPitch = frequency(88-Math.floor(newTop/30));

                        if(newTime != note.data.time) {
                            note.data.time = newTime;
                            el.css('left', newLeft + 'px');
                        }

                        if(newPitch != note.data.pitch) {
                            playPreview(newPitch, false);
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
            eraseNote($(this));
        }
    });

    // Dragging along the music roll
    page.$music.on('mousedown', function(e){
        if(toolbarActive || (selectedTool == 1 && (noteAction || noteGrab))) {
            return;
        }

        var mouseX = e.clientX;
        var mouseY = e.clientY;

        var tile = getTile(mouseX, mouseY);

        var delta = {x: 0, y: 0};

        switch(selectedTool) {
            case 1:     // Placing a new note
                var pNote  = putPreviewNote(tile.x, tile.y);
                var pSound = playPreview(frequency(88-tile.y), true);
                break;
            case 2:     // Erasing notes
                erasing = true;
                break;
            case 3:     // Starting an area selection
                break;
            case 4:     // Dragging music roll
                break;
        }

        page.$body.on('mousemove', function(e){
            mouseDrag = true;
            clearTimeout(dragTimer);

            var nMouseX = e.clientX;
            var nMouseY = e.clientY;

            delta.x = nMouseX - mouseX;
            delta.y = nMouseY - mouseY;

            var newTile = getTile(nMouseX, nMouseY);

            // Drag actions
            switch(selectedTool) {
                case 1:     // Previewing an elongated new note
                    pNote.css('width', 30+(30*(newTile.x - tile.x)) + 'px');
                    break;
                case 2:     // Erasing any notes covered by the mouse (handled separately)
                    break;
                case 3:     // Selecting notes
                    break;
                case 4:     // Dragging the music roll view
                    var newX = roll.scroll.x + delta.x;
                    var newY = roll.scroll.y + delta.y;

                    if(newX >= 0) {
                        roll.scroll.x -= newX;
                        newX = 0;
                    }

                    if(newY >= 0) {
                        roll.scroll.y -= newY;
                        newY = 0;
                    }
                    
                    page.$piano.moveXY(0, 35+newY + 'px');
                    page.$music.moveXY(newX + 'px', 35+newY + 'px');
                    break;
            }
        });

        page.$body.on('mouseup', function(e){
            page.$body.off('mousemove mouseup');
            
            if(selectedTool == 1) {
                // Removing preview note/stopping preview sound
                pNote.remove();
                pSound.dispose();
            }
            
            if(selectedTool == 2) {
                // Stopping erasure
                erasing = false;
            }
            
            if(!mouseDrag) {
                // Mouse was not dragged after being held, so the
                // action will be processed by a click handler
                return;
            }

            var fMouseX = e.clientX;
            var fMouseY = e.clientY;

            var finalTile = getTile(fMouseX, fMouseY);

            // Release actions (erasure is omitted since it triggers no new action)
            switch(selectedTool) {
                case 1:     // Placing an elongated new note
                    if(finalTile.x >= tile.x) {
                        putNote(tile.x, tile.y, 30+(30*(finalTile.x - tile.x)));
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

    // Prevent other default actions
    page.$body.on('mousedown', function(e){
        e.preventDefault();
    });
    
    generateSequence();
    
    $('.sequencer').css('opacity', '1');

    init = true;

    page.$window.resize(handleResize).resize();
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