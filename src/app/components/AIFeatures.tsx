import { useState, ChangeEvent } from 'react';

export default function AIFeatures() {
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState<string>('');
    const [image, setImage] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const generateResponse = async (type: 'text' | 'image') => {
        try {
            setLoading(true);
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, prompt }),
            });

            const data = await response.json();
            if (type === 'text') {
                setResult(data.result);
                setImage('');
            } else {
                setImage(data.image);
                setResult('');
            }
        } catch (error) {
            console.error('Error:', error);
            setResult('Error generating response. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 m-4 max-w-2xl bg-white rounded-lg shadow">
            <input
                type="text"
                placeholder="Enter your prompt..."
                value={prompt}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
                className="w-full p-2 mb-4 border rounded"
            />
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => generateResponse('text')}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? 'Generating...' : 'Generate Text (Free)'}
                </button>
                <button
                    onClick={() => generateResponse('image')}
                    disabled={loading}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                    {loading ? 'Generating...' : 'Generate Image (Free)'}
                </button>
            </div>

            {result && (
                <div className="mt-4 p-4 bg-gray-100 rounded">
                    <p>{result}</p>
                </div>
            )}

            {image && (
                <div className="mt-4">
                    <img src={image} alt="Generated image" className="rounded" />
                </div>
            )}
        </div>
    );
} 