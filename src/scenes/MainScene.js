// ESLint global declarations: https://eslint.org/docs/rules/no-undef
/*
global Phaser, _
*/

/**
 * MainScene is the main scene of the game where game play happens
 */
export default class MainScene extends Phaser.Scene {
    /**
     * construct passing the unique key to the game instance
     */
    constructor() {
        super({ key: 'MainScene' });

        this.playerGroup = null;
        this.cursors = null;

        this.playerPhysicsGroups = {};

        // There is no point sending move requests to the server faster than the server tick
        this.sendMoveThrottled = _.throttle(this.sendMove, 25);
    }

    /**
     * Create the games main play scene
     *
     * @param {object} data generic data passed between scenes
     */
    create(data) {
        console.log('[MainScene] create');

        // Zoom the camera way in to account for server resolution
        this.cameras.main.zoom = 7;

        this.client = data.client;
        this.model = data.model;

        // Add the background star field image
        this.add.tileSprite(
            0,
            0,
            this.game.scale.width,
            this.game.scale.height,
            'starfield')
            .setOrigin(0);

        // Start the game play music
        const music = this.sound.add('gameplay_track_1');
        music.play();

        this.playerGroup = this.physics.add.group({
            collideWorldBounds: true,
        });
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    /**
     * Main game loop
     *
     * @param {number} time current time
     * @param {number} delta time since last loop in ms
     */
    update(time, delta) {
        // iterate over the players and draw their last known location
        Object.values(this.model.players).forEach((player) => {

            // don't do anything if we don't have a body object for the player yet
            if (player.body != null) {
                // if the player has no phaser group object, create one
                if (this.playerPhysicsGroups[player.uuid] == null) {
                    const x = player.body.position.x + this.cameras.main.centerX;
                    const y = player.body.position.y + this.cameras.main.centerY;
                    this.playerPhysicsGroups[player.uuid] = this.playerGroup.create(x, y, 'ship');
                    this.playerPhysicsGroups[player.uuid].scaleX = 0.1;
                    this.playerPhysicsGroups[player.uuid].scaleY = 0.1;
                }
                else {
                    // otherwise just update the group's position
                    const playerSprite = this.playerPhysicsGroups[player.uuid];
                    const serverX = player.body.position.x + this.cameras.main.centerX;
                    const serverY = player.body.position.y + this.cameras.main.centerY;

                    // Simple linear interpolation to smooth out position updates
                    const lerpX = Phaser.Math.Linear(playerSprite.x, serverX, 0.3);
                    const lerpY = Phaser.Math.Linear(playerSprite.y, serverY, 0.3);
                    playerSprite.setX(lerpX);
                    playerSprite.setY(lerpY);
                }
            }
        });

        let directionX = 0;
        let directionY = 0;

        // grab keyboard input to move our player
        if (this.cursors.left.isDown) {
            directionX = -1;
        }
        else if (this.cursors.right.isDown) {
            directionX = 1;
        }

        if (this.cursors.up.isDown) {
            directionY = -1;
        }
        else if (this.cursors.down.isDown) {
            directionY = 1;
        }

        // handle keyboard stuff
        if ((directionX !== 0) || (directionY !== 0)) {
            this.sendMoveThrottled(directionX, directionY);
        }
    }

    /**
     * Invokes the server client to signal a directional force for the player
     *
     * @param {number} directionX 1 for right or -1 for left
     * @param {number} directionY 1 for up -1 for down
     */
    sendMove(directionX, directionY) {
        this.client.sendMove(directionX, directionY);
    }
}
