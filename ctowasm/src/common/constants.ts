/**
 * A collection of constant objects and values.
 * These constants are used across compiler modules.
 */

export const WASM_ADDR_SIZE = 4; // number of bytes of a wasm address
export const POINTER_SIZE = WASM_ADDR_SIZE; // size of a pointer in bytes - should be same as WASM_ADDR_SIZE
export const SIZE_T = "unsigned int"; // implmentation-defined
export const PTRDIFF_T = "signed int"; // defined type for difference between pointers
export const POINTER_TYPE = "unsigned int"; // type equivalent to pointer for this compiler implementation
export const ENUM_DATA_TYPE = "signed int"; // the datatype that enum directly corresponds to in this compiler implementation

export const KB = 1024; // number of bytes in 1 KB
export const WASM_PAGE_IN_HEX = 0x10000;
