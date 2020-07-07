/**
 * T-Rex runner.
 * @param {string} outerContainerId Outer containing element id.
 * @param {Object} opt_config
 * @constructor
 * @export
 */
function Runner(outerContainerId, opt_config) {
    if (Runner.instance_) {
        return Runner.instance_;
    }
    Runner.instance_ = this;

    this.collisions = 0;

    this.outerContainerEl = document.querySelector(outerContainerId);
    this.containerEl = null;
    this.detailsButton = this.outerContainerEl.querySelector('#details-button');

    this.config = opt_config || Runner.config;

    this.dimensions = Runner.defaultDimensions;

    this.canvas = null;
    this.canvasCtx = null;

    this.tRex = null;

    this.distanceMeter = null;
    this.distanceRan = 0;

    this.highestScore = 0;

    this.time = 0;
    this.runningTime = 0;
    this.msPerFrame = 1000 / FPS;
    this.currentSpeed = this.config.SPEED;

    this.obstacles = [];

    this.activated = false; // Whether the easter egg has been activated.
    this.playing = false; // Whether the game is currently in play state.
    this.crashed = false;
    this.paused = false;
    this.inverted = false;
    this.invertTimer = 0;
    this.resizeTimerId_ = null;

    this.playCount = 0;

    // Sound FX.
    this.audioBuffer = null;
    this.soundFx = {};

    // Global web audio context for playing sounds.
    this.audioContext = null;

    // Images.
    this.images = {};
    this.imagesLoaded = 0;

    //members
    this.membersCollected = []

    this.loadImages();
}

/**
 * Default game configuration.
 * @enum {number}
 */
Runner.config = {
    ACCELERATION: 0.001,
    BG_CLOUD_SPEED: 0.2,
    BOTTOM_PAD: 0,
    CLEAR_TIME: 500,
    GAMEOVER_CLEAR_TIME: 750,
    GAP_COEFFICIENT: 0.6,
    GRAVITY: 0.6,
    INITIAL_JUMP_VELOCITY: 12,
    INVERT_FADE_DURATION: 12000,
    INVERT_DISTANCE: 700,
     MAX_BLINK_COUNT: 100000,
    MAX_OBSTACLE_LENGTH: 3,
    MAX_OBSTACLE_DUPLICATION: 2,
    MAX_SPEED: 13,
    MIN_JUMP_HEIGHT: 35,
    MOBILE_SPEED_COEFFICIENT: 1.2,
    RESOURCE_TEMPLATE_ID: 'audio-resources',
    SPEED: 3,
    SPEED_DROP_COEFFICIENT: 3
};


/**
 * Default dimensions.
 * @enum {string}
 */
Runner.defaultDimensions = {
    WIDTH: DEFAULT_WIDTH,
    HEIGHT: 150
};


/**
 * CSS class names.
 * @enum {string}
 */
Runner.classes = {
    CANVAS: 'runner-canvas',
    CONTAINER: 'runner-container',
    CRASHED: 'crashed',
    ICON: 'icon-offline',
    INVERTED: 'inverted',
    TOUCH_CONTROLLER: 'controller'
};


/**
 * Sprite definition layout of the spritesheet.
 * @enum {Object}
 */
Runner.spriteDefinition = {
    LDPI: {
        CACTUS_SMALL: { x: 228, y: 12 },
        CLOUD: { x: 0, y: 0 },
        HORIZON: { x: 2, y: 70 },
        MEMBER: {x:10, y: 50},
        RESTART: { x: 2, y: 14 },
        TEXT_SPRITE: { x: 655, y: 13 },
        TREX: { x: 848, y: -10 },
        JUMP: { x: 1025, y: -7}
    },
    HDPI: {
        CACTUS_SMALL: { x: 446, y: 2 },
        CLOUD: { x: 0, y: 0 },
        HORIZON: { x: 2, y: 104 },
        MEMBER: {x:10, y: 50},
        RESTART: { x: 2, y: 2 },
        TEXT_SPRITE: { x: 1294, y: 2 },
        TREX: { x: 1678, y: 2 },
    }
};


/**
 * Sound FX. Reference to the ID of the audio tag on interstitial page.
 * @enum {string}
 */
Runner.sounds = {
    BUTTON_PRESS: 'offline-sound-press',
    HIT: 'offline-sound-hit',
    SCORE: 'offline-sound-reached'
};


/**
 * Key code mapping.
 * @enum {Object}
 */
Runner.keycodes = {
    JUMP: { '38': 1, '32': 1 },  // Up, spacebar
    RESTART: { '13': 1 },  // Enter
    PAUSE: {'13':1}
};


/**
 * Runner event names.
 * @enum {string}
 */
Runner.events = {
    ANIM_END: 'webkitAnimationEnd',
    CLICK: 'click',
    KEYDOWN: 'keydown',
    KEYUP: 'keyup',
    MOUSEDOWN: 'mousedown',
    MOUSEUP: 'mouseup',
    RESIZE: 'resize',
    TOUCHEND: 'touchend',
    TOUCHSTART: 'touchstart',
    VISIBILITY: 'visibilitychange',
    BLUR: 'blur',
    FOCUS: 'focus',
    LOAD: 'load'
};


Runner.prototype = 
{
    /**
     * Setting individual settings for debugging.
     * @param {string} setting
     * @param {*} value
     */
    updateConfigSetting: function (setting, value) {
        if (setting in this.config && value != undefined) {
            this.config[setting] = value;

            switch (setting) {
                case 'GRAVITY':
                case 'MIN_JUMP_HEIGHT':
                case 'SPEED_DROP_COEFFICIENT':
                    this.tRex.config[setting] = value;
                    break;
                case 'INITIAL_JUMP_VELOCITY':
                    this.tRex.setJumpVelocity(value);
                    break;
                case 'SPEED':
                    this.setSpeed(value);
                    break;
            }
        }
    },

    /**
     * Cache the appropriate image sprite from the page and get the sprite sheet
     * definition.
     */
    loadImages: function () {
        if (IS_HIDPI) {
            Runner.imageSprite = document.getElementById('inseong-resources-1x');
            this.spriteDef = Runner.spriteDefinition.LDPI;
        } else {
            Runner.imageSprite = document.getElementById('inseong-resources-1x');
            // Runner.imageSprite = document.getElementById('inseong-resources-1x-transparent');
            this.spriteDef = Runner.spriteDefinition.LDPI;
        }


        if (Runner.imageSprite.complete) {
            this.init();
        } else {
            // If the images are not yet loaded, add a listener.
            Runner.imageSprite.addEventListener(Runner.events.LOAD,
                this.init.bind(this));
        }
    },

    /**
     * Load and decode base 64 encoded sounds.
     */
    loadSounds: function () {
        if (!IS_IOS) {
            this.audioContext = new AudioContext();

            var resourceTemplate =
                document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content;

            for (var sound in Runner.sounds) {
                var soundSrc =
                    resourceTemplate.getElementById(Runner.sounds[sound]).src;
                soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
                var buffer = decodeBase64ToArrayBuffer(soundSrc);

                // Async, so no guarantee of order in array.
                this.audioContext.decodeAudioData(buffer, function (index, audioData) {
                    this.soundFx[index] = audioData;
                }.bind(this, sound));
            }
        }
    },

    /**
     * Sets the game speed. Adjust the speed accordingly if on a smaller screen.
     * @param {number} opt_speed
     */
    setSpeed: function (opt_speed) {
        var speed = opt_speed || this.currentSpeed;

        // Reduce the speed on smaller mobile screens.
        if (this.dimensions.WIDTH < DEFAULT_WIDTH) {
            var mobileSpeed = speed * this.dimensions.WIDTH / DEFAULT_WIDTH *
                this.config.MOBILE_SPEED_COEFFICIENT;
            this.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed;
        } else if (opt_speed) {
            this.currentSpeed = opt_speed;
        }
    },

    /**
     * Game initialiser.
     */
    init: function () {
        // Hide the static icon.
        document.querySelector('.' + Runner.classes.ICON).style.visibility =
            'hidden';

        this.adjustDimensions();
        this.setSpeed();

        this.containerEl = document.createElement('div');
        this.containerEl.className = Runner.classes.CONTAINER;

        // Player canvas container.
        this.canvas = createCanvas(this.containerEl, this.dimensions.WIDTH,
            this.dimensions.HEIGHT, Runner.classes.PLAYER);

        this.canvasCtx = this.canvas.getContext('2d');
        this.canvasCtx.fillStyle = '#f7f7f7';
        this.canvasCtx.fill();
        Runner.updateCanvasScaling(this.canvas);

        this.containerEl.style.width = this.dimensions.WIDTH + 'px';

        // Horizon contains clouds, obstacles and the ground.
        this.horizon = new Horizon(this.canvas, this.spriteDef, this.dimensions,
            this.config.GAP_COEFFICIENT);

        // Distance meter
        this.distanceMeter = new DistanceMeter(this.canvas,
            this.spriteDef.TEXT_SPRITE, this.dimensions.WIDTH);

        //draw start background
        this.canvasCtx.drawImage(document.getElementById('start'), 0, 0, 600, 150,
                0, 0, 600, 150);

        // Draw t-rex
        this.tRex = new Trex(this.canvas, this.spriteDef.TREX);

        this.outerContainerEl.appendChild(this.containerEl);

        if (IS_MOBILE) {
            this.createTouchController();
        }

        this.startListening();
        this.update();

        window.addEventListener(Runner.events.RESIZE,
            this.debounceResize.bind(this));
    },

    /**
     * Create the touch controller. A div that covers whole screen.
     */
    createTouchController: function () {
        this.touchController = document.createElement('div');
        this.touchController.className = Runner.classes.TOUCH_CONTROLLER;
        this.outerContainerEl.appendChild(this.touchController);
    },

    /**
     * Debounce the resize event.
     */
    debounceResize: function () {
        if (!this.resizeTimerId_) {
            this.resizeTimerId_ =
                setInterval(this.adjustDimensions.bind(this), 250);
        }
    },

    /**
     * Adjust game space dimensions on resize.
     */
    adjustDimensions: function () {
        clearInterval(this.resizeTimerId_);
        this.resizeTimerId_ = null;

        var boxStyles = window.getComputedStyle(this.outerContainerEl);
        var padding = Number(boxStyles.paddingLeft.substr(0,
            boxStyles.paddingLeft.length - 2));

        this.dimensions.WIDTH = this.outerContainerEl.offsetWidth - padding * 2;

        this.dimensions.WIDTH = Math.max(600,this.dimensions.WIDTH);


        // Redraw the elements back onto the canvas.
        if (this.canvas) {
            this.canvas.width = this.dimensions.WIDTH;
            this.canvas.height = this.dimensions.HEIGHT;

            Runner.updateCanvasScaling(this.canvas);


            this.distanceMeter.calcXPos(this.dimensions.WIDTH);
            this.clearCanvas();
            this.tRex.update(0);

            if(this.playing){
                this.horizon.update(0, 0, true);
            }
            else{
                this.horizon.update(0,0,false);
            }

            // Outer container and distance meter.
            if (this.playing || this.crashed || this.paused) {
                this.containerEl.style.width = this.dimensions.WIDTH + 'px';
                this.containerEl.style.height = this.dimensions.HEIGHT + 'px';
                this.distanceMeter.update(0, Math.ceil(this.collisions));
                this.stop();
            } else {
                this.tRex.draw(0, 0);
            }

            // Game over panel.
            if (this.crashed && this.gameOverPanel) {
                this.gameOverPanel.updateDimensions(this.dimensions.WIDTH);
                this.gameOverPanel.draw();
            }
        }
    },

    /**
     * Play the game intro.
     * Canvas container width expands out to the full width.
     */
    playIntro: function () {
        if (!this.activated && !this.crashed) {
            this.playingIntro = true;
            this.tRex.playingIntro = true;

            // CSS animation definition.
            var keyframes = '@-webkit-keyframes intro { ' +
                'from { width:' + this.dimensions.WIDTH + 'px }' +
                'to { width: ' + this.dimensions.WIDTH + 'px }' +
                '}';
            
            // create a style sheet to put the keyframe rule in 
            // and then place the style sheet in the html head    
            var sheet = document.createElement('style');
            sheet.innerHTML = keyframes;
            document.head.appendChild(sheet);

            // this.startGame();

            this.containerEl.addEventListener(Runner.events.ANIM_END,
                this.startGame.bind(this));

            this.containerEl.style.webkitAnimation = 'intro .4s ';
            //this.containerEl.style.width = this.dimensions.WIDTH + 'px';

            // if (this.touchController) {
            //     this.outerContainerEl.appendChild(this.touchController);
            // }
            this.playing = true;
            this.activated = true;
        } else if (this.crashed) {
            this.restart();
        }
    },


    /**
     * Update the game status to started.
     */
    startGame: function () {
        this.runningTime = 0;
        this.playingIntro = false;
        this.tRex.playingIntro = false;
        this.containerEl.style.webkitAnimation = '';
        this.playCount++;

        // Handle tabbing off the page. Pause the current game.
        document.addEventListener(Runner.events.VISIBILITY,
            this.onVisibilityChange.bind(this));

        window.addEventListener(Runner.events.BLUR,
            this.onVisibilityChange.bind(this));

        window.addEventListener(Runner.events.FOCUS,
            this.onVisibilityChange.bind(this));

    },

    clearCanvas: function () {
        this.canvasCtx.clearRect(0, 0, this.dimensions.WIDTH,
            this.dimensions.HEIGHT);
    },

    /**
     * Update the game frame and schedules the next one.
     */
    update: function () {
        this.updatePending = false;

        var now = getTimeStamp();
        var deltaTime = now - (this.time || now);
        this.time = now;

        //align arcade machine and game container

        var bodyWidth = document.getElementById('t').clientWidth;
        var bodyHeight = document.getElementById('t').clientHeight;
        
        var machineWidth = document.getElementById('machine').clientWidth;
        var runnerWidth = document.getElementsByClassName('runner-container')[0].clientWidth;
        var runnerHeight = document.getElementsByClassName('runner-container')[0].clientHeight;



        if(this.playing || this.paused){
            var scaleNumber = machineWidth*0.85/runnerWidth;
            var machineHWRatio = 1080/1728;
            var heightPercentage = .29;
            document.getElementsByClassName('runner-container')[0].style.transformOrigin = "top center";

        }
        else{
            var scaleNumber = machineWidth*0.8/runnerWidth;
            var machineHWRatio = 1600/1080;
            var heightPercentage = .375;
            document.getElementsByClassName('runner-container')[0].style.transformOrigin = "top center";

        }

        if(machineWidth<600){
            
        }
        
        var scaleFactor = 'scale(' + scaleNumber + ')';

        
        
        var machineLeft = bodyWidth/2 - machineWidth/2;
        var runnerLeft = bodyWidth/2 - runnerWidth/2 ;
        var runnerTop = machineWidth*machineHWRatio*heightPercentage;

        // console.log(bodyWidth, machineWidth,runnerWidth, runnerLeft);
        //TODO: filter transform by device
        // document.getElementsByClassName('runner-container')[0].style.zoom = scaleNumber;
        // document.getElementsByClassName('runner-container')[0].style.MozTransform = scaleFactor;

        
        // document.getElementsByClassName('runner-container')[0].style.WebkitTransform = scaleFactor;
        document.getElementsByClassName('runner-container')[0].style.margin = '0';
        document.getElementsByClassName('runner-canvas')[0].style.margin = '0';
        document.getElementsByClassName('runner-container')[0].style.width = '600px';
        document.getElementsByClassName('runner-container')[0].style.left = runnerLeft + 'px';
        document.getElementsByClassName('runner-container')[0].style.top = runnerTop + 'px';
        document.getElementById('machine').style.margin = 0;
        document.getElementById('machine').style.left = machineLeft + 'px';

        document.getElementsByClassName('runner-container')[0].style.WebkitTransform = scaleFactor;
        // document.getElementsByClassName('runner-container')[0].style.transformOrigin = "top center";

        // runnerTop = machineWidth*machineHWRatio*0.375;
        document.getElementsByClassName('runner-container')[0].style.top = runnerTop + 'px';


        
        if (this.playing) {
            this.clearCanvas();
            // document.getElementsByClassName('runner-container')[0].style.zoom = 1.54;
            // document.getElementsByClassName('runner-container')[0].style.MozTransform = 'scale(1.54)';
            // document.getElementsByClassName('runner-container')[0].style.WebkitTransform = 'scale(1.54)';
            // document.getElementsByClassName('interstitial-wrapper')[0].style.marginLeft = '22.8%';
            document.getElementById('machine').style.content = '-webkit-image-set( url(assets/arcade_machine_zoom.png) 1x, url(assets/arcade_machine_zoom.png) 2x)';
            // var machine_width = document.getElementById('machine').clientWidth;
            // console.log(machine_width);

            if (this.tRex.jumping) {
                this.tRex.updateJump(deltaTime);
            }

            this.runningTime += deltaTime;
            var hasObstacles = this.runningTime > this.config.CLEAR_TIME;


            // First jump triggers the intro.
            if (this.tRex.jumpCount == 1 && !this.playingIntro) {
                this.playIntro();
            }

            // The horizon doesn't move until the intro is over.
            if (this.playingIntro) {
                this.horizon.update(0, this.currentSpeed, hasObstacles);
            } else {
                deltaTime = !this.activated ? 0 : deltaTime;
                this.horizon.update(deltaTime, this.currentSpeed, hasObstacles,
                    this.inverted);
            }

            // Check for collisions.
            var collision = hasObstacles &&
                checkForCollision(this.horizon.obstacles[0], this.tRex);

            if (collision) {
                if(this.horizon.obstacles[0].type == 'member'){
                    this.membersCollected.push(this.horizon.obstacles[0].memberNum);
                }
                this.horizon.obstacles.shift();
                this.collisions += 1;
                this.horizon.collisions += 1;
            }

            this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame;

            if (this.currentSpeed < this.config.MAX_SPEED) {
                this.currentSpeed += this.config.ACCELERATION;
            }

            if(this.collisions == goal){
                this.gameOver();
            }

            var playAchievementSound = this.distanceMeter.update(deltaTime,
                Math.ceil(this.collisions));

            if (playAchievementSound) {
                this.playSound(this.soundFx.SCORE);
            }

            for(var i=0; i<this.membersCollected.length;i++){
                this.canvasCtx.drawImage(document.getElementById('members'),
                    (10+this.membersCollected[i]*40), 10,
                    35, 35,
                    (320+this.membersCollected[i]*25), 7,
                    40, 40);
            }

            

        }

        if(this.tRex.status == Trex.status.WAITING){
            this.blink(getTimeStamp());
        }

        if (this.playing || (!this.activated &&
            this.tRex.blinkCount < Runner.config.MAX_BLINK_COUNT)) {

            this.tRex.update(deltaTime);
            this.scheduleNextUpdate();
        }

        


    },

    /**
     * Event handler.
     */
    handleEvent: function (e) {
        return (function (evtType, events) {
            switch (evtType) {
                case events.KEYDOWN:
                case events.TOUCHSTART:
                case events.MOUSEDOWN:
                    this.onKeyDown(e);
                    break;
                case events.KEYUP:
                case events.TOUCHEND:
                case events.MOUSEUP:
                    this.onKeyUp(e);
                    break;
            }
        }.bind(this))(e.type, Runner.events);
    },

    /**
     * Bind relevant key / mouse / touch listeners.
     */
    startListening: function () {
        // Keys.
        document.addEventListener(Runner.events.KEYDOWN, this);
        document.addEventListener(Runner.events.KEYUP, this);

        if (IS_MOBILE) {
            // Mobile only touch devices.
            this.touchController.addEventListener(Runner.events.TOUCHSTART, this);
            this.touchController.addEventListener(Runner.events.TOUCHEND, this);
            this.containerEl.addEventListener(Runner.events.TOUCHSTART, this);
        } else {
            // Mouse.
            document.addEventListener(Runner.events.MOUSEDOWN, this);
            document.addEventListener(Runner.events.MOUSEUP, this);
        }
    },

    /**
     * Remove all listeners.
     */
    stopListening: function () {
        document.removeEventListener(Runner.events.KEYDOWN, this);
        document.removeEventListener(Runner.events.KEYUP, this);

        if (IS_MOBILE) {
            this.touchController.removeEventListener(Runner.events.TOUCHSTART, this);
            this.touchController.removeEventListener(Runner.events.TOUCHEND, this);
            this.containerEl.removeEventListener(Runner.events.TOUCHSTART, this);
        } else {
            document.removeEventListener(Runner.events.MOUSEDOWN, this);
            document.removeEventListener(Runner.events.MOUSEUP, this);
        }
    },

    /**
     * Process keydown.
     * @param {Event} e
     */
    onKeyDown: function (e) {
        // Prevent native page scrolling whilst tapping on mobile.
        if (IS_MOBILE && this.playing) {
            e.preventDefault();
        }

        if (e.target != this.detailsButton) {
            if (!this.crashed && !this.paused && (Runner.keycodes.JUMP[e.keyCode] ||
                e.type == Runner.events.TOUCHSTART)) {
                if (!this.playing) {
                    //this.loadSounds();
                    this.playing = true;
                    this.update();
                    if (window.errorPageController) {
                        errorPageController.trackEasterEgg();
                    }
                }
                //  Play sound effect and jump on starting the game for the first time.
                if (!this.tRex.jumping) {
                    //this.playSound(this.soundFx.BUTTON_PRESS);
                    this.tRex.startJump(this.currentSpeed);
                }
                if (!this.tRex.jumping) {
                    //this.playSound(this.soundFx.BUTTON_PRESS);
                    this.tRex.startJump(this.currentSpeed);
                }
            } else if(!this.crashed && !this.paused && (Runner.keycodes.RESTART[e.keyCode])){
                this.stop();
            } 
            if (this.crashed && e.type == Runner.events.TOUCHSTART &&
                e.currentTarget == this.containerEl) {
                this.restart();
            }
        }
    },


    /**
     * Process key up.
     * @param {Event} e
     */
    onKeyUp: function (e) {
        var keyCode = String(e.keyCode);
        var isjumpKey = Runner.keycodes.JUMP[keyCode] ||
            e.type == Runner.events.TOUCHEND ||
            e.type == Runner.events.MOUSEDOWN;

        if (this.isRunning() && isjumpKey) {
            this.tRex.endJump();
        }  else if (this.crashed) {
            // Check that enough time has elapsed before allowing jump key to restart.
            var deltaTime = getTimeStamp() - this.time;

            if (Runner.keycodes.RESTART[keyCode] || this.isLeftClickOnCanvas(e) ||
                (deltaTime >= this.config.GAMEOVER_CLEAR_TIME &&
                    Runner.keycodes.JUMP[keyCode])) {
                this.restart();
            }
        } else if (this.paused && isjumpKey) {
            // Reset the jump state
            this.tRex.reset();
            this.play();
        }
    },

    /**
     * Returns whether the event was a left click on canvas.
     * On Windows right click is registered as a click.
     * @param {Event} e
     * @return {boolean}
     */
    isLeftClickOnCanvas: function (e) {
        return e.button != null && e.button < 2 &&
            e.type == Runner.events.MOUSEUP && e.target == this.canvas;
    },

    /**
     * RequestAnimationFrame wrapper.
     */
    scheduleNextUpdate: function () {
        if (!this.updatePending) {
            this.updatePending = true;
            this.raqId = requestAnimationFrame(this.update.bind(this));
        }
    },

    /**
     * Whether the game is running.
     * @return {boolean}
     */
    isRunning: function () {
        return !!this.raqId;
    },

    /**
     * Game over state.
     */
    gameOver: function () {
        this.playSound(this.soundFx.HIT);

        this.stop();
        this.crashed = true;
        this.distanceMeter.acheivement = false;

        this.tRex.update(100, Trex.status.CRASHED);

        // Game over panel.
        if (!this.gameOverPanel) {
            this.gameOverPanel = new GameOverPanel(this.canvas,
                this.spriteDef.TEXT_SPRITE, this.spriteDef.RESTART,
                this.dimensions);
        } else {
            this.gameOverPanel.draw();
        }

        // Update the high score.
        if (this.distanceRan > this.highestScore) {
            this.highestScore = Math.ceil(this.distanceRan);
            this.distanceMeter.setHighScore(this.highestScore);
        }

        // Reset the time clock.
        this.time = getTimeStamp();
    },

    stop: function () {
        this.playing = false;
        this.paused = true;
        cancelAnimationFrame(this.raqId);
        this.raqId = 0;
    },

    play: function () {
        if (!this.crashed) {
            this.playing = true;
            this.paused = false;
            this.tRex.update(0, Trex.status.RUNNING);
            this.time = getTimeStamp();
            this.update();
        }
    },

    restart: function () {
        if (!this.raqId) {
            this.horizon.clouds = [new Cloud(this.canvas, this.spriteDef.CLOUD,
                this.dimensions.WIDTH,0,true)];
            this.collisions = 0;
            this.horizon.collisions = 0;
            this.playCount++;
            this.runningTime = 0;
            this.playing = true;
            this.crashed = false;
            this.distanceRan = 0;
            this.setSpeed(this.config.SPEED);
            this.time = getTimeStamp();
            this.containerEl.classList.remove(Runner.classes.CRASHED);
            this.clearCanvas();
            this.distanceMeter.reset(this.highestScore);
            this.horizon.reset();
            this.tRex.reset();
            this.playSound(this.soundFx.BUTTON_PRESS);
            this.invert(true);
            this.update();
        }
    },

    /**
     * Pause the game if the tab is not in focus.
     */
    onVisibilityChange: function (e) {
        if (document.hidden || document.webkitHidden || e.type == 'blur' ||
            document.visibilityState != 'visible') {
            this.stop();
        } else if (!this.crashed) {
            this.tRex.reset();
            this.play();
        }
    },

    /**
     * Play a sound.
     * @param {SoundBuffer} soundBuffer
     */
    playSound: function (soundBuffer) {
        if (soundBuffer) {
            var sourceNode = this.audioContext.createBufferSource();
            sourceNode.buffer = soundBuffer;
            sourceNode.connect(this.audioContext.destination);
            sourceNode.start(0);
        }
    },

    /**
     * Inverts the current page / canvas colors.
     * @param {boolean} Whether to reset colors.
     */
    invert: function (reset) {
        if (reset) {
            document.body.classList.toggle(Runner.classes.INVERTED, false);
            this.invertTimer = 0;
            this.inverted = false;
        } else {
            this.inverted = document.body.classList.toggle(Runner.classes.INVERTED,
                this.invertTrigger);
        }
    },

    /**
     * Make t-rex blink at random intervals.
     * @param {number} time Current time in milliseconds.
     */
    blink: function (time) {
        var deltaTime = time - this.tRex.animStartTime;
        if (deltaTime >= this.tRex.blinkDelay) {
            this.clearCanvas();
            this.canvasCtx.drawImage(document.getElementById('start'), 0, 0, 600, 150,
                0, 0, 600, 150);
            this.tRex.draw(this.tRex.currentAnimFrames[this.tRex.currentFrame], this.tRex.yGroundOffset);

            if (this.tRex.currentFrame == 1) {
                // Set new random delay to blink.
                this.tRex.setBlinkDelay();
                this.tRex.animStartTime = time;
                this.tRex.blinkCount++;
            }
        }
    }

};

/**
 * Updates the canvas size taking into
 * account the backing store pixel ratio and
 * the device pixel ratio.
 *
 * See article by Paul Lewis:
 * http://www.html5rocks.com/en/tutorials/canvas/hidpi/
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} opt_width
 * @param {number} opt_height
 * @return {boolean} Whether the canvas was scaled.
 */
Runner.updateCanvasScaling = function (canvas, opt_width, opt_height) {
    var context = canvas.getContext('2d');

    // Query the various pixel ratios
    var devicePixelRatio = Math.floor(window.devicePixelRatio) || 1;
    var backingStoreRatio = Math.floor(context.webkitBackingStorePixelRatio) || 1;
    var ratio = devicePixelRatio / backingStoreRatio;

    // Upscale the canvas if the two ratios don't match
    if (devicePixelRatio !== backingStoreRatio) {
        var oldWidth = opt_width || canvas.width;
        var oldHeight = opt_height || canvas.height;

        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;

        canvas.style.width = oldWidth + 'px';
        canvas.style.height = oldHeight + 'px';

        // Scale the context to counter the fact that we've manually scaled
        // our canvas element.
        context.scale(ratio, ratio);
        return true;
    } else if (devicePixelRatio == 1) {
        // Reset the canvas width / height. Fixes scaling bug when the page is
        // zoomed and the devicePixelRatio changes accordingly.
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
    }
    return false;
};

