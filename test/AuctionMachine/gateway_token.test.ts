import { expect } from 'chai';
import { ethers } from 'hardhat';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { smock } from '@defi-wonderland/smock';

import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';

describe('AuctionMachine TraitsGatewayToken Tests', () => {
    const tokenUnitPrice = ethers.utils.parseEther('0.01');
    const auctionDuration = 300; // seconds
    const lowPrice = ethers.utils.parseEther('0.001');

    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];
    let token: any;
    let auctionMachine: any;

    before(async () => {
        const tokenName = 'Token';
        const tokenSymbol = 'TKN';
        const tokenBaseUri = 'ipfs://hidden';
        const tokenContractUri = 'ipfs://metadata';
        const jbxProjectId = 99;
        const tokenMaxSupply = 8;
        const tokenMintAllowance = 6;
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

        const auctionMachineFactory = await ethers.getContractFactory('AuctionMachine', deployer);
        auctionMachine = await auctionMachineFactory.connect(deployer).deploy(
            3,
            auctionDuration,
            jbxProjectId,
            mockDirectory.address,
            token.address
        );

        token.connect(deployer).addMinter(auctionMachine.address);
    });

    it('Bootstrap the first auction with a bid', async () => {
        await expect(auctionMachine.connect(accounts[0]).bid({ value: lowPrice }))
            .to.emit(auctionMachine, 'AuctionStarted');

        expect(await auctionMachine.currentBid()).to.equal(0);
        expect(await auctionMachine.currentBidder()).to.equal(ethers.constants.AddressZero);
    });

    it('Place bids on auction', async () => {
        await expect(auctionMachine.connect(accounts[0]).bid({ value: lowPrice.mul(2) })).to.be.revertedWith('INVALID_BID()');

        await expect(auctionMachine.connect(accounts[0]).bid({ value: tokenUnitPrice }))
            .to.emit(auctionMachine, 'Bid')
            .withArgs(accounts[0].address, tokenUnitPrice, token.address, 1);

        expect(await auctionMachine.currentBid()).to.equal(tokenUnitPrice);
        expect(await auctionMachine.currentBidder()).to.equal(accounts[0].address);

        await expect(auctionMachine.connect(accounts[1]).bid({ value: tokenUnitPrice.mul(2) }))
            .to.emit(auctionMachine, 'Bid')
            .withArgs(accounts[1].address, tokenUnitPrice.mul(2), token.address, 1);

        expect(await auctionMachine.currentBid()).to.equal(tokenUnitPrice.mul(2));
        expect(await auctionMachine.currentBidder()).to.equal(accounts[1].address);
    });

    it('Settle auction with bids', async () => {
        await expect(auctionMachine.connect(accounts[1]).bid({ value: tokenUnitPrice }))
            .to.be.revertedWith('INVALID_BID()');

        const remaining = await auctionMachine.timeLeft();
        await ethers.provider.send('evm_increaseTime', [Number(remaining.toString()) + 10]);
        await ethers.provider.send('evm_mine', []);

        await expect(auctionMachine.connect(accounts[1]).bid({ value: tokenUnitPrice.mul(3) }))
            .to.be.revertedWith('AUCTION_ENDED()');

        expect(await auctionMachine.timeLeft()).to.equal(0);

        await expect(auctionMachine.connect(accounts[0]).settle())
            .to.emit(auctionMachine, 'AuctionEnded')
            .withArgs(accounts[1].address, tokenUnitPrice.mul(2), token.address, 1);

        await expect(auctionMachine.connect(accounts[0]).settle()).to.be.revertedWith('AUCTION_ACTIVE()');
    });

    it('Settle auction without bids', async () => {
        let remaining = await auctionMachine.timeLeft();
        await ethers.provider.send('evm_increaseTime', [Number(remaining.toString()) + 10]);
        await ethers.provider.send('evm_mine', []);

        await expect(auctionMachine.connect(accounts[0]).settle({ value: tokenUnitPrice }))
            .to.emit(auctionMachine, 'Bid')
            .withArgs(accounts[0].address, tokenUnitPrice, token.address, 3);
        expect(await token.ownerOf(2)).to.equal(auctionMachine.address);

        await expect(auctionMachine.connect(accounts[0]).settle()).to.be.revertedWith('AUCTION_ACTIVE()');
    });

    it('Exhaust auction availability', async () => {
        const remaining = await auctionMachine.timeLeft();
        await ethers.provider.send('evm_increaseTime', [Number(remaining.toString()) + 10]);
        await ethers.provider.send('evm_mine', []);

        await expect(auctionMachine.connect(accounts[0]).settle())
            .to.emit(auctionMachine, 'AuctionEnded')
            .withArgs(accounts[0].address, tokenUnitPrice, token.address, 3);
        expect(await token.ownerOf(3)).to.equal(accounts[0].address);

        await expect(auctionMachine.connect(accounts[0]).bid({ value: tokenUnitPrice }))
            .to.be.revertedWith('SUPPLY_EXHAUSTED()');
    })

    it('Transfer owned token', async () => {
        await expect(auctionMachine.connect(accounts[0]).recoverToken(token.address, 2))
            .to.be.revertedWith('Ownable: caller is not the owner');

        await expect(auctionMachine.connect(deployer).recoverToken(accounts[3].address, 2))
            .to.emit(token, 'Transfer').withArgs(auctionMachine.address, accounts[3].address, 2);

        await expect(auctionMachine.connect(deployer).recoverToken(accounts[3].address, 2))
            .to.revertedWith('WRONG_FROM')
    });
});
