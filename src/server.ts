// @ts-ignore
import Server from "@musistudio/llms";

declare var process: any;

export const createServer = (config: any): any => {
  // 检查是否需要 socks5 代理支持
  const proxyUrl = config.initialConfig?.PROXY_URL || process.env.PROXY_URL;
  
  if (proxyUrl && proxyUrl.startsWith('socks')) {
    console.warn('⚠️  WARNING: @musistudio/llms does not support socks5 proxy!');
    console.warn('⚠️  Main service HTTP requests may fail without HTTP proxy.');
    console.warn('⚠️  Consider using HTTP proxy or HTTP-to-socks5 forwarding.');
    console.warn(`⚠️  Current socks5 proxy: ${proxyUrl}`);
  }
  
  const server = new Server(config);
  return server;
};
