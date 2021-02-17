// ESLint global declarations: https://eslint.org/docs/rules/no-undef
/*
global Phaser
*/

/**
 * MenuScene is the scene of the main menu of the game
 */
export default class MenuScene extends Phaser.Scene {

    /**
     * construct passing the unique key to the game instance
     */
    constructor() {
        super({ key: 'MenuScene' });
    }

    /**
     * Create the games Main Menu
     */
    create() {
        console.log('[MenuScene] create');

        // TODO: create a main menu "Play" button
        this.scene.start('MainScene');
    }
}
