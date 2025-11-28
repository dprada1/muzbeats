/**
* Script to update prices for all beats in the database
* 
* Usage:
*   npx tsx src/db/update-prices.ts <price>
* 
* Example:
*   npx tsx src/db/update-prices.ts 20.00
*   npx tsx src/db/update-prices.ts 19.99
* 
* This will update ALL beats to the specified price.
* Use with caution in production!
*/

import dotenv from 'dotenv';
import pool from '../config/database.js';

dotenv.config();

async function updatePrices(newPrice: number) {
	if (isNaN(newPrice) || newPrice < 0) {
		console.error('❌ Invalid price. Must be a positive number.');
		process.exit(1);
	}

	if (newPrice > 1000) {
		console.warn('⚠️  Warning: Price is very high (>$1000). Are you sure?');
	}

	try {
		console.log(`\n📊 Current price statistics:`);
		const currentStats = await pool.query(`
			SELECT 
				MIN(price) as min_price,
				MAX(price) as max_price,
				AVG(price) as avg_price,
				COUNT(*) as total_beats
			FROM beats
		`);
		const stats = currentStats.rows[0];
		console.log(`   Min: $${stats.min_price}`);
		console.log(`   Max: $${stats.max_price}`);
		console.log(`   Avg: $${parseFloat(stats.avg_price).toFixed(2)}`);
		console.log(`   Total beats: ${stats.total_beats}`);

		console.log(`\n🔄 Updating all ${stats.total_beats} beats to $${newPrice.toFixed(2)}...`);

		const result = await pool.query(
			'UPDATE beats SET price = $1, updated_at = CURRENT_TIMESTAMP RETURNING id',
			[newPrice]
		);

		console.log(`✅ Successfully updated ${result.rowCount} beats to $${newPrice.toFixed(2)}`);

		// Verify the update
		const verifyStats = await pool.query(`
			SELECT 
				MIN(price) as min_price,
				MAX(price) as max_price,
				COUNT(*) as total_beats
			FROM beats
		`);
		const verify = verifyStats.rows[0];
		
		if (parseFloat(verify.min_price) === newPrice && parseFloat(verify.max_price) === newPrice) {
			console.log(`\n✅ Verification passed: All beats are now $${newPrice.toFixed(2)}`);
		} else {
			console.error(`\n❌ Verification failed: Prices don't match expected value`);
			console.error(`   Min: $${verify.min_price}, Max: $${verify.max_price}`);
		}

		await pool.end();
	} catch (error: any) {
		console.error('❌ Error updating prices:', error.message);
		if (error.detail) {
			console.error('   Detail:', error.detail);
		}
		await pool.end();
		process.exit(1);
	}
}

// Get price from command line argument
const priceArg = process.argv[2];

if (!priceArg) {
	console.error('❌ Error: Price argument required');
	console.error('\nUsage:');
	console.error('  npx tsx src/db/update-prices.ts <price>');
	console.error('\nExamples:');
	console.error('  npx tsx src/db/update-prices.ts 20.00');
	console.error('  npx tsx src/db/update-prices.ts 19.99');
	process.exit(1);
}

const newPrice = parseFloat(priceArg);
updatePrices(newPrice);

