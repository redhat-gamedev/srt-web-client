// ESLint global declarations: https://eslint.org/docs/rules/no-undef
/*
global Phaser
*/

import config from '../config.js';

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
                if (player.stuff.phaserGroup == null) {
                    const xpos = player.body.position.x + this.cameras.main.centerX;
                    const ypos = player.body.position.y + this.cameras.main.centerY;
                    const group = this.playerGroup.create(xpos, ypos, 'ship_red');
                    this.playerPhysicsGroups[player.uuid] = group;
                }
                else {
                    // otherwise just update the group's position
                    this.playerPhysicsGroups[player.uuid].setX(player.body.position.x + this.cameras.main.centerX);
                    this.playerPhysicsGroups[player.uuid].setY(player.body.position.y + this.cameras.main.centerY);
                }
            }

        });

        let xmove = 0;
        let ymove = 0;

        // grab keyboard input to move our player
        if (this.cursors.left.isDown) {
            xmove = -1 * config.FORCE_MULTIPLIER;
        }
        else if (this.cursors.right.isDown) {
            xmove = 1 * config.FORCE_MULTIPLIER;
        }

        if (this.cursors.up.isDown) {
            ymove = 1 * config.FORCE_MULTIPLIER;
        }
        else if (this.cursors.down.isDown) {
            ymove = 1 * config.FORCE_MULTIPLIER;
        }

        // handle keyboard stuff
        if ((xmove != 0) || (ymove != 0)) {
            // const keyboard_input = {
            //     type                 : 2,
            //     rawInputCommandBuffer: {
            //         type                          : 1,
            //         UUID                          : this.model.playerUuid,
            //         dualStickRawInputCommandBuffer: {
            //             pbv2Move: {
            //                 x: xmove, y: ymove,
            //             },
            //             pbv2Shoot: {
            //                 x: 0, y: 0,
            //             },
            //         },
            //     },
            // };
            // const keyboard_message = this.CommandBuffer.create(keyboard_input);
            // const keyboard_buffer = this.CommandBuffer.encode(keyboard_message).finish();

            // STOMP stuff
            // client.publish({
            //   destination: 'COMMAND.IN',
            //   binaryBody: keyboard_buffer,
            //   headers: {
            //     'content-type': 'application/octet-stream',
            //     'reply-to': 'COMMAND.OUT.' + myuuid
            //   }
            // });
        }
    }
}
