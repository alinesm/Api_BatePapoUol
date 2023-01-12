import express from "express";
import cors from "cors";
import dayjs from "dayjs";

const server = express();

server.use(express.json());
server.use(cors());

const removedMessages = [];

server.listen(5001, () => {
  console.log("Servidor funfou de boas!!!");
});

server.post("/participants", (req, res) => {
  const { name } = req.body;
  const participantData = { name: name, lastStatus: Date.now() };
});

server.get("/participants", (req, res) => {
  res.send(participants);
});

server.post("/messages", (req, res) => {
  const { to, text, type } = req.body;
  const from = req.headers.user;
  const time = dayjs().format("HH:mm:ss");
  console.log(time);

  const messageData = {
    to: to,
    text: text,
    type: type,
    from: from,
    time: time,
  };

  // send message

  res.status(201);
});

server.get("/messages", (req, res) => {
  const limit = req.query.limit;
  const from = req.headers.user;

  if (limit) {
  }

  res.send(allMessages);
});

function removeLastTen() {
  const filteredBysec = participantes.filter((it) => {
    const timeTest = Math.round((timestamp - it.lastStatus) / 1000);
    if (timeTest < 10) {
      return { name: it.name, lastStatus: it.lastStatus };
    } else if (timeTest > 10) {
      removedMessages.push({
        from: it.name,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      });
    }
  });
  console.log("filtere", filteredBysec);
  console.log("arr", removedMessages);
}

server.post("/status", (req, res) => {
  const tweet = req.body.tweet;
  const from = req.headers.user;

  // const userExists = users.find(item => item.username === from)

  if (!userExists) return res.status(404);

  const timestamp = Date.now();
  const date = new Date(timestamp);
  const seconds = date.getSeconds();
  console.log(seconds);

  setInterval(removeLastTen, 15000);

  res.status(200);
});
