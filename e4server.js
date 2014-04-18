var config = require('./config_node.js');

var WebSocketServer = require('ws').Server, wss = new WebSocketServer({port: config.port});
var worldArray = {};

wss.on('close', function() {
    console.log('disconnected');
});

wss.broadcast = function(data) {
    for(var i in this.clients)
        this.clients[i].send(data);
};

wss.on('connection', function(ws) {
	ws.send(JSON.stringify(worldArray['undefined']));
	ws.on('message', function(message) {
		var request = JSON.parse(message);
		var worldName = request['worldName'];
		
		console.log(JSON.stringify(worldArray));

		if (request['action'] == "update") {
			worldArray[worldName] = request['world'];
			wss.broadcast(message);
		} else if (request['action'] == "save") {
			worldArray[worldName] = request['world'];
		}
	});
});