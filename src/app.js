import express from "express";
import dotenv from "dotenv";
import comerciosRouter from "./routes/comercios.js";
import { startCron } from "./cron.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/comercios", comerciosRouter);

// Iniciar cron
startCron();

app.listen(port, () => console.log(`🚀 Servidor corriendo en http://localhost:${port}`));
