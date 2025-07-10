import testLog from "./testLog.js";
import { compileAndRunFile, interpreteFile } from "./util.js";

let some = true;

let failedTest = [];

async function test(testGroup, testFileName) {
  console.log("running test" + " " + testFileName);
  const expectedOutput = [];
  // configuration for the modules
  let modulesConfig = {
      printFunction: (str) => expectedOutput.push(str), // custom print function, add to the programOutput instead of print to console
  };

  await compileAndRunFile({
      testGroup,
      testFileName,
      modulesConfig
  })

  const interpretedOutput = [];
  modulesConfig = {
      printFunction: (str) => interpretedOutput.push(str), // custom print function, add to the programOutput instead of print to console
  };

  await interpreteFile({
      testGroup,
      testFileName,
      modulesConfig
  })

  // Check if the outputs match
  console.log(expectedOutput);
  console.log(interpretedOutput);

  if (expectedOutput.toString() !== interpretedOutput.toString()) {
    some = false;
    failedTest.push(`${testGroup}/${testFileName}`)
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
      // if(testName !== "float_1") {
      //   continue;
      // }
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
    console.log(failedTest);
  } else {
    console.log("YAYY");
  }
};

testNamesWithGroup();
