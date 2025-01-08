import { normalizeUrl } from "@/utils/normalize-url";
import { httpToWsUrl } from "@/utils/url.utils";

export function urlToWs(url: string) {
  const httpUrl = normalizeUrl(url);
  const wsUrl = httpToWsUrl(httpUrl);
  wsUrl.pathname = "/sockjs/websocket";
  return wsUrl;
}
