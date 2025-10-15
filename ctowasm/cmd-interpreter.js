import { evaluate } from "./dist/index.js";
import * as fs from "fs";

const input = fs.readFileSync("PLACECODEHERE.c", "utf-8").replace(/\r/g, "");

evaluate(input, undefined, 30);
