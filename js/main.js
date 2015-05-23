// ---------------------------------------
// -------------- Variables --------------
var init = false;

var page = {
    width  : $(window).width(),
    height : $(window).height()
}

// ---------------------------------------
// -------------- Handlers ---------------
function handleResize() {
    page.width = $(window).width();
    page.height = $(window).height();

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

        'Open' : function() {
        },

        'Load' : function() {
        },

        'br' : null,

        'Demos' : function() {
        },
    },

    Tools   : {
        'Notate' : function() {
        },

        'Erase' : function() {
        },

        'Scroll' : function() {
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
        'Piano Keys' : function() {
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
    if(text != 'br') {
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
        activeDrop = index;

        toolbar.resize();
        toolbar.hideOtherDrops(index);

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
            $('.ui-bar .nav').eq(index).addClass('selected');
        }, 25);
    }
}

Toolbar.prototype.hideDrop = function(index) {
    $('.ui-bar .nav').eq(index).removeClass('selected');
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
// -------------- DOM/Events -------------
$(document).ready(function(){

    generateUI();

    $('.nav').click(function(){
        toolbarActive = true;
        toolbar.expandDrop( $(this).index() );
    });

    $('.nav').on('mouseenter', function(){
        if(toolbarActive) {
            var i = $(this).index();
            toolbar.expandDrop(i);
        }
    });

    $('*').click(function(e){
        e.stopPropagation();
        if(!$(this).hasClass('nav') && !$(this).hasClass('item')) {
            toolbar.hideOtherDrops();
            toolbarActive = false;
            activeDrop = -1;
        }
    });

    init = true;
    
    $(window).resize(handleResize).resize();
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