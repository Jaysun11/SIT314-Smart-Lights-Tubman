
//Generic Data structure for a message to be recieved

const byte numChars = 30; //Each message is up to 30 chars long
char receivedChars[numChars]; // each character is stored in an array of chars

String message; //message recieved (recievedChars as a string)

boolean dataArrived = false;

boolean buttonPushed = false;
boolean lightStatus = false;

const int LEDPIN = 2;

int singlePush = 0;

void setup() {
  Serial.begin(9600); // Starts the serial communication
  
  pinMode(LEDPIN, OUTPUT);

  sendOFF();
}

void loop() {
  
  delay(1000);


  recieveData();

  
    if (dataArrived == true) {
       String instruction = message.substring(0,3);

       if(instruction == "ON ") {
        
          digitalWrite(LEDPIN, HIGH); 
          lightStatus = true;
          
       }
       if(instruction == "OFF") {
        
          digitalWrite(LEDPIN, LOW); 
          lightStatus = false;
        
       }
       
       dataArrived = false;
    }

  
    if(buttonPushed){
      if (singlePush == 0){
        if(lightStatus){
          sendOFF();
        } else {
          sendON();
        }
        singlePush = 1;
      }
    } else {
      singlePush = 0;
    }
    
}


void sendON(){
    digitalWrite(LEDPIN, HIGH); 
    Serial.println("ON ");
    buttonPushed = false;
    lightStatus = true;
}

void sendOFF(){
   digitalWrite(LEDPIN, LOW); 
   Serial.println("OFF");
   buttonPushed = false;
   lightStatus = false;
}


void recieveData(){
  
  static byte iterator = 0;
  char endIndicator = '\n';
  char charRecieved;
  
  while (Serial.available() > 0 && dataArrived == false)
  {
    charRecieved = Serial.read();
    
    if (charRecieved != endIndicator) {
      
      receivedChars[iterator] = charRecieved;
      iterator++;
      
      if (iterator >= numChars) {
        iterator = numChars - 1;
       }
       
     } else {
      
      receivedChars[iterator] = '\0'; // terminate the string
      message = String(receivedChars);
      
      iterator = 0;
      dataArrived = true;
      
    }
  }

  
}
