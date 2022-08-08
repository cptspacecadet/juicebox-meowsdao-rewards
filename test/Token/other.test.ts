import { expect } from 'chai';
import { ethers } from 'hardhat';
import fetch from 'node-fetch';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { smock } from '@defi-wonderland/smock';

import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';

async function deployMockContractFromAddress(contractAddress: string, etherscanKey: string) {
    const abi = await fetch(`https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${etherscanKey}`)
        .then(response => response.json())
        .then(data => JSON.parse(data['result']));

    return smock.fake(abi, {address: contractAddress});
}

describe('Simple Token "Other" Tests', () => {
    const tokenUnitPrice = ethers.utils.parseEther('0.0125');
    const tokenBaseUri = 'ipfs://hidden';
    const tokenContractUri = 'ipfs://metadata';

    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];
    let token: any;

    before(async () => {
        const tokenName = 'Token';
        const tokenSymbol = 'TKN';
        const jbxProjectId = 99;
        const tokenMaxSupply = 8;
        const tokenMintAllowance = 6;
        const mintPeriodStart = 0;
        const mintPeriodEnd = 0;

        [deployer, ...accounts] = await ethers.getSigners();

        const mockUniswapQuoter = await deployMockContractFromAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', process.env.ETHERSCAN_KEY || '');
        await mockUniswapQuoter.quoteExactInputSingle.returns('1211000000000000000000');

        const mockUniswapRouter = await deployMockContractFromAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564', process.env.ETHERSCAN_KEY || '');

        const jbxJbTokensEth = '0x000000000000000000000000000000000000EEEe';
        const ethTerminal = await smock.fake(jbETHPaymentTerminal.abi);
        await ethTerminal.pay.returns(0);

        const mockDirectory = await smock.fake(jbDirectory.abi);
        await mockDirectory.isTerminalOf.whenCalledWith(jbxProjectId, ethTerminal.address).returns(true);
        await mockDirectory.primaryTerminalOf.whenCalledWith(jbxProjectId, jbxJbTokensEth).returns(ethTerminal.address);

        const tokenFactory = await ethers.getContractFactory('UnorderedToken', deployer);
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

    it('setPause', async () => {
        await expect(token.connect(accounts[0]).setPause(true)).to.be.reverted;

        expect(await token.isPaused()).to.equal(false);
        await token.connect(deployer).setPause(true);
        expect(await token.isPaused()).to.equal(true);
    });

    it('addMinter', async () => {
        await expect(token.connect(accounts[0]).addMinter(accounts[0].address)).to.be.reverted;
        await expect(token.connect(deployer).addMinter(accounts[0].address)).to.not.be.reverted;
    });

    it('removeMinter', async () => {
        await expect(token.connect(accounts[0]).removeMinter(accounts[0].address)).to.be.reverted;
        await expect(token.connect(deployer).removeMinter(accounts[0].address)).to.not.be.reverted;
    });

    it('setProvenanceHash', async () => {
        await expect(token.connect(accounts[0]).setProvenanceHash('0xc0ffee')).to.be.reverted;
        await expect(token.connect(deployer).setProvenanceHash('0xc0ffee')).to.not.be.reverted;
        await expect(token.connect(deployer).setProvenanceHash('0xdeadbeef')).to.be.revertedWith('PROVENANCE_REASSIGNMENT()');
    });

    it('setContractURI', async () => {
        await expect(token.connect(accounts[0]).setContractURI('ipfs://')).to.be.reverted;

        expect(await token.contractURI()).to.equal(tokenContractUri);
        await expect(token.connect(deployer).setContractURI('ipfs://')).to.not.be.reverted;
    });

    it('updateMintPeriod', async () => {
        await expect(token.connect(accounts[0]).updateMintPeriod(1, 1)).to.be.reverted;
        await expect(token.connect(deployer).updateMintPeriod(1, 1)).to.not.be.reverted;
    });

    it('updateUnitPrice', async () => {
        await expect(token.connect(accounts[0]).updateUnitPrice(tokenUnitPrice)).to.be.reverted;
        await expect(token.connect(deployer).updateUnitPrice(tokenUnitPrice)).to.not.be.reverted;
    });

    it('setBaseURI', async () => {
        const revealedBaseUri = 'ipfs://blah/';
        const tokenId = 1;

        await expect(token.connect(accounts[0]).setBaseURI(revealedBaseUri, true)).to.be.reverted;

        expect(await token.tokenURI(tokenId)).to.equal(tokenBaseUri);

        await expect(token.connect(deployer).setBaseURI(revealedBaseUri, true)).to.not.be.reverted;
        expect(await token.tokenURI(tokenId)).to.equal(`${revealedBaseUri}${tokenId}`);

        await expect(token.connect(deployer).setBaseURI(tokenBaseUri, false)).to.be.revertedWith('ALREADY_REVEALED()');
    });
});
