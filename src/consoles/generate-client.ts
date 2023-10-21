// openapicmd typegen ./openapi.yaml > src/types/openapi.d.ts

import { generateTypesForDocument, main } from "openapi-client-axios-typegen";
import { readFileSync } from "fs";
import { writeFileSync } from "node:fs";
import { OpenAPIClientAxios } from "openapi-client-axios";

// const api = new OpenAPIClientAxios({ definition: 'https://raw.githubusercontent.com/prusa3d/Prusa-Link-Web/master/spec/openapi.yaml' });
// api.init();
// api.getClient().then(client => {
//   client.get("/")
// });

process.argv = ["./src/consoles/prusa-link-openapi.yaml"];
main();
