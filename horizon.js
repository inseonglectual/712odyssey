/**
 * Horizon background class.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} spritePos Sprite positioning.
 * @param {Object} dimensions Canvas dimensions.
 * @param {number} gapCoefficient
 * @constructor
 */
function Horizon(canvas, spritePos, dimensions, gapCoefficient) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.config = Horizon.config;
    this.dimensions = dimensions;
    this.gapCoefficient = gapCoefficient;
    this.obstacles = [];
    this.horizonOffsets = [0, 0];
    this.spritePos = spritePos;
    this.collisions = 0;
    this.remainingMembers = [0,1,2,3,4,5,6,7];

    // Cloud
    this.clouds = [];
    this.cloudSpeed = this.config.BG_CLOUD_SPEED;

    // Horizon
    this.horizonLine = null;
    this.init();
};


/**
 * Horizon config.
 * @enum {number}
 */
Horizon.config = {
    BG_CLOUD_SPEED: 2,
    BUMPY_THRESHOLD: .3,
    HORIZON_HEIGHT: 16,
};


Horizon.prototype = {
    /**
     * Initialise the horizon. Just add the line and a cloud. No obstacles.
     */
    init: function () {
        this.addCloud(0, true);
        this.horizonLine = new HorizonLine(this.canvas, this.spritePos.HORIZON);
    },

    /**
     * @param {number} deltaTime
     * @param {number} currentSpeed
     * @param {boolean} updateObstacles Used as an override to prevent
     *     the obstacles from being updated / added. This happens in the
     *     ease in section.
     */
    update: function (deltaTime, currentSpeed, updateObstacles) {
        this.runningTime += deltaTime;
        this.horizonLine.update(deltaTime, currentSpeed);
        this.updateClouds(deltaTime, currentSpeed);

        if (updateObstacles) {
            this.updateObstacles(deltaTime, currentSpeed);
        }
    },

    /**
     * Update the cloud positions.
     * @param {number} deltaTime
     * @param {number} currentSpeed
     */
    updateClouds: function (deltaTime, speed) {
        BACKGROUNDNUM = this.clouds[0].backgroundNum;
        var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
        var numClouds = this.clouds.length;

        for (var i = numClouds - 1; i >= 0; i--) {
            this.clouds[i].update(cloudSpeed);
        }



        if((!this.clouds[0].screenFilled) && (this.clouds.length < 2)){
            if(this.clouds[0].backgroundNum==backgrounds.length-1){
                this.addCloud(0);
            } else{
                this.addCloud(this.clouds[0].backgroundNum+1);
            }
            
        }

        // Remove expired clouds.
        this.clouds = this.clouds.filter(function (obj) {
            return !obj.remove;
        });


    },

    /**
     * Update the obstacle positions.
     * @param {number} deltaTime
     * @param {number} currentSpeed
     */
    updateObstacles: function (deltaTime, currentSpeed) {
        // Obstacles, move to Horizon layer.
        var updatedObstacles = this.obstacles.slice(0);

        for (var i = 0; i < this.obstacles.length; i++) {
            var obstacle = this.obstacles[i];
            obstacle.update(deltaTime, currentSpeed);

            // Clean up existing obstacles.
            if (obstacle.remove) {
                updatedObstacles.shift();
            }
        }
        this.obstacles = updatedObstacles;

        if (this.obstacles.length > 0) {
            var lastObstacle = this.obstacles[this.obstacles.length - 1];

            if (lastObstacle && !lastObstacle.followingObstacleCreated &&
                lastObstacle.isVisible() &&
                (lastObstacle.xPos + lastObstacle.width + lastObstacle.gap) <
                this.dimensions.WIDTH) {
                this.addNewObstacle(currentSpeed);
                lastObstacle.followingObstacleCreated = true;
            }
        } else {
            // Create new obstacles.
            this.addNewObstacle(currentSpeed);
        }
    },

    removeFirstObstacle: function () {
        this.obstacles.shift();
    },

    /**
     * Add a new obstacle.
     * @param {number} currentSpeed
     */
    addNewObstacle: function (currentSpeed) {
        //console.log("add obstacle");
        var member = -1;
        if(this.collisions >= 712){
            var obstacleType = Obstacle.types[2];
            this.obstacles.push(new Obstacle(this.canvasCtx, Obstacle.types[2],
                {x:280, y:20}, this.dimensions,
                this.gapCoefficient, currentSpeed, obstacleType.width, -1));
            return;
        }
        if (this.collisions%memberGap == 0 && this.collisions != 0 && this.remainingMembers.length>0) {
            var obstacleType = Obstacle.types[1];
            this.remainingMembers.sort(function() {
                return .5 - Math.random();
              });
            member = this.remainingMembers.pop();
            var memberX = member*40+10;
            var obstacleSpritePos = {x: memberX, y: 50};
        }
        else{
            var obstacleType = Obstacle.types[0];
            var obstacleSpritePos = this.spritePos[obstacleType.type];
        }
        if (currentSpeed < obstacleType.minSpeed) {
            this.addNewObstacle(currentSpeed);
        } 
        else {
            this.obstacles.push(new Obstacle(this.canvasCtx, obstacleType,
                obstacleSpritePos, this.dimensions,
                this.gapCoefficient, currentSpeed, obstacleType.width, member));
        }
    },

    /**
     * Reset the horizon layer.
     * Remove existing obstacles and reposition the horizon line.
     */
    reset: function () {
        this.obstacles = [];
        this.horizonLine.reset();
    },

    /**
     * Update the canvas width and scaling.
     * @param {number} width Canvas width.
     * @param {number} height Canvas height.
     */
    resize: function (width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    },

    /**
     * Add a new cloud to the horizon.
     */
    addCloud: function (backgroundNum, start) {
        this.clouds.push(new Cloud(this.canvas, this.spritePos.CLOUD,
            this.dimensions.WIDTH,backgroundNum,start));
    }
};
