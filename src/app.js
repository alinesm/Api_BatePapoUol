import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

try {
  await mongoClient.connect();
  db = mongoClient.db();
} catch (error) {
  console.log("Deu errro no server");
}

const server = express();

server.use(express.json());
server.use(cors());

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  const time = dayjs().format("HH:mm:ss");

  try {
    const nameExists = await db.collection("participants").findOne({ name });

    if (nameExists) {
      console.log("ja existe");
      return res.status(409);
    }

    await db
      .collection("participants")
      .insertOne({ name: name, lastStatus: Date.now() });

    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: time,
    });

    res.status(201);
    console.log("inseriu");
  } catch (err) {
    console.log(err);
    res.status(500).send("Deu algo errado no servidor");
  }
});

server.get("/participants", async (req, res) => {
  try {
    const participantsList = await db
      .collection("participants")
      .find()
      .toArray();

    res.send(participantsList);
  } catch (error) {
    res.status(500).send("Deu zica no servidor de banco de dados");
  }
});

server.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const user = req.headers.user;
  const time = dayjs().format("HH:mm:ss");

  try {
    const userExist = await db
      .collection("participants")
      .findOne({ name: user });

    if (!userExist) {
      console.log("nao existe user");
      return res.status(404);
    }

    await db.collection("messages").insertOne({
      to: to,
      text: text,
      type: type,
      from: user,
      time: time,
    });

    res.status(201);
  } catch (err) {
    console.log(err);
    res.status(500).send("Deu algo errado no servidor");
  }
});

server.post("/status", async (req, res) => {
  const name = req.headers.user;

  try {
    const nameExists = await db
      .collection("participants")
      .findOne({ name: name });

    if (!nameExists) return res.status(404);

    await db
      .collection("participants")
      .updateOne({ name: name }, { $set: { lastStatus: Date.now() } });

    res.status(200);
  } catch (err) {
    console.log(err);
    res.status(500).send("Deu algo errado no servidor");
  }
});

server.get("/messages", async (req, res) => {
  const limit = req.query.limit || 0;
  const user = req.headers.user;

  try {
    const allowedMessages = await db
      .collection("messages")
      .find({ $or: [{ to: user }, { to: "Todos" }, { from: user }] })
      .sort({ $natural: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.send(allowedMessages);
  } catch (error) {
    res.status(500).send("Deu zica no servidor de banco de dados");
  }
});

server.listen(5001, () => {
  console.log("Servidor funfou de boas!!!");
});
