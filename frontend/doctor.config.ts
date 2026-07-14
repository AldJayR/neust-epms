// doctor.config.ts
import { defineConfig } from "react-doctor/api";

export default defineConfig({
  ignore: {
    rules: ["react-doctor/no-danger"],
    files: ["src/components/**"],
  },
  rules: {
    "react-doctor/no-array-index-as-key": "error",
  },
  categories: {
    Maintainability: "warn",
  },
  supplyChain: {
    "enabled": true,
    "minScore": 60,
    "severity": "warning",
    "includeDevDependencies": false
  }
});