import serverless from "serverless-http";
import { createApp } from "../server/src/app.js";

export default serverless(createApp());
