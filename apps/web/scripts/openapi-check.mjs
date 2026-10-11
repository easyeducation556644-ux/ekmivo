import assert from "node:assert/strict";
import SwaggerParser from "@apidevtools/swagger-parser";
import {fileURLToPath} from "node:url";

const api=await SwaggerParser.validate(fileURLToPath(new URL("../../../contracts/openapi.yaml",import.meta.url)));
assert.equal(api.openapi,"3.1.0");
assert.equal(api.components.schemas.ApiError.properties.error.properties.correlation_id.pattern,"^[a-f0-9]{24}$");
console.log("PG03 PASS: strict OpenAPI YAML, schema and reference validation");
