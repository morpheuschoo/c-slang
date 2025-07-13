import {
  COMPILATION_SUCCESS,
  testFileInterpreterSuccess
} from "./util.js";
import testLog from "./testLog.js";

function generateSuccessTests(testGroup) {
  describe("Interpreter Success Tests", () => {
    for (const [testFile, testDetails] of Object.entries(testLog[testGroup])) {
      test(testDetails.title, async () => {
        const result = await testFileInterpreterSuccess(testGroup, testFile);
        expect(result).toBe(COMPILATION_SUCCESS);
      });
    }
  });
}

Object.keys(testLog)
  .filter((s) => s !== "error") // ignore error test group
  .forEach((testGroup) => {
    describe(testGroup, () => {
      generateSuccessTests(testGroup);
    });
  });