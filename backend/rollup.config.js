import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default [
  {
    input: "src/index.ts",
    external: id => id != "tslib" && !/^(\.?\/|\w:)/.test(id),
    output: [
      {
        dir: "dist",
        format: "es",
        preserveModules: true,
      },
    ],
    plugins: [
      nodeResolve({
        extensions: [".js", ".ts"],
      }),
      typescript(),
    ],
  },
  {
    input: "src/index.ts",
    external: id => !/^(\.?\/|\w:)/.test(id),
    output: [{ dir: "dist", format: "es", preserveModules: true }],
    plugins: [dts()],
  },
];
