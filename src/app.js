import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import { MongoClient, ObjectId } from "mongodb";
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
  const userData = req.body;
  const time = dayjs().format("HH:mm:ss");

  const participantSchema = joi.object({
    name: joi.string().not("").required(),
  });

  const validation = participantSchema.validate(userData, {
    abortEarly: false,
  });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  try {
    const nameExists = await db.collection("participants").findOne({ name });

    if (nameExists) {
      console.log("ja existe");
      return res.status(409);
    }

    await db
      .collection("participants")
      .insertOne({ name: userData.name, lastStatus: Date.now() });

    await db.collection("messages").insertOne({
      from: userData.name,
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
  const messageData = req.body;
  const user = req.headers.user;
  const time = dayjs().format("HH:mm:ss");

  const participantSchema = joi.object({
    to: joi.string().not("").required(),
    text: joi.string().not("").required(),
    type: joi.string().valid(["message", "private_message"]).required(),
  });

  const validation = participantSchema.validate(messageData, {
    abortEarly: false,
  });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  try {
    const userExist = await db
      .collection("participants")
      .findOne({ name: user });

    if (!userExist) {
      console.log("nao existe user");
      return res.status(422);
    }

    await db.collection("messages").insertOne({
      to: messageData.to,
      text: messageData.text,
      type: messageData.type,
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

async function removeInactives() {
  const time = dayjs().format("HH:mm:ss");

  try {
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

        await db
          .collection("participants")
          .deleteOne({ _id: ObjectId(item._id) });
      }
    });
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
}

setInterval(removeInactives, 15000);

server.listen(5000, () => {
  console.log("Servidor funfou de boas!!!");
});
