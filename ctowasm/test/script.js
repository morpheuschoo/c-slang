import testLog from "./testLog.js";
import { compileAndRunFile, interpreteFile } from "./util.js";

let some = true;

async function test(testGroup, testFileName) {
  console.log("running test" + " " + testFileName);
  const expectedOutput = [];
  // configuration for the modules
  const expectedConfig = {
      printFunction: (str) => expectedOutput.push(str), // custom print function, add to the programOutput instead of print to console
  };

  await compileAndRunFile({
      testGroup,
      testFileName,
      expectedConfig
  })

  const interpretedOutput = [];
  const interpretedConfig = {
      printFunction: (str) => interpretedOutput.push(str), // custom print function, add to the programOutput instead of print to console
  };

  await interpreteFile({
      testGroup,
      testFileName,
      interpretedConfig
  })

  // Check if the outputs match
  if (expectedOutput.toString() !== interpretedOutput.toString()) {
    some = false;
    throw new Error(`Outputs do not match for ${testGroup}/${testFileName}:\nExpected: ${expectedOutput}\nActual: ${interpretedOutput}`);
  }
  return "Test passed" + " " + testFileName;
}


const testNamesWithGroup = async () => {
  for (const [groupName, tests] of Object.entries(testLog)) {
    if (groupName === "error" || groupName === "misc") {
      continue;
    }

    for (const [testName, testDetails] of Object.entries(tests)) {
      try {
        const result = await test(groupName, testName);
        console.log(result);
      } catch (err) {
        console.error(err.message);
      }
    }
  }

  if(!some) {
    console.log("FAILEDDD DUMBASS");
  } else {
    console.log("YAYY");
  }
};

testNamesWithGroup();
