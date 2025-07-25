// Enhanced WebSocket Proxy with Node.js, Redis (Pub/Sub), Load Balancing, Sticky Sessions, and Resilience
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { createClient } from "redis";
import cluster from "cluster";
import os from "os";
import zlib from "zlib";

const REDIS_URL = "redis://localhost:6379";

// Data Compression Utility
function compressData(data) {
  try {
    return zlib.gzipSync(data); // Efficient compression with zlib
  } catch (error) {
    console.error("Compression error:", error);
    return data; // Fallback to raw data
  }
}

// Cluster setup for load balancing
if (cluster.isPrimary) {
  const cpuCount = os.cpus().length;
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

  // Map to track active WebSocket clients
  const clients = new Map();

  // Sticky Sessions Helpers (1 hour expiry)
  async function registerClient(clientId, workerId) {
    await redisClient.set(`client:${clientId}`, workerId, { EX: 3600 });
  }

  async function getWorkerForClient(clientId) {
    return await redisClient.get(`client:${clientId}`);
  }

  // WebSocket Server (Proxy)
  const server = createServer();
  const wss = new WebSocketServer({ server });

  const closeConnection = async () => {
    console.log("Closing WebSocket connection...");

    if (wss && wss.readyState === WebSocket.OPEN) {
      // Stop the subscription
      wss.send(
        JSON.stringify({
          type: "stop",
          id: "topMovers",
        })
      );

      // Close the connection
      wss.close();
    }
  };

  wss.on("connection", (ws, req) => {
    const clientId = req.headers["sec-websocket-key"]; // Unique client identifier
    console.log(`Client ${clientId} connected via Worker ${process.pid}`);

    getWorkerForClient(clientId).then((assignedWorker) => {
      if (assignedWorker && assignedWorker !== process.pid.toString()) {
        ws.close(1013, "Switching Workers"); // Prompt client to retry
      } else {
        clients.set(clientId, ws);
        registerClient(clientId, process.pid);

        // Subscribe this client to Redis channels for each data type
        const subscriber = createClient({ url: REDIS_URL });
        subscriber.connect();

        subscriber.subscribe("api-top-tokens", (message) =>
          ws.send(compressData(message))
        );
        subscriber.subscribe("api-top-movers", (message) => {
          console.log(
            "api-top-movers",
            JSON.stringify(message).substring(0, 20)
          );
          ws.send(compressData(message));
        });
        subscriber.subscribe("api-popular-tokens", (message) =>
          ws.send(compressData(message))
        );
        subscriber.subscribe("close", (message) => {
          clients.delete(clientId);
          subscriber.unsubscribe("api-top-tokens");
          subscriber.unsubscribe("api-top-movers");
          subscriber.unsubscribe("api-popular-tokens");
          subscriber.disconnect();
        });

        ws.on("close", () => {
          clients.delete(clientId);
          subscriber.unsubscribe("api-top-tokens");
          subscriber.unsubscribe("api-top-movers");
          subscriber.unsubscribe("api-popular-tokens");
          subscriber.disconnect();
        });
      }
    });
  });

  server.listen(process.env.PORT || 3000, () => {
    console.log(
      `Worker ${process.pid} running WebSocket proxy server on port ${
        process.env.PORT || 3000
      }`
    );
  });

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    closeConnection();
    await redisClient.disconnect();
    process.exit(0);
  });
}
