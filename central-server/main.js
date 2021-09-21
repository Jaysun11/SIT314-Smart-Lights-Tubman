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


function checkJSONObject(jsonString) {
  try {
    var object = JSON.parse(jsonString);
    if (object && typeof object === "object") {
      return object;
    }
  }
  catch (e) { }

  return false;
};


client.on('connect', () => {
  client.subscribe('/Tubman-314-Light/status-update');
  client.subscribe('/Tubman-314-Light/hub-update');
  console.log("Suscbribed to MQTT topics successfully");

});
client.on('message', (topic, message) => {


  //If a message from the hub...
  if (topic == '/Tubman-314-Light/hub-update') {

    var recieved = checkJSONObject(message);

    if (recieved) {

      if (recieved.type == "createRoom") {
        createRoom(recieved.roomName, recieved.numLights);
      } else if (recieved.type == "deleteRoom") {
        deleteRoom(recieved.roomID);
      } else if (recieved.type == "statusChange") {

        client.publish('/Tubman-314-Light/instructions', message, () => {
          console.log('Broadcast Request to LED');
        });

        updateLightInDB(recieved.roomID, recieved.lightID, recieved.status);
      } else if (recieved.type == "addLights") {
        addLights(recieved.roomID);
      } else if (recieved.type == "deleteLights") {
        deleteLights(recieved.roomID, recieved.lightID);
      }

    }

  }
  //if a status update is recieved on '/Tubman-314-Light/status-update' (update the db)
  else if (topic == '/Tubman-314-Light/status-update') {

    var recieved = checkJSONObject(message);

    if (recieved) {
      updateLightInDB(recieved.roomID, recieved.lightID, recieved.status);
    }

  }


});




function deleteLights(roomID, lightID) {

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("SIT314-SmartLights");
    var query = { roomID: roomID, id: lightID };
    dbo.collection("lights").deleteOne(query, function (err, obj) {
      if (err) throw err;
    });

    var query2 = { id: roomID };

    var lightsList = [];

    dbo.collection("rooms").find({ id: roomID }).toArray(function (err, result) {
      if (err) throw err;

      lightsList = result[0].lights

      var arrayOfIDs = [];

      for (i = 0; i < lightsList.length; i++) {
        arrayOfIDs.push(lightsList[i].id);
      }

      var ind = arrayOfIDs.indexOf(lightID);

      //remove light with roomID and lightID from lightsList
      if (ind > -1) {
        lightsList.splice(ind, 1);
      }

      var newRoom = { $set: { lights: lightsList } };

      dbo.collection("rooms").updateOne(query2, newRoom, function (err, res) {
        if (err) throw err;
        db.close();
      });

    });




  });

  console.log('Deleted light ' + lightID + ' from room ' + roomID);
}

function addLights(roomID) {

  var nextLightID = 0;
  var listofIDs = [];

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("SIT314-SmartLights");
    dbo.collection("lights").find({ roomID: roomID }, { projection: { id: 1 } }).toArray(function (err, result) {
      if (err) throw err;

      for (i = 0; i < result.length; i++) {
        listofIDs.push(Number(result[i].id));
      }
      nextLightID = Math.max(...listofIDs) + 1;

      if (nextLightID < 0) {
        nextLightID = 0;
      }

      var newLight = { roomID: roomID, id: nextLightID, status: false };

      dbo.collection("lights").insertOne(newLight, function (err, res) {
        if (err) throw err;
      });

      var query2 = { id: roomID };

      var lightsList = [];

      dbo.collection("rooms").find({ id: roomID }).toArray(function (err, result) {
        if (err) throw err;

        lightsList = result[0].lights


        lightsList.push(newLight)

        var newRoom = { $set: { lights: lightsList } };

        dbo.collection("rooms").updateOne(query2, newRoom, function (err, res) {
          if (err) throw err;
          db.close();
        });

      });



    });


  });

  console.log('Added new light to room ' + roomID);
}

function createRoom(roomName, lightsPerRoom) {
  var nextRoomID = 0;
  var lightsList = [];
  var listofIDs = [];
  //Get current Room ID
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("SIT314-SmartLights");

    dbo.collection("rooms").find({}, { projection: { id: 1 } }).toArray(function (err, result) {
      if (err) throw err;

      for (i = 0; i < result.length; i++) {
        listofIDs.push(Number(result[i].id));
      }
      nextRoomID = Math.max(...listofIDs) + 1;

      if (nextRoomID < 0) {
        nextRoomID = 0;
      }

      for (i = 0; i < lightsPerRoom; i++) {
        var newLight = {
          roomID: nextRoomID,
          id: i,
          status: false
        };
        lightsList.push(newLight);
      }

      var newRoom = {
        id: nextRoomID,
        name: roomName,
        lights: lightsList
      };

      dbo.collection("rooms").insertOne(newRoom, function (err, res) {
        if (err) throw err;
        console.log('Created new room: ' + roomName + " with: " + lightsPerRoom + " lights");
        console.log(res);
      });

      dbo.collection("lights").insertMany(lightsList, function (err, res) {
        if (err) throw err;
        console.log('Created ' + lightsList.length + ' new lights.');
        db.close();
        console.log(res);
      });

    });

  });

}

function deleteRoom(roomID) {


  //Get current Room ID
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("SIT314-SmartLights");

    var query = { id: roomID };
    dbo.collection("rooms").deleteMany(query, function (err, obj) {
      if (err) throw err;
    });

    var query2 = { roomID: roomID };
    dbo.collection("lights").deleteMany(query2, function (err, obj) {
      if (err) throw err;
      db.close();
    });

  });



  //delete information from database for this room ID
  console.log('Deleted room: ' + roomID);
}

function updateLightInDB(roomID, lightID, status) {

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db("SIT314-SmartLights");
    var query = { roomID: roomID, id: lightID };

    var updateStatus;


    console.log(status);

    if (status.replace(/[^a-zA-Z ]/g, "") == "OFF") {
      updateStatus = false;
    } else {
      updateStatus = true;
    }


    var newLight = { $set: { status: updateStatus } };

    dbo.collection("lights").updateOne(query, newLight, function (err, res) {
      if (err) throw err;

      if (status) {
        console.log("Updated Status of Light " + lightID + " from room " + roomID + " to: " + 'ON');
      } else {
        console.log("Updated Status of Light " + lightID + " from room " + roomID + " to: " + 'OFF');
      }

      //db.close();
    });

    ///Upddated Lights table above

    var query2 = { id: roomID };

    var lightsList = [];

    dbo.collection("rooms").find({ id: roomID }).toArray(function (err, result) {
      if (err) throw err;

      lightsList = result[0].lights


      lightsList[lightID].status = updateStatus;

      console.log(lightsList);

      var newRoom = { $set: { lights: lightsList } };

      dbo.collection("rooms").updateOne(query2, newRoom, function (err, res) {
        if (err) throw err;
        console.log("Updated Status of Room");
        db.close();
      });

    });


  });

}
