import { ethers } from 'hardhat';
import { JsmnLibTest } from '../../typechain';

describe('JsmnLib', () => {
  let jsmnLibrary: JsmnLibTest;

  before(async () => {
    const [deployer] = await ethers.getSigners();
    const jsmnLibFactory = await ethers.getContractFactory('JsmnLibTest', deployer);
    jsmnLibrary = await jsmnLibFactory.connect(deployer).deploy();
  });

  it('Parse()', async () => {
    const json = '{"key": "value", "key1": "value1"}';
    const [returnValue, tokens, actualNum] = await jsmnLibrary.parseTest(json, 10);

    console.log(
      await jsmnLibrary.getBytes(json, tokens[3].start, tokens[3].end),
      returnValue,
      actualNum,
    );
  });
});
/**
 * 1. Test parse function
 * 2. Test string key value
 * 3. Test primitive key value
 * 4. Test object value
 * 5. Test array value
 */
