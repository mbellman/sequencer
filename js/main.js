// ---------------------------------------
// -------------- Variables --------------
var init = false;

var page = {
    $window : $(window),
    width   : $(window).width(),
    height  : $(window).height(),
    $body   : $('body'),
    $music  : $('.music')
}

var instruments = {
    1 : 'square',
    2 : 'sawtooth',
    3 : 'triangle',
    4 : 'piano'
}

var selectedTool = 1;
var selectedInstrument = 1;

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
        },

        'Pause' : function() {
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
            toolbar.hideOtherDrops();
        },

        'Erase' : function() {
            selectedTool = 2;
            toolbar.hideOtherDrops();
        },

        'Scroll' : function() {
            selectedTool = 3;
            toolbar.hideOtherDrops();
        },

        'Select' : function() {
            selectedTool = 4;
            toolbar.hideOtherDrops();
        }
    },

    Options : {
        'Tempo' : function() {
        },

        'Time Signature' : function() {
        },

        'Instruments' : function() {
        }
    },

    Toggle  : {
        'Piano Roll' : function() {
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
}

// ---------------------------------------
// -------------- Music roll -------------
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

    note.scale(0).css('opacity', '0');
    page.$music.append( note.addClass(instruments[selectedInstrument]) );

    note.delay(25).queue(function(){
        $(this).scale(1).css('opacity', '1');
        $(this).dequeue();
    });
}

function eraseNote(x, y) {
    // Look through all notes and see which one
    // passes through this tile, if any
}

// ---------------------------------------
// -------------- DOM/Events -------------
var mouseDrag = false;
var dragTimer = null;

function resetMouseDrag() {
    mouseDrag = false;
}

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

    // Placing or erasing a single note
    $('.music').click(function(e){
        if(!toolbarActive && !mouseDrag) {
            var mouseX = e.clientX;
            var mouseY = e.clientY;

            var tile = getTile(mouseX, mouseY);

            switch(selectedTool) {
                case 1:     // Placing a new note
                    putNote(tile.x, tile.y, 30);
                    break;
                case 2:     // Erasing a note
                    eraseNote(tile.x, tile.y);
                    break;
            }
        }
    });

    // Dragging along the music roll
    $('.music').on('mousedown', function(e){
        var mouseX = e.clientX;
        var mouseY = e.clientY;

        var tile = getTile(mouseX, mouseY);

        var delta = {x: 0, y: 0};

        // For the first mousedown action, we're only concerned
        // about placing and erasing notes - selection/scroll
        // update continuously as the mouse is moved
        switch(selectedTool) {
            case 1:     // Placing a new note
                var pNote = putPreviewNote(tile.x, tile.y);
            case 2:     // Erasing notes
        }

        page.$body.on('mousemove', function(e){
            mouseDrag = true;
            clearTimeout(dragTimer);
            
            var nMouseX = e.clientX;
            var nMouseY = e.clientY;

            delta.x = nMouseX - mouseX;
            delta.y = nMouseY - mouseY;

            var newTile = getTile(nMouseX, nMouseY);

            switch(selectedTool) {
                case 1:     // Placing an elongated new note
                    pNote.css('width', 30+(30*(newTile.x - tile.x)) + 'px');
                    break;
                case 2:     // Erasing any notes covered by the mouse
                    break;
                case 3:     // Selecting notes
                    break;
                case 4:     // Dragging the music roll view
                    break;
            }
        });

        page.$body.on('mouseup', function(e){
            page.$body.off('mousemove mouseup');
            
            var fMouseX = e.clientX;
            var fMouseY = e.clientY;
            
            var finalTile = getTile(fMouseX, fMouseY);

            // Only note placement and note selection should trigger
            // an action after the mouse is released
            switch(selectedTool) {
                case 1:     // Placing an elongated new note
                    pNote.remove();
                    putNote(tile.x, tile.y, 30+(30*(finalTile.x - tile.x)));
                    break;
                case 3:     // Selecting notes (group all selected)
                    break;
            }
            
            dragTimer = setTimeout(resetMouseDrag, 250);
        });
    });

    init = true;
    
    page.$body.on('mousedown', function(e){
        e.preventDefault();
    });

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