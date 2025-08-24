import OpenAI from 'openai'

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY!,
})

export interface DatabaseSchema {
	schema: string
	table: string
	columns: Array<{
		name: string
		type: string
		nullable: boolean
		default?: string
		constraints: string[]
	}>
}

// Helper function to clean SQL query from markdown formatting
function cleanSQLQuery(sqlString: string): string {
	// Remove markdown code block formatting
	let cleaned = sqlString.replace(/```sql\n?/gi, '').replace(/```/g, '')

	// Remove extra whitespace and newlines
	cleaned = cleaned.trim()

	// Remove any remaining backticks
	cleaned = cleaned.replace(/`/g, '')

	return cleaned
}

export async function generateSQLQuery(userQuestion: string, schema: DatabaseSchema[]): Promise<string> {
	const schemaContext = schema
		.map(
			table =>
				`Table: ${table.schema}.${table.table}\nColumns: ${table.columns
					.map(
						col =>
							`${col.name} (${col.type}${col.nullable ? ', nullable' : ', not null'}${
								col.constraints.length > 0 ? `, constraints: ${col.constraints.join(', ')}` : ''
							})`
					)
					.join(', ')}`
		)
		.join('\n\n')

	const prompt = `
Given the following PostgreSQL database schema:

${schemaContext}

Generate a SQL query to answer this question: "${userQuestion}"

IMPORTANT RULES:
1. Return ONLY the SQL query without any markdown formatting, explanations, or code blocks
2. Do NOT use backticks in your response
3. Use proper PostgreSQL syntax with double quotes for identifiers if needed
4. Include appropriate JOINs if needed
5. Limit results to 50 rows maximum using LIMIT 50
6. Use table aliases for readability
7. If the question is unclear, make reasonable assumptions

SQL Query (no formatting):
`

	try {
		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 500,
			temperature: 0.1,
		})

		const rawResponse = completion.choices[0].message.content?.trim() || ''

		// Clean the response to remove any markdown formatting
		const cleanedQuery = cleanSQLQuery(rawResponse)

		return cleanedQuery
	} catch (error) {
		console.error('Error generating SQL query:', error)
		throw new Error('Failed to generate SQL query')
	}
}

export async function generateNaturalLanguageResponse(
	userQuestion: string,
	sqlQuery: string,
	queryResults: Array<Record<string, unknown>>
): Promise<string> {
	const prompt = `
User Question: "${userQuestion}"

SQL Query Used: ${sqlQuery}

Query Results (JSON):
${JSON.stringify(queryResults, null, 2)}

Based on the query results above, provide a natural, conversational answer to the user's question. 
- Be concise but informative
- Present data in a readable format
- If there are multiple results, summarize appropriately
- If no results found, explain that clearly
- Use natural language, not technical jargon

Response:
`

	try {
		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 800,
			temperature: 0.3,
		})

		return completion.choices[0].message.content?.trim() || 'Unable to generate response'
	} catch (error) {
		console.error('Error generating natural language response:', error)
		throw new Error('Failed to generate response')
	}
}
