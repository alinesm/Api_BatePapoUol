import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import joi from "joi";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const server = express();
server.use(cors());
server.use(express.json());

const PORT = 5000;
let db;

const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
  await mongoClient.connect();
  db = mongoClient.db();
} catch (error) {
  console.log("Deu errro no server");
}

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  const time = dayjs().format("HH:mm:ss");

  if (!name) {
    return res.statusCode(422);
  }

  const participantSchema = joi.object({
    name: joi.string().min(1).required(),
  });

  const validation = participantSchema.validate({ name });

  if (validation.error) {
    return res.status(422).send(error);
  }

  const nameExists = await db
    .collection("participants")
    .findOne({ name: name });

  if (nameExists) {
    console.log("ja existe");
    return res.statusCode(409);
  }

  try {
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

    console.log("inseriu");
    return res.statusCode(201);
  } catch (err) {
    console.log(err);
    res.status(422).send("Deu algo errado no servidor");
  }
});

server.get("/participants", async (req, res) => {
  const participantsList = await db.collection("participants").find().toArray();

  res.send(participantsList);
});

server.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;
  const time = dayjs().format("HH:mm:ss");

  if (!user) return res.statusCode(422);

  if (!to || !text || !type) {
    return res.statusCode(422);
  }

  const userExist = await db.collection("participants").findOne({ name: user });

  if (!userExist) {
    console.log("nao existe user");
    return res.statusCode(422);
  }

  const messageSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid("message", "private_message").required(),
  });

  const validation = messageSchema.validate({ to, text, type });

  if (validation.error) {
    return res.status(422).send(errors);
  }

  try {
    await db.collection("messages").insertOne({
      from: user,
      to: to,
      text: text,
      type: type,
      time: time,
    });

    res.statusCode(201);
  } catch (err) {
    console.log(err);
    res.status(422).send("Deu algo errado no servidor");
  }
});

server.get("/messages", async (req, res) => {
  // const limit = req.query.limit || 0;
  const { limit } = req.query;
  const { user } = req.headers;

  if (!user) return res.statusCode(422);

  if (limit) {
    limit = parseInt(limit);
  }

  if (limit < 1 || isNaN(limit)) {
    return res.statusCode(422);
  }

  try {
    const allowedMessages = await db
      .collection("messages")
      .find({ $or: [{ to: user }, { to: "Todos" }, { from: user }] })
      .toArray();

    const allowedMessagesReversed = allowedMessages.slice(-limit).reverse();

    res.send(allowedMessagesReversed);
  } catch (error) {
    res.status(422).send("Deu zica no servidor de banco de dados");
  }
});

server.post("/status", async (req, res) => {
  const name = req.headers.user;

  const nameExists = await db
    .collection("participants")
    .findOne({ name: name });

  if (!nameExists) return res.statusCode(404);
  try {
    await db
      .collection("participants")
      .updateOne({ name: name }, { $set: { lastStatus: Date.now() } });

    res.statusCode(200);
  } catch (err) {
    console.log(err);
    res.status(422).send("Deu algo errado no servidor");
  }
});

async function removeInactives() {
  const time = dayjs().format("HH:mm:ss");

  const participants = await db.collection("participants").find().toArray();

  participants.forEach(async (item) => {
    const timeDifference = Date.now() - item.lastStatus;
    if (timeDifference > 10000) {
      await db.collection("messages").insertOne({
        from: item.name,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: time,
      });

      await db.collection("participants").deleteOne({ name: item.name });
    }
  });
}

setInterval(removeInactives, 15000);

server.listen(PORT, () => {
  console.log("Servidor funfou de boas!!!");
});
