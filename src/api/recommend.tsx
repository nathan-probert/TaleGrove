import type { NextApiRequest, NextApiResponse } from 'next';
import { model } from '@/lib/gemini';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { books, notes } = req.body;
  const prompt = `Recommend books based on: ${JSON.stringify(books)} with notes: ${notes}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  res.status(200).json({ recommendations: text });
}