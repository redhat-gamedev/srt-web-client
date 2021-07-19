#!/bin/bash
export DST="public/javascripts"
cp node_modules/phaser/dist/phaser.min.js $DST
cp node_modules/rhea/dist/rhea.min.js $DST
cp node_modules/uuid/dist/umd/uuidv4.min.js $DST
cp node_modules/protobufjs/dist/protobuf.js* $DST
cp node_modules/lodash/lodash.min.js $DST