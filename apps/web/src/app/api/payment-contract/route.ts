import contract from "../../../lib/payment-api-contract.json";
export function GET(){return Response.json(contract,{headers:{"Content-Disposition":"attachment; filename=ekmivo-openapi.json","Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff"}})}
