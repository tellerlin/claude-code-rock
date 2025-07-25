
import { MessageCreateParamsBase } from "@anthropic-ai/sdk/resources/messages";
import { get_encoding } from "tiktoken";
import { log } from "./log";
import { keyManagerService } from "../services/KeyManagerService";
import { PassThrough } from "stream";
import { FastifyRequest, FastifyReply } from "fastify";
import fetch, { Response } from "node-fetch";

const enc = get_encoding("cl100k_base");

// This function determines which model configuration to use based on the request.
const getUseModel = (req: any, tokenCount: number, config: any) => {
    if (req.body.model.includes(",")) {
        return req.body.model;
    }
    if (tokenCount > 1000 * 60 && config.router.longContext) {
        log("Using long context model due to token count:", tokenCount);
        return config.router.longContext;
    }
    if (req.body.model?.startsWith("claude-3-5-haiku") && config.router.background) {
        log("Using background model for ", req.body.model);
        return config.router.background;
    }
    if (req.body.thinking && config.router.think) {
        log("Using think model for ", req.body.thinking);
        return config.router.think;
    }
    return config.router.default;
};

// Main router function to handle requests
export const router = async (req: FastifyRequest, reply: FastifyReply, config: any, llmServer: any) => {
  const body = req.body as MessageCreateParamsBase & { stream?: boolean };
  const { messages, system = [], tools, stream } = body;
  let tokenCount = 0;

  try {
    // Calculate token count
    if (Array.isArray(messages)) {
      messages.forEach((message) => {
        if (typeof message.content === "string") {
          tokenCount += enc.encode(message.content).length;
        } else if (Array.isArray(message.content)) {
          message.content.forEach((content) => {
            if (content.type === "text") {
              tokenCount += enc.encode(content.text).length;
            }
          });
        }
      });
    }
     if (typeof system === "string") {
      tokenCount += enc.encode(system).length;
    } else if (Array.isArray(system)) {
        system.forEach((sys) => {
            if (typeof sys === 'string') {
                tokenCount += enc.encode(sys).length;
            } else if (sys.text) {
                tokenCount += enc.encode(sys.text).length;
            }
        });
    }

    if (Array.isArray(tools)) {
      tools.forEach((tool) => {
        if (tool.name) tokenCount += enc.encode(tool.name).length;
        if ('description' in tool && tool.description) tokenCount += enc.encode(tool.description).length;
        if ('input_schema' in tool && tool.input_schema) tokenCount += enc.encode(JSON.stringify(tool.input_schema)).length;
      });
    }
  } catch (error: any) {
    log("Error calculating token count:", error.message);
  }

    const modelString = getUseModel(req, tokenCount, config);
    const [providerName, modelName] = modelString.split(",");
  
    const providerConfig = llmServer.providerService.getProvider(providerName);
    if (!providerConfig) {
        return reply.code(404).send({ error: `Provider '${providerName}' not found.` });
    }

    const MAX_RETRIES = 3;
    for (let i = 0; i < MAX_RETRIES; i++) {
        const apiKeyRecord = keyManagerService.selectKey(providerName);

        if (!apiKeyRecord) {
            log(`No available API keys for provider: ${providerName}.`);
            return reply.code(503).send({ error: "Service Unavailable: No active API keys." });
        }

        const currentApiKey = apiKeyRecord.key;
        log(`Attempt ${i + 1}/${MAX_RETRIES}: Using key ...${currentApiKey.slice(-4)} for ${providerName}`);
        
        const requestBody = { ...body, model: modelName };
        const endpointUrl = new URL(providerConfig.baseUrl);
        
        try {
            const response: Response = await fetch(endpointUrl.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentApiKey}`
                },
                body: JSON.stringify(requestBody),
            });

            if (response.ok) {
                keyManagerService.reportSuccess(currentApiKey);
                reply.code(response.status).headers(Object.fromEntries(response.headers.entries()));
                if (stream && response.body) {
                    return reply.send(response.body);
                } else {
                    return reply.send(await response.json());
                }
            } else {
                const errorBody = await response.text();
                throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
            }
        } catch (error: any) {
            log(`API call failed for key ...${currentApiKey.slice(-4)}. Error: ${error.message}`);
            keyManagerService.reportFailure(currentApiKey);
            if (i === MAX_RETRIES - 1) {
                return reply.code(500).send({ error: "All API key attempts failed.", details: error.message });
            }
        }
    }
};
