import { expect } from 'chai';
import { ethers } from 'hardhat';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { smock } from '@defi-wonderland/smock';

import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';

import * as AssetUtils from '../components/AssetUtils';
import * as ChainStorage from '../components/ChainStorage';

describe('TraitsChainToken Mint Tests', () => {
    const tokenUnitPrice = ethers.utils.parseEther('0.0125');

    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];
    let token: any;
    let storage: any;

    before(async () => {
        const tokenName = 'Token';
        const tokenSymbol = 'TKN';
        const tokenBaseUri = 'ipfs://hidden';
        const tokenContractUri = 'ipfs://metadata';
        const jbxProjectId = 99;
        const tokenMaxSupply = 6;
        const tokenMintAllowance = 3;

        [deployer, ...accounts] = await ethers.getSigners();

        const jbxJbTokensEth = '0x000000000000000000000000000000000000EEEe';
        const ethTerminal = await smock.fake(jbETHPaymentTerminal.abi);
        await ethTerminal.pay.returns(0);

        const mockDirectory = await smock.fake(jbDirectory.abi);
        await mockDirectory.isTerminalOf.whenCalledWith(jbxProjectId, ethTerminal.address).returns(true);
        await mockDirectory.primaryTerminalOf.whenCalledWith(jbxProjectId, jbxJbTokensEth).returns(ethTerminal.address);

        const meowCommonUtilFactory = await ethers.getContractFactory('MeowCommonUtil', deployer);
        const meowCommonUtilLibrary = await meowCommonUtilFactory.connect(deployer).deploy();

        const meowChainUtilFactory = await ethers.getContractFactory('MeowChainUtil', {
            libraries: { MeowCommonUtil: meowCommonUtilLibrary.address },
            signer: deployer
        });
        const meowChainUtilLibrary = await meowChainUtilFactory.connect(deployer).deploy();

        const storageFactory = await ethers.getContractFactory('Storage', deployer);
        storage = await storageFactory.connect(deployer).deploy(deployer.address);
        await storage.deployed();

        const tokenFactory = await ethers.getContractFactory('TraitsChainToken', {
            libraries: { MeowChainUtil: meowChainUtilLibrary.address },
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
            storage.address
        );
        await token.deployed();
    });

    it('Load on-chain assets', async () => {
        // NOTE: this test takes multiple minutes to complete

        // const assetIndex = AssetUtils.generateAssetIndex('assets');
        // const offsetMap: any = {};
        // Object.keys(assetIndex).forEach(k => { offsetMap[k] = assetIndex[k]['offset']});
        // const totalStorageGas = await ChainStorage.loadLayers(storage, deployer, 'assets', offsetMap);
        // console.log(`total storage expense: ${totalStorageGas.toString()} gas`);
    });

    it('User mints first: fail due to price', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: tokenUnitPrice}))
            .to.be.revertedWith('INCORRECT_PAYMENT(0)');
    });

    it('User mints a token', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: 0}))
            .to.emit(token, 'Transfer');
    });

    it('User mints second: fail due to price', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: 0}))
            .to.be.revertedWith('INCORRECT_PAYMENT(12500000000000000)');
    });

    it('User mints second', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: tokenUnitPrice}))
            .to.emit(token, 'Transfer');
    });

    it('User mints third: fail due to price', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: tokenUnitPrice}))
            .to.be.revertedWith('INCORRECT_PAYMENT(0)');
    });

    it('User mints third', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: 0}))
            .to.emit(token, 'Transfer');

        expect(await token.balanceOf(accounts[0].address)).to.equal(3);
    });

    it('User mints 4: allowance failure', async () => {
        await expect(token.connect(accounts[0])['mint()']({value: 0}))
        .to.be.revertedWith('ALLOWANCE_EXHAUSTED()');
    });

    it('User mints 4-6', async () => {
        await expect(token.connect(accounts[1])['mint()']({value: 0})).to.emit(token, 'Transfer');
        await expect(token.connect(accounts[1])['mint()']({value: tokenUnitPrice})).to.emit(token, 'Transfer');
        await expect(token.connect(accounts[1])['mint()']({value: 0})).to.emit(token, 'Transfer');

        expect(await token.balanceOf(accounts[1].address)).to.equal(3);
    });

    it('Admin mints 7: supply failure', async () => {
        await expect(token.connect(deployer).mintFor(accounts[2].address))
            .to.be.revertedWith('SUPPLY_EXHAUSTED()');
    });

    it('Admin updates storage address', async () => {
        await expect(token.connect(deployer).setAssets(ethers.constants.AddressZero))
            .to.not.be.reverted;
    });
});
