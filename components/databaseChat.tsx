'use client'

import { useState, useEffect } from 'react'
import { DatabaseSchema } from '@/lib/openai'

interface Message {
	id: string
	type: 'user' | 'assistant'
	content: string
	sqlQuery?: string
	timestamp: Date
}

export default function DatabaseChat() {
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const [loading, setLoading] = useState(false)
	const [schema, setSchema] = useState<DatabaseSchema[]>([])

	// Load database schema on component mount
	useEffect(() => {
		const loadSchema = async () => {
			try {
				const response = await fetch('/api/schema')
				const data = await response.json()
				if (data.success) {
					setSchema(data.schema)
				}
			} catch (error) {
				console.error('Failed to load schema:', error)
			}
		}

		loadSchema()
	}, [])

	const sendMessage = async () => {
		if (!input.trim() || loading) return

		const userMessage: Message = {
			id: Date.now().toString(),
			type: 'user',
			content: input.trim(),
			timestamp: new Date(),
		}

		setMessages(prev => [...prev, userMessage])
		setInput('')
		setLoading(true)

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					message: userMessage.content,
					schema,
				}),
			})

			const data = await response.json()

			if (data.success) {
				const assistantMessage: Message = {
					id: (Date.now() + 1).toString(),
					type: 'assistant',
					content: data.response,
					sqlQuery: data.sqlQuery,
					timestamp: new Date(),
				}

				setMessages(prev => [...prev, assistantMessage])
			} else {
				throw new Error(data.error || 'Failed to get response')
			}
		} catch (error) {
			const errorMessage: Message = {
				id: (Date.now() + 1).toString(),
				type: 'assistant',
				content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				timestamp: new Date(),
			}

			setMessages(prev => [...prev, errorMessage])
		} finally {
			setLoading(false)
		}
	}

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			sendMessage()
		}
	}

	return (
		<div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
			<div className="bg-gray-100 rounded-lg p-4 mb-4">
				<h2 className="text-xl font-bold mb-2">Database Chat Assistant</h2>
				<p className="text-gray-600">Ask questions about your database in natural language!</p>
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto space-y-4 mb-4">
				{messages.length === 0 && (
					<div className="text-center text-gray-500 mt-8">
						<p>Start by asking a question about your database!</p>
						<p className="text-sm mt-2">
							Examples: &quot;Show me all employees&quot;, &quot;What are the top 5 paid employees?&quot;
						</p>
					</div>
				)}

				{messages.map(message => (
					<div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
						<div
							className={`max-w-[80%] rounded-lg p-3 ${
								message.type === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
							}`}>
							<p className="whitespace-pre-wrap">{message.content}</p>
							{message.sqlQuery && (
								<details className="mt-2">
									<summary className="cursor-pointer text-sm opacity-70">Show SQL Query</summary>
									<code className="block mt-1 p-2 bg-gray-800 text-green-400 rounded text-xs overflow-x-auto">
										{message.sqlQuery}
									</code>
								</details>
							)}
							<p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>
						</div>
					</div>
				))}

				{loading && (
					<div className="flex justify-start">
						<div className="bg-gray-200 rounded-lg p-3">
							<p className="text-gray-600">Thinking...</p>
						</div>
					</div>
				)}
			</div>

			{/* Input */}
			<div className="flex gap-2">
				<textarea
					value={input}
					onChange={e => setInput(e.target.value)}
					onKeyPress={handleKeyPress}
					placeholder="Ask a question about your database..."
					className="flex-1 border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
					rows={3}
					disabled={loading}
				/>
				<button
					onClick={sendMessage}
					disabled={!input.trim() || loading}
					className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
					Send
				</button>
			</div>
		</div>
	)
}
