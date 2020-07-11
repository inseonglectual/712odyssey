/**
 * Cloud background item.
 * Similar to an obstacle object but without collision boxes.
 * @param {HTMLCanvasElement} canvas Canvas element.
 * @param {Object} spritePos Position of image in sprite.
 * @param {number} containerWidth
 */
function Cloud(canvas, spritePos, containerWidth,backgroundNum, start) {
    // BACKGROUNDNUM = backgroundNum;
    this.backgroundNum = backgroundNum || 0;
    this.background = backgrounds[0];
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.spritePos = spritePos;
    this.containerWidth = containerWidth;
    this.xPos = containerWidth;
    this.yPos = 0;
    this.remove = false;
    this.screenFilled = true;
    this.cloudGap = getRandomNum(Cloud.config.MIN_CLOUD_GAP,
        Cloud.config.MAX_CLOUD_GAP);
    
    if (start){
        this.xPos = 0;
    }
    this.init();
};

/**
 * Cloud object config.
 * @enum {number}
 */
Cloud.config = {
    HEIGHT: 150,
    MAX_CLOUD_GAP: 1200,
    MAX_SKY_LEVEL: 0,
    MIN_CLOUD_GAP: 1199,
    MIN_SKY_LEVEL: 1,
    WIDTH: 1800
};


Cloud.prototype = {
    /**
     * Initialise the cloud. Sets the Cloud height.
     */
    init: function () {
        this.xImg = 0;
        this.yPos =Cloud.config.MAX_SKY_LEVEL;
        this.draw();
        this.background = document.getElementById(backgrounds[this.backgroundNum]);
    },

    /**
     * Draw the cloud.
     */
    draw: function () {
        this.canvasCtx.save();
        var sourceWidth = Cloud.config.WIDTH;
        var sourceHeight = Cloud.config.HEIGHT;

        if (IS_HIDPI) {
            sourceWidth = sourceWidth * 2;
            sourceHeight = sourceHeight * 2;
        }
        this.canvasCtx.drawImage(document.getElementById(backgrounds[this.backgroundNum]), this.xImg,
            this.spritePos.y,
            sourceWidth, sourceHeight,
            this.xPos, this.yPos,
            Cloud.config.WIDTH, Cloud.config.HEIGHT);

        this.canvasCtx.restore();
    },

    /**
     * Update the cloud position.
     * @param {number} speed
     */
    update: function (speed) {
        speed = 1;
        if (!this.remove) {
            if (this.xPos > 0){
                this.xPos -= Math.ceil(speed);
            }
            else {
                this.xImg += Math.ceil(speed);
            }
            this.draw();
            

            // Mark as removeable if no longer in the canvas.
            if (!this.isVisible()) {
                this.remove = true;
            }

            if(!this.isScreenFilled()) {
                this.screenFilled = false;
            }
        }
    },

    /**
     * Check if the cloud is visible on the stage.
     * @return {boolean}
     */
    isScreenFilled: function () {
        return this.xImg < 1200;
    },

    /**
     * Check if the cloud is visible on the stage.
     * @return {boolean}
     */
    isVisible: function () {
        return this.xImg < 1800;
    }
};