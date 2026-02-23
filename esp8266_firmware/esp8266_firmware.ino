#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <DHT.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#define DHTPIN D4   
#define DHTTYPE DHT11
#define LED_PIN D2    
#define BUZZER_PIN D1    
#define WIFI_SSID "Raya"
#define WIFI_PASSWORD "Kumuda01"
#define FIREBASE_HOST "https://global-iot-456e5-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH "12jGx9PRHN5ESQcPE9dljnoe0qyqi0QmsIvqDy8e"
#define TEMP_THRESHOLD 30.0
#define UPLOAD_INTERVAL 5000  

DHT dht(DHTPIN, DHTTYPE);
FirebaseData fbData;
FirebaseAuth fbAuth;
FirebaseConfig fbConfig;
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 19800, 60000); 

unsigned long lastUpload = 0;
int readingCount = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== IoT Temperature Monitor ===");

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  dht.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());

  timeClient.begin();

  fbConfig.host = FIREBASE_HOST;
  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);

  Firebase.setString(fbData, "/iot/status", "ONLINE");
  Firebase.setFloat(fbData, "/iot/threshold", TEMP_THRESHOLD);

  Serial.println("Firebase connected!");
  Serial.println("System ready. Threshold: " + String(TEMP_THRESHOLD) + "°C");

  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH); delay(100);
    digitalWrite(LED_PIN, LOW);  delay(100);
  }
}

void loop() {
  timeClient.update();

  if (millis() - lastUpload >= UPLOAD_INTERVAL) {
    lastUpload = millis();

    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temp) || isnan(humidity)) {
      Serial.println("[ERROR] DHT11 read failed!");
      return;
    }

    readingCount++;
    bool isAlert = (temp > TEMP_THRESHOLD);

    if (isAlert) {
      digitalWrite(LED_PIN, HIGH);
      tone(BUZZER_PIN, 1000); 
    } else {
      digitalWrite(LED_PIN, LOW);
      noTone(BUZZER_PIN);
    }

    String alertStatus = isAlert ? "HIGH_TEMP" : "NORMAL";
    String timestamp = timeClient.getFormattedTime();

    Serial.println("──────────────────────────────");
    Serial.println("Reading #" + String(readingCount));
    Serial.println("Temp: " + String(temp) + "°C");
    Serial.println("Humidity: " + String(humidity) + "%");
    Serial.println("Status: " + alertStatus);
    Serial.println("Time: " + timestamp);

    Firebase.setFloat(fbData,  "/iot/current/temperature", temp);
    Firebase.setFloat(fbData,  "/iot/current/humidity", humidity);
    Firebase.setString(fbData, "/iot/current/status", alertStatus);
    Firebase.setString(fbData, "/iot/current/timestamp", timestamp);
    Firebase.setBool(fbData,   "/iot/current/alert", isAlert);
    Firebase.setInt(fbData,    "/iot/current/readingCount", readingCount);

    String histPath = "/iot/history/" + String(readingCount % 50);
    Firebase.setFloat(fbData,  histPath + "/temperature", temp);
    Firebase.setFloat(fbData,  histPath + "/humidity", humidity);
    Firebase.setString(fbData, histPath + "/status", alertStatus);
    Firebase.setString(fbData, histPath + "/timestamp", timestamp);
    Firebase.setInt(fbData,    histPath + "/index", readingCount);

    Serial.println("Firebase upload OK");
  }
}
