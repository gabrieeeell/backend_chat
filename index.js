import express from "express";
import { createClient } from "redis";
import cors from "cors";
import logger from "morgan";
import { createServer } from "node:http";
import { Server } from "socket.io";

const redis_url = process.env.REDIS_URL ?? "redis://red-ctm3nkrtq21c73f6b9bg:6379"; // url proporcionada por redis

const client = createClient({
    url : redis_url
});

client.on("error", err => console.log(`Se ha producido un error al conectar redis ${err}`))

await client.connect()

const PORT = process.env.PORT ?? 6060

const app = express();

const server = createServer(app);

const io = new Server(server, {
  connectionStateRecovery: {
    // the backup duration of the sessions and the packets
    maxDisconnectionDuration: 4 * 1000,
    // whether to skip middlewares upon successful recovery
    skipMiddlewares: true,
  }
});

io.on("connection", async (socket) => {
    const nombre_clave = socket.handshake.auth.username;
    console.log("Se ha establecido una conexion, con el nombre_clave", nombre_clave)
    socket.join(nombre_clave);

    socket.on("disconnect", () => {
        console.log("Un usuario se ha desconectado")
    });

    socket.on("mensaje", async (msg) => {
        let nuevo_coso = await client.xAdd(nombre_clave,"*",{"mensaje":msg.mensaje,"nombre":msg.nombre})
        io.to(nombre_clave).emit("mensaje",`${msg.nombre} : ${msg.mensaje}`);
    })
})

app.use(cors());

app.use(logger('dev'));

app.get("/",(req,res) => {
    res.sendFile(process.cwd() + "/front/main.html") // process.cwd() desde donde se esta ejecutando este proceso
})

app.get("/oldmessages/:nombre_clave", async (req,res) => {
    const nombre_clave = req.params.nombre_clave
    const res_redis = await client.xRange(nombre_clave,"-","+") 
    res.send(res_redis) 
})

server.listen(PORT, () => {
    console.log(`Servidor abierto en el puerto ${PORT}`)
})
