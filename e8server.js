var config = require('./config_node.js');

var WebSocketServer = require('ws').Server, wss = new WebSocketServer({port: config.port});
var worldArray = {'Default': {}};

wss.on('close', function() {
    console.log('disconnected');
});

wss.broadcastObject = function(data) {
    for(var i in this.clients)
        this.clients[i].send(data);
};

wss.broadcastWorldsName = function (){
	var response = {'action': 'displayWorlds', 'worlds': Object.keys(worldArray)};
	for (var i in this.clients) {
		this.clients[i].send(JSON.stringify(response));
	};
}

function sendWorld(ws, worldName){
	if (worldArray[worldName]) {
		var response = {'action': 'updateWholeWorld', 'worldName': worldName, 'world': worldArray[worldName]};
		ws.send(JSON.stringify(response));
	}
}

function sendWorldsNameForNewClient(ws){
	var response = {'action': 'displayWorlds', 'worlds': Object.keys(worldArray)};
	ws.send(JSON.stringify(response));
}

wss.on('connection', function(ws) {
	sendWorld(ws, 'Default');
	sendWorldsNameForNewClient(ws);

	ws.on('message', function(message) {
		var request = JSON.parse(message);
		var worldName = request['worldName'];

		if (request['action'] == "update") {
			console.log(message);
			var objectID = request['objectID'];
			worldArray[worldName][objectID] = request['position'];
			wss.broadcast(message);
		} else if (request['action'] == "save") {
			worldArray[worldName] = request['world'];
			wss.broadcastWorldsName();
		} else if (request['action'] == "requestWorld") {
			sendWorld(ws, worldName);
		}
		
	});
});