var config = require('./config_node.js');

var WebSocketServer = require('ws').Server, wss = new WebSocketServer({port: config.port});
var world = {};
var locked = [];

wss.on('close', function() {
    console.log('disconnected');
});

wss.broadcast = function(data) {
    for(var i in this.clients)
        this.clients[i].send(data);
};

function sendWorldForNewClient(ws){
	var response = {'action': 'getWorld', 'world': world};
	ws.send(JSON.stringify(response));
}

wss.on('connection', function(ws) {
	sendWorldForNewClient(ws);

	ws.on('message', function(message) {
		var request = JSON.parse(message);

		if (request['action'] == "update") {
			var objectID = request['objectID'];
			world[objectID] = request['position'];
			wss.broadcast(message);
		} else if(request['action'] == "lock") {
			var objectID = 	request['objectID'];
			locked[objectID] = true;
			wss.broadcast(message);
		} else if(request['action'] == "unlock") {
			var objectID = 	request['objectID'];
			locked[objectID] = false;
			wss.broadcast(message);
		} else if(request['action'] == "getLockArray") {
			if(locked.length == 0) {
				// first client
				locked = request['proposedArray'];
				return;
			}
			var message = {'action': 'sendLockArray', 'array': locked};
			ws.send(JSON.stringify(message));
		} else if(request['action'] == "resetWorld") {
			world = {};
			locked = request['lockedArray'];
			wss.broadcast(message);
		}
	});
});