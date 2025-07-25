import { FastifyRequest, FastifyReply } from "fastify";

export const apiKeyAuth =
  (config: any) =>
  (req: FastifyRequest, reply: FastifyReply, done: () => void) => {
    if (["/", "/health"].includes(req.url)) {
      return done();
    }
    const apiKey = config.APIKEY;

    if (!apiKey) {
      return done();
    }

    const key = req.headers["x-api-key"] || req.headers["authorization"];
    const authKey: string = Array.isArray(key) ? key[0] : (key || "");
    if (!authKey) {
      reply.status(401).send("APIKEY is missing");
      return;
    }
    let token = "";
    if (authKey.startsWith("Bearer")) {
      token = authKey.split(" ")[1];
    } else {
      token = authKey;
    }
    if (token !== apiKey) {
      reply.status(401).send("Invalid API key");
      return;
    }

    done();
  };
