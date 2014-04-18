var config = require('./config_node.js');

var WebSocketServer = require('ws').Server, wss = new WebSocketServer({port: config.port});
var world = {};

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
		
		// console.log(JSON.stringify(Object.keys(worldArray)));

		if (request['action'] == "update") {
			// worldArray[worldName] = request['world'];
			
			var objectID = request['objectID'];
			worldArray[worldName][objectID] = request['position'];
			
			wss.broadcast(message);
		} else if (request['action'] == "save") {
			worldArray[worldName] = request['world'];
			wss.broadcastWorldsName();
		}
		
	});
});