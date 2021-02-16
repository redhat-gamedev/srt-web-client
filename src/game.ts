import config from './config';

/**
 * Main game entry class
 */
export default class Game extends Phaser.Game {

    /**
     * Construct by calling the parent constructor for Phaser.Game with our config
     */
    constructor() {
        super(config);
    }
}
