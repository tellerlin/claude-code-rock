#!/usr/bin/env ts-node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/cco-test.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_process = __toESM(require("process"));
var CONFIG_PATH = import_path.default.resolve(import_process.default.cwd(), "config.json");
function loadConfig() {
  if (!import_fs.default.existsSync(CONFIG_PATH)) {
    console.error(`Config file not found: ${CONFIG_PATH}`);
    import_process.default.exit(1);
  }
  return JSON.parse(import_fs.default.readFileSync(CONFIG_PATH, "utf-8"));
}
function getApiKeys(provider) {
  if (provider.api_keys) {
    return provider.api_keys.map((k) => typeof k === "string" ? k : k.key);
  }
  if (provider.api_key) {
    return [provider.api_key];
  }
  return [];
}
function getTestEndpoint(provider, model) {
  if (provider.api_base_url.includes("openai") || provider.api_base_url.includes("deepseek") || provider.api_base_url.includes("openrouter")) {
    return {
      url: provider.api_base_url.replace(/\/$/, "") + "/chat/completions",
      method: "POST",
      body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }] }),
      headers: { "Content-Type": "application/json" }
    };
  } else if (provider.api_base_url.includes("generativelanguage.googleapis.com")) {
    return {
      url: provider.api_base_url.replace(/\/$/, "") + `/${model}:generateContent`,
      method: "POST",
      body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
      headers: { "Content-Type": "application/json" }
    };
  } else {
    return {
      url: provider.api_base_url.replace(/\/$/, "") + "/v1/models",
      method: "GET",
      headers: {}
    };
  }
}
async function testProviderModelKey(provider, model, apiKey) {
  const { url, method, body, headers } = getTestEndpoint(provider, model);
  if (provider.api_base_url.includes("openai") || provider.api_base_url.includes("deepseek") || provider.api_base_url.includes("openrouter")) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (provider.api_base_url.includes("generativelanguage.googleapis.com")) {
    headers["x-goog-api-key"] = apiKey;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  const start = Date.now();
  try {
    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
    }
    if (res.ok) {
      console.log(`[SUCCESS] Provider: ${provider.name} | Model: ${model} | Key: ${apiKey.slice(0, 8)}... | ${res.status} ${res.statusText} (${Date.now() - start}ms)`);
    } else {
      console.error(`[FAIL] Provider: ${provider.name} | Model: ${model} | Key: ${apiKey.slice(0, 8)}... | ${res.status} ${res.statusText}`);
      console.error(`  URL: ${url}`);
      console.error(`  Request: ${body || ""}`);
      console.error(`  Response: ${text}`);
    }
    return { ok: res.ok, status: res.status, statusText: res.statusText, json, text };
  } catch (err) {
    console.error(`[ERROR] Provider: ${provider.name} | Model: ${model} | Key: ${apiKey.slice(0, 8)}...`);
    console.error(`  URL: ${url}`);
    console.error(`  Request: ${body || ""}`);
    console.error(`  Error: ${err.stack || err}`);
    return { ok: false, error: err };
  }
}
async function main() {
  const config = loadConfig();
  const providers = config.Providers || config.providers || [];
  if (providers.length === 0) {
    console.error("No Providers found in config.json");
    import_process.default.exit(1);
  }
  for (const provider of providers) {
    const apiKeys = getApiKeys(provider);
    if (!apiKeys.length) {
      console.warn(`Provider ${provider.name} has no API keys, skipped.`);
      continue;
    }
    for (const model of provider.models) {
      for (const apiKey of apiKeys) {
        await testProviderModelKey(provider, model, apiKey);
      }
    }
  }
}
main().catch((e) => {
  console.error("Fatal error:", e);
  import_process.default.exit(1);
});
