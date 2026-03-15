#!/usr/bin/env node

import process from "node:process";
import { createProgram } from "./program.js";

await createProgram().parseAsync(process.argv);
