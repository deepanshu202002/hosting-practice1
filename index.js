const os = require("os");
const redis = require("redis");
const express = require("express");

const app = express();

const redisClient = redis.createClient({
  socket: {
    host: "redis",
    port: 6379,
  },
});

const server_name = process.env.SERVER_NAME || "default server";
redisClient.connect().catch(console.error);

app.get("/", async (req, res) => {
  try {
    let numVisits = await redisClient.get("numVisits");
    numVisits = parseInt(numVisits) || 0;
    numVisits++;
    await redisClient.set("numVisits", numVisits);
    res.send(
      `${os.hostname()}: hello form server: ${server_name} Number of visits is: ${numVisits}`
    );
  } catch (err) {
    console.error("Redis error", err);
    res.status(500).send("error connecting");
  }
});
const PORT = 5000;
const HOST = "0.0.0.0";
app.listen(PORT, HOST, () =>
  console.log(`App running on http://${HOST}:${PORT}`)
);
