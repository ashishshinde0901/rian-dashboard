import axios from 'axios';

export class OpenRouterService {
  private apiKey: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateInsight(prompt: string, initiatives: any[]): Promise<string> {
    try {
      const systemPrompt = `You are an AI assistant analyzing a portfolio of business initiatives for Rian, a media dubbing and localization company.
You have access to initiatives across four areas: International BD, India BD, Media Sales & Delivery, and Technology & Product.

Each initiative has:
- Name and description
- Type (which business area)
- Flag (red=blocked, amber=at-risk, green=on-track)
- Delivery Status, Priority (P0-P3), Region, Client
- Expected Value (₹L), Conversion Time, Committed Date

Provide clear, actionable insights based on the data. Be concise and specific.`;

      const userPrompt = `${prompt}

Here is the current initiative data:
${JSON.stringify(initiatives, null, 2)}

Please analyze and respond helpfully.`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'meta-llama/llama-3.1-8b-instruct:free', // Free tier model
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://rian-ops-dashboard.vercel.app', // Your deployed URL
            'X-Title': 'Rian Ops Dashboard',
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error: any) {
      console.error('OpenRouter API error:', error.response?.data || error.message);
      throw new Error('Failed to generate AI insight');
    }
  }

  async analyzeInitiatives(query: string, initiatives: any[]): Promise<any> {
    const lowerQuery = query.toLowerCase();

    // Quick patterns for common queries
    if (/(block|red flag|stuck|why)/.test(lowerQuery)) {
      const blocked = initiatives.filter(i => i.overall === 'red');
      if (blocked.length === 0) {
        return {
          type: 'structured',
          data: { message: 'No blocked initiatives at this time.' }
        };
      }

      return {
        type: 'structured',
        data: {
          count: blocked.length,
          initiatives: blocked.map(i => ({
            name: i.name,
            blocker: this.extractBlocker(i),
            type: i.type
          }))
        }
      };
    }

    if (/(summary|exec|overview|status)/.test(lowerQuery)) {
      const onTrack = initiatives.filter(i => i.overall === 'green').length;
      const atRisk = initiatives.filter(i => i.overall === 'amber').length;
      const blocked = initiatives.filter(i => i.overall === 'red').length;

      return {
        type: 'structured',
        data: {
          total: initiatives.length,
          onTrack,
          atRisk,
          blocked,
          byType: this.groupByType(initiatives)
        }
      };
    }

    // For complex queries, use LLM
    const insight = await this.generateInsight(query, initiatives);
    return {
      type: 'text',
      data: { text: insight }
    };
  }

  private extractBlocker(initiative: any): string {
    if (initiative.comments && initiative.comments.length > 0) {
      return initiative.comments[0].text.slice(0, 100);
    }
    return initiative.desc?.slice(0, 100) || 'See task details';
  }

  private groupByType(initiatives: any[]): any {
    const groups: any = {};
    initiatives.forEach(i => {
      if (!groups[i.type]) {
        groups[i.type] = { total: 0, red: 0, amber: 0, green: 0 };
      }
      groups[i.type].total++;
      groups[i.type][i.overall]++;
    });
    return groups;
  }
}
