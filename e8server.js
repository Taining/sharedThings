var config = require('./config_node.js');

var WebSocketServer = require('ws').Server, wss = new WebSocketServer({port: config.port});
var worldArray = {'Default': []};

var locked = {'Default': []};

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
};

function sendWorld(ws, worldName){
	if (!worldArray[worldName]) console.log("undefined world");
	if (worldArray[worldName]) {
		console.log("update whole world: "+worldName);
		var response = {'action': 'updateWholeWorld', 'world': worldArray[worldName], 'locked':locked[worldName]};
		ws.send(JSON.stringify(response));
	}
}

function sendWorldsNameForNewClient(ws){
	var response = {'action': 'displayWorlds', 'worlds': Object.keys(worldArray)};
	ws.send(JSON.stringify(response));
}

wss.on('connection', function(ws) {
	// sendWorld(ws, 'Default');
	sendWorldsNameForNewClient(ws);

	ws.on('message', function(message) {
		var request = JSON.parse(message);
		var worldName = request['worldName'];

		if (request['action'] == "update") {
			console.log(message);
			var objectID = request['objectID'];
			worldArray[worldName][objectID] = request['position'];
			wss.broadcastObject(message);
		} else if (request['action'] == "save") {
			worldArray[worldName] = request['world'];
			locked[worldName] = request['locked'];
			wss.broadcastWorldsName();
		} else if (request['action'] == "requestWorld") {
			sendWorld(ws, worldName);
			
		} else if(request['action'] == "lock") {
			var worldName = request['worldName'];
			var objectID = 	request['objectID'];
			locked[worldName][objectID] = true;
			wss.broadcastObject(message);
			
		} else if(request['action'] == "unlock") {
			var worldName = request['worldName'];
			var objectID = 	request['objectID'];
			locked[worldName][objectID] = false;
			wss.broadcastObject(message);
			
		} else if(request['action'] == "getLockArray") {
			if(locked['Default'].length == 0) {
				// first client
				console.log("locked array is empty, accept proposed locked array");
				console.log(JSON.stringify(request['proposedArray']));
				locked['Default'] = request['proposedArray'];
				return;
			}
			var message = {'action': 'sendLockArray', 'array': locked['Default']};
			ws.send(JSON.stringify(message));
			
		} else if(request['action'] == "resetWorld") {
			worldArray[worldName] = request['world'];
			locked[worldName] = request['lockedArray'];
			wss.broadcastObject(message);
			
		} else if(request['action'] == "getDefaultWorld") {
			if(worldArray['Default'].length == 0) {
				// first client
				console.log("first client");
				worldArray['Default'] = request['proposedWorld'];
				wss.broadcastObject(message);
			} else {
				sendWorld(ws, 'Default');
			}
		}
		
	});
});