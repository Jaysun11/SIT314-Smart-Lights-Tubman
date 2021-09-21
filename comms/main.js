//This script subscribes to /Tubman-314-Light/instructions
//if it recieves a message on this topic, it sends it to the arduino.

//Similarly, if it gets a messsage from the arduino, it sends the message
//to the central server on topic /Tubman-314-Light/update-status

const mqtt = require('mqtt');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const port = new SerialPort('/dev/cu.usbmodem141301', { baudRate: 9600 });
const room = 0;
const id = 0;

const parser = port.pipe(new Readline({ delimiter: '\n' }));

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

//Subscribe to messages about updating light status from main server
client.on('connect', () => {
  client.subscribe('/Tubman-314-Light/instructions');
  console.log('mqtt connected and subscribed to smart light instructions');
});

// Read data from serial port
port.on("open", () => {
  console.log('Successfully opened connection with serial port');
});


const topic = '/Tubman-314-Light/status-update';

//Message recieved from arduino through serial
//send to message in JSON Format

//recieves a true or false
parser.on('data', data =>{

  var payload = {
    roomID: room,
    lightID: id,
    status: data
  };

  console.log('Light Status changed to: ' + data);


  const instructionToSend = JSON.stringify(payload);

  client.publish(topic, instructionToSend, () => {
    console.log('Updated status with central server');
  });

});


//If a message is recieved from the main server write it to console
client.on('message', (topic, message) => {
  console.log(`Received message on ${topic}:` + JSON.parse(message));
});

//then send the message to the smart light (Arduino) if its for them
client.on('message', (topic, message) => {
  var recieved = JSON.parse(message);
  if (topic == '/Tubman-314-Light/instructions' && recieved.lightID == id && recieved.roomID == room) {
    var msg = `${recieved.status}\n`;

    port.write(msg, (error) => {
      if (error) {
        return console.log('Error sending message to arduino: ', error.message);
      }
      console.log("successfully send instruction to smart light: ");
      console.log(msg);

    });
  }
});
