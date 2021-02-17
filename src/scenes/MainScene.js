// ESLint global declarations: https://eslint.org/docs/rules/no-undef
/*
global Phaser, uuidv4, protobuf
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

        // Initialize properties
        this.players = {};
        this.myuuid = uuidv4();
        this.playerUuid = '';

        // Protobuff stuff
        this.CommandBuffer = null;
        this.SecurityCommandBuffer = null;
        this.GameEventBuffer = null;
        this.EntityGameEventBuffer = null;
        this.RawInputCommandBuffer = null;

        this.playerGroup = null;
        this.cursors = null;
    }

    /**
     * Load the protobufs
     */
    async loadProtobufs() {
        try {
            const loadCommandBuffer = await protobuf.load('./network/proto/CommandBuffer.proto');
            this.CommandBuffer = loadCommandBuffer.lookupType('redhatgamedev.srt.CommandBuffer');

            const loadSecurityCommandBuffer = await protobuf.load('./network/proto/SecurityCommandBuffer.proto');
            this.SecurityCommandBuffer = loadSecurityCommandBuffer.lookupType('redhatgamedev.srt.SecurityCommandBuffer');

            const loadGameEventBuffer = await protobuf.load('./network/proto/GameEventBuffer.proto');
            this.GameEventBuffer = loadGameEventBuffer.lookupType('redhatgamedev.srt.GameEventBuffer');

            const loadEntityGameEventBuffer = await protobuf.load('./network/proto/EntityGameEventBuffer.proto');
            this.EntityGameEventBuffer = loadEntityGameEventBuffer.lookupType('redhatgamedev.srt.EntityGameEventBuffer');

            const loadRawInputCommandBuffer = await protobuf.load('./network/proto/RawInputCommandBuffer.proto');
            this.RawInputCommandBuffer = loadRawInputCommandBuffer.lookupType('redhatgamedev.srt.RawInputCommandBuffer');
        }
        catch (e) {
            console.error('Error while loading protobufs');
            throw e;
        }
    }

    /**
     * Set all the event handlers for the AMQP client events
     */
    async setupAMQPClient() {
        // AMQP messaging initialization
        this.client = require('rhea');
        this.ws = this.client.websocket_connect(WebSocket);
        this.connection = this.client.connect({
            'connection_details': this.ws(config.BROKER_ENDPOINT),
            'reconnect'         : false,
        });
        this.mainGameEventReceiver = this.connection.open_receiver('GAME.EVENT.OUT');
        this.personalGameEventReceiver = this.connection.open_receiver('COMMAND.OUT.' + this.myuuid);
        this.sender = this.connection.open_sender('COMMAND.IN');

        // const brokerEndpoint = this.broker_endpoint;
        // const players = this.players;
        // const player_uuid = this.player_uuid;
        // const GameEventBuffer = this.GameEventBuffer;

        this.client.on('connection_open', () => {
            console.log('AMQP connection open to', config.BROKER_ENDPOINT);
        });

        this.client.on('receiver_open', (context) => {
            console.log('receiver_open: ' + context.receiver.source.address);
        });

        this.client.on('sender_open', () => {
            console.log('sender_open');
        });

        // // i.e. received a message
        // client.on('message', function (context) {
        //     console.log('received ' + context.message.body);
        // });

        // i.e. we have credit to do a send
        this.client.on('sendable', () => {
            console.log('sendable');
        });

        this.client.on('disconnected', () => {
            console.log('disconnected');
        });

        try {
            // there can be only one -- join, that is
            const sbcJoin = { type: 1, securityCommandBuffer: { type: 1, UUID: this.myuuid } };
            const scbJoinMessage = this.CommandBuffer.create(sbcJoin);
            const scbJoinBuffer = this.CommandBuffer.encode(scbJoinMessage).finish();

            // STOMP stuff
            // client.publish({
            //     destination: 'COMMAND.IN',
            //     binaryBody: scbJoinBuffer,
            //     headers: {
            //         'content-type': 'application/octet-stream',
            //         'reply-to': 'COMMAND.OUT.' + myuuid
            //     },
            // });

            // AMQP stuff
            const amqpMessage = this.client.message;
            const body = amqpMessage.data_section(scbJoinBuffer);
            this.sender.send({ body });

            const playerInitialize = (UUID) => {
                this.players[UUID] = { body: null, stuff: {} };
            };

            const processSecurityGameEvent = function(buffer) {
                switch (buffer.type) {
                    case 1:
                        console.log('a player joined: ' + buffer.joinSecurityGameEventBuffer.UUID);
                        // a security game event with a type of 1 is a player join
                        // create an entity in the player array with the incoming uuid
                        playerInitialize(buffer.joinSecurityGameEventBuffer.UUID);
                        break;
                }
            };

            const processEntityGameEvent = (buffer) => {
                if (this.players[buffer.UUID] == null) {
                    console.log('found a player we don\'t know about');
                    playerInitialize(buffer.UUID);
                }
                // just store the pbbody details for the player
                this.players[buffer.UUID].body = buffer.body;
            };

            // the function when game event messages are received
            const gameEventMessageCallback = (message) => {
                console.log('gameEventMessageCallback');
                // called when the client receives a STOMP message from the server
                // if (message.binaryBody) {
                if (message.body) {
                    // console.log("gemc has message.body");
                    // we always receive a gameevent
                    // const decodedEventMessage = GameEventBuffer.decode(message.binaryBody);
                    // console.log("gemc message is " + message);
                    // console.log("gemc message.body is " + message.body);
                    // console.log("gemc message.body.contentType is " + message.body.contentType);
                    // console.log("gemc message.body.content is " + message.body.content);
                    // // console.log("gemc message.body Uint8Array is " + Uint8Array(message.body));
                    // var u8a = new Uint8Array(message.body);
                    // console.log("gemc message.body Uint8Array is " + u8a);
                    // console.log("gemc message body typecode " + message.body.typecode);
                    // // console.log("qemc message.body.content.length is " + message.body.content.length);
                    // console.log("qemc message.body.content is " + message.body.content);
                    // console.log("qemc message.content is " + message.content);
                    // console.log("gemc message.body.data is " + message.body.data);
                    // console.log("gemc message.body.data_section is " + message.body.data_section);
                    // console.log("gemc message.binary is " + message.binary);
                    // console.log("qemc message.typecode is " + message.typecode);


                    // var decoded = client.decode(message);
                    // console.log("gemc message decoded is " + decoded);
                    // var binaryBody = message.body.data;
                    // const decodedEventMessage = GameEventBuffer.decode(message.body);
                    const decodedEventMessage = this.GameEventBuffer.decode(message.body);
                    // console.log("gemc after decoding message.body - dem is " + decodedEventMessage);
                    // console.log(decodedEventMessage);)

                    // check on what type of game event we received
                    switch (decodedEventMessage.type) {
                        case 2:
                            // console.log('got a security event');
                            // console.log(decodedEventMessage);
                            // security message
                            processSecurityGameEvent(decodedEventMessage.securityGameEventBuffer);
                            break;
                        case 1:
                            // console.log("gemc got an entity game event");
                            // entity game event buffer is about a specific player
                            processEntityGameEvent(decodedEventMessage.entityGameEventBuffer);
                            break;
                        default:
                            console.log('gemc got a default');
                    }
                }
                else {
                    console.log('for some reason we got a message with no binary body');
                }
            };

            // AMQP stuff
            // i.e. received a message
            this.mainGameEventReceiver.on('message', (context) => {
                // console.log('received ' + context.message.body);
                gameEventMessageCallback(context.message);
            });

            const commandMessageCallback = (message) => {
                console.log('got a command message');
                if (message.binaryBody) {
                    // the command message is just our unique player UUID
                    this.playerUuid = new TextDecoder('utf-8').decode(message.binaryBody);
                    console.log('unique player uuid: ' + this.playerUuid);
                }
            };

            this.personalGameEventReceiver.on('message', function(context) {
                commandMessageCallback(context.message);
            });

        }
        catch (e) {
            console.error('Error during client initialization');
            throw e;
            /* handle error */
        }
    }

    /**
     * Preload
     */
    async preload() {
        await this.loadProtobufs();
        await this.setupAMQPClient();
    }

    /**
     * Create the games main play scene
     */
    create() {
        console.log('[MainScene] create');

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
        Object.values(this.players).forEach((player) => {

            // don't do anything if we don't have a body object for the player yet
            if (player.body != null) {
                // if the player has no phaser group object, create one
                if (player.stuff.phaserGroup == null) {
                    const xpos = player.body.position.x + (config.RESOLUTION_WIDTH / 2);
                    const ypos = player.body.position.y + (config.RESOLUTION_HEIGHT / 2);
                    player.stuff.phaserGroup = this.playerGroup.create(xpos, ypos, 'spacepod');
                }
                else {
                    // otherwise just update the group's position
                    player.stuff.phaserGroup.x = player.body.position.x + (this.resolution_width / 2);
                    player.stuff.phaserGroup.y = player.body.position.y + (this.resolution_height / 2);
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
            //         UUID                          : this.player_uuid,
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
