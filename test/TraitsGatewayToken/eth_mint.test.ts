import { expect } from 'chai';
import { ethers } from 'hardhat';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { smock } from '@defi-wonderland/smock';

import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';

describe('TraitsGatewayToken Mint Tests', () => {
    const tokenUnitPrice = ethers.utils.parseEther('0.0125');

    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];
    let token: any;

    before(async () => {
        const tokenName = 'Token';
        const tokenSymbol = 'TKN';
        const tokenBaseUri = 'ipfs://hidden';
        const tokenContractUri = 'ipfs://metadata';
        const jbxProjectId = 99;
        const tokenMaxSupply = 5;
        const tokenMintAllowance = 3;
        const ipfsGateway = 'https://.../';
        const ipfsRoot = 'CID/';

        [deployer, ...accounts] = await ethers.getSigners();

        const jbxJbTokensEth = '0x000000000000000000000000000000000000EEEe';
        const ethTerminal = await smock.fake(jbETHPaymentTerminal.abi);
        await ethTerminal.pay.returns(0);

        const mockDirectory = await smock.fake(jbDirectory.abi);
        await mockDirectory.isTerminalOf.whenCalledWith(jbxProjectId, ethTerminal.address).returns(true);
        await mockDirectory.primaryTerminalOf.whenCalledWith(jbxProjectId, jbxJbTokensEth).returns(ethTerminal.address);

        const meowCommonUtilFactory = await ethers.getContractFactory('MeowCommonUtil', deployer);
        const meowCommonUtilLibrary = await meowCommonUtilFactory.connect(deployer).deploy();

        const meowGatewayUtilFactory = await ethers.getContractFactory('MeowGatewayUtil', {
            libraries: { MeowCommonUtil: meowCommonUtilLibrary.address },
            signer: deployer
        });
        const meowGatewayUtilLibrary = await meowGatewayUtilFactory.connect(deployer).deploy();

        const tokenFactory = await ethers.getContractFactory('TraitsGatewayToken', {
            libraries: { MeowGatewayUtil: meowGatewayUtilLibrary.address },
            signer: deployer
        });
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
            ipfsGateway,
            ipfsRoot
        );
    });

    it('User mints a token', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: 0}))
            .to.emit(token, 'Transfer');
    });

    it('User fails to mint a second token with 0 eth', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: 0}))
            .to.be.revertedWith(`INCORRECT_PAYMENT(${tokenUnitPrice.toString()})`);
    });

    it('User mints a second token', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: tokenUnitPrice}))
            .to.emit(token, 'Transfer');
    });

    it('User mints third token', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: 0}))
            .to.emit(token, 'Transfer');

        expect(await token.ownerOf(3)).to.equal(accounts[0].address);
        expect(await token.balanceOf(accounts[0].address)).to.equal(3);
    });

    it('User fails to mint a fourth token', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: 0}))
            .to.be.revertedWith('ALLOWANCE_EXHAUSTED()');
    });

    it('User mints tokens', async () => {
        await expect(token.connect(accounts[1])['mint()']({value: 0}))
            .to.emit(token, 'Transfer');

        await expect(token.connect(accounts[1])['mint()']({value: tokenUnitPrice}))
            .to.emit(token, 'Transfer');

        expect(await token.totalSupply()).to.equal(5);

        await expect(token.connect(accounts[1])['mint()']({value: 0}))
            .to.be.revertedWith('SUPPLY_EXHAUSTED()');
    });

    it('Pre/post reveal tokenURI', async () => {
        expect((await token.tokenURI(3)).length).to.be.lessThan(50);
        
        await expect(token.connect(deployer).setBaseURI('', true))
            .to.not.be.reverted;

        expect((await token.tokenURI(3)).length).to.be.greaterThan(50);
    });

    it('Admin updates ipfs gateway', async () => {
        const gateway = 'http://gateway.com/';
        await expect(token.connect(deployer).setIPFSGatewayURI(gateway))
            .to.not.be.reverted;
    });

    it('Admin updates ipfs cid', async () => {
        const cid = 'c0ffee/';
        await expect(token.connect(deployer).setIPFSRoot(cid))
            .to.not.be.reverted;
    });
});
