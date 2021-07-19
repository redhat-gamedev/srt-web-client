const express = require('express');
const router = express.Router();

// keycloak-y things
const Keycloak = require('keycloak-connect');
const session = require('express-session');
const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore });

// route protected with Keycloak
router.get('/test', keycloak.protect(), function(req, res) {
    res.render('test', { title: 'Test of the test' });
});
module.exports = router;
