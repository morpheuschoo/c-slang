/**
 * Compiler for C to webassembly
 */
import parse from "./parser";
import process from "./processor";
import { generateWat } from "./wat-generator";
import { compileWatToWasm } from "./wat-to-wasm";
import translate from "~src/translator";
import {
  ParserCompilationErrors,
  SourceCodeError,
  generateCompilationWarningMessage,
  toJson,
} from "~src/errors";
import ModuleRepository, {
  ModuleName,
  ModulesGlobalConfig,
} from "~src/modules";
import { evaluateTillStep } from "~src/interpreter/index";
import { CContext } from "~src/interpreter/interpret";
import { MemoryManager } from "./processor/memoryManager";

export interface SuccessfulCompilationResult {
  status: "success";
  wasm: Uint8Array;
  dataSegmentSize: number;
  functionTableSize: number; // size of function table = to number of defined functions in program
  importedModules: ModuleName[]; // all the modules imported into this C program
  warnings: string[];
}

interface FailedCompilationResult {
  status: "failure";
  errorMessage: string;
}

export type CompilationResult =
  | SuccessfulCompilationResult
  | FailedCompilationResult;

export interface SuccessfulEvaluationResult {
  status: "success";
  context: CContext;
  importedModules: ModuleName[];
}

interface FailedEvaluationResult {
  status: "failure";
  errorMessage: string;
}

export type EvaluationResult =
  | SuccessfulEvaluationResult
  | FailedEvaluationResult;

export async function compile(
  cSourceCode: string,
  moduleRepository: ModuleRepository,
): Promise<CompilationResult> {
  try {
    const { cAstRoot, warnings } = parse(cSourceCode, moduleRepository);
    const {
      astRootNode,
      includedModules,
      warnings: processorWarnings,
    } = process(cAstRoot, moduleRepository);
    warnings.push(
      ...processorWarnings.map((w) =>
        generateCompilationWarningMessage(w.message, cSourceCode, w.position),
      ),
    );

    const wasmModule = translate(astRootNode, moduleRepository);
    const output = await compileWatToWasm(generateWat(wasmModule));
    return {
      status: "success",
      wasm: output,
      dataSegmentSize: wasmModule.dataSegmentSize,
      functionTableSize: wasmModule.functionTable.size,
      importedModules: includedModules,
      warnings,
    };
  } catch (e) {
    if (e instanceof SourceCodeError) {
      return {
        status: "failure",
        errorMessage: e.generateCompilationErrorMessage(cSourceCode),
      };
    }
    if (e instanceof ParserCompilationErrors) {
      return {
        status: "failure",
        errorMessage: e.message,
      };
    }
    throw e;
  }
}

export async function evaluate(
  cSourceCode: string,
  moduleRepository: ModuleRepository,
  targetStep: number,
): Promise<EvaluationResult> {
  try {
    const memoryManager = new MemoryManager();
    const { cAstRoot, warnings } = parse(cSourceCode, moduleRepository);
    const {
      astRootNode,
      includedModules,
      warnings: processorWarnings,
    } = process(cAstRoot, moduleRepository, memoryManager);
    warnings.push(
      ...processorWarnings.map((w) =>
        generateCompilationWarningMessage(w.message, cSourceCode, w.position),
      ),
    );

    const outputContext = await evaluateTillStep(
      astRootNode,
      cAstRoot.includedModules,
      moduleRepository.config,
      targetStep,
      cSourceCode,
      memoryManager
    );

    return {
      status: "success",
      context: outputContext,
      importedModules: includedModules,
    };
  } catch (e) {
    if (e instanceof SourceCodeError) {
      return {
        status: "failure",
        errorMessage: e.generateCompilationErrorMessage(cSourceCode),
      };
    }
    if (e instanceof ParserCompilationErrors) {
      return {
        status: "failure",
        errorMessage: e.message,
      };
    }
    throw e;
  }
}

interface SuccessfulWatCompilationResult {
  status: "success";
  watOutput: string;
  warnings: string[];
}

interface FailedWatCompilationResult {
  status: "failure";
  errorMessage: string;
}

export type WatCompilationResult =
  | SuccessfulWatCompilationResult
  | FailedWatCompilationResult;

export function compileToWat(
  cSourceCode: string,
  moduleRepository: ModuleRepository,
): WatCompilationResult {
  try {
    const { cAstRoot, warnings } = parse(cSourceCode, moduleRepository);
    const { astRootNode, warnings: processorWarnings } = process(
      cAstRoot,
      moduleRepository,
    );
    warnings.push(
      ...processorWarnings.map((w) =>
        generateCompilationWarningMessage(w.message, cSourceCode, w.position),
      ),
    );
    const wasmModule = translate(astRootNode, moduleRepository);
    const output = generateWat(wasmModule);
    return {
      status: "success",
      watOutput: output,
      warnings,
    };
  } catch (e) {
    if (e instanceof SourceCodeError) {
      return {
        status: "failure",
        errorMessage: e.generateCompilationErrorMessage(cSourceCode),
      };
    }
    if (e instanceof ParserCompilationErrors) {
      return {
        status: "failure",
        errorMessage: e.message,
      };
    }
    throw e;
  }
}

export function generate_C_AST(
  cSourceCode: string,
  moduleRepository: ModuleRepository,
) {
  try {
    const parsedResult = parse(cSourceCode, moduleRepository);
    return toJson(parsedResult);
  } catch (e) {
    if (e instanceof SourceCodeError) {
      e.generateCompilationErrorMessage(cSourceCode);
    }
    throw e;
  }
}

export function generate_processed_C_AST(
  cSourceCode: string,
  moduleRepository: ModuleRepository,
) {
  try {
    const { cAstRoot } = parse(cSourceCode, moduleRepository);
    const { astRootNode } = process(cAstRoot, moduleRepository);
    return toJson(astRootNode);
  } catch (e) {
    if (e instanceof SourceCodeError) {
      e.generateCompilationErrorMessage(cSourceCode);
    }
    throw e;
  }
}

export function generate_WAT_AST(
  cSourceCode: string,
  moduleRepository: ModuleRepository,
) {
  const { cAstRoot } = parse(cSourceCode, moduleRepository);
  const { astRootNode } = process(cAstRoot, moduleRepository);
  //checkForErrors(cSourceCode, CAst, Object.keys(wasmModuleImports)); // use semantic analyzer to check for semantic errors
  const wasmAst = translate(astRootNode, moduleRepository);
  return toJson(wasmAst);
}

// export function interpret_C_AST(
//   cSourceCode: string,
//   moduleRepository: ModuleRepository,
//   moduleConfig: ModulesGlobalConfig,
// ) {
//   const { cAstRoot } = parse(cSourceCode, moduleRepository);
//   const { astRootNode } = process(cAstRoot, moduleRepository);
//   interpret(astRootNode, cAstRoot.includedModules, moduleConfig, cSourceCode);
// }
