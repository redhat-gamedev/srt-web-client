// ESLint global declarations: https://eslint.org/docs/rules/no-undef
/*
global Phaser
*/

import PreloadScene from './scenes/PreloadScene.js';
import MenuScene from './scenes/MenuScene.js';
import MainScene from './scenes/MainScene.js';
import QuitScene from './scenes/QuitScene.js';

/**
 * Main game entry class don't add much code here this is just a launcher
 */
export default class Game extends Phaser.Game {
    /**
     * Construct by calling the parent constructor for Phaser.Game with our config
     */
    constructor() {
        // Phaser config object to pass when creating the game
        const config = {
            type           : Phaser.WEBGL,
            backgroundColor: '#ffffff',
            scale          : {
                parent: 'phaser-game',
                mode  : Phaser.Scale.RESIZE,
            },
            physics: {
                default: 'arcade',
                arcade : {
                    debug: false, // TODO: figure out how to get this from config.js
                },
            },
            scene: [PreloadScene, MenuScene, MainScene, QuitScene],
        };
        super(config);
    }
}
