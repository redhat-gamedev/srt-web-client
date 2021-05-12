// ESLint global declarations: https://eslint.org/docs/rules/no-undef
/*
global Phaser
*/

import AMQPGameClient from '../network/AMQPGameClient.js';
import config from '../config.js';
import GameModel from '../model/GameModel.js';

/**
 * PreloadScene loads all the static assets and initializes the game
 */
export default class PreloadScene extends Phaser.Scene {

    /**
     * construct passing the unique key to the game instance
     */
    constructor() {
        super({ key: 'PreloadScene' });

        // Instantiate game model
        this.model = new GameModel();
    }

    /**
     * preload the game assets i.e. images, audio, animations
     */
    async preload() {
        console.log('[PreloadScene] loading assets...');

        this.load.setBaseURL('assets');

        // Load images
        this.load.image('starfield', './images/starfield.jpg');
        this.load.image('spacepod', './images/spacepod.png');
        this.load.image('ship_blue', './images/spaceship_blue.png');
        this.load.image('ship_red', './images/spaceship_red.png');
        this.load.image('ship', './images/ship.png');

        // These from the Kenney UI Pack: Space Expansion
        // https://kenney.nl/assets/ui-pack-space-expansion
        this.load.image('glass-panel', './images/glassPanel.png');
        this.load.image('cursor-hand', './images/cursor_hand.png');


        // Load audio
        this.load.audio('gameplay_track_1', [
            './audio/music_srt_gameplay_singularity.mp3',
            './audio/music_srt_gameplay_singularity.ogg',
        ]);

        // Create the AMQP client and initialize, this instance will be passed between scenes
        this.client = new AMQPGameClient(config.BROKER_ENDPOINT, this.model);
        await this.client.init();
    }

    /**
     * Pre-create any static objects that will be used in the game e.g. animations
     */
    create() {
        this.scene.start('MenuScene', { client: this.client, model: this.model });
    }
}
