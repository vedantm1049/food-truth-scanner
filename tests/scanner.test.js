const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const scanner = fs.readFileSync(path.join(__dirname, "..", "scanner.js"), "utf8");
const context = {};
vm.runInNewContext(`${scanner}\nthis.__scanner = { isValidRetailBarcode, normalizeScannedBarcode };`, context);
const { isValidRetailBarcode, normalizeScannedBarcode } = context.__scanner;

assert.strictEqual(isValidRetailBarcode("7340001806618"), true, "valid EAN-13 must pass");
assert.strictEqual(isValidRetailBarcode("90162602"), true, "valid EAN-8 must pass");
assert.strictEqual(isValidRetailBarcode("064579330753"), true, "valid UPC-A with leading zero must pass");
assert.strictEqual(isValidRetailBarcode("028400037174"), true, "corrected Cheetos UPC-A must pass");

assert.strictEqual(isValidRetailBarcode("28400037174"), false, "11-digit UPC missing its leading zero must fail");
assert.strictEqual(isValidRetailBarcode("0000000000021"), false, "documented placeholder barcode must fail checksum validation");
assert.strictEqual(isValidRetailBarcode("1234567890123"), false, "right length with a bad checksum must fail");
assert.strictEqual(isValidRetailBarcode("ABC12345"), false, "non-numeric input must fail");

assert.strictEqual(normalizeScannedBarcode(" 7340001806618 "), "7340001806618");
assert.strictEqual(normalizeScannedBarcode("0000000000021"), "");
assert.strictEqual(normalizeScannedBarcode("28400037174"), "");

console.log("Retail barcode validation tests passed.");
