// ESLint global declarations: https://eslint.org/docs/rules/no-undef
/*
global Phaser, _
*/

/**
 * QuitScene is the scene loaded after the player clicks the quit button.
 */
export default class QuitScene extends Phaser.Scene {
    /**
     * construct passing the unique key to the game instance
     */
    constructor() {
        super({ key: 'QuitScene' });

    }

    /**
     * Create the quit scene
     *
     * @param {object} data generic data passed between scenes
     */
    create(data) {
        console.log('[QuitScene] create');
        this.client = data.client;

        this.client.sendLeave();
    }
}
