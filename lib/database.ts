// lib/database.ts
import { Pool } from 'pg'

export async function executeQuery(sqlQuery: string) {
	let pgPool: Pool | null = null

	try {
		// Additional cleaning to ensure no markdown formatting
		const cleanedQuery = sqlQuery
			.replace(/```sql\n?/gi, '')
			.replace(/```/g, '')
			.replace(/`/g, '')
			.trim()

		console.log('Executing cleaned query:', cleanedQuery)

		pgPool = new Pool({
			host: 'ep-muddy-bonus-a145zz02-pooler.ap-southeast-1.aws.neon.tech',
			port: 5432,
			user: 'neondb_owner',
			password: 'npg_CyZd5khmcUW9',
			database: 'neondb',
			max: 5,
			idleTimeoutMillis: 10_000,
			ssl: {
				rejectUnauthorized: false,
			},
		})

		// Add safety checks for dangerous operations
		const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE']
		const upperQuery = cleanedQuery.toUpperCase()

		if (dangerousKeywords.some(keyword => upperQuery.includes(keyword))) {
			throw new Error('Query contains potentially dangerous operations')
		}

		// Validate that the query is not empty after cleaning
		if (!cleanedQuery || cleanedQuery.length < 5) {
			throw new Error('Invalid or empty SQL query after cleaning')
		}

		const result = await pgPool.query(cleanedQuery)
		return result.rows
	} catch (error) {
		console.error('Database query error:', error)
		throw error
	} finally {
		if (pgPool) {
			await pgPool.end()
		}
	}
}
