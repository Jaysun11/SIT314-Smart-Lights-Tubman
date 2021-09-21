const mqtt = require('mqtt');

var fs = require('fs');
var KEY =  fs.readFileSync('mqtt-client-key.pem');
var CERT =  fs.readFileSync('mqtt-client-cert.pem');
var TRUSTED_CA_LIST = [ fs.readFileSync('server.pem')];

var PORT = 1883;
var HOST = 'broker.hivemq.com';

var options = {
  port: PORT,
  host: HOST,
  keyPath: KEY,
  certPath: CERT,
  rejectUnauthorized : true, 
    //The CA list will be used to determine if server is authorized
    ca: TRUSTED_CA_LIST
};

const client = mqtt.connect(options);
//const client = mqtt.connect("mqtt://broker.hivemq.com:1883");

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb+srv://Jason:SIT314@cluster0.hwdb2.mongodb.net/SIT314-SmartLights?retryWrites=true&w=majority";

const prompt = require('prompt-sync')({ sigint: true });

switch (ReadUserOption()) {
  case 1:
    getLightStatus();
    break;
  case 2:
    createRoom();
    break;
  case 3:
    deleteRoom();
    break;
  case 4:
    addLights();
    break;
  case 5:
    deleteLights();
    break;
  case 6:
    toggleLightOn();
    break;
  case 7:
    toggleLightOff();
    break;
  case 8:
    console.log("Quit Selected. Program Terminating");
    runProgram = false;
    break;
  default:
    break;
}

function displayLights(allRooms) {
  console.log('---------Light Status--------\n')

  for (i = 0; i < allRooms.length; i++){
    var room = allRooms[i];
    console.log(room.id + ". " + room.name + '\n');
    for (j=0; j < room.lights.length;j++){
      var light = room.lights[j];
      if(light.status){
        console.log("Light ID: " + light.id + " - Status: On");
      } else {
        console.log("Light ID: " + light.id + " - Status: Off");
      }
    }
    console.log("");
  }

  console.log('-----------------------------')
}


function getLightStatus() {

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("SIT314-SmartLights");
    dbo.collection("rooms").find({}).toArray(function (err, result) {
      if (err) throw err;
      displayLights(result);
      db.close();
    });
  });


}

function addLights() {

  roomIDInput = Number(prompt('Which Room Number?  '));

  const payload = {
    type: "addLights",
    roomID: roomIDInput
  };

  var messageToSend = JSON.stringify(payload);

  //testing sending light update
  client.publish('/Tubman-314-Light/hub-update', messageToSend, () => {
    console.log('Added Light to room: ' + roomIDInput);
  });

}

function deleteLights() {

  roomIDInput = Number(prompt('Which Room Number?  '));
  lightIDInput = Number(prompt('Which Light ID  ?'));

  const payload = {
    type: "deleteLights",
    roomID: roomIDInput,
    lightID: lightIDInput
  };

  var messageToSend = JSON.stringify(payload);

  //testing sending light update
  client.publish('/Tubman-314-Light/hub-update', messageToSend, () => {
    console.log('Deleted Light: ' + lightIDInput + " from room: " + roomIDInput);
  });

}

function toggleLightOff() {

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("SIT314-SmartLights");
    dbo.collection("rooms").find({}).toArray(function (err, result) {
      if (err) throw err;
      displayLights(result);

      roomIDInput = Number(prompt('Room Number?  '));
      lightIDInput = Number(prompt('Light ID?'  ));

      const payload = {
        type: "statusChange",
        roomID: roomIDInput,
        lightID: lightIDInput,
        status: "OFF"
      };
    
      var messageToSend = JSON.stringify(payload);
    
      //testing sending light update
      client.publish('/Tubman-314-Light/hub-update', messageToSend, () => {
        console.log('Turned Light: ' + lightIDInput + " from room: " + roomIDInput + " off");
      });

      db.close();
    });
  });

}

function toggleLightOn() {

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("SIT314-SmartLights");
    dbo.collection("rooms").find({}).toArray(function (err, result) {
      if (err) throw err;
      displayLights(result);

      roomIDInput = Number(prompt('Room Number?  '));
      lightIDInput = Number(prompt('Light ID?  '));
    
      const payload = {
        type: "statusChange",
        roomID: roomIDInput,
        lightID: lightIDInput,
        status: "ON "
      };
    
      var messageToSend = JSON.stringify(payload);
    
      //testing sending light update
      client.publish('/Tubman-314-Light/hub-update', messageToSend, () => {
        console.log('Turned Light: ' + lightIDInput + " from room: " + roomIDInput + " on");
      });

      db.close();
    });
  });

 

}

function deleteRoom() {

  roomIDInput = Number(prompt('What Room ID do you want to delete?'));

  const payload = {
    type: "deleteRoom",
    roomID: roomIDInput,
  };

  var messageToSend = JSON.stringify(payload);

  client.publish('/Tubman-314-Light/hub-update', messageToSend, () => {
    console.log('Deleted room: ' + roomIDInput);
  });

}

function createRoom() {

  numLights = Number(prompt('How many lights are in this room?: '));
  roomName = prompt('What would you like this room to be named?: ');

  const payload = {
    type: "createRoom",
    roomName: roomName,
    numLights: numLights
  };

  var messageToSend = JSON.stringify(payload);

  //testing sending light update
  client.publish('/Tubman-314-Light/hub-update', messageToSend, () => {
    console.log('Created new room: ' + roomName + " with: " + numLights);
  });

}



function ReadUserOption() {

  var valEntered = false;
  var value = 0;
  writeMenu();

  do {
    value = prompt('Make a selection (1-8): ');

    if (value > 0 && value <= 8) {
      valEntered = true;
    }
    else {
      value = 0;
      console.log("Please enter a value between 1 and 8");
    }

  } while (!valEntered);
  return Number(value);

}

function writeMenu() {
  console.log("SIT314 - Tubman - Smart Light System");
  console.log("1. Show Light Status");
  console.log("2. Create room");
  console.log("3. Delete room");
  console.log("4. Add light to room");
  console.log("5. Remove light from room");
  console.log("6. Toggle Light On");
  console.log("7. Toggle Light Off");
  console.log("8. Quit");
}

