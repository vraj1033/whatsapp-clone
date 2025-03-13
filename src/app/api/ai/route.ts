import { HfInference } from '@huggingface/inference';
import { NextResponse } from 'next/server';

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

export async function POST(req: Request) {
    try {
        const { type, prompt } = await req.json();

        if (type === 'text') {
            const response = await hf.textGeneration({
                model: 'facebook/opt-1.3b',
                inputs: prompt,
                parameters: {
                    max_length: 100,
                    temperature: 0.7
                }
            });

            return NextResponse.json({ result: response.generated_text });
        } 
        else if (type === 'image') {
            const response = await hf.textToImage({
                model: 'runwayml/stable-diffusion-v1-5',
                inputs: prompt,
                parameters: {
                    negative_prompt: 'blurry, bad quality',
                    num_inference_steps: 30
                }
            });

            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');

            return NextResponse.json({ 
                image: `data:image/jpeg;base64,${base64}` 
            });
        }

        return NextResponse.json({ error: 'Invalid type specified' }, { status: 400 });
    } catch (error) {
        console.error('AI generation error:', error);
        return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
    }
} 