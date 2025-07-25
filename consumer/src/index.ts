// Enhanced WebSocket Proxy with Node.js, Redis (Pub/Sub), Load Balancing, Sticky Sessions, and Resilience
import WebSocket from "ws";
import { createClient } from "redis";
import cluster from "cluster";
import fs from "fs";
import { QUERIES } from "./queries.ts";

const REDIS_URL = process.env.REDIS_URL;
const API_WEBSOCKET_URL = process.env.API_WEBSOCKET_URL;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const API_WEBSOCKET_URL_TOKEN = `${API_WEBSOCKET_URL}?token=${ACCESS_TOKEN}`;

let wsConnection: WebSocket = null;

const closeConnection = async (connection: WebSocket) => {
  console.log("Closing WebSocket connection...");

  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    // Stop the subscription
    Object.values(QUERIES).forEach((query) => {
      wsConnection.send(
        JSON.stringify({
          type: "stop",
          id: query.id,
        })
      );
    });

    // Close the connection
    wsConnection.close();
  }
};

// Cluster setup for load balancing
if (cluster.isPrimary) {
  // TODO: use the number of CPUS once everything works fine: os.cpus().length;
  const cpuCount = 1;
  console.log(`Starting ${cpuCount} workers for load balancing...`);
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    console.warn(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  // Redis Client for Pub/Sub
  const redisClient = createClient({ url: REDIS_URL });
  await redisClient.connect();

  // API WebSocket with Auto-Reconnect Logic
  function connectToApiSocket() {
    const apiSocket = new WebSocket(API_WEBSOCKET_URL_TOKEN, "graphql-ws", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    apiSocket.onopen = () => {
      console.log("Connected to Bitquery API WebSocket");
      Object.values(QUERIES).forEach((query) => {
        apiSocket.send(JSON.stringify(query));
      });
    };

    apiSocket.onmessage = async (event) => {
      try {
        console.log("Message received from WebSocket:", event.data);

        const data = JSON.parse(event.data.toString());

        if (data.type === "data") {
          if (data.payload && data.payload.data) {
            const dataPayload = JSON.stringify(data.payload.data);

            console.log(`Datos de ${data.id}:`, dataPayload);

            const stream = fs.createWriteStream(`${data.id}.txt`);
            stream.once("open", function (fd) {
              stream.write(dataPayload);
              stream.end();
            });

            // publish on Redis
            await redisClient.publish(data.id, dataPayload);
          } else {
            console.warn(
              "Payload does not contain valid data:",
              JSON.stringify(data.payload)
            );
          }
        } else {
          console.warn("Unmanaged data type:", data.type);
        }
      } catch (error) {
        console.error("Error processing WebSocket's message:", error);
      }
    };

    apiSocket.onerror = (error) => {
      console.error("API WebSocket error:", error);
    };

    apiSocket.onclose = () => {
      console.warn("API WebSocket closed. Reconnecting in 5 seconds...");

      setTimeout(() => {
        wsConnection = connectToApiSocket();
      }, 5000); // Auto-reconnect logic
    };

    return apiSocket;
  }

  wsConnection = connectToApiSocket();

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    closeConnection(wsConnection);
    await redisClient.publish("close", "");
    redisClient.disconnect();
    process.exit(0);
  });
}
