import ModuleRepository, {
  ModuleName,
  ModulesGlobalConfig,
} from "~src/modules";
import {
  compile as originalCompile,
  compileToWat as originalCompileToWat,
  generate_C_AST as original_generate_C_AST,
  generate_WAT_AST as originalGenerate_WAT_AST,
  generate_processed_C_AST as original_generate_processed_C_AST,
  interpret_C_AST as original_interpter_C_AST,
  WatCompilationResult,
  CompilationResult,
} from "./compiler";
import { calculateNumberOfPagesNeededForBytes } from "~src/common/utils";
import { WASM_PAGE_SIZE } from "~src/translator/memoryUtil";

export const defaultModuleRepository = new ModuleRepository(); // default repository containing module information without any custom configs or wasm memory

export function compileToWat(program: string): WatCompilationResult {
  return originalCompileToWat(program, defaultModuleRepository);
}

export function generate_WAT_AST(program: string) {
  return originalGenerate_WAT_AST(program, defaultModuleRepository);
}

export function interpret_C_AST(program: string, modulesConfig: ModulesGlobalConfig) {
  return original_interpter_C_AST(program, defaultModuleRepository, modulesConfig);
}

export async function compile(program: string): Promise<CompilationResult> {
  const compilationResult = await originalCompile(
    program,
    defaultModuleRepository,
  );

  // check if compilation failed
  if (compilationResult.status === "failure") {
    return compilationResult;
  }

  return compilationResult;
}

/**
 * Compiles the given C program, including all default imported functions.
 */
export async function compileAndRun(
  program: string,
  modulesConfig?: ModulesGlobalConfig,
): Promise<CompilationResult> {
  const compilationResult = await originalCompile(
    program,
    defaultModuleRepository,
  );

  // check if compilation failed
  if (compilationResult.status === "failure") {
    return compilationResult;
  }

  const { wasm, dataSegmentSize, functionTableSize, importedModules } =
    compilationResult;
  await runWasm(
    wasm,
    dataSegmentSize,
    functionTableSize,
    importedModules,
    modulesConfig,
  );

  return compilationResult;
}

export async function runWasm(
  wasm: Uint8Array,
  dataSegmentSize: number,
  functionTableSize: number,
  importedModules: ModuleName[],
  modulesConfig?: ModulesGlobalConfig,
) {
  const numberOfInitialPagesNeeded =
    calculateNumberOfPagesNeededForBytes(dataSegmentSize);
  const moduleRepository = new ModuleRepository(
    new WebAssembly.Memory({ initial: numberOfInitialPagesNeeded }),
    new WebAssembly.Table({ element: "anyfunc", initial: functionTableSize }),
    modulesConfig,
  );
  moduleRepository.setStackPointerValue(
    numberOfInitialPagesNeeded * WASM_PAGE_SIZE,
  );
  moduleRepository.setBasePointerValue(
    numberOfInitialPagesNeeded * WASM_PAGE_SIZE,
  );
  moduleRepository.setHeapPointerValue(Math.ceil(dataSegmentSize / 4) * 4); // align to 4 bytes

  const wasmImports =
    await moduleRepository.createWasmImportsObject(importedModules);
  await WebAssembly.instantiate(wasm, wasmImports);
}

export function generate_processed_C_AST(program: string) {
  return original_generate_processed_C_AST(program, defaultModuleRepository);
}

export function generate_C_AST(program: string) {
  return original_generate_C_AST(program, defaultModuleRepository);
}
