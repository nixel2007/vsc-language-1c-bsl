// The module 'assert' provides assertion methods from node
import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import {BSL_MODE} from "../src/const";

// Defines a Mocha test suite to group tests of similar kind together
describe("Consts", () => {

    // Defines a Mocha unit test
    it("should work with correct language id", () => {
        assert.equal(BSL_MODE, "bsl");
    });
});
