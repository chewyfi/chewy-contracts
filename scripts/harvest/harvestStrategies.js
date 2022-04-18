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

const strategies = [
	// {address: MW_ETH, contractName: "StrategyScream", strategyName: "ETH Moonwell"},
	// {address: MW_USDC, contractName: "StrategyScream", strategyName: "USDC Moonwell"},
	// {address: MW_FRAX, contractName: "StrategyMoonwell", strategyName: "FRAX Moonwell"},
	// {address: MW_USDT, contractName: "StrategyScream", strategyName: "USDT Moonwell"},
	{address: MW_MOVR, contractName: "StrategyMoonwellNative", strategyName: "MOVR Native Moonwell"},
	// {address: MW_BTC, contractName: "StrategyMoonwellSupplyOnly", strategyName: "BTC Supply Only Moonwell"},
	// {address: SB_3POOL, contractName: "StrategySolarbeamFarm", strategyName: "3pool SolarBeam"},
	// {address: SB_FRAX_3POOL, contractName: "StrategySolarbeamFarm", strategyName: "Frax-3pool SolarBeam"},
	// {address: SB_KSM_POOL, contractName: "StrategySolarbeamFarm", strategyName: "KSM pool SolarBeam"},
];

const vaults = [
	// {address: MW_ETH, contractName: "StrategyScream", strategyName: "ETH Moonwell"},
	// {address: MW_USDC, contractName: "StrategyScream", strategyName: "USDC Moonwell"},
	// {address: FRAX_VAULT, contractName: "BeefyVaultV6", vaultName: "FRAX vault"},
	// {address: MW_USDT, contractName: "StrategyScream", strategyName: "USDT Moonwell"},
	{address: MOVR_VAULT, contractName: "BeefyVaultV6Native", vaultName: "MOVR vault"},
	// {address: MW_BTC, contractName: "StrategyMoonwellSupplyOnly", strategyName: "BTC Supply Only Moonwell"},
	// {address: SB_3POOL, contractName: "StrategySolarbeamFarm", strategyName: "3pool SolarBeam"},
	// {address: SB_FRAX_3POOL, contractName: "StrategySolarbeamFarm", strategyName: "Frax-3pool SolarBeam"},
	// {address: SB_KSM_POOL, contractName: "StrategySolarbeamFarm", strategyName: "KSM pool SolarBeam"},
];

async function main() {
	await hardhat.run("compile");
	const provider = new ethers.getDefaultProvider('https://moonriver-api.bwarelabs.com/c7724063-cf96-46df-81ca-4bb265cafdf5');
	const wallet = new ethers.Wallet("627a7e6b5581787cb92eb7fd0e972ac7677562fa2f5334da6861dfa83e525b11", provider);

	for (let i = 0; i < strategies.length; i++) {
		console.log(`Harvesting ${strategies[i].strategyName}`)
		let strategy = new ethers.Contract(strategies[i].address, strategyAbi, wallet);
		await strategy.setHarvestOnDeposit(true, {gasLimit: 5000000});
	}

	// for (let i = 0; i < vaults.length; i++) {
	// 	console.log(`Vault ${vaults[i].vaultName}`)
	// 	let vault = new ethers.Contract(vaults[i].address, vaultNativeAbi, wallet);
	// 	await vault.withdrawAllBNB({gasLimit: 5000000});
	// }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
});