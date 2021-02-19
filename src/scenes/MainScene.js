// ESLint global declarations: https://eslint.org/docs/rules/no-undef
/*
global Phaser
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
     */
    update() {
        // iterate over the players and draw their last known location
        Object.values(this.model.players).forEach((player) => {

            // don't do anything if we don't have a body object for the player yet
            if (player.body != null) {
                // if the player has no phaser group object, create one
                if (this.playerPhysicsGroups[player.uuid] == null) {
                    const x = player.body.position.x + this.cameras.main.centerX;
                    const y = player.body.position.y + this.cameras.main.centerY;
                    this.playerPhysicsGroups[player.uuid] = this.playerGroup.create(x, y, 'ship');
                }
                else {
                    // otherwise just update the group's position
                    this.playerPhysicsGroups[player.uuid].setX(player.body.position.x + this.cameras.main.centerX);
                    this.playerPhysicsGroups[player.uuid].setY(player.body.position.y + this.cameras.main.centerY);
                }
            }

        });

        let xMove = 0;
        let yMove = 0;

        // grab keyboard input to move our player
        if (this.cursors.left.isDown) {
            xMove = -1;
        }
        else if (this.cursors.right.isDown) {
            xMove = 1;
        }

        if (this.cursors.up.isDown) {
            yMove = 1;
        }
        else if (this.cursors.down.isDown) {
            yMove = -1;
        }

        // handle keyboard stuff
        if ((xMove !== 0) || (yMove !== 0)) {
            this.client.sendMove(xMove, yMove);
        }
    }
}
