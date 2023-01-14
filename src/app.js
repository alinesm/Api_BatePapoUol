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
    return res.status(422).send("empty name");
  }

  const participantSchema = joi.object({
    name: joi.string().min(1).required(),
  });

  const { error } = participantSchema.validate({ name });

  if (error) {
    return res.status(422).send("error in validation");
  }

  const nameExists = await db
    .collection("participants")
    .findOne({ name: name });

  if (nameExists) {
    console.log("ja existe");
    return res.status(409).send("user exists");
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
    return res.status(201).send("participant inserted");
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

  if (!user) return res.status(422).send("user empty");

  // if (!to || !text || !type) {
  //   return res.status(422).send("empty values");
  // }

  const userExist = await db.collection("participants").findOne({ name: user });

  if (!userExist) {
    console.log("nao existe user");
    return res.status(422).send("user doesnt exist");
  }

  const messageSchema = joi.object({
    to: joi.string().min(1).required(),
    text: joi.string().min(1).required(),
    type: joi.string().valid("message", "private_message").required(),
  });

  const { error } = messageSchema.validate({ to, text, type });

  if (error) {
    return res.status(422).send("error to valide data");
  }

  try {
    await db.collection("messages").insertOne({
      from: user,
      to: to,
      text: text,
      type: type,
      time: time,
    });

    res.status(201).send("message sent");
  } catch (err) {
    console.log(err);
    res.status(422).send("Deu algo errado no servidor");
  }
});

server.get("/messages", async (req, res) => {
  // const limit = req.query.limit || 0;
  const limit = req.query.limit;
  const { user } = req.headers;

  if (!user) return res.status(422).send("user empty");

  const userExist = await db.collection("participants").findOne({ name: user });

  if (!userExist) {
    console.log("nao existe user");
    return res.status(422).send("user doesnt exist");
  }

  try {
    const allowedMessages = await db
      .collection("messages")
      .find({ $or: [{ to: user }, { to: "Todos" }, { from: user }] })
      .toArray();

    if (limit) {
      const messagesLimit = Number(limit);

      if (messagesLimit < 1 || isNaN(messagesLimit)) return res.sendStatus(422);
      const allowedMessagesLimited = allowedMessages.slice(-limit).reverse();

      return res.send(allowedMessagesLimited);
    }

    const allowedMessagesReversed = allowedMessages.slice(-limit).reverse();

    res.send(allowedMessagesReversed);
  } catch (error) {
    res.status(422).send("Deu zica no servidor de banco de dados");
  }
});

server.post("/status", async (req, res) => {
  const name = req.headers.user;

  if (!name) return res.status(422).send("user empty");

  const nameExists = await db
    .collection("participants")
    .findOne({ name: name });

  if (!nameExists) return res.status(404).send("user doesnt exist");
  try {
    await db
      .collection("participants")
      .updateOne({ name: name }, { $set: { lastStatus: Date.now() } });

    res.status(200).send("status changed");
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
