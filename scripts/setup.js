const fs = require("fs");
const path = require("path");

const packagePath = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

const repoName = path.basename(path.resolve(__dirname, "..")).toLowerCase();
const shadowName = `@shadow-dev/${repoName}`;

packageJson.name = shadowName;
packageJson.description = "Starter package for Shadow Development projects.";

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
console.log(`✅ Updated package name to: ${shadowName}`);
