import {
  interpret_C_AST
} from "./dist/index.js";
import * as fs from "fs";

const input = fs.readFileSync("PLACECODEHERE.c", "utf-8").replace(/\r/g, '');

interpret_C_AST(input);