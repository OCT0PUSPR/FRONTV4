# ChatBot Component

A smart chatbot that integrates with your warehouse data and uses OpenRouter for AI responses.

## Features

- **Data-Aware**: Only answers questions based on available warehouse data
- **Honest Responses**: Will not lie or make up information
- **Real-time Data**: Uses live data from your data context
- **Minimizable**: Can be minimized to save space
- **Responsive**: Works on all screen sizes

## Setup

### 1. OpenRouter API Key

Create a `.env` file in your project root and add your OpenRouter API key:

```bash
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 2. Get OpenRouter API Key

1. Go to [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for an account
3. Get your API key from the dashboard
4. Add it to your `.env` file

### 3. Avatar Image (Optional)

To add a custom avatar, place an image file in the `public` folder and update the ChatBot component to use it.

## Usage

The chatbot is automatically available on all authenticated pages. Users can:

- Click the chatbot bubble to open it
- Ask questions about warehouse data
- Minimize/maximize the chat window
- Clear the chat history

## Example Questions

Users can ask questions like:

- "How many products do we have?"
- "What warehouses are available?"
- "Show me the top 5 products by quantity"
- "What's the total inventory value?"
- "Which products are low in stock?"

## Data Integration

The chatbot has access to:

- Products and their details
- Warehouse information
- Stock quantities and movements
- Inventory records
- Categories and classifications
- Units of measure
- And more...

## Configuration

The chatbot behavior can be configured in `src/config/api.ts`:

```typescript
export const OPENROUTER_CONFIG = {
  model: 'openai/gpt-3.5-turbo', // Change the AI model
  maxTokens: 500,                 // Maximum response length
  temperature: 0.7,              // Creativity level (0-1)
  // ... other settings
}
```

## Security

- API keys are stored in environment variables
- No sensitive data is sent to OpenRouter
- Only warehouse data context is shared
- User sessions are maintained securely

## Troubleshooting

### Chatbot not responding
- Check if OpenRouter API key is configured
- Verify internet connection
- Check browser console for errors

### Wrong answers
- The chatbot only uses available data
- If data is missing, it will say so
- Refresh the page to get latest data

### Performance issues
- The chatbot loads data on demand
- Large datasets may take time to process
- Consider pagination for very large datasets
