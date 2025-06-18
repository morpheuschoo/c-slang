// A runtime class for the interpreter which encapsulates the memory 
import { checkAndExpandMemoryIfNeeded } from "~src/modules/util";

import { KB, WASM_PAGE_IN_HEX } from "~src/common/constants";
import { calculateNumberOfPagesNeededForBytes } from "~src/common/utils";
import { WASM_ADDR_TYPE } from "~src/translator/memoryUtil";
import { SharedWasmGlobalVariables } from "~src/modules";

// state that the programm go through at run time
export class Runtime {
	memory: WebAssembly.Memory;
	view: DataView;
	
	dataSegmentSizeInBytes: number;
	dataSegmentByteStr: string;
	heapBuffer: number // Heap size limit in bytes
	stackBuffer: number // Stacks size limit in bytes

	sharedWasmGlobalVariables: SharedWasmGlobalVariables;

	// Constructor to initiate the first runtime object
	constructor(
		dataSegmentByteStr: string, // The string of bytes (each byte is in the form "\\XX" where X is a digit in base-16) to initialize the data segment with, determined by processing initializers for data segment variables.
		dataSegmentSizeInBytes: number,
		heapBuffer?: number,
		stackBuffer?: number
	) {
		this.dataSegmentSizeInBytes = dataSegmentSizeInBytes;
		this.dataSegmentByteStr = dataSegmentByteStr
		this.heapBuffer = heapBuffer ?? 32 * KB;
		this.stackBuffer = stackBuffer ?? 32 * KB;

		const totalMemory = this.dataSegmentSizeInBytes + this.heapBuffer + this.stackBuffer;
		const initialPages = calculateNumberOfPagesNeededForBytes(totalMemory);

		this.memory = new WebAssembly.Memory({ initial: initialPages });
		this.view = new DataView(this.memory.buffer);
		
    const dataStart = 0;
    const stackStart = dataStart + this.dataSegmentSizeInBytes; // Stack starts after data segment and grows upward
    const memoryEnd = WASM_PAGE_IN_HEX * initialPages;
    const heapStart = memoryEnd; // Heap starts at top and grows downward

		this.sharedWasmGlobalVariables = {
			stackPointer: new WebAssembly.Global(
				{ value: WASM_ADDR_TYPE, mutable: true },
				stackStart,
			),
			basePointer: new WebAssembly.Global(
				{ value: WASM_ADDR_TYPE, mutable: true },
				stackStart,
			),
			heapPointer: new WebAssembly.Global(
				{ value: WASM_ADDR_TYPE, mutable: true },
				heapStart,
			)
		};

		// Initiate the data segment
		const dataBytes = Runtime.parseDataSegmentByteStr(dataSegmentByteStr);
		for (let i = 0; i < dataBytes.length; i++) {
			this.view.setUint8(i, dataBytes[i]);
		}

		this.printMemory(); // Print the first 100 bytes of memory for debugging
	}

	static parseDataSegmentByteStr(dataSegmentByteStr: string): Uint8Array {
		// Match all occurrences of \XX where XX are hexadecimal digits
		const matches = dataSegmentByteStr.match(/\\([0-9a-fA-F]{2})/g);

		if (!matches) {
			return new Uint8Array(0);
		}

		const result = new Uint8Array(matches.length);

		for (let i = 0; i < matches.length; i++) {
			const hexValue = matches[i].substring(1);
			result[i] = parseInt(hexValue, 16);
		}
		
		return result;
	}

	// Add this method to your Runtime class
	printMemory(start: number = 0, length: number = 100): void {
		// Determine the range to print
		const end = Math.min(start + length, this.memory.buffer.byteLength);
		
		console.log('=== MEMORY DUMP ===');
		console.log(`Range: 0x${start.toString(16).padStart(8, '0')} - 0x${end.toString(16).padStart(8, '0')}`);
		console.log('Address    | Hex Values                           | ASCII');
		console.log('----------|--------------------------------------|--------');
		
		// Print in rows of 16 bytes
		for (let i = start; i < end; i += 16) {
			// Address column
			let line = `0x${i.toString(16).padStart(8, '0')} | `;
			
			// Hex values column
			const hexValues: string[] = [];
			for (let j = 0; j < 16 && i + j < end; j++) {
				const byte = this.view.getUint8(i + j);
				hexValues.push(byte.toString(16).padStart(2, '0'));
			}
			line += hexValues.join(' ').padEnd(38, ' ') + '| ';
			
			// ASCII representation column
			const asciiValues: string[] = [];
			for (let j = 0; j < 16 && i + j < end; j++) {
				const byte = this.view.getUint8(i + j);
				// Only show printable ASCII characters (32-126)
				asciiValues.push(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
			}
			line += asciiValues.join('');
			
			console.log(line);
		}
		
		console.log('=== END MEMORY DUMP ===');
		
		console.log();

		// Print pointer locations for reference
		console.log('Current pointer locations:');
		console.log(`Stack Pointer: 0x${this.sharedWasmGlobalVariables.stackPointer.value.toString(16).padStart(8, '0')}`);
		console.log(`Base Pointer:  0x${this.sharedWasmGlobalVariables.basePointer.value.toString(16).padStart(8, '0')}`);
		console.log(`Heap Pointer:  0x${this.sharedWasmGlobalVariables.heapPointer.value.toString(16).padStart(8, '0')}`);
	}
}