import mongoose from "mongoose";

import { env } from "./env.js";
import { logger } from "./logger.js";

export type DatabaseState =
  | "disconnected"
  | "connected"
  | "connecting"
  | "disconnecting"
  | "unknown";

const STATE_MAP: Record<number, DatabaseState> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

let listenersRegistered = false;

function registerConnectionListeners(): void {
  if (listenersRegistered) {
    return;
  }

  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("error", (error) =>
    logger.error({ err: error }, "MongoDB connection error")
  );
  mongoose.connection.on("disconnected", () =>
    logger.warn("MongoDB disconnected")
  );

  listenersRegistered = true;
}

export async function connectDatabase(
  uri: string = env.MONGODB_URI
): Promise<typeof mongoose> {
  registerConnectionListeners();

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });

  return mongoose;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function getDatabaseState(): DatabaseState {
  return STATE_MAP[mongoose.connection.readyState] ?? "unknown";
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
