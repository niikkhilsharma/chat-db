import { NextRequest, NextResponse } from 'next/server'
import { generateSQLQuery, generateNaturalLanguageResponse, DatabaseSchema } from '@/lib/openai'
import { executeQuery } from '@/lib/database'

export async function POST(request: NextRequest) {
	try {
		const { message, schema }: { message: string; schema: DatabaseSchema[] } = await request.json()

		if (!message || !schema) {
			return NextResponse.json({ error: 'Message and schema are required' }, { status: 400 })
		}

		// Step 1: Generate SQL query from natural language
		console.log('Generating SQL query...')
		const sqlQuery = await generateSQLQuery(message, schema)
		console.log('Generated SQL:', sqlQuery)

		// Step 2: Execute the SQL query
		console.log('Executing query...')
		const queryResults = await executeQuery(sqlQuery)
		console.log('Query results count:', queryResults.length)

		// Step 3: Generate natural language response
		console.log('Generating natural language response...')
		const naturalResponse = await generateNaturalLanguageResponse(message, sqlQuery, queryResults)

		return NextResponse.json({
			success: true,
			response: naturalResponse,
			sqlQuery,
			resultCount: queryResults.length,
			data: queryResults,
		})
	} catch (error: unknown) {
		console.error('Chat API error:', error)
		return NextResponse.json(
			{
				error: 'Failed to process your question',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		)
	}
}
