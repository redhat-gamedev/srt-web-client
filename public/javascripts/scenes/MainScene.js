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

        this.quitButton = null;

        this.playerPhysicsGroups = {};
        this.hudArray = {};

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

        // Add the quit button
        this.quitButton = this.add.sprite(1900, 30, 'quit_button').setInteractive();
        this.quitButton.scale = 0.1;
        this.quitButton.on('pointerdown', function(pointer) {
            // see https://stackoverflow.com/questions/55264077/phaser-3-clickable-sprite-cant-start-scene for
            // why we use scene.scene
            this.scene.scene.start('QuitScene', { client: data.client });
        });


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

            // check if the player should be reaped
            if (player.toDestroy == true) {
                console.log('reap player: ' + player.uuid);

                // delete the group for the player
                this.playerPhysicsGroups[player.uuid].destroy();

                // remove the player from the list
                delete this.model.players[player.uuid];
            }
            // don't do anything if we don't have a body object for the player yet
            else if (player.body != null) {
                // if the player has no phaser group object, create one
                if (this.playerPhysicsGroups[player.uuid] == null) {
                    const textStyle = {
                        font           : '32px Arial',
                        fill           : '#ff0044',
                        align          : 'center',
                        backgroundColor: '#ffff00',
                    };
                    const x = player.body.position.x + this.cameras.main.centerX;
                    const y = player.body.position.y + this.cameras.main.centerY;
                    this.playerPhysicsGroups[player.uuid] = this.playerGroup.create(x, y, 'ship');
                    const shortPlayerUUID = player.uuid.slice(player.uuid.length - 6);
                    this.hudArray[player.uuid] = this.add.text(x,y,shortPlayerUUID);
                    this.playerPhysicsGroups[player.uuid].scale = 0.5;
                    // box2d angle is in radians, and rotation in phaser is in radians
                    this.playerPhysicsGroups[player.uuid].setRotation(player.body.angle);
                    this.playerPhysicsGroups[player.uuid].setAngle(this.playerPhysicsGroups[player.uuid].angle + 90);
                }
                else {
                    // otherwise just update the group's position
                    const playerSprite = this.playerPhysicsGroups[player.uuid];
                    const playerHud = this.hudArray[player.uuid];
                    const serverX = player.body.position.x + this.cameras.main.centerX;
                    const serverY = player.body.position.y + this.cameras.main.centerY;

                    // Simple linear interpolation to smooth out position updates
                    const lerpX = Phaser.Math.Linear(playerSprite.x, serverX, 0.3);
                    const lerpY = Phaser.Math.Linear(playerSprite.y, serverY, 0.3);
                    playerSprite.setX(lerpX);
                    playerSprite.setY(lerpY);
                    playerSprite.setRotation(player.body.angle);
                    playerSprite.setAngle(playerSprite.angle + 90);
                    playerHud.setX(lerpX);
                    playerHud.setY(lerpY);
                }
            }
        });

        let directionX = 0;
        let directionY = 0;

        // grab keyboard input to move our player
        if (this.cursors.left.isDown) {
            directionY = -1;
        }
        else if (this.cursors.right.isDown) {
            directionY = 1;
        }

        if (this.cursors.up.isDown) {
            directionX = 1;
        }
        else if (this.cursors.down.isDown) {
            directionX = -1;
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
