var config = require('./config_node.js');

var WebSocketServer = require('ws').Server, wss = new WebSocketServer({port: config.port});
var worldArray = {'Default': ''};

wss.on('close', function() {
    console.log('disconnected');
});

wss.broadcast = function(data) {
    for(var i in this.clients)
        this.clients[i].send(data);
};

wss.broadcastWorldsName = function (){
	var response = {'action': 'displayWorlds', 'worlds': Object.keys(worldArray)};
	for (var i in this.clients) {
		this.clients[i].send(JSON.stringify(response));
	};
}

function sendWorldForNewClient(ws){
	console.log(JSON.stringify(worldArray['Default']));
	if (worldArray['Default']) {
		var response = {'action': 'updateWholeWorld', 'worldName': 'Default', 'world': worldArray['Default']};
		ws.send(JSON.stringify(response));
	}
}

function sendWorldsNameForNewClient(ws){
	var response = {'action': 'displayWorlds', 'worlds': Object.keys(worldArray)};
	ws.send(JSON.stringify(response));
}

wss.on('connection', function(ws) {
	sendWorldForNewClient(ws);
	sendWorldsNameForNewClient(ws);

	ws.on('message', function(message) {
		var request = JSON.parse(message);
		var worldName = request['worldName'];
		
		console.log(JSON.stringify(Object.keys(worldArray)));

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