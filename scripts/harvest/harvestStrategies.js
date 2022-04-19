const hardhat = require("hardhat");
const strategyAbi = require('./strategy.json');
const vaultAbi = require('./vault.json');
const vaultNativeAbi = require('./vaultNative.json');
const strategyNativeAbi = require('./strategyNative.json');

const MW_ETH = "0xF62D54f768A3bbE1ca2008125B35E79C38a279f2";
const MW_USDC = "0xaa0dF6A1dBE11848fA4f824AbD076d994166B94e";
const MW_FRAX = "0xd22160F46cbEC92237c73A77a43c76563005B59b";
const MW_USDT = "0xB1793CF2806Fd2F9a1096eb12e7f9dd975462372";
const MW_MOVR = "0x391D396EBe8f48E17483561D6603066f7d7A0514";
const MW_BTC = "0xFD374FAF139128900d5a2ef0cc0574f75c0ADCAc";

const SB_3POOL = "0x6446cf64ba8D468f9De5E9144EC479469c93fa11";
const SB_FRAX_3POOL = "0xaeC10e47362B3e4513432aF28d574460A0027CE8";
const SB_KSM_POOL = "0x7DAEDEF2e6C3644b166d4dC28A77A5609d1160Cb";

const FRAX_VAULT = "0x16d544d0481342FEF9c4Fe8ED67Da5105f857d3e";
const MOVR_VAULT = "0x1E80764d0f4A0d6DF3762CA38eF908485300DBC1";


// Astar vaults and strats
const BEAST_ASTAR_VAULT = "0xA799f6e8Ae046b90D3ce27a941344Ed960f2b066";
const BEAST_WASTAR_FARM = "0xafbE592D2aA02455Eb47B8fFf412923721742141";
const USDT_USDC_FARM = "0x745308ee7D616becf24bcBD076A1CEF2D7359cd6";
const BEAST_USDC_FARM = "0x7B4bd0B76c333bfd594Ae94DEf421928173a93bE";
const WETH_WASTAR_FARM = "0x8BD0CDb2D568f887500a7b8fB3265F2c823eE268";
const USDC_WASTAR_FARM = "0x4C829b1BeD78F771c560a0a2318935cC9C17A804";
const WBTC_WASTAR_FARM = "0x26426E9E7D8ffB058B9425C898c9eD315B2Fd4A6";

const strategies = [
	// {address: MW_ETH, contractName: "StrategyScream", strategyName: "ETH Moonwell"},
	// {address: MW_USDC, contractName: "StrategyScream", strategyName: "USDC Moonwell"},
	// {address: MW_FRAX, contractName: "StrategyMoonwell", strategyName: "FRAX Moonwell"},
	// {address: MW_USDT, contractName: "StrategyScream", strategyName: "USDT Moonwell"},
	// {address: MW_MOVR, contractName: "StrategyMoonwellNative", strategyName: "MOVR Native Moonwell"},
	// {address: MW_BTC, contractName: "StrategyMoonwellSupplyOnly", strategyName: "BTC Supply Only Moonwell"},
	// {address: SB_3POOL, contractName: "StrategySolarbeamFarm", strategyName: "3pool SolarBeam"},
	// {address: SB_FRAX_3POOL, contractName: "StrategySolarbeamFarm", strategyName: "Frax-3pool SolarBeam"},
	{address: BEAST_WASTAR_FARM, contractName: "StrategyBeastFarm", strategyName: "beast-wastar farm"},
	{address: USDT_USDC_FARM, contractName: "StrategyBeastFarm", strategyName: "usdt-usdc farm"},
	{address: BEAST_USDC_FARM, contractName: "StrategyBeastFarm", strategyName: "beast-usdc farm"},
	{address: WETH_WASTAR_FARM, contractName: "StrategyBeastFarm", strategyName: "weth-wastar farm"},
	{address: USDC_WASTAR_FARM, contractName: "StrategyBeastFarm", strategyName: "usdc-wastar farm"},
	{address: WBTC_WASTAR_FARM, contractName: "StrategyBeastFarm", strategyName: "wbtc-wastar farm"},
];

const vaults = [
	// {address: MW_ETH, contractName: "StrategyScream", strategyName: "ETH Moonwell"},
	// {address: MW_USDC, contractName: "StrategyScream", strategyName: "USDC Moonwell"},
	// {address: FRAX_VAULT, contractName: "BeefyVaultV6", vaultName: "FRAX vault"},
	// {address: MW_USDT, contractName: "StrategyScream", strategyName: "USDT Moonwell"},
	// {address: MOVR_VAULT, contractName: "BeefyVaultV6Native", vaultName: "MOVR vault"},
	// {address: MW_BTC, contractName: "StrategyMoonwellSupplyOnly", strategyName: "BTC Supply Only Moonwell"},
	// {address: SB_3POOL, contractName: "StrategySolarbeamFarm", strategyName: "3pool SolarBeam"},
	// {address: SB_FRAX_3POOL, contractName: "StrategySolarbeamFarm", strategyName: "Frax-3pool SolarBeam"},
	// {address: SB_KSM_POOL, contractName: "StrategySolarbeamFarm", strategyName: "KSM pool SolarBeam"},
	{address: BEAST_ASTAR_VAULT, contractName: "StrategyBeastFarm", vaultName: "Beast wastar farm"},
];

async function main() {
	console.log('start compiling');
	await hardhat.run("compile");
	const provider = new ethers.getDefaultProvider('https://astar-api.bwarelabs.com/c7724063-cf96-46df-81ca-4bb265cafdf5');
	const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

	// for (let i = 0; i < vaults.length; i++) {
	// 	console.log(`Vault ${vaults[i].vaultName}`)
	// 	let vault = new ethers.Contract(vaults[i].address, vaultNativeAbi, wallet);
	// 	await vault.withdrawAll({gasLimit: 5000000});
	// }

	for (let i = 0; i < strategies.length; i++) {
		console.log(`Harvesting ${strategies[i].strategyName}`)
		let strategy = new ethers.Contract(strategies[i].address, strategyAbi, wallet);
		await strategy.setHarvestOnDeposit(true, {gasLimit: 5000000});
	}

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
});