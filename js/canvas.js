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