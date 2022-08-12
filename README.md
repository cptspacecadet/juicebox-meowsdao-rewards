# Juicebox MeowDAO Rewards

## Contracts

A collection of NFTs with various features that interface with Juicebox treasury contracts.

### JBTierRewardToken

A Juicebox contribution reward NFT modeled on the [JBX Contribution NFT Reward Mechanism](https://github.com/jbx-protocol/juice-nft-rewards). This contract allows for tiered minting of trait-based NFTs.

### Token

A "regular" ERC721 NFT which allows minting of a limited set of NFTs with ipfs-bound assets and metadata. This contract adds a mint period.

### UnorderedToken

An ERC721 NFT which allows minting of a limited set of NFTs with ipfs-bound assets and metadata. Proceeds from the initial sale go to a Juicebox project. This contract optionally supports payment in ERC20 tokens rather than Ether for which there is a Uniswap pool. Other features include Merkle-tree mints, mint period and non-sequential token ids.

## Commands

- `npx hardhat compile`
- `npx hardhat test`
- `npx hardhat coverage`
- `npx hardhat docgen`
- `npx hardhat run scripts/deployAssets.ts` renames and uploads assets to IPFS using the [nft.storage](https://nft.storage/) service.

## Testing

This contract relies on a significant amount of chain state, only some of the interactions are mocked. More practically, consider running a local for like this `npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/<ALCHEMY_KEY> --fork-block-number <BLOCK_NUMBER>` and switching to `'localhost'` default network in `hardhat.config.ts`.

## Environment Configuration

- PRIVATE_KEY
- RINKEBY_URL
- ALCHEMY_RINKEBY_KEY
- ETHERSCAN_KEY
- COINMARKETCAP_KEY
- NFT_STORAGE_API_KEY
- REPORT_GAS
