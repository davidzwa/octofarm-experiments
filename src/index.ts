import { captureException, flush } from "@sentry/node";
import { setupEnvConfig } from "./server.env";
import { setupServer } from "./server.core";
import { DITokens } from "./container.tokens";
import { setupSwagger } from "@/utils/swagger/swagger";

setupEnvConfig();

setupServer().then(async ({ httpServer, container }) => {
  await setupSwagger(httpServer);

  container
    .resolve(DITokens.serverHost)
    .boot(httpServer)
    .catch(async (e: any | Error) => {
      console.error("Server has crashed unintentionally - please report this", e);

      captureException(e);
      await flush(0);
      process.exit(1);
    });
});
