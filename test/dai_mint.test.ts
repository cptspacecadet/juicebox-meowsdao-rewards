import { expect } from 'chai';
import { ethers } from 'hardhat';
import fetch from 'node-fetch';

import { getContractAddress } from '@ethersproject/address';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { smock } from '@defi-wonderland/smock';

import jbDirectory from '../node_modules/@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '../node_modules/@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';

async function deployMockContractFromAddress(contractAddress: string, etherscanKey: string) {
    const abi = await fetch(`https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${etherscanKey}`)
        .then(response => response.json())
        .then(data => JSON.parse(data['result']));

    return smock.fake(abi, {address: contractAddress});
}

async function getNextContractAddress(deployer: SignerWithAddress) {
   return getContractAddress({ from: deployer.address, nonce: await deployer.getTransactionCount() });
}

describe('MEOWs DAO Token Mint Tests: DAI', () => {
    const tokenUnitPrice = ethers.utils.parseEther('0.0125');

    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];
    let token: any;
    let mockDai: any;
    let mockWeth: any;

    before(async () => {
        const tokenName = 'Token';
        const tokenSymbol = 'TKN';
        const tokenBaseUri = 'ipfs://hidden';
        const tokenContractUri = 'ipfs://metadata';
        const jbxProjectId = 99;
        const tokenMaxSupply = 8;
        const tokenMintAllowance = 6;
        const mintPeriodStart = 0;
        const mintPeriodEnd = 0;

        [deployer, ...accounts] = await ethers.getSigners();

        const mockUniswapQuoter = await deployMockContractFromAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', process.env.ETHERSCAN_KEY || '');
        await mockUniswapQuoter.quoteExactInputSingle.returns('1211000000000000000000');
        await mockUniswapQuoter.quoteExactOutputSingle.returns('1211000000000000000000');

        const mockUniswapRouter = await deployMockContractFromAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564', process.env.ETHERSCAN_KEY || '');

        mockDai = await deployMockContractFromAddress('0x6B175474E89094C44Da98b954EedeAC495271d0F', process.env.ETHERSCAN_KEY || '');
        mockDai.transferFrom.returns(true);
        mockDai.approve.returns(true);

        mockWeth = await deployMockContractFromAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', process.env.ETHERSCAN_KEY || '');
        mockWeth.withdraw.returns();

        const jbxJbTokensEth = '0x000000000000000000000000000000000000EEEe';
        const ethTerminal = await smock.fake(jbETHPaymentTerminal.abi);
        await ethTerminal.pay.returns(0);

        const daiTerminal = await smock.fake(jbETHPaymentTerminal.abi);
        await daiTerminal.pay.returns(0);

        const mockDirectory = await smock.fake(jbDirectory.abi);
        await mockDirectory.isTerminalOf.whenCalledWith(jbxProjectId, ethTerminal.address).returns(true);
        await mockDirectory.primaryTerminalOf.whenCalledWith(jbxProjectId, jbxJbTokensEth).returns(ethTerminal.address);
        await mockDirectory.isTerminalOf.whenCalledWith(jbxProjectId, daiTerminal.address).returns(true);
        await mockDirectory.primaryTerminalOf.whenCalledWith(jbxProjectId, mockDai.address).returns(daiTerminal.address);

        const tokenFactory = await ethers.getContractFactory('GatewayToken', deployer);
        token = await tokenFactory.connect(deployer).deploy(
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
            mintPeriodEnd
        );
    });

    it('User mints second: fail due to unapproved token', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: 0})).to.emit(token, 'Transfer');

        await expect(token.connect(accounts[0])['mint(address)'](mockDai.address, {value: tokenUnitPrice}))
            .to.be.revertedWith('UNAPPROVED_TOKEN()');
    });

    it('User mints second', async () => {
        await token.connect(deployer).updatePaymentTokenList(mockDai.address, true);

        await expect(token.connect(accounts[0])['mint(address)'](mockDai.address, {value: tokenUnitPrice}))
            .to.emit(token, 'Transfer');
    });
});
