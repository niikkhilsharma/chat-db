import { Pool } from 'pg'

export async function getDatabaseSchemaInfo(pgPool: Pool) {
	// Query to get database schema information
	const schemaQuery = `
      SELECT 
        t.table_schema,
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        tc.constraint_type
      FROM 
        information_schema.tables t
      LEFT JOIN 
        information_schema.columns c ON t.table_name = c.table_name 
        AND t.table_schema = c.table_schema
      LEFT JOIN 
        information_schema.key_column_usage kcu ON c.table_name = kcu.table_name 
        AND c.column_name = kcu.column_name 
        AND c.table_schema = kcu.table_schema
      LEFT JOIN 
        information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name 
        AND kcu.table_schema = tc.table_schema
      WHERE 
        t.table_schema NOT IN ('information_schema', 'pg_catalog')
        AND t.table_type = 'BASE TABLE'
      ORDER BY 
        t.table_schema, t.table_name, c.ordinal_position;
    `

	const result = await pgPool.query(schemaQuery)

	// Organize the results by table
	type ColumnInfo = {
		name: string
		type: string
		nullable: boolean
		default: string | null
		maxLength: number | null
		precision: number | null
		scale: number | null
		constraints: string[]
	}

	type TableSchema = {
		schema: string
		table: string
		columns: ColumnInfo[]
	}

	const schema: Record<string, TableSchema> = {}

	result.rows.forEach(row => {
		const {
			table_schema,
			table_name,
			column_name,
			data_type,
			is_nullable,
			column_default,
			character_maximum_length,
			numeric_precision,
			numeric_scale,
			constraint_type,
		} = row

		const tableKey = `${table_schema}.${table_name}`

		if (!schema[tableKey]) {
			schema[tableKey] = {
				schema: table_schema,
				table: table_name,
				columns: [],
			}
		}

		if (column_name) {
			const existingColumn = schema[tableKey].columns.find((col: ColumnInfo) => col.name === column_name)

			if (!existingColumn) {
				schema[tableKey].columns.push({
					name: column_name,
					type: data_type,
					nullable: is_nullable === 'YES',
					default: column_default,
					maxLength: character_maximum_length,
					precision: numeric_precision,
					scale: numeric_scale,
					constraints: constraint_type ? [constraint_type] : [],
				})
			} else if (constraint_type && !existingColumn.constraints.includes(constraint_type)) {
				existingColumn.constraints.push(constraint_type)
			}
		}
	})
	return schema
}
