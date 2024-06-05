/// <reference path="./.sst/platform/config.d.ts" />
import { readdirSync } from "fs";

export default $config({
  app(input) {
    return {
      name: "peasy-store",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
          profile:
            input.stage === "production" ? "proaws-production" : "proaws-dev",
        },
        "pulumi-stripe": true,
      },
    };
  },
  async run() {
    $transform(sst.aws.Function, (args) => {
      args.environment = $resolve([args.environment]).apply(([environment]) => {
        return {
          ...environment,
          NODE_OPTIONS: "--experimental-websocket",
        };
      });
      args.permissions = $resolve([args.permissions]).apply(([permissions]) => {
        return [
          ...(permissions || []),
          { actions: ["ses:*"], resources: ["*"] },
          // TODO: #3 We need to give our functions permissions to
          // invoke Bedrock models. Specifically, they'll need
          // access to the bedrock:InvokeModel action.
        ];
      });
    });
    const outputs = {};
    for (const value of readdirSync("./infra/")) {
      const result = await import("./infra/" + value);
      if (result.outputs) Object.assign(outputs, result.outputs);
    }
    return outputs;
  },
});
