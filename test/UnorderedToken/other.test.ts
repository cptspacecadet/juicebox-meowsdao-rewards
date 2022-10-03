import { expect } from 'chai';
import { ethers } from 'hardhat';
import fetch from 'node-fetch';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { smock } from '@defi-wonderland/smock';

import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';

async function deployMockContractFromAddress(contractAddress: string, etherscanKey: string) {
  const abi = await fetch(
    `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${etherscanKey}`,
  )
    .then((response) => response.json())
    .then((data) => JSON.parse(data['result']));

  return smock.fake(abi, { address: contractAddress });
}

describe('UnorderedToken "Other" Tests', () => {
  const tokenUnitPrice = ethers.utils.parseEther('0.0125');
  const tokenBaseUri = 'ipfs://hidden';
  const tokenMaxSupply = 8;

  let deployer: SignerWithAddress;
  let accounts: SignerWithAddress[];
  let token: any;

  before(async () => {
    const tokenName = 'Token';
    const tokenSymbol = 'TKN';
    const tokenContractUri = 'ipfs://metadata';
    const jbxProjectId = 99;
    const tokenMintAllowance = 6;
    const mintPeriodStart = 0;
    const mintPeriodEnd = 0;

    [deployer, ...accounts] = await ethers.getSigners();

    const mockUniswapQuoter = await deployMockContractFromAddress(
      '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
      process.env.ETHERSCAN_KEY || '',
    );
    await mockUniswapQuoter.quoteExactInputSingle.returns('1211000000000000000000');

    const mockUniswapRouter = await deployMockContractFromAddress(
      '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      process.env.ETHERSCAN_KEY || '',
    );

    const jbxJbTokensEth = '0x000000000000000000000000000000000000EEEe';
    const ethTerminal = await smock.fake(jbETHPaymentTerminal.abi);
    await ethTerminal.pay.returns(0);

    const mockDirectory = await smock.fake(jbDirectory.abi);
    await mockDirectory.isTerminalOf
      .whenCalledWith(jbxProjectId, ethTerminal.address)
      .returns(true);
    await mockDirectory.primaryTerminalOf
      .whenCalledWith(jbxProjectId, jbxJbTokensEth)
      .returns(ethTerminal.address);

    const tokenFactory = await ethers.getContractFactory('UnorderedToken', deployer);
    token = await tokenFactory
      .connect(deployer)
      .deploy(
        tokenName,
        tokenSymbol,
        tokenBaseUri,
        tokenContractUri,
        jbxProjectId,
        mockDirectory.address,
        tokenMaxSupply,
        tokenUnitPrice,
        tokenMintAllowance,
        mintPeriodStart,
        mintPeriodEnd,
      );
  });

  it('updatePaymentTokenList', async () => {
    const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

    await expect(token.connect(accounts[0]).updatePaymentTokenList(daiAddress, true)).to.be
      .reverted;

    await expect(token.connect(deployer).updatePaymentTokenList(daiAddress, false)).to.be.not
      .reverted;
  });

  it('updatePaymentTokenParams', async () => {
    await expect(token.connect(accounts[0]).updatePaymentTokenParams(true, 1000)).to.be.reverted;

    await expect(token.connect(deployer).updatePaymentTokenParams(true, 11000)).to.be.revertedWith(
      'INVALID_MARGIN()',
    );

    await expect(token.connect(deployer).updatePaymentTokenParams(true, 1000)).to.be.not.reverted;
  });
});
