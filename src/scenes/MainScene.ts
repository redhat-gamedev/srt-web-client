import config from '../config';
import { v4 as uuidv4 } from 'uuid';
import protobuf from 'protobufjs';
import CursorKeys = Phaser.Types.Input.Keyboard.CursorKeys;
import { Container, Connection, EventContext, Receiver, Sender } from 'rhea';

/**
 * MainScene is the main scene of the game where game play happens
 */
export default class MainScene extends Phaser.Scene {
    private readonly myuuid: string;
    private player_uuid: string;
    private readonly force_multiplier: number;
    private readonly broker_endpoint: string;
    private players: Players;

    private readonly resolution_width: number;
    private readonly resolution_height: number;

    // Protobuff stuff
    private CommandBuffer: protobuf.Type;
    private SecurityCommandBuffer: protobuf.Type;
    private GameEventBuffer: protobuf.Type;
    private EntityGameEventBuffer: protobuf.Type;
    private RawInputCommandBuffer: protobuf.Type;

    private player_group: Phaser.Physics.Arcade.Group;
    private cursors: CursorKeys;

    // AMQP messaging stuff
    private client: Container;
    private ws: any;
    private connection: Connection;
    private main_game_event_receiver: Receiver;
    private personal_game_event_receiver: Receiver;
    private sender: Sender;

    /**
     * construct passing the unique key to the game instance
     */
    constructor() {
        super({ key: 'MainScene' });

        // Initialize properties
        this.players = {};
        this.myuuid = uuidv4();
        this.force_multiplier = config.FORCE_MULTIPLIER;
        this.broker_endpoint = config.BROKER_ENDPOINT;

        this.resolution_width = 800;
        this.resolution_height = 600;
    }

    /**
     *
     */
    async loadRhea():Promise<void> {
        this.client = require('rhea');
    }

    /**
     * Load the protobufs
     */
    async loadProtobufs(): Promise<void> {
        try {
            const loadCommandBuffer = await protobuf.load('../network/proto/CommandBuffer.proto');
            this.CommandBuffer = loadCommandBuffer.lookupType('redhatgamedev.srt.CommandBuffer');

            const loadSecurityCommandBuffer = await protobuf.load('../network/proto/SecurityCommandBuffer.proto');
            this.SecurityCommandBuffer = loadSecurityCommandBuffer.lookupType('redhatgamedev.srt.SecurityCommandBuffer');

            const loadGameEventBuffer = await protobuf.load('../network/proto/GameEventBuffer.proto');
            this.GameEventBuffer = loadGameEventBuffer.lookupType('redhatgamedev.srt.GameEventBuffer');

            const loadEntityGameEventBuffer = await protobuf.load('../network/proto/EntityGameEventBuffer.proto');
            this.EntityGameEventBuffer = loadEntityGameEventBuffer.lookupType('redhatgamedev.srt.EntityGameEventBuffer');

            const loadRawInputCommandBuffer = await protobuf.load('../network/proto/RawInputCommandBuffer.proto');
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
    async setupAMQPClient(): Promise<void> {
        // // AMQP messaging initialization
        this.ws = this.client.websocket_connect(WebSocket);
        this.connection = this.client.connect({
            'connection_details': this.ws(this.broker_endpoint),
            'reconnect'         : false,
        });
        this.main_game_event_receiver = this.connection.open_receiver('GAME.EVENT.OUT');
        this.personal_game_event_receiver = this.connection.open_receiver('COMMAND.OUT.' + this.myuuid);
        this.sender = this.connection.open_sender('COMMAND.IN');

        const brokerEndpoint = this.broker_endpoint;
        const players = this.players;
        const player_uuid = this.player_uuid;
        const GameEventBuffer = this.GameEventBuffer;

        this.client.on('connection_open', () => {
            console.log('AMQP connection open to', brokerEndpoint);
        });

        this.client.on('receiver_open', (context: EventContext) => {
            console.log('receiver_open: ' + context.receiver.source.address);
        });

        this.client.on('sender_open', function() {
            console.log('sender_open');
        });

        // // i.e. received a message
        // client.on('message', function (context) {
        //     console.log('received ' + context.message.body);
        // });

        // i.e. we have credit to do a send
        this.client.on('sendable', function() {
            console.log('sendable');
        });

        this.client.on('disconnected', function() {
            console.log('disconnected');
        });

        try {
            // there can be only one -- join, that is
            const scb_join = { type: 1, securityCommandBuffer: { type: 1, UUID: this.myuuid } };
            const scb_join_message = this.CommandBuffer.create(scb_join);
            const scb_join_buffer = this.CommandBuffer.encode(scb_join_message).finish();

            // STOMP stuff
            // client.publish({
            //     destination: 'COMMAND.IN',
            //     binaryBody: scb_join_buffer,
            //     headers: {
            //         'content-type': 'application/octet-stream',
            //         'reply-to': 'COMMAND.OUT.' + myuuid
            //     },
            // });

            // AMQP stuff
            const amqp_message = this.client.message;
            const body = amqp_message.data_section(scb_join_buffer);
            this.sender.send({ body });

            const player_initialize = function(UUID: string) {
                players[UUID] = { body: null, stuff: {} };
            };

            const process_security_game_event = function(buffer: any) {
                switch (buffer.type) {
                    case 1:
                        console.log('a player joined: ' + buffer.joinSecurityGameEventBuffer.UUID);
                        // a security game event with a type of 1 is a player join
                        // create an entity in the player array with the incoming uuid
                        player_initialize(buffer.joinSecurityGameEventBuffer.UUID);
                        break;
                }
            };

            const process_entity_game_event = function(buffer: any) {
                if (players[buffer.UUID] == null) {
                    console.log('found a player we don\'t know about');
                    player_initialize(buffer.UUID);
                }
                // just store the pbbody details for the player
                players[buffer.UUID].body = buffer.body;
            };

            // the function when game event messages are received
            const game_event_message_callback = function(message: any) {
                console.log('game_event_message_callback');
                // called when the client receives a STOMP message from the server
                // if (message.binaryBody) {
                if (message.body) {
                    // console.log("gemc has message.body");
                    // we always receive a gameevent
                    // const decoded_event_message = GameEventBuffer.decode(message.binaryBody);
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
                    // const decoded_event_message = GameEventBuffer.decode(message.body);
                    const decoded_event_message = GameEventBuffer.decode(message.body) as any;
                    // console.log("gemc after decoding message.body - dem is " + decoded_event_message);
                    // console.log(decoded_event_message);)

                    // check on what type of game event we received
                    switch (decoded_event_message.type) {
                        case 2:
                            // console.log('got a security event');
                            // console.log(decoded_event_message);
                            // security message
                            process_security_game_event(decoded_event_message.securityGameEventBuffer);
                            break;
                        case 1:
                            // console.log("gemc got an entity game event");
                            // entity game event buffer is about a specific player
                            process_entity_game_event(decoded_event_message.entityGameEventBuffer);
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
            this.main_game_event_receiver.on('message', function(context: EventContext) {
                // console.log('received ' + context.message.body);
                game_event_message_callback(context.message);
            });

            const command_message_callback = (message: any) => {
                console.log('got a command message');
                if (message.binaryBody) {
                    // the command message is just our unique player UUID
                    this.player_uuid = new TextDecoder('utf-8').decode(message.binaryBody);
                    console.log('unique player uuid: ' + player_uuid);
                }
            };

            this.personal_game_event_receiver.on('message', function(context) {
                command_message_callback(context.message);
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
    async preload(): Promise<void> {
        await this.loadRhea();
        await this.loadProtobufs();
        await this.setupAMQPClient();
    }

    /**
     * Create the games main play scene
     */
    create(): void {
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

        this.player_group = this.physics.add.group({
            collideWorldBounds: true,
        });
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    /**
     * Main game loop
     */
    update(): void {
        // iterate over the players and draw their last known location
        Object.values(this.players).forEach((player: Player) => {

            // don't do anything if we don't have a body object for the player yet
            if (player.body != null) {
                // if the player has no phaser group object, create one
                if (player.stuff.phaser_group == null) {
                    const xpos = player.body.position.x + (this.resolution_width / 2);
                    const ypos = player.body.position.y + (this.resolution_height / 2);
                    player.stuff.phaser_group = this.player_group.create(xpos, ypos, 'spacepod');
                }
                else {
                    // otherwise just update the group's position
                    player.stuff.phaser_group.x = player.body.position.x + (this.resolution_width / 2);
                    player.stuff.phaser_group.y = player.body.position.y + (this.resolution_height / 2);
                }
            }

        });

        let xmove = 0;
        let ymove = 0;

        // grab keyboard input to move our player
        if (this.cursors.left.isDown) {
            xmove = -1 * this.force_multiplier;
        }
        else if (this.cursors.right.isDown) {
            xmove = 1 * this.force_multiplier;
        }

        if (this.cursors.up.isDown) {
            ymove = 1 * this.force_multiplier;
        }
        else if (this.cursors.down.isDown) {
            ymove = 1 * this.force_multiplier;
        }

        // handle keyboard stuff
        if ((xmove != 0) || (ymove != 0)) {
            const keyboard_input = {
                type                 : 2,
                rawInputCommandBuffer: {
                    type                          : 1,
                    UUID                          : this.player_uuid,
                    dualStickRawInputCommandBuffer: {
                        pbv2Move: {
                            x: xmove, y: ymove,
                        },
                        pbv2Shoot: {
                            x: 0, y: 0,
                        },
                    },
                },
            };
            const keyboard_message = this.CommandBuffer.create(keyboard_input);
            const keyboard_buffer = this.CommandBuffer.encode(keyboard_message).finish();

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
